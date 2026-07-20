// VS08A: PlatformApplication domain models
// Engine: VS08 License, Subscription & Tenant Management Engine
// Milestone: VS08A Tenant Foundation

// ─── Lifecycle ───────────────────────────────────────────────────────────────

export const PLATFORM_APPLICATION_STATUS = {
  Draft: "Draft",
  Published: "Published",
  Deprecated: "Deprecated",
  Retired: "Retired",
} as const;

export type PlatformApplicationStatus =
  (typeof PLATFORM_APPLICATION_STATUS)[keyof typeof PLATFORM_APPLICATION_STATUS];

// ─── Core Record ─────────────────────────────────────────────────────────────

/**
 * The persistence-level representation of the PlatformApplication aggregate.
 * This type aligns 1:1 with the platform_applications table columns.
 * It contains no tenant, workspace, licensing, or installation references.
 */
export interface PlatformApplicationRecord {
  id: string;
  code: string;
  name: string;
  displayName: string;
  description: string | null;
  category: string;
  iconUrl: string | null;
  websiteUrl: string | null;
  status: PlatformApplicationStatus;
  // ES-001 audit
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  // ES-001 optimistic concurrency
  version: bigint;
}

// ─── Commands ────────────────────────────────────────────────────────────────

export interface RegisterPlatformApplicationCommand {
  code: string;
  name: string;
  displayName: string;
  description?: string | null;
  category: string;
  iconUrl?: string | null;
  websiteUrl?: string | null;
  actorUserId: string;
}

export interface UpdatePlatformApplicationMetadataCommand {
  id: string;
  displayName?: string;
  description?: string | null;
  category?: string;
  iconUrl?: string | null;
  websiteUrl?: string | null;
  actorUserId: string;
  expectedVersion: bigint;
}

export interface RetirePlatformApplicationCommand {
  id: string;
  actorUserId: string;
  expectedVersion: bigint;
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export interface ListPlatformApplicationsQuery {
  status?: PlatformApplicationStatus;
  category?: string;
  includeDeleted?: boolean;
}

export interface SearchPlatformApplicationsQuery {
  query: string;
  status?: PlatformApplicationStatus;
  category?: string;
}

// ─── Metadata Update Payload (repository-level) ──────────────────────────────

/**
 * Complete set of mutable metadata fields passed to the repository.
 * The service layer is responsible for merging current and new values
 * before calling the repository, ensuring all fields are always provided.
 */
export interface PlatformApplicationMetadataUpdate {
  displayName: string;
  description: string | null;
  category: string;
  iconUrl: string | null;
  websiteUrl: string | null;
}
