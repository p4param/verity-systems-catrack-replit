// VS09 EWP-001: NotificationTemplateRepository unit tests (using mocked Prisma client)
// Profile: smoke — no DB connection required

import { PrismaNotificationTemplateRepository } from '../PrismaNotificationTemplateRepository';
import { NotificationTemplate } from '../../../domain/templates/NotificationTemplate';
import type { NotificationTemplateRecord } from '../../../domain/templates/NotificationTemplateModels';
import { TEMPLATE_STATUS, TEMPLATE_CATEGORY, DELIVERY_CHANNEL } from '../../../domain/templates/NotificationTemplateModels';
import {
  TemplateConcurrencyError,
  DuplicateTemplateVersionError,
} from '../../../domain/templates/NotificationTemplateErrors';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
    notificationTemplate: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
const mockPrisma = prisma as unknown as {
  $executeRaw: jest.Mock;
  $queryRaw: jest.Mock;
  notificationTemplate: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
  };
};

const TENANT_ID = '00000000-0000-0000-0000-000000000010';
const ACTOR = '00000000-0000-0000-0000-000000000001';
const TEMPLATE_ID = '00000000-0000-0000-0000-000000000020';

function makeRecord(overrides: Partial<NotificationTemplateRecord> = {}): NotificationTemplateRecord {
  return {
    id: TEMPLATE_ID,
    tenantId: TENANT_ID,
    workspaceId: null,
    templateCode: 'WELCOME_EMAIL',
    templateName: 'Welcome Email Template',
    description: null,
    category: TEMPLATE_CATEGORY.Transactional,
    status: TEMPLATE_STATUS.Draft,
    templateVersion: '1.0.0',
    parentTemplateId: null,
    supportedChannels: [DELIVERY_CHANNEL.Email],
    supportedLanguages: ['en'],
    defaultLanguage: 'en',
    brandingProfileId: null,
    isSystemTemplate: false,
    isActive: true,
    variableSchema: { type: 'object' },
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

let repo: PrismaNotificationTemplateRepository;

beforeEach(() => {
  repo = new PrismaNotificationTemplateRepository();
  jest.clearAllMocks();
});

describe('PrismaNotificationTemplateRepository', () => {
  describe('save() for insert (version = 1n)', () => {
    test('executes INSERT sql raw query', async () => {
      mockPrisma.$executeRaw.mockResolvedValueOnce(1);
      const template = NotificationTemplate.reconstitute(makeRecord({ version: 1n }));

      await repo.save(template);

      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
      const sqlCall = mockPrisma.$executeRaw.mock.calls[0][0].join(' ');
      expect(sqlCall).toContain('INSERT INTO notification_templates');
    });

    test('rethrows unique constraint violations as DuplicateTemplateVersionError', async () => {
      const dbError = Object.assign(new Error('Unique constraint failed'), {
        code: 'P2002',
        meta: { target: ['tenant_id', 'template_code', 'template_version'] },
      });
      mockPrisma.$executeRaw.mockRejectedValueOnce(dbError);
      const template = NotificationTemplate.reconstitute(makeRecord({ version: 1n }));

      await expect(repo.save(template)).rejects.toThrow(DuplicateTemplateVersionError);
    });
  });

  describe('save() for update (version > 1n)', () => {
    test('executes UPDATE sql query and passes expected version check', async () => {
      mockPrisma.$executeRaw.mockResolvedValueOnce(1);
      const template = NotificationTemplate.reconstitute(makeRecord({ version: 2n }));

      await repo.save(template);

      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
      const sqlCall = mockPrisma.$executeRaw.mock.calls[0][0].join(' ');
      expect(sqlCall).toContain('UPDATE notification_templates');
    });

    test('throws TemplateConcurrencyError when 0 rows affected', async () => {
      mockPrisma.$executeRaw.mockResolvedValueOnce(0);
      const template = NotificationTemplate.reconstitute(makeRecord({ version: 2n }));

      await expect(repo.save(template)).rejects.toThrow(TemplateConcurrencyError);
    });
  });

  describe('delete()', () => {
    test('executes soft delete UPDATE query', async () => {
      mockPrisma.$executeRaw.mockResolvedValueOnce(1);
      await repo.delete(TEMPLATE_ID, TENANT_ID, ACTOR);

      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
      const sqlCall = mockPrisma.$executeRaw.mock.calls[0][0].join(' ');
      expect(sqlCall).toContain('is_deleted = true');
    });
  });

  describe('findById()', () => {
    test('returns aggregate when found', async () => {
      const record = makeRecord();
      mockPrisma.notificationTemplate.findFirst.mockResolvedValueOnce(record);

      const result = await repo.findById(TEMPLATE_ID, TENANT_ID);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(TEMPLATE_ID);
      expect(mockPrisma.notificationTemplate.findFirst).toHaveBeenCalledWith({
        where: { id: TEMPLATE_ID, tenantId: TENANT_ID, isDeleted: false },
      });
    });

    test('returns null when not found', async () => {
      mockPrisma.notificationTemplate.findFirst.mockResolvedValueOnce(null);
      const result = await repo.findById(TEMPLATE_ID, TENANT_ID);
      expect(result).toBeNull();
    });
  });

  describe('findByCode()', () => {
    test('returns aggregate when code is matched', async () => {
      const record = makeRecord();
      mockPrisma.notificationTemplate.findFirst.mockResolvedValueOnce(record);

      const result = await repo.findByCode(TENANT_ID, 'WELCOME_EMAIL', '1.0.0');

      expect(result).not.toBeNull();
      expect(result!.templateCode).toBe('WELCOME_EMAIL');
      expect(mockPrisma.notificationTemplate.findFirst).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, templateCode: 'WELCOME_EMAIL', templateVersion: '1.0.0', isDeleted: false },
        orderBy: { templateVersion: 'desc' },
      });
    });
  });

  describe('findLatestPublishedVersion()', () => {
    test('returns latest published template version', async () => {
      const record = makeRecord({ status: TEMPLATE_STATUS.Published });
      mockPrisma.notificationTemplate.findFirst.mockResolvedValueOnce(record);

      const result = await repo.findLatestPublishedVersion(TENANT_ID, 'WELCOME_EMAIL');

      expect(result).not.toBeNull();
      expect(result!.status).toBe(TEMPLATE_STATUS.Published);
      expect(mockPrisma.notificationTemplate.findFirst).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, templateCode: 'WELCOME_EMAIL', status: TEMPLATE_STATUS.Published, isDeleted: false },
        orderBy: { templateVersion: 'desc' },
      });
    });
  });

  describe('listPublished()', () => {
    test('returns matching published list', async () => {
      const record = makeRecord({ status: TEMPLATE_STATUS.Published });
      mockPrisma.notificationTemplate.findMany.mockResolvedValueOnce([record]);

      const results = await repo.listPublished(TENANT_ID, TEMPLATE_CATEGORY.Transactional);

      expect(results).toHaveLength(1);
      expect(mockPrisma.notificationTemplate.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, category: TEMPLATE_CATEGORY.Transactional, status: TEMPLATE_STATUS.Published, isDeleted: false },
        orderBy: [{ templateCode: 'asc' }, { templateVersion: 'desc' }],
      });
    });
  });

  describe('listByChannel()', () => {
    test('executes jsonb queryRaw to filter channels', async () => {
      const rawRow = {
        id: TEMPLATE_ID,
        tenant_id: TENANT_ID,
        workspace_id: null,
        template_code: 'WELCOME_EMAIL',
        template_name: 'Welcome Email Template',
        description: null,
        category: TEMPLATE_CATEGORY.Transactional,
        status: TEMPLATE_STATUS.Published,
        template_version: '1.0.0',
        parent_template_id: null,
        supported_channels: [DELIVERY_CHANNEL.Email],
        supported_languages: ['en'],
        default_language: 'en',
        branding_profile_id: null,
        is_system_template: false,
        is_active: true,
        variable_schema: { type: 'object' },
        created_at: new Date('2026-01-01T00:00:00Z'),
        created_by: ACTOR,
        updated_at: new Date('2026-01-01T00:00:00Z'),
        updated_by: ACTOR,
        is_deleted: false,
        deleted_at: null,
        deleted_by: null,
        version: 1n,
      };
      mockPrisma.$queryRaw.mockResolvedValueOnce([rawRow]);

      const results = await repo.listByChannel(TENANT_ID, DELIVERY_CHANNEL.Email);

      expect(results).toHaveLength(1);
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    });
  });

  describe('listByLanguage()', () => {
    test('executes jsonb queryRaw to filter languages', async () => {
      const rawRow = {
        id: TEMPLATE_ID,
        tenant_id: TENANT_ID,
        workspace_id: null,
        template_code: 'WELCOME_EMAIL',
        template_name: 'Welcome Email Template',
        description: null,
        category: TEMPLATE_CATEGORY.Transactional,
        status: TEMPLATE_STATUS.Published,
        template_version: '1.0.0',
        parent_template_id: null,
        supported_channels: [DELIVERY_CHANNEL.Email],
        supported_languages: ['en'],
        default_language: 'en',
        branding_profile_id: null,
        is_system_template: false,
        is_active: true,
        variable_schema: { type: 'object' },
        created_at: new Date('2026-01-01T00:00:00Z'),
        created_by: ACTOR,
        updated_at: new Date('2026-01-01T00:00:00Z'),
        updated_by: ACTOR,
        is_deleted: false,
        deleted_at: null,
        deleted_by: null,
        version: 1n,
      };
      mockPrisma.$queryRaw.mockResolvedValueOnce([rawRow]);

      const results = await repo.listByLanguage(TENANT_ID, 'en');

      expect(results).toHaveLength(1);
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    });
  });
});
