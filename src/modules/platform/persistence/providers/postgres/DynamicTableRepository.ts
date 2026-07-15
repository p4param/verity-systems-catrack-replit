/**
 * CM-003 Runtime Data Engine — Dynamic Table Repository
 *
 * Implements IRuntimeRepository for entities that have been published through
 * the CM-002 Database Platform Engine (storageMode = "PHYSICAL").
 *
 * All operations execute against the dynamically-created physical PostgreSQL
 * tables (e.g., hr_department, laundry_vehicle, reference_status).
 *
 * This repository has zero knowledge of any specific entity, module, or
 * business domain. It only understands:
 *   RuntimeManifest.persistence.model → PersistenceModel → PersistenceTable → ColumnSpec
 *
 * Standards: ES-006, ES-007
 */
import type { RuntimeManifest } from "@/modules/platform/runtime/services/manifest-generator";
import type { IRuntimeRepository } from "../../types/IRuntimeRepository";
import type { PersistenceExecutionContext } from "../../types/PersistenceExecutionContext";
import type { PlatformQuery } from "../../types/PlatformQuery";
import type { RuntimeRecord } from "../../types/RuntimeRecord";
import type { PersistenceTable, PersistencePolicy, ColumnSpec } from "../../types/PersistenceModel";
import { ConcurrencyConflictError, RecordNotFoundError, BulkOperationError } from "../../types/PersistenceExecutionContext";
import { SqlBuilder } from "../../sql/SqlBuilder";
import type { ISqlDialect } from "../../sql/ISqlDialect";
import type { IStorageAdapter } from "../../storage/IStorageAdapter";
import { logger } from "@/lib/logger";

export class DynamicTableRepository implements IRuntimeRepository {
  constructor(
    private readonly dialect: ISqlDialect,
    private readonly adapter: IStorageAdapter
  ) {}

  // ─── Private helpers ─────────────────────────────────────────────────────

  private getPrimaryTable(manifest: RuntimeManifest): PersistenceTable {
    const model = manifest.persistence?.model;
    if (!model || !model.tables || model.tables.length === 0) {
      throw new Error(
        `[DynamicTableRepository] No PersistenceModel found in manifest for entity "${manifest.entity}". ` +
        `Ensure the entity has been published with storageMode=PHYSICAL.`
      );
    }
    return model.tables.find(t => t.isPrimary) ?? model.tables[0];
  }

  private getPolicy(manifest: RuntimeManifest): PersistencePolicy {
    return manifest.persistence!.model.policy;
  }
  private withTenantFilter(q: PlatformQuery, tenantId: string): PlatformQuery {
    return { ...q, where: [...(q.where ?? []), { field: "tenant_id", operator: "eq", value: tenantId }] };
  }

  private scopeMutation(cmd: { sql: string; params: any[] }, table: PersistenceTable, tenantId: string) {
    const tenantColumn = table.columns.find((column) => column.name === "tenant_id");
    if (!tenantColumn) return cmd;
    const parameter = this.dialect.param(cmd.params.length + 1);
    return {
      sql: cmd.sql.replace(/ RETURNING \*$/, ` AND ${this.dialect.identifier(tenantColumn.name)} = ${parameter} RETURNING *`),
      params: [...cmd.params, tenantId],
    };
  }

  /**
   * Builds the column value map for INSERT/UPDATE operations.
   * Maps logical field codes from payload → physical column names from PersistenceModel.
   * User values become positional parameters via SqlBuilder — never concatenated.
   */
  private buildValueMap(
    manifest: RuntimeManifest,
    payload: Record<string, any>,
    table: PersistenceTable
  ): Map<string, any> {
    const valueMap = new Map<string, any>();

    // Build a lookup from field CODE → ColumnSpec name
    // manifest.fields are the LogicalField definitions; each has a `code` and maps to a column
    const fieldCodeToColumn = new Map<string, ColumnSpec>();
    for (const col of table.columns) {
      if (!col.isSystem) {
        fieldCodeToColumn.set(col.name.toUpperCase(), col);
      }
    }

    for (const [fieldCode, value] of Object.entries(payload)) {
      if (value === undefined) continue;
      const col = fieldCodeToColumn.get(fieldCode.toUpperCase());
      if (col) {
        valueMap.set(col.name, value === null ? null : value);
      }
    }

    return valueMap;
  }

  /** Converts a raw DB row into a RuntimeRecord shape. */
  private mapToRuntimeRecord(
    row: Record<string, any>,
    manifest: RuntimeManifest
  ): RuntimeRecord {
    // Map column names back to field codes (upper-cased column names = field codes)
    const record: any = {};
    for (const [colName, colValue] of Object.entries(row)) {
      record[colName.toUpperCase()] = colValue;
    }

    // Normalize system fields to their canonical runtime property names
    record.id = row.id;
    record.recordNumber = row.record_number ?? row.recordNumber ?? "";
    record.status = row.status ?? "ACTIVE";
    record.version = row.row_version ?? row.version ?? 1;
    record.createdAt = row.created_at ?? row.createdAt;
    record.createdBy = row.created_by ?? row.createdBy;
    record.updatedAt = row.updated_at ?? row.updatedAt;
    record.updatedBy = row.updated_by ?? row.updatedBy;

    record.__runtime = {
      manifestVersion: manifest._artifact?.version ?? 1,
      engineVersion: "1.0.0",
      provider: "POSTGRES",
      storageMode: "PHYSICAL",
    };

    return record as RuntimeRecord;
  }

  // ─── Create ────────────────────────────────────────────────────────────────

  async create(
    manifest: RuntimeManifest,
    payload: Record<string, any>,
    ctx: PersistenceExecutionContext
  ): Promise<RuntimeRecord> {
    const table = this.getPrimaryTable(manifest);
    const policy = this.getPolicy(manifest);

    // Build user field values
    const valueMap = this.buildValueMap(manifest, payload, table);

    // Inject system columns
    const id = this.dialect.newId();
    valueMap.set("id", id);
    valueMap.set("tenant_id", ctx.tenantId);
    valueMap.set("record_number", payload.__recordNumber ?? null);
    valueMap.set("status", payload.__status ?? "ACTIVE");
    valueMap.set("created_by", ctx.userId);
    valueMap.set("updated_by", ctx.userId);
    valueMap.set("is_deleted", false);

    if (policy.concurrency.strategy !== "NONE") {
      valueMap.set(policy.concurrency.field, 1);
    }

    const cmd = SqlBuilder.buildInsert(table, valueMap, this.dialect);
    const rows = await this.adapter.mutate<Record<string, any>>(cmd);

    if (!rows || rows.length === 0) {
      throw new Error(`[DynamicTableRepository] INSERT returned no rows for entity "${manifest.entity}"`);
    }

    logger.info(`[DynamicTableRepository] Created record ${id} in ${table.name}`);
    return this.mapToRuntimeRecord(rows[0], manifest);
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  async update(
    manifest: RuntimeManifest,
    id: string,
    payload: Record<string, any>,
    expectedVersion: number,
    ctx: PersistenceExecutionContext
  ): Promise<RuntimeRecord> {
    const table = this.getPrimaryTable(manifest);
    const policy = this.getPolicy(manifest);

    const valueMap = this.buildValueMap(manifest, payload, table);
    valueMap.set("updated_by", ctx.userId);

    const baseCmd = SqlBuilder.buildUpdate(table, id, expectedVersion, valueMap, policy, this.dialect);
    const cmd = this.scopeMutation(baseCmd, table, ctx.tenantId);
    const rows = await this.adapter.mutate<Record<string, any>>(cmd);

    if (!rows || rows.length === 0) {
      // 0 rows affected = concurrency conflict (if strategy is ROW_VERSION) or missing record
      if (policy.concurrency.strategy !== "NONE") {
        throw new ConcurrencyConflictError(manifest.entityId, id, expectedVersion);
      }
      throw new RecordNotFoundError(id);
    }

    logger.info(`[DynamicTableRepository] Updated record ${id} in ${table.name}`);
    return this.mapToRuntimeRecord(rows[0], manifest);
  }

  // ─── Delete (soft) ────────────────────────────────────────────────────────

  async delete(
    manifest: RuntimeManifest,
    id: string,
    ctx: PersistenceExecutionContext
  ): Promise<void> {
    const table = this.getPrimaryTable(manifest);
    const policy = this.getPolicy(manifest);

    if (!policy.softDelete.enabled) {
      // Hard delete
      const pkCol = table.columns.find(c => c.isPrimaryKey)?.name ?? "id";
      const tableRef = this.dialect.tableRef(table.schema, table.name);
      const cmd = {
        sql: `DELETE FROM ${tableRef} WHERE ${this.dialect.identifier(pkCol)} = $1`,
        params: [id],
      };
      await this.adapter.execute(cmd);
    } else {
      const baseCmd = SqlBuilder.buildSoftDelete(table, id, ctx.userId, policy, this.dialect);
      await this.adapter.mutate(this.scopeMutation(baseCmd, table, ctx.tenantId));
    }

    logger.info(`[DynamicTableRepository] Deleted record ${id} from ${table.name}`);
  }

  // ─── Restore ──────────────────────────────────────────────────────────────

  async restore(
    manifest: RuntimeManifest,
    id: string,
    ctx: PersistenceExecutionContext
  ): Promise<void> {
    const table = this.getPrimaryTable(manifest);
    const policy = this.getPolicy(manifest);

    const baseCmd = SqlBuilder.buildRestore(table, id, policy, this.dialect);
    await this.adapter.mutate(this.scopeMutation(baseCmd, table, ctx.tenantId));
    logger.info(`[DynamicTableRepository] Restored record ${id} in ${table.name}`);
  }

  // ─── Get By ID ────────────────────────────────────────────────────────────

  async getById(
    manifest: RuntimeManifest,
    id: string,
    options: { includeDeleted?: boolean } | undefined,
    ctx: PersistenceExecutionContext
  ): Promise<RuntimeRecord | null> {
    const table = this.getPrimaryTable(manifest);
    const policy = this.getPolicy(manifest);

    const cmd = SqlBuilder.buildSelect(table, this.withTenantFilter({ where: [{ field: "id", operator: "eq", value: id }], includeDeleted: options?.includeDeleted }, ctx.tenantId), policy, this.dialect);
    const rows = await this.adapter.query<Record<string, any>>(cmd);

    if (!rows || rows.length === 0) return null;
    return this.mapToRuntimeRecord(rows[0], manifest);
  }

  // ─── Query ────────────────────────────────────────────────────────────────

  async query(
    manifest: RuntimeManifest,
    q: PlatformQuery,
    ctx: PersistenceExecutionContext
  ): Promise<RuntimeRecord[]> {
    const table = this.getPrimaryTable(manifest);
    const policy = this.getPolicy(manifest);

    const cmd = SqlBuilder.buildSelect(table, this.withTenantFilter(q, ctx.tenantId), policy, this.dialect);
    const rows = await this.adapter.query<Record<string, any>>(cmd);

    return rows.map(row => this.mapToRuntimeRecord(row, manifest));
  }

  // ─── Count ────────────────────────────────────────────────────────────────

  async count(
    manifest: RuntimeManifest,
    q: Pick<PlatformQuery, "where" | "includeDeleted">,
    ctx: PersistenceExecutionContext
  ): Promise<number> {
    const table = this.getPrimaryTable(manifest);
    const policy = this.getPolicy(manifest);

    const cmd = SqlBuilder.buildCount(table, this.withTenantFilter(q, ctx.tenantId), policy, this.dialect);
    const rows = await this.adapter.query<{ count: number }>(cmd);
    return rows[0]?.count ?? 0;
  }

  // ─── Exists ───────────────────────────────────────────────────────────────

  async exists(manifest: RuntimeManifest, id: string, ctx: PersistenceExecutionContext): Promise<boolean> {
    const table = this.getPrimaryTable(manifest);
    const cmd = SqlBuilder.buildSelect(table, this.withTenantFilter({ select: ["id"], where: [{ field: "id", operator: "eq", value: id }], take: 1 }, ctx.tenantId), this.getPolicy(manifest), this.dialect);
    const rows = await this.adapter.query<Record<string, any>>(cmd);
    return rows.length > 0;
  }

  // ─── Bulk Insert ──────────────────────────────────────────────────────────

  async bulkInsert(
    manifest: RuntimeManifest,
    records: Record<string, any>[],
    ctx: PersistenceExecutionContext
  ): Promise<number> {
    if (records.length === 0) return 0;
    const table = this.getPrimaryTable(manifest);
    const policy = this.getPolicy(manifest);

    const rows: Map<string, any>[] = records.map(payload => {
      const valueMap = this.buildValueMap(manifest, payload, table);
      valueMap.set("id", this.dialect.newId());
      valueMap.set("tenant_id", ctx.tenantId);
    valueMap.set("record_number", payload.__recordNumber ?? null);
    valueMap.set("status", payload.__status ?? "ACTIVE");
      valueMap.set("created_by", ctx.userId);
      valueMap.set("updated_by", ctx.userId);
      valueMap.set("is_deleted", false);
      if (policy.concurrency.strategy !== "NONE") {
        valueMap.set(policy.concurrency.field, 1);
      }
      return valueMap;
    });

    const cmd = SqlBuilder.buildBulkInsert(table, rows, this.dialect);
    const inserted = await this.adapter.query<{ id: string }>(cmd);
    logger.info(`[DynamicTableRepository] Bulk inserted ${inserted.length} records into ${table.name}`);
    return inserted.length;
  }

  // ─── Bulk Update ──────────────────────────────────────────────────────────

  async bulkUpdate(
    manifest: RuntimeManifest,
    updates: Array<{ id: string; payload: Record<string, any>; expectedVersion: number }>,
    ctx: PersistenceExecutionContext
  ): Promise<number> {
    let successCount = 0;
    const failures: Array<{ index: number; id: string; reason: string }> = [];

    for (let i = 0; i < updates.length; i++) {
      const { id, payload, expectedVersion } = updates[i];
      try {
        await this.update(manifest, id, payload, expectedVersion, ctx);
        successCount++;
      } catch (e: any) {
        failures.push({ index: i, id, reason: e.message });
      }
    }

    if (failures.length > 0) {
      throw new BulkOperationError(failures);
    }
    return successCount;
  }

  // ─── Lookup Resolution ────────────────────────────────────────────────────

  async resolveLookupOptions(
    manifest: RuntimeManifest,
    displayColumn: string,
    searchQuery: string | undefined,
    take: number | undefined,
    ctx: PersistenceExecutionContext
  ): Promise<Array<{ id: string; label: string }>> {
    const table = this.getPrimaryTable(manifest);
    const policy = this.getPolicy(manifest);

    const q: PlatformQuery = {
      select: ["id", displayColumn],
      take: take ?? 100,
      includeDeleted: false,
    };

    if (searchQuery) {
      q.where = [{ field: displayColumn, operator: "ilike", value: `%${searchQuery}%` }];
    }

    const cmd = SqlBuilder.buildSelect(table, this.withTenantFilter(q, ctx.tenantId), policy, this.dialect);
    const rows = await this.adapter.query<Record<string, any>>(cmd);

    return rows.map(row => ({
      id: String(row.id ?? ""),
      label: String(row[displayColumn] ?? row[displayColumn.toLowerCase()] ?? row.id ?? ""),
    }));
  }
}



