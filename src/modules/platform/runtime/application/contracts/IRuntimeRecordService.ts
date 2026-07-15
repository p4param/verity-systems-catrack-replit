import type { RuntimeRecord } from "@/modules/platform/persistence";
import type { RuntimeContext } from "../models/RuntimeContext";

export interface LoadManyOptions {
  skip?: number;
  take?: number;
}

export interface IRuntimeRecordService {
  load(context: RuntimeContext): Promise<RuntimeRecord | null>;
  loadMany(context: RuntimeContext, options?: LoadManyOptions): Promise<RuntimeRecord[]>;
  create(context: RuntimeContext, payload: Record<string, unknown>): Promise<RuntimeRecord>;
  save(context: RuntimeContext, payload: Record<string, unknown>): Promise<RuntimeRecord>;
  delete(context: RuntimeContext): Promise<void>;
  restore(context: RuntimeContext): Promise<void>;
  duplicate(context: RuntimeContext, payload?: Record<string, unknown>): Promise<RuntimeRecord>;
  archive(context: RuntimeContext): Promise<RuntimeRecord>;
}
