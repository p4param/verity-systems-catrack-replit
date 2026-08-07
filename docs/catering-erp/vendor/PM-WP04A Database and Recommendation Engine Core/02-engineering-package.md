# Engineering Package: PM-WP04A — Database + Recommendation Engine Core

**Document ID**: ENG-PKG-PM-WP04A
**Module**: Catrack Catering ERP — Vendor Recommendation (`cat/vendor-recommendation`)
**Feature Area**: Vendor Recommendation Enhancement (PM-WP04), Part A of 5 (A–E)
**Status**: IMPLEMENTED & FROZEN — Product Review Approved (2026-08-07)

---

## 1. Purpose

Replaces the boolean `is_preferred` recommendation model with an ordered `priority` (Priority 1, 2, 3, ...), owned exclusively by five named domain operations, and extracts the recommendation read-side logic into a shared engine module for reuse across Purchase Planning and the future Ingredient Workspace (PM-WP04B).

This work package is database + domain-logic only — no new UI surfaces. It exists so PM-WP04B–E can be built against a settled, production-ready foundation.

---

## 2. Data Model

### `cat_vendor_ingredients.priority` (new column, nullable INTEGER)

Added alongside the existing `is_preferred` column (kept, frozen — never written by new code, retained only as a rollback safety net; dropped entirely in a later, separate work package once Priority has proven out). Backfilled once: `priority = 1` where `is_preferred = true`.

`priority` is nullable — "No Recommendation" (no explicit rank) is a valid, common state, not every Vendor–Ingredient link needs one.

### Architecture Decision — partial unique index deferred, not abandoned

**Decision**: A database-level partial unique index enforcing at most one Priority-1 Vendor per Ingredient (`UNIQUE (ingredient_id) WHERE priority = 1`) is the intended long-term invariant, but is **deliberately deferred to PM-WP04E**, not implemented in this migration.

**Reason**: this exact migration, run against real demo data, failed against that constraint — the "Coriander" demo scenario (PM-WP02D) has two Vendors both `is_preferred = true` by design, to exercise the ambiguous-preference case. A hard constraint at this point would have forced silently picking a winner between them during a schema migration — exactly the kind of silent business decision this system's philosophy rejects.

**Precondition for PM-WP04E to reintroduce it**: the demo dataset redesign in PM-WP04E must first resolve every existing multiple-Priority-1 state (either giving Coriander a single Priority-1 Vendor, or re-expressing "ambiguous vendor preference" as a scenario that doesn't require literal duplicate Priority-1 rows). A unique index cannot grandfather old rows — it applies to the whole table or not at all — so this is a precondition, not a follow-up cleanup.

**What doesn't change even after the index returns**: the `MULTIPLE_PRIORITY_1_VENDORS` engine status (§3) stays defined. The five domain operations already guarantee the invariant by construction on the app's own write paths; the index's marginal value is as a safety net against data reaching the table *outside* those five operations (raw SQL, future one-off scripts — the dominant convention in this codebase). The engine status is what makes any such violation visible instead of silently ignored, constraint or no constraint.

Until PM-WP04E, the invariant is enforced entirely at the write-operation level (§3) — every one of the five domain operations locks the full link set for an Ingredient (`FOR UPDATE`) before reading or writing, so it cannot itself create a second Priority-1 Vendor.

---

## 3. Domain Operations

`src/modules/cat/vendor-recommendation/domain/vendor-recommendation-operations.ts` — five operations, and only these five, may ever write `cat_vendor_ingredients.priority`. Each is transactional and row-locks the full link set for one Ingredient before acting:

| Operation | Effect |
| :--- | :--- |
| Add To Ranking | Appends the Vendor at `MAX(priority) + 1`. The ordinary way a Vendor enters the ranking. |
| Make Primary | Jumps the Vendor to Priority 1, cascading everyone else ranked down by one. Reserved for the exceptional case. |
| Move Up / Move Down | Swaps priority with the adjacent-ranked Vendor. |
| Remove From Ranking | Clears the Vendor's priority to `NULL` and renumbers the remaining ranked Vendors to close the gap. The link itself is untouched. |

A shared (unnamed, sixth) helper, `renumberAfterLinkRemoval`, reuses the same renumbering logic when a Vendor–Ingredient link is deleted entirely (§4) — mechanical gap-closing, not a ranking decision.

`src/modules/cat/vendor-recommendation/domain/vendor-recommendation-engine.ts` — shared read-side logic (`matchVendorLinks`, `recommendVendor`, `computeRecommendationHealth`), extracted for reuse. Statuses: `READY`, `NO_VENDOR`, `NO_ACTIVE_VENDOR`, `BLOCKED_PRIORITY_1_VENDOR`, `INACTIVE_PRIORITY_1_VENDOR`, `MULTIPLE_PRIORITY_1_VENDORS`. Consumed by Purchase Planning today; will be consumed by the Ingredient Workspace in PM-WP04B.

---

## 4. Architecture Decision — Recommendation Priority ownership

**Decision**: Recommendation Priority ownership belongs exclusively to the Ingredient domain. This is enforced structurally in the API layer, not by convention or client-side discipline alone.

**Vendor Workspace owns** (`/api/cat/vendors/[id]/ingredients/...`):
- Add Supplier (POST) — new links always insert `priority = NULL` (a literal in the SQL, not read from the request body). A newly-linked Vendor always starts unranked; ranking is always a deliberate, separate step taken from the Ingredient side.
- Remove Supplier (DELETE) — deletes the link, then calls the shared `renumberAfterLinkRemoval` helper to mechanically close any gap left in the ranking. This is gap-closing, not a ranking decision — no arbitrary priority value or promotion/demotion is possible from this route.
- Notes (PUT) — the `UPDATE` statement only ever sets `notes`; `priority` is not present in the SQL template at all. A request body containing `priority` or `isPreferred` is additionally rejected outright with `400` before reaching the database, as a clear-error layer on top of that structural fact.

**Ingredient Workspace owns** (`/api/cat/ingredient-master/[id]/vendors/...`), via the five domain operations (§3):
- Add To Ranking
- Promote to Primary (Make Primary)
- Move Up
- Move Down
- Remove From Ranking

No Vendor-rooted endpoint can set an arbitrary priority value or promote/demote a Vendor. That decision-making surface exists only behind the five Ingredient-rooted operations.

---

## 5. Verification

- `npx tsc --noEmit` — 13 pre-existing baseline errors only (unrelated platform modules), zero from this work package.
- Reset → reseed → verify cycle (`scripts/seed-demo-{reset,all}.ts`, `scripts/verify-demo-dataset.ts`) — PASS, run twice (before and after direct-operation testing) to confirm a clean final state. All DD-001D scenarios resolve to their documented status under the renamed enum.
- 25/25 direct, in-process tests of the five domain operations against real demo data (Add To Ranking, Make Primary including no-op-when-already-primary, Move Up/Down including boundary rejections, Remove From Ranking, 404-on-nonexistent-Vendor for all four write operations) plus the Vendor-rooted PUT ownership guard (rejects `priority`/`isPreferred`, allows `notes`).
- HTTP-level (browser + live session) testing was attempted but not completed — the dev server's login flow hung repeatedly in this environment for reasons traced to the test harness (zombie browser processes from earlier interrupted attempts), not a code defect; no database locks were involved. The five route files are thin, mechanically-verified wrappers (permission guard → domain operation call → status/error passthrough), confirmed by code review and `tsc`, not exercised end-to-end over HTTP this round.

---

## 6. Forward Dependencies

- **PM-WP04B** (Ingredient Workspace) and **PM-WP04C** (Purchase Planning UX) consume `vendor-recommendation-engine.ts` and the five domain operations as-is — no changes expected to this package's public surface.
- **PM-WP04E** (Demo Dataset + Verification) carries the precondition described in §2: resolve all multiple-Priority-1 states in the demo dataset, then reintroduce the partial unique index.
