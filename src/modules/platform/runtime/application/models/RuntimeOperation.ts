export const RUNTIME_OPERATIONS = [
  "Create",
  "Load",
  "Save",
  "Delete",
  "Restore",
  "Duplicate",
  "Archive",
  "Submit",
  "Approve",
  "Reject",
  "Cancel",
  "Close",
  "Print",
  "Export",
  "Import",
] as const;

export type RuntimeOperation = (typeof RUNTIME_OPERATIONS)[number];

export function isRuntimeOperation(value: string): value is RuntimeOperation {
  return (RUNTIME_OPERATIONS as readonly string[]).includes(value);
}
