/**
 * CM-003 Runtime Data Engine — EAV Repository (Legacy)
 *
 * Implements IRuntimeRepository using the Entity-Attribute-Value storage model.
 * Used for entities whose storageMode = "EAV" in their RuntimeManifest.
 *
 * This repository provides backward compatibility for:
 * - Entities published before CM-002 schema evolution
 * - Platform metadata entities that intentionally use EAV
 * - Migration tooling
 *
 * All new entities published after VS05H will use DynamicTableRepository.
 * This repository is preserved unchanged in behaviour from the legacy RecordRepository.
 *
 * Standards: ES-006
 */
import { prisma } from "@/lib/prisma";
import type { RuntimeManifest } from "@/modules/platform/runtime/services/manifest-generator";
import type { IRuntimeRepository } from "../../types/IRuntimeRepository";
import type { PersistenceExecutionContext } from "../../types/PersistenceExecutionContext";
import type { PlatformQuery } from "../../types/PlatformQuery";
import type { RuntimeRecord } from "../../types/RuntimeRecord";
import { RecordNotFoundError } from "../../types/PersistenceExecutionContext";
import { logger } from "@/lib/logger";

export class EavRepository implements IRuntimeRepository {

  // ─── Private helpers ─────────────────────────────────────────────────────

  private getDb(ctx: PersistenceExecutionContext) {
    return ctx.transaction ?? prisma;
  }

  private flattenRecord(record: any, manifest: RuntimeManifest): RuntimeRecord {
    const flat: any = {
      id: record.id,
      recordNumber: record.recordNumber,
      status: record.status ?? "ACTIVE",
      version: record.version ?? 1,
      createdAt: record.createdAt,
      createdBy: record.createdBy,
      updatedAt: record.updatedAt,
      updatedBy: record.updatedBy,
    };

    const fieldMap = new Map(manifest.fields.map((f: any) => [f.id, f]));

    for (const val of record.values ?? []) {
      const fieldDef: any = fieldMap.get(val.fieldDefinitionId);
      if (!fieldDef) continue;

      let actualValue: any = null;
      if (val.valueString !== null && val.valueString !== undefined) actualValue = val.valueString;
      else if (val.valueNumber !== null && val.valueNumber !== undefined) actualValue = val.valueNumber;
      else if (val.valueBoolean !== null && val.valueBoolean !== undefined) actualValue = val.valueBoolean;
      else if (val.valueDate !== null && val.valueDate !== undefined) actualValue = val.valueDate;
      else if (val.valueDateTime !== null && val.valueDateTime !== undefined) actualValue = val.valueDateTime;
      else if (val.valueJson !== null && val.valueJson !== undefined) actualValue = val.valueJson;
      else if (val.valueReferenceId !== null && val.valueReferenceId !== undefined) actualValue = val.valueReferenceId;

      flat[fieldDef.code] = actualValue;
    }

    flat.__runtime = {
      manifestVersion: manifest._artifact?.version ?? 1,
      engineVersion: "1.0.0",
      provider: "POSTGRES",
      storageMode: "EAV",
    };

    return flat as RuntimeRecord;
  }

  private mapToEntityValues(payload: Record<string, any>, manifest: RuntimeManifest) {
    const values: any[] = [];
    for (const field of manifest.fields as any[]) {
      const val = payload[field.code];
      if (val === undefined || val === null) continue;

      const entityValue: any = {
        fieldDefinition: { connect: { id: field.id } },
      };

      switch (field.dataType) {
        case "STRING": case "TEXT": entityValue.valueString = String(val); break;
        case "NUMBER": case "DECIMAL": entityValue.valueNumber = Number(val); break;
        case "BOOLEAN": entityValue.valueBoolean = Boolean(val); break;
        case "DATE": entityValue.valueDate = new Date(val); break;
        case "DATETIME": entityValue.valueDateTime = new Date(val); break;
        case "JSON": entityValue.valueJson = val; break;
        case "REFERENCE": entityValue.valueReferenceId = String(val); break;
        default: entityValue.valueString = String(val);
      }
      values.push(entityValue);
    }
    return values;
  }

  // ─── Create ────────────────────────────────────────────────────────────────

  async create(
    manifest: RuntimeManifest,
    payload: Record<string, any>,
    ctx: PersistenceExecutionContext
  ): Promise<RuntimeRecord> {
    const db = this.getDb(ctx);
    const values = this.mapToEntityValues(payload, manifest);

    // Record number is provided by the NumberSeriesEngine before create is called
    const recordNumber = payload.__recordNumber ?? "REC-000000";

    const record = await db.entityRecord.create({
      data: {
        entityId: manifest.entityId,
        // Legacy EAV fields — use system defaults. CompanyId/branchId are EAV artifacts.
        // These will be superseded when entities migrate to PHYSICAL storage mode.
        companyId: "00000000-0000-0000-0000-000000000001",
        branchId: "00000000-0000-0000-0000-000000000001",
        recordNumber,
        status: "ACTIVE",
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
        values: { create: values },
      },
      include: { values: true },
    });

    logger.info(`[EavRepository] Created EAV record ${record.id} for ${manifest.entity}`);
    return this.flattenRecord(record, manifest);
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  async update(
    manifest: RuntimeManifest,
    id: string,
    payload: Record<string, any>,
    expectedVersion: number,
    ctx: PersistenceExecutionContext
  ): Promise<RuntimeRecord> {
    const db = this.getDb(ctx);

    for (const field of manifest.fields as any[]) {
      const val = payload[field.code];
      if (val === undefined) continue;

      const updateData: any = {
        valueString: null, valueNumber: null, valueBoolean: null,
        valueDate: null, valueDateTime: null, valueJson: null, valueReferenceId: null,
      };

      if (val !== null) {
        switch (field.dataType) {
          case "STRING": case "TEXT": updateData.valueString = String(val); break;
          case "NUMBER": case "DECIMAL": updateData.valueNumber = Number(val); break;
          case "BOOLEAN": updateData.valueBoolean = Boolean(val); break;
          case "DATE": updateData.valueDate = new Date(val); break;
          case "DATETIME": updateData.valueDateTime = new Date(val); break;
          case "JSON": updateData.valueJson = val; break;
          case "REFERENCE": updateData.valueReferenceId = String(val); break;
          default: updateData.valueString = String(val);
        }
      }

      const existing = await db.entityValue.findFirst({
        where: { recordId: id, fieldDefinitionId: field.id },
      });

      if (existing) {
        await db.entityValue.update({ where: { id: existing.id }, data: updateData });
      } else {
        await db.entityValue.create({ data: { ...updateData, recordId: id, fieldDefinitionId: field.id } });
      }
    }

    const record = await db.entityRecord.update({
      where: { id },
      data: { updatedBy: ctx.userId, version: { increment: 1 } },
      include: { values: true },
    });

    logger.info(`[EavRepository] Updated EAV record ${id} for ${manifest.entity}`);
    return this.flattenRecord(record, manifest);
  }

  // ─── Delete (soft) ────────────────────────────────────────────────────────

  async delete(
    manifest: RuntimeManifest,
    id: string,
    ctx: PersistenceExecutionContext
  ): Promise<void> {
    const db = this.getDb(ctx);
    await db.entityRecord.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), deletedBy: ctx.userId },
    });
    logger.info(`[EavRepository] Soft-deleted EAV record ${id} for ${manifest.entity}`);
  }

  // ─── Restore ──────────────────────────────────────────────────────────────

  async restore(
    manifest: RuntimeManifest,
    id: string,
    ctx: PersistenceExecutionContext
  ): Promise<void> {
    const db = this.getDb(ctx);
    await db.entityRecord.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null, deletedBy: null },
    });
  }

  // ─── Get By ID ────────────────────────────────────────────────────────────

  async getById(
    manifest: RuntimeManifest,
    id: string,
    options?: { includeDeleted?: boolean }
  ): Promise<RuntimeRecord | null> {
    const record = await prisma.entityRecord.findUnique({
      where: { id },
      include: { values: true },
    });
    if (!record || (!options?.includeDeleted && record.isDeleted)) return null;
    return this.flattenRecord(record, manifest);
  }

  // ─── Query ────────────────────────────────────────────────────────────────

  async query(manifest: RuntimeManifest, q: PlatformQuery): Promise<RuntimeRecord[]> {
    const records = await prisma.entityRecord.findMany({
      where: {
        entityId: manifest.entityId,
        isDeleted: q.includeDeleted ? undefined : false,
      },
      include: { values: true },
      skip: q.skip,
      take: q.take,
      orderBy: q.orderBy?.length
        ? undefined // EAV ordering is limited; future improvement
        : { createdAt: "desc" },
    });
    return records.map(r => this.flattenRecord(r, manifest));
  }

  // ─── Count ────────────────────────────────────────────────────────────────

  async count(
    manifest: RuntimeManifest,
    q: Pick<PlatformQuery, "where" | "includeDeleted">
  ): Promise<number> {
    return prisma.entityRecord.count({
      where: {
        entityId: manifest.entityId,
        isDeleted: q.includeDeleted ? undefined : false,
      },
    });
  }

  // ─── Exists ───────────────────────────────────────────────────────────────

  async exists(manifest: RuntimeManifest, id: string): Promise<boolean> {
    const count = await prisma.entityRecord.count({ where: { id, isDeleted: false } });
    return count > 0;
  }

  // ─── Bulk Insert ──────────────────────────────────────────────────────────

  async bulkInsert(
    manifest: RuntimeManifest,
    records: Record<string, any>[],
    ctx: PersistenceExecutionContext
  ): Promise<number> {
    let count = 0;
    for (const payload of records) {
      await this.create(manifest, payload, ctx);
      count++;
    }
    return count;
  }

  // ─── Bulk Update ──────────────────────────────────────────────────────────

  async bulkUpdate(
    manifest: RuntimeManifest,
    updates: Array<{ id: string; payload: Record<string, any>; expectedVersion: number }>,
    ctx: PersistenceExecutionContext
  ): Promise<number> {
    let count = 0;
    for (const { id, payload, expectedVersion } of updates) {
      await this.update(manifest, id, payload, expectedVersion, ctx);
      count++;
    }
    return count;
  }

  // ─── Lookup Resolution ────────────────────────────────────────────────────

  async resolveLookupOptions(
    manifest: RuntimeManifest,
    displayColumn: string,
    searchQuery?: string,
    take?: number
  ): Promise<Array<{ id: string; label: string }>> {
    const records = await this.query(manifest, {
      skip: 0,
      take: take ?? 100,
      includeDeleted: false,
    });

    let results = records.map(r => ({
      id: r.id,
      label: String(r[displayColumn] ?? r.id ?? ""),
    }));

    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      results = results.filter(r => r.label.toLowerCase().includes(lower));
    }

    return results;
  }
}
