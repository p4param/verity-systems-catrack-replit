import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';
import { readEventMenuTree, writeTemplateMenuTree } from '@/lib/cat/menu-snapshot';

// EM-WP04 — Save Event as Template.
// Reads the Event's current (already-saved) menu and deep-copies it into a
// brand-new Menu Template — new template row, new meal/category/item ids
// throughout. The Template has no foreign key or other live link back to
// this Event; later edits to either side never affect the other.

async function ensureEventInTenant(eventId: string, tenantId: string) {
  const rows: any[] = await prisma.$queryRaw`
    SELECT id FROM cat_events WHERE id = ${eventId}::uuid AND tenant_id = ${tenantId}::uuid AND is_deleted = false LIMIT 1
  `;
  return rows[0] || null;
}

export async function POST(req: NextRequest, props: any) {
  try {
    await requirePermission(req, 'CAT_EVENT_VIEW');
    const user = await requirePermission(req, 'CAT_MENU_TEMPLATE_EDIT');
    const tenantId = user.tenantId;
    const userId = user.id;
    const params = await props.params;
    const { id } = params;

    const event = await ensureEventInTenant(id, tenantId);
    if (!event) {
      return NextResponse.json({ success: false, error: 'Event record not found' }, { status: 404 });
    }

    const body = await req.json();
    const { templateName, description } = body as { templateName?: string; description?: string };
    if (!templateName?.trim()) {
      return NextResponse.json({ success: false, error: 'Template Name is required.' }, { status: 400 });
    }

    const newTemplateId = crypto.randomUUID();

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO cat_menu_templates (id, tenant_id, template_name, description, created_at, created_by, updated_at, updated_by, is_deleted)
        VALUES (${newTemplateId}::uuid, ${tenantId}::uuid, ${templateName.trim()}, ${description?.trim() || null}, NOW(), ${userId}::uuid, NOW(), ${userId}::uuid, false)
      `;

      const tree = await readEventMenuTree(tx, id, tenantId);
      await writeTemplateMenuTree(tx, newTemplateId, tenantId, userId, tree);
    });

    return NextResponse.json({ success: true, template: { id: newTemplateId, templateName: templateName.trim() } });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error saving Event as Menu Template:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
