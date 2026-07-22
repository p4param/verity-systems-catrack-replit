// VS09 EWP-001: Notification platform services exports

export { NotificationTemplateService } from '../application/templates/NotificationTemplateService';
export type { IDomainEventPublisher } from '../application/templates/NotificationTemplateService';
export * from '../application/templates/NotificationTemplateService';

export { NotificationChannelService } from '../application/channels/NotificationChannelService';
export type { IDomainEventPublisher as IChannelDomainEventPublisher } from '../application/channels/NotificationChannelService';

export { NotificationService } from '../application/notifications/NotificationService';
export type { IDomainEventPublisher as INotificationDomainEventPublisher } from '../application/notifications/NotificationService';

