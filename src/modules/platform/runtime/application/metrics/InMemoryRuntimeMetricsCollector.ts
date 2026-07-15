import type {
  IRuntimeMetricsCollector,
  RuntimeMetricsRecord,
  RuntimeMetricsSnapshot,
} from "./RuntimeMetrics";

export class InMemoryRuntimeMetricsCollector implements IRuntimeMetricsCollector {
  private operationCount = 0;
  private failureCount = 0;
  private validationFailures = 0;
  private totalExecutionTime = 0;
  private totalWorkflowTime = 0;
  private totalPersistenceTime = 0;

  record(entry: RuntimeMetricsRecord): void {
    this.operationCount += 1;
    this.totalExecutionTime += entry.executionTime;
    this.totalWorkflowTime += entry.diagnostics.workflowTime;
    this.totalPersistenceTime += entry.diagnostics.persistenceTime;

    if (!entry.success) {
      this.failureCount += 1;
    }

    if (entry.validationErrorCount > 0) {
      this.validationFailures += entry.validationErrorCount;
    }
  }

  snapshot(): RuntimeMetricsSnapshot {
    if (this.operationCount === 0) {
      return {
        operationCount: 0,
        averageExecutionTime: 0,
        failureRate: 0,
        validationFailures: 0,
        averageWorkflowTime: 0,
        averagePersistenceTime: 0,
      };
    }

    return {
      operationCount: this.operationCount,
      averageExecutionTime: this.totalExecutionTime / this.operationCount,
      failureRate: this.failureCount / this.operationCount,
      validationFailures: this.validationFailures,
      averageWorkflowTime: this.totalWorkflowTime / this.operationCount,
      averagePersistenceTime: this.totalPersistenceTime / this.operationCount,
    };
  }
}
