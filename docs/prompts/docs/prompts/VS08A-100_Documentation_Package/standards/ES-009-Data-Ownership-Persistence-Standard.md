# ES-009 — Data Ownership & Persistence Standard

## Purpose
Define ownership boundaries and persistence rules for CAP.

## Data Domains
- Platform Data
- Reference Data
- Tenant Data
- Workspace Data
- Runtime Data (non-persistent)

## Rules
1. Every persistent entity belongs to exactly one data domain.
2. Platform data is never tenant-owned.
3. Workspace data is always scoped by a TenantWorkspace.
4. Runtime objects are never persisted.
5. Cross-tenant access is prohibited.
6. Published artifacts are immutable.
