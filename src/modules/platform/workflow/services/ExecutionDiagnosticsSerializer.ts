import type {
  IExecutionDiagnostics,
  IExecutionDiagnosticsSerializer,
} from "../contracts/IExecutionDiagnostics";

function stableJson(value: unknown): string {
  if (value == null) {
    return "null";
  }

  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return JSON.stringify(value);
  }

  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }

  const objectValue = value as Record<string, unknown>;
  const keys = Object.keys(objectValue).sort((left, right) => left.localeCompare(right));
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableJson(objectValue[key])}`).join(",")}}`;
}

function reviveDates(value: unknown): unknown {
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed) && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      return new Date(value);
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => reviveDates(item));
  }

  if (value && typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    const revived: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(objectValue)) {
      revived[key] = reviveDates(child);
    }
    return revived;
  }

  return value;
}

export class ExecutionDiagnosticsSerializer implements IExecutionDiagnosticsSerializer {
  serialize(snapshot: IExecutionDiagnostics): string {
    return stableJson(snapshot);
  }

  deserialize(serialized: string): IExecutionDiagnostics {
    const parsed = JSON.parse(serialized) as unknown;
    return reviveDates(parsed) as IExecutionDiagnostics;
  }
}
