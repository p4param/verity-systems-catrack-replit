# VAP Bootstrap Prompt v3.0

## Catering ERP Development Mode

### Purpose

This bootstrap prompt supersedes the previous platform-centric development guidance for application development.

The Verity Application Platform (VAP) has reached the level of maturity required to begin building the first production application: **Catrack Catering ERP**.

From this point onward, the Catering ERP is the primary project.

VAP is the enabling platform.

---

# 1. Primary Objective

Your primary objective is no longer to expand the platform.

Your objective is to build a world-class, production-ready Catering ERP on top of the existing VAP foundation.

Every decision should prioritize business value, usability, maintainability, and production quality.

---

# 2. Platform Status

Assume the existing VAP foundation is stable and available.

Do not revisit or redesign platform architecture unless explicitly instructed.

Treat the platform as a trusted application framework.

---

# 3. VAP Utilization Philosophy

Use VAP.

Do not redesign VAP.

Do not re-evaluate VAP architecture.

Do not optimize VAP internals.

Do not propose new platform abstractions unless a real business requirement exposes a genuine platform limitation.

Platform evolution must always be driven by business needs discovered during Catering ERP development.

---

# 4. Platform Transparency Principle

During Catering ERP development, VAP should be considered an implementation detail.

Your focus should remain on:

* Business processes
* User workflows
* Business entities
* Metadata
* Workspaces
* User experience
* Production-quality implementation

Do not spend implementation effort reasoning about internal platform mechanics that are already provided.

---

# 5. Entity Framework Guidance

Do **not** treat VAP's internal Entity Framework boundaries as part of the business design process.

The internal organization of:

* Entity Registry
* Runtime internals
* Metadata infrastructure
* Publish pipeline
* Repository organization
* Service layering
* Framework implementation details

is considered platform responsibility.

Unless explicitly instructed, do not redesign, analyze, debate, or recreate these internal structures.

Use the platform through its established extension points and continue with business implementation.

---

# 6. Metadata Philosophy

Metadata remains the authoritative definition of every business entity.

For every new business entity:

1. Define the business model.
2. Define metadata.
3. Publish metadata.
4. Use the runtime.
5. Build the required business experience.

Do not duplicate business definitions.

Maintain a single source of truth.

---

# 7. Runtime Philosophy

Use the Generic Runtime for standard business maintenance.

Examples include:

* CRUD
* Lists
* Forms
* Search
* Filters
* Lookups
* Standard data management

Build handcrafted business experiences for:

* Workspaces
* Dashboards
* Schedulers
* Timelines
* Planning
* Kitchen operations
* Logistics
* Financial workflows
* Complex operational experiences

The runtime accelerates development.

The workspace delivers business value.

---

# 8. Workspace First Principle

Design Workspaces before designing forms.

For major business entities, the Workspace is the primary user experience.

CRUD exists to maintain data.

The Workspace exists to run the business.

Every implementation should reinforce this philosophy.

---

# 9. User Experience Priority

Every feature should prioritize:

* simplicity
* clarity
* consistency
* responsiveness
* minimal clicks
* intuitive workflows
* modern SaaS design
* enterprise quality

Do not introduce unnecessary dialogs, navigation steps, or visual complexity.

Good UX is considered equally important as good engineering.

---

# 10. Simplicity Principle

Always choose the simplest solution that satisfies today's business requirement.

Do not introduce additional abstractions, extension points, or framework layers for speculative future use.

Expand the platform only when a real business requirement demonstrates the need.

---

# 11. Development Sequence

For every module, follow this lifecycle:

1. Business Analysis
2. UX Design
3. Workspace Design
4. Metadata Design
5. Entity Design
6. Implementation
7. Testing
8. Refinement
9. Production Ready

Do not skip stages.

Do not leave TODOs.

Do not leave placeholders.

---

# 12. AI Focus

When implementing business modules:

Spend effort on:

* Business understanding
* Business workflows
* Workspace design
* Metadata
* Runtime integration
* Production-quality implementation
* Performance
* Reliability
* User experience

Avoid spending effort on:

* Internal platform restructuring
* Re-justifying existing VAP architecture
* Creating new framework abstractions
* Revisiting established platform decisions
* Reorganizing stable platform components

---

# 13. Platform Enhancement Rule

Only recommend VAP changes when:

* a genuine business requirement cannot be implemented cleanly,
* an existing platform capability is demonstrably insufficient,
* or a platform defect prevents correct implementation.

Do not create platform enhancements based on hypothetical future scenarios.

---

# 14. Working Principle

Assume that VAP is a mature framework.

Consume it.

Extend it only when necessary.

Do not make the platform the focus of implementation.

Keep the focus on delivering an exceptional Catering ERP.

---

# 15. Success Criteria

A successful implementation is one that:

* Solves the real business problem.
* Produces an elegant user experience.
* Uses VAP naturally.
* Keeps metadata authoritative.
* Avoids unnecessary complexity.
* Is production ready.
* Can serve as a reusable pattern for future ERP applications.

---

# Final Directive

From this point onward, the Catering ERP is the project.

VAP is the foundation.

Do not allow internal platform architecture to distract from solving business problems.

Treat VAP as a stable framework.

Build business features with confidence, simplicity, and discipline.

Every platform improvement must be justified by a real business requirement discovered during Catering ERP development.


Development Boundary

This section was split into its own document during the docs/ repository migration: see [`docs/project-governance/DEVELOPMENT-BOUNDARY.md`](../project-governance/DEVELOPMENT-BOUNDARY.md) for the full, current text.

Design the experience first.

Metadata, entities, services, APIs, and implementation exist to support that experience—not to constrain it.

Experience-Driven Design

Every business capability begins with the desired user experience. Business workflows, Workspace design, metadata, runtime configuration, and implementation are derived from that experience. VAP exists to enable exceptional business experiences—not to dictate them.