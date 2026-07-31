# UX Polish: QM-WP04A — Proposal Publication

**Document ID**: UX-POLISH-QM-WP04A
**Scope**: Wording-only changes applied in direct response to `04-product-review.md`
**Constraint**: Business Discussion, Engineering Package, Data Model, API, publish/readiness logic, and revision numbering were explicitly out of scope and were not touched.

---

## 1. Refinements Applied

### 1.1 Publish Confirmation Dialog copy

| Before | After |
| :--- | :--- |
| "This creates an immutable revision of this proposal, capturing the current Proposal Content, Commercial Pricing, and Commercial Terms. The quotation itself remains editable afterward." | "Revision {current revision number} will become the official customer proposal.<br><br>Your quotation will remain editable so you can prepare future revisions if required." |

The revision number in the approved copy ("Revision 0 will become...") was implemented as the quotation's actual **pre-publish current revision number** (`quotation.currentRevision.revisionNumber`), read dynamically rather than hardcoded as the literal digit `0`. On a freshly created quotation this reads exactly as approved ("Revision 0"); on a quotation that has already been published once before, it correctly reads "Revision 1", "Revision 2", and so on. Hardcoding `0` would have made the dialog wrong on every publish after the first, which would be a regression, not a wording match — the dynamic value was already available on the page (the same value the workspace header already displays) and required no new state or API call.

### 1.2 Success Dialog layout

Restructured from a two-row label/value summary (`Revision Number: Revision N` / `Published At: <date>`) to the approved layout:

- **Proposal Published** (title, unchanged)
- **Revision {N}** — the newly published revision number, displayed as its own line
- **Published Successfully** — status caption
- **Published At:** \<date & time\>

Buttons (**Continue Working**, **Go to Revisions**) are unchanged.

---

## 2. Explicitly Not Changed

- No change to `POST /api/cat/quotations/{id}/publish` or its readiness/validation logic.
- No change to revision numbering (`nextRevisionNumber = current + 1`), the snapshot contents, or the `cat_quotation_publications` schema.
- No change to the Revisions page or `GET /api/cat/quotations/{id}/revisions`.
- No change to the Publish Proposal button's visibility rule (`overallReady`) or placement.
- No change to the Business Discussion or Engineering Package documents (aside from their own lifecycle status lines — see `06-freeze.md`).

---

## 3. Verification

`npx tsc --noEmit`: no new errors introduced by this pass (same pre-existing, unrelated errors as recorded in `03-implementation-walkthrough.md` §9).

### 3.1 Browser Validation

**Not performed.** As with implementation, this UX Polish pass was verified by static type-checking only — no live browser session exercised the updated dialog copy or layout.

### 3.2 Non-functional Confirmation

- Only `ProposalReviewWorkspace.tsx`'s dialog JSX text/markup was edited — no new state, props, or handler behavior was introduced.
- `handlePublish`, `openPublishDialog`, `closePublishDialog`, and `goToRevisions` are byte-for-byte unchanged from implementation.

---

## 4. Outcome

Both wording changes requested in the Product Review are complete. The Work Package is ready to proceed to Freeze.
