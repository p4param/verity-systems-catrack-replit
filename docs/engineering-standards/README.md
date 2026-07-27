# Engineering Standards

This folder is the **single, authoritative home** for every Engineering Standard (ES-xxx) governing this repository. There is no other location — `docs/Governance/ES/` has been retired; its content was moved here during the docs/ repository migration (see `docs/project-governance/MIGRATION-LOG.md`).

## Why this exists

The repository is the single source of truth for engineering governance. AI conversations, chat sessions, and external notes (including the historical AG Brain) are working material only — never the permanent record. Every approved engineering decision that governs how this codebase is built must be captured here, not left to live only in chat history.

## How this applies to implementation work

- Every implementation, whether by a human or an AI assistant, is expected to comply with the standards in this folder.
- A new AI session should read these standards before making implementation decisions — see `docs/bootstrap/PROJECT-INITIALIZATION.md` for the full startup sequence.
- If a request conflicts with an engineering standard, that conflict should be surfaced and confirmed explicitly, not silently resolved either way.

## Index

| ID | Title | Maturity |
| :--- | :--- | :--- |
| ES-001 | Database Standards | Substantial |
| ES-002 | Presentation Standards | Stub — needs expansion |
| ES-003 | Runtime Controls | Stub — needs expansion |
| ES-004 | Platform Services | Stub — needs expansion |
| ES-005 | Runtime Manifest | Stub — needs expansion |
| ES-006 | Database Platform Engine | Stub — needs expansion |
| ES-007 | Runtime Execution Contracts | Stub — needs expansion |
| ES-008 | Architecture & Domain Modeling | Active |
| ES-009 | Data Ownership & Persistence Standard | Active |
| ES-010 | Platform Naming & Namespace Standard | Active |
| ES-011 | API Standards & Integration Standard | Active (migrated) |
| ES-012 | Testing & Quality Standards | Active (migrated) |
| ES-013 | Security Architecture Standard | Active (migrated) |
| ES-014 | Engineering Work Package Implementation Standard | Active |
| ES-015 | Engine Engineering Lifecycle Standard | Active |
| ES-016 | Work Package Lifecycle Documentation Standard | Active |
| ES-017 | AI Collaboration & Assisted Engineering Standard | Active (migrated) |

Several standards (ES-002 through ES-007) remain thin placeholder stubs from an earlier initialization pass. They are not obsolete — they're gaps. Expanding them is tracked in `docs/project-governance/FOLLOW-UP-GOVERNANCE-ITEMS.md`, not silently assumed to be someone else's job.
