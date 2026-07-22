// VS09 EWP-002: NotificationChannel domain errors
// Strongly typed domain exceptions per CC-002 invariants.

export class NotificationChannelNotFoundError extends Error {
  readonly channelId: string;

  constructor(channelId: string) {
    super(`NotificationChannel not found: ${channelId}`);
    this.name = 'NotificationChannelNotFoundError';
    this.channelId = channelId;
  }
}

export class ChannelStateImmutableError extends Error {
  readonly channelId: string;
  readonly status: string;

  constructor(channelId: string, status: string) {
    super(`NotificationChannel '${channelId}' is ${status} and cannot be modified`);
    this.name = 'ChannelStateImmutableError';
    this.channelId = channelId;
    this.status = status;
  }
}

export class DuplicateChannelCodeError extends Error {
  readonly channelCode: string;

  constructor(channelCode: string) {
    super(`Channel code '${channelCode}' already exists within this tenant`);
    this.name = 'DuplicateChannelCodeError';
    this.channelCode = channelCode;
  }
}

export class InvalidChannelTransitionError extends Error {
  readonly from: string;
  readonly to:   string;

  constructor(from: string, to: string) {
    super(`Invalid lifecycle transition for NotificationChannel: ${from} → ${to}`);
    this.name = 'InvalidChannelTransitionError';
    this.from = from;
    this.to   = to;
  }
}

export class ChannelConcurrencyError extends Error {
  readonly channelId: string;

  constructor(channelId: string) {
    super(`Concurrency conflict for NotificationChannel '${channelId}': version mismatch`);
    this.name = 'ChannelConcurrencyError';
    this.channelId = channelId;
  }
}

export class ChannelValidationError extends Error {
  readonly fields: Record<string, string>;

  constructor(fields: Record<string, string>) {
    const detail = Object.entries(fields)
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ');
    super(`NotificationChannel validation failed — ${detail}`);
    this.name = 'ChannelValidationError';
    this.fields = { ...fields };
  }
}
