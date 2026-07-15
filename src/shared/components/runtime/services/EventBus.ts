import { RuntimeEvent, RuntimeEventType } from "../types/framework";

type EventCallback<T = unknown> = (event: RuntimeEvent<T>) => void | Promise<void>;

export class RuntimeEventBus {
  private subscribers: Map<RuntimeEventType, Set<EventCallback<any>>> = new Map();
  private globalSubscribers: Set<EventCallback<any>> = new Set();

  subscribe<T = unknown>(eventType: RuntimeEventType | "*", callback: EventCallback<T>): () => void {
    if (eventType === "*") {
      this.globalSubscribers.add(callback);
      return () => {
        this.globalSubscribers.delete(callback);
      };
    }

    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType)!.add(callback);

    return () => {
      const subs = this.subscribers.get(eventType);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(eventType);
        }
      }
    };
  }

  async publish<T = unknown>(event: RuntimeEvent<T>): Promise<void> {
    const promises: Promise<void>[] = [];

    // Notify global/wildcard subscribers
    this.globalSubscribers.forEach((cb) => {
      try {
        const res = cb(event);
        if (res instanceof Promise) {
          promises.push(res);
        }
      } catch (err) {
        console.error("Error in global event callback:", err);
      }
    });

    const subs = this.subscribers.get(event.type);
    if (subs) {
      subs.forEach((cb) => {
        try {
          const res = cb(event);
          if (res instanceof Promise) {
            promises.push(res);
          }
        } catch (err) {
          console.error(`Error in event callback for type ${event.type}:`, err);
        }
      });
    }

    await Promise.all(promises);
  }

  clear() {
    this.subscribers.clear();
    this.globalSubscribers.clear();
  }
}

export const runtimeEventBus = new RuntimeEventBus();
export default runtimeEventBus;
