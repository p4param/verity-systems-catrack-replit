# Implementation Walkthrough: QM-WP04A — Proposal Publication

**Document ID**: IMPL-QM-WP04A
**Module**: Catrack Catering ERP — Quotation Management (`cat/quotation`)
**Feature Area**: Proposal Publication
**Status**: IMPLEMENTED — verified by static type-check and production build
**Source of Truth**: `01-business-discussion.md`, `02-engineering-package.md`

---

## 1. Summary

Proposal Publication was implemented as specified in the Engineering Package: a gated `POST /publish` endpoint that snapshots the proposal and advances the quotation's revision, a Publish action in Proposal Review with a confirm → publish → success dialog, and a minimal read-only Revisions page to receive the "Go to Revisions" navigation. No existing workspace, endpoint, or data model outside this feature's own scope was changed.

---

## 2. Files Created

| File | Purpose |
| :--- | :--- |
| `prisma/migrations/20260731100000_add_cat_quotation_publications/migration.sql` | Creates `cat_quotation_publications` (idempotent, matching the `CREATE TABLE IF NOT EXISTS` convention already used by every prior Quotation migration). |
| `scratch/apply-cat-quotation-publications-schema.ts` | One-off script applying that migration to the working database, matching the pattern established by `scratch/apply-cat-quotations-schema.ts` in QM-WP01. Executed once; table confirmed present. |
| `src/modules/cat/quotation/domain/proposal-publication-types.ts` | `ProposalPublicationSnapshot` and `ProposalPublication` TypeScript interfaces, matching Engineering Package §4 and §3. |
| `src/app/api/cat/quotations/[id]/publish/route.ts` | `POST` handler: readiness check, snapshot assembly, transactional revision + publication insert. |
| `src/app/api/cat/quotations/[id]/revisions/route.ts` | `GET` handler: read-only revision list joined to publication records. |
| `src/app/(dashboard)/cat/quotations/[id]/revisions/page.tsx` | Minimal read-only Revisions page — the destination for "Go to Revisions". |

---

## 3. Files Modified

| File | Change |
| :--- | :--- |
| `src/modules/cat/quotation/components/ProposalReviewWorkspace.tsx` | Added the Publish Proposal button (shown only when `overallReady`), publish/confirm/success state, and an `AlertDialog` covering both the confirmation and success views. |
| `src/app/(dashboard)/cat/quotations/[id]/page.tsx` | Added `handleProposalPublished`, wired as the new `onPublished` prop on `ProposalReviewWorkspace`, updating the locally-held `quotation.currentRevision` after a successful publish. |

---

## 4. Database Changes

One new table: `cat_quotation_publications` (see `02-engineering-package.md` §3). No changes to `cat_quotations` or any existing table's schema. `cat_quotation_revisions` gains one new row per publish (existing table, no schema change).

---

## 5. API Changes

- `POST /api/cat/quotations/{id}/publish` — new. See `02-engineering-package.md` §5 for full behavior.
- `GET /api/cat/quotations/{id}/revisions` — new, read-only, additive.
- No existing Quotation endpoint's behavior was changed.

---

## 6. UI Components

- `ProposalReviewWorkspace` — extended (not replaced). The existing read-only review dashboard now also owns the Publish action and its dialog. It still fetches and derives everything from the existing `GET /proposal-review` endpoint; the dialog fetches nothing extra until Publish is clicked.
- New Revisions page — a standalone route, deliberately simple: one list, no interaction beyond navigating back to the Quotation Workspace.

---

## 7. Integration Points

- Publish is reachable only from Proposal Review, only when `overallReady` is true — no other entry point exists.
- `onPublished` updates the Quotation Workspace page's in-memory `quotation.currentRevision` so the header's "Revision N" badge reflects the new revision without a full page reload; it does not refetch the full quotation.

---

## 8. Technical Decisions

- **Revision numbering**: the endpoint reads the current revision number and increments it (`nextRevisionNumber = current + 1`) before writing the snapshot, so a first-ever publish on a freshly created quotation (starting at Revision 0) produces Revision 1, and the snapshot is stored against that new revision number — not the pre-publish one. This was implemented before the UX Polish pass requested wording referencing "Revision 0"; that wording was resolved to read the quotation's *pre-publish* current revision number dynamically (see `05-ux-polish.md`) rather than changing this numbering behavior, since the Freeze instruction was explicit that no functional change should accompany the wording pass.
- **Table name**: `cat_quotation_publications`, mirroring the existing `cat_quotation_revisions` sibling naming rather than inventing a new prefix.
- **No generic "publication" abstraction**: the snapshot shape is specific to Proposal Publication's known fields (Engineering Package §4) — not a generic document/snapshot engine, consistent with every other Quotation Work Package's stated approach.

---

## 9. Verification Results

- `npx tsc --noEmit`: zero new errors introduced by this Work Package. The pre-existing errors present both before and after (in `prisma/seed.ts`, `src/app/api/events/[id]/route.ts`, and six unrelated platform `domain` modules using BigInt literals) are unrelated to Quotation Management and were not touched.
- `npx next build`: succeeded (exit code 0). `/cat/quotations/[id]/revisions` and both new API routes (`.../publish`, `.../revisions`) compiled into the production route manifest.
- The `cat_quotation_publications` migration was applied to the local working database and confirmed created.
- **Not performed**: a live browser walkthrough of the Publish flow (confirm → publish → success → Go to Revisions) against a fully Ready quotation. Verification for this Work Package was limited to static type-checking and a production build; no end-to-end UI exercise or database read-back of a real publication was captured.

---

## 10. Boundaries Confirmed Intact

- No changes to any Proposal Builder workspace's Save Draft / Mark Ready behavior.
- No changes to `cat_quotations` schema or any existing workspace endpoint.
- Revisions page has zero write capability — list only.
- No customer delivery, comparison, or un-publish functionality introduced.
