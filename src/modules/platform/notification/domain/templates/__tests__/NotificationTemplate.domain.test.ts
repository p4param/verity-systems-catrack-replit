// VS09 EWP-001: NotificationTemplate domain unit tests
// Profile: smoke — no DB connection required

import { NotificationTemplate } from '../NotificationTemplate';
import { VariableSchema } from '../value-objects/VariableSchema';
import {
  TemplateVersionImmutableError,
  TemplateArchivedImmutableError,
  DuplicateLanguageError,
  DefaultLanguageRemovalError,
  LastLanguageRemovalError,
  DuplicateChannelError,
  LastChannelRemovalError,
  InvalidTemplateLifecycleTransitionError,
  TemplateValidationError,
} from '../NotificationTemplateErrors';
import { TEMPLATE_STATUS, TEMPLATE_CATEGORY, DELIVERY_CHANNEL } from '../NotificationTemplateModels';

const TENANT_ID = '00000000-0000-0000-0000-000000000010';
const ACTOR = '00000000-0000-0000-0000-000000000001';

describe('NotificationTemplate Aggregate Root & Value Objects', () => {
  describe('VariableSchema Value Object', () => {
    test('instantiates with valid schema', () => {
      const schemaObj = {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      };
      const schema = VariableSchema.create(schemaObj);
      expect(schema.value).toEqual(schemaObj);
      expect(schema.toPlain()).toEqual(schemaObj);
    });

    test('reconstitutes without validation', () => {
      const schema = VariableSchema.reconstitute({ foo: 'bar' });
      expect(schema.value).toEqual({ foo: 'bar' });
    });

    test('throws TypeError on invalid types', () => {
      expect(() => VariableSchema.create(null as any)).toThrow(TypeError);
      expect(() => VariableSchema.create([] as any)).toThrow(TypeError);
      expect(() => VariableSchema.create('string' as any)).toThrow(TypeError);
    });

    test('enforces equality by JSON representation', () => {
      const s1 = VariableSchema.create({ type: 'object' });
      const s2 = VariableSchema.create({ type: 'object' });
      const s3 = VariableSchema.create({ type: 'string' });

      expect(s1.equals(s2)).toBe(true);
      expect(s1.equals(s3)).toBe(false);
    });
  });

  describe('Create Template Command', () => {
    test('creates new draft template with valid input', () => {
      const template = NotificationTemplate.create({
        tenantId: TENANT_ID,
        templateCode: 'WELCOME_EMAIL',
        templateName: 'Welcome Email Template',
        category: TEMPLATE_CATEGORY.Transactional,
        defaultLanguage: 'en',
        supportedChannels: [DELIVERY_CHANNEL.Email],
        supportedLanguages: ['es'],
        variableSchema: { type: 'object' },
        actorUserId: ACTOR,
      });

      expect(template.id).toBeDefined();
      expect(template.tenantId).toBe(TENANT_ID);
      expect(template.templateCode).toBe('WELCOME_EMAIL');
      expect(template.templateName).toBe('Welcome Email Template');
      expect(template.status).toBe(TEMPLATE_STATUS.Draft);
      expect(template.templateVersion).toBe('1.0.0');
      expect(template.defaultLanguage).toBe('en');
      expect(template.supportedLanguages).toContain('en');
      expect(template.supportedLanguages).toContain('es');
      expect(template.supportedChannels).toContain(DELIVERY_CHANNEL.Email);
      expect(template.version).toBe(1n);

      const events = template.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('TemplateCreated');
    });

    test('deduplicates languages and channels', () => {
      const template = NotificationTemplate.create({
        tenantId: TENANT_ID,
        templateCode: 'WELCOME_EMAIL',
        templateName: 'Welcome Email Template',
        category: TEMPLATE_CATEGORY.Transactional,
        defaultLanguage: 'en',
        supportedChannels: [DELIVERY_CHANNEL.Email, DELIVERY_CHANNEL.Email],
        supportedLanguages: ['en', 'es', 'es'],
        variableSchema: { type: 'object' },
        actorUserId: ACTOR,
      });

      expect(template.supportedLanguages).toEqual(['en', 'es']);
      expect(template.supportedChannels).toEqual([DELIVERY_CHANNEL.Email]);
    });

    test('throws TemplateValidationError on invalid inputs', () => {
      expect(() =>
        NotificationTemplate.create({
          tenantId: '',
          templateCode: '',
          templateName: '',
          category: TEMPLATE_CATEGORY.Transactional,
          defaultLanguage: '',
          supportedChannels: [],
          variableSchema: null as any,
          actorUserId: '',
        })
      ).toThrow(TemplateValidationError);
    });
  });

  describe('Lifecycle State Transitions', () => {
    let template: NotificationTemplate;

    beforeEach(() => {
      template = NotificationTemplate.create({
        tenantId: TENANT_ID,
        templateCode: 'WELCOME_EMAIL',
        templateName: 'Welcome Email Template',
        category: TEMPLATE_CATEGORY.Transactional,
        defaultLanguage: 'en',
        supportedChannels: [DELIVERY_CHANNEL.Email],
        variableSchema: { type: 'object' },
        actorUserId: ACTOR,
      });
    });

    test('transitions draft to published and locks content', () => {
      template.publish(ACTOR);
      expect(template.status).toBe(TEMPLATE_STATUS.Published);
      expect(template.version).toBe(2n);

      const events = template.pullDomainEvents();
      expect(events.some(e => e.type === 'TemplatePublished')).toBe(true);

      // Mutating published template throws TemplateVersionImmutableError
      expect(() => template.addLanguage('fr', ACTOR)).toThrow(TemplateVersionImmutableError);
      expect(() => template.removeLanguage('en', ACTOR)).toThrow(TemplateVersionImmutableError);
      expect(() => template.addChannel(DELIVERY_CHANNEL.Sms, ACTOR)).toThrow(TemplateVersionImmutableError);
      expect(() => template.updateMetadata('new name', null, null, ACTOR)).toThrow(TemplateVersionImmutableError);
    });

    test('transitions published to deprecated', () => {
      template.publish(ACTOR);
      template.deprecate(ACTOR);
      expect(template.status).toBe(TEMPLATE_STATUS.Deprecated);

      const events = template.pullDomainEvents();
      expect(events.some(e => e.type === 'TemplateDeprecated')).toBe(true);
      expect(() => template.addLanguage('fr', ACTOR)).toThrow(TemplateVersionImmutableError);
    });

    test('transitions published directly to archived', () => {
      template.publish(ACTOR);
      template.archive(ACTOR);
      expect(template.status).toBe(TEMPLATE_STATUS.Archived);
      expect(template.isActive).toBe(false);

      const events = template.pullDomainEvents();
      expect(events.some(e => e.type === 'TemplateArchived')).toBe(true);
    });

    test('transitions deprecated to archived', () => {
      template.publish(ACTOR);
      template.deprecate(ACTOR);
      template.archive(ACTOR);
      expect(template.status).toBe(TEMPLATE_STATUS.Archived);
    });

    test('throws on invalid transition from draft to deprecated', () => {
      expect(() => template.deprecate(ACTOR)).toThrow(InvalidTemplateLifecycleTransitionError);
    });

    test('throws on invalid transition from archived', () => {
      template.publish(ACTOR);
      template.archive(ACTOR);
      expect(() => template.publish(ACTOR)).toThrow(InvalidTemplateLifecycleTransitionError);
      expect(() => template.archive(ACTOR)).toThrow(TemplateArchivedImmutableError);
    });
  });

  describe('Version Inheritance & Creation', () => {
    test('creates new draft version from published predecessor', () => {
      const parent = NotificationTemplate.create({
        tenantId: TENANT_ID,
        templateCode: 'WELCOME_EMAIL',
        templateName: 'Welcome Email Template',
        category: TEMPLATE_CATEGORY.Transactional,
        defaultLanguage: 'en',
        supportedChannels: [DELIVERY_CHANNEL.Email],
        variableSchema: { type: 'object' },
        actorUserId: ACTOR,
      });

      parent.publish(ACTOR);

      const child = parent.createVersion('2.0.0', ACTOR);
      expect(child.id).not.toBe(parent.id);
      expect(child.parentTemplateId).toBe(parent.id);
      expect(child.templateCode).toBe('WELCOME_EMAIL');
      expect(child.templateVersion).toBe('2.0.0');
      expect(child.status).toBe(TEMPLATE_STATUS.Draft);
      expect(child.version).toBe(1n);

      const events = child.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('TemplateVersionCreated');
    });

    test('throws error when trying to version a draft predecessor', () => {
      const parent = NotificationTemplate.create({
        tenantId: TENANT_ID,
        templateCode: 'WELCOME_EMAIL',
        templateName: 'Welcome Email Template',
        category: TEMPLATE_CATEGORY.Transactional,
        defaultLanguage: 'en',
        supportedChannels: [DELIVERY_CHANNEL.Email],
        variableSchema: { type: 'object' },
        actorUserId: ACTOR,
      });

      expect(() => parent.createVersion('2.0.0', ACTOR)).toThrow(TemplateVersionImmutableError);
    });
  });

  describe('Language & Channel Manipulations', () => {
    let template: NotificationTemplate;

    beforeEach(() => {
      template = NotificationTemplate.create({
        tenantId: TENANT_ID,
        templateCode: 'WELCOME_EMAIL',
        templateName: 'Welcome Email Template',
        category: TEMPLATE_CATEGORY.Transactional,
        defaultLanguage: 'en',
        supportedChannels: [DELIVERY_CHANNEL.Email, DELIVERY_CHANNEL.Sms],
        supportedLanguages: ['es'],
        variableSchema: { type: 'object' },
        actorUserId: ACTOR,
      });
    });

    test('adds and removes language successfully', () => {
      template.addLanguage('fr', ACTOR);
      expect(template.supportedLanguages).toContain('fr');

      template.removeLanguage('fr', ACTOR);
      expect(template.supportedLanguages).not.toContain('fr');
    });

    test('throws DuplicateLanguageError on adding duplicate language', () => {
      expect(() => template.addLanguage('es', ACTOR)).toThrow(DuplicateLanguageError);
    });

    test('throws DefaultLanguageRemovalError on removing default language', () => {
      expect(() => template.removeLanguage('en', ACTOR)).toThrow(DefaultLanguageRemovalError);
    });

    test('throws LastLanguageRemovalError on removing last supported language', () => {
      // remove 'es' first
      template.removeLanguage('es', ACTOR);
      // only 'en' remains
      expect(() => template.removeLanguage('en', ACTOR)).toThrow(DefaultLanguageRemovalError);
    });

    test('adds and removes channel successfully', () => {
      template.addChannel(DELIVERY_CHANNEL.Push, ACTOR);
      expect(template.supportedChannels).toContain(DELIVERY_CHANNEL.Push);

      template.removeChannel(DELIVERY_CHANNEL.Push, ACTOR);
      expect(template.supportedChannels).not.toContain(DELIVERY_CHANNEL.Push);
    });

    test('throws DuplicateChannelError on adding duplicate channel', () => {
      expect(() => template.addChannel(DELIVERY_CHANNEL.Email, ACTOR)).toThrow(DuplicateChannelError);
    });

    test('throws LastChannelRemovalError on removing last supported channel', () => {
      template.removeChannel(DELIVERY_CHANNEL.Sms, ACTOR);
      // only email remains
      expect(() => template.removeChannel(DELIVERY_CHANNEL.Email, ACTOR)).toThrow(LastChannelRemovalError);
    });
  });

  describe('Update Metadata Command', () => {
    let template: NotificationTemplate;

    beforeEach(() => {
      template = NotificationTemplate.create({
        tenantId: TENANT_ID,
        templateCode: 'WELCOME_EMAIL',
        templateName: 'Welcome Email Template',
        category: TEMPLATE_CATEGORY.Transactional,
        defaultLanguage: 'en',
        supportedChannels: [DELIVERY_CHANNEL.Email],
        variableSchema: { type: 'object' },
        actorUserId: ACTOR,
      });
    });

    test('updates metadata properties', () => {
      template.updateMetadata('New name', 'New description', 'branding-123', ACTOR);
      expect(template.templateName).toBe('New name');
      expect(template.description).toBe('New description');
      expect(template.brandingProfileId).toBe('branding-123');
    });

    test('throws TemplateValidationError on empty name', () => {
      expect(() => template.updateMetadata('', null, null, ACTOR)).toThrow(TemplateValidationError);
    });
  });
});
