# ES-012 — Testing & Quality Standards

**Standard ID:** ES-012

**Title:** Testing & Quality Standards

**Status:** Active

**Applies To:** All Catering ERP engineering work (application code and platform engines)

**Owner:** Product Engineering

**Source Lineage:** Migrated from AG Brain `catrack_testing_and_quality_standards.md` (originally "Catrack Testing & Quality Standards Handbook, CPP-009") as part of the docs/ repository migration. Content preserved; reformatted to the ES-0xx standard template. See `docs/project-governance/MIGRATION-LOG.md`.

---

## 1. Vision & Quality Philosophy

The Catrack ERP Platform requires high reliability to support critical business operations. The testing strategy is built on **Automation First** and **Zero Regression** principles.

### Core Quality Objectives
- **Prevent Regressions:** Run automated tests on every code change.
- **High Test Coverage:** Maintain test coverage on core business logic.
- **Realistic End-to-End Testing:** Validate multi-tenant data isolation and complex workflows using simulated user tests.
- **Continuous Compliance:** Integrate security, performance, and accessibility scanning into the build pipeline.

---

## 2. Quality Gates Matrix

Before code can be merged into production, it must pass through four quality gates:

```
[ Developer Workspace ]
        |
 (Pre-Commit / Push) -> Linter, Formatting, Local tsc check
        v
 [ Pull Request (CI) ]
        |
 (CI Build pipeline) -> Unit & Integration tests, Coverage audit
        v
 [ Staging Environment ]
        |
 (Playwright E2E) -> Multi-tenant E2E tests, Accessibility scans
        v
 [ Production ] -> Zero-downtime rolling deployment
```

| Gate | Validation Target | Mandatory Threshold | Failure Action |
| :--- | :--- | :--- | :--- |
| Pre-Commit | Formatting & Linting | Zero ESLint warnings; Prettier formatted | Block commit |
| Pre-Push | Local Type Checking | `tsc --noEmit` must pass | Block push |
| Pull Request (CI) | Unit & Integration Tests | 100% pass rate; >80% code coverage | Block merge |
| Release (Staging) | E2E & Accessibility | Playwright workflows pass; WCAG AA compliance | Block deployment |

---

## 3. Unit Testing Strategy

- **Framework:** Jest (or Vitest).
- **Target Scope:** Pure utilities, date formatters, validation helpers, isolated services.
- **Mocking Policy:** External dependencies (database connections, storage APIs) must be mocked using standard mock providers.
- **Coverage Mandate:** Core calculation engines (costing, billing validation, tax calculation services) must maintain 95% unit test coverage.

---

## 4. Integration Testing Strategy

- **API Verification:** Integration tests run HTTP requests against API endpoints to verify input validation (Zod schemas), authorization checks, and database updates.
- **Database Integration:** Integration tests run mutations against a dedicated, local test database container to verify Prisma updates.
- **Test Isolation:** Database state is reset between test runs via transactional rollbacks or truncation.

---

## 5. End-to-End (E2E) Testing Strategy

- **Framework:** Playwright.
- **Focus Areas:** Critical user workflows — lead generation/quote conversion, event scheduling and role assignments, dispatch/return/invoice-matching flows.
- **Multi-Tenant Validation:** E2E scripts log in with distinct tenant credentials and verify Tenant A cannot access Tenant B's data.

---

## 6. Accessibility & Security Testing

- **Accessibility Scanning:** Playwright tests integrate axe-core; core forms/pages must return zero critical accessibility violations.
- **Vulnerability Scanning:** Automated security checks run on every build (`npm audit`, Snyk, or equivalent).
- **Data Masking Validation:** Personal customer details (PII) must be masked on user screens unless explicitly authorized.

---

## 7. Performance & Load Testing

- **Query Checks:** Monitor database execution times; flag queries exceeding 100ms.
- **Simulated Traffic Checks:** Load testing simulates concurrent user actions to verify system stability under load.

---

## 8. Continuous Integration & Pipeline Automation

- All checks run automatically in the CI/CD pipeline on pull request submission.
- Build artifacts are packaged into versioned, immutable container images; the same image is used for testing, staging, and production.
