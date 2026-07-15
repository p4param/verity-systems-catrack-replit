import { randomUUID } from "crypto";
import { StateMachineEngine } from "../services/StateMachineEngine";
import { ParticipantManifestGenerator } from "./ParticipantManifestGenerator";
import { WorkflowActionRegistry } from "./WorkflowActionRegistry";
import { WorkflowActionEngine } from "./WorkflowActionEngine";
import { WorkflowPolicyEngine } from "./WorkflowPolicyEngine";
import { RuntimeEffectGraphBuilder } from "./RuntimeEffectGraphBuilder";
import { RuntimeEffectPlanner } from "./RuntimeEffectPlanner";
import { ExecutionPlanBuilder } from "./ExecutionPlanBuilder";
import {
  ApiActionProvider,
  CustomActionProvider,
  DocumentActionProvider,
  EventActionProvider,
  NotificationActionProvider,
  PlatformActionProvider,
  ReportActionProvider,
} from "./action-providers";
import { GenericPolicyProvider } from "./policy-providers";
import type { IStateMachineEngine } from "../contracts/IStateMachineEngine";
import type { IParticipantManifestGenerator } from "../contracts/IParticipantManifestGenerator";
import type { IWorkflowManifestGenerator } from "../contracts/IWorkflowManifestGenerator";
import type { IWorkflowActionEngine } from "../contracts/IWorkflowActionEngine";
import type { IWorkflowPolicyEngine } from "../contracts/IWorkflowPolicyEngine";
import type { IRuntimeEffectPlanner } from "../contracts/IRuntimeEffectPlanner";
import type { IExecutionPlanBuilder } from "../contracts/IExecutionPlanBuilder";
import type {
  WorkflowManifest,
  WorkflowMetadataSnapshot,
  WorkflowValidationResult,
} from "../models/WorkflowModels";

function createDefaultActionEngine(): IWorkflowActionEngine {
  const actionRegistry = new WorkflowActionRegistry();
  actionRegistry.register(new PlatformActionProvider());
  actionRegistry.register(new ApiActionProvider());
  actionRegistry.register(new DocumentActionProvider());
  actionRegistry.register(new ReportActionProvider());
  actionRegistry.register(new EventActionProvider());
  actionRegistry.register(new NotificationActionProvider());
  actionRegistry.register(new CustomActionProvider());
  return new WorkflowActionEngine(actionRegistry);
}

export class WorkflowManifestGenerator implements IWorkflowManifestGenerator {
  constructor(
    private readonly stateMachineEngine: IStateMachineEngine = new StateMachineEngine(),
    private readonly participantManifestGenerator: IParticipantManifestGenerator = new ParticipantManifestGenerator(),
    private readonly actionEngine: IWorkflowActionEngine = createDefaultActionEngine(),
    private readonly policyEngine: IWorkflowPolicyEngine = new WorkflowPolicyEngine([new GenericPolicyProvider()]),
    private readonly runtimeEffectPlanner: IRuntimeEffectPlanner = new RuntimeEffectPlanner(
      new RuntimeEffectGraphBuilder()
    ),
    private readonly executionPlanBuilder: IExecutionPlanBuilder = new ExecutionPlanBuilder()
  ) {}

  async generate(
    snapshot: WorkflowMetadataSnapshot,
    validation: WorkflowValidationResult,
    actorUserId: string
  ): Promise<WorkflowManifest> {
    const runtimeModel = await this.stateMachineEngine.buildRuntimeModel(snapshot);
    const participantManifest = await this.participantManifestGenerator.generateParticipantManifest(snapshot);
    const assignmentManifest = await this.participantManifestGenerator.generateAssignmentManifest(snapshot);
    const resolutionManifest = await this.participantManifestGenerator.generateResolutionManifest(
      snapshot,
      runtimeModel
    );
    const transitions = [...snapshot.transitions].sort(
      (a, b) => a.sequence - b.sequence || a.code.localeCompare(b.code)
    );
    const transitionPlans = [] as Array<{
      transitionCode: string;
      actionPlan: Awaited<ReturnType<IWorkflowActionEngine["resolve"]>>;
      policyPlan: Awaited<ReturnType<IWorkflowPolicyEngine["resolve"]>>;
      effectResolution: Awaited<ReturnType<IRuntimeEffectPlanner["plan"]>>;
      executionPlan: Awaited<ReturnType<IExecutionPlanBuilder["build"]>>;
    }>;

    for (const transition of transitions) {
      const actionPlan = await this.actionEngine.resolve({
        snapshot,
        transition,
        runtimeContext: {} as any,
      });

      const policyPlan = await this.policyEngine.resolve({
        snapshot,
        transition,
        actionPlan,
      });

      const effectResolution = await this.runtimeEffectPlanner.plan(
        snapshot,
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

      transitionPlans.push({
        transitionCode: transition.code,
        actionPlan,
        policyPlan,
        effectResolution,
        executionPlan,
      });
    }

    const actionManifest: WorkflowManifest["actionManifest"] = {
      workflowVersionId: snapshot.version.id,
      generatedAt: new Date(),
      transitions: transitionPlans.map((item) => ({
        transitionCode: item.transitionCode,
        actions: item.actionPlan.actions.map((action) => ({
          actionCode: action.actionCode,
          actionType: action.actionType,
          providerKey: action.providerKey,
          sequence: action.sequence,
          priority: action.priority,
          dependencies: [...action.dependencies],
          parallelMode: action.parallelMode,
        })),
      })),
    };

    const policyManifest: WorkflowManifest["policyManifest"] = {
      workflowVersionId: snapshot.version.id,
      generatedAt: new Date(),
      transitions: transitionPlans.map((item) => ({
        transitionCode: item.transitionCode,
        policies: item.policyPlan.policies.map((policy) => ({
          policyCode: policy.policyCode,
          policyType: policy.policyType,
          providerKey: policy.providerKey,
          scope: policy.scope,
          actionCode: policy.actionCode,
          priority: policy.priority,
        })),
      })),
    };

    const runtimeEffectManifest: WorkflowManifest["runtimeEffectManifest"] = {
      workflowVersionId: snapshot.version.id,
      generatedAt: new Date(),
      transitions: transitionPlans.map((item) => ({
        transitionCode: item.transitionCode,
        effects: item.effectResolution.effectSet.effects.map((effect) => ({
          effectCode: effect.effectCode,
          effectType: effect.effectType,
          actionCode: effect.actionCode,
          dependencies: [...effect.dependencies],
          priority: effect.priority,
          parallelizable: effect.parallelizable,
        })),
      })),
    };

    const executionManifest: WorkflowManifest["executionManifest"] = {
      workflowVersionId: snapshot.version.id,
      generatedAt: new Date(),
      transitions: transitionPlans.map((item) => ({
        transitionCode: item.transitionCode,
        orderedEffectCodes: [...item.executionPlan.orderedEffectCodes],
        parallelBatches: item.executionPlan.parallelBatches.map((batch) => [...batch]),
        dependencyCounts: {
          actionEdges: item.executionPlan.dependencyGraph.actionGraph.edges.length,
          policyEdges: item.executionPlan.dependencyGraph.policyGraph.edges.length,
          runtimeEffectEdges: item.executionPlan.dependencyGraph.runtimeEffectGraph.edges.length,
          executionEdges: item.executionPlan.dependencyGraph.executionGraph.edges.length,
        },
      })),
    };

    return {
      id: randomUUID(),
      workflowDefinitionId: snapshot.definition.id,
      workflowVersionId: snapshot.version.id,
      generatedAt: new Date(),
      generatedBy: actorUserId,
      runtimeModel,
      participantManifest,
      assignmentManifest,
      resolutionManifest,
      actionManifest,
      policyManifest,
      runtimeEffectManifest,
      executionManifest,
      validation,
      designerSnapshot: snapshot,
    };
  }
}
