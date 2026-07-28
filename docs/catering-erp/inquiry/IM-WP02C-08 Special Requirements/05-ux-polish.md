# UX Polish: IM-WP02C-08 — Special Requirements Discovery Workspace

**Document ID**: UX-POLISH-IM-WP02C-08
**Scope**: Final UX polish pass applied in direct response to `04-product-review.md`
**Constraint**: Business Discussion, Engineering Package, data model, validation, persistence, API, progress calculation, and Discovery boundaries were explicitly out of scope and were not touched.

---

## 1. Refinements Applied

### 1.1 Card 2 opening question softened

| Location | Before | After |
| :--- | :--- | :--- |
| Card 2 — consultative opening | "Are there any health or medical considerations we should be aware of for the event?" | "Are there any health or wellbeing considerations we should be aware of for the event?" |

Copy-only. No change to the `HealthWellbeingConsiderationTag` enum, the card's option list, its free-text field, or `computeSpecialRequirementsValidation`.

### 1.2 Card 5 chip renamed

| Location | Before | After |
| :--- | :--- | :--- |
| Card 5 — chip label | "Venue Compliance Expectations" | "Venue Guidelines Shared" |

The underlying enum value (`VENUE_COMPLIANCE_EXPECTATIONS`) is unchanged — only the displayed label string changed. Meaning, persistence, and data shape are identical; the chip's toggle behavior and saved value are unaffected.

### 1.3 Insight Assistant badge — reviewed, not changed

Considered renaming "SPECIAL REQUIREMENTS" to "SPECIAL CONSIDERATIONS" per the Product Review's optional suggestion. Checked the actual badge text used by every sibling workspace (`Service Discovery`, `Decor Discovery`, `Entertainment Discovery`, `Commercial Discovery`, `Venue Discovery` — all following a `"[Topic] Discovery"` pattern) and found neither the current wording nor the suggested alternative matches that pattern. Since the suggested change would not have been a genuine consistency improvement, the badge was left unchanged, per the Product Review's own guidance to leave it as-is if not a clear win.

---

## 2. Explicitly Not Changed

- **Card 6 (Special Requests & Peace of Mind) was not touched** — wording, layout, visual treatment, quote styling, spacing, and the free-text conversation are approved exactly as implemented.
- No preference weighting introduced.
- No additional chips or accessibility/health/security/venue categories introduced.
- No change to `computeSpecialRequirementsValidation` — still zero mandatory fields.
- No change to `discovery/route.ts`, the database column, or any migration.
- No change to the narrative Structured Business Summary generation logic, the Suggested Activities trigger logic, or the Insight Assistant discussion tips.
- No change to progress calculation (still 6 optional-engagement buckets).
- No change to Discovery boundaries.
- No change to the Business Discussion or Engineering Package documents (aside from their own lifecycle status lines — see `06-freeze.md`).

---

## 3. Verification

`npx tsc --noEmit`: identical pre-existing, unrelated errors only; zero new errors introduced by this pass.

### 3.1 Browser Validation

Live browser verification (headless Chrome via `playwright-core`, logged in as `admin@verity.com`):

- Confirmed the old Card 2 wording ("health or medical considerations") is gone and the new wording ("health or wellbeing considerations") renders correctly.
- Confirmed the old chip label ("Venue Compliance Expectations") is gone and the new label ("Venue Guidelines Shared") renders correctly.
- Selected the renamed chip, saved, reloaded in a fresh session — the selection persisted correctly under its unchanged enum key.
- Card 6 visually and functionally unchanged — confirmed by inspection, no diff applied.

### 3.2 Non-functional Confirmation

- All 6 card questions (aside from the one approved wording change), chip options, and enum values otherwise confirmed unchanged.
- `SpecialRequirementsConversation`, `computeSpecialRequirementsValidation`, the API route, and the database migration were not touched during this pass — only `SpecialRequirementsWorkspacePanel.tsx` was edited, and only two label/copy strings within it.
- No new state variables, props, or component behavior were introduced.

---

## 4. Final UX Confirmation

Both refinements requested in response to the Product Review are complete and verified. Card 6 remains untouched as directed. The Insight Assistant badge was reviewed and deliberately left unchanged. The workspace is ready to proceed to Freeze.
