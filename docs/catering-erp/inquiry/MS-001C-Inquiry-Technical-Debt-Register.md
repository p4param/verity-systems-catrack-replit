# MS-001C — Inquiry Technical Debt Register

**Document ID**: MS-001C
**Module**: Catrack Catering ERP — Inquiry Management (`cat/inquiry`)
**Type**: Technical Debt Register (not a backlog, not a feature request list, not a bug report)

---

## 1. Purpose

This register records items that were explicitly identified, discussed, and **consciously deferred** during development of the Inquiry module — decisions the project made on purpose, not gaps that went unnoticed. It exists so those decisions remain visible and traceable, separate from the module's certification and closure records.

---

## 2. Classification

- **Platform** — affects shared infrastructure or conventions used beyond the Inquiry module.
- **Application** — affects Inquiry-specific behavior or UI within the module itself.
- **Documentation** — affects the completeness of the module's own documentation record.
- **Governance** — affects standards or process definitions the module relies on but does not own.

---

## 3. Technical Debt Register

| ID | Item | Category | Decision | Target Phase |
| :-- | :--- | :--- | :--- | :--- |
| TD-001 | DDS-001 (Discovery Design Standard) is cited by every Discovery Business Discussion but has never been authored as a standalone document. | Governance | Deferred — the pattern is followed consistently in practice; formal authoring was not undertaken during this module. | Unscheduled |
| TD-002 | Event Basics and Venue Discovery carry no ES-016 lifecycle documentation. | Documentation | Deferred — both predate ES-016 adoption; retroactive documentation was not undertaken during this module. | Unscheduled |
| TD-003 | Food & Beverage's (`IM-WP02C-03A`) Business Discussion document does not exist in this repository or any historical source searched. | Documentation | Deferred — recorded as a genuine historical gap rather than reconstructed or fabricated. | Unscheduled |
| TD-004 | The "Business Setup" navigation menu is fully hardcoded in the sidebar component rather than represented in the platform's navigation metadata. | Platform | Deferred — identified as a low-risk future migration candidate; no migration performed during this module. | Unscheduled |
| TD-005 | Service Experience's conversation-progress calculation can read below 100% for a legitimately complete, low-touch conversation, since optional cards only count once something is selected. | Application | Deferred at the time specifically until the Inquiry module was complete. | Post-Inquiry — precondition now met; not yet scheduled |
| TD-006 | Food & Beverage's validation badge reads "SYSTEM READY" where every other Discovery workspace reads "Discovery Ready." | Application | Deferred — noted as a cosmetic inconsistency, out of scope for any single Work Package. | Unscheduled |
| TD-007 | Event Basics and Venue Discovery use an older visual/interaction convention, distinct from the numbered-card convention used from Food & Beverage onward. | Application | Deferred — noted for future awareness during Service Experience's Product Review. | Unscheduled |

---

## 4. General Principles

- Every item in this register was **consciously deferred** — identified and discussed at the time it was found, not discovered after the fact.
- No known debt is intentionally omitted from this register.
- None of these items prevent Inquiry module certification. Each was evaluated at the time it was raised and judged not to block the Work Package or module it was found in.

---

## 5. Module Assessment

The Inquiry module is **production-ready within its approved scope**. The items in this register represent future improvement opportunities, not defects or blockers. Their resolution, if and when undertaken, is a separate decision outside the scope of this module's closure.
