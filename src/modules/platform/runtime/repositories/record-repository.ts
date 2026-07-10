import { Prisma, PrismaClient, EntityRecord, EntityValue } from "@/generated/client";
import { prisma } from "@/lib/prisma";
import { RuntimeManifest } from "../services/manifest-generator";

export interface TenantContext {
  companyId: string;
  branchId: string;
  userId: string;
}

export class RecordRepository {
  /**
   * Helper to flatten EntityValue records back into a single JSON object for the frontend.
   */
  private flattenRecord(record: EntityRecord & { values: EntityValue[] }, manifest: RuntimeManifest) {
    const flat: any = {
      id: record.id,
      recordNumber: record.recordNumber,
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      version: record.version,
    };

    const fieldMap = new Map(manifest.fields.map(f => [f.id, f]));

    for (const val of record.values) {
      const fieldDef = fieldMap.get(val.fieldDefinitionId);
      if (!fieldDef) continue;

      let actualValue: any = null;
      if (val.valueString !== null) actualValue = val.valueString;
      else if (val.valueNumber !== null) actualValue = val.valueNumber;
      else if (val.valueBoolean !== null) actualValue = val.valueBoolean;
      else if (val.valueDate !== null) actualValue = val.valueDate;
      else if (val.valueDateTime !== null) actualValue = val.valueDateTime;
      else if (val.valueJson !== null) actualValue = val.valueJson;
      else if (val.valueReferenceId !== null) actualValue = val.valueReferenceId;

      flat[fieldDef.code] = actualValue;
    }

    return flat;
  }

  /**
   * Maps a flat JSON object into an array of EntityValue Prisma creation objects.
   */
  private mapToEntityValues(payload: Record<string, any>, manifest: RuntimeManifest) {
    const values: Prisma.EntityValueCreateWithoutRecordInput[] = [];

    for (const field of manifest.fields) {
      const val = payload[field.code];
      if (val === undefined || val === null) continue;

      const entityValue: Prisma.EntityValueCreateWithoutRecordInput = {
        fieldDefinition: { connect: { id: field.id } },
      };

      // Map according to dataType
      switch (field.dataType) {
        case "STRING":
        case "TEXT":
          entityValue.valueString = String(val);
          break;
        case "NUMBER":
        case "DECIMAL":
          entityValue.valueNumber = Number(val);
          break;
        case "BOOLEAN":
          entityValue.valueBoolean = Boolean(val);
          break;
        case "DATE":
          entityValue.valueDate = new Date(val);
          break;
        case "DATETIME":
          entityValue.valueDateTime = new Date(val);
          break;
        case "JSON":
          entityValue.valueJson = val;
          break;
        case "REFERENCE":
          entityValue.valueReferenceId = String(val);
          break;
        default:
          entityValue.valueString = String(val);
      }

      values.push(entityValue);
    }

    return values;
  }

  async findMany(
    entityId: string, 
    manifest: RuntimeManifest,
    options: { skip?: number; take?: number; where?: any } = {}
  ) {
    const records = await prisma.entityRecord.findMany({
      where: {
        entityId,
        isDeleted: false,
        ...options.where
      },
      include: {
        values: true
      },
      skip: options.skip,
      take: options.take,
      orderBy: { createdAt: "desc" }
    });

    return records.map(r => this.flattenRecord(r, manifest));
  }

  async findById(recordId: string, manifest: RuntimeManifest) {
    const record = await prisma.entityRecord.findUnique({
      where: { id: recordId },
      include: { values: true }
    });

    if (!record || record.isDeleted) return null;
    return this.flattenRecord(record, manifest);
  }

  async create(
    entityId: string, 
    manifest: RuntimeManifest, 
    payload: Record<string, any>, 
    recordNumber: string,
    ctx: TenantContext,
    tx?: Prisma.TransactionClient
  ) {
    const db = tx || prisma;
    const values = this.mapToEntityValues(payload, manifest);

    const record = await db.entityRecord.create({
      data: {
        entityId,
        companyId: ctx.companyId,
        branchId: ctx.branchId,
        recordNumber,
        status: "ACTIVE", // Or default from manifest/payload
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
        values: {
          create: values
        }
      },
      include: { values: true }
    });

    return this.flattenRecord(record, manifest);
  }

  async update(
    recordId: string, 
    manifest: RuntimeManifest, 
    payload: Record<string, any>, 
    ctx: Pick<TenantContext, 'userId'>,
    tx?: Prisma.TransactionClient
  ) {
    const db = tx || prisma;

    const fieldsToUpdate = manifest.fields.filter(f => payload[f.code] !== undefined);
    
    for (const field of fieldsToUpdate) {
      const val = payload[field.code];
      
      const updateData: any = {
        valueString: null,
        valueNumber: null,
        valueBoolean: null,
        valueDate: null,
        valueDateTime: null,
        valueJson: null,
        valueReferenceId: null,
      };

      if (val !== null) {
        switch (field.dataType) {
          case "STRING":
          case "TEXT": updateData.valueString = String(val); break;
          case "NUMBER":
          case "DECIMAL": updateData.valueNumber = Number(val); break;
          case "BOOLEAN": updateData.valueBoolean = Boolean(val); break;
          case "DATE": updateData.valueDate = new Date(val); break;
          case "DATETIME": updateData.valueDateTime = new Date(val); break;
          case "JSON": updateData.valueJson = val; break;
          case "REFERENCE": updateData.valueReferenceId = String(val); break;
          default: updateData.valueString = String(val);
        }
      }

      // Upsert the value
      const existingValue = await db.entityValue.findFirst({
        where: { recordId, fieldDefinitionId: field.id }
      });

      if (existingValue) {
        await db.entityValue.update({
          where: { id: existingValue.id },
          data: updateData
        });
      } else {
        await db.entityValue.create({
          data: {
            ...updateData,
            recordId,
            fieldDefinitionId: field.id
          }
        });
      }
    }

    const record = await db.entityRecord.update({
      where: { id: recordId },
      data: {
        updatedBy: ctx.userId,
        version: { increment: 1 }
      },
      include: { values: true }
    });

    return this.flattenRecord(record, manifest);
  }

  async delete(recordId: string, ctx: Pick<TenantContext, 'userId'>, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    // Soft delete
    return await db.entityRecord.update({
      where: { id: recordId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: ctx.userId,
      }
    });
  }
}

export const recordRepository = new RecordRepository();
