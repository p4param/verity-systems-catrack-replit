# Implementation Walkthrough: IM-WP02C-08 — Special Requirements Discovery Workspace

**Document ID**: IMPL-IM-WP02C-08
**Module**: Catrack Catering ERP — Inquiry Management (`cat/inquiry`)
**Feature Area**: Special Requirements Discovery Workspace
**Status**: IMPLEMENTED — verified against a live database and browser session
**Source of Truth**: `01-business-discussion.md`, `02-engineering-package.md`

---

## 1. Summary

The Special Requirements Discovery Workspace was implemented exactly as specified in the Engineering Package: 6 guided conversation cards, wired into the existing Discovery shell (header, validation badge, discussion status, progress indicator, Insight Assistant sidebar, Save Discovery). It is the final workspace in the Inquiry Discovery Suite. Unlike every prior sibling, its data model is grouped into nested per-card interfaces (rather than flat, same-level fields) and its business validation has zero mandatory fields — both deliberate design decisions carried over verbatim from the Engineering Package's Final Engineering Review refinements.

---

## 2. Files Created

| File | Purpose |
| :--- | :--- |
| `src/modules/cat/inquiry/features/special-requirements-discovery/SpecialRequirementsWorkspacePanel.tsx` | The full workspace panel: 6 cards and the Insight Assistant sidebar (tips, Internal Sales Assessment, Structured Business Summary, Suggested Activities). |
| `prisma/migrations/20260728130000_add_special_requirements_payload/migration.sql` | `ALTER TABLE cat_inquiry_discovery_areas ADD COLUMN IF NOT EXISTS special_requirements JSONB;` — same pattern as every other optional Discovery payload column. |
| `scratch/apply-special-requirements-schema.ts` | One-off script applying that column to the working database (executed once; column confirmed present). |

---

## 3. Files Modified

| File | Change |
| :--- | :--- |
| `src/modules/cat/inquiry/domain/discovery-types.ts` | Added `AccessibilityConsiderationTag`, `HealthWellbeingConsiderationTag`, `CulturalReligiousConsiderationTag`, `SecurityProtocolTag`, `VenueGuidelineTag`, the six nested per-card interfaces (`AccessibilityGuestComfort`, `HealthGuestWellbeing`, `CulturalReligiousConsiderations`, `SecurityProtocolExpectations`, `VenueGuidelinesEventConsiderations`, `SpecialRequestsPeaceOfMind`), the root `SpecialRequirementsConversation` interface, and `computeSpecialRequirementsValidation()` — matching Engineering Package §3–4 verbatim, including the nested-grouping structure and the zero-mandatory-field business rule. Added `specialRequirements?: SpecialRequirementsConversation` to `DiscoveryArea`. |
| `src/app/api/cat/inquiries/[id]/discovery/route.ts` | Added `special_requirements` to the optional-column detection, the `GET` select expression, a new `sanitizeSpecialRequirements()` function (nested-aware — normalizes each card's array field independently rather than flattening the structure), the `PATCH` body handling, and the `appendOptionalColumn` write path. |
| `src/app/(dashboard)/cat/inquiries/[id]/page.tsx` | Added the panel import, the `SPECIAL_REQUIREMENTS` value to the `activeDiscoveryView` union, an `openDiscoveryModal` branch, a render branch, and a branch in both `onContinueDiscovery` handlers (Mandatory and Additional Discovery grids). The `SPECIAL_REQUIREMENTS` area spec and its `AREA_ICONS` entry already existed as pre-existing scaffolding and needed no changes. |

---

## 4. Database Changes

- One new column: `special_requirements JSONB` on `cat_inquiry_discovery_areas`, added via migration and applied to the working database. No other schema changes. No changes to any other table.

---

## 5. API Changes

- `PATCH /api/cat/inquiries/[id]/discovery` — additive only. Accepts an optional `specialRequirements` object in the request body when `areaKey = 'SPECIAL_REQUIREMENTS'`, sanitized by the new `sanitizeSpecialRequirements()` function and persisted to the new column.
- `GET /api/cat/inquiries/[id]/discovery` — additive only. Now also returns `specialRequirements` on the matching `DiscoveryArea` when present.
- No existing endpoint behavior changed for any other Discovery area.

---

## 6. UI Implementation

- `SpecialRequirementsWorkspacePanel` — new. 6 guided conversation cards (Accessibility & Guest Comfort; Health & Guest Wellbeing; Cultural, Religious & Traditional Considerations; Security & Protocol Expectations; Venue Guidelines & Event Considerations; Special Requests & Peace of Mind) and the shared Insight Assistant sidebar. Card 6 uses the same elevated gradient-border, enlarged-quote visual treatment as Service Experience's Hospitality Memory and Entertainment & Add-ons' Signature Guest Experience, since it serves both as this workspace's own emotional close and the final Discovery conversation of the entire Inquiry module.
- Every card's chip selections and free-text fields are optional — no card enforces a required selection, consistent with the workspace's zero-mandatory-field validation rule. The validation badge reads "Discovery Ready" from first render, by design.
- `cat/inquiries/[id]/page.tsx` — extended (not replaced) to route to the new panel; no existing component was altered in its own behavior.

---

## 7. Integration Points

- Mounted into the Requirements Discovery directory alongside all seven other Discovery workspaces, via the same `activeDiscoveryView` / `openDiscoveryModal` / `onContinueDiscovery` pattern already used by those workspaces.
- Structured Business Summary generates narrative prose per card, including an honest "nothing flagged" sentence for any card left empty (e.g. *"No accessibility considerations were flagged."*) rather than a blank section — per Engineering Package §6.
- Suggested Activities fire only when their triggering field was actually captured, using proposal-oriented wording only ("mention," "note," "include," "carry forward," "reflect") — per Engineering Package §7.

---

## 8. Verification Results

- `npx tsc --noEmit`: identical pre-existing, unrelated errors only (events module, prisma seed, platform tenant/catalog domain BigInt targets); zero new errors introduced.
- End-to-end browser verification: login → inquiry → Special Requirements Discovery → all 6 cards exercised (one selection per card plus the Card 6 free-text close) → Save Discovery → fresh session reload confirmed persistence, including all nested tag arrays and free-text notes.
- Narrative summary confirmed live to generate correctly per section, reflecting only what was actually captured.
- Suggested Activities confirmed live: exactly the activities supported by the captured selections appeared (6 of 7 possible rows, since Discussion Status was not marked Complete during the test), each with correct wording and priority badge.
