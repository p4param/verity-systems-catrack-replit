# UX Polish: IM-WP02C-06 — Service Experience Discovery Workspace

**Document ID**: UX-POLISH-IM-WP02C-06
**Scope**: Final UX polish pass applied in direct response to `04-product-review.md`
**Constraint**: Business Discussion, Engineering Package, Data Model, API, Validation, Persistence, and Conversation Flow were explicitly out of scope and were not touched.

---

## 1. Refinements Applied

### 1.1 Internal Sales Assessment — brought to parity with Budget & Commercial

The three confidence tiers now carry the identical supporting rationale text used in Budget & Commercial Discovery, plus the same introductory line:

> Internal salesperson win probability rating for CRM opportunity forecasting.

| Tier | Rationale text (verbatim, reused from Budget & Commercial) |
| :--- | :--- |
| High Confidence (High Win Probability) | "Client expectations & budget are strongly aligned; high likelihood to close." |
| Medium Confidence (Competitive Evaluation) | "Client is actively evaluating caterers; strong proposal & food tasting needed." |
| Exploratory / High Risk | "Early research stage or budget mismatch; follow up carefully." |

The selected-state visual treatment (ring, scale, color fill) was also aligned to Budget & Commercial's exact classes. No new field, no new option, no change to `SalesAssessmentConfidence` — only the options array gained a `desc` string and the JSX gained a second line per option.

### 1.2 Customer Language Polish

Placeholder text and workspace-level helper copy were reviewed and warmed where they read more operational than conversational. The six card questions and the Hospitality Memory prompt itself — the approved conversation flow — were **not** touched.

| Location | Before | After |
| :--- | :--- | :--- |
| Workspace header subtitle | "Discover the hospitality, guest care and service feel your event should have." | "Let's talk about the hospitality, care and feel you want your guests to experience." |
| Card 4 — Additional Notes placeholder | "Any unique guest requirements we should know about..." | "Share a little more about any guests who'd appreciate special thought from our team..." |
| Card 6 — Practical Notes placeholder | "Cultural etiquette, religious customs, restricted guest areas, photography sensitivity, security requirements..." | "Share any customs, sensitivities or practical details that would help our team prepare..." |
| Insight Assistant tip | "VIP and accessibility needs are context only — leave staffing and roster assignment to Operations." | "Treat VIP and accessibility notes as context for the team — staffing and rostering come later, with Operations." |

---

## 2. Explicitly Not Changed

- No "Optional" badges added to Cards 4–6.
- No change to the progress bar calculation (buckets, denominators, or percentage logic) — the progress discussion remains intentionally deferred to a future Discovery Framework enhancement after the Inquiry module is complete.
- No change to `computeServiceExperienceValidation`.
- No new fields, metadata, or enum values introduced.
- No change to the Business Discussion or Engineering Package documents (aside from their own lifecycle status lines — see `06-freeze.md`).

---

## 3. Verification

`npx tsc --noEmit`: identical 12 pre-existing, unrelated errors; zero new errors introduced by this pass.

### 3.1 Browser Validation

Live browser verification (headless Chrome via `playwright-core`, logged in as `admin@verity.com`, against the Corporate Gala inquiry):

- Internal Sales Assessment renders the intro paragraph and all 3 rationale lines; selecting a tier still toggles correctly with the expected visual state (ring, scale, color fill).
- Header subtitle, VIP Additional Notes placeholder, Practical Notes placeholder, and the Insight Assistant tip all render with the updated copy.
- Progress bar unchanged — still reads consistently with the bucket logic established during implementation.
- No console errors other than the benign, pre-existing `/api/auth/refresh` probe unrelated to this workspace.

### 3.2 Non-functional Confirmation

- All 6 card questions, the Hospitality Memory prompt, field labels, chip options, and option enum values confirmed byte-for-byte unchanged.
- `ServiceExperienceConversation`, `computeServiceExperienceValidation`, the API route, and the database migration were not touched during this pass — only `ServiceExperienceWorkspacePanel.tsx` was edited, and only its copy/options-array content, not its state or behavior.
- No new state variables, props, or component behavior were introduced.

---

## 4. Outcome

Both refinements requested in response to the Product Review are complete. The workspace is ready to proceed to Freeze.
