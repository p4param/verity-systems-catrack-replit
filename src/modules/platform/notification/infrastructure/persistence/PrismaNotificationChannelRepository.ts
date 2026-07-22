// VS09 EWP-002: PrismaNotificationChannelRepository
// Prisma persistence implementation for the NotificationChannel aggregate.

import { prisma } from '@/lib/prisma';
import type { INotificationChannelRepository } from '../../domain/channels/INotificationChannelRepository';
import { NotificationChannel } from '../../domain/channels/NotificationChannel';
import type {
  NotificationChannelRecord,
  NotificationChannelType,
  NotificationChannelStatus,
} from '../../domain/channels/NotificationChannelModels';
import {
  ChannelConcurrencyError,
  DuplicateChannelCodeError,
} from '../../domain/channels/NotificationChannelErrors';

// ─── Row Mappers ──────────────────────────────────────────────────────────────

function fromOrmRow(row: any): NotificationChannelRecord {
  return {
    id:                          row.id,
    tenantId:                    row.tenantId,
    workspaceId:                 row.workspaceId,
    channelCode:                 row.channelCode,
    channelName:                 row.channelName,
    description:                 row.description,
    channelType:                 row.channelType as NotificationChannelType,
    status:                      row.status as NotificationChannelStatus,
    priority:                    row.priority,
    isDefault:                   row.isDefault,
    isEnabled:                   row.isEnabled,
    supportedTemplateCategories: parseJsonArray(row.supportedTemplateCategories),
    configurationMetadata:       row.configurationMetadata ? (row.configurationMetadata as Record<string, unknown>) : null,
    createdAt:                   row.createdAt,
    createdBy:                   row.createdBy,
    updatedAt:                   row.updatedAt,
    updatedBy:                   row.updatedBy,
    isDeleted:                   row.isDeleted,
    deletedAt:                   row.deletedAt,
    deletedBy:                   row.deletedBy,
    version:                     row.version,
  };
}

function fromRawRow(row: any): NotificationChannelRecord {
  return {
    id:                          row.id,
    tenantId:                    row.tenant_id,
    workspaceId:                 row.workspace_id,
    channelCode:                 row.channel_code,
    channelName:                 row.channel_name,
    description:                 row.description,
    channelType:                 row.channel_type as NotificationChannelType,
    status:                      row.status as NotificationChannelStatus,
    priority:                    row.priority,
    isDefault:                   row.is_default,
    isEnabled:                   row.is_enabled,
    supportedTemplateCategories: parseJsonArray(row.supported_template_categories),
    configurationMetadata:       row.configuration_metadata ? (row.configuration_metadata as Record<string, unknown>) : null,
    createdAt:                   row.created_at,
    createdBy:                   row.created_by,
    updatedAt:                   row.updated_at,
    updatedBy:                   row.updated_by,
    isDeleted:                   row.is_deleted,
    deletedAt:                   row.deleted_at,
    deletedBy:                   row.deleted_by,
    version:                     row.version,
  };
}

function parseJsonArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val as string[];
  if (typeof val === 'string') {
    try {
      return JSON.parse(val) as string[];
    } catch {
      return [];
    }
  }
  return [];
}

function rethrowConstraintViolation(error: any, channelCode: string): never {
  const e = error as {
    code?:    string;
    meta?:    { target?: string[] | string };
    message?: string;
    cause?:   { code?: string };
  };

  if (e.code === 'P2002') {
    throw new DuplicateChannelCodeError(channelCode);
  }

  const rawCode = (e.cause as { code?: string } | undefined)?.code;
  const msg     = (e.message ?? '').toLowerCase();
  if (rawCode === '23505' || msg.includes('23505') || msg.includes('unique_violation')) {
    throw new DuplicateChannelCodeError(channelCode);
  }

  throw error;
}

// ─── Repository Implementation ────────────────────────────────────────────────

export class PrismaNotificationChannelRepository implements INotificationChannelRepository {

  // ─── save ──────────────────────────────────────────────────────────────────

  async save(channel: NotificationChannel): Promise<void> {
    const r = channel.toRecord();

    if (r.version === BigInt(1)) {
      // Insert
      try {
        await prisma.$executeRaw`
          INSERT INTO notification_channels (
            id, tenant_id, workspace_id,
            channel_code, channel_name, description,
            channel_type, status, priority,
            is_default, is_enabled,
            supported_template_categories, configuration_metadata,
            created_at, created_by, updated_at, updated_by,
            is_deleted, deleted_at, deleted_by, version
          ) VALUES (
            ${r.id}::uuid,
            ${r.tenantId}::uuid,
            ${r.workspaceId}::uuid,
            ${r.channelCode},
            ${r.channelName},
            ${r.description},
            ${r.channelType}::"NotificationChannelType",
            ${r.status}::"NotificationChannelStatus",
            ${r.priority},
            ${r.isDefault},
            ${r.isEnabled},
            ${JSON.stringify(r.supportedTemplateCategories)}::jsonb,
            ${r.configurationMetadata ? JSON.stringify(r.configurationMetadata) : null}::jsonb,
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
        rethrowConstraintViolation(error, r.channelCode);
      }
      return;
    }

    // Update with OCC
    const expectedVersion = r.version - BigInt(1);
    const affected = await prisma.$executeRaw`
      UPDATE notification_channels
      SET
        channel_name                  = ${r.channelName},
        description                   = ${r.description},
        status                        = ${r.status}::"NotificationChannelStatus",
        priority                      = ${r.priority},
        is_default                    = ${r.isDefault},
        is_enabled                    = ${r.isEnabled},
        supported_template_categories = ${JSON.stringify(r.supportedTemplateCategories)}::jsonb,
        configuration_metadata        = ${r.configurationMetadata ? JSON.stringify(r.configurationMetadata) : null}::jsonb,
        updated_at                    = ${r.updatedAt},
        updated_by                    = ${r.updatedBy}::uuid,
        is_deleted                    = ${r.isDeleted},
        deleted_at                    = ${r.deletedAt},
        deleted_by                    = ${r.deletedBy}::uuid,
        version                       = ${r.version}
      WHERE
        id         = ${r.id}::uuid
        AND tenant_id  = ${r.tenantId}::uuid
        AND version    = ${expectedVersion}
        AND is_deleted = false
    `;

    if (affected === 0) {
      throw new ChannelConcurrencyError(r.id);
    }
  }

  // ─── clearOtherDefaults ────────────────────────────────────────────────────

  async clearOtherDefaults(tenantId: string, channelType: string, excludeChannelId: string): Promise<void> {
    await prisma.$executeRaw`
      UPDATE notification_channels
      SET
        is_default = false,
        updated_at = NOW(),
        version    = version + 1
      WHERE
        tenant_id     = ${tenantId}::uuid
        AND channel_type  = ${channelType}::"NotificationChannelType"
        AND id            != ${excludeChannelId}::uuid
        AND is_default    = true
        AND is_deleted    = false
    `;
  }

  // ─── delete ────────────────────────────────────────────────────────────────

  async delete(id: string, tenantId: string, deletedBy: string): Promise<void> {
    await prisma.$executeRaw`
      UPDATE notification_channels
      SET
        is_deleted = true,
        deleted_at = NOW(),
        deleted_by = ${deletedBy}::uuid,
        is_enabled = false,
        is_default = false,
        status     = 'ARCHIVED'::"NotificationChannelStatus",
        updated_at = NOW(),
        updated_by = ${deletedBy}::uuid,
        version    = version + 1
      WHERE
        id         = ${id}::uuid
        AND tenant_id  = ${tenantId}::uuid
        AND is_deleted = false
    `;
  }

  // ─── findById ──────────────────────────────────────────────────────────────

  async findById(id: string, tenantId: string): Promise<NotificationChannel | null> {
    const row = await prisma.notificationChannel.findFirst({
      where: {
        id,
        tenantId,
        isDeleted: false,
      },
    });

    return row ? NotificationChannel.reconstitute(fromOrmRow(row)) : null;
  }

  // ─── findByCode ────────────────────────────────────────────────────────────

  async findByCode(tenantId: string, channelCode: string): Promise<NotificationChannel | null> {
    const row = await prisma.notificationChannel.findFirst({
      where: {
        tenantId,
        channelCode: channelCode.trim().toUpperCase(),
        isDeleted: false,
      },
    });

    return row ? NotificationChannel.reconstitute(fromOrmRow(row)) : null;
  }

  // ─── findDefaultChannel ────────────────────────────────────────────────────

  async findDefaultChannel(tenantId: string, channelType: string): Promise<NotificationChannel | null> {
    const row = await prisma.notificationChannel.findFirst({
      where: {
        tenantId,
        channelType: channelType as any,
        isDefault: true,
        isDeleted: false,
      },
    });

    return row ? NotificationChannel.reconstitute(fromOrmRow(row)) : null;
  }

  // ─── listActive ────────────────────────────────────────────────────────────

  async listActive(tenantId: string, category?: string): Promise<NotificationChannel[]> {
    const rows = await prisma.notificationChannel.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        isDeleted: false,
      },
      orderBy: [
        { priority: 'desc' },
        { channelCode: 'asc' },
      ],
    });

    const aggregates = rows.map(row => NotificationChannel.reconstitute(fromOrmRow(row)));
    if (category) {
      const upperCategory = category.trim().toUpperCase();
      return aggregates.filter(agg =>
        agg.supportedTemplateCategories.includes(upperCategory)
      );
    }

    return aggregates;
  }

  // ─── listEnabled ───────────────────────────────────────────────────────────

  async listEnabled(tenantId: string): Promise<NotificationChannel[]> {
    const rows = await prisma.notificationChannel.findMany({
      where: {
        tenantId,
        isEnabled: true,
        isDeleted: false,
      },
      orderBy: [
        { priority: 'desc' },
        { channelCode: 'asc' },
      ],
    });

    return rows.map(row => NotificationChannel.reconstitute(fromOrmRow(row)));
  }

  // ─── listByType ────────────────────────────────────────────────────────────

  async listByType(tenantId: string, channelType: string): Promise<NotificationChannel[]> {
    const rows = await prisma.notificationChannel.findMany({
      where: {
        tenantId,
        channelType: channelType as any,
        isDeleted: false,
      },
      orderBy: [
        { priority: 'desc' },
        { channelCode: 'asc' },
      ],
    });

    return rows.map(row => NotificationChannel.reconstitute(fromOrmRow(row)));
  }

  // ─── existsChannelCode ─────────────────────────────────────────────────────

  async existsChannelCode(tenantId: string, channelCode: string): Promise<boolean> {
    const count = await prisma.notificationChannel.count({
      where: {
        tenantId,
        channelCode: channelCode.trim().toUpperCase(),
        isDeleted: false,
      },
    });

    return count > 0;
  }
}
