# Catrack Technical Runbook: CM-015 Rules Engine
**Catrack ERP Platform Component Specification (CM-015)**
**Document Version:** 1.0.0  
**Classification:** Core Platform Architecture  
**Status:** Approved Reference Standard  

---

## 1. Document Control & Metadata

*   **Component ID:** `CM-015`
*   **Component Name:** Rules Engine
*   **Domain Owner:** Platform Core Architecture
*   **Target Scope:** Metadata-driven Rules Repository, Expression Parsing Evaluator, Dynamic Execution Context, Rules Simulation, Version Control, Execution Audits.
*   **Target Audience:** Enterprise Software Engineers, Business Analysts, QA Automation Engineers.

---

## 2. Objective & Functional Scope

The primary objective of `CM-015` is to implement a unified, metadata-driven rules engine that evaluates dynamic formulas, validations, pricing rules, approvals, and workflows without requiring database schema changes or source code deployments.

### Functional Scope
*   **Expression Evaluation:** Parsing formulas and evaluating logical conditions using dynamic JSON schemas.
*   **Execution Context Validation:** Injecting data variables into the evaluation pipeline.
*   **Rule Simulation:** Enabling administrators to test and simulate rule outcomes.
*   **Version Control:** Archiving historical versions when rules are updated.
*   **Execution Audits:** Logging evaluation inputs, executed paths, and outputs.

---

## 3. Technical Architecture Expectations

The Rules Engine must conform to the following architectural design:

```
                            RULES EVALUATION FLOW
                            
                               Evaluation Request (Context)
                                         |
                                         v
                            +--------------------------+
                            |     Get Active Rule      |
                            | (Verify active version)  |
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |    L1/L2 Redis Cache     | --(Hit)--> Return Compiled Rule Schema
                            +--------------------------+
                                         |
                                      (Miss)
                                         v
                            +--------------------------+
                            | Database Fetch (Prisma)  | --(Save)--> Populate Cache
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |    Compile Context       |
                            | (Inject request data)    |
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |  Rule Evaluator Engine   |
                            | (Evaluate AST/Expressions)
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |    Write Audit Trail     |
                            | (Log evaluation details) |
                            +--------------------------+
                                         |
                                         v
                                  Returned Outcome
```

*   **Abstract Syntax Tree (AST) Evaluator:** The engine parses JSON-based rule rules into an AST, executing evaluations securely without using unsafe Javascript string evaluation functions (e.g., `eval()`).
*   **Explicit Context Variables:** Rules define required input parameters in their schemas, and the evaluation handler verifies that the request context includes these variables.

---

## 4. Domain Model & Boundaries

The Rules Engine manages these entities:

*   **RuleDefinition:** Stores rule metadata, codes, schemas, active version numbers, and parent categories.
*   **RuleVersion:** Stores JSON rule definitions, variables schemas, creator references, and version numbers.
*   **RuleExecutionAudit:** Stores execution timestamps, input contexts, matched rules, and output variables.

---

## 5. API Contract Specifications

All endpoints under `CM-015` must reside within the versioned `/api/v1/rules/` namespace:

### 1. Evaluate Rule
*   **Route:** `POST /api/v1/rules/:ruleCode/evaluate`
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Payload:**
    ```json
    {
      "context": {
        "eventCost": 5000,
        "depositAmount": 1000,
        "daysUntilEvent": 45
      }
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "result": {
          "passed": true,
          "requiredDepositPercentage": 20,
          "isApprovalRequired": false
        },
        "auditLogId": "audit-uuid-1234"
      }
    }
    ```

### 2. Simulate Rule Run
*   **Route:** `POST /api/v1/rules/:ruleCode/simulate`
*   **Request Payload:**
    ```json
    {
      "ruleJson": {
        "conditions": [
          { "field": "eventCost", "operator": "GREATER_THAN", "value": 10000 }
        ],
        "outcomes": { "isApprovalRequired": true }
      },
      "context": { "eventCost": 15000 }
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "simulationResult": {
          "passed": true,
          "outcomes": { "isApprovalRequired": true }
        }
      }
    }
    ```

---

## 6. Security & Authorization Policy

*   **Access Scopes:** Modifying rules and running simulations requires the `RULES_MANAGE` permission scope. Running rule evaluations is open to internal system actions.
*   **Data Scoping:** Every rule definition and execution log must include the `tenantId` parameter, enforcing tenant isolation.

---

## 7. Caching & Performance Guidelines

*   **L2 Caching:** Active rule configurations are cached in Redis with a Time to Live (TTL) of **24 hours**.
*   **Cache Invalidation:** Activating a new rule version invalidates the cached rule in Redis, forcing a reload on the next request.

---

## 8. Implementation Phases & Execution Guidance

The implementation of `CM-015` is split into five phases:

```
[ Phase 1: Database Setup ] -> [ Phase 2: AST Evaluator ] -> [ Phase 3: Rule APIs ] -> [ Phase 4: Cache Engine ] -> [ Phase 5: Verification ]
* Create Rules tables        * Build AST condition parser * Implement evaluate routes * Cache active rules in Redis * Write Vitest unit tests
* Run Prisma migrations        * Implement context checks    * Implement simulation routes * Hook invalidation triggers  * Run Playwright E2E checks
```

*   **Phase 1: Database Setup:** Define rule, version, and execution audit log tables in the database schemas. Run migrations.
*   **Phase 2: AST Evaluator Implementation:** Build the secure JSON expression parser and context validation helpers.
*   **Phase 3: Rule APIs Setup:** Implement REST API paths for evaluating rules and running simulations.
*   **Phase 4: Cache Engine Integration:** Implement the Redis caching layer, hook cache invalidations, and configure audit logging.
*   **Phase 5: Verification & Tests:** Write unit tests to check AST evaluation logic, and write E2E tests to verify simulations and version rollbacks.

---

## 9. Quality Gates & Acceptance Criteria

Before code is merged into `main`, it must meet these criteria:

*   **✓ Compilation Check:** Running `npx tsc --noEmit` returns zero errors.
*   **✓ Quality Standards:** There are no `TODO` placeholders or mock variables in the source files.
*   **✓ Test Coverage:** The AST condition parser and evaluation helper must maintain at least **95% unit test coverage**.
*   **✓ Lint Auditing:** The project build passes ESLint checks without warnings.
*   **✓ Security Audit:** Verification tests must confirm that evaluation requests cannot bypass validations or access other tenants' data.
# Catrack Technical Runbook & Specification (CM-015 Rules Engine) completed successfully.
