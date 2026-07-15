import type { IWorkflowExecutor } from "../contracts/IWorkflowExecutor";
import type { IWorkflowExecutorRegistry } from "../contracts/IWorkflowExecutorRegistry";

export class WorkflowExecutorRegistry implements IWorkflowExecutorRegistry {
  private readonly executors = new Map<string, IWorkflowExecutor>();
  private readonly byEffectType = new Map<string, IWorkflowExecutor[]>();
  private readonly wildcardExecutors: IWorkflowExecutor[] = [];

  register(executor: IWorkflowExecutor): void {
    if (this.executors.has(executor.executorKey)) {
      throw new Error(`Duplicate executor registered: ${executor.executorKey}`);
    }

    this.executors.set(executor.executorKey, executor);
    for (const effectType of executor.supportedEffectTypes) {
      if (effectType === "*") {
        this.wildcardExecutors.push(executor);
        continue;
      }

      const list = this.byEffectType.get(effectType) ?? [];
      list.push(executor);
      list.sort((left, right) => right.executionPriority - left.executionPriority || left.executorKey.localeCompare(right.executorKey));
      this.byEffectType.set(effectType, list);
    }
  }

  getByExecutorKey(executorKey: string): IWorkflowExecutor | null {
    return this.executors.get(executorKey) ?? null;
  }

  getByEffectType(effectType: string): IWorkflowExecutor | null {
    const exact = this.byEffectType.get(effectType);
    if (exact && exact.length > 0) {
      return exact[0];
    }

    return this.wildcardExecutors[0] ?? null;
  }

  getAll(): readonly IWorkflowExecutor[] {
    return [...this.executors.values()];
  }

  validateCompatibility(effectType: string, requiredCapabilities: Partial<Record<string, boolean>> = {}): void {
    const executor = this.getByEffectType(effectType);
    if (!executor) {
      throw new Error(`Missing executor for effect type ${effectType}.`);
    }

    for (const [capability, required] of Object.entries(requiredCapabilities)) {
      if (required && executor.capabilities[capability as keyof typeof executor.capabilities] !== true) {
        throw new Error(
          `Executor ${executor.executorKey} does not satisfy capability ${capability} for effect type ${effectType}.`
        );
      }
    }
  }
}
