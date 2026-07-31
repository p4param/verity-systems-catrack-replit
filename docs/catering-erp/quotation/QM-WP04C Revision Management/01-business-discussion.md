# Business Discussion & Philosophy: Revision Management (`QM-WP04C`)

**Module**: Catrack Catering ERP — Quotation Management (`cat/quotation`)
**Feature Area**: Revision Management Workspace

---

## Business Philosophy

Provide a business workspace for managing published proposal revisions, without redesigning the publication model established in `QM-WP04A` (Proposal Publication — see `docs/catering-erp/quotation/QM-WP04A Proposal Publication/`). Publication already creates immutable, point-in-time records of what was offered to a customer; this Work Package makes those records usable — visible, viewable, and comparable — rather than adding any new way to create or alter them.

---

## Scope

**In scope:**
- A Working Draft panel showing the current, editable state: draft status, last modified, whether unpublished changes exist.
- A Published Revisions list, reverse-chronological, each showing Revision Number, Published At, Published By, and Status (Current Published / Superseded).
- A read-only Snapshot Viewer for any published revision's immutable content.
- Comparison of two published revisions, showing business differences only.
- Navigation: Proposal Review → Publish → Go to Revisions → Revision Management Workspace.

**Explicitly out of scope:**
- Any change to the publication model, revision numbering, or the Publish endpoint (QM-WP04A remains authoritative and untouched).
- Document-level diffing of free-text content (Proposal Narrative, Terms & Conditions, etc.) — differences are shown at the business level (totals, choices, counts, changed/unchanged), never as a line-by-line text diff.
- Un-publish, revert, or edit of a published snapshot.

---

## Business Goals

- Let the business actually see what QM-WP04A already records: which revisions were published, by whom, and when.
- Make it possible to answer "what changed between what we sent last time and what we're about to send now?" at a business level, without reading raw documents side by side.
- Keep the Working Draft and the published history visually and conceptually separate — the draft is always editable; published revisions never are.

---

## Business Boundaries

- The workspace reads existing data only; it introduces no new way to create a revision or publication.
- Comparison is informational — it does not block or gate anything, and does not feed back into the Publish readiness check.

---

## Product Decisions

- **Discoverability is a hard requirement, not a nice-to-have.** After initial delivery, Product Review identified that the workspace, once built, had no durable way for a user to reach it outside the one-time "Go to Revisions" button shown immediately after a successful publish. This was raised, correctly, as a navigation gap rather than a cosmetic issue, and addressed before Freeze — see `05-ux-polish.md`. The Revision Management Workspace must remain reachable at any time, not only in the moment right after publishing.
- **Preferred entry point**: a permanent "Revisions" workspace/tab inside the existing Quotation Workspace tab system (alongside Executive Summary, Scope of Services, Proposal Review, etc.), plus a persistent "View Revisions" action inside Proposal Review whenever at least one published revision exists.

---

## Approved Conversation Flow

Not applicable. This Work Package is an operational/management workspace, not a Discovery-style guided conversation.

---

## Status

**Business Discussion & Philosophy Complete.**

**Lifecycle**: Approved → Engineering Package → Implementation → Product Review → UX Polish → **Frozen** (2026-07-31).

See `02-engineering-package.md`, `03-implementation-walkthrough.md`, `04-product-review.md`, `05-ux-polish.md`, and `06-freeze.md` in this folder for the full downstream lifecycle record. No content in this document was altered as part of that process.
