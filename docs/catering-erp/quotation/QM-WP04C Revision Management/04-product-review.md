# Product Review: QM-WP04C — Revision Management

**Document ID**: PROD-REVIEW-QM-WP04C
**Reviewed by**: Product Owner
**Outcome**: Approved in two rounds — an initial approval with optional wording polish, followed by a mandatory correction once a real-world navigation gap was discovered

---

## 1. Round 1 — Initial Review

**Outcome**: Product Review Approved.

No numeric product score was given, consistent with QM-WP04A's review style. Two optional, wording-only improvements were requested:

1. Add a Publication Status banner at the top of the workspace.
2. Where practical, include a short preview snippet for changed free-text sections in the comparison dialog.

Both were explicitly scoped "No functional changes" and "do not reopen engineering."

---

## 2. Round 2 — Correction (discovered during manual testing)

While applying Round 1's UX Polish, the Product Owner attempted to view a real published quotation's revisions and could not find the workspace. Investigation (documented in `03-implementation-walkthrough.md` §9) confirmed the backend was working correctly — `cat_quotation_publications` held the expected rows, and `GET /revisions` returned correct data — but there was no durable way to reach the workspace in the UI: the only entry point was the one-time "Go to Revisions" button in the Publish success dialog.

**Product Owner's own framing, recorded verbatim**: *"This is not a wording issue—it is a navigation gap."*

### Required correction

- Add Revisions as a permanent workspace/tab within the Quotation experience (preferred approach).
- If that required broader navigation changes, add a persistent "View Revisions" action in the Quotation Workspace header instead. (Not needed — the tab fit into the existing `ProposalWorkspaceNavigator` without any broader change.)
- Additionally, add a "View Revisions" action to the Proposal Review workspace whenever published revisions exist.
- Constraint: no changes to the publication model or APIs required.

All of the above were implemented as described in `03-implementation-walkthrough.md` §3, §8.

---

## 3. Approved Improvements (all rounds)

1. Publication Status banner — approved and completed.
2. Comparison dialog preview snippets for changed free-text sections — approved and completed.
3. Persistent "Revisions" tab in the Quotation Workspace — approved and completed (preferred approach; no broader navigation redesign was required).
4. Persistent "View Revisions" action in Proposal Review — approved and completed.

---

## 4. Product Decisions

- The navigation correction is treated as part of UX Polish for lifecycle-documentation purposes (it happened in that stage, before Freeze), but is functionally significant — it is documented distinctly from the two purely cosmetic changes in `05-ux-polish.md`, not blended together.
- No redesign of the publication model, revision numbering, or any existing endpoint accompanied the correction, as instructed.

---

## 5. Freeze Recommendation

**APPROVED FOR FREEZE AFTER UX POLISH (INCLUDING THE NAVIGATION CORRECTION).**

All four items above are the entirety of what was requested before Freeze. See `05-ux-polish.md` for their application and `06-freeze.md` for the completed Freeze record.
