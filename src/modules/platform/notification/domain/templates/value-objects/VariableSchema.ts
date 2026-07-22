// VS09 EWP-001: VariableSchema value object
// Wraps the JSON Schema descriptor for a NotificationTemplate's variable contract.
//
// Invariants:
//   - Immutable after creation.
//   - Schema must be a non-null, non-array plain object.
//   - Two VariableSchema instances are equal iff their serialised forms are identical.

export class VariableSchema {
  private readonly _schema: Readonly<Record<string, unknown>>;

  private constructor(schema: Record<string, unknown>) {
    this._schema = Object.freeze({ ...schema });
  }

  // ─── Factory: Create (with validation) ────────────────────────────────────

  /**
   * Creates a VariableSchema from an untrusted input.
   * Throws if the schema is not a valid plain object.
   */
  static create(schema: Record<string, unknown>): VariableSchema {
    VariableSchema.assertValidSchema(schema);
    return new VariableSchema(schema);
  }

  // ─── Factory: Reconstitute (from persisted data) ───────────────────────────

  /**
   * Reconstitutes a VariableSchema from a persisted record.
   * Skips validation — assumes persisted data was already validated on write.
   */
  static reconstitute(schema: Record<string, unknown>): VariableSchema {
    return new VariableSchema(schema);
  }

  // ─── Accessors ────────────────────────────────────────────────────────────

  get value(): Readonly<Record<string, unknown>> {
    return this._schema;
  }

  // ─── Projection ───────────────────────────────────────────────────────────

  toPlain(): Record<string, unknown> {
    return { ...this._schema };
  }

  // ─── Equality ─────────────────────────────────────────────────────────────

  equals(other: VariableSchema): boolean {
    return JSON.stringify(this._schema) === JSON.stringify(other._schema);
  }

  // ─── Validation ───────────────────────────────────────────────────────────

  private static assertValidSchema(schema: unknown): void {
    if (schema === null || typeof schema !== 'object' || Array.isArray(schema)) {
      throw new TypeError(
        'VariableSchema: schema must be a non-null, non-array plain object'
      );
    }
  }
}
