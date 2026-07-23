# DDS-101A — Database Design Specification

## Core Entities
- PlatformApplication
- PlatformApplicationPackage
- Tenant
- TenantWorkspace
- WorkspaceInstallation
- TenantMembership
- WorkspaceMembership
- WorkspaceEnvironment

## Principles
- UUID primary keys
- Audit fields on all persistent entities
- Soft delete
- Immutable published artifacts
- Tenant and Workspace isolation
