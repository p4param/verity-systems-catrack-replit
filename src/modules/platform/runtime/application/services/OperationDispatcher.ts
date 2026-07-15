import type { RuntimeRecord } from "@/modules/platform/persistence";
import type { IRuntimeRecordService, LoadManyOptions } from "../contracts/IRuntimeRecordService";
import type { RuntimeContext } from "../models/RuntimeContext";
import type { RuntimeOperation } from "../models/RuntimeOperation";

export interface RuntimeOperationPlan {
  operation: RuntimeOperation;
  payload?: Record<string, unknown>;
  loadOptions?: LoadManyOptions;
  loadedRecord?: RuntimeRecord | null;
}

export class OperationDispatcher {
  constructor(private readonly runtimeRecordService: IRuntimeRecordService) {}

  buildPlan(
    context: RuntimeContext,
    input: unknown,
    loadedRecord?: RuntimeRecord | null
  ): RuntimeOperationPlan {
    const safePayload = this.payload(input);

    switch (context.operation) {
      case "Create":
        return { operation: "Create", payload: safePayload };
      case "Load":
        return {
          operation: "Load",
          loadOptions: this.loadOptions(input),
          loadedRecord: loadedRecord ?? null,
        };
      case "Save":
        return { operation: "Save", payload: safePayload, loadedRecord: loadedRecord ?? null };
      case "Delete":
        return { operation: "Delete", loadedRecord: loadedRecord ?? null };
      case "Restore":
        return { operation: "Restore", loadedRecord: loadedRecord ?? null };
      case "Duplicate":
        return { operation: "Duplicate", payload: safePayload, loadedRecord: loadedRecord ?? null };
      case "Archive":
        return { operation: "Archive", payload: safePayload, loadedRecord: loadedRecord ?? null };
      case "Submit":
      case "Approve":
      case "Reject":
      case "Cancel":
      case "Close":
      case "Print":
      case "Export":
      case "Import":
        return { operation: context.operation, payload: safePayload, loadedRecord: loadedRecord ?? null };
      default:
        return this.assertNever(context.operation);
    }
  }

  async persist(context: RuntimeContext, plan: RuntimeOperationPlan): Promise<RuntimeRecord | RuntimeRecord[] | null> {
    switch (plan.operation) {
      case "Create":
        return this.runtimeRecordService.create(context, plan.payload ?? {});
      case "Load":
        if (context.recordId) {
          return plan.loadedRecord ?? this.runtimeRecordService.load(context);
        }
        return this.runtimeRecordService.loadMany(context, plan.loadOptions);
      case "Save":
        return this.runtimeRecordService.save(context, plan.payload ?? {});
      case "Delete":
        await this.runtimeRecordService.delete(context);
        return null;
      case "Restore":
        await this.runtimeRecordService.restore(context);
        return null;
      case "Duplicate":
        return this.runtimeRecordService.duplicate(context, plan.payload ?? {});
      case "Archive":
        return this.runtimeRecordService.archive(context);
      case "Submit":
      case "Approve":
      case "Reject":
      case "Cancel":
      case "Close":
      case "Print":
      case "Export":
      case "Import":
        throw new Error(
          `Operation ${plan.operation} is frozen but requires a registered action before execution.`
        );
      default:
        return this.assertNever(plan.operation);
    }
  }

  private payload(input: unknown): Record<string, unknown> {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return {};
    }
    return input as Record<string, unknown>;
  }

  private loadOptions(input: unknown): LoadManyOptions {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return {};
    }

    const candidate = input as Record<string, unknown>;
    const skip = typeof candidate.skip === "number" ? candidate.skip : undefined;
    const take = typeof candidate.take === "number" ? candidate.take : undefined;

    return { skip, take };
  }

  private assertNever(value: never): never {
    throw new Error(`Unsupported runtime operation: ${String(value)}`);
  }
}
