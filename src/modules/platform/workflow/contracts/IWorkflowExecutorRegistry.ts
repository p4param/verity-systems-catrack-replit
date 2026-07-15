import type { IWorkflowExecutor } from "./IWorkflowExecutor";

export interface IWorkflowExecutorRegistry {
  register(executor: IWorkflowExecutor): void;
  getByExecutorKey(executorKey: string): IWorkflowExecutor | null;
  getByEffectType(effectType: string): IWorkflowExecutor | null;
  getAll(): readonly IWorkflowExecutor[];
  validateCompatibility(effectType: string, requiredCapabilities?: Partial<Record<string, boolean>>): void;
}
