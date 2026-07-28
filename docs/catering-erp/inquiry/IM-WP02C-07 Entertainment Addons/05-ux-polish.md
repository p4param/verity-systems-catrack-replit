# UX Polish: IM-WP02C-07 — Entertainment & Add-ons Discovery Workspace

**Document ID**: UX-POLISH-IM-WP02C-07
**Scope**: Final UX polish pass applied in direct response to `04-product-review.md`
**Constraint**: Business model, engineering, validation, API, metadata, persistence, and workflow were explicitly out of scope. One minimal, additive data-model field was introduced solely to let the new free-text field persist — see §1.1 and §2.

---

## 1. Refinements Applied

### 1.1 Strengthened the emotional close

Card 6 (Signature Guest Experience) keeps its existing priority chips (`signatureExperience` multi-select, `priorityExperience` single-select follow-up) unchanged, and gains one new, optional free-text field: **"In their own words — optional"**, capturing the memorable experience verbatim, in the same spirit as Service Experience's Hospitality Memory.

- New optional field: `signatureExperienceNotes?: string` on `EntertainmentExperienceConversation` — the one data-model addition in this pass, needed purely so the new UI field has somewhere to persist. No validation rule references it; `computeEntertainmentExperienceValidation` is unchanged.
- When populated, it now also appears in the Structured Business Summary's narrative: `... In their own words: "<verbatim text>"`. Confirmed live via browser.

### 1.2 Card 4 visual rhythm

Business Purpose, Technology Enhancements, and Venue Awareness — previously separated only by a thin `border-t` line — now each sit inside their own visually distinct, padded, background-tinted block (`bg-muted/10 rounded-xl p-4`) within the same single card. Business Purpose also gained the same eyebrow label treatment ("Business Purpose") the other two sub-sections already had, for visual symmetry. No card was split, no question was added, removed, or reordered, and the conversation flow is byte-for-byte identical.

### 1.3 Placeholder examples

| Location | Before | After |
| :--- | :--- | :--- |
| Card 2 — Genres to Avoid | "Specific genres to avoid (optional)..." | "e.g. heavy metal, extremely loud EDM, explicit lyrics..." |
| Card 3 — Other Guest Activities | "Other memorable guest activities (optional)..." | "e.g. a caricature artist, a mehndi/henna station, a live painter..." |
| Card 6 — In Their Own Words (new field) | *(new)* | 'e.g. "Everyone still talks about how the live band had the whole family dancing together."' |

Card 4's Venue Awareness notes placeholder was reviewed and left as-is — it was already concrete and specific.

### 1.4 Signature Guest Experience visual distinction

- Card container: `p-6 space-y-4` → `p-7 space-y-5`, plus `mt-2` for extra separation from Card 5 above it.
- Border and shadow deepened slightly: `border-primary/30` → `border-primary/35`, `shadow-xs` → `shadow-sm`.
- Main closing question text enlarged: `text-base` → `text-lg`; the accompanying Quote icon enlarged `w-4 h-4` → `w-5 h-5`.
- The new free-text section carries its own small Quote-icon accent, reinforcing the "this is the emotional pause" read.

---

## 2. Explicitly Not Changed

- No additional Background Entertainment option was added — the Product Review explicitly flagged this as a deliberate business-truth decision, not a gap to close for visual balance.
- No change to `computeEntertainmentExperienceValidation`.
- No change to `discovery/route.ts` — the new `signatureExperienceNotes` field flows through the existing generic object spread in `sanitizeEntertainmentExperience()` with zero route code changes.
- No new DB column or migration — the field is stored inside the existing `entertainment_addons` JSONB column.
- No change to any of the 6 card questions, option enum values, or conversation order.
- No change to the Business Discussion or Engineering Package documents (aside from their own lifecycle status lines — see `06-freeze.md`).

---

## 3. Verification

`npx tsc --noEmit`: identical pre-existing, unrelated errors only; zero new errors introduced by this pass.

### 3.1 Browser Validation

Live browser verification (headless Chrome via `playwright-core`, logged in as `admin@verity.com`):

- Card 4's three sub-sections render as distinct, spaced, background-tinted blocks — confirmed via screenshot.
- Card 6 renders with the enlarged quote text, deeper border/shadow, and the new "In their own words" textarea.
- Filled the new field, saved, reloaded in a fresh session — value persisted correctly.
- Confirmed the Structured Business Summary's Signature Experience section includes the verbatim quote when present.
- Both updated placeholders render correctly in Cards 2 and 3.

### 3.2 Non-functional Confirmation

- All 6 card questions, chip options, and enum values confirmed unchanged.
- `EntertainmentExperienceConversation`, `computeEntertainmentExperienceValidation`, the API route, and the database migration were not touched during this pass except the single additive field described in §1.1 — only `EntertainmentExperienceWorkspacePanel.tsx` and `discovery-types.ts` were edited.
- No new required fields, no new validation branches, no new endpoint behavior.

---

## 4. Outcome

All four refinements requested in response to the Product Review are complete. The workspace is ready to proceed to Freeze.
