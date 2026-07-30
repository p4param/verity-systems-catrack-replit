// QM-WP02B-03 — Proposal Highlights Workspace.
// ProposalHighlight is a dedicated business entity: a repeatable, reorderable
// list of highlight cards belonging to a single Quotation, following the
// Collection Authoring Pattern established by ScopeServiceBlock (QM-WP02B-01).
// This is not a generic proposal-section engine — it is specific to Proposal
// Highlights only.

export interface ProposalHighlight {
  id: string;
  quotationId: string;
  highlightTitle: string;
  highlightDescription: string;
  internalNotes?: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

// Shape sent to the Save Draft endpoint for a single highlight card. Cards
// without a pre-existing id (client-generated) are inserted; existing ids
// are updated. displayOrder is derived server-side from array position.
export interface ProposalHighlightInput {
  id: string;
  highlightTitle: string;
  highlightDescription: string;
  internalNotes?: string;
}
