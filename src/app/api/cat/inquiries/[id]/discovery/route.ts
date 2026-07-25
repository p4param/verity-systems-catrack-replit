import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';

import {
  DEFAULT_DISCOVERY_AREAS_SPEC,
  calculateInquiryDiscoveryOverview,
} from '@/modules/cat/inquiry/services/discoveryReadinessService';
import {
  DiscoveryArea,
  DiscoveryAreaKey,
  DiscoveryLifecycleStatus,
  BusinessValidationStatus,
} from '@/modules/cat/inquiry/domain/discovery-types';

function getInitialAreas(inquiryId: string): DiscoveryArea[] {
  return DEFAULT_DISCOVERY_AREAS_SPEC.map((spec) => ({
    id: `${inquiryId}-${spec.areaKey.toLowerCase()}`,
    inquiryId,
    areaKey: spec.areaKey,
    title: spec.title,
    isMandatory: spec.isMandatory,
    question: spec.question,
    lifecycle: 'NOT_STARTED' as DiscoveryLifecycleStatus,
    validation: 'READY' as BusinessValidationStatus,
    summary: '',
    updatedAt: new Date().toISOString(),
  }));
}

function normalizeLifecycle(value: any): DiscoveryLifecycleStatus {
  const allowed: DiscoveryLifecycleStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'REOPENED'];
  return allowed.includes(value) ? value : 'NOT_STARTED';
}

function normalizeValidation(value: any): BusinessValidationStatus {
  const allowed: BusinessValidationStatus[] = ['READY', 'NEEDS_ATTENTION', 'BLOCKED'];
  return allowed.includes(value) ? value : 'READY';
}

function sanitizeEventBasics(eventBasics: any): any {
  if (!eventBasics || typeof eventBasics !== 'object') return undefined;

  const parsedGuestCount = eventBasics.approximateGuestCount;
  const normalizedGuestCount =
    parsedGuestCount === null || parsedGuestCount === undefined || parsedGuestCount === ''
      ? undefined
      : Number(parsedGuestCount);

  return {
    ...eventBasics,
    approximateGuestCount:
      normalizedGuestCount !== undefined && Number.isFinite(normalizedGuestCount)
        ? normalizedGuestCount
        : undefined,
  };
}

async function ensureInquiryInTenant(inquiryId: string, tenantId: string) {
  const rows: Array<{ id: string }> = await prisma.$queryRaw`
    SELECT id
    FROM cat_inquiries
    WHERE id = ${inquiryId}::uuid
      AND tenant_id = ${tenantId}::uuid
      AND is_deleted = false
    LIMIT 1
  `;

  return rows[0] || null;
}

async function getInquiryAreasFromDb(inquiryId: string, tenantId: string): Promise<DiscoveryArea[]> {
  const initial = getInitialAreas(inquiryId);

  const rows: Array<{
    id: string;
    areaKey: DiscoveryAreaKey;
    lifecycle: string;
    validation: string;
    summary: string;
    eventBasics: any;
    updatedAt: Date;
  }> = await prisma.$queryRaw`
    SELECT
      id,
      area_key as "areaKey",
      lifecycle,
      validation,
      summary,
      event_basics as "eventBasics",
      updated_at as "updatedAt"
    FROM cat_inquiry_discovery_areas
    WHERE inquiry_id = ${inquiryId}::uuid
      AND tenant_id = ${tenantId}::uuid
  `;

  const byKey = new Map(rows.map((row) => [row.areaKey, row]));

  return initial.map((area) => {
    const persisted = byKey.get(area.areaKey);
    if (!persisted) return area;

    return {
      ...area,
      id: persisted.id,
      lifecycle: normalizeLifecycle(persisted.lifecycle),
      validation: normalizeValidation(persisted.validation),
      summary: typeof persisted.summary === 'string' ? persisted.summary : '',
      eventBasics: sanitizeEventBasics(persisted.eventBasics),
      updatedAt: persisted.updatedAt ? new Date(persisted.updatedAt).toISOString() : area.updatedAt,
    };
  });
}

export async function GET(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_INQUIRY_VIEW');
    const tenantId = user.tenantId;
    const params = await props.params;
    const { id: inquiryId } = params;

    const inquiry = await ensureInquiryInTenant(inquiryId, tenantId);
    if (!inquiry) {
      return NextResponse.json(
        { success: false, error: 'Inquiry record not found' },
        { status: 404 }
      );
    }

    const areas = await getInquiryAreasFromDb(inquiryId, tenantId);
    const overview = calculateInquiryDiscoveryOverview(inquiryId, areas);

    return NextResponse.json({
      success: true,
      overview,
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error fetching discovery overview:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_INQUIRY_EDIT');
    const tenantId = user.tenantId;
    const userId = user.id;
    const params = await props.params;
    const { id: inquiryId } = params;
    const body = await req.json();

    const { areaKey, lifecycle, validation, summary, eventBasics } = body as {
      areaKey: DiscoveryAreaKey;
      lifecycle?: DiscoveryLifecycleStatus;
      validation?: BusinessValidationStatus;
      summary?: string;
      eventBasics?: any;
    };

    if (!areaKey) {
      return NextResponse.json(
        { success: false, error: 'areaKey is required' },
        { status: 400 }
      );
    }

    const inquiry = await ensureInquiryInTenant(inquiryId, tenantId);
    if (!inquiry) {
      return NextResponse.json(
        { success: false, error: 'Inquiry record not found' },
        { status: 404 }
      );
    }

    const areas = await getInquiryAreasFromDb(inquiryId, tenantId);
    const targetArea = areas.find((a) => a.areaKey === areaKey);

    if (!targetArea) {
      return NextResponse.json(
        { success: false, error: `Discovery Area '${areaKey}' not found` },
        { status: 404 }
      );
    }

    if (lifecycle) targetArea.lifecycle = normalizeLifecycle(lifecycle);
    if (validation) targetArea.validation = normalizeValidation(validation);
    if (summary !== undefined) {
      targetArea.summary = summary.trim();
    }
    if (eventBasics) {
      const sanitizedEventBasics = sanitizeEventBasics(eventBasics);
      targetArea.eventBasics = sanitizedEventBasics;

      // Sync event basics anchors with database inquiry record if present
      try {
        if (sanitizedEventBasics?.occasion || sanitizedEventBasics?.tentativeDate || sanitizedEventBasics?.approximateGuestCount) {
          await prisma.$executeRawUnsafe(
            `UPDATE cat_inquiries 
             SET title = COALESCE($1, title), 
                 tentative_event_date = COALESCE($2::timestamp, tentative_event_date), 
                 expected_guest_count = COALESCE($3::integer, expected_guest_count), 
                 updated_at = NOW() 
             WHERE id = $4::uuid AND tenant_id = $5::uuid`,
            sanitizedEventBasics.occasion || null,
            sanitizedEventBasics.tentativeDate ? new Date(sanitizedEventBasics.tentativeDate).toISOString() : null,
            sanitizedEventBasics.approximateGuestCount ? parseInt(String(sanitizedEventBasics.approximateGuestCount), 10) : null,
            inquiryId,
            tenantId,
          );
        }
      } catch (dbErr) {
        console.warn('Non-blocking db sync error for event basics:', dbErr);
      }

    }
    targetArea.updatedAt = new Date().toISOString();

    await prisma.$executeRawUnsafe(
      `INSERT INTO cat_inquiry_discovery_areas (
          id,
          tenant_id,
          inquiry_id,
          area_key,
          title,
          is_mandatory,
          question,
          lifecycle,
          validation,
          summary,
          event_basics,
          created_at,
          created_by,
          updated_at,
          updated_by
        ) VALUES (
          gen_random_uuid(),
          $1::uuid,
          $2::uuid,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10::jsonb,
          NOW(),
          $11::uuid,
          NOW(),
          $11::uuid
        )
        ON CONFLICT (inquiry_id, area_key)
        DO UPDATE SET
          title = EXCLUDED.title,
          is_mandatory = EXCLUDED.is_mandatory,
          question = EXCLUDED.question,
          lifecycle = EXCLUDED.lifecycle,
          validation = EXCLUDED.validation,
          summary = EXCLUDED.summary,
          event_basics = EXCLUDED.event_basics,
          updated_at = NOW(),
          updated_by = EXCLUDED.updated_by`,
      tenantId,
      inquiryId,
      targetArea.areaKey,
      targetArea.title,
      targetArea.isMandatory,
      targetArea.question,
      targetArea.lifecycle,
      targetArea.validation,
      targetArea.summary,
      targetArea.eventBasics ? JSON.stringify(targetArea.eventBasics) : null,
      userId
    );

    const refreshedAreas = await getInquiryAreasFromDb(inquiryId, tenantId);
    const overview = calculateInquiryDiscoveryOverview(inquiryId, refreshedAreas);

    return NextResponse.json({
      success: true,
      overview,
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error updating discovery area:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, props: any) {
  return PATCH(req, props);
}



