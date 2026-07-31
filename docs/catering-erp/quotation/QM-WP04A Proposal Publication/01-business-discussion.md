# Business Discussion & Philosophy: Proposal Publication (`QM-WP04A`)

**Module**: Catrack Catering ERP — Quotation Management (`cat/quotation`)
**Feature Area**: Proposal Publication (Proposal Builder → Proposal Review → Publish)

---

## Business Philosophy

> **Proposal Publication creates immutable proposal revisions. The quotation remains editable.**

Once a proposal is complete and ready, the business needs a definitive, unchangeable record of exactly what was offered to the customer at that moment — the Proposal Content, Commercial Pricing, Commercial Terms, and Terms & Conditions as they stood at publish time. At the same time, sales must be free to keep refining the quotation afterward (correcting a price, tightening the narrative, preparing a follow-up offer) without disturbing anything already published. Publication and editing are deliberately kept as two separate concerns: publishing freezes a point-in-time snapshot; the Quotation entity itself is never locked.

---

## Scope

**In scope for this Work Package:**
- The Publish action itself, gated on proposal completeness.
- Capturing an immutable snapshot of Proposal Content, Commercial Pricing, Commercial Terms, Terms & Conditions, and the Pricing Summary at the moment of publish.
- Advancing the Quotation to its next revision.
- Surfacing the action, its confirmation, and its result inside the existing Proposal Review workspace.

**Explicitly out of scope** (consistent with QM-WP01's foundation-only revision model — "no revision workflow, comparison, or negotiation functionality exists at this stage"):
- Revision comparison / diffing.
- Un-publish, retract, or amend a published revision.
- Customer delivery (email, shareable link, PDF export, e-signature).
- Any approval workflow beyond the existing Proposal Review readiness gate.

---

## Business Goals

- Give the business a trustworthy "this is exactly what we offered" record for every published revision.
- Preserve full editability of the working quotation after publication, so the next revision can be prepared without friction.
- Prevent an incomplete proposal from being published: publication requires Proposal Review's Overall Readiness to be Ready, which already means every Proposal Builder workspace (Executive Summary, Scope of Services, Proposal Narrative, Proposal Highlights, Assumptions & Exclusions, Commercials, Terms & Conditions) is marked Ready.

---

## Business Boundaries

- No customer-facing delivery mechanism exists yet — publication produces an internal record only.
- No comparison between revisions is offered.
- A rejected publish attempt (incomplete proposal) simply returns the outstanding workspaces; it does not partially publish anything.

---

## Product Decisions

- Readiness is a single check, not two: "Proposal Review = Ready" and "every Proposal Builder workspace = READY" are definitionally the same condition (Proposal Review's own readiness is computed from exactly those workspace statuses), so the Publish endpoint performs one readiness check.
- Because publication is immutable and cannot be undone, the action requires an explicit confirmation step before it executes.

---

## Approved Conversation Flow

Not applicable. This Work Package is an operational action (Publish), not a Discovery-style guided conversation — no conversation cards apply.

---

## Status

**Business Discussion & Philosophy Complete.**

**Lifecycle**: Approved → Engineering Package → Implementation → Product Review → UX Polish → **Frozen** (2026-07-31).

See `02-engineering-package.md`, `03-implementation-walkthrough.md`, `04-product-review.md`, `05-ux-polish.md`, and `06-freeze.md` in this folder for the full downstream lifecycle record. No content in this document was altered as part of that process.
