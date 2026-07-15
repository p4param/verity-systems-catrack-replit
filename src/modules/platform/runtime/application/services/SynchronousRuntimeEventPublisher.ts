import type {
  IRuntimeEventPublisher,
  RuntimeEventHandler,
} from "../contracts/IRuntimeEventPublisher";
import type { RuntimeEvent, RuntimeEventType } from "../events/RuntimeEvents";
import { randomUUID } from "crypto";

export class SynchronousRuntimeEventPublisher implements IRuntimeEventPublisher {
  private readonly handlers = new Map<RuntimeEventType, Map<string, RuntimeEventHandler>>();
  private readonly subscriptions = new Map<string, RuntimeEventType>();

  async publish(event: RuntimeEvent): Promise<void> {
    const listeners = this.handlers.get(event.type);
    if (!listeners || listeners.size === 0) {
      return;
    }

    for (const handler of listeners.values()) {
      await handler(event);
    }
  }

  async publishAsync(event: RuntimeEvent): Promise<void> {
    await this.publish(event);
  }

  subscribe(eventType: RuntimeEventType, handler: RuntimeEventHandler): string {
    const listeners = this.handlers.get(eventType) ?? new Map<string, RuntimeEventHandler>();
    const subscriptionId = randomUUID();
    listeners.set(subscriptionId, handler);
    this.handlers.set(eventType, listeners);
    this.subscriptions.set(subscriptionId, eventType);

    return subscriptionId;
  }

  unsubscribe(subscriptionId: string): void {
    const eventType = this.subscriptions.get(subscriptionId);
    if (!eventType) {
      return;
    }

    const listeners = this.handlers.get(eventType);
    if (!listeners) {
      this.subscriptions.delete(subscriptionId);
      return;
    }

    listeners.delete(subscriptionId);
    this.subscriptions.delete(subscriptionId);

    if (listeners.size === 0) {
      this.handlers.delete(eventType);
    }
  }
}
