import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';

// EM-WP02 — Event Planning.
// Single GET/PUT pair for the entire Planning brief (Operational Summary,
// Event Timeline, Key Contacts, Risks & Special Instructions, Planning
// Checklist). No status, revision, workflow, or approval semantics — PUT
// always reconciles the full current state of every list in one
// transaction (Collection Authoring Pattern), and the singular Operational
// Summary/Notes row is upserted alongside it.

interface EventTimelineItemInput {
  id: string;
  timeLabel: string;
  activity: string;
  responsibleParty?: string;
  notes?: string;
}

interface EventKeyContactInput {
  id: string;
  contactName: string;
  role?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

interface EventRiskInput {
  id: string;
  statement: string;
}

interface EventPlanningChecklistItemInput {
  id: string;
  itemText: string;
  isComplete: boolean;
}

async function ensureEventInTenant(eventId: string, tenantId: string) {
  const rows: any[] = await prisma.$queryRaw`
    SELECT id FROM cat_events
    WHERE id = ${eventId}::uuid AND tenant_id = ${tenantId}::uuid AND is_deleted = false
    LIMIT 1
  `;
  return rows[0] || null;
}

async function fetchPlanning(eventId: string, tenantId: string) {
  const summaryRows: any[] = await prisma.$queryRaw`
    SELECT
      operations_owner as "operationsOwner",
      operations_contact_phone as "operationsContactPhone",
      operations_contact_email as "operationsContactEmail",
      operational_summary as "operationalSummary",
      operational_notes as "operationalNotes"
    FROM cat_event_planning
    WHERE event_id = ${eventId}::uuid AND tenant_id = ${tenantId}::uuid
    LIMIT 1
  `;

  const timeline: any[] = await prisma.$queryRaw`
    SELECT id, time_label as "timeLabel", activity, responsible_party as "responsibleParty", notes, display_order as "displayOrder"
    FROM cat_event_timeline_items
    WHERE event_id = ${eventId}::uuid AND tenant_id = ${tenantId}::uuid
    ORDER BY display_order ASC
  `;

  const contacts: any[] = await prisma.$queryRaw`
    SELECT id, contact_name as "contactName", role, phone, email, notes, display_order as "displayOrder"
    FROM cat_event_key_contacts
    WHERE event_id = ${eventId}::uuid AND tenant_id = ${tenantId}::uuid
    ORDER BY display_order ASC
  `;

  const risks: any[] = await prisma.$queryRaw`
    SELECT id, statement, display_order as "displayOrder"
    FROM cat_event_risks
    WHERE event_id = ${eventId}::uuid AND tenant_id = ${tenantId}::uuid
    ORDER BY display_order ASC
  `;

  const checklist: any[] = await prisma.$queryRaw`
    SELECT id, item_text as "itemText", is_complete as "isComplete", display_order as "displayOrder"
    FROM cat_event_planning_checklist_items
    WHERE event_id = ${eventId}::uuid AND tenant_id = ${tenantId}::uuid
    ORDER BY display_order ASC
  `;

  return {
    summary: summaryRows[0] || {
      operationsOwner: undefined,
      operationsContactPhone: undefined,
      operationsContactEmail: undefined,
      operationalSummary: undefined,
      operationalNotes: undefined,
    },
    timeline,
    contacts,
    risks,
    checklist,
  };
}

export async function GET(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_EVENT_VIEW');
    const tenantId = user.tenantId;
    const params = await props.params;
    const { id } = params;

    const event = await ensureEventInTenant(id, tenantId);
    if (!event) {
      return NextResponse.json({ success: false, error: 'Event record not found' }, { status: 404 });
    }

    const planning = await fetchPlanning(id, tenantId);

    return NextResponse.json({ success: true, ...planning });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error fetching Event Planning:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_EVENT_EDIT');
    const tenantId = user.tenantId;
    const userId = user.id;
    const params = await props.params;
    const { id } = params;

    const event = await ensureEventInTenant(id, tenantId);
    if (!event) {
      return NextResponse.json({ success: false, error: 'Event record not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      summary,
      timeline,
      contacts,
      risks,
      checklist,
    }: {
      summary?: {
        operationsOwner?: string;
        operationsContactPhone?: string;
        operationsContactEmail?: string;
        operationalSummary?: string;
        operationalNotes?: string;
      };
      timeline?: EventTimelineItemInput[];
      contacts?: EventKeyContactInput[];
      risks?: EventRiskInput[];
      checklist?: EventPlanningChecklistItemInput[];
    } = body;

    const incomingTimeline = Array.isArray(timeline) ? timeline : [];
    const incomingContacts = Array.isArray(contacts) ? contacts : [];
    const incomingRisks = Array.isArray(risks) ? risks : [];
    const incomingChecklist = Array.isArray(checklist) ? checklist : [];

    for (const item of incomingTimeline) {
      if (!item.timeLabel?.trim() || !item.activity?.trim()) {
        return NextResponse.json({ success: false, error: 'Time and Activity are required for every Timeline entry.' }, { status: 400 });
      }
    }
    for (const contact of incomingContacts) {
      if (!contact.contactName?.trim()) {
        return NextResponse.json({ success: false, error: 'Contact Name is required for every Key Contact.' }, { status: 400 });
      }
    }
    for (const risk of incomingRisks) {
      if (!risk.statement?.trim()) {
        return NextResponse.json({ success: false, error: 'Statement is required for every Risk / Special Instruction.' }, { status: 400 });
      }
    }
    for (const item of incomingChecklist) {
      if (!item.itemText?.trim()) {
        return NextResponse.json({ success: false, error: 'Item text is required for every Checklist item.' }, { status: 400 });
      }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Operational Summary / Notes — 1:1 upsert.
      await tx.$executeRaw`
        INSERT INTO cat_event_planning (
          id, tenant_id, event_id, operations_owner, operations_contact_phone, operations_contact_email,
          operational_summary, operational_notes, created_at, created_by, updated_at, updated_by
        ) VALUES (
          gen_random_uuid(), ${tenantId}::uuid, ${id}::uuid,
          ${summary?.operationsOwner?.trim() || null}, ${summary?.operationsContactPhone?.trim() || null},
          ${summary?.operationsContactEmail?.trim() || null}, ${summary?.operationalSummary?.trim() || null},
          ${summary?.operationalNotes?.trim() || null}, NOW(), ${userId}::uuid, NOW(), ${userId}::uuid
        )
        ON CONFLICT (event_id) DO UPDATE SET
          operations_owner = EXCLUDED.operations_owner,
          operations_contact_phone = EXCLUDED.operations_contact_phone,
          operations_contact_email = EXCLUDED.operations_contact_email,
          operational_summary = EXCLUDED.operational_summary,
          operational_notes = EXCLUDED.operational_notes,
          updated_at = NOW(),
          updated_by = EXCLUDED.updated_by
        WHERE cat_event_planning.tenant_id = ${tenantId}::uuid
      `;

      // 2. Event Timeline — reconcile full list.
      const existingTimeline: Array<{ id: string }> = await tx.$queryRaw`
        SELECT id FROM cat_event_timeline_items WHERE event_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      `;
      const incomingTimelineIds = new Set(incomingTimeline.map((t) => t.id));
      for (const row of existingTimeline) {
        if (!incomingTimelineIds.has(row.id)) {
          await tx.$executeRaw`DELETE FROM cat_event_timeline_items WHERE id = ${row.id}::uuid AND event_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid`;
        }
      }
      for (let index = 0; index < incomingTimeline.length; index++) {
        const item = incomingTimeline[index];
        await tx.$executeRaw`
          INSERT INTO cat_event_timeline_items (
            id, tenant_id, event_id, time_label, activity, responsible_party, notes, display_order,
            created_at, created_by, updated_at, updated_by
          ) VALUES (
            ${item.id}::uuid, ${tenantId}::uuid, ${id}::uuid, ${item.timeLabel.trim()}, ${item.activity.trim()},
            ${item.responsibleParty?.trim() || null}, ${item.notes?.trim() || null}, ${index},
            NOW(), ${userId}::uuid, NOW(), ${userId}::uuid
          )
          ON CONFLICT (id) DO UPDATE SET
            time_label = EXCLUDED.time_label,
            activity = EXCLUDED.activity,
            responsible_party = EXCLUDED.responsible_party,
            notes = EXCLUDED.notes,
            display_order = EXCLUDED.display_order,
            updated_at = NOW(),
            updated_by = EXCLUDED.updated_by
          WHERE cat_event_timeline_items.event_id = EXCLUDED.event_id AND cat_event_timeline_items.tenant_id = EXCLUDED.tenant_id
        `;
      }

      // 3. Key Contacts — reconcile full list.
      const existingContacts: Array<{ id: string }> = await tx.$queryRaw`
        SELECT id FROM cat_event_key_contacts WHERE event_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      `;
      const incomingContactIds = new Set(incomingContacts.map((c) => c.id));
      for (const row of existingContacts) {
        if (!incomingContactIds.has(row.id)) {
          await tx.$executeRaw`DELETE FROM cat_event_key_contacts WHERE id = ${row.id}::uuid AND event_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid`;
        }
      }
      for (let index = 0; index < incomingContacts.length; index++) {
        const contact = incomingContacts[index];
        await tx.$executeRaw`
          INSERT INTO cat_event_key_contacts (
            id, tenant_id, event_id, contact_name, role, phone, email, notes, display_order,
            created_at, created_by, updated_at, updated_by
          ) VALUES (
            ${contact.id}::uuid, ${tenantId}::uuid, ${id}::uuid, ${contact.contactName.trim()}, ${contact.role?.trim() || null},
            ${contact.phone?.trim() || null}, ${contact.email?.trim() || null}, ${contact.notes?.trim() || null}, ${index},
            NOW(), ${userId}::uuid, NOW(), ${userId}::uuid
          )
          ON CONFLICT (id) DO UPDATE SET
            contact_name = EXCLUDED.contact_name,
            role = EXCLUDED.role,
            phone = EXCLUDED.phone,
            email = EXCLUDED.email,
            notes = EXCLUDED.notes,
            display_order = EXCLUDED.display_order,
            updated_at = NOW(),
            updated_by = EXCLUDED.updated_by
          WHERE cat_event_key_contacts.event_id = EXCLUDED.event_id AND cat_event_key_contacts.tenant_id = EXCLUDED.tenant_id
        `;
      }

      // 4. Risks & Special Instructions — reconcile full list.
      const existingRisks: Array<{ id: string }> = await tx.$queryRaw`
        SELECT id FROM cat_event_risks WHERE event_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      `;
      const incomingRiskIds = new Set(incomingRisks.map((r) => r.id));
      for (const row of existingRisks) {
        if (!incomingRiskIds.has(row.id)) {
          await tx.$executeRaw`DELETE FROM cat_event_risks WHERE id = ${row.id}::uuid AND event_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid`;
        }
      }
      for (let index = 0; index < incomingRisks.length; index++) {
        const risk = incomingRisks[index];
        await tx.$executeRaw`
          INSERT INTO cat_event_risks (id, tenant_id, event_id, statement, display_order, created_at, created_by, updated_at, updated_by)
          VALUES (${risk.id}::uuid, ${tenantId}::uuid, ${id}::uuid, ${risk.statement.trim()}, ${index}, NOW(), ${userId}::uuid, NOW(), ${userId}::uuid)
          ON CONFLICT (id) DO UPDATE SET
            statement = EXCLUDED.statement,
            display_order = EXCLUDED.display_order,
            updated_at = NOW(),
            updated_by = EXCLUDED.updated_by
          WHERE cat_event_risks.event_id = EXCLUDED.event_id AND cat_event_risks.tenant_id = EXCLUDED.tenant_id
        `;
      }

      // 5. Planning Checklist — reconcile full list.
      const existingChecklist: Array<{ id: string }> = await tx.$queryRaw`
        SELECT id FROM cat_event_planning_checklist_items WHERE event_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      `;
      const incomingChecklistIds = new Set(incomingChecklist.map((c) => c.id));
      for (const row of existingChecklist) {
        if (!incomingChecklistIds.has(row.id)) {
          await tx.$executeRaw`DELETE FROM cat_event_planning_checklist_items WHERE id = ${row.id}::uuid AND event_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid`;
        }
      }
      for (let index = 0; index < incomingChecklist.length; index++) {
        const item = incomingChecklist[index];
        await tx.$executeRaw`
          INSERT INTO cat_event_planning_checklist_items (
            id, tenant_id, event_id, item_text, is_complete, display_order, created_at, created_by, updated_at, updated_by
          ) VALUES (
            ${item.id}::uuid, ${tenantId}::uuid, ${id}::uuid, ${item.itemText.trim()}, ${!!item.isComplete}, ${index},
            NOW(), ${userId}::uuid, NOW(), ${userId}::uuid
          )
          ON CONFLICT (id) DO UPDATE SET
            item_text = EXCLUDED.item_text,
            is_complete = EXCLUDED.is_complete,
            display_order = EXCLUDED.display_order,
            updated_at = NOW(),
            updated_by = EXCLUDED.updated_by
          WHERE cat_event_planning_checklist_items.event_id = EXCLUDED.event_id AND cat_event_planning_checklist_items.tenant_id = EXCLUDED.tenant_id
        `;
      }
    });

    const planning = await fetchPlanning(id, tenantId);
    return NextResponse.json({ success: true, ...planning });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error saving Event Planning:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
