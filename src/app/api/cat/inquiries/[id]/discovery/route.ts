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

type OptionalDiscoveryPayloadColumn = 'food_beverage' | 'budget_commercial' | 'decor_ambience';

async function getAvailableDiscoveryPayloadColumns(): Promise<Set<OptionalDiscoveryPayloadColumn>> {
  const rows: Array<{ column_name: OptionalDiscoveryPayloadColumn }> = await prisma.$queryRaw`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'cat_inquiry_discovery_areas'
      AND column_name IN ('food_beverage', 'budget_commercial', 'decor_ambience')
  `;

  return new Set(rows.map((row) => row.column_name));
}

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

function sanitizeVenueDiscovery(venueDiscovery: any): any {
  if (!venueDiscovery || typeof venueDiscovery !== 'object') return undefined;

  let mode = 'EXISTING';
  if (venueDiscovery.selectionMode === 'NEW' || venueDiscovery.selectionMode === 'PROPOSED') {
    mode = venueDiscovery.selectionMode;
  }

  return {
    ...venueDiscovery,
    selectionMode: mode,
    venueId:
      typeof venueDiscovery.venueId === 'string'
        ? venueDiscovery.venueId.trim() || undefined
        : undefined,
    existingVenueId:
      typeof venueDiscovery.existingVenueId === 'string'
        ? venueDiscovery.existingVenueId.trim() || undefined
        : undefined,
    existingVenueName:
      typeof venueDiscovery.existingVenueName === 'string'
        ? venueDiscovery.existingVenueName.trim() || undefined
        : undefined,
    proposedVenueName:
      typeof venueDiscovery.proposedVenueName === 'string'
        ? venueDiscovery.proposedVenueName.trim() || undefined
        : undefined,
    venueType:
      typeof venueDiscovery.venueType === 'string'
        ? venueDiscovery.venueType.trim() || undefined
        : undefined,
    proposedLocationText:
      typeof venueDiscovery.proposedLocationText === 'string'
        ? venueDiscovery.proposedLocationText.trim() || undefined
        : undefined,
    additionalNotes:
      typeof venueDiscovery.additionalNotes === 'string'
        ? venueDiscovery.additionalNotes
        : undefined,
    businessSummary:
      typeof venueDiscovery.businessSummary === 'string'
        ? venueDiscovery.businessSummary
        : '',
  };
}

function normalizeStringArray(value: any): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

function sanitizeFoodBeverage(foodBeverage: any): any {
  if (!foodBeverage || typeof foodBeverage !== 'object') return undefined;

  return {
    ...foodBeverage,
    mealSchedule: normalizeStringArray(foodBeverage.mealSchedule),
    liveStationTypes: normalizeStringArray(foodBeverage.liveStationTypes),
    secondaryCuisineIds: normalizeStringArray(foodBeverage.secondaryCuisineIds),
    secondaryCuisineNames: normalizeStringArray(foodBeverage.secondaryCuisineNames),
    specialFoodHighlights: normalizeStringArray(foodBeverage.specialFoodHighlights),
    beverageSetup: normalizeStringArray(foodBeverage.beverageSetup),
    additionalCulinaryNotes:
      typeof foodBeverage.additionalCulinaryNotes === 'string'
        ? foodBeverage.additionalCulinaryNotes
        : undefined,
    businessSummary:
      typeof foodBeverage.businessSummary === 'string' ? foodBeverage.businessSummary : '',
  };
}

function sanitizeBudgetCommercial(budgetCommercial: any): any {
  if (!budgetCommercial || typeof budgetCommercial !== 'object') return undefined;

  const normalizeNumber = (value: any): number | undefined => {
    if (value === null || value === undefined || value === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  return {
    ...budgetCommercial,
    targetPerGuestMin: normalizeNumber(budgetCommercial.targetPerGuestMin),
    targetPerGuestMax: normalizeNumber(budgetCommercial.targetPerGuestMax),
    targetTotalCap: normalizeNumber(budgetCommercial.targetTotalCap),
    corporateGstin:
      typeof budgetCommercial.corporateGstin === 'string'
        ? budgetCommercial.corporateGstin.trim() || undefined
        : undefined,
    additionalNotes:
      typeof budgetCommercial.additionalNotes === 'string'
        ? budgetCommercial.additionalNotes
        : undefined,
    businessSummary:
      typeof budgetCommercial.businessSummary === 'string' ? budgetCommercial.businessSummary : '',
  };
}

function sanitizeDecorAmbience(decorAmbience: any): any {
  if (!decorAmbience || typeof decorAmbience !== 'object') return undefined;

  return {
    ...decorAmbience,
    dominantColors: normalizeStringArray(decorAmbience.dominantColors),
    avoidedColors: normalizeStringArray(decorAmbience.avoidedColors),
    secondaryFocusAreas: normalizeStringArray(decorAmbience.secondaryFocusAreas),
    rankedFocusAreas: normalizeStringArray(decorAmbience.rankedFocusAreas),
    inspirationSources: normalizeStringArray(decorAmbience.inspirationSources),
    inspirationRefTypes: normalizeStringArray(decorAmbience.inspirationRefTypes),
    specialHighlights: normalizeStringArray(decorAmbience.specialHighlights),
    avoidedElements: normalizeStringArray(decorAmbience.avoidedElements),
    preExistingAssets: normalizeStringArray(decorAmbience.preExistingAssets),
    venueRestrictions: normalizeStringArray(decorAmbience.venueRestrictions),
    inspirationNotes:
      typeof decorAmbience.inspirationNotes === 'string'
        ? decorAmbience.inspirationNotes
        : undefined,
    logisticsNotes:
      typeof decorAmbience.logisticsNotes === 'string'
        ? decorAmbience.logisticsNotes
        : undefined,
    businessSummary:
      typeof decorAmbience.businessSummary === 'string'
        ? decorAmbience.businessSummary
        : '',
  };
}

async function ensureInquiryInTenant(inquiryId: string, tenantId: string) {
  const rows: Array<{ id: string; inquiry_number: string }> = await prisma.$queryRaw`
    SELECT id, inquiry_number
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
  const availableColumns = await getAvailableDiscoveryPayloadColumns();

  const foodExpr = availableColumns.has('food_beverage')
    ? 'food_beverage'
    : 'NULL::jsonb';
  const budgetExpr = availableColumns.has('budget_commercial')
    ? 'budget_commercial'
    : 'NULL::jsonb';
  const decorExpr = availableColumns.has('decor_ambience')
    ? 'decor_ambience'
    : 'NULL::jsonb';

  const rows: Array<{
    id: string;
    areaKey: DiscoveryAreaKey;
    lifecycle: string;
    validation: string;
    summary: string;
    eventBasics: any;
    venueDiscovery: any;
    foodBeverage: any;
    budgetCommercial: any;
    decorAmbience: any;
    updatedAt: Date;
  }> = await prisma.$queryRawUnsafe(
    `SELECT
      id,
      area_key as "areaKey",
      lifecycle,
      validation,
      summary,
      event_basics as "eventBasics",
      venue_discovery as "venueDiscovery",
      ${foodExpr} as "foodBeverage",
      ${budgetExpr} as "budgetCommercial",
      ${decorExpr} as "decorAmbience",
      updated_at as "updatedAt"
    FROM cat_inquiry_discovery_areas
    WHERE inquiry_id = $1::uuid
      AND tenant_id = $2::uuid`,
    inquiryId,
    tenantId,
  );

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
      venueDiscovery: sanitizeVenueDiscovery(persisted.venueDiscovery),
      foodBeverage: persisted.foodBeverage || undefined,
      budgetCommercial: persisted.budgetCommercial || undefined,
      decorAmbience: sanitizeDecorAmbience(persisted.decorAmbience),
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

    const { areaKey, lifecycle, validation, summary, eventBasics, venueDiscovery, foodBeverage, budgetCommercial, decorAmbience } = body as {
      areaKey: DiscoveryAreaKey;
      lifecycle?: DiscoveryLifecycleStatus;
      validation?: BusinessValidationStatus;
      summary?: string;
      eventBasics?: any;
      venueDiscovery?: any;
      foodBeverage?: any;
      budgetCommercial?: any;
      decorAmbience?: any;
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

    let createdNewVenueFlag = false;
    let createdVenueName: string | undefined = undefined;

    if (venueDiscovery) {
      let sanitizedVenueDiscovery = sanitizeVenueDiscovery(venueDiscovery);
      const isNewVenue =
        sanitizedVenueDiscovery?.selectionMode === 'NEW' ||
        sanitizedVenueDiscovery?.selectionMode === 'PROPOSED';
      const rawVenueName =
        sanitizedVenueDiscovery?.proposedVenueName ||
        sanitizedVenueDiscovery?.existingVenueName;

      if (isNewVenue && rawVenueName) {
        const propName = rawVenueName.trim();
        const propLocation = sanitizedVenueDiscovery?.proposedLocationText?.trim() || '';
        const propType = sanitizedVenueDiscovery?.venueType || 'OTHER';

        let extractedCity: string | null = null;
        if (propLocation.includes(',')) {
          const parts = propLocation.split(',');
          extractedCity = parts[parts.length - 1].trim();
        } else if (propLocation) {
          extractedCity = propLocation;
        }

        // Strengthened Duplicate Detection: Tenant + Normalized Name (+ City / Venue Type)
        let findSql = `
          SELECT id, venue_name, venue_number, city, venue_type
          FROM cat_venues
          WHERE tenant_id = $1::uuid
            AND is_deleted = false
            AND LOWER(TRIM(venue_name)) = LOWER(TRIM($2))
        `;
        const findParams: any[] = [tenantId, propName];

        if (extractedCity) {
          findSql += ` AND (city IS NULL OR LOWER(TRIM(city)) = LOWER(TRIM($3)) OR $3 ILIKE '%' || city || '%')`;
          findParams.push(extractedCity);
        }

        findSql += ` ORDER BY updated_at DESC LIMIT 1`;

        const existingVenues: Array<{ id: string; venue_name: string; venue_number: string }> =
          await prisma.$queryRawUnsafe(findSql, ...findParams);

        let finalVenueId: string;
        let finalVenueName: string;

        if (existingVenues[0]) {
          // Reuse existing Venue Master
          finalVenueId = existingVenues[0].id;
          finalVenueName = existingVenues[0].venue_name;
        } else {
          // Auto-create new Venue Master in DRAFT status with audit metadata
          const currentYear = new Date().getFullYear();
          const countRows: Array<{ count: number }> = await prisma.$queryRaw`
            SELECT COUNT(*)::int as count
            FROM cat_venues
            WHERE tenant_id = ${tenantId}::uuid
          `;
          const seqNumber = (countRows[0]?.count || 0) + 1;
          const venueNumber = `VEN-${currentYear}-${String(seqNumber).padStart(4, '0')}`;

          const createdRows: Array<{ id: string }> = await prisma.$queryRawUnsafe(
            `INSERT INTO cat_venues (
              id,
              tenant_id,
              venue_number,
              venue_name,
              venue_type,
              address,
              city,
              status,
              creation_source,
              created_from_module,
              created_from_record_id,
              created_from_record_number,
              created_at,
              created_by,
              updated_at,
              updated_by,
              is_deleted
            ) VALUES (
              gen_random_uuid(),
              $1::uuid,
              $2,
              $3,
              $4,
              $5,
              $6,
              'DRAFT',
              'INQUIRY_DISCOVERY',
              'INQUIRY',
              $7::uuid,
              $8,
              NOW(),
              $9::uuid,
              NOW(),
              $9::uuid,
              false
            ) RETURNING id`,
            tenantId,
            venueNumber,
            propName,
            propType,
            propLocation || null,
            extractedCity || null,
            inquiryId,
            inquiry?.inquiry_number || null,
            userId,
          );

          finalVenueId = createdRows[0].id;
          finalVenueName = propName;
          createdNewVenueFlag = true;
          createdVenueName = propName;
        }

        // Single Source of Truth: Persist venueId reference
        sanitizedVenueDiscovery = {
          ...sanitizedVenueDiscovery,
          selectionMode: 'EXISTING',
          venueId: finalVenueId,
          existingVenueId: finalVenueId,
          existingVenueName: finalVenueName,
          proposedVenueName: undefined,
          proposedLocationText: undefined,
        };

        try {
          await prisma.$executeRawUnsafe(
            `UPDATE cat_inquiries
             SET venue = $1,
                 updated_at = NOW()
             WHERE id = $2::uuid AND tenant_id = $3::uuid`,
            finalVenueName,
            inquiryId,
            tenantId,
          );
        } catch (dbErr) {
          console.warn('Non-blocking db sync error for venue discovery:', dbErr);
        }
      } else if (sanitizedVenueDiscovery?.existingVenueId || sanitizedVenueDiscovery?.venueId) {
        const candidateVenueId =
          sanitizedVenueDiscovery.existingVenueId || sanitizedVenueDiscovery.venueId;
        // Always re-validate the id against tenant_id, even when it only arrived via
        // venueId, so a foreign-tenant id can never be persisted unchecked.
        sanitizedVenueDiscovery.venueId = undefined;
        sanitizedVenueDiscovery.existingVenueId = undefined;
        try {
          const venueRows: Array<{ id: string; venue_name: string }> = await prisma.$queryRawUnsafe(
            `SELECT id, venue_name FROM cat_venues WHERE id = $1::uuid AND tenant_id = $2::uuid AND is_deleted = false LIMIT 1`,
            candidateVenueId,
            tenantId,
          );

          if (venueRows[0]) {
            sanitizedVenueDiscovery.venueId = venueRows[0].id;
            sanitizedVenueDiscovery.existingVenueId = venueRows[0].id;
            sanitizedVenueDiscovery.existingVenueName = venueRows[0].venue_name;

            await prisma.$executeRawUnsafe(
              `UPDATE cat_inquiries
               SET venue = $1,
                   updated_at = NOW()
               WHERE id = $2::uuid AND tenant_id = $3::uuid`,
              venueRows[0].venue_name,
              inquiryId,
              tenantId,
            );
          }
        } catch (dbErr) {
          console.warn('Non-blocking db sync error for existing venue discovery:', dbErr);
        }
      }

      targetArea.venueDiscovery = sanitizedVenueDiscovery;
    }

    if (foodBeverage) {
      targetArea.foodBeverage = sanitizeFoodBeverage(foodBeverage);
    }

    if (budgetCommercial) {
      targetArea.budgetCommercial = sanitizeBudgetCommercial(budgetCommercial);
    }

    if (decorAmbience) {
      targetArea.decorAmbience = sanitizeDecorAmbience(decorAmbience);
    }

    targetArea.updatedAt = new Date().toISOString();

    const availableColumns = await getAvailableDiscoveryPayloadColumns();

    const insertColumns = [
      'id',
      'tenant_id',
      'inquiry_id',
      'area_key',
      'title',
      'is_mandatory',
      'question',
      'lifecycle',
      'validation',
      'summary',
      'event_basics',
      'venue_discovery',
    ];

    const valuePlaceholders = [
      'gen_random_uuid()',
      '$1::uuid',
      '$2::uuid',
      '$3',
      '$4',
      '$5',
      '$6',
      '$7',
      '$8',
      '$9',
      '$10::jsonb',
      '$11::jsonb',
    ];

    const updateAssignments = [
      'title = EXCLUDED.title',
      'is_mandatory = EXCLUDED.is_mandatory',
      'question = EXCLUDED.question',
      'lifecycle = EXCLUDED.lifecycle',
      'validation = EXCLUDED.validation',
      'summary = EXCLUDED.summary',
      'event_basics = EXCLUDED.event_basics',
      'venue_discovery = EXCLUDED.venue_discovery',
    ];

    const sqlParams: any[] = [
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
      targetArea.venueDiscovery ? JSON.stringify(targetArea.venueDiscovery) : null,
    ];

    const appendOptionalColumn = (columnName: OptionalDiscoveryPayloadColumn, payloadValue: any) => {
      if (!availableColumns.has(columnName)) return;
      insertColumns.push(columnName);
      valuePlaceholders.push(`$${sqlParams.length + 1}::jsonb`);
      updateAssignments.push(`${columnName} = EXCLUDED.${columnName}`);
      sqlParams.push(payloadValue ? JSON.stringify(payloadValue) : null);
    };

    appendOptionalColumn('food_beverage', targetArea.foodBeverage);
    appendOptionalColumn('budget_commercial', targetArea.budgetCommercial);
    appendOptionalColumn('decor_ambience', targetArea.decorAmbience);

    insertColumns.push('created_at', 'created_by', 'updated_at', 'updated_by');
    valuePlaceholders.push('NOW()', `$${sqlParams.length + 1}::uuid`, 'NOW()', `$${sqlParams.length + 1}::uuid`);
    updateAssignments.push('updated_at = NOW()', 'updated_by = EXCLUDED.updated_by');
    sqlParams.push(userId);

    await prisma.$executeRawUnsafe(
      `INSERT INTO cat_inquiry_discovery_areas (
        ${insertColumns.join(', ')}
      ) VALUES (
        ${valuePlaceholders.join(', ')}
      )
      ON CONFLICT (inquiry_id, area_key)
      DO UPDATE SET
        ${updateAssignments.join(',\n        ')}`,
      ...sqlParams,
    );

    const refreshedAreas = await getInquiryAreasFromDb(inquiryId, tenantId);
    const overview = calculateInquiryDiscoveryOverview(inquiryId, refreshedAreas);

    return NextResponse.json({
      success: true,
      overview,
      createdNewVenue: createdNewVenueFlag,
      createdVenueName,
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



