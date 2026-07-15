import { z } from "zod";
import { createAuditLog } from "@/lib/audit";
import {
  runtimeDataEngine,
  type PersistenceExecutionContext,
  type PlatformQuery,
  type RuntimeRecord,
} from "@/modules/platform/persistence";
import type { RuntimeManifest } from "../../services/manifest-generator";
import type { IRuntimeRecordService, LoadManyOptions } from "../contracts/IRuntimeRecordService";
import type { RuntimeContext } from "../models/RuntimeContext";

const SYSTEM_RECORD_FIELDS = new Set([
  "id",
  "recordNumber",
  "status",
  "createdAt",
  "updatedAt",
  "version",
  "__runtime",
  "tenantId",
  "createdBy",
  "updatedBy",
  "deletedAt",
  "deletedBy",
  "isDeleted",
]);

export class RuntimeRecordService implements IRuntimeRecordService {
  private buildValidationSchema(manifest: RuntimeManifest, isUpdate = false) {
    const shape: Record<string, z.ZodTypeAny> = {};

    for (const field of manifest.fields) {
      let fieldSchema: z.ZodTypeAny;

      switch (field.dataType) {
        case "STRING":
        case "TEXT":
          fieldSchema = z.string();
          break;
        case "NUMBER":
        case "DECIMAL":
          fieldSchema = z.number();
          break;
        case "BOOLEAN":
          fieldSchema = z.boolean();
          break;
        case "DATE":
        case "DATETIME":
          fieldSchema = z
            .string()
            .or(z.date())
            .refine((val) => !Number.isNaN(new Date(val).getTime()), { message: "Invalid date" });
          break;
        case "JSON":
          fieldSchema = z.any();
          break;
        default:
          fieldSchema = z.any();
      }

      if (field.required) {
        if (fieldSchema instanceof z.ZodString) {
          fieldSchema = fieldSchema.min(1, "Required");
        }
      } else {
        fieldSchema = fieldSchema.optional().nullable();
      }

      if (isUpdate) {
        fieldSchema = fieldSchema.optional();
      }

      shape[field.code] = fieldSchema;
    }

    return z.object(shape);
  }

  private manifest(context: RuntimeContext): RuntimeManifest {
    if (!context.entityDefinition) {
      throw new Error("Runtime entity definition is required in RuntimeContext.");
    }
    return context.entityDefinition;
  }

  private executionContext(context: RuntimeContext): PersistenceExecutionContext {
    return {
      tenantId: context.tenantId,
      userId: context.userId,
      transaction: context.transactionId,
    };
  }

  private async audit(context: RuntimeContext, action: string, details: string): Promise<void> {
    await createAuditLog({
      tenantId: context.tenantId,
      actorUserId: context.userId,
      action,
      details,
    });
  }

  private sanitizeForDuplicate(record: RuntimeRecord): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record as Record<string, unknown>)) {
      if (SYSTEM_RECORD_FIELDS.has(key)) {
        continue;
      }
      payload[key] = value;
    }
    return payload;
  }

  async load(context: RuntimeContext): Promise<RuntimeRecord | null> {
    if (!context.recordId) {
      throw new Error("Record ID is required for load operation.");
    }

    return runtimeDataEngine.getById(
      this.manifest(context),
      context.recordId,
      undefined,
      this.executionContext(context)
    );
  }

  async loadMany(context: RuntimeContext, options?: LoadManyOptions): Promise<RuntimeRecord[]> {
    const query: PlatformQuery = {
      skip: options?.skip,
      take: options?.take,
      includeDeleted: false,
    };

    return runtimeDataEngine.query(this.manifest(context), query, this.executionContext(context));
  }

  async create(context: RuntimeContext, payload: Record<string, unknown>): Promise<RuntimeRecord> {
    const manifest = this.manifest(context);
    const schema = this.buildValidationSchema(manifest, false);
    const parsedPayload = schema.parse(payload);

    const record = await runtimeDataEngine.create(
      manifest,
      parsedPayload,
      this.executionContext(context)
    );

    await this.audit(
      context,
      "RECORD_CREATED",
      `Created runtime record ${record.recordNumber} for entity ${manifest.entity}`
    );

    return record;
  }

  async save(context: RuntimeContext, payload: Record<string, unknown>): Promise<RuntimeRecord> {
    if (!context.recordId) {
      throw new Error("Record ID is required for save operation.");
    }

    const manifest = this.manifest(context);
    const schema = this.buildValidationSchema(manifest, true);
    const parsedPayload = schema.parse(payload);

    const existing = await runtimeDataEngine.getById(
      manifest,
      context.recordId,
      undefined,
      this.executionContext(context)
    );

    if (!existing) {
      throw new Error(`Record ${context.recordId} was not found.`);
    }

    const record = await runtimeDataEngine.update(
      manifest,
      context.recordId,
      parsedPayload,
      existing.version ?? 1,
      this.executionContext(context)
    );

    await this.audit(
      context,
      "RECORD_UPDATED",
      `Updated runtime record ${record.recordNumber} for entity ${manifest.entity}`
    );

    return record;
  }

  async delete(context: RuntimeContext): Promise<void> {
    if (!context.recordId) {
      throw new Error("Record ID is required for delete operation.");
    }

    const manifest = this.manifest(context);
    const existing = await runtimeDataEngine.getById(
      manifest,
      context.recordId,
      undefined,
      this.executionContext(context)
    );

    await runtimeDataEngine.delete(manifest, context.recordId, this.executionContext(context));

    await this.audit(
      context,
      "RECORD_DELETED",
      `Deleted runtime record ${existing?.recordNumber ?? context.recordId} for entity ${manifest.entity}`
    );
  }

  async restore(context: RuntimeContext): Promise<void> {
    if (!context.recordId) {
      throw new Error("Record ID is required for restore operation.");
    }

    const manifest = this.manifest(context);
    await runtimeDataEngine.restore(manifest, context.recordId, this.executionContext(context));

    await this.audit(
      context,
      "RECORD_RESTORED",
      `Restored runtime record ${context.recordId} for entity ${manifest.entity}`
    );
  }

  async duplicate(
    context: RuntimeContext,
    payload: Record<string, unknown> = {}
  ): Promise<RuntimeRecord> {
    if (!context.recordId) {
      throw new Error("Record ID is required for duplicate operation.");
    }

    const source = await this.load(context);
    if (!source) {
      throw new Error(`Record ${context.recordId} was not found.`);
    }

    const duplicatedPayload = {
      ...this.sanitizeForDuplicate(source),
      ...payload,
    };

    return this.create(context.with({ recordId: undefined }), duplicatedPayload);
  }

  async archive(context: RuntimeContext): Promise<RuntimeRecord> {
    if (!context.recordId) {
      throw new Error("Record ID is required for archive operation.");
    }

    const source = await this.load(context);
    if (!source) {
      throw new Error(`Record ${context.recordId} was not found.`);
    }

    await this.delete(context);

    return source;
  }
}
