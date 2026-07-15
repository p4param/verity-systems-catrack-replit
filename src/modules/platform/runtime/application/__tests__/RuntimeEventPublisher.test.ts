import { RuntimeEvents } from "../events/RuntimeEvents";
import { SynchronousRuntimeEventPublisher } from "../services/SynchronousRuntimeEventPublisher";

describe("SynchronousRuntimeEventPublisher", () => {
  test("publishes events synchronously to subscribers", async () => {
    const publisher = new SynchronousRuntimeEventPublisher();
    const calls: string[] = [];

    publisher.subscribe(RuntimeEvents.OperationStarted, async () => {
      calls.push("first");
    });

    publisher.subscribe(RuntimeEvents.OperationStarted, async () => {
      calls.push("second");
    });

    await publisher.publish({
      type: RuntimeEvents.OperationStarted,
      operation: "Create",
      correlationId: "corr-1",
      timestamp: new Date(),
    });

    expect(calls).toEqual(["first", "second"]);
  });

  test("unsubscribe detaches handler", async () => {
    const publisher = new SynchronousRuntimeEventPublisher();
    const handler = jest.fn(async () => undefined);
    const subscriptionId = publisher.subscribe(RuntimeEvents.OperationCompleted, handler);
    publisher.unsubscribe(subscriptionId);

    await publisher.publish({
      type: RuntimeEvents.OperationCompleted,
      operation: "Save",
      correlationId: "corr-2",
      timestamp: new Date(),
    });

    expect(handler).not.toHaveBeenCalled();
  });
});
