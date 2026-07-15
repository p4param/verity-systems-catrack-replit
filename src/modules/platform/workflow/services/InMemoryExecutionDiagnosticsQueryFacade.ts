import type {
  IExecutionDiagnostics,
  IExecutionDiagnosticsQueryFacade,
  IExecutionDiagnosticsSink,
} from "../contracts/IExecutionDiagnostics";

export class InMemoryExecutionDiagnosticsQueryFacade
  implements IExecutionDiagnosticsSink, IExecutionDiagnosticsQueryFacade
{
  private readonly byExecutionId = new Map<string, IExecutionDiagnostics>();
  private readonly byCorrelationId = new Map<string, IExecutionDiagnostics[]>();
  private readonly history: IExecutionDiagnostics[] = [];

  constructor(private readonly capacity: number = 1000) {}

  record(snapshot: IExecutionDiagnostics): void {
    this.byExecutionId.set(snapshot.correlation.executionId, snapshot);

    const correlationEntries = this.byCorrelationId.get(snapshot.correlation.correlationId) ?? [];
    correlationEntries.push(snapshot);
    this.byCorrelationId.set(snapshot.correlation.correlationId, correlationEntries);

    this.history.push(snapshot);
    if (this.history.length > this.capacity) {
      const removed = this.history.shift();
      if (!removed) {
        return;
      }

      this.byExecutionId.delete(removed.correlation.executionId);
      const existing = this.byCorrelationId.get(removed.correlation.correlationId);
      if (!existing) {
        return;
      }

      const filtered = existing.filter((item) => item.correlation.executionId !== removed.correlation.executionId);
      if (filtered.length === 0) {
        this.byCorrelationId.delete(removed.correlation.correlationId);
      } else {
        this.byCorrelationId.set(removed.correlation.correlationId, filtered);
      }
    }
  }

  getByExecutionId(executionId: string): IExecutionDiagnostics | undefined {
    return this.byExecutionId.get(executionId);
  }

  getByCorrelationId(correlationId: string): readonly IExecutionDiagnostics[] {
    return Object.freeze([...(this.byCorrelationId.get(correlationId) ?? [])]);
  }

  listRecent(limit: number = 20): readonly IExecutionDiagnostics[] {
    const normalizedLimit = Math.max(0, limit);
    if (normalizedLimit === 0) {
      return Object.freeze([] as IExecutionDiagnostics[]);
    }

    const start = Math.max(0, this.history.length - normalizedLimit);
    return Object.freeze(this.history.slice(start));
  }
}
