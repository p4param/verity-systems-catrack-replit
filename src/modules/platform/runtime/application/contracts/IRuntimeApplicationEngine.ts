import type { RuntimeOperationResult } from "../models/RuntimeOperationResult";
import type { RuntimeContext } from "../models/RuntimeContext";

export interface IRuntimeApplicationEngine {
  execute<TInput = unknown, TRecord = unknown>(
    context: RuntimeContext,
    input?: TInput
  ): Promise<RuntimeOperationResult<TRecord>>;

  create<TRecord = unknown>(
    context: RuntimeContext,
    payload: Record<string, unknown>
  ): Promise<RuntimeOperationResult<TRecord>>;

  load<TRecord = unknown>(
    context: RuntimeContext,
    options?: Record<string, unknown>
  ): Promise<RuntimeOperationResult<TRecord>>;

  save<TRecord = unknown>(
    context: RuntimeContext,
    payload: Record<string, unknown>
  ): Promise<RuntimeOperationResult<TRecord>>;

  delete(context: RuntimeContext): Promise<RuntimeOperationResult<null>>;
  restore(context: RuntimeContext): Promise<RuntimeOperationResult<null>>;

  duplicate<TRecord = unknown>(
    context: RuntimeContext,
    payload?: Record<string, unknown>
  ): Promise<RuntimeOperationResult<TRecord>>;

  archive<TRecord = unknown>(
    context: RuntimeContext,
    payload?: Record<string, unknown>
  ): Promise<RuntimeOperationResult<TRecord>>;

  submit<TRecord = unknown>(
    context: RuntimeContext,
    payload?: Record<string, unknown>
  ): Promise<RuntimeOperationResult<TRecord>>;

  approve<TRecord = unknown>(
    context: RuntimeContext,
    payload?: Record<string, unknown>
  ): Promise<RuntimeOperationResult<TRecord>>;

  reject<TRecord = unknown>(
    context: RuntimeContext,
    payload?: Record<string, unknown>
  ): Promise<RuntimeOperationResult<TRecord>>;

  cancel<TRecord = unknown>(
    context: RuntimeContext,
    payload?: Record<string, unknown>
  ): Promise<RuntimeOperationResult<TRecord>>;

  close<TRecord = unknown>(
    context: RuntimeContext,
    payload?: Record<string, unknown>
  ): Promise<RuntimeOperationResult<TRecord>>;

  print<TRecord = unknown>(
    context: RuntimeContext,
    payload?: Record<string, unknown>
  ): Promise<RuntimeOperationResult<TRecord>>;

  export<TRecord = unknown>(
    context: RuntimeContext,
    payload?: Record<string, unknown>
  ): Promise<RuntimeOperationResult<TRecord>>;

  import<TRecord = unknown>(
    context: RuntimeContext,
    payload?: Record<string, unknown>
  ): Promise<RuntimeOperationResult<TRecord>>;
}
