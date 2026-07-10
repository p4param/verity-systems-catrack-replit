import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { createAuditLog } from "@/lib/audit";
import { recordRepository, TenantContext } from "../repositories/record-repository";
import { RuntimeManifest } from "./manifest-generator";
import { numberGeneratorService } from "./number-generator";

export class RecordService {
  /**
   * Generates a dynamic Zod schema based on the Runtime Manifest fields.
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
          fieldSchema = z.string().or(z.date()).refine((val) => !isNaN(new Date(val).getTime()), { message: "Invalid date" });
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

  async createRecord(entityId: string, manifest: RuntimeManifest, payload: any, ctx: TenantContext & { tenantId: number, actorUserId: number }) {
    logger.info(`Creating dynamic record for ${manifest.entity}`, { entityId, userId: ctx.actorUserId });

    const schema = this.buildValidationSchema(manifest);
    const parsedPayload = schema.parse(payload);

    return await prisma.$transaction(async (tx) => {
      const recordNumber = await numberGeneratorService.generateRecordNumber(manifest, tx);
      const record = await recordRepository.create(entityId, manifest, parsedPayload, recordNumber, ctx, tx);

      await createAuditLog({
        tenantId: ctx.tenantId,
        actorUserId: ctx.actorUserId,
        action: "RECORD_CREATED",
        details: `Created new record ${recordNumber} for entity ${manifest.entity}`,
      }, tx);

      return record;
    });
  }

  async updateRecord(recordId: string, manifest: RuntimeManifest, payload: any, ctx: TenantContext & { tenantId: number, actorUserId: number }) {
    logger.info(`Updating dynamic record ${recordId}`, { userId: ctx.actorUserId });

    const schema = this.buildValidationSchema(manifest, true);
    const parsedPayload = schema.parse(payload);

    return await prisma.$transaction(async (tx) => {
      const record = await recordRepository.update(recordId, manifest, parsedPayload, ctx, tx);

      await createAuditLog({
        tenantId: ctx.tenantId,
        actorUserId: ctx.actorUserId,
        action: "RECORD_UPDATED",
        details: `Updated record ${record.recordNumber} for entity ${manifest.entity}`,
      }, tx);

      return record;
    });
  }

  async deleteRecord(recordId: string, manifest: RuntimeManifest, ctx: TenantContext & { tenantId: number, actorUserId: number }) {
    return await prisma.$transaction(async (tx) => {
      const record = await recordRepository.delete(recordId, ctx, tx);
      
      await createAuditLog({
        tenantId: ctx.tenantId,
        actorUserId: ctx.actorUserId,
        action: "RECORD_DELETED",
        details: `Deleted record ${record.recordNumber} for entity ${manifest.entity}`,
      }, tx);

      return record;
    });
  }

  async enrichLookupLabels(records: any[], manifest: RuntimeManifest) {
    if (!records || records.length === 0) return records;
    const lookupFields = manifest.fields.filter(f => f.uiControl === "LOOKUP" && f.lookupEntity);
    if (lookupFields.length === 0) return records;

    const db = prisma;
    for (const field of lookupFields) {
      const referencedIds = [...new Set(records.map(r => r[field.code]).filter(Boolean))];
      if (referencedIds.length === 0) continue;

      const lookupEntity = await db.configurationEntity.findUnique({
         where: { id: field.lookupEntity! }
      });
      if (!lookupEntity || !lookupEntity.metadata) continue;
      
      const lookupManifest = (lookupEntity.metadata as any)?.runtimeManifest;
      if (!lookupManifest) continue;

      let displayFieldCode = "id";
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

      // Avoid infinite recursion by not calling getRecords, just raw findMany
      const referencedRecords = await recordRepository.findMany(lookupEntity.id, lookupManifest, { 
        where: { id: { in: referencedIds } } 
      });

      const labelMap = new Map(referencedRecords.map(r => [r.id, r[displayFieldCode] || r.id]));

      for (const r of records) {
        if (r[field.code]) {
          r[`${field.code}_label`] = labelMap.get(r[field.code]);
        }
      }
    }
    return records;
  }

  async getRecords(entityId: string, manifest: RuntimeManifest, options: any = {}) {
    const records = await recordRepository.findMany(entityId, manifest, options);
    return await this.enrichLookupLabels(records, manifest);
  }
  
  async getRecordById(recordId: string, manifest: RuntimeManifest) {
    const record = await recordRepository.findById(recordId, manifest);
    if (!record) return null;
    const enriched = await this.enrichLookupLabels([record], manifest);
    return enriched[0];
  }
}

export const recordService = new RecordService();
