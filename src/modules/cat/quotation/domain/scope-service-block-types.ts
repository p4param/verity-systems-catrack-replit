// QM-WP02B-01 — Scope of Services Workspace.
// ScopeServiceBlock is a dedicated business entity: a repeatable, reorderable
// list of service blocks belonging to a single Quotation. This is not a
// generic proposal-section engine — it is specific to Scope of Services only.

export interface ScopeServiceBlock {
  id: string;
  quotationId: string;
  blockTitle: string;
  customerDescription: string;
  internalNotes?: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

// Shape sent to the Save Draft endpoint for a single block. Blocks without a
// pre-existing id (client-generated) are inserted; existing ids are updated.
// displayOrder is derived server-side from array position, not sent.
export interface ScopeServiceBlockInput {
  id: string;
  blockTitle: string;
  customerDescription: string;
  internalNotes?: string;
}
