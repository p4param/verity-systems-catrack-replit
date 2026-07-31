# Engineering Package: QM-WP04C — Revision Management

**Document ID**: ENG-PKG-QM-WP04C
**Module**: Catrack Catering ERP — Quotation Management (`cat/quotation`)
**Feature Area**: Revision Management Workspace
**Status**: IMPLEMENTED & FROZEN — Product Review Approved (2026-07-31)

---

## 1. Purpose

Provide a business workspace for managing published proposal revisions. Do not redesign the publication model established in QM-WP04A.

---

## 2. Working Draft

Display a dedicated Working Draft panel, indicating:
- Draft status
- Last modified
- Whether unpublished changes exist

---

## 3. Published Revisions

Display published revisions in reverse chronological order. Each revision displays:
- Revision Number
- Published At
- Published By
- Status: **Current Published** or **Superseded**

---

## 4. Snapshot Viewer

Read-only viewing of immutable published snapshots. No editing.

---

## 5. Comparison

Allow comparison of two published revisions. Show business differences only. No document diff.

---

## 6. Navigation

Proposal Review → Publish → Go to Revisions → Revision Management Workspace.

> **Amendment (Product Review, before Freeze)** — the workspace must also be reachable at any time, not only via the one-time post-publish dialog. Two persistent entry points were added:
> 1. **Revisions** as a permanent tab in the Quotation Workspace's existing Proposal Workspace Navigator (the preferred approach, requiring no broader navigation redesign).
> 2. A **View Revisions** action inside Proposal Review, shown whenever at least one published revision exists.
>
> Neither required any change to the publication model or to any existing API — both are additive navigation wiring on top of data the workspace already fetches. See `05-ux-polish.md`.

---

## 7. Data Sources (no schema change)

All data is read from tables already established by QM-WP04A — `cat_quotations`, `cat_quotation_revisions`, `cat_quotation_publications` — plus a read-only join to `users` for the publisher's display name. No new table, column, or migration.

- **Working Draft**: `cat_quotations.status`, `cat_quotations.updated_at`, and the `cat_quotation_revisions` row where `is_current = true`.
- **Has Unpublished Changes**: `true` if no publication exists yet for this quotation, or if `cat_quotations.updated_at` is more recent than the latest publication's `published_at`. This is a derived comparison of two existing timestamps — no new "dirty" flag or change-tracking column was introduced.
- **Published Revisions**: every row in `cat_quotation_publications` for the quotation, ordered by `revision_number` descending. The one with the highest `revision_number` is **Current Published**; every other row is **Superseded**.
- **Snapshot Viewer**: the `snapshot_json` of a single `cat_quotation_publications` row, fetched by revision number.
- **Comparison**: two snapshots fetched independently by revision number, compared client-side by a pure function — no server-side comparison endpoint.

---

## 8. API

**`GET /api/cat/quotations/{id}/revisions`** (rewritten from its QM-WP04A placeholder shape)

Returns:
```json
{
  "success": true,
  "workingDraft": { "status": "...", "lastModifiedAt": "...", "currentRevisionNumber": 0, "hasUnpublishedChanges": true },
  "publishedRevisions": [
    { "id": "...", "revisionNumber": 5, "publishedAt": "...", "publishedBy": { "id": "...", "fullName": "..." }, "status": "CURRENT_PUBLISHED" }
  ]
}
```
Permission: `CAT_QUOTATION_VIEW` (unchanged from QM-WP04A).

**`GET /api/cat/quotations/{id}/publications/{revisionNumber}`** (new)

Returns a single publication's full snapshot plus its metadata (`id`, `revisionNumber`, `status`, `publishedAt`, `publishedBy`). No `PATCH`/`PUT`/`DELETE`. Permission: `CAT_QUOTATION_VIEW`.

Neither endpoint writes anything. The `POST /publish` endpoint from QM-WP04A is unchanged.

---

## 9. Comparison Rules ("business differences only")

| Category | Treatment |
| :--- | :--- |
| Pricing totals (Charges, Discounts, Adjustments, Subtotal, GST, Grand Total) | Value-for-value comparison, formatted as currency. |
| Commercial Terms (Valid Until, Payment Method, Advance Required/Value, Balance Payment, Currency) | Value-for-value comparison. |
| Proposal Content counts (Scope of Services blocks, Highlights, Assumptions, Exclusions) | Count-for-count comparison. |
| Free-text content (Executive Summary, Proposal Narrative, Terms & Conditions) | Reduced to a Changed / Unchanged flag. No line-by-line or character-level diff. |

> **Amendment (Product Review, optional UX Polish)** — when a free-text field is flagged Changed, a short (≤90 character) truncated preview snippet of each side is shown alongside the flag. This is still not a diff: no alignment, no highlighting of the specific words that changed — just a glance at what each side currently reads like. See `05-ux-polish.md`.

---

## 10. Engineering Decisions

- **No new revision/publication concepts.** "Current Published" vs "Superseded" is computed purely from `cat_quotation_publications.revision_number` ordering — it does not depend on `cat_quotation_revisions.is_current`, which tracks the editable Working Draft revision, a different concept.
- **Comparison is a pure client-side function**, not a new API, avoiding a generic "diff engine" abstraction the package does not call for.
- **The standalone route `/cat/quotations/[id]/revisions`** (built to receive the original "Go to Revisions" navigation) was kept and is still reachable directly; the new in-page "Revisions" tab renders the same `RevisionManagementWorkspace` component, so there is exactly one implementation of the workspace, mounted in two places.

---

## Status

**Engineering Package Complete — Implemented and Frozen.**

See `03-implementation-walkthrough.md`, `04-product-review.md`, `05-ux-polish.md`, and `06-freeze.md` in this folder for the full downstream lifecycle record. No content in this document (sections 1–10 above) was altered as part of that process — section 6 and 9's amendments are recorded inline as amendments, not retroactive edits to the original request text.
