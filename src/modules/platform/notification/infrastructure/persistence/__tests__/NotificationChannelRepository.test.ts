// VS09 EWP-002: NotificationChannelRepository unit tests (using mocked Prisma client)
// Profile: smoke — no DB connection required

import { PrismaNotificationChannelRepository } from '../PrismaNotificationChannelRepository';
import { NotificationChannel } from '../../../domain/channels/NotificationChannel';
import type { NotificationChannelRecord } from '../../../domain/channels/NotificationChannelModels';
import { CHANNEL_STATUS, CHANNEL_TYPE } from '../../../domain/channels/NotificationChannelModels';
import {
  ChannelConcurrencyError,
  DuplicateChannelCodeError,
} from '../../../domain/channels/NotificationChannelErrors';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $executeRaw: jest.fn(),
    notificationChannel: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
const mockPrisma = prisma as unknown as {
  $executeRaw: jest.Mock;
  notificationChannel: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
  };
};

const TENANT_ID = '00000000-0000-0000-0000-000000000010';
const ACTOR = '00000000-0000-0000-0000-000000000001';
const CHANNEL_ID = '00000000-0000-0000-0000-000000000020';

function makeRecord(overrides: Partial<NotificationChannelRecord> = {}): NotificationChannelRecord {
  return {
    id: CHANNEL_ID,
    tenantId: TENANT_ID,
    workspaceId: null,
    channelCode: 'EMAIL_PRIMARY',
    channelName: 'Primary Email',
    description: null,
    channelType: CHANNEL_TYPE.Email,
    status: CHANNEL_STATUS.Draft,
    priority: 100,
    isDefault: false,
    isEnabled: true,
    supportedTemplateCategories: ['TRANSACTIONAL'],
    configurationMetadata: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    createdBy: ACTOR,
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    updatedBy: ACTOR,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    version: 1n,
    ...overrides,
  };
}

let repo: PrismaNotificationChannelRepository;

beforeEach(() => {
  repo = new PrismaNotificationChannelRepository();
  jest.clearAllMocks();
});

describe('PrismaNotificationChannelRepository', () => {
  describe('save() for insert (version = 1n)', () => {
    test('executes INSERT sql raw query', async () => {
      mockPrisma.$executeRaw.mockResolvedValueOnce(1);
      const channel = NotificationChannel.reconstitute(makeRecord({ version: 1n }));

      await repo.save(channel);

      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
      const sqlCall = mockPrisma.$executeRaw.mock.calls[0][0].join(' ');
      expect(sqlCall).toContain('INSERT INTO notification_channels');
    });

    test('rethrows P2002 unique constraint violation error as DuplicateChannelCodeError', async () => {
      const dbError = new Error('Unique constraint failed');
      (dbError as any).code = 'P2002';
      mockPrisma.$executeRaw.mockRejectedValueOnce(dbError);

      const channel = NotificationChannel.reconstitute(makeRecord({ version: 1n }));

      await expect(repo.save(channel)).rejects.toThrow(DuplicateChannelCodeError);
    });
  });

  describe('save() for update (version > 1n) with OCC', () => {
    test('executes UPDATE sql raw query comparing expected version', async () => {
      mockPrisma.$executeRaw.mockResolvedValueOnce(1);
      const channel = NotificationChannel.reconstitute(makeRecord({ version: 2n }));

      await repo.save(channel);

      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
      const sqlCall = mockPrisma.$executeRaw.mock.calls[0][0].join(' ');
      expect(sqlCall).toContain('UPDATE notification_channels');
      expect(sqlCall).toContain('version    =');
    });

    test('throws ChannelConcurrencyError if affected rows is 0', async () => {
      mockPrisma.$executeRaw.mockResolvedValueOnce(0);
      const channel = NotificationChannel.reconstitute(makeRecord({ version: 2n }));

      await expect(repo.save(channel)).rejects.toThrow(ChannelConcurrencyError);
    });
  });

  describe('clearOtherDefaults()', () => {
    test('executes UPDATE query setting defaults to false', async () => {
      mockPrisma.$executeRaw.mockResolvedValueOnce(1);

      await repo.clearOtherDefaults(TENANT_ID, CHANNEL_TYPE.Email, CHANNEL_ID);

      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
      const sqlCall = mockPrisma.$executeRaw.mock.calls[0][0].join(' ');
      expect(sqlCall).toContain('UPDATE notification_channels');
      expect(sqlCall).toContain('is_default = false');
    });
  });

  describe('delete()', () => {
    test('executes soft delete UPDATE query', async () => {
      mockPrisma.$executeRaw.mockResolvedValueOnce(1);

      await repo.delete(CHANNEL_ID, TENANT_ID, ACTOR);

      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
      const sqlCall = mockPrisma.$executeRaw.mock.calls[0][0].join(' ');
      expect(sqlCall).toContain('UPDATE notification_channels');
      expect(sqlCall).toContain('is_deleted = true');
    });
  });

  describe('findById()', () => {
    test('calls findFirst and returns reconstituted aggregate', async () => {
      const raw = {
        id: CHANNEL_ID,
        tenant_id: TENANT_ID,
        channel_code: 'EMAIL_PRIMARY',
        channel_name: 'Primary Email',
        channel_type: CHANNEL_TYPE.Email,
        status: CHANNEL_STATUS.Draft,
        priority: 100,
        is_default: false,
        is_enabled: true,
        supported_template_categories: ['TRANSACTIONAL'],
        configuration_metadata: null,
        created_at: new Date(),
        created_by: ACTOR,
        updated_at: new Date(),
        updated_by: ACTOR,
        is_deleted: false,
        deleted_at: null,
        deleted_by: null,
        version: 1n,
      };

      mockPrisma.notificationChannel.findFirst.mockResolvedValueOnce({
        id: raw.id,
        tenantId: raw.tenant_id,
        workspaceId: null,
        channelCode: raw.channel_code,
        channelName: raw.channel_name,
        description: null,
        channelType: raw.channel_type,
        status: raw.status,
        priority: raw.priority,
        isDefault: raw.is_default,
        isEnabled: raw.is_enabled,
        supportedTemplateCategories: raw.supported_template_categories,
        configurationMetadata: raw.configuration_metadata,
        createdAt: raw.created_at,
        createdBy: raw.created_by,
        updatedAt: raw.updated_at,
        updatedBy: raw.updated_by,
        isDeleted: raw.is_deleted,
        deletedAt: raw.deleted_at,
        deletedBy: raw.deleted_by,
        version: raw.version,
      });

      const channel = await repo.findById(CHANNEL_ID, TENANT_ID);

      expect(channel).not.toBeNull();
      expect(channel?.id).toBe(CHANNEL_ID);
      expect(channel?.channelCode).toBe('EMAIL_PRIMARY');
      expect(mockPrisma.notificationChannel.findFirst).toHaveBeenCalledWith({
        where: { id: CHANNEL_ID, tenantId: TENANT_ID, isDeleted: false },
      });
    });

    test('returns null when record not found', async () => {
      mockPrisma.notificationChannel.findFirst.mockResolvedValueOnce(null);

      const channel = await repo.findById(CHANNEL_ID, TENANT_ID);

      expect(channel).toBeNull();
    });
  });

  describe('findByCode()', () => {
    test('calls findFirst filtering by tenant and code', async () => {
      mockPrisma.notificationChannel.findFirst.mockResolvedValueOnce(null);

      await repo.findByCode(TENANT_ID, 'EMAIL_PRIMARY');

      expect(mockPrisma.notificationChannel.findFirst).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, channelCode: 'EMAIL_PRIMARY', isDeleted: false },
      });
    });
  });

  describe('existsChannelCode()', () => {
    test('calls count and returns true if count > 0', async () => {
      mockPrisma.notificationChannel.count.mockResolvedValueOnce(1);

      const exists = await repo.existsChannelCode(TENANT_ID, 'EMAIL_PRIMARY');

      expect(exists).toBe(true);
      expect(mockPrisma.notificationChannel.count).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, channelCode: 'EMAIL_PRIMARY', isDeleted: false },
      });
    });
  });
});
