export const RuntimeEvents = {
  RecordCreating: "RecordCreating",
  RecordCreated: "RecordCreated",
  RecordUpdating: "RecordUpdating",
  RecordUpdated: "RecordUpdated",
  RecordDeleting: "RecordDeleting",
  RecordDeleted: "RecordDeleted",
  RecordRestoring: "RecordRestoring",
  RecordRestored: "RecordRestored",
  OperationStarted: "OperationStarted",
  OperationCompleted: "OperationCompleted",
  OperationFailed: "OperationFailed",
} as const;

export type RuntimeEventType = (typeof RuntimeEvents)[keyof typeof RuntimeEvents];

export interface RuntimeEvent {
  type: RuntimeEventType;
  correlationId: string;
  operation: string;
  recordId?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  error?: string;
}
