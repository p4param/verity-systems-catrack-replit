# Catrack Technical Runbook: CM-003 Authorization
**Catrack ERP Platform Component Specification (CM-003)**
**Document Version:** 1.0.0  
**Classification:** Core Platform Architecture  
**Status:** Approved Reference Standard  

---

## 1. Document Control & Metadata

*   **Component ID:** `CM-003`
*   **Component Name:** Authorization Engine
*   **Domain Owner:** Platform Core Architecture
*   **Target Scope:** Role-Based Access Control (RBAC), Permission Matrix Validation, Multi-Tenant Row-Level Security (RLS) enforcement, Branch Data Isolation.
*   **Target Audience:** Enterprise Software Engineers, Database Administrators, Security Compliance Auditors.

---

## 2. Objective & Functional Scope

The primary objective of `CM-003` is to implement the authorization engine that controls user access permissions, validates roles, and enforces data boundaries across all modules of the Catrack ERP platform.

### Functional Scope
*   **Role Management:** Defining, assigning, and updating authorization roles.
*   **Permission Verification:** Validating specific user permissions before granting access to resources.
*   **Company & Tenant Isolation:** Restricting data access to the user's active tenant domain.
*   **Branch Data Isolation:** Restricting users to data and warehouse records scoped to their assigned branch.
*   **Policy Constraints:** Checking dynamic access policies (e.g., checking credit limits or transaction thresholds based on roles).

---

## 3. Technical Architecture Expectations

The Authorization Engine must conform to the following architectural design:

```
                            AUTHORIZATION ROUTING PIPELINE
                            
                                Incoming API Request
                                         |
                                         v
                            +--------------------------+
                            |    JWT Claims Parsing    | --(Invalid JWT)--> Return 401 Unauthorized
                            +--------------------------+
                                         |
                                      (Valid)
                                         v
                            +--------------------------+
                            |    Tenant Context Check  | --(Mismatch)--> Return 403 Forbidden
                            |   (Validate tenantId)    |
                            +--------------------------+
                                         |
                                      (Passed)
                                         v
                            +--------------------------+
                            |  Permission Cache L1/L2  | --(Hit)--> Evaluate permissions
                            +--------------------------+
                                         |
                                      (Miss)
                                         v
                            +--------------------------+
                            | Database Fetch (Prisma)  | --(Save)--> Populate L2/L1 Cache
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |  Branch Isolation Guard  | --(Out of Scope)--> Return 403 Forbidden
                            +--------------------------+
                                         |
                                      (Passed)
                                         v
                                  Execute Route
```

*   **Data Isolation (Row-Level Security):** All database queries must automatically include `tenantId` and `branchId` filters to prevent cross-tenant data leaks.
*   **Implicit vs. Explicit Permissions:** The system uses explicit, code-based permission tokens (e.g., `INVENTORY_VIEW`, `EVENT_CREATE`). Roles map to groups of permission tokens.
*   **Granular Middleware Resolution:** The system uses middleware to check permissions at the routing boundary before API controllers are executed.

---

## 4. Domain Model & Boundaries

The Authorization Engine manages the following entities:

*   **Role:** Defines the role name, description, and status.
*   **Permission:** Defines individual permission codes (e.g., `ROLE_VIEW`, `USER_CREATE`).
*   **RolePermission:** Joins roles to permissions.
*   **UserRole:** Joins users to roles.

---

## 5. API Contract Specifications

All endpoints under `CM-003` must reside within the versioned `/api/v1/admin/roles/` namespace:

### 1. Assign Permissions to Role
*   **Route:** `POST /api/v1/admin/roles/:roleId/permissions`
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Payload:**
    ```json
    {
      "permissionIds": [
        "perm-uuid-1",
        "perm-uuid-2"
      ]
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "roleId": "role-uuid-123",
        "assignedCount": 2
      }
    }
    ```

### 2. Verify Action Scope
*   **Route:** `POST /api/v1/auth/verify-permission`
*   **Request Payload:**
    ```json
    {
      "permissionCode": "INVENTORY_MASTER_CREATE"
    }
    ```
*   **Success Response (200 OK - Authorized):**
    ```json
    {
      "success": true,
      "data": {
        "authorized": true,
        "scope": "BRANCH",
        "branchId": "branch-uuid-12"
      }
    }
    ```
*   **Error Response (403 Forbidden - Insufficient Permissions):**
    ```json
    {
      "success": false,
      "error": {
        "code": "ERR_AUTH_FORBIDDEN",
        "message": "You do not have the required permissions to perform this action."
      }
    }
    ```

---

## 6. Security & Authorization Policy

*   **Audit Logging:** Changes to roles or permissions must write to audit logs, recording the actor, timestamp, old state, and new state.
*   **Administrative Isolation:** Modifying roles and assigning permissions is restricted to the `ADMIN_ACCESS` permission scope.
*   **Tenant Separation:** Administrators can only modify roles and permissions within their active tenant context. Global roles are managed by system administrators.

---

## 7. Caching & Performance Guidelines

*   **Role and Permission Cache (L2):** User permissions are cached in Redis with a Time to Live (TTL) matching active access tokens (15 minutes).
*   **Cache Invalidation:** Modifying a user's roles or permissions must invalidate the user's permission cache in Redis, forcing a reload on their next request.

---

## 8. Implementation Phases & Execution Guidance

The implementation of `CM-003` is split into five phases:

```
[ Phase 1: Database Setup ] -> [ Phase 2: Core Guards ] -> [ Phase 3: Route Middleware ] -> [ Phase 4: Caching Integration ] -> [ Phase 5: Verification ]
* Create Role tables          * Build permission checker   * Write route guards          * Cache roles in Redis           * Write Vitest unit tests
* Run Prisma migrations        * Implement branch filters   * Configure API endpoints     * Set cache invalidations        * Run Playwright E2E checks
```

*   **Phase 1: Database Setup:** Define role, permission, and mapping tables in the database schemas. Run migrations.
*   **Phase 2: Core Guards Implementation:** Build the permission verification service and the branch data isolation filters.
*   **Phase 3: Route Middleware Integration:** Implement API middleware to check user permissions at the routing boundary.
*   **Phase 4: Caching Integration:** Implement the Redis caching layer for user permissions and hook invalidation events.
*   **Phase 5: Verification & Tests:** Write unit tests to check permission validations, and write E2E tests to verify tenant and branch isolation.

---

## 9. Quality Gates & Acceptance Criteria

Before code is merged into `main`, it must meet these criteria:

*   **✓ Compilation Check:** Running `npx tsc --noEmit` returns zero errors.
*   **✓ Quality Standards:** There are no `TODO` placeholders or mock variables in the source files.
*   **✓ Test Coverage:** Permission validation middleware and branch isolation guards must maintain at least **95% unit test coverage**.
*   **✓ Lint Auditing:** The project build passes ESLint checks without warnings.
*   **✓ Security Audit:** Verification tests must confirm that users cannot bypass branch filters or access other tenants' data.
