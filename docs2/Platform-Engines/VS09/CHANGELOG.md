# VS09 Notification Engine Engineering Changelog

All notable architectural additions, capability package implementations, and hardening releases for the **VS09 Communication & Notification Engine** are documented in this file.

---

## [v1.0.0] - 2026-07-22 — Baseline Release (BL-2026-001) & Permanent Engine Freeze

```
Baseline ID  : BL-2026-001
Git Tag      : vs09-v1.0
Commit SHA   : f196894
Status       : PERMANENTLY FROZEN
```

### Added (Capability Packages):
- **EWP-001**: Notification Template Aggregate (`CC-001`, `RIS-001`).
- **EWP-002**: Notification Channel Aggregate (`CC-002`, `RIS-002`).
- **EWP-003**: Notification Delivery Ledger Aggregate & 10-State Machine (`CC-003`, `RIS-003`).
- **EWP-004**: Notification Recipient Aggregate (`CC-004`, `RIS-004`).
- **EWP-005**: Provider Profile Aggregate (`CC-005`, `RIS-005`).
- **EWP-006**: Delivery Tracking Telemetry Aggregate (`CC-006`, `RIS-006`).

### Security & Hardening Packages:
- **v1.1.0 (HF-001)**: Remediated stdout token logging, omitted `refreshToken` from JSON response bodies, and enforced tenant pre-checks on all Event Master routes.
- **v1.2.0 (HF-002)**: Propagated identity fields (`user.sub` for `createdBy`/`updatedBy`/`deletedBy`), introduced `toCanonicalUuid` compatibility helper in `src/lib/auth/identity-uuid.ts`, and audited 20 event API routes for multi-tenant isolation.

### Governance Standards:
- Established **ES-015 Engine Engineering Lifecycle Standard** governing the 9-stage lifecycle for all current and future CAP platform engines (`VS01` through `VS11+`).

---

## Engineering Freeze Notice

`VS09 v1.0.0 (BL-2026-001)` is officially frozen under **AG-001**, **ES-014**, and **ES-015**. Future modifications require an approved Engineering Change Request (`ECR-2026-XXXX`) or Hotfix package (e.g. `HF-003+`).
