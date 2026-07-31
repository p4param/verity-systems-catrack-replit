# Implementation Walkthrough: QM-WP04C — Revision Management

**Document ID**: IMPL-QM-WP04C
**Module**: Catrack Catering ERP — Quotation Management (`cat/quotation`)
**Feature Area**: Revision Management Workspace
**Status**: IMPLEMENTED — verified by static type-check and production build
**Source of Truth**: `01-business-discussion.md`, `02-engineering-package.md`

---

## 1. Summary

Revision Management was implemented in two passes: the initial workspace (Working Draft, Published Revisions, Snapshot Viewer, Comparison) against the frozen Engineering Package, followed by a Product-Review-driven navigation fix once it became clear the workspace, while functionally correct, had no durable entry point. Both passes are covered here as one implementation record, since the second pass shipped before Freeze.

---

## 2. Files Added

| File | Purpose |
| :--- | :--- |
| `src/modules/cat/quotation/domain/revision-management-types.ts` | `WorkingDraftSummary`, `PublishedRevisionSummary`, `PublicationDetail` types. |
| `src/modules/cat/quotation/domain/revision-comparison.ts` | Pure `compareProposalSnapshots()` — the business-differences-only comparison function. |
| `src/modules/cat/quotation/components/SnapshotViewerDialog.tsx` | Read-only rendering of an immutable `ProposalPublicationSnapshot`. |
| `src/modules/cat/quotation/components/RevisionComparisonDialog.tsx` | Renders comparison groups/rows; changed free-text rows show a truncated preview snippet. |
| `src/modules/cat/quotation/components/RevisionManagementWorkspace.tsx` | Main workspace: Publication Status banner, Working Draft panel, Published Revisions list with compare-selection, wiring to the two dialogs above. |
| `src/app/api/cat/quotations/[id]/publications/[revisionNumber]/route.ts` | `GET` — single publication snapshot + metadata, by revision number. |

---

## 3. Files Modified

| File | Change |
| :--- | :--- |
| `src/app/api/cat/quotations/[id]/revisions/route.ts` | Rewritten from the QM-WP04A placeholder (flat revision list) to return `{ workingDraft, publishedRevisions }`, joined to `users` for publisher name, with Current Published / Superseded computed from `cat_quotation_publications`. |
| `src/app/(dashboard)/cat/quotations/[id]/revisions/page.tsx` | Now renders `RevisionManagementWorkspace` in place of the QM-WP04A minimal inline list. |
| `src/modules/cat/quotation/domain/proposal-workspace-types.ts` | Added `'REVISIONS'` to `ProposalWorkspaceKey` and a corresponding entry to `PROPOSAL_WORKSPACE_NAV_ITEMS`; intentionally left out of `PROPOSAL_HEALTH_WORKSPACE_KEYS` (read-only dashboard, no Workspace Status, same treatment as `PROPOSAL_REVIEW`). |
| `src/modules/cat/quotation/components/ProposalWorkspaceNavigator.tsx` | Added a `History` icon mapping for the new `REVISIONS` key (required — `WORKSPACE_ICONS` is a `Record` over every key). |
| `src/app/api/cat/quotations/[id]/proposal-review/route.ts` | Added `REVISIONS: 'NOT_STARTED'` to the `statusByKey` Record (required by the same Record-over-every-key constraint; Revisions has no Workspace Status of its own, matching Proposal Review's own entry). |
| `src/app/api/cat/quotations/[id]/publish/route.ts` | Same one-line addition as above, same reason — this Record is duplicated between the two routes (see QM-WP04A `02-engineering-package.md` §7 on why). |
| `src/app/(dashboard)/cat/quotations/[id]/page.tsx` | Imported `RevisionManagementWorkspace`; added a render branch for `activeWorkspace === 'REVISIONS'`. |
| `src/modules/cat/quotation/components/ProposalReviewWorkspace.tsx` | Added a Publication Status check (`hasPublishedRevisions`, via the existing `GET /revisions` endpoint) and a persistent **View Revisions** header action shown whenever it's true; `goToRevisions` (the post-publish success dialog's action) now switches `activeWorkspace` to `'REVISIONS'` via the existing `onEditWorkspace` callback instead of a full-page `router.push`. `useRouter` import removed as it's no longer used. |

---

## 4. Database Changes

None. Every query in this Work Package reads `cat_quotations`, `cat_quotation_revisions`, and `cat_quotation_publications` (all established by QM-WP01/QM-WP04A) plus a `LEFT JOIN users` for display names.

---

## 5. API Changes

- `GET /api/cat/quotations/{id}/revisions` — response shape changed (this page/workspace is its only consumer).
- `GET /api/cat/quotations/{id}/publications/{revisionNumber}` — new, read-only.
- `POST /api/cat/quotations/{id}/publish` — no behavioral change; only gained one additional literal key (`REVISIONS: 'NOT_STARTED'`) in an internal `Record` that was already required to cover every `ProposalWorkspaceKey`. The publish/readiness logic itself is untouched.
- No endpoint gained a write capability related to revisions or publications beyond what QM-WP04A already provided.

---

## 6. UI Components

- `RevisionManagementWorkspace` — mounted in two places sharing one implementation: the standalone `/cat/quotations/[id]/revisions` route, and the new in-page "Revisions" tab inside the Quotation Workspace.
- `SnapshotViewerDialog`, `RevisionComparisonDialog` — dialogs, not pages; no route of their own.
- `ProposalReviewWorkspace` — extended with the Publication Status check and the View Revisions header action; its own read-only review content is unchanged.

---

## 7. Integration Points

- The new "Revisions" tab sits inside the existing `ProposalWorkspaceNavigator` / `activeWorkspace` mechanism already used by every other Proposal Builder workspace — no new navigation system was introduced.
- Proposal Review's "View Revisions" action and the post-publish dialog's "Go to Revisions" action both now resolve to the same in-page tab switch (`onEditWorkspace('REVISIONS')`), rather than two different mechanisms.
- The standalone `/revisions` route is untouched as a valid, separate entry point (e.g. for a bookmarked or shared link) — it renders the identical `RevisionManagementWorkspace` component.

---

## 8. Technical Decisions

- **Navigation gap correction, not a new feature.** The persistent tab and the Proposal Review action were both built to satisfy the Business Boundary recorded in `01-business-discussion.md` ("must remain discoverable after the publish dialog has been dismissed") — they are UI wiring on top of already-fetched data, not new business capability, and required no change to the publication model or any mutating API, per the Product Review instruction.
- **`hasPublishedRevisions` reuses the existing `GET /revisions` endpoint** rather than adding a lighter-weight "count" endpoint — the response is already small (a handful of publication rows at most for this stage of the product), so a second bespoke endpoint was judged unnecessary complexity.
- **Truncation length for comparison snippets (90 characters)** is an implementation-level UX choice, not specified in the Engineering Package's "if practical" wording — chosen to fit a single line in the comparison table's column without wrapping awkwardly on typical content.

---

## 9. Verification Results

- `npx tsc --noEmit`: zero new errors at any point across both implementation passes. Pre-existing, unrelated errors (`prisma/seed.ts`, `src/app/api/events/[id]/route.ts`, six platform `domain` modules using BigInt literals) are unchanged.
- `npx next build`: succeeded (exit code 0) after each pass. `.next/app-path-routes-manifest.json` confirms `/api/cat/quotations/[id]/publications/[revisionNumber]` and the updated `/api/cat/quotations/[id]/revisions` are present; the app-path manifest confirms `/(dashboard)/cat/quotations/[id]/page` and `/(dashboard)/cat/quotations/[id]/revisions/page` both compiled.
- **Direct database verification** (not just a build check): queried the working Postgres database directly against a real quotation (`QT-2026-000001`) that had been published five times during manual testing. Confirmed `cat_quotation_publications` correctly held one row per publish (revisions 1–5, status `PUBLISHED`, real `published_at`/`published_by`), and reconstructed the exact `GET /revisions` response by running the endpoint's own query — it correctly returned `hasUnpublishedChanges: false`, `currentRevisionNumber: 5`, and revision 5 marked `CURRENT_PUBLISHED` with 1–4 marked `SUPERSEDED`. This confirmed the backend was correct and isolated the reported issue to navigation, not data.
- **Not performed**: a live browser walkthrough of the new tab, the View Revisions action, the Snapshot Viewer, or the Comparison dialog. Verification remains limited to static type-checking, production builds, and the direct database check described above.

---

## 10. Boundaries Confirmed Intact

- No change to `POST /publish`'s readiness/validation logic or revision-numbering behavior.
- No change to `cat_quotation_publications` or `cat_quotation_revisions` schema.
- No document-level diff introduced anywhere, including in the comparison snippet addition (truncated preview only, no alignment or word-level highlighting).
- No new write endpoint introduced for revisions or publications.
