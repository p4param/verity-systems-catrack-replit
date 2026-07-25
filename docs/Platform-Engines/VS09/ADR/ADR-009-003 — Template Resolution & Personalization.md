# ADR-009-003 — Template Resolution & Personalization

| Field | Value |
| :--- | :--- |
| **ADR** | ADR-009-003 |
| **Title** | Template Resolution & Personalization |
| **Engine** | VS09 – Communication & Notification Engine |
| **Phase** | Architecture & Domain Governance |
| **Status** | Accepted |
| **Supersedes** | None |
| **Superseded By** | None |
| **Engineering Standard** | ES-013 (Aligned with ES-001, ES-008, ES-009, ES-010) |

---

# 1. Context

The CAP Notification Engine architecture is governed by frozen foundational documents:
- **VS09-P001 Communication & Notification Blueprint**: Established that the Notification Engine owns 100% of content composition, localized rendering, layout wrappers, and branding themes, keeping business modules completely decoupled from template rendering.
- **VS09-P002 Communication & Notification Architecture Guide**: Defined the logical processing pipeline, explicitly isolating Template Resolution and Content Composition into distinct architectural stages.
- **VS09-P003 Communication & Notification Domain Model**: Defined the `NotificationTemplate` aggregate root, `TemplateVariation` entity, `RenderedContent` value object, and `TemplateResolutionService` domain service.
- **ADR-009-001 Communication Delivery Model**: Established asynchronous queue-first ingestion where payload variables are bound asynchronously in background worker pipelines.
- **ADR-009-002 Channel & Provider Abstraction**: Established that content composition produces channel-neutral content before applying channel-specific layout transformations.

To operationalize notification rendering across enterprise tenants, CAP requires an authoritative decision defining the **Template Resolution & Personalization Architecture**.

---

# 2. Problem Statement

Allowing business modules or external providers to handle template rendering, localization, or branding creates critical architectural flaws:

1. **Leaky Application Boundaries**: When business applications perform string interpolation, localized formatting, or HTML rendering, domain application code becomes cluttered with communication layout logic.
2. **Branding Inconsistency**: Hardcoding logos, headers, footers, or color palettes inside application modules leads to inconsistent tenant branding and makes platform-wide rebranding impossible.
3. **Inflexible Localization**: Scattered localization dictionaries make multi-lingual support fragile, leading to missing translations or unformatted dates/currencies across enterprise environments.
4. **Vendor Lock-in via Provider Templates**: Coupling notifications to proprietary third-party vendor templates (e.g., SendGrid Dynamic Templates) prevents seamless provider fallback and violates provider independence standards.

CAP requires a centralized, metadata-driven Template Resolution & Personalization architecture where business applications emit raw data parameters within a `NotificationIntent`, while the Communication Engine handles resolution, variable binding, personalization, localization, branding, rendering, and channel formatting.

---

# 3. Decision: Template Resolution & Personalization Architecture

CAP formally adopts a **Metadata-Driven, Hierarchical, Channel-Neutral Template Resolution & Rendering Pipeline**.

### Context & Pipeline Flow
```
[ NotificationIntent ] ──> [ RenderContext ] ──> [ Template Resolution Pipeline ]
```

### Complete Rendering Pipeline Architecture
```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           BUSINESS MODULE BOUNDARY                                │
│        (Publishes raw NotificationIntent with event parameters & targets)         │
└────────────────────────────────────────┬──────────────────────────────────────────┘
                                         │
                                         │ 1. NotificationIntent
                                         ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│              NOTIFICATION ENGINE TEMPLATE RESOLUTION & RENDERING PIPELINE         │
│                                                                                   │
│  ┌────────────────────────┐  Encapsulates immutable execution context             │
│  │ 2. RenderContext       ├────────────► [Tenant, Workspace, User, Culture, Varsi]│
│  └───────────┬────────────┘                                                       │
│              │                                                                    │
│              ▼                                                                    │
│  ┌────────────────────────┐  Finds highest metadata template override             │
│  │ 3. Template Resolution ├────────────► [Platform ➔ App ➔ Tenant ➔ Workspace]    │
│  └───────────┬────────────┘                                                       │
│              │                                                                    │
│              ▼                                                                    │
│  ┌────────────────────────┐  Deterministic variable binding                       │
│  │ 4. Variable Resolution ├────────────► [Static, Runtime, System, User, Doc, WF] │
│  └───────────┬────────────┘                                                       │
│              │                                                                    │
│              ▼                                                                    │
│  ┌────────────────────────┐  Recipient & context-based personalization            │
│  │ 5. Personalization     ├────────────► [Culture, Timezone, Preferences]         │
│  └───────────┬────────────┘                                                       │
│              │                                                                    │
│              ▼                                                                    │
│  ┌────────────────────────┐  Language, date, currency & number formatting         │
│  │ 6. Localization        ├────────────► [ISO Locale, Formatting Rules]           │
│  └───────────┬────────────┘                                                       │
│              │                                                                    │
│              ▼                                                                    │
│  ┌────────────────────────┐  Hierarchical visual layout injection                 │
│  │ 7. Branding            ├────────────► [Logo, Palette, Header, Footer, Legal]   │
│  └───────────┬────────────┘                                                       │
│              │                                                                    │
│              ▼                                                                    │
│  ┌────────────────────────┐  Generates abstract channel-neutral content           │
│  │ 8. Content Rendering   ├────────────► [Rendered Neutral Content Model]         │
│  └───────────┬────────────┘                                                       │
│              │                                                                    │
│              ▼                                                                    │
│  ┌────────────────────────┐  Adapts to specific channel media                     │
│  │ 9. Channel Formatting  ├────────────► [Email HTML | SMS Text | Push JSON ...]  │
│  └────────────────────────┘                                                       │
└───────────────────────────────────────────────────────────────────────────────────┘
```

Under this decision:
1. **Engine-Owned Rendering**: Template resolution, variable binding, localization, branding, and content rendering occur 100% inside the Communication Engine. Business applications SHALL NEVER render templates.
2. **Channel-Neutral Composition**: Rendering produces an abstract, channel-neutral communication model first. Channel-specific formatting (e.g., HTML wrappers for Email, plain text for SMS, JSON payloads for Push) occurs in a separate downstream stage.

---

# 4. Detailed Architectural Decisions

## 4.1 Immutable RenderContext Architecture
To prevent redundant external engine queries and ensure high-throughput execution, the rendering pipeline constructs an **immutable `RenderContext`** immediately after intent acceptance.

### `RenderContext` Structure:
- `tenantId`: Identifies the owning tenant context.
- `workspaceId`: Identifies the workspace boundary.
- `userId`: Identifies the target recipient identity.
- `culture`: ISO culture identifier (e.g., `en-US`, `ar-SA`).
- `language`: Target template language.
- `brandingProfile`: Resolved tenant/workspace visual branding asset reference.
- `templateVersion`: Bound immutable template version identifier.
- `variables`: Resolved payload and context variable map.
- `channel`: Target delivery channel media.

**Rule**: All downstream pipeline stages (Template Resolution, Variable Binding, Personalization, Localization, Branding, Rendering) operate strictly on the immutable `RenderContext` rather than querying external services repeatedly during pipeline execution.

---

## 4.2 Template Hierarchy & Override Selection
Templates inherit metadata definitions along a strict 4-tier hierarchy:

$$\text{Platform Default} \longrightarrow \text{Application Override} \longrightarrow \text{Tenant Override} \longrightarrow \text{Workspace Override}$$

### Inheritance & Override Rules:
- **Platform Default**: System-wide base templates supplied out-of-the-box by the CAP platform.
- **Application Override**: Application-specific template customizations provided by business modules.
- **Tenant Override**: Tenant-customized templates configured via tenant administration.
- **Workspace Override**: Sub-tenant or regional workspace-specific template overrides.
- **Selection Algorithm**: The `TemplateResolutionService` evaluates available templates from most specific (`Workspace`) to most generic (`Platform Default`). The highest available override matching the `RenderContext` is selected.
- **Partial Inheritance**: Overrides inherit sections (e.g., layout, subject line, body blocks) from parent templates unless explicitly overridden.

---

## 4.3 Template Versioning & Stability
The Notification Engine enforces explicit **Template Versioning**:

- **Intent Version Binding**: Every `NotificationIntent` references a specific `Template Version` (or resolves to an immutable active version at intent ingestion time).
- **Immutable Rendering Execution**: Rendering SHALL always execute using the exact bound template version.
- **Version Stability Guarantee**: Subsequent template updates, modifications, or new template version publications SHALL NEVER alter or affect already accepted `NotificationIntent` payloads currently in the pipeline.

---

## 4.4 Variable Resolution Model
Dynamic variables inside templates are resolved deterministically by the `TemplateResolutionService`.

### Supported Variable Scopes:
- **Static Variables**: Constant strings and platform parameters defined in template metadata.
- **Runtime Variables**: Intent payload parameters supplied directly within the `NotificationIntent`.
- **System Variables**: Platform environment parameters (e.g., current date, environment name, support contacts).
- **User / Recipient Variables**: Profile attributes fetched from Identity Engine (e.g., recipient first name, job title, preferred language).
- **Workflow Variables**: Process context parameters passed from Workflow Engine (e.g., approval task ID, step name).
- **Business Document Variables**: Context attributes associated with referenced document IDs (e.g., PO number, total amount, invoice date).

### Missing Variable Validation Policies:
When a template placeholder references a variable that is missing from the payload and context:
- `STRICT_FAIL`: Halts template rendering and marks the delivery as `DELIVERY_FAILED` (used for critical transactional templates).
- `DEFAULT_FALLBACK`: Replaces missing variable with a pre-configured fallback value defined in template metadata.
- `BLANK_PLACEHOLDER`: Replaces missing variable with an empty string (used for optional fields).

Business modules SHALL NEVER perform placeholder replacement prior to intent publication.

---

## 4.5 Personalization Engine
Personalization dynamically tailors communication content based on recipient and tenant context metadata:

- **Recipient Personalization**: Salutations, recipient name variations, communication preferences, and role-specific message sections.
- **Contextual Personalization**: Workspace-specific instructions, regional office contact details, and department-specific footers.
- **Culture & Timezone Personalization**: Time-sensitive greetings (e.g., "Good morning") calculated using the recipient's local timezone.

Personalization rules are 100% metadata-driven. Business modules SHALL NEVER assemble personalized message strings.

---

## 4.6 Localization Engine
Localization adapts content to the recipient's language, culture, and regional formatting standards prior to rendering.

### Supported Localization Capabilities:
- **Multilingual Content Selection**: Evaluates recipient preferred language (e.g., `en-US`, `ar-SA`, `fr-FR`) to select the matching `TemplateVariation`. If the target language is unavailable, the tenant's default fallback language is selected.
- **Culture-Specific Formatting**:
  - **Dates & Times**: Formatted according to locale conventions and converted to the recipient's local timezone.
  - **Numbers & Percentages**: Formatted with localized decimal separators and digit grouping.
  - **Currency**: Formatted with localized currency symbols, ISO codes, and fraction rules.
  - **Text Directionality**: Enforces Right-to-Left (RTL) or Left-to-Right (LTR) text alignment metadata for HTML and rich channels.

Localization MUST occur before content rendering. Template language selection is 100% metadata-driven.

---

## 4.7 Branding Engine
The Branding Engine injects visual identity and legal compliance assets into the rendered template layout.

### Supported Branding Components:
- **Visual Assets**: Tenant logo, application icon, background banner.
- **Color Palette**: Primary theme color, secondary accent color, background color, text color.
- **Typography**: Preferred font family, font size hierarchy.
- **Layout Structure**: Header wrapper, footer wrapper, email signature block.
- **Legal Compliance**: Mandated tenant legal disclaimers, company registration details, and global unsubscribe links.

### Branding Inheritance Hierarchy:
$$\text{Platform Theme} \longrightarrow \text{Application Theme} \longrightarrow \text{Tenant Branding} \longrightarrow \text{Workspace Branding}$$

Branding assets SHALL NEVER be hardcoded inside templates or business module code. All branding parameters are resolved dynamically from `BrandingProfile` metadata.

---

## 4.8 Attachment Resolution Architecture
The Notification Engine supports metadata-driven document attachment references:

- **Supported Document Types**: Invoices, Purchase Orders, Event Sheets, Kitchen Sheets, Route Plans, PDF Reports.
- **Identity-Based Attachment References**: Attachments are specified in the `NotificationIntent` payload using **document identity references only** (e.g., `documentId: "doc_12345"`).
- **Communication Engine Boundary**: The Communication Engine SHALL NEVER generate, render, or compile business documents (such as rendering PDF invoices from raw HTML). It fetches generated document binary streams from the **Document Management Engine** via identity references prior to channel dispatch.

---

## 4.9 Rendering Pipeline & Channel Formatting
Content rendering and channel formatting are strictly separate responsibilities:

```
[ Localized & Branded Template ] ──> [ Content Rendering ] ──> [ Channel-Neutral Content Model ]
                                                                             │
                                                                             ▼
                                                                  [ Channel Formatting ]
                                                                             │
                                    ┌───────────────────┬────────────────────┼───────────────────┐
                                    ▼                   ▼                    ▼                   ▼
                              [ Email HTML ]       [ SMS Text ]       [ Push JSON ]       [ Webhook JSON ]
```

### Stage 1: Content Rendering (Channel-Neutral)
- Merges resolved variables, localized text blocks, and branding wrappers from the `RenderContext`.
- Produces an abstract, channel-neutral communication model containing structural elements (Subject, Heading, Body Paragraphs, Action Buttons, Key-Value Summaries, Attachments).

### Stage 2: Channel Formatting (Media-Specific)
- Converts the channel-neutral communication model into channel-specific media output:
  - **Email**: Renders responsive HTML layout with embedded CSS styles, plain-text fallback body, and MIME attachment structures.
  - **SMS**: Extracts concise plain text, truncates within character limits, and strips unsupported HTML formatting.
  - **Mobile Push**: Generates rich push payload JSON containing title, body text, action category keys, and deep-link URLs.
  - **Webhook**: Generates structured JSON event payload matching external webhook contract.

---

## 4.10 Template Caching Boundaries
To optimize high-volume rendering performance while maintaining multi-tenant safety and recipient privacy:

- **Allowed Caching**:
  - Template Metadata Schemas (cached in-memory across worker nodes).
  - Uncompiled & Compiled Template Definitions (cached by template version key).
  - Branding Profile Metadata (cached by tenant/workspace key).
- **Prohibited Caching**:
  - **Rendered Communication Content SHALL NEVER be globally cached**, because personalization, localized formatting, and dynamic variable bindings are recipient-specific and tenant-isolated.

---

## 4.11 Future Architectural Extensibility
The architecture accommodates future advanced rendering capabilities without changing core pipeline contracts:

1. **Metadata-Driven Template Experiments (A/B Testing)**: Future support for metadata-driven variant routing, allowing tenant administrators to configure experimental template variants and evaluate recipient engagement without altering intent contracts.
2. **Accessibility-Aware Rendering**: Future support for accessibility metadata generation, including automated WCAG-compliant HTML structural tags, mandatory image alt text interpolation, and screen-reader metadata blocks.

---

# 5. External Identity Ownership Matrix

All external identity attributes referenced by the Template Resolution & Personalization architecture are owned by their respective bounded contexts. The Notification Engine holds identity references only:

| Identity Attribute | Location in Template Context | Owning Bounded Context | Description & Ownership |
| :--- | :--- | :--- | :--- |
| `tenantId` | `RenderContext`, `NotificationTemplate`, `BrandingProfile` | Tenant & Foundation Context | Identifies owning tenant organization. Owned by Tenant Engine. |
| `workspaceId` | `RenderContext`, `NotificationTemplate` | Workspace Context | Identifies operational workspace boundary. Owned by Tenant Engine. |
| `templateId` | `NotificationTemplate`, `TemplateVariation` | Notification Engine Context | Identifies specific template metadata definition. Owned by Notification Engine. |
| `brandingProfileId` | `BrandingProfile`, `RenderContext` | Notification Engine Context | Identifies visual branding asset profile. Owned by Notification Engine. |
| `userId` | `RecipientTarget`, `RenderContext` | Identity & Access Context | Identifies recipient user profile for variable binding. Owned by Identity Engine. |
| `workflowInstanceId` | `NotificationIntent` payload context | Workflow & Rules Context | Identifies originating workflow execution. Owned by Workflow Engine. |
| `documentId` | Attachment Reference | Document Management Context | Identifies referenced business document for attachment. Owned by Document Engine. |
| `notificationChannelId` | `DeliveryChannel`, `ChannelFormatting` | Notification Engine Context | Identifies target communication channel media. Owned by Notification Engine. |

---

# 6. Architectural Invariants

The Template Resolution & Personalization Architecture is governed by the following immutable invariants:

1. **Engine Template Ownership**: The Communication Engine owns 100% of template resolution, variable binding, localization, branding, and content rendering. Business applications MUST NEVER render templates.
2. **No Caller Personalization**: Business applications publish raw context data within a `NotificationIntent`. Business applications MUST NEVER perform caller-side personalization or localized string formatting.
3. **Metadata-Driven Overrides**: Template resolution MUST evaluate metadata-driven override hierarchies (`Platform` $\rightarrow$ `Application` $\rightarrow$ `Tenant` $\rightarrow$ `Workspace`). Hardcoded template overrides are strictly prohibited.
4. **Metadata-Driven Branding**: Visual branding assets, logos, color palettes, and legal disclaimers MUST be resolved from `BrandingProfile` metadata, never hardcoded in templates or application code.
5. **Deterministic Variable Resolution**: Variable binding MUST be deterministic. Missing variables MUST follow explicit validation policies (`STRICT_FAIL`, `DEFAULT_FALLBACK`, `BLANK_PLACEHOLDER`).
6. **Channel-Neutral Rendering**: Content rendering MUST produce a channel-neutral content model first. Channel-specific formatting (HTML, plain text, Push JSON) MUST occur as a downstream stage.
7. **Identity-Based Attachment References**: Attachments MUST be referenced by document identity (`documentId`) only. The Communication Engine SHALL NEVER generate or compile business documents.
8. **Complete Provider Independence**: Templates MUST remain provider-agnostic. Proprietary third-party vendor templates (e.g., SendGrid template IDs) MUST NOT be embedded in template metadata or intent payloads.
9. **Deterministic Rendering**: Rendering is 100% deterministic. The exact same combination of `Template Version` + `Variables` + `RenderContext` SHALL always produce identical rendered content output.
10. **Template Version Stability**: `NotificationIntent` resolution binds to a specific immutable `Template Version`. Subsequent template modifications or new version publications SHALL NEVER alter already ingested intents.

---

# 7. Cross-Engine Impacts

| Engine | Impact & Integration Boundary |
| :--- | :--- |
| **Metadata Engine** | Stores template schemas, localization dictionaries, visual layout wrapper definitions, and branding profile configurations. |
| **Identity Engine** | Queried during Variable Resolution to fetch recipient profile parameters (names, job titles, language preferences, timezones). |
| **Workflow Engine** | Supplies process variables (task names, step IDs, approval state) referenced in intent payloads for template variable resolution. |
| **Document Engine** | Queried during Attachment Resolution via `documentId` to fetch generated binary document streams (PDF invoices, PO sheets) for email attachments. |
| **Audit Engine** | Consumes template resolution events, rendered message summaries, and localization audit logs. |
| **Scheduler Engine** | Triggers digest batch rendering where multiple intents are combined into a single digest template layout. |
| **Runtime Engine** | Renders in-app notification inbox payloads using the neutral content model output. |
| **Commercial Engine** | Provides tenant tier branding entitlements (e.g., custom white-label branding vs. platform-branded footer). |

---

# 8. Alternatives Considered

### Alternative 1: Business Modules Rendering Templates
- *Description*: Originating business application modules render complete HTML/text strings before publishing notification requests.
- *Reason for Rejection*: Violates ES-001 and ES-013. Couples business logic to presentation layout, duplicates template code across services, prevents centralized tenant rebranding, and eliminates multi-channel formatting flexibility.

### Alternative 2: Hardcoded Placeholders & Strings
- *Description*: Embedding hardcoded text strings and fixed variable interpolation directly within source code files.
- *Reason for Rejection*: Prevents tenant self-service customization, prevents runtime multi-lingual localization, and requires code deployment for simple text updates.

### Alternative 3: Hardcoded Visual Branding
- *Description*: Embedding fixed logo URLs, header HTML, and color hex codes inside individual template files.
- *Reason for Rejection*: Makes tenant white-labeling impossible and requires updating hundreds of individual templates when platform branding changes.

### Alternative 4: Provider-Specific Templates
- *Description*: Storing third-party provider template IDs (e.g., SendGrid Dynamic Template IDs) directly inside business intents or database records.
- *Reason for Rejection*: Violates provider independence (ADR-009-002). Prevents provider failover (e.g., fallback from SendGrid to Amazon SES fails if templates are vendor-bound).

### Alternative 5: Channel-Specific Template Storage
- *Description*: Maintaining separate, independent template stores for Email, SMS, Push, and Webhooks for the same notification intent type.
- *Reason for Rejection*: Causes content drift across channels and multiplies template administration overhead. CAP uses unified metadata templates rendered into channel-neutral models.

---

# 9. Consequences

### Positive Consequences
- **Complete Application Decoupling**: Business developers publish raw event data without worrying about HTML formatting, multi-lingual translations, or visual themes.
- **Unified Multi-Tenant White-Labeling**: Enterprise tenants can effortlessly customize logos, headers, footers, and color palettes across all platform notifications.
- **Seamless Provider Failover**: Provider-agnostic rendering guarantees that fallback dispatches (e.g., email switching from SendGrid to Amazon SES) transmit identical rendered HTML/text without broken vendor templates.
- **Robust Localization**: Centralized culture-aware formatting ensures dates, numbers, and currencies render accurately according to recipient locale.

### Negative Consequences / Trade-offs
- **Template Resolution Latency**: Multi-stage pipeline (Override Resolution $\rightarrow$ Variable Binding $\rightarrow$ Localization $\rightarrow$ Branding $\rightarrow$ Rendering) adds processing CPU cycles, handled asynchronously in worker queues.
- **Caching Complexity**: High-performance rendering requires robust in-memory caching for compiled template schemas and branding profiles.

---

# 10. Non-Goals

The following concerns are explicitly excluded from this ADR:

1. **Template Editor UI**: Designing visual drag-and-drop template builders or administrative web interfaces (governed by frontend application packages).
2. **Rendering Engine Implementation Code**: Writing physical template compilation code or Handlebars/Mustache AST parsing scripts (governed by concrete implementation packages).
3. **Concrete Provider SDK Drivers**: Implementing vendor transport driver code (governed by ADR-009-002 provider adapters).
4. **Queue Processing & Worker Scheduling**: Specifying physical worker queue infrastructure (governed by ADR-009-001).
5. **Physical Storage Schemas**: Specifying database tables or file storage structures for templates (governed by storage implementation phases).

---

# 11. Related Documents

- **VS09-P001 — Communication & Notification Blueprint**
- **VS09-P002 — Communication & Notification Architecture Guide**
- **VS09-P003 — Communication & Notification Domain Model**
- **ADR-009-001 — Communication Delivery Model**
- **ADR-009-002 — Channel & Provider Abstraction**
- **ES-001 — Architectural Governance Standard**
- **ES-008 — Asynchronous Integration Standard**
- **ES-009 — Multi-Tenant Data & Processing Isolation**
- **ES-010 — System Resilience & Fault-Tolerance Principles**
- **ES-013 — Engine Architecture Governance Standard**
