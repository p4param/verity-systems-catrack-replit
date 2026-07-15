import { logger } from "@/lib/logger";
import { runtimeEventPublisher } from "@/modules/platform/runtime/application";
import type { IExecutionPlanBuilder } from "../contracts/IExecutionPlanBuilder";
import { ExecutionDiagnosticsCollector } from "./ExecutionDiagnosticsCollector";
import type {
  IExecutionDiagnosticsCollector,
  IExecutionDiagnosticsSink,
} from "../contracts/IExecutionDiagnostics";
import type { IExecutionPipeline } from "../contracts/IExecutionPipeline";
import type { IRuntimeEffectPlanner } from "../contracts/IRuntimeEffectPlanner";
import type { IWorkflowActionEngine } from "../contracts/IWorkflowActionEngine";
import type {
  IWorkflowExecutionOrchestrator,
  WorkflowExecutionOrchestrationRequest,
} from "../contracts/IWorkflowExecutionOrchestrator";
import type { IWorkflowPolicyEngine } from "../contracts/IWorkflowPolicyEngine";
import type { ExecutionPlan } from "../models/WorkflowModels";
import type { IExecutionResult } from "../contracts/IExecutionResult";

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const key of Object.keys(value as Record<string, unknown>)) {
      const child = (value as Record<string, unknown>)[key];
      if (child && typeof child === "object" && !Object.isFrozen(child)) {
        deepFreeze(child);
      }
    }
  }
  return value;
}

export class WorkflowExecutionOrchestrator implements IWorkflowExecutionOrchestrator {
  constructor(
    private readonly actionEngine: IWorkflowActionEngine,
    private readonly policyEngine: IWorkflowPolicyEngine,
    private readonly runtimeEffectPlanner: IRuntimeEffectPlanner,
    private readonly executionPlanBuilder: IExecutionPlanBuilder,
    private readonly executionPipeline: IExecutionPipeline,
    private readonly diagnosticsCollector: IExecutionDiagnosticsCollector = new ExecutionDiagnosticsCollector({
      logger,
      eventPublisher: runtimeEventPublisher,
    }),
    private readonly diagnosticsSink?: IExecutionDiagnosticsSink
  ) {}

  async plan(request: WorkflowExecutionOrchestrationRequest): Promise<ExecutionPlan> {
    const transition = request.snapshot.transitions.find((item) => item.code === request.transitionCode);
    if (!transition) {
      throw new Error(`Transition ${request.transitionCode} is not defined in workflow snapshot.`);
    }

    const actionPlan = await this.actionEngine.resolve({
      snapshot: request.snapshot,
      transition,
      assignmentPlan: request.assignmentPlan,
      runtimeContext: request.context.runtimeContext,
    });

    const policyPlan = await this.policyEngine.resolve({
      snapshot: request.snapshot,
      transition,
      actionPlan,
    });

    const effectResolution = await this.runtimeEffectPlanner.plan(
      request.snapshot,
      transition,
      actionPlan,
      policyPlan
    );

    const executionPlan = await this.executionPlanBuilder.build(
      transition,
      actionPlan,
      policyPlan,
      effectResolution
    );

    return deepFreeze(executionPlan);
  }

  async orchestrate(request: WorkflowExecutionOrchestrationRequest): Promise<IExecutionResult> {
    const planningStartedAt = Date.now();
    const executionPlan = await this.plan(request);
    const planningTime = Date.now() - planningStartedAt;

    const collector = request.diagnosticsCollector ?? this.diagnosticsCollector;
    const observer = collector.begin({
      executionId: executionPlan.id,
      correlationId: request.context.runtimeContext.correlationId,
      workflowDefinitionId: request.snapshot.definition.id,
      workflowVersionId: request.snapshot.version.id,
      workflowInstanceId: request.context.workflowInstanceId,
      executionHash: executionPlan.metadata.deterministicHash,
      runtimeOperationId: request.transitionCode,
      transactionId: request.context.runtimeContext.transaction?.id,
      publishVersion: request.snapshot.version.id,
    });

    observer.recordTrace({
      timestamp: new Date(planningStartedAt),
      stage: "ExecutionOrchestrator",
      component: "WorkflowExecutionOrchestrator",
      operation: "ExecutionStarted",
      duration: 0,
      status: "Started",
      correlationId: request.context.runtimeContext.correlationId,
      diagnostics: {
        transitionCode: request.transitionCode,
        workflowVersionId: request.snapshot.version.id,
      },
    });

    observer.recordTrace({
      timestamp: new Date(planningStartedAt),
      stage: "ExecutionOrchestrator",
      component: "WorkflowExecutionOrchestrator",
      operation: "PlanningStarted",
      duration: 0,
      status: "Started",
      correlationId: request.context.runtimeContext.correlationId,
      diagnostics: {
        transitionCode: request.transitionCode,
      },
    });

    observer.recordMetric({
      name: "workflow.execution.planningTime",
      value: planningTime,
      unit: "Milliseconds",
      tags: {
        workflowVersionId: request.snapshot.version.id,
      },
    });

    observer.recordTrace({
      timestamp: new Date(),
      stage: "ExecutionOrchestrator",
      component: "WorkflowExecutionOrchestrator",
      operation: "PlanningCompleted",
      duration: planningTime,
      status: "Completed",
      correlationId: request.context.runtimeContext.correlationId,
      diagnostics: {
        executionPlanId: executionPlan.id,
        deterministicHash: executionPlan.metadata.deterministicHash,
      },
    });

    return this.executionPipeline.execute({
      workflowContext: request.context,
      executionPlan,
      assignmentPlan: request.assignmentPlan ?? request.context.assignmentPlan,
      actionPlan: executionPlan.actionPlan,
      policyPlan: executionPlan.policyPlan,
      runtimeContext: request.context.runtimeContext,
      runtimeTransaction: request.context.runtimeContext.transaction,
      runtimeApplicationEngine: request.runtimeApplicationEngine,
      executionRequested: request.executePlan ?? false,
      executionHash: executionPlan.metadata.deterministicHash,
      correlationId: request.context.runtimeContext.correlationId,
      observer,
      diagnostics: {
        actionCount: executionPlan.actionPlan.actions.length,
        policyCount: executionPlan.policyPlan.policies.length,
      },
      executionMetadata: executionPlan.metadata,
      metadata: {
        workflowVersionId: request.snapshot.version.id,
        transitionCode: request.transitionCode,
      },
    }).then((result) => {
      const totalExecutionTime = Date.now() - planningStartedAt;

      observer.recordMetric({
        name: "workflow.execution.totalExecutionTime",
        value: totalExecutionTime,
        unit: "Milliseconds",
        tags: {
          executionPlanId: executionPlan.id,
        },
      });

      observer.recordTrace({
        timestamp: new Date(),
        stage: "ExecutionOrchestrator",
        component: "WorkflowExecutionOrchestrator",
        operation: result.status === "Failed" ? "ExecutionFailed" : result.status === "Deferred" ? "ExecutionDeferred" : "ExecutionCompleted",
        duration: totalExecutionTime,
        status: result.status === "Failed" ? "Failed" : result.status === "Deferred" ? "Deferred" : "Completed",
        correlationId: request.context.runtimeContext.correlationId,
        diagnostics: {
          executionPlanId: executionPlan.id,
          resultStatus: result.status,
        },
      });

      if (result.observability) {
        collector.validate(result.observability);
        this.diagnosticsSink?.record(result.observability);
      }

      return result;
    });
  }
}
