/**
 * CM-003 Runtime Data Engine — Prisma Storage Adapter
 *
 * Implements IStorageAdapter using Prisma's $queryRawUnsafe / $executeRawUnsafe.
 *
 * $queryRawUnsafe is used (rather than $queryRaw tagged template) because
 * the SQL string contains dynamic identifiers (table/column names from the
 * published manifest). All user-supplied values are positional parameters
 * — never concatenated into the SQL string.
 *
 * Security note documented at every call site:
 *   sql string → TRUSTED MANIFEST IDENTIFIERS (from PersistenceModel)
 *   params     → USER VALUES (positional, never concatenated)
 *
 * Standards: ES-006, ES-007
 */
import { prisma } from "@/lib/prisma";
import type { IStorageAdapter } from "./IStorageAdapter";
import type { SqlCommand } from "../sql/SqlBuilder";
import { logger } from "@/lib/logger";

export class PrismaStorageAdapter implements IStorageAdapter {
  private db: any;

  constructor(db?: any) {
    // If a transaction client is provided (from withTransaction), use it.
    // Otherwise fall back to the global prisma singleton.
    this.db = db ?? prisma;
  }

  /**
   * Executes a SELECT query and returns typed rows.
   *
   * SECURITY: sql contains only trusted manifest identifiers.
   *           params contains all user values as positional arguments.
   */
  async query<T = Record<string, any>>(cmd: SqlCommand): Promise<T[]> {
    logger.debug("[PrismaStorageAdapter] query", { sql: cmd.sql, paramCount: cmd.params.length });
    const rows = await this.db.$queryRawUnsafe(cmd.sql, ...cmd.params);
    return rows as T[];
  }

  /**
   * Executes a DML statement (UPDATE, hard DELETE) and returns affected row count.
   */
  async execute(cmd: SqlCommand): Promise<number> {
    logger.debug("[PrismaStorageAdapter] execute", { sql: cmd.sql, paramCount: cmd.params.length });
    const affected = await this.db.$executeRawUnsafe(cmd.sql, ...cmd.params);
    return affected as number;
  }

  /**
   * Executes an INSERT/UPDATE with RETURNING * and returns the mutated rows.
   */
  async mutate<T = Record<string, any>>(cmd: SqlCommand): Promise<T[]> {
    logger.debug("[PrismaStorageAdapter] mutate", { sql: cmd.sql, paramCount: cmd.params.length });
    const rows = await this.db.$queryRawUnsafe(cmd.sql, ...cmd.params);
    return rows as T[];
  }

  /**
   * Executes a function inside a Prisma transaction.
   * Creates a new PrismaStorageAdapter wrapping the transaction client.
   */
  async withTransaction<T>(fn: (adapter: IStorageAdapter) => Promise<T>): Promise<T> {
    return prisma.$transaction(async (tx) => {
      const txAdapter = new PrismaStorageAdapter(tx);
      return fn(txAdapter);
    });
  }

  /**
   * Verifies database connectivity with a lightweight query.
   */
  async ping(): Promise<boolean> {
    try {
      await this.db.$queryRawUnsafe("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }
}

/** Default singleton adapter backed by the global Prisma client. */
export const prismaStorageAdapter = new PrismaStorageAdapter();
