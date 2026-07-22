// VS09 EWP-002: NotificationChannelService unit tests
// Profile: smoke — no DB connection required

import { NotificationChannelService } from '../NotificationChannelService';
import type { INotificationChannelRepository } from '../../../domain/channels/INotificationChannelRepository';
import { NotificationChannel } from '../../../domain/channels/NotificationChannel';
import type { NotificationChannelRecord } from '../../../domain/channels/NotificationChannelModels';
import { CHANNEL_STATUS, CHANNEL_TYPE } from '../../../domain/channels/NotificationChannelModels';
import { DuplicateChannelCodeError, NotificationChannelNotFoundError } from '../../../domain/channels/NotificationChannelErrors';

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

function makeMockRepo(
  overrides: Partial<Record<keyof INotificationChannelRepository, jest.Mock>> = {}
): jest.Mocked<INotificationChannelRepository> {
  return {
    save: jest.fn().mockResolvedValue(undefined),
    clearOtherDefaults: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue(null),
    findByCode: jest.fn().mockResolvedValue(null),
    findDefaultChannel: jest.fn().mockResolvedValue(null),
    listActive: jest.fn().mockResolvedValue([]),
    listEnabled: jest.fn().mockResolvedValue([]),
    listByType: jest.fn().mockResolvedValue([]),
    existsChannelCode: jest.fn().mockResolvedValue(false),
    ...overrides,
  } as any;
}

const mockPublisher = {
  publish: jest.fn().mockResolvedValue(undefined),
  publishAll: jest.fn().mockResolvedValue(undefined),
};

describe('NotificationChannelService', () => {
  let repo: jest.Mocked<INotificationChannelRepository>;
  let service: NotificationChannelService;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = makeMockRepo();
    service = new NotificationChannelService(repo, mockPublisher);
  });

  describe('createChannel()', () => {
    test('creates, saves, and dispatches domain events successfully', async () => {
      const command = {
        tenantId: TENANT_ID,
        channelCode: 'EMAIL_PRIMARY',
        channelName: 'Primary Email',
        channelType: CHANNEL_TYPE.Email,
        actorUserId: ACTOR,
      };

      const result = await service.createChannel(command);

      expect(result.channelCode).toBe('EMAIL_PRIMARY');
      expect(repo.save).toHaveBeenCalledTimes(1);
      expect(mockPublisher.publishAll).toHaveBeenCalledTimes(1);
      expect(mockPublisher.publishAll.mock.calls[0][0][0].type).toBe('ChannelCreated');
    });

    test('throws DuplicateChannelCodeError if code already exists', async () => {
      repo.existsChannelCode.mockResolvedValueOnce(true);

      const command = {
        tenantId: TENANT_ID,
        channelCode: 'EMAIL_PRIMARY',
        channelName: 'Primary Email',
        channelType: CHANNEL_TYPE.Email,
        actorUserId: ACTOR,
      };

      await expect(service.createChannel(command)).rejects.toThrow(DuplicateChannelCodeError);
    });
  });

  describe('updateChannelMetadata()', () => {
    test('loads, updates metadata, saves, and dispatches successfully', async () => {
      const channel = NotificationChannel.reconstitute(makeRecord());
      repo.findById.mockResolvedValueOnce(channel);

      const command = {
        channelId: CHANNEL_ID,
        tenantId: TENANT_ID,
        channelName: 'Updated Email Gateway',
        priority: 250,
        actorUserId: ACTOR,
      };

      const result = await service.updateChannelMetadata(command);

      expect(result.channelName).toBe('Updated Email Gateway');
      expect(result.priority).toBe(250);
      expect(repo.save).toHaveBeenCalledTimes(1);
    });

    test('throws NotificationChannelNotFoundError if channel not found', async () => {
      const command = {
        channelId: CHANNEL_ID,
        tenantId: TENANT_ID,
        channelName: 'Updated',
        actorUserId: ACTOR,
      };

      await expect(service.updateChannelMetadata(command)).rejects.toThrow(NotificationChannelNotFoundError);
    });
  });

  describe('activateChannel()', () => {
    test('activates channel aggregate successfully', async () => {
      const channel = NotificationChannel.reconstitute(makeRecord({ status: CHANNEL_STATUS.Draft }));
      repo.findById.mockResolvedValueOnce(channel);

      const result = await service.activateChannel({
        channelId: CHANNEL_ID,
        tenantId: TENANT_ID,
        actorUserId: ACTOR,
      });

      expect(result.status).toBe(CHANNEL_STATUS.Active);
      expect(repo.save).toHaveBeenCalledTimes(1);
      expect(mockPublisher.publishAll.mock.calls[0][0][0].type).toBe('ChannelActivated');
    });
  });

  describe('setDefaultChannel()', () => {
    test('sets default status and clears other defaults in persistence layer (RC-003)', async () => {
      const channel = NotificationChannel.reconstitute(makeRecord({ isEnabled: true, status: CHANNEL_STATUS.Active }));
      repo.findById.mockResolvedValueOnce(channel);

      const result = await service.setDefaultChannel({
        channelId: CHANNEL_ID,
        tenantId: TENANT_ID,
        actorUserId: ACTOR,
      });

      expect(result.isDefault).toBe(true);
      expect(repo.save).toHaveBeenCalledTimes(1);
      expect(repo.clearOtherDefaults).toHaveBeenCalledWith(TENANT_ID, CHANNEL_TYPE.Email, CHANNEL_ID);
      expect(mockPublisher.publishAll.mock.calls[0][0][0].type).toBe('DefaultChannelChanged');
    });
  });
});
