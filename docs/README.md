# Catrack Documentation

**This repository is the single, authoritative source of truth for engineering governance, architecture, and project documentation.** AI conversations, chat sessions, and the historical AG Brain archive are working material only — never the permanent record. If a decision governs how this codebase is built, it belongs in one of the folders below, not only in chat history.

New to this repository, human or AI? Start at [`docs/bootstrap/PROJECT-INITIALIZATION.md`](bootstrap/PROJECT-INITIALIZATION.md) for the session startup sequence.

## Map

| Folder | What's there |
| :--- | :--- |
| [`engineering-standards/`](engineering-standards/) | The **only** home for ES-xxx Engineering Standards (database, API, testing, security, naming, lifecycle, AI collaboration, and more). Read `engineering-standards/README.md` first. |
| [`bootstrap/`](bootstrap/) | Platform onboarding and session startup sequence. |
| [`project-governance/`](project-governance/) | Charter (`AG-000`), the Development Boundary, tracked follow-up governance items, and the migration log. |
| [`architecture/`](architecture/) | System architecture: the CAP platform architecture, the CCP architecture blueprint, and the business domain glossary. |
| [`product/`](product/) | Product vision, experience framework, and Workspace-First design principles. |
| [`catering-erp/inquiry/`](catering-erp/inquiry/) | Per-Work-Package lifecycle documentation for the Inquiry module's Discovery workspaces (`01-business-discussion.md` through `06-freeze.md`), per `engineering-standards/ES-016-work-package-lifecycle-documentation.md`. |
| [`Platform-Engines/`](Platform-Engines/) | Per-engine (VS01–VS10) formal documentation: ADRs, blueprints, capability contracts, engineering work packages, and certification records. |
| [`Archive/`](Archive/) | Historical, non-authoritative material — retired stubs, superseded planning docs, and unbuilt-engine seed material. Preserved, never deleted. |
| [`Deployment/`](Deployment/) | Deployment/infrastructure documentation. |
| [`AI-Engineering/`](AI-Engineering/), [`Knowledge-Base/`](Knowledge-Base/) | Supplementary reference material. |

`PLATFORM_STATUS.md`, `ENGINEERING-LIBRARY.md`, `LIBRARY-GAPS.md`, and `ENGINES.md` (the CAP Platform Engine Registry) at this level track platform-wide status and known documentation gaps.

`APP-ADMIN-002-Product-Review.md` and `APP-ADMIN-002-Venue-Walkthrough.md` at this level are standalone review/walkthrough documents for the APP-ADMIN-002 feature — not yet folded into a folder structure.

`docs/Platform/` is a deprecated redirect notice only (its real content moved to `bootstrap/` and `architecture/` — see its `README.md`); `docs/_UNCLASSIFIED/` is currently empty. Both are candidates for removal in a future cleanup pass, not this one.

## The rule that governs all of the above

Every implementation — human or AI-assisted — is expected to comply with the standards in `engineering-standards/`. If a request conflicts with a standard, that conflict should be surfaced and confirmed explicitly, never resolved silently in either direction.

---

*Last restructured 2026-07-27 as part of the AG Brain → repository documentation migration. Full record: [`project-governance/MIGRATION-LOG.md`](project-governance/MIGRATION-LOG.md).*
