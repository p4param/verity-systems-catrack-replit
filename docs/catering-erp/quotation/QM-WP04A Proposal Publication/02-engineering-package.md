# Engineering Package: QM-WP04A — Proposal Publication

**Document ID**: ENG-PKG-QM-WP04A
**Module**: Catrack Catering ERP — Quotation Management (`cat/quotation`)
**Feature Area**: Proposal Publication
**Status**: IMPLEMENTED & FROZEN — Product Review Approved (2026-07-31)

---

## 1. Purpose

Proposal Publication creates immutable proposal revisions. The quotation remains editable.

---

## 2. Business Rules

Publication requires:

- Proposal Review Overall Readiness = Ready
- Every Proposal Builder workspace = READY

Otherwise the publish request is rejected and the outstanding workspaces are returned.

---

## 3. Data Model

### New table: `cat_quotation_publications`

| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Tenant scoping |
| `quotation_id` | UUID | FK → `cat_quotations`, `ON DELETE CASCADE` |
| `revision_number` | INTEGER | The revision this publication represents |
| `status` | VARCHAR(50) | Default `PUBLISHED` |
| `snapshot_json` | JSONB | Immutable snapshot — see §4 |
| `published_at` | TIMESTAMPTZ | Default `CURRENT_TIMESTAMP` |
| `published_by` | UUID | User who published |

Unique constraint on `(quotation_id, revision_number)`. Indexed on `quotation_id`.

Revision history is **not** stored on the Quotation entity. `cat_quotation_revisions` (from QM-WP01) continues to hold the revision ledger; publishing inserts one new row there (next `revision_number`, `is_current = true`, prior current row flipped to `false`) in the same transaction as the publication snapshot.

---

## 4. Snapshot

The immutable `snapshot_json` captures, at publish time:

- **Proposal Content**: Executive Summary (`proposalObjective`, `executiveNotes`), Scope of Services (all Service Blocks), Proposal Narrative (`proposalNarrative`, `internalAuthorNotes`), Proposal Highlights (all Highlight Cards), Assumptions & Exclusions (both lists).
- **Commercial Pricing**: Charges, Discounts, Adjustments (each as `{ description, amount }`).
- **Commercial Terms**: `validUntil`, `validityNotes`, `paymentMethod`, `advanceRequired`, `advanceType`, `advanceValue`, `balancePayment`, `commercialNotes`, `currencyCode`.
- **Terms & Conditions**: the quotation's current `termsAndConditions` text.
- **Pricing Summary**: the full `computePricingSummary()` result (`chargesTotal`, `discountTotal`, `adjustmentTotal`, `subtotal`, `gstAmount`, `grandTotal`) — the same function already used by Commercial Pricing and Proposal Review.

The snapshot is written once and never re-derived or updated.

---

## 5. API

**`POST /api/cat/quotations/{id}/publish`**

Behavior:
1. Validate readiness (§2). If not ready: `400` with `{ error, outstandingWorkspaces }`.
2. Read the current revision number and increment it.
3. Flip the previous current revision to `is_current = false`; insert the new current revision row.
4. Build and persist the snapshot (§4) against the new revision number.
5. Return publication metadata: `{ id, revisionNumber, status, publishedAt }`.

Steps 2–4 run inside a single database transaction.

Permission: `CAT_QUOTATION_EDIT` (reuses the existing Quotation edit permission — no new permission introduced).

**`GET /api/cat/quotations/{id}/revisions`**

Read-only list of a quotation's revisions, each left-joined to its publication record (if any) — `revisionNumber`, `status`, `isCurrent`, `createdAt`, `publishedAt`, `publicationStatus`. Backs the "Go to Revisions" navigation described in §6. Permission: `CAT_QUOTATION_VIEW`.

---

## 6. Proposal Review

When Overall Readiness = Ready, Proposal Review displays a **Publish Proposal** action.

Selecting it opens a confirmation dialog. After confirmation, the publish endpoint is called.

On success, the dialog displays:
- Proposal Published
- Revision Number
- Published At

Actions:
- Continue Working
- Go to Revisions

"Go to Revisions" required a destination to navigate to; no revisions view existed prior to this Work Package, so a minimal read-only revisions list page (`/cat/quotations/[id]/revisions`) was added specifically to receive this navigation — no comparison, no revert, no editing, consistent with the Business Boundaries in `01-business-discussion.md`.

---

## 7. Engineering Decisions

- **Readiness check is single-source**: the publish endpoint recomputes the same `statusByKey` / `outstandingWorkspaces` logic already used by `GET /api/cat/quotations/[id]/proposal-review`, rather than calling that endpoint internally — kept as a direct, duplicated (but small) computation to avoid an internal HTTP call, matching this codebase's existing pattern of each route being self-contained.
- **Revision creation and snapshot are one transaction**: a partial failure must not leave a new "current" revision without a matching publication record, or vice versa.
- **No new permission**: publication reuses `CAT_QUOTATION_EDIT`, since publishing is a mutation on the quotation's lifecycle, consistent with how "Mark Ready" reuses the same permission on every other workspace.

---

## Status

**Engineering Package Complete — Implemented and Frozen.**

See `03-implementation-walkthrough.md`, `04-product-review.md`, `05-ux-polish.md`, and `06-freeze.md` in this folder for the full downstream lifecycle record. No content in this document (sections 1–7 above) was altered as part of that process.
