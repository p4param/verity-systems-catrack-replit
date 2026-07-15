/**
 * CM-003 Runtime Data Engine — Storage Adapter Interface
 *
 * Sits between the Repository and the physical database.
 * Implementations: PrismaStorageAdapter (VS05H)
 * Future: ElasticsearchAdapter, CosmosAdapter, BlobStorageAdapter
 *
 * This layer insulates repositories from Prisma specifics.
 * If Prisma is ever replaced, only PrismaStorageAdapter changes.
 *
 * Architecture:
 *   Repository → IStorageAdapter → Database
 *
 * Standards: ES-006, ES-007
 */
import type { SqlCommand } from "../sql/SqlBuilder";

export interface IStorageAdapter {
  /**
   * Executes a SELECT query and returns typed rows.
   * Used for: SELECT, COUNT, EXISTS queries.
   *
   * Uses parameterized SQL ($1, $2, ...) — table/column names are
   * trusted manifest identifiers embedded in the sql string.
   */
  query<T = Record<string, any>>(cmd: SqlCommand): Promise<T[]>;

  /**
   * Executes a DML statement and returns affected row count.
   * Used for: UPDATE, DELETE (hard delete).
   */
  execute(cmd: SqlCommand): Promise<number>;

  /**
   * Executes a DML statement with RETURNING * clause and returns the affected rows.
   * Used for: INSERT RETURNING *, UPDATE RETURNING *.
   */
  mutate<T = Record<string, any>>(cmd: SqlCommand): Promise<T[]>;

  /**
   * Executes a function inside a database transaction.
   * Returns the function's result on commit; rolls back on error.
   */
  withTransaction<T>(fn: (adapter: IStorageAdapter) => Promise<T>): Promise<T>;

  /**
   * Verifies the underlying database connection is healthy.
   */
  ping(): Promise<boolean>;
}
