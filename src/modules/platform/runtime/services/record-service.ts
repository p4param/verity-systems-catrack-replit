/**
 * CM-003 Runtime Data Engine — Record Service (Refactored)
 *
 * The RecordService is the primary API used by Runtime REST endpoints.
 * Previously: delegated all persistence to EavRepository via recordRepository.
 * Now: delegates to RuntimeDataEngine which transparently routes to
 *   DynamicTableRepository (PHYSICAL) or EavRepository (EAV) based on manifest.
 *
 * Changes from legacy version:
 * - createRecord → runtimeDataEngine.create() (replaces numberGeneratorService + recordRepository.create)
 * - updateRecord → runtimeDataEngine.update()
 * - deleteRecord → runtimeDataEngine.delete()
 * - getRecords   → runtimeDataEngine.query()
 * - getRecordById → runtimeDataEngine.getById()
 * - enrichLookupLabels → runtimeDataEngine.resolveLookupOptions() (per-field)
 *
 * BACKWARD COMPATIBLE: All public method signatures remain identical.
 * Consumers (API routes, Action handlers) do not need to change.
 */
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";
import { TenantContext } from "../repositories/record-repository";
import { RuntimeManifest } from "./manifest-generator";
import { runtimeDataEngine } from "@/modules/platform/persistence";
import type { PersistenceExecutionContext } from "@/modules/platform/persistence";
import type { PlatformQuery } from "@/modules/platform/persistence";
import { logger } from "@/lib/logger";
import { RuntimeRegistry } from "@/shared/components/runtime/registry/RuntimeRegistry";

export class RecordService {
  /**
   * Generates a dynamic Zod schema based on the Runtime Manifest fields.
   * Unchanged from legacy version — validation remains in RecordService.
   */
  private buildValidationSchema(manifest: RuntimeManifest, isUpdate = false) {
    const shape: any = {};

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
            .refine((val) => !isNaN(new Date(val).getTime()), { message: "Invalid date" });
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

  /**
   * Builds PersistenceExecutionContext from a TenantContext.
   * VS05Z: tenantId and userId are now real UUID strings. No coercion needed.
   */
  private buildCtx(
    ctx?: TenantContext & { tenantId: string; actorUserId: string },
    tx?: any
  ): PersistenceExecutionContext {
    return {
      tenantId: ctx.tenantId,
      userId: ctx.actorUserId,
      transaction: tx,
    };
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────

  async createRecord(
    entityId: string,
    manifest: RuntimeManifest,
    payload: any,
    ctx?: TenantContext & { tenantId: string; actorUserId: string }
  ) {
    logger.info(`[RecordService] Creating ${manifest.entity}`, { entityId, userId: ctx.actorUserId });

    const schema = this.buildValidationSchema(manifest);
    const parsedPayload = schema.parse(payload);

    const persCtx = this.buildCtx(ctx);
    const record = await runtimeDataEngine.create(manifest, parsedPayload, persCtx);

    // Legacy audit log — preserved for compatibility
    await createAuditLog({
      tenantId: ctx.tenantId,
      actorUserId: ctx.actorUserId,
      action: "RECORD_CREATED",
      details: `Created new record ${record.recordNumber} for entity ${manifest.entity}`,
    });

    return record;
  }

  async updateRecord(
    recordId: string,
    manifest: RuntimeManifest,
    payload: any,
    ctx?: TenantContext & { tenantId: string; actorUserId: string }
  ) {
    logger.info(`[RecordService] Updating ${manifest.entity}/${recordId}`, { userId: ctx.actorUserId });

    const schema = this.buildValidationSchema(manifest, true);
    const parsedPayload = schema.parse(payload);

    // Retrieve current version for optimistic concurrency
    const persCtx = this.buildCtx(ctx);
    const existing = await runtimeDataEngine.getById(manifest, recordId, undefined, persCtx);
    const expectedVersion = existing?.version ?? 1;

    const record = await runtimeDataEngine.update(manifest, recordId, parsedPayload, expectedVersion, persCtx);

    await createAuditLog({
      tenantId: ctx.tenantId,
      actorUserId: ctx.actorUserId,
      action: "RECORD_UPDATED",
      details: `Updated record ${record.recordNumber} for entity ${manifest.entity}`,
    });

    return record;
  }

  async deleteRecord(
    recordId: string,
    manifest: RuntimeManifest,
    ctx?: TenantContext & { tenantId: string; actorUserId: string }
  ) {
    const persCtx = this.buildCtx(ctx);

    // Get the record first for the audit log
    const existing = await runtimeDataEngine.getById(manifest, recordId, undefined, persCtx);
    await runtimeDataEngine.delete(manifest, recordId, persCtx);

    await createAuditLog({
      tenantId: ctx.tenantId,
      actorUserId: ctx.actorUserId,
      action: "RECORD_DELETED",
      details: `Deleted record ${existing?.recordNumber ?? recordId} for entity ${manifest.entity}`,
    });

    return { id: recordId, recordNumber: existing?.recordNumber };
  }

  // ─── Queries ─────────────────────────────────────────────────────────────

  async getRecords(entityId: string, manifest: RuntimeManifest, options: any = {}, ctx?: TenantContext & { tenantId: string; actorUserId: string }) {
    if (!ctx) throw new Error("Tenant context is required for record queries");
    const q: PlatformQuery = {
      where: options.where ? this.legacyWhereToPlatformFilters(options.where) : undefined,
      skip: options.skip ?? options.offset,
      take: options.take ?? options.limit,
      orderBy: options.orderBy,
      includeDeleted: false,
    };
    const records = await runtimeDataEngine.query(manifest, q, this.buildCtx(ctx));
    return await this.enrichLookupLabels(records, manifest, ctx);
  }

  async getRecordById(
    recordId: string,
    manifest: RuntimeManifest,
    ctx?: TenantContext & { tenantId: string; actorUserId: string }
  ) {
    if (!ctx) throw new Error("Tenant context is required for record queries");
    const record = await runtimeDataEngine.getById(manifest, recordId, undefined, this.buildCtx(ctx));
    if (!record) return null;
    const enriched = await this.enrichLookupLabels([record], manifest, ctx);
    return enriched[0];
  }

  // ─── Lookup Label Enrichment ──────────────────────────────────────────────

  async enrichLookupLabels(records: any[], manifest: RuntimeManifest, ctx?: TenantContext & { tenantId: string; actorUserId: string }) {
    if (!records || records.length === 0) return records;

    const lookupFields = manifest.fields.filter(
      (f) =>
        (f.uiControl === "LOOKUP" ||
          f.dataSource === "LOOKUP" ||
          f.dataSource === "LOOKUP_ENTITY" ||
          f.dataSource === "LOOKUP_VIEW") &&
        f.lookupDefinition?.referencedEntityId
    );
    if (lookupFields.length === 0) return records;

    for (const field of lookupFields) {
      const referencedIds = [...new Set(records.map((r) => r[field.code]).filter(Boolean))];
      if (referencedIds.length === 0) continue;

      const referencedEntityId = field.lookupDefinition!.referencedEntityId;

      const artifact = await RuntimeRegistry.getActiveArtifact("platform", referencedEntityId);
      if (!artifact || !artifact.payload) continue;

      const lookupManifest = artifact.payload as any;

      let displayFieldCode = "id";
      if (field.lookupDefinition?.displayFieldId) {
        const displayField = lookupManifest.fields.find(
          (mf: any) => mf.id === field.lookupDefinition?.displayFieldId
        );
        if (displayField) displayFieldCode = displayField.code;
      }

      if (displayFieldCode === "id") {
        const possibleFields = ["NAME", "TITLE", "CODE", "DESCRIPTION"];
        for (const f of possibleFields) {
          if (lookupManifest.fields.find((mf: any) => mf.code === f)) {
            displayFieldCode = f;
            break;
          }
        }
        if (displayFieldCode === "id") {
          const firstTextField = lookupManifest.fields.find((f: any) => f.dataType === "STRING");
          if (firstTextField) displayFieldCode = firstTextField.code;
        }
      }

      // Use RuntimeDataEngine for lookup resolution (routes to PHYSICAL or EAV)
      const options = await runtimeDataEngine.resolveLookupOptions(
        lookupManifest,
        displayFieldCode.toLowerCase(),
        undefined,
        1000,
        this.buildCtx(ctx)
      );
      const labelMap = new Map(options.map((o) => [o.id, o.label]));

      for (const r of records) {
        if (r[field.code]) {
          r[`${field.code}_label`] = labelMap.get(r[field.code]) ?? r[field.code];
        }
      }
    }
    return records;
  }

  // ─── Private: Legacy Where Conversion ────────────────────────────────────

  /**
   * Converts legacy Prisma-style where objects to PlatformFilter arrays.
   * Handles simple equality filters only — for backward compatibility.
   * Complex Prisma filters (nested AND/OR) are not converted; handled by EavRepository directly.
   */
  private legacyWhereToPlatformFilters(where: any): any[] {
    if (!where || typeof where !== "object") return [];
    const filters: any[] = [];
    for (const [key, value] of Object.entries(where)) {
      if (key === "AND" || key === "OR" || key === "NOT") continue;
      if (value !== null && value !== undefined && typeof value !== "object") {
        filters.push({ field: key, operator: "eq", value });
      }
    }
    return filters;
  }
}

export const recordService = new RecordService();





