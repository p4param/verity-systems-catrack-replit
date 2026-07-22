// VS09 EWP-001: NotificationTemplateService unit tests
// Profile: smoke — no DB connection required

import { NotificationTemplateService } from '../NotificationTemplateService';
import type { INotificationTemplateRepository } from '../../../domain/templates/INotificationTemplateRepository';
import { NotificationTemplate } from '../../../domain/templates/NotificationTemplate';
import type { NotificationTemplateRecord } from '../../../domain/templates/NotificationTemplateModels';
import { TEMPLATE_STATUS, TEMPLATE_CATEGORY, DELIVERY_CHANNEL } from '../../../domain/templates/NotificationTemplateModels';
import { DuplicateTemplateVersionError } from '../../../domain/templates/NotificationTemplateErrors';

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

function makeMockRepo(
  overrides: Partial<Record<keyof INotificationTemplateRepository, jest.Mock>> = {}
): jest.Mocked<INotificationTemplateRepository> {
  return {
    save: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue(null),
    findByCode: jest.fn().mockResolvedValue(null),
    findLatestPublishedVersion: jest.fn().mockResolvedValue(null),
    findParentTemplate: jest.fn().mockResolvedValue(null),
    listPublished: jest.fn().mockResolvedValue([]),
    listByChannel: jest.fn().mockResolvedValue([]),
    listByLanguage: jest.fn().mockResolvedValue([]),
    ...overrides,
  } as any;
}

const mockPublisher = {
  publish: jest.fn().mockResolvedValue(undefined),
  publishAll: jest.fn().mockResolvedValue(undefined),
};

describe('NotificationTemplateService', () => {
  let repo: jest.Mocked<INotificationTemplateRepository>;
  let service: NotificationTemplateService;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = makeMockRepo();
    service = new NotificationTemplateService(repo, mockPublisher);
  });

  describe('createTemplate()', () => {
    test('creates and persists template and dispatches domain event', async () => {
      const command = {
        tenantId: TENANT_ID,
        templateCode: 'WELCOME_EMAIL',
        templateName: 'Welcome Email Template',
        category: TEMPLATE_CATEGORY.Transactional,
        defaultLanguage: 'en',
        supportedChannels: [DELIVERY_CHANNEL.Email],
        variableSchema: { type: 'object' },
        actorUserId: ACTOR,
      };

      const result = await service.createTemplate(command);

      expect(result.templateCode).toBe('WELCOME_EMAIL');
      expect(repo.save).toHaveBeenCalledTimes(1);
      expect(mockPublisher.publishAll).toHaveBeenCalledTimes(1);
      expect(mockPublisher.publishAll.mock.calls[0][0][0].type).toBe('TemplateCreated');
    });

    test('throws DuplicateTemplateVersionError when code+version already exists', async () => {
      repo.findByCode.mockResolvedValueOnce(NotificationTemplate.reconstitute(makeRecord()));

      const command = {
        tenantId: TENANT_ID,
        templateCode: 'WELCOME_EMAIL',
        templateName: 'Welcome Email Template',
        category: TEMPLATE_CATEGORY.Transactional,
        defaultLanguage: 'en',
        supportedChannels: [DELIVERY_CHANNEL.Email],
        variableSchema: { type: 'object' },
        actorUserId: ACTOR,
      };

      await expect(service.createTemplate(command)).rejects.toThrow(DuplicateTemplateVersionError);
    });
  });

  describe('publishTemplate()', () => {
    test('publishes draft and dispatches event', async () => {
      const draft = NotificationTemplate.reconstitute(makeRecord());
      repo.findById.mockResolvedValueOnce(draft);

      const result = await service.publishTemplate({
        templateId: TEMPLATE_ID,
        tenantId: TENANT_ID,
        actorUserId: ACTOR,
      });

      expect(result.status).toBe(TEMPLATE_STATUS.Published);
      expect(repo.save).toHaveBeenCalledTimes(1);
      expect(mockPublisher.publishAll).toHaveBeenCalledTimes(1);
      expect(mockPublisher.publishAll.mock.calls[0][0][0].type).toBe('TemplatePublished');
    });
  });

  describe('createVersion()', () => {
    test('creates new version from published predecessor', async () => {
      const parent = NotificationTemplate.reconstitute(makeRecord({ status: TEMPLATE_STATUS.Published }));
      repo.findById.mockResolvedValueOnce(parent);

      const result = await service.createVersion({
        templateId: TEMPLATE_ID,
        tenantId: TENANT_ID,
        newVersion: '1.1.0',
        actorUserId: ACTOR,
      });

      expect(result.templateVersion).toBe('1.1.0');
      expect(result.parentTemplateId).toBe(TEMPLATE_ID);
      expect(result.status).toBe(TEMPLATE_STATUS.Draft);
      expect(repo.save).toHaveBeenCalledTimes(1);
      expect(mockPublisher.publishAll.mock.calls[0][0][0].type).toBe('TemplateVersionCreated');
    });
  });

  describe('updateTemplateMetadata()', () => {
    test('updates non-content fields of a draft template', async () => {
      const draft = NotificationTemplate.reconstitute(makeRecord());
      repo.findById.mockResolvedValueOnce(draft);

      const result = await service.updateTemplateMetadata({
        templateId: TEMPLATE_ID,
        tenantId: TENANT_ID,
        templateName: 'New Template Name',
        description: 'Updated Description',
        brandingProfileId: 'branding-1',
        actorUserId: ACTOR,
      });

      expect(result.templateName).toBe('New Template Name');
      expect(result.description).toBe('Updated Description');
      expect(result.brandingProfileId).toBe('branding-1');
      expect(repo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('addLanguage() / removeLanguage()', () => {
    test('adds and removes language successfully', async () => {
      const draft = NotificationTemplate.reconstitute(makeRecord());
      repo.findById.mockResolvedValueOnce(draft);

      let result = await service.addLanguage({
        templateId: TEMPLATE_ID,
        tenantId: TENANT_ID,
        languageCode: 'es',
        actorUserId: ACTOR,
      });

      expect(result.supportedLanguages).toContain('es');

      repo.findById.mockResolvedValueOnce(NotificationTemplate.reconstitute(result));

      result = await service.removeLanguage({
        templateId: TEMPLATE_ID,
        tenantId: TENANT_ID,
        languageCode: 'es',
        actorUserId: ACTOR,
      });

      expect(result.supportedLanguages).not.toContain('es');
    });
  });

  describe('addChannel() / removeChannel()', () => {
    test('adds and removes channel successfully', async () => {
      const draft = NotificationTemplate.reconstitute(makeRecord({ supportedChannels: [DELIVERY_CHANNEL.Email, DELIVERY_CHANNEL.Sms] }));
      repo.findById.mockResolvedValueOnce(draft);

      let result = await service.addChannel({
        templateId: TEMPLATE_ID,
        tenantId: TENANT_ID,
        channel: DELIVERY_CHANNEL.Push,
        actorUserId: ACTOR,
      });

      expect(result.supportedChannels).toContain(DELIVERY_CHANNEL.Push);

      repo.findById.mockResolvedValueOnce(NotificationTemplate.reconstitute(result));

      result = await service.removeChannel({
        templateId: TEMPLATE_ID,
        tenantId: TENANT_ID,
        channel: DELIVERY_CHANNEL.Sms,
        actorUserId: ACTOR,
      });

      expect(result.supportedChannels).not.toContain(DELIVERY_CHANNEL.Sms);
    });
  });

  describe('Queries', () => {
    test('getById()', async () => {
      const record = makeRecord();
      repo.findById.mockResolvedValueOnce(NotificationTemplate.reconstitute(record));

      const result = await service.getById(TEMPLATE_ID, TENANT_ID);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(TEMPLATE_ID);
    });

    test('getByCode()', async () => {
      const record = makeRecord();
      repo.findByCode.mockResolvedValueOnce(NotificationTemplate.reconstitute(record));

      const result = await service.getByCode(TENANT_ID, 'WELCOME_EMAIL');
      expect(result).not.toBeNull();
      expect(result!.templateCode).toBe('WELCOME_EMAIL');
    });

    test('getLatestPublishedVersion()', async () => {
      const record = makeRecord({ status: TEMPLATE_STATUS.Published });
      repo.findLatestPublishedVersion.mockResolvedValueOnce(NotificationTemplate.reconstitute(record));

      const result = await service.getLatestPublishedVersion(TENANT_ID, 'WELCOME_EMAIL');
      expect(result).not.toBeNull();
      expect(result!.status).toBe(TEMPLATE_STATUS.Published);
    });

    test('listPublished()', async () => {
      const record = makeRecord({ status: TEMPLATE_STATUS.Published });
      repo.listPublished.mockResolvedValueOnce([NotificationTemplate.reconstitute(record)]);

      const results = await service.listPublished(TENANT_ID);
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe(TEMPLATE_STATUS.Published);
    });

    test('listByChannel()', async () => {
      const record = makeRecord({ status: TEMPLATE_STATUS.Published });
      repo.listByChannel.mockResolvedValueOnce([NotificationTemplate.reconstitute(record)]);

      const results = await service.listByChannel(TENANT_ID, DELIVERY_CHANNEL.Email);
      expect(results).toHaveLength(1);
    });

    test('listByLanguage()', async () => {
      const record = makeRecord({ status: TEMPLATE_STATUS.Published });
      repo.listByLanguage.mockResolvedValueOnce([NotificationTemplate.reconstitute(record)]);

      const results = await service.listByLanguage(TENANT_ID, 'en');
      expect(results).toHaveLength(1);
    });
  });
});
