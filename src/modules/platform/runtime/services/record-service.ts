/**
 * Legacy RecordService adapter.
 *
 * The public methods are retained for backward compatibility while all
 * runtime orchestration is delegated to RuntimeApplicationEngine.
 */
import { TenantContext } from "../repositories/record-repository";
import { RuntimeManifest } from "./manifest-generator";
import { runtimeDataEngine } from "@/modules/platform/persistence";
import { runtimeApplicationEngine, RuntimeContext } from "@/modules/platform/runtime/application";
import { RuntimeRegistry } from "@/shared/components/runtime/registry/RuntimeRegistry";

export class RecordService {
  private buildRuntimeContext(
    manifest: RuntimeManifest,
    ctx: TenantContext & { tenantId: string; actorUserId: string },
    operation: "Create" | "Load" | "Save" | "Delete" | "Restore" | "Duplicate" | "Archive",
    recordId?: string
  ): RuntimeContext {
    return RuntimeContext.create({
      tenantId: ctx.tenantId,
      organizationId: ctx.companyId,
      moduleId: manifest.module,
      entityId: manifest.entity,
      entityDefinition: manifest,
      viewDefinition: manifest.presentation?.defaultDataViewCode,
      layoutDefinition: manifest.presentation?.defaultLayoutViewCode,
      userId: ctx.actorUserId,
      roles: [],
      permissions: [],
      operation,
      recordId,
      culture: "en-US",
      timezone: "UTC",
    });
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────

  async createRecord(
    entityId: string,
    manifest: RuntimeManifest,
    payload: any,
    ctx?: TenantContext & { tenantId: string; actorUserId: string }
  ) {
    if (!ctx) throw new Error("Tenant context is required for create operation");
    const result = await runtimeApplicationEngine.create(
      this.buildRuntimeContext(manifest, ctx, "Create"),
      payload
    );

    if (!result.success) {
      throw new Error(result.errors[0] ?? "Runtime create operation failed.");
    }

    return result.record;
  }

  async updateRecord(
    recordId: string,
    manifest: RuntimeManifest,
    payload: any,
    ctx?: TenantContext & { tenantId: string; actorUserId: string }
  ) {
    if (!ctx) throw new Error("Tenant context is required for update operation");
    const result = await runtimeApplicationEngine.save(
      this.buildRuntimeContext(manifest, ctx, "Save", recordId),
      payload
    );

    if (!result.success) {
      throw new Error(result.errors[0] ?? "Runtime save operation failed.");
    }

    return result.record;
  }

  async deleteRecord(
    recordId: string,
    manifest: RuntimeManifest,
    ctx?: TenantContext & { tenantId: string; actorUserId: string }
  ) {
    if (!ctx) throw new Error("Tenant context is required for delete operation");
    const record = await this.getRecordById(recordId, manifest, ctx);
    const result = await runtimeApplicationEngine.delete(
      this.buildRuntimeContext(manifest, ctx, "Delete", recordId)
    );

    if (!result.success) {
      throw new Error(result.errors[0] ?? "Runtime delete operation failed.");
    }

    return { id: recordId, recordNumber: (record as any)?.recordNumber };
  }

  // ─── Queries ─────────────────────────────────────────────────────────────

  async getRecords(entityId: string, manifest: RuntimeManifest, options: any = {}, ctx?: TenantContext & { tenantId: string; actorUserId: string }) {
    if (!ctx) throw new Error("Tenant context is required for record queries");
    const result = await runtimeApplicationEngine.load(
      this.buildRuntimeContext(manifest, ctx, "Load"),
      {
        skip: options.skip ?? options.offset,
        take: options.take ?? options.limit,
      }
    );

    if (!result.success) {
      throw new Error(result.errors[0] ?? "Runtime load operation failed.");
    }

    const records = Array.isArray(result.record) ? result.record : [];
    return this.enrichLookupLabels(records, manifest, ctx);
  }

  async getRecordById(
    recordId: string,
    manifest: RuntimeManifest,
    ctx?: TenantContext & { tenantId: string; actorUserId: string }
  ) {
    if (!ctx) throw new Error("Tenant context is required for record queries");
    const result = await runtimeApplicationEngine.load(
      this.buildRuntimeContext(manifest, ctx, "Load", recordId)
    );

    if (!result.success) {
      throw new Error(result.errors[0] ?? "Runtime load operation failed.");
    }

    const record = result.record as any;
    if (!record) return null;
    const enriched = await this.enrichLookupLabels([record], manifest, ctx);
    return enriched[0];
  }

  // ─── Lookup Label Enrichment ──────────────────────────────────────────────

  async enrichLookupLabels(records: any[], manifest: RuntimeManifest, ctx?: TenantContext & { tenantId: string; actorUserId: string }) {
    if (!records || records.length === 0) return records;
    if (!ctx) return records;

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
        {
          tenantId: ctx.tenantId,
          userId: ctx.actorUserId,
          transaction: undefined,
        }
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

}

export const recordService = new RecordService();





