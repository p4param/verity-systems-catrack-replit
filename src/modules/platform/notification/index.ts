export * from './components';
export * from './hooks';
export * from './services';
export * from './repositories';
export * from './actions';
export * from './validations';
export * from './types';
export * from './utils';
export * from './constants';
export * from './providers';
export * from './tests';

// ─── Notification Template (EWP-001) ──────────────────────────────────────────
export type {
  NotificationTemplateRecord,
  TemplateStatus,
  TemplateCategory,
  DeliveryChannel,
  CreateTemplateCommand,
  PublishTemplateCommand,
  CreateVersionCommand,
  DeprecateTemplateCommand,
  ArchiveTemplateCommand,
  AddLanguageCommand,
  RemoveLanguageCommand,
  AddChannelCommand,
  RemoveChannelCommand,
  UpdateTemplateMetadataCommand,
  ListPublishedQuery,
  ListByChannelQuery,
  ListByLanguageQuery,
} from "./domain/templates/NotificationTemplateModels";
export {
  TEMPLATE_STATUS,
  TEMPLATE_CATEGORY,
  DELIVERY_CHANNEL,
} from "./domain/templates/NotificationTemplateModels";

export { NotificationTemplate } from "./domain/templates/NotificationTemplate";
export { NotificationTemplateLifecycle } from "./domain/templates/NotificationTemplateLifecycle";
export { VariableSchema } from "./domain/templates/value-objects/VariableSchema";
export {
  NotificationTemplateNotFoundError,
  TemplateVersionImmutableError,
  TemplateArchivedImmutableError,
  DuplicateTemplateVersionError,
  CircularTemplateInheritanceError,
  DuplicateLanguageError,
  DefaultLanguageRemovalError,
  LastLanguageRemovalError,
  DuplicateChannelError,
  LastChannelRemovalError,
  InvalidTemplateLifecycleTransitionError,
  TemplateConcurrencyError,
  TemplateValidationError,
} from "./domain/templates/NotificationTemplateErrors";

export type { INotificationTemplateRepository } from "./domain/templates/INotificationTemplateRepository";
export type { NotificationTemplateDomainEvent } from "./domain/templates/NotificationTemplateEvents";

// ─── Notification Channel (EWP-002) ───────────────────────────────────────────
export type {
  NotificationChannelRecord,
  NotificationChannelType,
  NotificationChannelStatus,
  CreateChannelCommand,
  UpdateChannelMetadataCommand,
  ActivateChannelCommand,
  SuspendChannelCommand,
  ArchiveChannelCommand,
  EnableChannelCommand,
  DisableChannelCommand,
  SetDefaultChannelCommand,
} from "./domain/channels/NotificationChannelModels";
export {
  CHANNEL_TYPE,
  CHANNEL_STATUS,
} from "./domain/channels/NotificationChannelModels";

export { NotificationChannel } from "./domain/channels/NotificationChannel";
export { NotificationChannelLifecycle } from "./domain/channels/NotificationChannelLifecycle";
export {
  NotificationChannelNotFoundError,
  ChannelStateImmutableError,
  DuplicateChannelCodeError,
  InvalidChannelTransitionError,
  ChannelConcurrencyError,
  ChannelValidationError,
} from "./domain/channels/NotificationChannelErrors";

export type { INotificationChannelRepository } from "./domain/channels/INotificationChannelRepository";
export type { NotificationChannelDomainEvent } from "./domain/channels/NotificationChannelEvents";
export { NotificationChannelService } from "./application/channels/NotificationChannelService";
export type { IDomainEventPublisher as IChannelDomainEventPublisher } from "./application/channels/NotificationChannelService";

// ─── Notification Delivery (EWP-003) ─────────────────────────────────────────
export type {
  NotificationDeliveryStatus,
  NotificationDeliveryRecord,
  DeliveryAttemptRecord,
  IngestNotificationIntentCommand,
  MarkProcessingCommand,
  RecordRenderedContentCommand,
  DispatchToProviderCommand,
  RecordProviderAcceptanceCommand,
  RecordDeliverySuccessCommand,
  RecordDeliveryFailureCommand,
  ScheduleRetryCommand,
  MoveToDeadLetterCommand,
  ReplayDeadLetterCommand,
  RecordSuppressionCommand,
} from "./domain/notifications/NotificationModels";
export { NOTIFICATION_DELIVERY_STATUS } from "./domain/notifications/NotificationModels";

export { Notification } from "./domain/notifications/Notification";
export { DeliveryAttempt } from "./domain/notifications/entities/DeliveryAttempt";
export { RenderedContent } from "./domain/notifications/value-objects/RenderedContent";
export {
  DuplicateIdempotencyException,
  InvalidDeliveryStatusTransitionError,
  NotificationDeliveryNotFoundError,
  DeliveryConcurrencyError,
  RenderedContentImmutableError,
  DeliveryValidationError,
} from "./domain/notifications/NotificationErrors";

export type { INotificationRepository } from "./domain/notifications/INotificationRepository";
export type { NotificationDomainEvent } from "./domain/notifications/NotificationEvents";
export { NotificationService } from "./application/notifications/NotificationService";
export type { IDomainEventPublisher as INotificationDomainEventPublisher } from "./application/notifications/NotificationService";


