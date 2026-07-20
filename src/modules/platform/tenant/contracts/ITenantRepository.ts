// VS08A: ITenantRepository contract

import type {
  TenantRecord,
  ListTenantsQuery,
} from "../models/TenantModels";

export interface TenantMetadataUpdate {
  displayName?: string;
  description?: string | null;
  logoUrl?: string | null;
  defaultTimeZone?: string;
  defaultCulture?: string;
  defaultCurrency?: string;
}

export interface ITenantRepository {
  // ─── Writes ───────────────────────────────────────────────────────────────

  create(record: TenantRecord): Promise<void>;

  activate(
    id: string,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void>;

  suspend(
    id: string,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void>;

  archive(
    id: string,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void>;

  updateMetadata(
    id: string,
    data: TenantMetadataUpdate,
    actorUserId: string,
    expectedVersion: bigint
  ): Promise<void>;

  // ─── Reads ────────────────────────────────────────────────────────────────

  getById(id: string): Promise<TenantRecord | null>;

  getByCode(code: string): Promise<TenantRecord | null>;

  list(query: ListTenantsQuery): Promise<TenantRecord[]>;

  existsCode(code: string): Promise<boolean>;

  existsName(name: string): Promise<boolean>;
}
