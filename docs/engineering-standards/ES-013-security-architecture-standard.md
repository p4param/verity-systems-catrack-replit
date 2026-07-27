# ES-013 — Security Architecture Standard

**Standard ID:** ES-013

**Title:** Security Architecture Standard

**Status:** Active

**Applies To:** All Catering ERP platform and application-layer engineering

**Owner:** Product Engineering

**Source Lineage:** Migrated from AG Brain `catrack_security_architecture.md` (originally "Catrack Security Architecture Blueprint, CPP-007") as part of the docs/ repository migration. Content preserved; reformatted to the ES-0xx standard template. See `docs/project-governance/MIGRATION-LOG.md`.

> [!NOTE]
> ES-014 already references ES-013 in its Engineering Preflight checklist, confirming this numbering slot was anticipated ahead of this migration. Specific numeric claims below (token lifespans, failed-login lockout thresholds, etc.) should be verified against the actual auth implementation before being treated as currently-enforced behavior rather than target policy.

---

## 1. Vision & Security Philosophy

The Catrack ERP Platform holds sensitive enterprise, transactional, and personal data. The security architecture is built on the **Zero Trust Principle** — never trust, always verify.

### Core Security Objectives
- **Security by Design:** Security controls are integrated directly into the platform architecture, not applied as an afterthought.
- **Multi-Tenant Isolation:** Enforce isolation to prevent cross-tenant data leaks.
- **OWASP Compliance:** Implement controls to protect against the OWASP Top 10.
- **Auditability:** Maintain an immutable record of data mutations, logins, and permission changes.

---

## 2. Authentication Architecture

The platform uses a centralized, token-based authentication service to verify user identity.

**Token-Based Sessions**
- Authentication issues stateless JSON Web Tokens (JWT) containing cryptographically signed user claims.
- Tokens are stored in the client browser using `HttpOnly`, `Secure`, and `SameSite=Strict` cookies to protect against XSS/CSRF.
- Access tokens are short-lived (15 minutes); refresh tokens are long-lived (7 days) and stored securely to manage active sessions.

**Multi-Factor Authentication (MFA)**
- Mandatory for roles with elevated permissions (system administrators, billing managers).
- Uses TOTP compliant with RFC 6238.

---

## 3. Authorization & Access Control (RBAC)

Role-Based Access Control enforces the Principle of Least Privilege.

| Role | Domain Scope | Allowed Action Permissions | Access Scope |
| :--- | :--- | :--- | :--- |
| Admin | System | All actions (`USER_CREATE`, `PERM_UPDATE`, etc.) | Cross-Branch |
| Events Manager | Events | `INVENTORY_VIEW`, `EVENT_CREATE`, `EVENT_UPDATE` | Branch-specific |
| Fleet Driver | Fleet | `FLEET_VIEW`, `TRIP_UPDATE` (assigned runs only) | Individual |
| Billing Specialist | Finance | `LAUNDRY_VENDOR_BILLING_VIEW`, `PAYMENT_CREATE` | Tenant-wide |

**Scope Verification Guards**
- **Tenant Guard:** Requests are checked to ensure the user's `tenantId` matches the record's `tenantId`.
- **Branch Guard:** Users assigned to specific branches are restricted to branch-scoped data.

---

## 4. Data Cryptography & Key Management

- **Data in Transit:** TLS 1.3 for all public HTTP endpoints; unencrypted HTTP redirects to HTTPS at the edge/proxy layer.
- **Data at Rest:** Databases and storage buckets use AES-256 encryption.
- **Field-Level Encryption:** Sensitive PII is encrypted before database writes.
- **Secrets Management:** API keys, database credentials, and session secrets are managed via environment variables, injected at container/process startup, never committed to the repository.

---

## 5. Multi-Tenant Data Isolation

- **Logical Partitioning:** Database tables scope records using a `tenantId` column.
- **Query Filtering:** Query builders automatically append `tenantId` filters to database requests.
- **Database Constraints:** Many-to-many join tables use composite primary keys including `tenantId` to keep relationships within the tenant boundary.

---

## 6. Immutable Auditing & Observability

- **Immutable Logs:** Audit tables are write-only; database permissions block update/delete on these tables.
- **Audit Payload:** Every mutation log captures the actor's user ID, IP/device fingerprint, timestamp, entity name and record ID, and a JSON diff of old vs. new values.
- **Security Alert Triggers:** High-severity events (failed MFA logins, privilege changes) generate active alerts.

---

## 7. Security Control Matrix

| Vulnerability Type | System Threat Context | Core Architecture Mitigation Control |
| :--- | :--- | :--- |
| SQL Injection | SQL input manipulation in search filters | Parameterized Prisma queries only; raw SQL prohibited |
| XSS | Script injection in client input fields | Server-side sanitization + Next.js auto-escaping |
| CSRF | State mutations triggered via external sites | `SameSite=Strict` cookies + CSRF tokens for mutating requests |
| Broken Auth | Weak passwords, compromised sessions | Password complexity rules + MFA for admin roles |
| Data Exposure | Leaking PII | Encrypt PII at the database layer; mask in UI views |
| Rate Throttling | DoS / login guessing | Request limiting at the edge layer; account lockout after repeated failed attempts |
