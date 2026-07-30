// QM-WP02B-04 — Assumptions & Exclusions Workspace.
// ProposalAssumption and ProposalExclusion are two dedicated business
// entities — each a repeatable, reorderable list belonging to a single
// Quotation, following the Collection Authoring Pattern established by
// ScopeServiceBlock (QM-WP02B-01). Not a generic list-item abstraction —
// specific to Assumptions & Exclusions only.

export interface ProposalAssumption {
  id: string;
  quotationId: string;
  statement: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalAssumptionInput {
  id: string;
  statement: string;
}

export interface ProposalExclusion {
  id: string;
  quotationId: string;
  statement: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalExclusionInput {
  id: string;
  statement: string;
}
