# Catrack Technical Runbook: CM-010 Search Engine
**Catrack ERP Platform Component Specification (CM-010)**
**Document Version:** 1.0.0  
**Classification:** Core Platform Architecture  
**Status:** Approved Reference Standard  

---

## 1. Document Control & Metadata

*   **Component ID:** `CM-010`
*   **Component Name:** Search Engine
*   **Domain Owner:** Platform Core Architecture
*   **Target Scope:** Full-Text Search (FTS), Relevance Ranking, Query Tokenization, Multi-Entity Search Indexes, Search History Tracking.
*   **Target Audience:** Enterprise Software Engineers, Database Architects, QA Automation Engineers.

---

## 2. Objective & Functional Scope

The primary objective of `CM-010` is to implement a unified, global search engine that handles full-text queries, dynamic filtering, relevance ranking, and saved searches across all modules of the Catrack ERP platform.

### Functional Scope
*   **Full-Text Search:** Querying across multiple tables (e.g., customers, bookings, assets) using dynamic tokenization.
*   **Dynamic Filtering:** Applying filters based on categories, dates, and status fields.
*   **Relevance Ranking:** Ordering results by relevance using column weights (e.g., matching event numbers is weighted higher than matching remarks).
*   **Search History & Saved Searches:** Saving search queries and preferences per user.

---

## 3. Technical Architecture Expectations

The Search Engine must conform to the following architectural design:

```
                            GLOBAL SEARCH EXECUTION PIPELINE
                            
                               Search Request (User Query)
                                         |
                                         v
                            +--------------------------+
                            |     Tokenize Query       |
                            | (Parse search keywords)  |
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |     L1/L2 Redis Cache      | --(Hit)--> Return Search Results
                            +--------------------------+
                                         |
                                      (Miss)
                                         v
                            +--------------------------+
                            | Read Replica Query Exec  |
                            |  (tsquery / tsvector)    |
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |  Relevance Weighting     |
                            | (Apply rank calculation) |
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |   Tenant Scoping Guard   | --(Failed checks)--> Return 403
                            +--------------------------+
                                         |
                                      (Passed)
                                         v
                                  Returned Results
```

*   **Database Search Technology:** PostgreSQL full-text search is used, utilizing `tsvector` document columns and `tsquery` search syntax.
*   **Index Updates:** The `tsvector` columns are updated automatically using database triggers upon row updates to ensure search results are up to date.
*   **Read Replica Routing:** Search queries run against read replicas to protect primary database performance during active transaction hours.

---

## 4. Domain Model & Boundaries

The Search Engine manages these entities:

*   **SearchIndexDocument:** Stores aggregated document strings, search vectors (`tsvector`), and reference IDs.
*   **SavedSearch:** Stores query filters, category tags, and user IDs.
*   **SearchAuditLog:** Tracks search history, timestamps, and result counts per user.

---

## 5. API Contract Specifications

All endpoints under `CM-010` must reside within the versioned `/api/v1/search/` namespace:

### 1. Execute Global Search
*   **Route:** `GET /api/v1/search`
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Query Parameters:** `q` (query keywords), `modules` (comma-separated list, optional), `limit`.
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "query": "Wedding Banquet",
        "results": [
          {
            "id": "result-uuid-1",
            "module": "EVENTS",
            "title": "Wedding Banquet for John Doe",
            "referenceId": "event-uuid-1234",
            "relevanceRank": 0.95
          }
        ]
      }
    }
    ```

### 2. Save Search Query
*   **Route:** `POST /api/v1/search/saved`
*   **Request Payload:**
    ```json
    {
      "name": "Active Wedding Events",
      "queryParams": "?modules=EVENTS&status=CONFIRMED&q=wedding"
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "savedSearchId": "saved-search-uuid-123"
      }
    }
    ```

---

## 6. Security & Authorization Policy

*   **Access Verification:** Search results must check the user's role permissions. Items originating from modules the user cannot access are filtered out of results.
*   **Tenant Scoping:** Every search query must automatically append `tenantId` parameters to database requests, maintaining tenant isolation.

---

## 7. Caching & Performance Guidelines

*   **Search Results Cache (L1):** Frequent search queries and results are cached in Redis with a short Time to Live (TTL) of **5 minutes** to prevent redundant database load.
*   **Pre-Compiled Indexes:** Search index tables are separate from transactional tables, ensuring full-text search operations do not degrade write performance.

---

## 8. Implementation Phases & Execution Guidance

The implementation of `CM-010` is split into five phases:

```
[ Phase 1: DB Index Setup ] -> [ Phase 2: Query Parser ] -> [ Phase 3: Search APIs ] -> [ Phase 4: Cache Engine ] -> [ Phase 5: Verification ]
* Configure tsvector schema    * Build tsquery parser        * Implement search routes     * Configure Redis L1 cache    * Write Vitest unit tests
* Create database triggers     * Implement rank weighting    * Implement saved searches    * Hook index updates          * Run Playwright E2E checks
```

*   **Phase 1: DB Index Setup:** Define full-text search columns and database triggers in the schema. Run migrations.
*   **Phase 2: Query Parser Implementation:** Build the query parser, configure the rank weighting service, and set up read replica query routing.
*   **Phase 3: Search APIs Setup:** Implement REST API paths for global search and saved search operations.
*   **Phase 4: Cache Engine Integration:** Implement the Redis caching layer and hook database trigger updates to refresh search indexes.
*   **Phase 5: Verification & Tests:** Write unit tests to check query parsing, and write E2E tests to verify search filtering and tenant boundaries.

---

## 9. Quality Gates & Acceptance Criteria

Before code is merged into `main`, it must meet these criteria:

*   **✓ Compilation Check:** Running `npx tsc --noEmit` returns zero errors.
*   **✓ Quality Standards:** There are no `TODO` placeholders or mock variables in the source files.
*   **✓ Test Coverage:** The query parser and search ranking helpers must maintain at least **90% unit test coverage**.
*   **✓ Lint Auditing:** The project build passes ESLint checks without warnings.
*   **✓ Security Audit:** Verification tests must confirm that users cannot access other tenants' documents or run searches outside their permitted modules.
