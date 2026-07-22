// VS09 EWP-002: NotificationChannel domain unit tests
// Profile: smoke — no DB connection required

import { NotificationChannel } from '../NotificationChannel';
import {
  ChannelStateImmutableError,
  InvalidChannelTransitionError,
  ChannelValidationError,
} from '../NotificationChannelErrors';
import { CHANNEL_STATUS, CHANNEL_TYPE } from '../NotificationChannelModels';

const TENANT_ID = '00000000-0000-0000-0000-000000000010';
const ACTOR = '00000000-0000-0000-0000-000000000001';

describe('NotificationChannel Aggregate Root', () => {
  describe('CreateChannel Command', () => {
    test('creates new draft channel with valid input', () => {
      const channel = NotificationChannel.create({
        tenantId: TENANT_ID,
        channelCode: 'EMAIL_PRIMARY',
        channelName: 'Primary Email Gateway',
        channelType: CHANNEL_TYPE.Email,
        priority: 150,
        supportedTemplateCategories: ['transactional', 'workflow'],
        configurationMetadata: { host: 'smtp.mail.com', port: 587 },
        actorUserId: ACTOR,
      });

      expect(channel.id).toBeDefined();
      expect(channel.tenantId).toBe(TENANT_ID);
      expect(channel.channelCode).toBe('EMAIL_PRIMARY');
      expect(channel.channelName).toBe('Primary Email Gateway');
      expect(channel.channelType).toBe(CHANNEL_TYPE.Email);
      expect(channel.status).toBe(CHANNEL_STATUS.Draft);
      expect(channel.priority).toBe(150);
      expect(channel.isDefault).toBe(false);
      expect(channel.isEnabled).toBe(true);
      expect(channel.supportedTemplateCategories).toEqual(['TRANSACTIONAL', 'WORKFLOW']);
      expect(channel.configurationMetadata).toEqual({ host: 'smtp.mail.com', port: 587 });
      expect(channel.version).toBe(BigInt(1));

      const events = channel.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('ChannelCreated');
    });

    test('deduplicates supported categories on creation (RC-005)', () => {
      const channel = NotificationChannel.create({
        tenantId: TENANT_ID,
        channelCode: 'SMS_DEFAULT',
        channelName: 'Fallback SMS',
        channelType: CHANNEL_TYPE.Sms,
        supportedTemplateCategories: ['security', 'security', 'workflow'],
        actorUserId: ACTOR,
      });

      expect(channel.supportedTemplateCategories).toEqual(['SECURITY', 'WORKFLOW']);
    });

    test('throws ChannelValidationError on empty required fields', () => {
      expect(() =>
        NotificationChannel.create({
          tenantId: '',
          channelCode: '  ',
          channelName: '',
          channelType: CHANNEL_TYPE.Email,
          actorUserId: ACTOR,
        })
      ).toThrow(ChannelValidationError);
    });

    test('throws ChannelValidationError on invalid channel type', () => {
      expect(() =>
        NotificationChannel.create({
          tenantId: TENANT_ID,
          channelCode: 'TEST',
          channelName: 'Test Channel',
          channelType: 'INVALID_TYPE' as any,
          actorUserId: ACTOR,
        })
      ).toThrow(ChannelValidationError);
    });

    test('throws ChannelValidationError on invalid priority', () => {
      expect(() =>
        NotificationChannel.create({
          tenantId: TENANT_ID,
          channelCode: 'TEST',
          channelName: 'Test Channel',
          channelType: CHANNEL_TYPE.Email,
          priority: -5,
          actorUserId: ACTOR,
        })
      ).toThrow(ChannelValidationError);
    });

    test('throws ChannelValidationError on sensitive configurationMetadata fields (RC-002)', () => {
      expect(() =>
        NotificationChannel.create({
          tenantId: TENANT_ID,
          channelCode: 'EMAIL',
          channelName: 'Email',
          channelType: CHANNEL_TYPE.Email,
          configurationMetadata: { host: 'smtp.mail.com', smtpPassword: '123' },
          actorUserId: ACTOR,
        })
      ).toThrow(ChannelValidationError);

      expect(() =>
        NotificationChannel.create({
          tenantId: TENANT_ID,
          channelCode: 'EMAIL',
          channelName: 'Email',
          channelType: CHANNEL_TYPE.Email,
          configurationMetadata: { host: 'smtp.mail.com', clientSecret: 'abc' },
          actorUserId: ACTOR,
        })
      ).toThrow(ChannelValidationError);
    });
  });

  describe('Lifecycle State Transitions', () => {
    test('transitions draft to active successfully', () => {
      const channel = NotificationChannel.create({
        tenantId: TENANT_ID,
        channelCode: 'EMAIL',
        channelName: 'Email',
        channelType: CHANNEL_TYPE.Email,
        actorUserId: ACTOR,
      });

      channel.activate(ACTOR);
      expect(channel.status).toBe(CHANNEL_STATUS.Active);
      expect(channel.version).toBe(BigInt(2));

      const events = channel.pullDomainEvents();
      // First is Created, second is Activated
      expect(events).toHaveLength(2);
      expect(events[1].type).toBe('ChannelActivated');
    });

    test('transitions active to suspended successfully', () => {
      const channel = NotificationChannel.create({
        tenantId: TENANT_ID,
        channelCode: 'EMAIL',
        channelName: 'Email',
        channelType: CHANNEL_TYPE.Email,
        actorUserId: ACTOR,
      });

      channel.activate(ACTOR);
      channel.suspend(ACTOR);
      expect(channel.status).toBe(CHANNEL_STATUS.Suspended);
      expect(channel.version).toBe(BigInt(3));
    });

    test('transitions suspended back to active successfully', () => {
      const channel = NotificationChannel.create({
        tenantId: TENANT_ID,
        channelCode: 'EMAIL',
        channelName: 'Email',
        channelType: CHANNEL_TYPE.Email,
        actorUserId: ACTOR,
      });

      channel.activate(ACTOR);
      channel.suspend(ACTOR);
      channel.activate(ACTOR);
      expect(channel.status).toBe(CHANNEL_STATUS.Active);
    });

    test('transitions active to archived terminal state and disables channel', () => {
      const channel = NotificationChannel.create({
        tenantId: TENANT_ID,
        channelCode: 'EMAIL',
        channelName: 'Email',
        channelType: CHANNEL_TYPE.Email,
        actorUserId: ACTOR,
      });

      channel.activate(ACTOR);
      channel.archive(ACTOR);
      expect(channel.status).toBe(CHANNEL_STATUS.Archived);
      expect(channel.isEnabled).toBe(false);
      expect(channel.isDefault).toBe(false);
    });

    test('throws InvalidChannelTransitionError on invalid transition DRAFT -> SUSPENDED', () => {
      const channel = NotificationChannel.create({
        tenantId: TENANT_ID,
        channelCode: 'EMAIL',
        channelName: 'Email',
        channelType: CHANNEL_TYPE.Email,
        actorUserId: ACTOR,
      });

      expect(() => channel.suspend(ACTOR)).toThrow(InvalidChannelTransitionError);
    });

    test('throws ChannelStateImmutableError when modifying archived channel', () => {
      const channel = NotificationChannel.create({
        tenantId: TENANT_ID,
        channelCode: 'EMAIL',
        channelName: 'Email',
        channelType: CHANNEL_TYPE.Email,
        actorUserId: ACTOR,
      });

      channel.activate(ACTOR);
      channel.archive(ACTOR);

      expect(() => channel.updateMetadata({
        channelId: channel.id,
        tenantId: TENANT_ID,
        channelName: 'New Name',
        actorUserId: ACTOR,
      })).toThrow(ChannelStateImmutableError);

      expect(() => channel.enable(ACTOR)).toThrow(ChannelStateImmutableError);
      expect(() => channel.setDefault(true, ACTOR)).toThrow(ChannelStateImmutableError);
    });
  });

  describe('Metadata Modifications', () => {
    test('updates mutable metadata fields on draft successfully', () => {
      const channel = NotificationChannel.create({
        tenantId: TENANT_ID,
        channelCode: 'EMAIL',
        channelName: 'Email',
        channelType: CHANNEL_TYPE.Email,
        actorUserId: ACTOR,
      });

      channel.updateMetadata({
        channelId: channel.id,
        tenantId: TENANT_ID,
        channelName: 'New Email Gateway',
        description: 'New Description',
        priority: 200,
        supportedTemplateCategories: ['marketing'],
        configurationMetadata: { host: 'smtp.mail2.com' },
        actorUserId: ACTOR,
      });

      expect(channel.channelName).toBe('New Email Gateway');
      expect(channel.description).toBe('New Description');
      expect(channel.priority).toBe(200);
      expect(channel.supportedTemplateCategories).toEqual(['MARKETING']);
      expect(channel.configurationMetadata).toEqual({ host: 'smtp.mail2.com' });
      expect(channel.version).toBe(BigInt(2));
    });
  });

  describe('Enable / Disable & Defaults', () => {
    test('enables and disables channel successfully', () => {
      const channel = NotificationChannel.create({
        tenantId: TENANT_ID,
        channelCode: 'EMAIL',
        channelName: 'Email',
        channelType: CHANNEL_TYPE.Email,
        actorUserId: ACTOR,
      });

      channel.disable(ACTOR);
      expect(channel.isEnabled).toBe(false);

      channel.enable(ACTOR);
      expect(channel.isEnabled).toBe(true);
    });

    test('sets default flag successfully', () => {
      const channel = NotificationChannel.create({
        tenantId: TENANT_ID,
        channelCode: 'EMAIL',
        channelName: 'Email',
        channelType: CHANNEL_TYPE.Email,
        actorUserId: ACTOR,
      });

      channel.setDefault(true, ACTOR);
      expect(channel.isDefault).toBe(true);

      const events = channel.pullDomainEvents();
      expect(events[events.length - 1].type).toBe('DefaultChannelChanged');
    });

    test('throws ChannelValidationError when setting a disabled channel as default', () => {
      const channel = NotificationChannel.create({
        tenantId: TENANT_ID,
        channelCode: 'EMAIL',
        channelName: 'Email',
        channelType: CHANNEL_TYPE.Email,
        actorUserId: ACTOR,
      });

      channel.disable(ACTOR);
      expect(() => channel.setDefault(true, ACTOR)).toThrow(ChannelValidationError);
    });
  });
});
