// VS08A: PlatformApplicationPackage domain errors
// Each error carries structured payload properties for programmatic inspection.

// ─── Not Found ────────────────────────────────────────────────────────────────

export class PackageNotFoundError extends Error {
  readonly identifier: string;

  constructor(identifier: string) {
    super(`PlatformApplicationPackage not found: ${identifier}`);
    this.name = "PackageNotFoundError";
    this.identifier = identifier;
  }
}

// ─── Uniqueness ───────────────────────────────────────────────────────────────

export class DuplicatePackageVersionError extends Error {
  readonly applicationId: string;
  readonly packageVersion: string;

  constructor(applicationId: string, packageVersion: string) {
    super(
      `Package version '${packageVersion}' already exists for application '${applicationId}'`
    );
    this.name = "DuplicatePackageVersionError";
    this.applicationId = applicationId;
    this.packageVersion = packageVersion;
  }
}

// ─── Application Existence ───────────────────────────────────────────────────

export class PackageApplicationNotFoundError extends Error {
  readonly applicationId: string;

  constructor(applicationId: string) {
    super(
      `PlatformApplication '${applicationId}' does not exist — cannot create package`
    );
    this.name = "PackageApplicationNotFoundError";
    this.applicationId = applicationId;
  }
}

// ─── Immutability ─────────────────────────────────────────────────────────────

/**
 * Thrown when a mutation is attempted on a package that is no longer in Draft
 * status. Per ES-009 §6 and CC-002, published packages are immutable.
 */
export class PublishedPackageImmutableError extends Error {
  readonly packageId: string;

  constructor(packageId: string) {
    super(
      `PlatformApplicationPackage '${packageId}' is immutable (status is not Draft)`
    );
    this.name = "PublishedPackageImmutableError";
    this.packageId = packageId;
  }
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

export class InvalidPackageLifecycleTransitionError extends Error {
  readonly from: string;
  readonly to: string;

  constructor(from: string, to: string) {
    super(
      `Invalid lifecycle transition for PlatformApplicationPackage: ${from} → ${to}`
    );
    this.name = "InvalidPackageLifecycleTransitionError";
    this.from = from;
    this.to = to;
  }
}

// ─── Concurrency ──────────────────────────────────────────────────────────────

export class PackageConcurrencyError extends Error {
  readonly packageId: string;

  constructor(packageId: string) {
    super(
      `Concurrency conflict for PlatformApplicationPackage '${packageId}': version mismatch`
    );
    this.name = "PackageConcurrencyError";
    this.packageId = packageId;
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

export class PackageValidationError extends Error {
  readonly fields: Record<string, string>;

  constructor(fields: Record<string, string>) {
    const detail = Object.entries(fields)
      .map(([k, v]) => `${k}: ${v}`)
      .join("; ");
    super(`PlatformApplicationPackage validation failed — ${detail}`);
    this.name = "PackageValidationError";
    this.fields = { ...fields };
  }
}
