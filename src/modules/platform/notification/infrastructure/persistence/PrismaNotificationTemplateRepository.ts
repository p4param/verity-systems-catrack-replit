// VS09 EWP-001: PrismaNotificationTemplateRepository
// Prisma persistence implementation for the NotificationTemplate aggregate.
//
// Mandatory infrastructure behaviour (per EWP-001 §7, AG-001 §9):
//   - All reads filter by tenantId AND isDeleted = false
//   - Write operations use $executeRaw for atomic OCC enforcement
//   - Read operations use Prisma ORM (camelCase) or $queryRaw (snake_case)
//   - save() inserts when version = 1n, updates with OCC when version > 1n
//   - No business logic — persistence concerns only

import { prisma } from '@/lib/prisma';
import type { INotificationTemplateRepository } from '../../domain/templates/INotificationTemplateRepository';
import { NotificationTemplate } from '../../domain/templates/NotificationTemplate';
import type {
  NotificationTemplateRecord,
  TemplateStatus,
  TemplateCategory,
  DeliveryChannel,
} from '../../domain/templates/NotificationTemplateModels';
import { TEMPLATE_STATUS } from '../../domain/templates/NotificationTemplateModels';
import {
  TemplateConcurrencyError,
  DuplicateTemplateVersionError,
} from '../../domain/templates/NotificationTemplateErrors';

// ─── Row Mappers ──────────────────────────────────────────────────────────────

/**
 * Maps a Prisma ORM result (camelCase field names) to NotificationTemplateRecord.
 */
function fromOrmRow(row: {
  id:               string;
  tenantId:         string;
  workspaceId:      string | null;
  templateCode:     string;
  templateName:     string;
  description:      string | null;
  category:         string;
  status:           string;
  templateVersion:  string;
  parentTemplateId: string | null;
  supportedChannels:  unknown;
  supportedLanguages: unknown;
  defaultLanguage:    string;
  brandingProfileId:  string | null;
  isSystemTemplate:   boolean;
  isActive:           boolean;
  variableSchema:     unknown;
  createdAt:  Date;
  createdBy:  string | null;
  updatedAt:  Date;
  updatedBy:  string | null;
  isDeleted:  boolean;
  deletedAt:  Date | null;
  deletedBy:  string | null;
  version:    bigint;
}): NotificationTemplateRecord {
  return {
    id:               row.id,
    tenantId:         row.tenantId,
    workspaceId:      row.workspaceId ?? null,
    templateCode:     row.templateCode,
    templateName:     row.templateName,
    description:      row.description ?? null,
    category:         row.category as TemplateCategory,
    status:           row.status as TemplateStatus,
    templateVersion:  row.templateVersion,
    parentTemplateId: row.parentTemplateId ?? null,
    supportedChannels:  (Array.isArray(row.supportedChannels)
      ? row.supportedChannels
      : []) as DeliveryChannel[],
    supportedLanguages: (Array.isArray(row.supportedLanguages)
      ? row.supportedLanguages
      : []) as string[],
    defaultLanguage:    row.defaultLanguage,
    brandingProfileId:  row.brandingProfileId ?? null,
    isSystemTemplate:   row.isSystemTemplate,
    isActive:           row.isActive,
    variableSchema:     (row.variableSchema !== null && typeof row.variableSchema === 'object'
      ? row.variableSchema
      : {}) as Record<string, unknown>,
    createdAt: row.createdAt,
    createdBy: row.createdBy ?? null,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy ?? null,
    isDeleted: row.isDeleted,
    deletedAt: row.deletedAt ?? null,
    deletedBy: row.deletedBy ?? null,
    version:   row.version,
  };
}

/**
 * Maps a raw SQL result (snake_case field names) to NotificationTemplateRecord.
 * Used by $queryRaw operations (listByChannel, listByLanguage).
 */
function fromRawRow(row: {
  id:                  string;
  tenant_id:           string;
  workspace_id:        string | null;
  template_code:       string;
  template_name:       string;
  description:         string | null;
  category:            string;
  status:              string;
  template_version:    string;
  parent_template_id:  string | null;
  supported_channels:  unknown;
  supported_languages: unknown;
  default_language:    string;
  branding_profile_id: string | null;
  is_system_template:  boolean;
  is_active:           boolean;
  variable_schema:     unknown;
  created_at:  Date;
  created_by:  string | null;
  updated_at:  Date;
  updated_by:  string | null;
  is_deleted:  boolean;
  deleted_at:  Date | null;
  deleted_by:  string | null;
  version:     bigint;
}): NotificationTemplateRecord {
  return {
    id:               row.id,
    tenantId:         row.tenant_id,
    workspaceId:      row.workspace_id ?? null,
    templateCode:     row.template_code,
    templateName:     row.template_name,
    description:      row.description ?? null,
    category:         row.category as TemplateCategory,
    status:           row.status as TemplateStatus,
    templateVersion:  row.template_version,
    parentTemplateId: row.parent_template_id ?? null,
    supportedChannels:  (Array.isArray(row.supported_channels)
      ? row.supported_channels
      : []) as DeliveryChannel[],
    supportedLanguages: (Array.isArray(row.supported_languages)
      ? row.supported_languages
      : []) as string[],
    defaultLanguage:    row.default_language,
    brandingProfileId:  row.branding_profile_id ?? null,
    isSystemTemplate:   row.is_system_template,
    isActive:           row.is_active,
    variableSchema:     (row.variable_schema !== null && typeof row.variable_schema === 'object'
      ? row.variable_schema
      : {}) as Record<string, unknown>,
    createdAt: row.created_at,
    createdBy: row.created_by ?? null,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by ?? null,
    isDeleted: row.is_deleted,
    deletedAt: row.deleted_at ?? null,
    deletedBy: row.deleted_by ?? null,
    version:   row.version,
  };
}

// ─── Constraint Violation Handler ─────────────────────────────────────────────

function rethrowConstraintViolation(
  error:           unknown,
  templateCode:    string,
  templateVersion: string,
): never {
  const e = error as {
    code?:    string;
    meta?:    { target?: string[] | string };
    message?: string;
    cause?:   { code?: string };
  };

  if (e.code === 'P2002') {
    throw new DuplicateTemplateVersionError(templateCode, templateVersion);
  }

  const rawCode = (e.cause as { code?: string } | undefined)?.code;
  const msg     = (e.message ?? '').toLowerCase();
  if (rawCode === '23505' || msg.includes('23505') || msg.includes('unique_violation')) {
    throw new DuplicateTemplateVersionError(templateCode, templateVersion);
  }

  throw error;
}

// ─── Repository Implementation ────────────────────────────────────────────────

export class PrismaNotificationTemplateRepository
  implements INotificationTemplateRepository {

  // ─── save ────────────────────────────────────────────────────────────────

  async save(template: NotificationTemplate): Promise<void> {
    const r = template.toRecord();

    if (r.version === BigInt(1)) {
      // New aggregate — INSERT
      try {
        await prisma.$executeRaw`
          INSERT INTO notification_templates (
            id, tenant_id, workspace_id,
            template_code, template_name, description,
            category, status, template_version, parent_template_id,
            supported_channels, supported_languages, default_language,
            branding_profile_id, is_system_template, is_active, variable_schema,
            created_at, created_by, updated_at, updated_by,
            is_deleted, deleted_at, deleted_by, version
          ) VALUES (
            ${r.id}::uuid,
            ${r.tenantId}::uuid,
            ${r.workspaceId}::uuid,
            ${r.templateCode},
            ${r.templateName},
            ${r.description},
            ${r.category},
            ${r.status},
            ${r.templateVersion},
            ${r.parentTemplateId}::uuid,
            ${JSON.stringify(r.supportedChannels)}::jsonb,
            ${JSON.stringify(r.supportedLanguages)}::jsonb,
            ${r.defaultLanguage},
            ${r.brandingProfileId}::uuid,
            ${r.isSystemTemplate},
            ${r.isActive},
            ${JSON.stringify(r.variableSchema)}::jsonb,
            ${r.createdAt},
            ${r.createdBy}::uuid,
            ${r.updatedAt},
            ${r.updatedBy}::uuid,
            ${r.isDeleted},
            ${r.deletedAt},
            ${r.deletedBy}::uuid,
            ${r.version}
          )
        `;
      } catch (error) {
        rethrowConstraintViolation(error, r.templateCode, r.templateVersion);
      }
      return;
    }

    // Existing aggregate — UPDATE with OCC.
    // The aggregate has already incremented version; expectedVersion = version - 1.
    const expectedVersion = r.version - BigInt(1);
    const affected = await prisma.$executeRaw`
      UPDATE notification_templates
      SET
        template_name       = ${r.templateName},
        description         = ${r.description},
        status              = ${r.status},
        supported_channels  = ${JSON.stringify(r.supportedChannels)}::jsonb,
        supported_languages = ${JSON.stringify(r.supportedLanguages)}::jsonb,
        default_language    = ${r.defaultLanguage},
        branding_profile_id = ${r.brandingProfileId}::uuid,
        is_active           = ${r.isActive},
        variable_schema     = ${JSON.stringify(r.variableSchema)}::jsonb,
        updated_at          = ${r.updatedAt},
        updated_by          = ${r.updatedBy}::uuid,
        is_deleted          = ${r.isDeleted},
        deleted_at          = ${r.deletedAt},
        deleted_by          = ${r.deletedBy}::uuid,
        version             = ${r.version}
      WHERE
        id         = ${r.id}::uuid
        AND tenant_id  = ${r.tenantId}::uuid
        AND version    = ${expectedVersion}
        AND is_deleted = false
    `;

    if (affected === 0) {
      throw new TemplateConcurrencyError(r.id);
    }
  }

  // ─── delete ──────────────────────────────────────────────────────────────

  async delete(id: string, tenantId: string, deletedBy: string): Promise<void> {
    await prisma.$executeRaw`
      UPDATE notification_templates
      SET
        is_deleted = true,
        deleted_at = NOW(),
        deleted_by = ${deletedBy}::uuid,
        is_active  = false,
        updated_at = NOW(),
        updated_by = ${deletedBy}::uuid,
        version    = version + 1
      WHERE
        id         = ${id}::uuid
        AND tenant_id  = ${tenantId}::uuid
        AND is_deleted = false
    `;
  }

  // ─── findById ────────────────────────────────────────────────────────────

  async findById(
    id:       string,
    tenantId: string,
  ): Promise<NotificationTemplate | null> {
    const row = await (prisma as any).notificationTemplate.findFirst({
      where: { id, tenantId, isDeleted: false },
    });
    return row ? NotificationTemplate.reconstitute(fromOrmRow(row)) : null;
  }

  // ─── findByCode ──────────────────────────────────────────────────────────

  async findByCode(
    tenantId:     string,
    templateCode: string,
    version?:     string,
  ): Promise<NotificationTemplate | null> {
    const where: Record<string, unknown> = {
      tenantId,
      templateCode,
      isDeleted: false,
    };
    if (version !== undefined) {
      where.templateVersion = version;
    }
    const row = await (prisma as any).notificationTemplate.findFirst({
      where,
      orderBy: { templateVersion: 'desc' },
    });
    return row ? NotificationTemplate.reconstitute(fromOrmRow(row)) : null;
  }

  // ─── findLatestPublishedVersion ──────────────────────────────────────────

  async findLatestPublishedVersion(
    tenantId:     string,
    templateCode: string,
  ): Promise<NotificationTemplate | null> {
    const row = await (prisma as any).notificationTemplate.findFirst({
      where: {
        tenantId,
        templateCode,
        status:    TEMPLATE_STATUS.Published,
        isDeleted: false,
      },
      orderBy: { templateVersion: 'desc' },
    });
    return row ? NotificationTemplate.reconstitute(fromOrmRow(row)) : null;
  }

  // ─── findParentTemplate ──────────────────────────────────────────────────

  async findParentTemplate(
    parentTemplateId: string,
    tenantId:         string,
  ): Promise<NotificationTemplate | null> {
    const row = await (prisma as any).notificationTemplate.findFirst({
      where: { id: parentTemplateId, tenantId, isDeleted: false },
    });
    return row ? NotificationTemplate.reconstitute(fromOrmRow(row)) : null;
  }

  // ─── listPublished ───────────────────────────────────────────────────────

  async listPublished(
    tenantId:  string,
    category?: string,
  ): Promise<NotificationTemplate[]> {
    const where: Record<string, unknown> = {
      tenantId,
      status:    TEMPLATE_STATUS.Published,
      isDeleted: false,
    };
    if (category !== undefined) {
      where.category = category;
    }
    const rows = await (prisma as any).notificationTemplate.findMany({
      where,
      orderBy: [{ templateCode: 'asc' }, { templateVersion: 'desc' }],
    });
    return rows.map((row: any) =>
      NotificationTemplate.reconstitute(fromOrmRow(row))
    );
  }

  // ─── listByChannel ───────────────────────────────────────────────────────

  async listByChannel(
    tenantId: string,
    channel:  string,
    status?:  string,
  ): Promise<NotificationTemplate[]> {
    const effectiveStatus = status ?? TEMPLATE_STATUS.Published;
    const channelJson     = JSON.stringify([channel]);

    const rows = await prisma.$queryRaw<any[]>`
      SELECT *
      FROM   notification_templates
      WHERE  tenant_id         = ${tenantId}::uuid
        AND  supported_channels @> ${channelJson}::jsonb
        AND  status            = ${effectiveStatus}
        AND  is_deleted        = false
      ORDER BY template_code ASC, template_version DESC
    `;
    return rows.map(row => NotificationTemplate.reconstitute(fromRawRow(row)));
  }

  // ─── listByLanguage ──────────────────────────────────────────────────────

  async listByLanguage(
    tenantId:     string,
    languageCode: string,
  ): Promise<NotificationTemplate[]> {
    const languageJson = JSON.stringify([languageCode]);

    const rows = await prisma.$queryRaw<any[]>`
      SELECT *
      FROM   notification_templates
      WHERE  tenant_id          = ${tenantId}::uuid
        AND  supported_languages @> ${languageJson}::jsonb
        AND  status             = ${TEMPLATE_STATUS.Published}
        AND  is_deleted         = false
      ORDER BY template_code ASC, template_version DESC
    `;
    return rows.map(row => NotificationTemplate.reconstitute(fromRawRow(row)));
  }
}
