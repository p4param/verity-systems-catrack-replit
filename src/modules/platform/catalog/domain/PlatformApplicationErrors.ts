// VS08A: PlatformApplication domain errors
// All error classes are named, typed, and carry structured codes for
// programmatic error handling by callers.

export class PlatformApplicationNotFoundError extends Error {
  readonly code = "PLATFORM_APPLICATION_NOT_FOUND" as const;

  constructor(identifier: string) {
    super(`PlatformApplication not found: ${identifier}`);
    this.name = "PlatformApplicationNotFoundError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class DuplicateApplicationCodeError extends Error {
  readonly code = "DUPLICATE_APPLICATION_CODE" as const;

  constructor(applicationCode: string) {
    super(
      `A platform application with code '${applicationCode}' already exists`
    );
    this.name = "DuplicateApplicationCodeError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class DuplicateApplicationNameError extends Error {
  readonly code = "DUPLICATE_APPLICATION_NAME" as const;

  constructor(name: string) {
    super(`A platform application with name '${name}' already exists`);
    this.name = "DuplicateApplicationNameError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidLifecycleTransitionError extends Error {
  readonly code = "INVALID_LIFECYCLE_TRANSITION" as const;
  readonly fromStatus: string;
  readonly toStatus: string;

  constructor(from: string, to: string) {
    super(
      `Invalid lifecycle transition for PlatformApplication: ${from} → ${to}`
    );
    this.name = "InvalidLifecycleTransitionError";
    this.fromStatus = from;
    this.toStatus = to;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class RetiredApplicationModificationError extends Error {
  readonly code = "RETIRED_APPLICATION_MODIFICATION" as const;

  constructor(id: string) {
    super(
      `PlatformApplication '${id}' has status Retired and cannot be modified. ` +
        `Only approved lifecycle operations are permitted on retired applications.`
    );
    this.name = "RetiredApplicationModificationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class PlatformApplicationConcurrencyError extends Error {
  readonly code = "PLATFORM_APPLICATION_CONCURRENCY_CONFLICT" as const;

  constructor(id: string) {
    super(
      `Concurrency conflict for PlatformApplication '${id}': ` +
        `the record was modified by another operation or the version does not match.`
    );
    this.name = "PlatformApplicationConcurrencyError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class PlatformApplicationValidationError extends Error {
  readonly code = "PLATFORM_APPLICATION_VALIDATION_ERROR" as const;
  readonly fields: Readonly<Record<string, string>>;

  constructor(fields: Record<string, string>) {
    const summary = Object.entries(fields)
      .map(([k, v]) => `${k}: ${v}`)
      .join("; ");
    super(`PlatformApplication validation failed — ${summary}`);
    this.name = "PlatformApplicationValidationError";
    this.fields = Object.freeze({ ...fields });
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
