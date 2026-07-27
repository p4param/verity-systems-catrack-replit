# Implementation Walkthrough: IM-WP02C-06 — Service Experience Discovery Workspace

**Document ID**: IMPL-IM-WP02C-06
**Module**: Catrack Catering ERP — Inquiry Management (`cat/inquiry`)
**Feature Area**: Service Experience Discovery Workspace
**Status**: IMPLEMENTED — verified against a live database and browser session
**Source of Truth**: `01-business-discussion.md`, `02-engineering-package.md`

---

## 1. Summary

The Service Experience Discovery Workspace was implemented exactly as specified in the Engineering Package: 6 guided conversation cards plus a closing Hospitality Memory question, wired into the existing Discovery shell (header, validation badge, discussion status, progress indicator, Insight Assistant sidebar, Save Discovery). No new architecture was introduced — the implementation reuses the same patterns already established by Decor & Ambience and Budget & Commercial Discovery.

---

## 2. Files Created

| File | Purpose |
| :--- | :--- |
| `src/modules/cat/inquiry/features/service-experience-discovery/ServiceExperienceWorkspacePanel.tsx` | The full workspace panel: 6 cards, the Hospitality Memory closing card, and the Insight Assistant sidebar (tips, Internal Sales Assessment, Structured Business Summary, Suggested Activities). |
| `prisma/migrations/20260727180000_add_service_experience_payload/migration.sql` | `ALTER TABLE cat_inquiry_discovery_areas ADD COLUMN IF NOT EXISTS service_experience JSONB;` — same pattern as the existing `decor_ambience`/`budget_commercial`/`food_beverage` columns. |
| `scratch/apply-service-experience-schema.ts` | One-off script applying that column to the working database (executed once; column confirmed present). |

---

## 3. Files Modified

| File | Change |
| :--- | :--- |
| `src/modules/cat/inquiry/domain/discovery-types.ts` | Added `HospitalityVisionType`, `ServiceAtmospherePreference`, `GuestExperiencePriority`, `HostInvolvementPreference`, `CommunicationStyleType`, `VipGuestTag`, `SignatureHospitalityMoment`, `ServicePreferenceTag`, the `ServiceExperienceConversation` interface, and `computeServiceExperienceValidation()` — matching Engineering Package §3–4 verbatim. Added `serviceExperience?: ServiceExperienceConversation` to `DiscoveryArea`. Reuses the existing shared `PreferenceImportanceWeighting` type (no redeclaration). |
| `src/app/api/cat/inquiries/[id]/discovery/route.ts` | Added `service_experience` to the optional-column detection (`getAvailableDiscoveryPayloadColumns`), the `GET` select expression, a new `sanitizeServiceExperience()` function, the `PATCH` body handling, and the `appendOptionalColumn` write path — identical shape to the existing `decor_ambience` handling. |
| `src/app/(dashboard)/cat/inquiries/[id]/page.tsx` | Added the panel import, the `SERVICE_EXPERIENCE` value to the `activeDiscoveryView` union, an `openDiscoveryModal` branch, a render branch, and a branch in both `onContinueDiscovery` handlers (Mandatory and Additional Discovery grids). |

---

## 4. Database Changes

- One new column: `service_experience JSONB` on `cat_inquiry_discovery_areas`, added via migration and applied to the working database. No other schema changes. No changes to any other table.

---

## 5. API Changes

- `PATCH /api/cat/inquiries/[id]/discovery` — additive only. Accepts an optional `serviceExperience` object in the request body when `areaKey = 'SERVICE_EXPERIENCE'`, sanitized by the new `sanitizeServiceExperience()` function and persisted to the new column.
- `GET /api/cat/inquiries/[id]/discovery` — additive only. Now also returns `serviceExperience` on the matching `DiscoveryArea` when present.
- No existing endpoint behavior changed for any other Discovery area (`EVENT_BASICS`, `VENUE`, `FOOD_BEVERAGE`, `BUDGET_COMMERCIALS`, `DECOR_AMBIENCE`).

---

## 6. UI Components

- `ServiceExperienceWorkspacePanel` — new. 6 guided conversation cards, a closing Hospitality Memory card, and the shared Insight Assistant sidebar (Discussion Tips, Internal Sales Assessment, Structured Business Summary, Suggested Next Activities). Reuses the header, validation badge, Discussion Status toggle, progress indicator, and Save Discovery button shell already used by every other Discovery workspace.
- `cat/inquiries/[id]/page.tsx` — extended (not replaced) to route to the new panel; no existing component was altered in its own behavior.

---

## 7. Integration Points

- Mounted into the Requirements Discovery directory alongside Event Basics, Venue, Food & Beverage, Budget & Commercial, and Decor & Ambience, via the same `activeDiscoveryView` / `openDiscoveryModal` / `onContinueDiscovery` pattern already used by those five workspaces.
- Persists through the existing shared discovery API route — no separate endpoint was created.
- Contributes to the existing aggregate `InquiryDiscoveryOverview` (progress, quotation readiness) via the same `calculateInquiryDiscoveryOverview()` used by every other area; no changes were made to that function.

---

## 8. Technical Decisions

The Engineering Package specifies *what* the workspace captures; a few presentation-layer decisions were still required to actually build it. These were made consistent with the two most recently polished sibling workspaces (Decor & Ambience, Budget & Commercial) rather than invented independently:

The Engineering Package specifies *what* the workspace captures; a few presentation-layer decisions were still required to actually build it. These were made consistent with the two most recently polished sibling workspaces (Decor & Ambience, Budget & Commercial) rather than invented independently:

- **Visual system**: reused the shared card/chip/focus-ring style conventions verbatim (check-badge cards for single-select "vision" style choices, filled chips with a check icon for multi-select tags, eyebrow-labeled sub-groups inside Cards 1, 3, and 6 where two distinct sub-topics exist).
- **Progress indicator buckets**: the Business Discussion and Engineering Package do not specify how the 6-card progress bar should be calculated (this detail doesn't exist in either document). Buckets 1–3 were built to track exactly the same conditions as `computeServiceExperienceValidation`'s required fields, so the progress percentage can never contradict the validation badge. Buckets 4–6 track genuine engagement with the three intentionally-optional cards (VIP, Signature Moments, Service Preferences). Per the Product Review and this Work Package's explicit direction, further evolution of this behavior is deferred to a future Discovery Framework enhancement — it was not modified during the UX Polish pass.
- **`salesAssessment` field**: added to `ServiceExperienceConversation` even though §3.1 of the Engineering Package does not list it explicitly. The package's own §1.3 and mermaid diagram require the reused "Internal Sales Assessment" sidebar component, which needs a field to persist its selection — identical in shape to the same field on `DecorAmbienceConversation`. This was flagged transparently at implementation time rather than treated as silently already covered.

---

## 9. Verification Results

- `npx tsc --noEmit`: zero new errors. The 12 errors present both before and after this work are all pre-existing and unrelated (Prisma seed script, an `EventDto` property mismatch, and `BigInt` literal target-level errors in unrelated platform modules).
- Live browser verification (headless Chrome via `playwright-core`, logged in as `admin@verity.com`, against the Corporate Gala inquiry):
  - All 6 cards and the closing question render with the correct prompts, option sets, and the "Departure / Thank You" moment present.
  - Progress bar read **3 of 6 (50%)** on a fresh, never-saved area, and **4 of 6 (67%)** immediately after tagging a VIP guest — confirming the bucket design behaves as intended.
  - Suggested Activities reacted dynamically to VIP tag selection and Communication Style being set.
  - Structured Business Summary rendered the exact 7 required section headers with clean, flat-bullet Markdown.
  - **Save Discovery** succeeded; a fresh browser session (new login, new navigation) confirmed the saved selections and progress percentage persisted correctly in the database — the full read/write round trip works.
  - No console errors other than the benign pre-login `/api/auth/refresh` 400 that occurs on every page in this application, unrelated to this workspace.

---

## 10. Boundaries Confirmed Intact

- Zero staffing, scheduling, manpower, or execution-planning concepts introduced.
- Zero changes to any other Discovery workspace's code or data.
- Database change limited to the single approved `service_experience` JSONB column.
- API contract change is additive only (`serviceExperience` field alongside the existing optional payload fields); no existing endpoint behavior changed for other areas.
