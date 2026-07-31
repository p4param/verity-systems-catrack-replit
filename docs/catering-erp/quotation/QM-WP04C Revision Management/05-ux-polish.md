# UX Polish: QM-WP04C — Revision Management

**Document ID**: UX-POLISH-QM-WP04C
**Scope**: Two cosmetic wording/visual refinements (Round 1) plus one functionally-necessary navigation correction (Round 2), both applied in direct response to `04-product-review.md`
**Constraint**: The publication model, revision numbering, and Publish endpoint's readiness/validation logic were explicitly out of scope throughout and were not touched.

---

## 1. Round 1 — Cosmetic Refinements

### 1.1 Publication Status banner

Added to the top of `RevisionManagementWorkspace`, above the Working Draft panel. Derived entirely from data the workspace already fetches (`workingDraft`, `publishedRevisions`) — no new API call:

| Condition | Banner |
| :--- | :--- |
| No published revisions yet | Neutral: "Not Published Yet — this quotation has never been published." |
| Published, but the Working Draft has unpublished changes | Amber: "Revision {N} is published — newer unpublished changes exist in the Working Draft." |
| Published, and up to date | Emerald: "Revision {N} is the current published proposal — up to date." |

### 1.2 Comparison dialog preview snippets

For free-text comparison rows (Executive Summary, Proposal Narrative, Terms & Conditions) that are flagged **Changed**, each side now shows a truncated preview (≤90 characters, ellipsis if longer) instead of just the word "Changed." Unchanged rows are unaffected — they still read simply "Unchanged," with no snippet, since there is nothing new to show.

This remains a business-differences view, not a document diff: no alignment between the two snippets, no highlighting of which specific words changed — just a glance at what each side currently reads like.

---

## 2. Round 2 — Navigation Correction

Not a wording change. Before Round 1's UX Polish had even finished build verification, a real published quotation exposed that the workspace had no durable entry point — see `04-product-review.md` §2 for the full account. The fix:

### 2.1 Persistent "Revisions" tab

`REVISIONS` was added as a full member of `ProposalWorkspaceKey` and `PROPOSAL_WORKSPACE_NAV_ITEMS`, so "Revisions" now appears permanently in the Quotation Workspace's Proposal Workspace Navigator, alongside Executive Summary, Scope of Services, Proposal Review, etc. Selecting it renders `RevisionManagementWorkspace` in place, exactly like every other tab. It was deliberately **excluded** from `PROPOSAL_HEALTH_WORKSPACE_KEYS` — it is a read-only dashboard with no Workspace Status of its own, the same treatment already given to Proposal Review.

### 2.2 Persistent "View Revisions" action in Proposal Review

`ProposalReviewWorkspace` now checks, on load, whether any published revision exists (by calling the already-existing `GET /revisions` endpoint) and shows a "View Revisions" link in its header whenever that's true — visible on every visit, not just immediately after a publish.

### 2.3 Post-publish "Go to Revisions" now switches tabs in place

Previously this button performed a full-page `router.push` to the standalone `/revisions` route. It now calls the same `onEditWorkspace('REVISIONS')` callback used by the new persistent action, switching the in-page tab instead — one mechanism for "go look at Revisions" everywhere in the Quotation Workspace, not two.

### 2.4 What was deliberately not built

- The header-badge fallback ("if that requires broader navigation changes...") was not implemented — the tab fit into the existing navigator without any broader change, so the conditional fallback's trigger condition was never met.
- The standalone `/cat/quotations/[id]/revisions` route was left in place, unmodified in behavior, as an additional valid entry point (e.g. a bookmarked or shared link) — it renders the same `RevisionManagementWorkspace` component the tab does.

---

## 3. Explicitly Not Changed

- No change to `POST /publish`, its readiness/validation logic, or revision numbering.
- No change to `cat_quotation_publications` or `cat_quotation_revisions` schema.
- No change to the Snapshot Viewer's content or the structured (non-free-text) comparison rows.
- No change to the Business Discussion or Engineering Package documents (aside from their own lifecycle status lines and the amendment notes recorded inline in `02-engineering-package.md` §6 and §9 — see `06-freeze.md`).

---

## 4. Verification

`npx tsc --noEmit`: zero new errors after each pass (Round 1 and Round 2), same pre-existing unrelated errors as recorded in `03-implementation-walkthrough.md` §9.

`npx next build`: succeeded (exit code 0) after each pass; the route manifest was checked directly after Round 2 to confirm the new tab's supporting routes and the updated page all compiled.

**Direct database verification** (Round 2 only, in response to the reported issue): confirmed against the working database that `cat_quotation_publications` already held correct data for a real, five-times-published quotation, and that `GET /revisions`'s own query returned the correct `workingDraft`/`publishedRevisions` shape — isolating the problem to navigation before any code was changed. Full detail in `03-implementation-walkthrough.md` §9.

### 4.1 Browser Validation

**Not performed**, in either round. As with QM-WP04A and QM-WP04C's initial implementation, verification rests on static type-checking, production builds, and — for Round 2 specifically — a direct database check, not a live UI walkthrough.

### 4.2 Non-functional Confirmation

- Round 1's changes touched only `RevisionManagementWorkspace.tsx` (banner) and `revision-comparison.ts` / `RevisionComparisonDialog.tsx` (snippets) — no state, prop, or handler behavior changed beyond what was needed to display the new data already being fetched.
- Round 2's changes are additive navigation wiring: one new union member, one new nav item, one new icon mapping, two `Record` completions required by the type system, one new render branch, and a header action + tab-switch behavior change in `ProposalReviewWorkspace`. No mutating endpoint was added or changed.

---

## 5. Outcome

All items from both Product Review rounds are complete: the two cosmetic refinements, and the navigation correction that the Product Owner correctly identified as a functional gap rather than a wording issue. The Work Package is ready to proceed to Freeze.
