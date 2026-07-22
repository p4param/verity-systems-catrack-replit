# CC-001 — Notification Template

| Field | Value |
| :--- | :--- |
| **Contract ID** | CC-001 |
| **Title** | Notification Template Capability Contract |
| **Engine** | VS09 – Communication & Notification Engine |
| **Phase** | Capability Contract |
| **Status** | Approved |
| **Engineering Standard** | ES-013 (Aligned with ES-001, ES-008, ES-009, ES-010) |
| **Governing ADRs** | ADR-009-001, ADR-009-002, ADR-009-003, ADR-009-004 |

---

# 1. Purpose

This Capability Contract defines the business specifications, domain invariants, commands, queries, events, and validation boundaries for the **`NotificationTemplate`** aggregate root inside the **VS09 Communication & Notification Engine**.

The `NotificationTemplate` aggregate represents a reusable, multi-lingual, metadata-driven communication blueprint utilized by the Communication Engine to compose and render notifications across multiple channels.

### Core Responsibilities:
- Managing template identity and unique template code definitions.
- Maintaining template versions and immutable version history.
- Defining supported communication channels (`EMAIL`, `SMS`, `PUSH`, `IN_APP`, `WEBHOOK`).
- Defining supported languages, ISO locales, and fallback language rules.
- Binding visual branding profile compatibility references.
- Specifying the structured variable schema required for dynamic interpolation.
- Supporting metadata-driven template inheritance (`Platform` $\rightarrow$ `Application` $\rightarrow$ `Tenant` $\rightarrow$ `Workspace`).

### Excluded Responsibilities (Governed by Downstream Engines / Services):
- **Template Resolution Responsibility**: `NotificationTemplate` **NEVER resolves itself**. Template resolution belongs exclusively to **`TemplateResolutionService`** (ADR-009-003). Aggregates remain persistence-oriented domain state models.
- **Template Rendering**: Executed by the engine rendering pipeline (ADR-009-003).
- **Personalization Execution**: Managed by `TemplateResolutionService` (ADR-009-003).
- **Provider Transport Dispatch**: Managed by Provider Adapters (ADR-009-002).
- **Queue & Background Worker Processing**: Managed by worker queues (ADR-009-004).

---

# 2. Aggregate Definition & Identity Model

| Element | Specification |
| :--- | :--- |
| **Aggregate Name** | `NotificationTemplate` |
| **Aggregate Root** | `NotificationTemplate` |
| **Bounded Context** | `Communication & Notification Engine` |
| **Persistence Boundary** | Isolated template metadata store; encapsulated within VS09 context. |
| **Multi-Tenancy Mode** | Explicit `TenantContext` isolation (`tenantId`, `workspaceId`). |
| **Aggregate Identity** | **`NotificationTemplateId` (`id`)** — Surrogate UUID Primary Key used by repositories for persistence and ORM identity tracking. |
| **Business Identity** | **`tenantId` + `templateCode` + `templateVersion`** — Unique natural business key enforcing business uniqueness across the platform. |
| **Identity Persistence Rule** | Repositories persist and query by Aggregate Identity (`id`), while domain uniqueness and business lookup rules are enforced through Business Identity (`tenantId` + `templateCode` + `templateVersion`). |
| **Size Classification** | **`Medium Aggregate`** (~15–25 attributes, bounded array collections of supported languages/channels and schema descriptors). |

---

# 3. Business Responsibilities

The `NotificationTemplate` aggregate root is responsible for enforcing the following business capabilities:

1. **Reusable Template Registry**: Maintain a centralized, searchable registry of notification templates categorized by business domain.
2. **Template Version Control & Inheritance**: Enforce immutable template versions (`1.0.0`, `1.1.0`). Each new template version inherits metadata, variable schema, supported channels, and default language from its immediate predecessor version unless explicitly overridden.
3. **Channel Compatibility Matrix**: Explicitly declare which communication channels (e.g., Email, SMS, Mobile Push) are supported by a template definition.
4. **Multi-Lingual Localization Mapping**: Declare supported language variations and specify the default fallback language for recipient localization.
5. **Variable Schema Contract**: Enforce a strict variable JSON Schema defining mandatory vs. optional payload keys, data types, and default fallback values.
6. **Inheritance & Override Hierarchy**: Support hierarchical template inheritance allowing tenant or workspace templates to inherit layout blocks from parent platform templates.

---

# 4. Business Attributes

All attributes follow CAP platform database naming conventions specified in **ES-001**:

| Attribute Name | Data Type | Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key, Required | Aggregate Identity (`NotificationTemplateId`). |
| `tenantId` | `UUID` | Foreign Key, Required | Part of Business Identity. Identifies tenant context. (Owned by Tenant Engine). |
| `workspaceId` | `UUID` | Foreign Key, Optional | Identifies workspace boundary for sub-tenant templates. (Owned by Tenant Engine). |
| `templateCode` | `String(100)` | Required, Part of Business ID | Business code identifying the template (e.g., `ORDER_CONFIRMATION_V1`). |
| `templateName` | `String(255)` | Required | Human-readable title of the template. |
| `description` | `String(1000)`| Optional | Summary of template purpose and business trigger conditions. |
| `category` | `Enum` | Required | Classification (e.g., `TRANSACTIONAL`, `SECURITY`, `WORKFLOW`, `MARKETING`). |
| `status` | `Enum` | Required | Lifecycle state (`DRAFT`, `PUBLISHED`, `DEPRECATED`, `ARCHIVED`). |
| `templateVersion` | `String(50)` | Required, Part of Business ID | Semantic version string of the template definition (e.g., `1.2.0`). |
| `parentTemplateId` | `UUID` | Optional Reference | Parent template ID for hierarchical inheritance (identity reference). |
| `supportedChannels` | `Array<Enum>`| Required, Non-Empty | List of abstract channels supported (e.g., `[EMAIL, SMS, IN_APP]`). |
| `supportedLanguages`| `Array<String>`| Required, Non-Empty | List of supported ISO language codes (e.g., `["en-US", "ar-SA"]`). |
| `defaultLanguage` | `String(10)` | Required | Primary fallback language code (e.g., `en-US`). |
| `brandingProfileId` | `UUID` | Optional Reference | Visual branding profile reference (owned by Metadata/Branding Context). |
| `isSystemTemplate` | `Boolean` | Required, Default `false` | Indicates whether the template is a platform-wide system default. |
| `isActive` | `Boolean` | Required, Default `true` | Operational availability flag for runtime resolution. |
| `variableSchema` | `JSONSchema` | Required | JSON Schema defining expected variables, types, and validation rules. |
| `createdAt` | `Timestamp` | Required, System Managed | UTC timestamp when the template was created. |
| `createdBy` | `UUID` | Required, System Managed | User ID of the creator (owned by Identity Engine). |
| `updatedAt` | `Timestamp` | Required, System Managed | UTC timestamp when the template was last modified. |
| `updatedBy` | `UUID` | Required, System Managed | User ID of the last modifier (owned by Identity Engine). |
| `version` | `Integer` | Required, Optimistic Lock | OCC aggregate version counter for concurrent modification protection. |

---

# 5. Business Invariants

The `NotificationTemplate` aggregate guarantees the following domain invariants:

1. **Unique Business Identity**: The Business Identity combination of `(tenantId, templateCode, templateVersion)` MUST be unique across the platform.
2. **Version Immutability & Inheritance**: Once a template version is transitioned to `PUBLISHED`, its content, supported channels, variable schema, and version string become strictly **immutable**. Creating a new version inherits metadata from its immediate predecessor.
3. **Circular Inheritance Prohibition**: A template MUST NOT set a `parentTemplateId` that results in a circular inheritance loop (`A` $\rightarrow$ `B` $\rightarrow$ `A`).
4. **Unique Language Entries**: The `supportedLanguages` array MUST NOT contain duplicate ISO language entries.
5. **Unique Channel Entries**: The `supportedChannels` array MUST NOT contain duplicate channel enum entries.
6. **Default Language Inclusion**: The `defaultLanguage` MUST exist within the `supportedLanguages` array.
7. **Archived Immutability**: Templates in the `ARCHIVED` status are permanently immutable and CANNOT be transitioned back to `DRAFT` or `PUBLISHED`.
8. **Schema Variable Enforcement**: All template content placeholders MUST correspond to declared keys within the `variableSchema`.

---

# 6. Lifecycle & Version Relationship

The `NotificationTemplate` aggregate root undergoes a deterministic 4-stage administrative lifecycle:

```
[ Draft ] ──► [ Published ] ──► [ Deprecated ] ──► [ Archived ] (Terminal)
```

### Version Relationship Rules:
- **`CreateVersion` Ingestion**: When a new version is created (`CreateVersion`), it initializes in `DRAFT` status and inherits `templateName`, `description`, `supportedChannels`, `supportedLanguages`, `defaultLanguage`, `brandingProfileId`, and `variableSchema` from its immediate predecessor version (`v1.0.0` $\rightarrow$ `v1.1.0`).
- **Published Immutability**: Transitioning to `PUBLISHED` locks the version. Already published versions CANNOT be edited.
- **`ARCHIVED` Terminal Boundary**: `ARCHIVED` is a terminal state. Archived versions are completely frozen.

---

# 7. Commands

The `NotificationTemplate` aggregate exposes the following domain commands:

| Command | Arguments | Business Description |
| :--- | :--- | :--- |
| **`CreateTemplate`** | `tenantId`, `templateCode`, `templateName`, `category`, `defaultLanguage`, `supportedChannels`, `variableSchema` | Instantiates a new `NotificationTemplate` in `DRAFT` status with version `1.0.0`. |
| **`PublishTemplate`** | `templateId`, `publishedBy` | Transitions template from `DRAFT` to `PUBLISHED`, locking version immutability. |
| **`CreateVersion`** | `templateId`, `newVersion`, `changelog` | Creates a new `DRAFT` version derived from an existing `PUBLISHED` template, inheriting predecessor metadata. |
| **`DeprecateTemplate`** | `templateId`, `reason` | Transitions a `PUBLISHED` template to `DEPRECATED` status. |
| **`ArchiveTemplate`** | `templateId`, `archivedBy` | Transitions a `DEPRECATED` or `PUBLISHED` template to `ARCHIVED` (terminal). |
| **`AddLanguage`** | `templateId`, `languageCode` | Registers a new supported ISO language code to a `DRAFT` template. |
| **`RemoveLanguage`** | `templateId`, `languageCode` | Removes a supported language code from a `DRAFT` template (cannot remove default language). |
| **`AddChannel`** | `templateId`, `channel` | Registers a supported channel enum to a `DRAFT` template. |
| **`RemoveChannel`** | `templateId`, `channel` | Removes a channel enum from a `DRAFT` template. |
| **`UpdateMetadata`** | `templateId`, `templateName`, `description`, `brandingProfileId` | Updates editable metadata fields on a `DRAFT` template. |

---

# 8. Queries & Repository Lookup Patterns

The `NotificationTemplate` aggregate and its underlying repository support standard read queries and lookup patterns:

### Read Queries:
| Query | Parameters | Return Type | Purpose |
| :--- | :--- | :--- | :--- |
| **`GetById`** | `templateId` | `NotificationTemplateDTO` | Fetches a template aggregate by Aggregate Identity (`id`). |
| **`GetByCode`** | `tenantId`, `templateCode`, `version?` | `NotificationTemplateDTO` | Fetches a specific template version by Business Identity. |
| **`GetLatestVersion`** | `tenantId`, `templateCode` | `NotificationTemplateDTO` | Resolves the highest `PUBLISHED` version for a template code. |
| **`ListByChannel`** | `tenantId`, `channel`, `status?` | `List<NotificationTemplateDTO>` | Returns all templates supporting a specific channel. |
| **`ListByLanguage`** | `tenantId`, `languageCode` | `List<NotificationTemplateDTO>` | Returns templates supporting a specific ISO language. |
| **`ListPublished`** | `tenantId`, `category?` | `List<NotificationTemplateDTO>` | Returns active published templates for runtime resolution. |

### Repository Lookup Patterns:
- **`GetPublishedVersion(tenantId, templateCode, version)`**: Fetches an exact published template version by business key.
- **`GetLatestVersion(tenantId, templateCode)`**: Retrieves the latest published version for runtime intent binding.
- **`GetActiveVersion(tenantId, templateCode)`**: Resolves active, non-deprecated template for pipeline execution.
- **`GetParentTemplate(parentTemplateId)`**: Resolves parent template aggregate for layout block inheritance during resolution.

---

# 9. External References

To uphold strict bounded context boundaries, external entity attributes referenced by `NotificationTemplate` are held **by identity reference only**:

| External Attribute | Owning Bounded Context | Relationship Type | Rules & Restrictions |
| :--- | :--- | :--- | :--- |
| `tenantId` | Tenant Engine | Identity Reference | Identifies owning tenant organization. No domain ownership transfer. |
| `workspaceId` | Tenant Engine | Identity Reference | Identifies operational workspace boundary. No domain ownership transfer. |
| `brandingProfileId` | Metadata / Branding Context | Identity Reference | Identifies visual theme assets. VS09 holds ID reference only. |
| `parentTemplateId` | VS09 Template Context | Identity Reference | Parent template ID for layout inheritance. Evaluated by `TemplateResolutionService`. |
| `createdBy` / `updatedBy`| Identity Engine (CM-002) | Identity Reference | User profile surrogate key for audit trail logging. No user profile mutation. |

---

# 10. Ownership Rules & Variable Boundary

The `NotificationTemplate` aggregate owns its domain metadata strictly:

### What `NotificationTemplate` OWNS:
- Template business code, name, description, and category metadata.
- Template versioning history and version immutability contracts.
- Supported channel compatibility declarations.
- Supported language registrations and default language selections.
- **Variable Schema Definitions ONLY**: JSON Schema keys, expected data types, validation constraints, and default fallback values.

### What `NotificationTemplate` DOES NOT OWN:
- **Runtime Variable Values**: Variable values belong **exclusively to `NotificationIntent` and `RenderContext`**. `NotificationTemplate` **SHALL NEVER store runtime variable values**.
- **Template Resolution Logic**: Template resolution belongs **exclusively to `TemplateResolutionService`** (ADR-009-003). `NotificationTemplate` never resolves itself.
- **Branding Assets**: Owned by Metadata/Branding Context (`brandingProfileId`).
- **Localization Engine**: Owned by `TemplateResolutionService` (ADR-009-003).
- **Template Rendering**: Executed by downstream rendering pipelines (ADR-009-003).
- **NotificationIntents**: Owned by caller business modules and intent ingestion boundaries.
- **Delivery Records**: Owned by `NotificationDelivery` aggregate (ADR-009-004).

---

# 11. Validation Rules

The `NotificationTemplate` aggregate enforces the following input validation rules:

1. **Template Code Required**: `templateCode` MUST NOT be null, empty, or contain whitespace/special characters outside `[A-Z0-9_]`.
2. **Template Name Required**: `templateName` MUST NOT be null or empty (max length 255 characters).
3. **Mandatory Supported Language**: `supportedLanguages` MUST contain at least one valid ISO language code.
4. **Mandatory Supported Channel**: `supportedChannels` MUST contain at least one valid `DeliveryChannel` enum.
5. **No Duplicate Version Strings**: Creating a new version with an already existing `templateVersion` string MUST fail with `DuplicateVersionException`.
6. **No Duplicate Language Entries**: Adding a language already present in `supportedLanguages` MUST fail gracefully or reject duplication.
7. **No Duplicate Channel Entries**: Adding a channel already present in `supportedChannels` MUST reject duplication.
8. **Default Language Validation**: Removing a language that is currently set as `defaultLanguage` MUST be rejected.

---

# 12. Domain Events

The `NotificationTemplate` aggregate emits the following immutable domain events:

| Domain Event | Event Payload Attributes | Business Description |
| :--- | :--- | :--- |
| **`TemplateCreated`** | `templateId`, `tenantId`, `templateCode`, `templateVersion`, `createdBy`, `createdAt` | Emitted when a new template aggregate is created in `DRAFT`. |
| **`TemplatePublished`** | `templateId`, `tenantId`, `templateCode`, `templateVersion`, `publishedBy`, `publishedAt` | Emitted when a template version transitions to `PUBLISHED` and becomes immutable. |
| **`TemplateVersionCreated`** | `templateId`, `parentVersion`, `newVersion`, `createdBy`, `createdAt` | Emitted when a new version iteration is created from a published template. |
| **`TemplateDeprecated`** | `templateId`, `tenantId`, `templateCode`, `templateVersion`, `deprecatedBy`, `deprecatedAt` | Emitted when a published template is deprecated. |
| **`TemplateArchived`** | `templateId`, `tenantId`, `templateCode`, `templateVersion`, `archivedBy`, `archivedAt` | Emitted when a template reaches `ARCHIVED` terminal state. |

---

# 13. Dependencies

### Allowed Dependencies:
- **`TemplateResolutionService`**: Queries `NotificationTemplate` to resolve active templates during pipeline execution.
- **Metadata Engine**: Supplies template schema storage and branding profile references.
- **Tenant Context**: Supplies `tenantId` and `workspaceId` for multi-tenant data partitioning.

### Forbidden Dependencies:
- **Provider Adapters** (SendGrid, Twilio, Firebase): `NotificationTemplate` MUST NEVER import or reference delivery provider SDKs or vendor code.
- **Queue Workers & Brokers**: `NotificationTemplate` MUST NEVER depend on background queues or message broker libraries.
- **Rendering Engine Implementations**: `NotificationTemplate` defines metadata and variable schemas; it does not contain physical HTML/Handlebars rendering engines.
- **Caller Business Modules**: `NotificationTemplate` MUST NEVER import business module logic (Events, Inventory, Purchasing).

---

# 14. Definition of Done

This Capability Contract (`CC-001`) is certified **COMPLETE** when all the following criteria are satisfied:

- [x] Aggregate root `NotificationTemplate` defined with clear boundaries and Medium Aggregate classification.
- [x] Aggregate Identity (`id`) vs. Business Identity (`tenantId` + `templateCode` + `templateVersion`) explicitly defined.
- [x] Business attributes mapped according to `ES-001` database conventions.
- [x] All 8 domain invariants formally documented and non-negotiable.
- [x] Version inheritance and published immutability relationships established.
- [x] Variable schema vs. runtime variable values ownership boundary enforced.
- [x] Resolution responsibility strictly assigned to `TemplateResolutionService`.
- [x] 10 domain commands, 6 read queries, and 4 repository lookup patterns specified.
- [x] External identity references (`tenantId`, `workspaceId`, `brandingProfileId`, `userId`) audited for identity-only compliance.
- [x] Explicit domain ownership boundaries established.
- [x] Validation rules and domain events formally defined.
- [x] Allowed vs. Forbidden dependencies audited against platform standards (`ES-001`, `ES-008`, `ES-009`, `ES-010`, `ES-013`).

**Status**: **100% READY FOR ENGINEERING WORK PACKAGE EWP-001 IMPLEMENTATION**.
