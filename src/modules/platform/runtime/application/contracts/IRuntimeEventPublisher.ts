import type { RuntimeEvent, RuntimeEventType } from "../events/RuntimeEvents";

export type RuntimeEventHandler = (event: RuntimeEvent) => void | Promise<void>;

export interface IRuntimeEventPublisher {
  publish(event: RuntimeEvent): Promise<void>;
  publishAsync(event: RuntimeEvent): Promise<void>;
  subscribe(eventType: RuntimeEventType, handler: RuntimeEventHandler): string;
  unsubscribe(subscriptionId: string): void;
}
