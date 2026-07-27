# APP-ADMIN-002 Walkthrough: Venue Directory and Lookup Foundation

## Scope Delivered
- Venue Directory in Business Setup.
- Venue entity Version 1 with core fields only.
- Reusable Venue Lookup with keyboard behavior and quick create.
- Venue Discovery integration replacing the mock picker.
- Venue CSV export.

## Access Paths
- Business Setup workspace: `/business-setup`
- Venue Directory: `/cat/venues`
- Venue detail/view/edit: `/cat/venues/:id`
- Venue lookup API: `/api/cat/venues/lookup`

## Venue Directory
1. Open Business Setup and click `Venues`.
2. Use search to find venues by name, number, city, or contact.
3. Apply filters:
- Status (`ACTIVE`, `INACTIVE`)
- Venue Type
4. Click `Add Venue` to create a new venue.
5. Click `View` or `Edit` on a row to inspect or update a venue.
6. Click `Export CSV` to download the filtered dataset.

## Venue Entity (V1)
Implemented fields:
- Venue Name (required)
- Venue Type (required)
- Address
- Area / Locality
- City
- State
- Country
- PIN Code
- Primary Contact Name
- Primary Contact Mobile
- Primary Contact Email
- Notes
- Status (`ACTIVE` / `INACTIVE`)

Explicitly not included in this package:
- Kitchen
- Parking
- Power
- Loading
- Outdoor Setup

These remain in Venue Discovery, aligned to CAT-BR-002.

## Venue Lookup Behavior
- Debounced search: 250 ms.
- Result cap: top 15.
- Keyboard support:
- Arrow Down / Arrow Up to move highlight.
- Enter to select highlighted venue.
- Escape to close results.
- Selected venue appears as compact card.
- Quick Create is available when no results exist.

## Discovery Integration
- Venue Discovery workspace now uses the reusable Venue Lookup component.
- Selection mode remains unchanged (`EXISTING` or `PROPOSED`).
- No UX redesign and no workflow changes were introduced.
- Existing save and summary-generation behavior remains intact.

## CSV Export Columns
- Venue Number
- Venue Name
- Venue Type
- City
- Primary Contact
- Mobile
- Status
- Created Date

## Data and Migration
- New table: `cat_venues`.
- Migration file: `prisma/migrations/20260725200000_add_cat_venues/migration.sql`.
- Prisma model added: `CatVenue`.
