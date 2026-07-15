import type { IRuntimeApplicationEngine } from "./contracts/IRuntimeApplicationEngine";
import type { IRuntimeOperationPipeline } from "./contracts/IRuntimeOperationPipeline";
import type { RuntimeContext } from "./models/RuntimeContext";
import type { RuntimeOperation } from "./models/RuntimeOperation";
import type { RuntimeOperationResult } from "./models/RuntimeOperationResult";

export class RuntimeApplicationEngine implements IRuntimeApplicationEngine {
  constructor(private readonly runtimeOperationPipeline: IRuntimeOperationPipeline) {}

  execute<TInput = unknown, TRecord = unknown>(
    context: RuntimeContext,
    input?: TInput
  ): Promise<RuntimeOperationResult<TRecord>> {
    return this.runtimeOperationPipeline.execute<TInput, TRecord>(context, input);
  }

  private start<TRecord = unknown>(
    context: RuntimeContext,
    operation: RuntimeOperation,
    payload?: Record<string, unknown>
  ): Promise<RuntimeOperationResult<TRecord>> {
    return this.execute<Record<string, unknown> | undefined, TRecord>(
      context.with({ operation }),
      payload
    );
  }

  create<TRecord = unknown>(
    context: RuntimeContext,
    payload: Record<string, unknown>
  ): Promise<RuntimeOperationResult<TRecord>> {
    return this.start(context, "Create", payload);
  }

  load<TRecord = unknown>(
    context: RuntimeContext,
    options?: Record<string, unknown>
  ): Promise<RuntimeOperationResult<TRecord>> {
    return this.start(context, "Load", options);
  }

  save<TRecord = unknown>(
    context: RuntimeContext,
    payload: Record<string, unknown>
  ): Promise<RuntimeOperationResult<TRecord>> {
    return this.start(context, "Save", payload);
  }

  delete(context: RuntimeContext): Promise<RuntimeOperationResult<null>> {
    return this.start<null>(context, "Delete");
  }

  restore(context: RuntimeContext): Promise<RuntimeOperationResult<null>> {
    return this.start<null>(context, "Restore");
  }

  duplicate<TRecord = unknown>(
    context: RuntimeContext,
    payload?: Record<string, unknown>
  ): Promise<RuntimeOperationResult<TRecord>> {
    return this.start(context, "Duplicate", payload ?? {});
  }

  archive<TRecord = unknown>(
    context: RuntimeContext,
    payload?: Record<string, unknown>
  ): Promise<RuntimeOperationResult<TRecord>> {
    return this.start(context, "Archive", payload ?? {});
  }

  submit<TRecord = unknown>(
    context: RuntimeContext,
    payload?: Record<string, unknown>
  ): Promise<RuntimeOperationResult<TRecord>> {
    return this.start(context, "Submit", payload ?? {});
  }

  approve<TRecord = unknown>(
    context: RuntimeContext,
    payload?: Record<string, unknown>
  ): Promise<RuntimeOperationResult<TRecord>> {
    return this.start(context, "Approve", payload ?? {});
  }

  reject<TRecord = unknown>(
    context: RuntimeContext,
    payload?: Record<string, unknown>
  ): Promise<RuntimeOperationResult<TRecord>> {
    return this.start(context, "Reject", payload ?? {});
  }

  cancel<TRecord = unknown>(
    context: RuntimeContext,
    payload?: Record<string, unknown>
  ): Promise<RuntimeOperationResult<TRecord>> {
    return this.start(context, "Cancel", payload ?? {});
  }

  close<TRecord = unknown>(
    context: RuntimeContext,
    payload?: Record<string, unknown>
  ): Promise<RuntimeOperationResult<TRecord>> {
    return this.start(context, "Close", payload ?? {});
  }

  print<TRecord = unknown>(
    context: RuntimeContext,
    payload?: Record<string, unknown>
  ): Promise<RuntimeOperationResult<TRecord>> {
    return this.start(context, "Print", payload ?? {});
  }

  export<TRecord = unknown>(
    context: RuntimeContext,
    payload?: Record<string, unknown>
  ): Promise<RuntimeOperationResult<TRecord>> {
    return this.start(context, "Export", payload ?? {});
  }

  import<TRecord = unknown>(
    context: RuntimeContext,
    payload?: Record<string, unknown>
  ): Promise<RuntimeOperationResult<TRecord>> {
    return this.start(context, "Import", payload ?? {});
  }
}
