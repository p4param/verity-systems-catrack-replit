# ES-011 — API Standards & Integration Standard

**Standard ID:** ES-011

**Title:** API Standards & Integration Standard

**Status:** Active

**Applies To:** All Catering ERP API routes and external integrations

**Owner:** Product Engineering

**Source Lineage:** Migrated from AG Brain `catrack_api_standards_and_integration_guide.md` (originally "Catrack ERP Platform API Engineering Constitution, CPP-006") as part of the docs/ repository migration. Content preserved; reformatted to the ES-0xx standard template. See `docs/project-governance/MIGRATION-LOG.md`.

> [!NOTE]
> This standard describes REST/versioning conventions as originally specified. Verify actual route conventions in `src/app/api/**` before treating any specific detail (e.g. the `/api/v1/` version prefix) as binding — the live codebase's `src/app/api/cat/...` routes do not currently use a version segment. Where this standard and the live implementation diverge, the live implementation is not automatically wrong, but the divergence should be resolved deliberately (either update the routes or amend this standard), not left silently inconsistent.

---

## 1. Vision & API Philosophy

The Catrack ERP Platform uses an API-First design model. All services are implemented as stateless backend controllers, ensuring consistency, reliability, and security across all entry points.

### Core Objectives
- **Stateless Execution:** API endpoints must remain stateless. Sessions are managed using JSON Web Tokens (JWT) passed in client headers.
- **REST Conventions:** All endpoints must adhere to standard REST design principles, utilizing correct HTTP verbs and resource paths.
- **Self-Documenting API:** Every API route must expose standard metadata schemas, generating live interactive documentation via the OpenAPI specification.
- **Deterministic Contract:** Response envelopes, pagination parameters, and error blocks must return consistent formats.

---

## 2. API Routing & Versioning Standard

- **Versioning:** All API routes must be versioned to prevent breaking updates for active integrations and mobile applications. The version prefix is required at the root segment of the path (e.g., `/api/v1/`).
- **Path Structure:** Resource paths must use lowercase, kebab-case naming. Paths use plural noun names followed by dynamic ID segments.

| Operation | Path Pattern | Target Context |
| :--- | :--- | :--- |
| List Resources | `GET /api/v1/events` | Scoped collection query |
| Get Single | `GET /api/v1/events/[id]` | Single record fetch |
| Create Resource | `POST /api/v1/events` | Write new record |
| Update Resource | `PUT /api/v1/events/[id]` | Edit existing record |
| Delete Resource | `DELETE /api/v1/events/[id]` | Soft-delete record |

---

## 3. Request Payload & Validation

- **Content Types:** Payload request parameters must use `application/json` format.
- **Mandatory Validation:** Every incoming request body must be validated against a strict Zod schema before processing. Failing validations must immediately return a `400 Bad Request` status containing inline field errors.
- **Query Parameters:** Filter options, paging, and sorting parameters must pass type validation before execution.

---

## 4. Response Envelope Standard

To ensure client components can parse responses consistently, all API endpoints must wrap payloads in a standard envelope.

**Success Response** — a `200 OK` (or `201 Created`) status containing:
- `success`: `true`
- `data`: the main payload
- `meta`: (optional) pagination metadata for list queries

**Error Response** — a standard error block containing:
- `success`: `false`
- `error`: an object specifying the error `message`, a developer-friendly `code`, and optional field-level `details`

---

## 5. Query Standards: Pagination, Sorting & Filtering

**Pagination**
- Offset pagination for small, static datasets (configurations, lookup lists) — `page` (default: 1), `limit` (default: 50, max: 100).
- Cursor-based pagination is mandatory for high-volume transactional logs (stock movements, audit logs) — `cursor` (UUID of the last record), `limit`.

**Sorting** — `sortBy` (column name), `sortOrder` (`asc`/`desc`). Default: `createdAt` descending.

**Filtering** — filters pass as query parameters prefixed by field name (e.g. `statusId=conf-123`).

---

## 6. Error Handling & HTTP Status Codes

| HTTP Status | Semantic Rationale | Action Context |
| :--- | :--- | :--- |
| 200 OK | Request completed successfully | Successful fetch, update, or delete |
| 201 Created | New resource created successfully | Successful record creation |
| 400 Bad Request | Payload failed validation checks | Invalid input fields or values |
| 401 Unauthorized | Authentication token missing or expired | Expired user session |
| 403 Forbidden | User lacks permission to perform the action | Insufficient authorization scope |
| 404 Not Found | Requested resource does not exist | Invalid ID parameter |
| 429 Too Many Requests | Client exceeded their rate limit | API throttle limit reached |
| 500 Internal Error | Unexpected server error | Database timeout or unhandled exception |

---

## 7. Security, Authorization & Rate Limiting

- **JWT Authentication:** Client requests send a bearer token in the `Authorization` header (`Authorization: Bearer <JWT>`).
- **Access Scopes:** Permissions are matched to user roles. Endpoints must verify permissions before running operations (e.g., requiring `INVENTORY_MASTER_CREATE` for POST queries under `/api/v1/masters/`).
- **Rate Throttling:** Public API endpoints implement rate limiting. Throttle headers return remaining request counts: `X-RateLimit-Limit`, `X-RateLimit-Remaining`.

---

## 8. OpenAPI Specifications & Documentation

- The API compiles and serves an OpenAPI-compliant JSON file (`openapi.json`) exposed under `/api/docs/`.
- Administrative developer portals read this JSON file to render interactive Swagger consoles.

---

## 9. Enterprise Integration Patterns (Webhooks)

- **Event Publisher:** Major transactional state changes (e.g., `event.status.confirmed`) trigger webhook payloads sent to registered subscriber URLs.
- **Webhook Payload Structure:** A consistent JSON payload containing the event UUID, event code, tenant ID, creation timestamp, and target resource snapshot.
- **Retry Policy:** Failing subscriber responses (non-`2xx`) are queued for retry with exponential back-off, up to 5 attempts over 24 hours, then logged as failed.
