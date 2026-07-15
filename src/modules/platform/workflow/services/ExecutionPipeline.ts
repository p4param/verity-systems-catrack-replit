import type { IExecutionContext } from "../contracts/IExecutionContext";
import type { IExecutionPipeline } from "../contracts/IExecutionPipeline";
import type { IExecutionResult } from "../contracts/IExecutionResult";
import type { IExecutionStage } from "../contracts/IExecutionStage";

export class ExecutionPipeline implements IExecutionPipeline {
  private readonly stages: IExecutionStage[] = [];

  registerStage(stage: IExecutionStage): void {
    if (this.stages.some((existing) => existing.stageId === stage.stageId)) {
      throw new Error(`Duplicate execution stage registered: ${stage.stageId}`);
    }

    if (this.stages.some((existing) => existing.order === stage.order)) {
      throw new Error(`Duplicate execution stage order registered: ${stage.order}`);
    }

    this.stages.push(stage);
    this.stages.sort((a, b) => a.order - b.order || a.stageId.localeCompare(b.stageId));
  }

  getStages(): readonly IExecutionStage[] {
    return [...this.stages];
  }

  async execute(context: IExecutionContext): Promise<IExecutionResult> {
    this.validateStages();
    const sorted = this.getStages();
    const observer = context.observer;
    const startedAt = Date.now();

    observer?.recordTrace({
      timestamp: new Date(),
      stage: "ExecutionPipeline",
      component: "ExecutionPipeline",
      operation: "PipelineStarted",
      duration: 0,
      status: "Started",
      correlationId: context.correlationId,
      diagnostics: {
        executionPlanId: context.executionPlan.id,
        stageCount: sorted.length,
      },
    });

    const dispatch = async (index: number, current: IExecutionContext): Promise<IExecutionResult> => {
      if (index >= sorted.length) {
        return {
          success: true,
          status: "Planned",
          executionPlanId: current.executionPlan.id,
          executionHash: current.executionHash,
          correlationId: current.correlationId,
          executedEffectCodes: [],
          deferredEffectCodes: [...current.executionPlan.orderedEffectCodes],
          skippedEffectCodes: [],
          failedEffectCodes: [],
          warnings: [],
          runtimeOperationResults: [],
          stageResults: [],
          executionTime: Date.now() - startedAt,
          diagnostics: {
            reason: "No execution stages registered.",
          },
        };
      }

      const stage = sorted[index];
      const stageStartedAt = Date.now();

      observer?.recordTrace({
        timestamp: new Date(),
        stage: stage.stageId,
        component: "ExecutionPipeline",
        operation: "StageStarted",
        duration: 0,
        status: "Started",
        correlationId: current.correlationId,
        diagnostics: {
          stageOrder: stage.order,
        },
      });

      const result = await stage.execute(current, (nextContext) => dispatch(index + 1, nextContext));
      const stageDuration = Date.now() - stageStartedAt;

      observer?.recordMetric({
        name: "workflow.execution.stageDuration",
        value: stageDuration,
        unit: "Milliseconds",
        tags: {
          stageId: stage.stageId,
        },
      });

      observer?.recordTrace({
        timestamp: new Date(),
        stage: stage.stageId,
        component: "ExecutionPipeline",
        operation: "StageCompleted",
        duration: stageDuration,
        status: result.status === "Failed" ? "Failed" : result.status === "Deferred" ? "Deferred" : "Completed",
        correlationId: current.correlationId,
        diagnostics: {
          stageOrder: stage.order,
          resultStatus: result.status,
        },
      });

      return result;
    };

    const result = await dispatch(0, context);
    const pipelineDuration = Date.now() - startedAt;

    observer?.recordMetric({
      name: "workflow.execution.pipelineDuration",
      value: pipelineDuration,
      unit: "Milliseconds",
      tags: {
        executionPlanId: context.executionPlan.id,
      },
    });

    observer?.recordTrace({
      timestamp: new Date(),
      stage: "ExecutionPipeline",
      component: "ExecutionPipeline",
      operation: "PipelineCompleted",
      duration: pipelineDuration,
      status: result.status === "Failed" ? "Failed" : result.status === "Deferred" ? "Deferred" : "Completed",
      correlationId: context.correlationId,
      diagnostics: {
        executionPlanId: context.executionPlan.id,
        status: result.status,
      },
    });

    if (observer) {
      result.observability = observer.snapshot();
    }

    return result;
  }

  private validateStages(): void {
    const ids = new Set<string>();
    const orders = new Set<number>();

    for (const stage of this.stages) {
      if (ids.has(stage.stageId)) {
        throw new Error(`Duplicate execution stage detected: ${stage.stageId}`);
      }
      if (orders.has(stage.order)) {
        throw new Error(`Duplicate execution stage order detected: ${stage.order}`);
      }

      ids.add(stage.stageId);
      orders.add(stage.order);
    }
  }
}
