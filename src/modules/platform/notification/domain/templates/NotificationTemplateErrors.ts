// VS09 EWP-001: NotificationTemplate domain errors
// Strongly typed domain exceptions per CC-001 invariants.
// Each error carries structured payload properties for programmatic inspection.

// ─── Not Found ────────────────────────────────────────────────────────────────

export class NotificationTemplateNotFoundError extends Error {
  readonly templateId: string;

  constructor(templateId: string) {
    super(`NotificationTemplate not found: ${templateId}`);
    this.name = 'NotificationTemplateNotFoundError';
    this.templateId = templateId;
  }
}

// ─── Immutability ─────────────────────────────────────────────────────────────

export class TemplateVersionImmutableError extends Error {
  readonly templateId: string;
  readonly status: string;

  constructor(templateId: string, status: string) {
    super(
      `NotificationTemplate '${templateId}' is ${status} — content attributes are immutable`
    );
    this.name = 'TemplateVersionImmutableError';
    this.templateId = templateId;
    this.status = status;
  }
}

export class TemplateArchivedImmutableError extends Error {
  readonly templateId: string;

  constructor(templateId: string) {
    super(`NotificationTemplate '${templateId}' is ARCHIVED and cannot be modified`);
    this.name = 'TemplateArchivedImmutableError';
    this.templateId = templateId;
  }
}

// ─── Business Identity ────────────────────────────────────────────────────────

export class DuplicateTemplateVersionError extends Error {
  readonly templateCode:    string;
  readonly templateVersion: string;

  constructor(templateCode: string, templateVersion: string) {
    super(
      `Template version '${templateVersion}' already exists for code '${templateCode}'`
    );
    this.name = 'DuplicateTemplateVersionError';
    this.templateCode    = templateCode;
    this.templateVersion = templateVersion;
  }
}

// ─── Inheritance ──────────────────────────────────────────────────────────────

export class CircularTemplateInheritanceError extends Error {
  readonly templateId:       string;
  readonly parentTemplateId: string;

  constructor(templateId: string, parentTemplateId: string) {
    super(
      `Circular inheritance detected: template '${templateId}' cannot inherit from '${parentTemplateId}'`
    );
    this.name = 'CircularTemplateInheritanceError';
    this.templateId       = templateId;
    this.parentTemplateId = parentTemplateId;
  }
}

// ─── Language ─────────────────────────────────────────────────────────────────

export class DuplicateLanguageError extends Error {
  readonly languageCode: string;

  constructor(languageCode: string) {
    super(`Language '${languageCode}' is already registered on this template`);
    this.name = 'DuplicateLanguageError';
    this.languageCode = languageCode;
  }
}

export class DefaultLanguageRemovalError extends Error {
  readonly languageCode: string;

  constructor(languageCode: string) {
    super(`Cannot remove the default language '${languageCode}' from the template`);
    this.name = 'DefaultLanguageRemovalError';
    this.languageCode = languageCode;
  }
}

export class LastLanguageRemovalError extends Error {
  readonly templateId: string;

  constructor(templateId: string) {
    super(
      `Cannot remove the last supported language from NotificationTemplate '${templateId}'`
    );
    this.name = 'LastLanguageRemovalError';
    this.templateId = templateId;
  }
}

// ─── Channel ──────────────────────────────────────────────────────────────────

export class DuplicateChannelError extends Error {
  readonly channel: string;

  constructor(channel: string) {
    super(`Channel '${channel}' is already registered on this template`);
    this.name = 'DuplicateChannelError';
    this.channel = channel;
  }
}

export class LastChannelRemovalError extends Error {
  readonly templateId: string;

  constructor(templateId: string) {
    super(
      `Cannot remove the last supported channel from NotificationTemplate '${templateId}'`
    );
    this.name = 'LastChannelRemovalError';
    this.templateId = templateId;
  }
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

export class InvalidTemplateLifecycleTransitionError extends Error {
  readonly from: string;
  readonly to:   string;

  constructor(from: string, to: string) {
    super(
      `Invalid lifecycle transition for NotificationTemplate: ${from} → ${to}`
    );
    this.name = 'InvalidTemplateLifecycleTransitionError';
    this.from = from;
    this.to   = to;
  }
}

// ─── Concurrency ──────────────────────────────────────────────────────────────

export class TemplateConcurrencyError extends Error {
  readonly templateId: string;

  constructor(templateId: string) {
    super(
      `Concurrency conflict for NotificationTemplate '${templateId}': version mismatch`
    );
    this.name = 'TemplateConcurrencyError';
    this.templateId = templateId;
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

export class TemplateValidationError extends Error {
  readonly fields: Record<string, string>;

  constructor(fields: Record<string, string>) {
    const detail = Object.entries(fields)
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ');
    super(`NotificationTemplate validation failed — ${detail}`);
    this.name = 'TemplateValidationError';
    this.fields = { ...fields };
  }
}
