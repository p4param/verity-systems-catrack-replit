import type { IExecutionContext } from "../contracts/IExecutionContext";
import type { IExecutionMapper } from "../contracts/IExecutionMapper";
import type { IExecutionResult } from "../contracts/IExecutionResult";
import type { IExecutionStage } from "../contracts/IExecutionStage";
import type { IWorkflowExecutor, WorkflowExecutorResult } from "../contracts/IWorkflowExecutor";
import type { IWorkflowExecutorRegistry } from "../contracts/IWorkflowExecutorRegistry";
import type { RuntimeOperationResponse } from "../contracts/IRuntimeOperationResponse";
import { RuntimeApplicationExecutor } from "./RuntimeApplicationExecutor";

export class ExecutionDispatchStage implements IExecutionStage {
  readonly stageId = "RuntimeExecution";
  readonly order = 300;

  constructor(
    private readonly executionMapper: IExecutionMapper,
    private readonly executorRegistry: IWorkflowExecutorRegistry
  ) {}

  async execute(
    context: IExecutionContext,
    _next: (context: IExecutionContext) => Promise<IExecutionResult>
  ): Promise<IExecutionResult> {
    const observer = context.observer;
    const startedAt = Date.now();

    if (!context.executionRequested) {
      const result = this.plannedResult(context);
      observer?.recordMetric({
        name: "workflow.execution.dispatchTime",
        value: Date.now() - startedAt,
        unit: "Milliseconds",
        tags: {
          executionPlanId: context.executionPlan.id,
        },
      });

      observer?.recordMetric({
        name: "workflow.execution.deferredCount",
        value: context.executionPlan.orderedEffectCodes.length,
        unit: "Count",
        tags: {
          executionPlanId: context.executionPlan.id,
        },
      });

      observer?.recordMetric({
        name: "workflow.execution.runtimeDuration",
        value: 0,
        unit: "Milliseconds",
        tags: {
          executionPlanId: context.executionPlan.id,
        },
      });

      return result;
    }

    const executedEffectCodes: string[] = [];
    const deferredEffectCodes: string[] = [];
    const skippedEffectCodes: string[] = [];
    const failedEffectCodes: string[] = [];
    const runtimeOperationResults: Array<RuntimeOperationResponse["runtimeOperationResult"]> = [];
    let runtimeDuration = 0;

    const requests = this.executionMapper.map(context.executionPlan, context);

    for (const effectCode of context.executionPlan.orderedEffectCodes) {
      const request = requests.find((item) => item.effectCode === effectCode);
      if (!request) {
        skippedEffectCodes.push(effectCode);
        observer?.recordWarning(`Missing runtime operation request for effect ${effectCode}.`);
        continue;
      }

      observer?.recordTrace({
        timestamp: new Date(),
        stage: this.stageId,
        component: "ExecutionDispatchStage",
        operation: "ExecutorSelected",
        duration: 0,
        status: "Started",
        correlationId: context.correlationId,
        diagnostics: {
          effectCode,
          effectType: request.effectType,
          executorCount: this.executorRegistry.getAll().length,
        },
      });

      const executor = this.executorRegistry.getByEffectType(request.effectType);
      if (!executor) {
        failedEffectCodes.push(effectCode);
        observer?.recordError(`No executor registered for effect type ${request.effectType}.`);
        continue;
      }

      this.executorRegistry.validateCompatibility(request.effectType, {
        SupportsTransactions: true,
        SupportsDiagnostics: true,
      });

      const runtimeStartedAt = Date.now();
      observer?.recordTrace({
        timestamp: new Date(),
        stage: this.stageId,
        component: executor.constructor.name,
        operation: "RuntimeOperationStarted",
        duration: 0,
        status: "Started",
        correlationId: context.correlationId,
        diagnostics: {
          effectCode,
          effectType: request.effectType,
          executorKey: executor.executorKey,
        },
      });

      const result = await this.executeWithExecutor(executor, request, context.runtimeApplicationEngine);
      const runtimeExecutionTime = Date.now() - runtimeStartedAt;
      runtimeDuration += runtimeExecutionTime;

      observer?.recordMetric({
        name: "workflow.execution.executorDuration",
        value: runtimeExecutionTime,
        unit: "Milliseconds",
        tags: {
          executorKey: executor.executorKey,
          effectCode,
        },
      });

      observer?.recordTrace({
        timestamp: new Date(),
        stage: this.stageId,
        component: executor.constructor.name,
        operation: "RuntimeOperationCompleted",
        duration: runtimeExecutionTime,
        status: result.status === "Deferred" ? "Deferred" : result.status === "Executed" ? "Completed" : "Failed",
        correlationId: context.correlationId,
        diagnostics: {
          effectCode,
          effectType: request.effectType,
          executorKey: executor.executorKey,
          runtimeStatus: result.status,
        },
      });

      if (result.response?.runtimeOperationResult) {
        runtimeOperationResults.push(result.response.runtimeOperationResult);
      }

      if (result.status === "Executed") {
        executedEffectCodes.push(effectCode);
        observer?.recordMetric({
          name: "workflow.execution.executedCount",
          value: 1,
          unit: "Count",
          tags: {
            effectCode,
          },
        });
      } else if (result.status === "Deferred") {
        deferredEffectCodes.push(effectCode);
        observer?.recordMetric({
          name: "workflow.execution.deferredCount",
          value: 1,
          unit: "Count",
          tags: {
            effectCode,
          },
        });
      } else {
        failedEffectCodes.push(effectCode);
        observer?.recordMetric({
          name: "workflow.execution.failedCount",
          value: 1,
          unit: "Count",
          tags: {
            effectCode,
          },
        });
      }
    }

    observer?.recordMetric({
      name: "workflow.execution.dispatchTime",
      value: Date.now() - startedAt,
      unit: "Milliseconds",
      tags: {
        executionPlanId: context.executionPlan.id,
      },
    });

    observer?.recordMetric({
      name: "workflow.execution.runtimeDuration",
      value: runtimeDuration,
      unit: "Milliseconds",
      tags: {
        executionPlanId: context.executionPlan.id,
      },
    });

    observer?.recordMetric({
      name: "workflow.execution.executedCount",
      value: executedEffectCodes.length,
      unit: "Count",
      tags: {
        executionPlanId: context.executionPlan.id,
      },
    });

    observer?.recordMetric({
      name: "workflow.execution.deferredCount",
      value: deferredEffectCodes.length,
      unit: "Count",
      tags: {
        executionPlanId: context.executionPlan.id,
      },
    });

    observer?.recordMetric({
      name: "workflow.execution.skippedCount",
      value: skippedEffectCodes.length,
      unit: "Count",
      tags: {
        executionPlanId: context.executionPlan.id,
      },
    });

    observer?.recordMetric({
      name: "workflow.execution.failedCount",
      value: failedEffectCodes.length,
      unit: "Count",
      tags: {
        executionPlanId: context.executionPlan.id,
      },
    });

    const status = failedEffectCodes.length > 0 ? "Failed" : deferredEffectCodes.length > 0 ? "Deferred" : "Executed";

    return {
      success: status === "Executed" || status === "Deferred",
      status,
      executionPlanId: context.executionPlan.id,
      executionHash: context.executionHash,
      correlationId: context.correlationId,
      executedEffectCodes,
      deferredEffectCodes,
      skippedEffectCodes,
      failedEffectCodes,
      warnings: failedEffectCodes.length > 0 ? ["One or more runtime effects failed."] : [],
      runtimeOperationResults: runtimeOperationResults.filter((item): item is NonNullable<typeof item> => item != null),
      stageResults: [
        {
          stageId: this.stageId,
          status,
          executedEffectCodes,
          deferredEffectCodes,
          diagnostics: {
            executorCount: this.executorRegistry.getAll().length,
          },
        },
      ],
      executionTime: 0,
      diagnostics: {
        executorCount: this.executorRegistry.getAll().length,
      },
    };
  }

  private plannedResult(context: IExecutionContext): IExecutionResult {
    return {
      success: true,
      status: "Planned",
      executionPlanId: context.executionPlan.id,
      executionHash: context.executionHash,
      correlationId: context.correlationId,
      executedEffectCodes: [],
      deferredEffectCodes: [...context.executionPlan.orderedEffectCodes],
      skippedEffectCodes: [],
      failedEffectCodes: [],
      warnings: [],
      runtimeOperationResults: [],
      stageResults: [
        {
          stageId: this.stageId,
          status: "Planned",
          executedEffectCodes: [],
          deferredEffectCodes: [...context.executionPlan.orderedEffectCodes],
          diagnostics: {
            reason: "Execution not requested.",
          },
        },
      ],
      executionTime: 0,
      diagnostics: {
        executorCount: this.executorRegistry.getAll().length,
      },
    };
  }

  private async executeWithExecutor(
    executor: IWorkflowExecutor,
    request: Parameters<IWorkflowExecutor["execute"]>[0],
    runtimeApplicationEngine?: IExecutionContext["runtimeApplicationEngine"]
  ): Promise<WorkflowExecutorResult> {
    const resolvedExecutor =
      executor.executorKey === "workflow.executor.runtime-application"
        ? new RuntimeApplicationExecutor(runtimeApplicationEngine)
        : executor;

    return resolvedExecutor.execute(request);
  }
}
