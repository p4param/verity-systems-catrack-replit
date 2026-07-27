# Catrack Technical Runbook: CM-017 Business Rules & Formula Engine
**Catrack ERP Platform Component Specification (CM-017)**
**Document Version:** 1.0.0  
**Classification:** Core Platform Architecture  
**Status:** Approved Reference Standard  

---

## 1. Document Control & Metadata

*   **Component ID:** `CM-017`
*   **Component Name:** Business Rules & Formula Engine
*   **Domain Owner:** Platform Core Architecture
*   **Target Scope:** Mathematical Formula Compiling, Parameter Binding, Pricing/Costing calculations, Tax engines, Formula simulations, Version Control, Execution Audits.
*   **Target Audience:** Enterprise Software Engineers, Financial Analysts, QA Automation Engineers.

---

## 2. Objective & Functional Scope

The primary objective of `CM-017` is to implement a centralized, math-focused formula engine that compiles algebraic expressions, binds parameter variables, runs pricing calculations (pricing, costing, taxes, discounts, commissions), and logs execution details across all modules of the Catrack ERP platform.

### Functional Scope
*   **Algebraic Expression Parsing:** Parsing mathematical formula strings (e.g., `(basePrice + markup) * (1 - discountRate)`) using abstract syntax trees (AST).
*   **Dynamic Variable Binding:** Injecting dynamic transaction parameters (like quantities, cost values) into formula evaluations.
*   **Predefined Math Library:** Supporting standard mathematical functions (e.g., `ROUND`, `CEIL`, `FLOOR`, `MAX`, `MIN`).
*   **Taxation & Discount Engines:** Providing modular, reusable components for financial operations.
*   **Formula Simulations:** Testing formulas with sample input parameters.

---

## 3. Technical Architecture Expectations

The Formula Engine must conform to the following architectural design:

```
                            FORMULA EVALUATION FLOW
                            
                               Calculation Request (Formula Code)
                                         |
                                         v
                            +--------------------------+
                            |     Get Active Formula   |
                            | (Verify active version)  |
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |    L1/L2 Redis Cache     | --(Hit)--> Return Compiled AST Layout
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
                            |  Context Parameter Bind  |
                            | (Inject variables checks)|
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |     AST Math Evaluator   |
                            |  (Run numeric parsing)   |
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |     Post-Calculation     |
                            |    (Rounding/Formatting) |
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |    Execution Audit Log   |
                            +--------------------------+
```

*   **Custom Tokenizer & Parser:** The formula engine must use a safe mathematical parser to tokenize, build, and execute the AST, preventing the use of unsafe `eval()` executions.
*   **Type Constraints:** The engine accepts only numeric input parameters (floats/integers) and returns numeric output parameters, ensuring type safety.

---

## 4. Domain Model & Boundaries

The Formula Engine manages the following entities:

*   **FormulaDefinition:** Stores formula metadata, codes, variable definitions, and active version numbers.
*   **FormulaVersion:** Stores formula strings, AST mappings, round definitions, and creator references.
*   **FormulaExecutionLog:** Stores execution timestamps, input parameters, result values, and execution duration metrics.

---

## 5. API Contract Specifications

All endpoints under `CM-017` must reside within the versioned `/api/v1/formulas/` namespace:

### 1. Calculate Formula Output
*   **Route:** `POST /api/v1/formulas/:formulaCode/calculate`
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Request Payload:**
    ```json
    {
      "parameters": {
        "basePrice": 1200,
        "markup": 150,
        "discountRate": 0.1
      }
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "result": 1215,
        "roundedResult": 1215.00,
        "logId": "formula-log-uuid-1234"
      }
    }
    ```

### 2. Simulate Formula Run
*   **Route:** `POST /api/v1/formulas/:formulaCode/simulate`
*   **Request Payload:**
    ```json
    {
      "formulaString": "(cost + freight) * (1 + margin)",
      "parameters": {
        "cost": 800,
        "freight": 50,
        "margin": 0.2
      }
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "simulationResult": 1020
      }
    }
    ```

---

## 6. Security & Authorization Policy

*   **Access Scopes:** Modifying formulas and running simulations requires the `FORMULAS_MANAGE` permission scope. Requesting formula calculations is open to internal system actions.
*   **Tenant Isolation:** Every formula definition and execution log must include the `tenantId` parameter, enforcing tenant isolation.

---

## 7. Caching & Performance Guidelines

*   **L2 Caching:** Formula AST representations and definitions are cached in Redis with a Time to Live (TTL) of **24 hours**.
*   **Cache Invalidation:** Activating a new formula version invalidates the cached formula in Redis, forcing a rebuild on the next request.

---

## 8. Implementation Phases & Execution Guidance

The implementation of `CM-017` is split into five phases:

```
[ Phase 1: Database Setup ] -> [ Phase 2: AST Compiler ] -> [ Phase 3: APIs Setup ] -> [ Phase 4: Cache Integration ] -> [ Phase 5: Verification ]
* Create Formula tables      * Build tokenizer parser     * Implement calculate routes * Cache AST mappings in Redis * Write Vitest unit tests
* Run Prisma migrations        * Implement rounding library * Implement simulate routes  * Hook invalidation triggers  * Run Playwright E2E checks
```

*   **Phase 1: Database Setup:** Define formula definition, version, and execution log tables in the database schemas. Run migrations.
*   **Phase 2: AST Compiler Implementation:** Build the custom tokenizer parser, configure input parameter checks, and implement the rounding library.
*   **Phase 3: APIs Setup:** Implement REST API paths for evaluating calculations and running simulations.
*   **Phase 4: Cache Integration:** Implement the Redis caching layer, hook cache invalidations, and configure audit logging.
*   **Phase 5: Verification & Tests:** Write unit tests to check AST evaluation logic, and write E2E tests to verify simulations and parameter validations.

---

## 9. Quality Gates & Acceptance Criteria

Before code is merged into `main`, it must meet these criteria:

*   **✓ Compilation Check:** Running `npx tsc --noEmit` returns zero errors.
*   **✓ Quality Standards:** There are no `TODO` placeholders or mock variables in the source files.
*   **✓ Test Coverage:** The AST condition parser and evaluation helper must maintain at least **95% unit test coverage**.
*   **✓ Lint Auditing:** The project build passes ESLint checks without warnings.
*   **✓ Security Audit:** Verification tests must confirm that evaluation requests cannot execute unsafe Javascript commands or access other tenants' data.
# Catrack Technical Runbook & Specification (CM-017 Business Rules & Formula Engine) completed successfully.
