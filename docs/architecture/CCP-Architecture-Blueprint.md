# Core Configuration Platform (CCP) Architecture Blueprint
**Catrack ERP Platform Specification Document**
**Document Version:** 1.0.0  
**Classification:** Architectural Blueprint  
**Status:** Approved Reference Standard  

> [!NOTE]
> **Source Lineage:** Migrated verbatim from AG Brain `core_configuration_platform_blueprint.md` as part of the docs/ repository migration — see `docs/project-governance/MIGRATION-LOG.md`. This blueprint predates and may not fully reconcile with `docs/project-governance/AG-000-CAP-Master-Development-Charter.md`'s zero-business-code CAP philosophy; treat as architectural reference material, not as a document that overrides AG-000 where the two diverge.

---

## 1. Vision

The Core Configuration Platform (CCP) is the foundational metadata-driven layer designed to orchestrate configuration, custom fields, data taxonomies, workflow states, and processing rules across all modules of the Catrack ERP. 

Traditional enterprise systems implement domain-specific configurations (such as event statuses, inventory categories, and fleet types) using hardcoded database tables, rigid enums, and customized controllers. This creates tight coupling, increases code duplication, and forces schema migrations for simple operational changes.

CCP replaces this rigid model with a generalized, metadata-driven architecture. By abstracting configuration schemas into a single dynamic engine, the ERP achieves the following goals:
*   **Operational Agility:** Business administrators can define new fields, modify workflow sequences, and alter taxonomies directly through the user interface, completely eliminating deployment cycles for metadata changes.
*   **Unified Domain Semantics:** Every module—from CRM and Event Management to Kitchen and Finance—interacts with configuration through a single unified contract, making reporting, auditing, and cross-module workflows highly consistent.
*   **Tenant Autonomy:** Multi-tenant isolation is extended to the configuration layer, allowing individual tenants to override system-wide defaults, inject custom validation logic, and design custom templates.

---

## 2. Design Principles

The CCP is governed by the following architectural principles:

*   **Scalability:** The configuration schema must handle thousands of distinct configuration elements across millions of transactions without degradation. Reads are optimized through aggressive distributed caching.
*   **Extensibility:** Adding new modules, fields, or workflows must be achievable via metadata configuration without modifying database schemas or redeploying code.
*   **Low Coupling & High Cohesion:** The engines within the CCP must be highly specialized and operate independently. External business logic interacts solely with the API boundaries of the engines.
*   **Configuration over Code:** System behavior, data presentation, validation logic, and transitions are defined in metadata rules rather than imperative programming patterns.
*   **Metadata Driven:** Forms, data grids, search behavior, and report structures are rendered dynamically based on metadata definitions.
*   **API First:** All engine functionalities are exposed via RESTful endpoints, ensuring that web apps, mobile apps, and third-party integrations consume the same configuration definitions.
*   **Security by Design:** Row-level multi-tenant isolation, cryptographically signed configuration payloads, and fine-grained Role-Based Access Control (RBAC) are enforced at the engine entry points.
*   **Performance by Design:** A strict multi-tier caching hierarchy ensures that metadata operations achieve sub-millisecond latencies.
*   **Multi-Tenant:** The configuration hierarchy supports seamless inheritance from the Global level down to individual branches, facilitating flexible override policies.
*   **Offline Ready:** Configuration metadata is designed to be easily serialized and synchronized with mobile clients for offline execution of forms, lookups, and state transitions.

---

## 3. Platform Architecture

The CCP comprises a logical layering of specialized execution engines. Below is the logical architecture of the platform:

```
+-----------------------------------------------------------------------------+
|                       CORE CONFIGURATION PLATFORM (CCP)                     |
+-----------------------------------------------------------------------------+
|                                                                             |
|  +------------------------+  +------------------------+  +---------------+  |
|  |  Configuration Engine  |  |   Master Data Engine   |  |Lookup Engine  |  |
|  +------------------------+  +------------------------+  +---------------+  |
|                                                                             |
|  +------------------------+  +------------------------+  +---------------+  |
|  |    Validation Engine   |  |    Workflow Engine     |  |Rule Engine    |  |
|  +------------------------+  +------------------------+  +---------------+  |
|                                                                             |
|  +------------------------+  +------------------------+  +---------------+  |
|  |   Dynamic Form Engine  |  |   Dynamic Grid Engine  |  |Template Engine|  |
|  +------------------------+  +------------------------+  +---------------+  |
|                                                                             |
|  +------------------------+  +------------------------+                     |
|  |  Import/Export Engine  |  |      Audit Engine      |                     |
|  +------------------------+  +------------------------+                     |
|                                                                             |
+-----------------------------------------------------------------------------+
```

### Engine Responsibilities

1.  **Configuration Engine:** The system core. It acts as the primary registry and repository for all configurations. It parses global settings, handles tenant overrides, compiles field definitions, and serves configuration snapshots to dependent services.
2.  **Master Data Engine (MDE):** Manages dynamic, user-defined taxonomies and lookup categories (e.g., Event Types, Laundry Categories, Kitchen Stations). It enforces hierarchical relationships and tags elements for use in drop-down menus and analytical dimensions.
3.  **Lookup Engine:** Optimizes database queries by dynamically building query paths and resolving foreign key references, display values, and codes for user-defined master items and dynamic lists.
4.  **Validation Engine:** Evaluates transaction data against field constraints (e.g., data types, regex patterns, ranges) and system-wide rules before persistence.
5.  **Workflow Engine:** Evaluates states, guards, and transition rules. It manages document and entity lifecycles (e.g., moving a Quote from "Pending Approval" to "Confirmed") and triggers hook functions upon transition.
6.  **Rule Engine:** Evaluates conditional logic, calculations, and policy sets (e.g., determining tax calculations, automated assignment routing, or credit limit thresholds) defined in the configuration layer.
7.  **Dynamic Form Engine:** Translates field metadata (data types, validation rules, field groupings) into abstract layout definitions, allowing front-end frameworks to render custom user interfaces.
8.  **Dynamic Grid Engine:** Resolves metadata-driven data table specifications, defining display columns, search indexes, filter operators, aggregate formulas, and formatting actions.
9.  **Template Engine:** Merges configuration data and transaction payloads with document templates to generate outputs like invoices, delivery schedules, and notifications.
10. **Import/Export Engine:** Automates data loading and extraction by checking source spreadsheets or CSV files against the current configuration metadata, performing type validation, and processing updates.
11. **Audit Engine:** Captures and serializes configuration changes, capturing the state of metadata before and after modification, the actor, timestamp, tenant context, and justification.

---

## 4. Domain Model

The relationship between the core entities within the CCP domain is modeled below:

```
+---------------+        1       * +------------------+
|   Platform    |----------------->|      Module      |
+---------------+                  +------------------+
                                             | 1
                                             |
                                             | *
                                   +------------------+
                                   |  Config Category |
                                   +------------------+
                                     | 1            | 1
                                     |              |
                                     | *            | *
                        +------------------+  +------------------+
                        | Field Definition |  |Config Item (Val) |
                        +------------------+  +------------------+
                          | 1                  | 1
                          |                    |
                          | *                  | *
                        +------------------+  +------------------+
                        | Validation Rule  |  |    Dependency    |
                        +------------------+  +------------------+
```

### Entity Contract Definitions

*   **Platform:** Represents the top-level ERP boundary. It manages universal configurations, base licensing, system-wide tables, and the registration of core modules.
*   **Module:** A distinct business subsystem (e.g., `EVENT`, `FLEET`, `KITCHEN`). It acts as a namespace for grouping configuration categories, business logic, templates, and permissions.
*   **Configuration Category:** A taxonomy grouping inside a module (e.g., `EVENT_STATUS`, `FLEET_VEHICLE_TYPE`). It maps schema constraints to data storage.
*   **Field Definition:** Defines the properties, types, data structures, and default values of attributes inside a category. This includes metadata like label name, field type (`STRING`, `NUMBER`, `DATETIME`, `JSON`), list requirements, and layout options.
*   **Configuration Item:** The individual data instances of a category configured for a tenant (e.g., an item inside the `EVENT_STATUS` category with the code `CONFIRMED` and the label `Confirmed Booking`).
*   **Dependency:** Defines validation and visibility relationships between Configuration Items (e.g., hiding field Y when field X is unchecked, or requiring field Z to be filled only when status = `VIP`).
*   **Rules:** Policies that govern data manipulation and security (e.g., "Only administrators can move an event to the SETTLEMENT state").
*   **Templates:** Abstract models representing print outputs, notification templates, and documents associated with configuration categories.
*   **Workflows:** Abstract transition definitions that bind states, transition criteria, and action hooks together into a sequence.
*   **Permissions:** Granular access descriptors mapped to configuration categories, controlling read, update, delete, and workflow transition operations.
*   **Audit:** Append-only log entries mapping configuration changes to individual version histories.

---

## 5. Multi-Tenant Strategy

To provide cost-effective SaaS operations alongside custom configuration needs, the CCP implements a three-tier configuration inheritance and override tree:

```
          +-----------------------+
          |  Global Configuration |  (Defines core system behaviors and system defaults)
          +-----------------------+
                      |
                      v
          +-----------------------+
          | Company Configuration |  (Overrides/extends configurations for a customer account)
          +-----------------------+
                      |
                      v
          +-----------------------+
          |  Branch Configuration |  (Specific customizations for local branch operations)
          +-----------------------+
```

### Inheritance Mechanics

1.  **Read Operations (Fallback Resolution):**
    When an engine requests a configuration item or settings block, it resolves it using a hierarchical lookup algorithm:
    *   **Step 1:** Check for an active configuration item scoped to the specific `Branch ID`. If found, apply it.
    *   **Step 2:** If not found at the branch level, look up the configuration item scoped to the `Company ID` (tenant). If found, apply it.
    *   **Step 3:** If not found at the company level, fallback to the `Global` (system-wide) configuration.
2.  **Write Operations (Override Behavior):**
    *   **In-Place Override:** Tenants (companies/branches) cannot modify Global configuration files directly. Instead, when a tenant changes a global parameter, the CCP writes an override record mapping the parameter key, value, and tenant scope (`Company ID` or `Branch ID`).
    *   **Locking (Sealing):** Global administrators can flag specific system configurations as "Sealed." Sealed configurations cannot be overridden or modified at the company or branch level (e.g., currency conversions, tax framework compliance rules, security policies).
    *   **Additions:** Tenants can add custom fields, statuses, or categories to their space. These are assigned a tenant scope and remain isolated from other accounts.

---

## 6. Configuration Lifecycle

Configuration metadata within the CCP transitions through a formal lifecycle to protect data integrity:

```
    +---------+       Publish       +----------+       Deactivate      +----------+
    |  Draft  |-------------------->|  Active  |-------------------->| Inactive |
    +---------+                     +----------+                     +----------+
         ^                               |                                |
         | Create                        | Archive                        | Restore
         |                               v                                |
    +---------+                     +----------+                          |
    | (Start) |                     | Archived |<-------------------------+
    +---------+                     +----------+
                                         |
                                         | Delete
                                         v
                                    +----------+
                                    | (Deleted)|
                                    +----------+
```

*   **Draft:** The metadata is being defined. It is visible only to system designers and administrators. It cannot be used in transaction logging or form fields.
*   **Active (Published):** The configuration is compiled, cached, and available for use across the application. Once active, changes create a new version of the metadata to prevent breaking active transactions.
*   **Inactive:** The configuration item is disabled. It remains in the database to satisfy historical integrity constraints (e.g., past reports), but is hidden from active forms and lookups.
*   **Archived:** The item is removed from active caches and main UI lists. It is kept solely for audit and analytics history.
*   **Delete (Soft Delete):** The item is flagged as deleted. Database records remain intact to prevent orphan foreign keys in transaction history, but the metadata is excluded from all runtime operations.
*   **Restore:** Reverses the "Inactive" or "Archived" status, rebuilding the configuration caches and returning the metadata to active use.

---

## 7. Naming Standards

To maintain consistency across all modules and engines, developers must follow these strict naming standards:

### 1. Database Table Naming
*   **Rule:** Table names must be plural, snake_case, and prefixed by their domain.
*   *Examples:*
    *   `core_configurations` (Platform core config)
    *   `mde_categories` (Master Data Engine categories)
    *   `mde_items` (Master Data Engine category values)
    *   `workflow_definitions` (Workflow definitions)

### 2. API Endpoint Naming
*   **Rule:** Endpoints must be plural, lowercase, REST-compliant, and versioned. Domain modules must namespace the path.
*   *Examples:*
    *   `/api/v1/masters/categories`
    *   `/api/v1/masters/categories/[id]/items`
    *   `/api/v1/workflows/definitions`
    *   `/api/v1/events/configs`

### 3. Component Naming
*   **Rule:** UI Components must use PascalCase and end with a functional descriptor.
*   *Examples:*
    *   `MasterTableList` (Table component for master list display)
    *   `ConfigFormEditor` (Form editor for settings configuration)
    *   `WorkflowStatusBadge` (State visualization badge)

### 4. Folder Naming
*   **Rule:** Folder names must use kebab-case, with functional contexts separated by domain levels.
*   *Examples:*
    *   `src/modules/masters/components`
    *   `src/modules/masters/hooks`
    *   `src/app/api/v1/masters`

### 5. React Hook Naming
*   **Rule:** React hooks must use camelCase, prefix with `use`, and name the entity or engine.
*   *Examples:*
    *   `useMasterItems` (Resolves dynamic lists)
    *   `useConfigSchema` (Fetches dynamic form layout definitions)
    *   `useWorkflowTransition` (Manages transitions and handles loading states)

### 6. Repository Naming
*   **Rule:** Repositories must be PascalCase, end with `Repository`, and map to domain aggregates.
*   *Examples:*
    *   `MasterCategoryRepository`
    *   `WorkflowDefinitionRepository`

### 7. Service Naming
*   **Rule:** Services must be PascalCase, end with `Service`, and map to functional execution domains.
*   *Examples:*
    *   `ValidationService`
    *   `ConfigurationResolutionService`

---

## 8. Extensibility Rules

To extend the platform, developers must follow these patterns to prevent schema sprawl:

### 1. Registering a New Module
Do not create custom DB schemas or hardcoded routes. Instead:
1.  Add a new record in the `Module` configuration database via the admin control panel.
2.  Define the permissions block (e.g., `FLEET_VIEW`, `FLEET_MANAGE`) in the security configuration registry.

### 2. Adding a New Master Category
1.  Define the master schema in the `Master Category` registry (e.g., category: `FLEET_VEHICLE_TYPE`).
2.  Assign the new category to its parent Module (`FLEET`).
3.  The Master Data Engine automatically sets up REST endpoints under `/api/v1/masters/categories/fleet-vehicle-type` without requiring additional code.

### 3. Introducing Custom Fields
1.  Define the field inside the `Field Definition` repository, mapping the parent Category, data type, validation regex, and layout behavior.
2.  The validation engine and form generators will dynamically read this metadata to render and validate the field on the client and server.

### 4. Plugin Architecture
For custom features or integrations:
*   Implement webhook handlers mapped to specific system transitions (e.g., triggering a third-party dispatch message when status changes to `PRODUCTION`).
*   Plugins register their events with the Rule Engine, which intercepts transaction pipelines and processes logic asynchronously without blocking primary writes.

---

## 9. Performance Strategy

Configuration metadata is read frequently but updated rarely. The performance strategy optimizes for read-heavy operations:

```
                          READ REQUEST
                               |
                               v
                  +--------------------------+
                  |  Memory / Redis Cache    | --(Hit)--> Return Configuration
                  +--------------------------+
                               |
                            (Miss)
                               v
                  +--------------------------+
                  |   L2 Application Cache   | --(Hit)--> Populate Redis & Return
                  +--------------------------+
                               |
                            (Miss)
                               v
                  +--------------------------+
                  |  Database Query (Prisma) | --(Save)--> Populate Caches
                  +--------------------------+
```

*   **Multi-Tier Caching:**
    *   **L1 Cache (In-Memory / Redis):** Global and tenant-specific configuration settings are compiled and cached in memory. Changes to configurations trigger a cache invalidation request across the network.
    *   **L2 Application Cache:** Query-level indexing for lookup operations (e.g., lists of statuses or priorities) is cached at the application level to avoid database calls during transaction rendering.
*   **Lazy Loading:**
    *   Dynamic configurations for complex workflows or rare settings are loaded on-demand rather than during application startup.
*   **Lookup Caching:**
    *   Lookup keys are pre-compiled and served as optimized key-value hashes to speed up client-side dropdown rendering.
*   **Database Indexing:**
    *   `mde_items` and `core_configurations` are indexed using composite keys of `(tenantId, module, categoryCode, isDeleted, isActive)`.

---

## 10. Security Strategy

The security model ensures strict multi-tenant isolation and auditability:

*   **Data Isolation (Tenant Level):**
    *   All queries directed to the CCP must include the `tenantId` parameter. Row-Level Security (RLS) or system query parameters inject the current tenant filter at the database connection layer to prevent cross-tenant data leaks.
*   **Branch Isolation:**
    *   Users assigned to specific branches can only access configuration overrides scoped to their branch or inherited from the company level.
*   **Role-Based Access Control (RBAC):**
    *   Permissions are matched to specific operations within the MDE (e.g., `INVENTORY_MASTER_CREATE` allows adding lookup codes, but only `ADMIN_ACCESS` can override system configurations).
*   **Cryptographic Verification:**
    *   Configuration snapshots sent to client applications are hashed and signed. Any tampering invalidates the configuration payload, blocking client execution.
*   **Audit Logging:**
    *   Changes to configuration parameters write to `core_config_audit_logs`. The log records the user ID, timestamp, old value, new value, and authorization token. Audit entries are immutable.

---

## 11. Future Roadmap

The CCP is designed to support the progressive implementation of dynamic ERP components:

```
               +--------------------------------------+
               | Core Configuration Platform (Base)   |
               +--------------------------------------+
                                   |
         +-------------------------+-------------------------+
         |                                                   |
         v                                                   v
+------------------+                                +------------------+
|  Dynamic Forms   |                                | Dynamic Reports  |
| (UI Generator)   |                                | (Query Builder)  |
+------------------+                                +------------------+
         |                                                   |
         +-------------------------+-------------------------+
                                   |
                                   v
                        +----------------------+
                        |  Dynamic Workflows   |
                        | (Graphical Engine)   |
                        +----------------------+
```

1.  **Dynamic UI Rendering:** Client-side forms will render completely from metadata JSON schemas, including input placement, visibility states, validation logic, and field masks.
2.  **Dynamic Query & Report Generator:** Users will design custom tabular lists and summary reports by choosing fields from the category registry. The query builder translates these selections into optimized database queries.
3.  **Dynamic Mobile Layouts:** The Mobile Field Ops portal will fetch configuration models at launch, rendering responsive page layouts suited for offline execution.
4.  **Dynamic REST Endpoints:** Registering a category automatically builds its corresponding REST path and API documentation, complete with OpenAPI integration.

---

## 12. Architectural Decisions

This section details key architectural decisions, alternatives considered, and trade-offs made:

### Decision 1: Metadata-Driven MDE vs. Hardcoded Relational Tables
*   **Selected Approach:** A single unified database schema (`mde_categories`, `mde_items`) managing taxonomies, with relational lookups handled through index mapping.
*   **Alternatives Considered:** Creating distinct database tables for every module type (e.g., `event_types`, `fleet_status`, `laundry_categories`).
*   **Trade-off:**
    *   *Pros:* Schema changes are eliminated. Creating new modules or categories requires only insert queries rather than database updates. Maintenance is highly unified.
    *   *Cons:* Relational integrity checking at the database level is simplified. Cascading deletes must be handled at the application level by the Verification and Rule Engines.
*   **Future Implications:** Speeds up updates and tenant onboarding, making it easy to support custom configurations per client.

### Decision 2: Hierarchical Configuration Inheritance (Global -> Company -> Branch)
*   **Selected Approach:** A runtime fallback resolution model where configurations are inherited down the tree unless overridden at the tenant level.
*   **Alternatives Considered:** Copying all system configurations to the tenant level during onboarding.
*   **Trade-off:**
    *   *Pros:* System-wide configuration changes apply instantly to all tenants unless they have custom overrides. Minimizes database storage overhead.
    *   *Cons:* Resolving configurations requires checking multiple keys, which increases processing time. This is mitigated through caching.
*   **Future Implications:** Facilitates system-wide updates and makes it easy to manage configurations across complex corporate structures.
