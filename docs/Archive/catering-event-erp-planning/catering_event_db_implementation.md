# Event Manager Database Implementation (PostgreSQL + Prisma)

## 1. File: `prisma/schema.prisma`

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ─── CORE & SECURITY MASTERS ──────────────────────────────────────────────────

model Company {
  id        String   @id @default(uuid()) @db.Uuid
  name      String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?
  isDeleted Boolean  @default(false)
  version   Int      @default(1)

  events             Event[]
  eventTypes         EventType[]
  eventStatuses      EventStatus[]
  eventCategories    EventCategory[]
  eventPriorities    EventPriority[]
  eventApprovals     EventApproval[]
  templates          PackageTemplate[]
  configurations     MonitoringConfiguration[]
  telemetryLogs      TelemetryLog[]

  @@map("companies")
}

model Branch {
  id        String   @id @default(uuid()) @db.Uuid
  companyId String   @db.Uuid
  name      String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?
  isDeleted Boolean  @default(false)
  version   Int      @default(1)

  events             Event[]
  warehouses         Warehouse[]
  staffPlans         EventStaffPlan[]
  workingCalendars   WorkingCalendar[]

  @@map("branches")
}

model Warehouse {
  id        String   @id @default(uuid()) @db.Uuid
  branchId  String   @db.Uuid
  name      String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?
  isDeleted Boolean  @default(false)
  version   Int      @default(1)

  branch    Branch   @relation(fields: [branchId], references: [id])
  resources EventResource[]

  @@map("warehouses")
}

// ─── EVENT HEADERS & METADATA ─────────────────────────────────────────────────

model Event {
  id             String   @id @default(uuid()) @db.Uuid
  tenantId       String   @db.Uuid
  companyId      String   @db.Uuid
  branchId       String   @db.Uuid
  eventNumber    String   @unique
  name           String
  typeId         String   @db.Uuid
  statusId       String   @db.Uuid
  priorityId     String   @db.Uuid
  customerId     String   @db.Uuid
  contactId      String   @db.Uuid
  salesExecId    String   @db.Uuid
  managerId      String?  @db.Uuid
  bookingDate    DateTime
  startDate      DateTime
  endDate        DateTime
  guestCount     Int
  budgetAmount   Decimal  @db.Decimal(12, 2)
  currency       String   @default("USD")
  remarks        String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?
  isDeleted      Boolean  @default(false)
  version        Int      @default(1)

  company        Company       @relation(fields: [companyId], references: [id])
  branch         Branch        @relation(fields: [branchId], references: [id])
  type           EventType     @relation(fields: [typeId], references: [id])
  status         EventStatus   @relation(fields: [statusId], references: [id])
  priority       EventPriority @relation(fields: [priorityId], references: [id])

  functions      EventFunction[]
  venues         EventVenue[]
  assignments    EventAssignment[]
  schedules      EventSchedule[]
  calendars      EventCalendar[]
  activities     EventActivity[]
  notes          EventNote[]
  tasks          EventTask[]
  documents      EventDocument[]
  communications EventCommunication[]
  payments       EventPayment[]
  costing        EventCosting?
  budget         EventBudget?
  resources      EventResource[]
  resourceReqs   EventResourceRequirement[]
  menus          EventMenu[]
  healthScores   EventHealthScore[]
  approvals      EventApproval[]
  timeline       EventTimeline[]
  customValues   EventCustomFieldValue[]
  notifications  EventNotification[]
  auditLogs      EventAuditLog[]

  @@map("events")
}

model EventType {
  id        String   @id @default(uuid()) @db.Uuid
  companyId String   @db.Uuid
  name      String
  code      String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?
  isDeleted Boolean  @default(false)
  version   Int      @default(1)

  company   Company  @relation(fields: [companyId], references: [id])
  events    Event[]

  @@map("event_types")
}

model EventStatus {
  id        String   @id @default(uuid()) @db.Uuid
  companyId String   @db.Uuid
  name      String
  code      String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?
  isDeleted Boolean  @default(false)
  version   Int      @default(1)

  company   Company  @relation(fields: [companyId], references: [id])
  events    Event[]

  @@map("event_statuses")
}

model EventCategory {
  id        String   @id @default(uuid()) @db.Uuid
  companyId String   @db.Uuid
  name      String
  code      String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?
  isDeleted Boolean  @default(false)
  version   Int      @default(1)

  company   Company  @relation(fields: [companyId], references: [id])

  @@map("event_categories")
}

model EventPriority {
  id        String   @id @default(uuid()) @db.Uuid
  companyId String   @db.Uuid
  name      String
  code      String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?
  isDeleted Boolean  @default(false)
  version   Int      @default(1)

  company   Company  @relation(fields: [companyId], references: [id])
  events    Event[]

  @@map("event_priorities")
}

// ─── OPERATIONAL ENTITIES ─────────────────────────────────────────────────────

model EventFunction {
  id             String   @id @default(uuid()) @db.Uuid
  eventId        String   @db.Uuid
  name           String
  startAt        DateTime
  endAt          DateTime
  guestCount     Int
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?
  isDeleted      Boolean  @default(false)
  version        Int      @default(1)

  event          Event    @relation(fields: [eventId], references: [id])
  menus          EventMenu[]
  staffPlans     EventStaffPlan[]

  @@map("event_functions")
}

model EventVenue {
  id             String   @id @default(uuid()) @db.Uuid
  eventId        String   @db.Uuid
  venueId        String   @db.Uuid
  rentAmount     Decimal  @db.Decimal(12, 2)
  contractSigned Boolean  @default(false)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?
  isDeleted      Boolean  @default(false)
  version        Int      @default(1)

  event          Event    @relation(fields: [eventId], references: [id])

  @@map("event_venues")
}

model EventContacts {
  id             String   @id @default(uuid()) @db.Uuid
  eventId        String   @db.Uuid
  contactName    String
  email          String
  phone          String
  role           String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?
  isDeleted      Boolean  @default(false)
  version        Int      @default(1)

  @@map("event_contacts")
}

model EventAssignment {
  id             String   @id @default(uuid()) @db.Uuid
  eventId        String   @db.Uuid
  userId         String   @db.Uuid
  roleCode       String
  assignedAt     DateTime @default(now())
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?
  isDeleted      Boolean  @default(false)
  version        Int      @default(1)

  event          Event    @relation(fields: [eventId], references: [id])

  @@map("event_assignments")
}

model EventSchedule {
  id             String   @id @default(uuid()) @db.Uuid
  eventId        String   @db.Uuid
  title          String
  startAt        DateTime
  endAt          DateTime
  description    String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?
  isDeleted      Boolean  @default(false)
  version        Int      @default(1)

  event          Event    @relation(fields: [eventId], references: [id])

  @@map("event_schedules")
}

model EventCalendar {
  id             String   @id @default(uuid()) @db.Uuid
  eventId        String   @db.Uuid
  calendarType   String   @default("EVENT") // PERSONAL, TEAM, EVENT, SLA
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?
  isDeleted      Boolean  @default(false)
  version        Int      @default(1)

  event          Event    @relation(fields: [eventId], references: [id])

  @@map("event_calendars")
}

model EventActivity {
  id             String   @id @default(uuid()) @db.Uuid
  eventId        String   @db.Uuid
  activityType   String   @default("NOTE")
  notes          String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?
  isDeleted      Boolean  @default(false)
  version        Int      @default(1)

  event          Event    @relation(fields: [eventId], references: [id])

  @@map("event_activities")
}

model EventNote {
  id             String   @id @default(uuid()) @db.Uuid
  eventId        String   @db.Uuid
  title          String
  content        String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?
  isDeleted      Boolean  @default(false)
  version        Int      @default(1)

  event          Event    @relation(fields: [eventId], references: [id])

  @@map("event_notes")
}

// ─── CHECKLISTS & TASK ENGINES ────────────────────────────────────────────────

model EventTask {
  id             String   @id @default(uuid()) @db.Uuid
  eventId        String   @db.Uuid
  title          String
  description    String?
  priority       String   @default("MEDIUM")
  status         String   @default("DRAFT")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?
  isDeleted      Boolean  @default(false)
  version        Int      @default(1)

  event          Event    @relation(fields: [eventId], references: [id])
  checklists     EventTaskChecklist[]

  @@map("event_tasks")
}

model EventTaskChecklist {
  id             String   @id @default(uuid()) @db.Uuid
  taskId         String   @db.Uuid
  title          String
  isCompleted    Boolean  @default(false)
  completedAt    DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?
  isDeleted      Boolean  @default(false)
  version        Int      @default(1)

  task           EventTask @relation(fields: [taskId], references: [id])

  @@map("event_task_checklists")
}

// ─── COMMUNICATIONS & FILES ───────────────────────────────────────────────────

model EventDocument {
  id             String   @id @default(uuid()) @db.Uuid
  eventId        String   @db.Uuid
  name           String
  filePath       String
  fileSize       Int
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?
  isDeleted      Boolean  @default(false)
  version        Int      @default(1)

  event          Event    @relation(fields: [eventId], references: [id])

  @@map("event_documents")
}

model EventCommunication {
  id             String   @id @default(uuid()) @db.Uuid
  eventId        String   @db.Uuid
  channel        String   // EMAIL, SMS, WHATSAPP
  recipient      String
  subject        String?
  content        String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?
  isDeleted      Boolean  @default(false)
  version        Int      @default(1)

  event          Event    @relation(fields: [eventId], references: [id])

  @@map("event_communications")
}

// ─── FINANCIAL PLANNING ──────────────────────────────────────────────────────

model EventPayment {
  id             String   @id @default(uuid()) @db.Uuid
  eventId        String   @db.Uuid
  amount         Decimal  @db.Decimal(12, 2)
  method         String
  transactionId  String?
  paidAt         DateTime @default(now())
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?
  isDeleted      Boolean  @default(false)
  version        Int      @default(1)

  event          Event    @relation(fields: [eventId], references: [id])

  @@map("event_payments")
}

model EventCosting {
  id             String   @id @default(uuid()) @db.Uuid
  eventId        String   @unique @db.Uuid
  estimatedFood  Decimal  @db.Decimal(12, 2)
  estimatedLabor Decimal  @db.Decimal(12, 2)
  estimatedLogistics Decimal @db.Decimal(12, 2)
  actualFood     Decimal  @default(0) @db.Decimal(12, 2)
  actualLabor    Decimal  @default(0) @db.Decimal(12, 2)
  actualLogistics Decimal @default(0) @db.Decimal(12, 2)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?
  isDeleted      Boolean  @default(false)
  version        Int      @default(1)

  event          Event    @relation(fields: [eventId], references: [id])

  @@map("event_costings")
}

model EventBudget {
  id             String   @id @default(uuid()) @db.Uuid
  eventId        String   @unique @db.Uuid
  allocatedAmount Decimal @db.Decimal(12, 2)
  spentAmount    Decimal  @default(0) @db.Decimal(12, 2)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?
  isDeleted      Boolean  @default(false)
  version        Int      @default(1)

  event          Event    @relation(fields: [eventId], references: [id])

  @@map("event_budgets")
}

// ─── RESOURCES & LOGISTICS ────────────────────────────────────────────────────

model EventResource {
  id             String   @id @default(uuid()) @db.Uuid
  eventId        String   @db.Uuid
  warehouseId    String   @db.Uuid
  name           String
  quantity       Int
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?
  isDeleted      Boolean  @default(false)
  version        Int      @default(1)

  event          Event     @relation(fields: [eventId], references: [id])
  warehouse      Warehouse @relation(fields: [warehouseId], references: [id])

  @@map("event_resources")
}

model EventResourceRequirement {
  id             String   @id @default(uuid()) @db.Uuid
  eventId        String   @db.Uuid
  resourceType   String
  quantity       Int
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?
  isDeleted      Boolean  @default(false)
  version        Int      @default(1)

  event          Event    @relation(fields: [eventId], references: [id])

  @@map("event_resource_requirements")
}

model EventStaffPlan {
  id             String   @id @default(uuid()) @db.Uuid
  functionId     String   @db.Uuid
  branchId       String   @db.Uuid
  roleCode       String
  requiredCount  Int
  hourlyRate     Decimal  @db.Decimal(10, 2)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?
  isDeleted      Boolean  @default(false)
  version        Int      @default(1)

  branch         Branch        @relation(fields: [branchId], references: [id])
  function       EventFunction @relation(fields: [functionId], references: [id])

  @@map("event_staff_plans")
}

// ─── CULINARY SERVICES ────────────────────────────────────────────────────────

model EventMenu {
  id             String   @id @default(uuid()) @db.Uuid
  functionId     String   @db.Uuid
  eventId        String   @db.Uuid
  packageVersionId String @db.Uuid
  pricePerHead   Decimal  @db.Decimal(12, 2)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?
  isDeleted      Boolean  @default(false)
  version        Int      @default(1)

  event          Event         @relation(fields: [eventId], references: [id])
  function       EventFunction @relation(fields: [functionId], references: [id])

  @@map("event_menus")
}

// ─── ENGINE SCORES & GOVERNANCE ────────────────────────────────────────────────

model EventHealthScore {
  id             String   @id @default(uuid()) @db.Uuid
  eventId        String   @db.Uuid
  score          Int
  calculatedAt   DateTime @default(now())
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?
  isDeleted      Boolean  @default(false)
  version        Int      @default(1)

  event          Event    @relation(fields: [eventId], references: [id])

  @@map("event_health_scores")
}

model EventApproval {
  id             String   @id @default(uuid()) @db.Uuid
  eventId        String   @db.Uuid
  companyId      String   @db.Uuid
  approverId     String   @db.Uuid
  status         String   @default("PENDING")
  notes          String?
  actionedAt     DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?
  isDeleted      Boolean  @default(false)
  version        Int      @default(1)

  event          Event    @relation(fields: [eventId], references: [id])
  company        Company  @relation(fields: [companyId], references: [id])

  @@map("event_approvals")
}

model EventTimeline {
  id             String   @id @default(uuid()) @db.Uuid
  eventId        String   @db.Uuid
  summary        String
  details        String?
  loggedAt       DateTime @default(now())
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?
  isDeleted      Boolean  @default(false)
  version        Int      @default(1)

  event          Event    @relation(fields: [eventId], references: [id])

  @@map("event_timelines")
}

model EventTag {
  id             String   @id @default(uuid()) @db.Uuid
  name           String
  colorCode      String   @default("#6b7280")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?
  isDeleted      Boolean  @default(false)
  version        Int      @default(1)

  @@map("event_tags")
}

model EventCustomField {
  id             String   @id @default(uuid()) @db.Uuid
  name           String
  fieldType      String   @default("STRING")
  isRequired     Boolean  @default(false)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?
  isDeleted      Boolean  @default(false)
  version        Int      @default(1)

  values         EventCustomFieldValue[]

  @@map("event_custom_fields")
}

model EventCustomFieldValue {
  id             String   @id @default(uuid()) @db.Uuid
  eventId        String   @db.Uuid
  fieldId        String   @db.Uuid
  valueText      String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?
  isDeleted      Boolean  @default(false)
  version        Int      @default(1)

  event          Event            @relation(fields: [eventId], references: [id])
  field          EventCustomField @relation(fields: [fieldId], references: [id])

  @@map("event_custom_field_values")
}

model EventNotification {
  id             String   @id @default(uuid()) @db.Uuid
  eventId        String   @db.Uuid
  userId         String   @db.Uuid
  channel        String   @default("IN_APP")
  title          String
  body           String
  isRead         Boolean  @default(false)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?
  isDeleted      Boolean  @default(false)
  version        Int      @default(1)

  event          Event    @relation(fields: [eventId], references: [id])

  @@map("event_notifications")
}

model EventAuditLog {
  id             String   @id @default(uuid()) @db.Uuid
  eventId        String   @db.Uuid
  actionType     String   // CREATE, UPDATE, DELETE
  previousState  String?  @db.Text // JSON string
  currentState   String?  @db.Text // JSON string
  changedBy      String   @db.Uuid
  changedAt      DateTime @default(now())
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?
  isDeleted      Boolean  @default(false)
  version        Int      @default(1)

  event          Event    @relation(fields: [eventId], references: [id])

  @@map("event_audit_logs")
}

model PackageTemplate {
  id             String   @id @default(uuid()) @db.Uuid
  companyId      String   @db.Uuid
  name           String
  templateConfig String   @db.Text
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?
  isDeleted      Boolean  @default(false)
  version        Int      @default(1)

  company        Company  @relation(fields: [companyId], references: [id])

  @@map("package_templates")
}

model WorkingCalendar {
  id             String   @id @default(uuid()) @db.Uuid
  branchId       String   @db.Uuid
  dayOfWeek      Int
  startTime      String
  endTime        String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?
  isDeleted      Boolean  @default(false)
  version        Int      @default(1)

  branch         Branch   @relation(fields: [branchId], references: [id])

  @@map("working_calendars")
}

model MonitoringConfiguration {
  id             String   @id @default(uuid()) @db.Uuid
  companyId      String   @db.Uuid
  configKey      String   @unique
  configValue    String   @db.Text
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?
  isDeleted      Boolean  @default(false)
  version        Int      @default(1)

  company        Company  @relation(fields: [companyId], references: [id])

  @@map("monitoring_configurations")
}

model TelemetryLog {
  id             String   @id @default(uuid()) @db.Uuid
  companyId      String   @db.Uuid
  traceId        String
  spanId         String
  logLevel       String
  message        String   @db.Text
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?
  isDeleted      Boolean  @default(false)
  version        Int      @default(1)

  company        Company  @relation(fields: [companyId], references: [id])

  @@map("telemetry_logs")
}
```

---

## 2. PostgreSQL DDL Database Schema (`database-schema.sql`)

```sql
CREATE SCHEMA IF NOT EXISTS events;

-- Create core status and type tables
CREATE TABLE events.event_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    version INT NOT NULL DEFAULT 1
);

CREATE TABLE events.event_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    version INT NOT NULL DEFAULT 1
);

CREATE TABLE events.event_priorities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    version INT NOT NULL DEFAULT 1
);

-- Event Header
CREATE TABLE events.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    company_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    event_number VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    type_id UUID NOT NULL REFERENCES events.event_types(id),
    status_id UUID NOT NULL REFERENCES events.event_statuses(id),
    priority_id UUID NOT NULL REFERENCES events.event_priorities(id),
    customer_id UUID NOT NULL,
    contact_id UUID NOT NULL,
    sales_exec_id UUID NOT NULL,
    manager_id UUID,
    booking_date TIMESTAMP WITH TIME ZONE NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    guest_count INT NOT NULL,
    budget_amount NUMERIC(12,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    version INT NOT NULL DEFAULT 1
);
CREATE INDEX idx_events_tenant ON events.events(tenant_id, company_id);
CREATE INDEX idx_events_branch_status ON events.events(branch_id, status_id);

-- Sub-Events
CREATE TABLE events.event_functions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events.events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    start_at TIMESTAMP WITH TIME ZONE NOT NULL,
    end_at TIMESTAMP WITH TIME ZONE NOT NULL,
    guest_count INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    version INT NOT NULL DEFAULT 1
);
CREATE INDEX idx_event_functions_parent ON events.event_functions(event_id);

-- Venue link
CREATE TABLE events.event_venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events.events(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL,
    rent_amount NUMERIC(12,2) NOT NULL,
    contract_signed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    version INT NOT NULL DEFAULT 1
);

-- Event Task
CREATE TABLE events.event_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events.events(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    version INT NOT NULL DEFAULT 1
);

-- Event Financials
CREATE TABLE events.event_costings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL UNIQUE REFERENCES events.events(id) ON DELETE CASCADE,
    estimated_food NUMERIC(12,2) NOT NULL,
    estimated_labor NUMERIC(12,2) NOT NULL,
    estimated_logistics NUMERIC(12,2) NOT NULL,
    actual_food NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    actual_labor NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    actual_logistics NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    version INT NOT NULL DEFAULT 1
);

CREATE TABLE events.event_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events.events(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    method VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(100),
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    version INT NOT NULL DEFAULT 1
);
```

---

## 3. Database Views (`src/lib/db/event-views.sql`)

```sql
-- View 1: Event Summary
CREATE OR REPLACE VIEW vw_EventSummary AS
SELECT 
    e.id AS event_id,
    e.event_number,
    e.name AS event_name,
    et.name AS event_type,
    es.name AS event_status,
    ep.name AS event_priority,
    e.start_date,
    e.end_date,
    e.guest_count,
    e.budget_amount,
    COALESCE(c.actual_food + c.actual_labor + c.actual_logistics, 0) AS total_actual_cost,
    COALESCE(p.total_paid, 0) AS total_amount_paid
FROM events.events e
LEFT JOIN events.event_types et ON e.type_id = et.id
LEFT JOIN events.event_statuses es ON e.status_id = es.id
LEFT JOIN events.event_priorities ep ON e.priority_id = ep.id
LEFT JOIN events.event_costings c ON e.id = c.event_id
LEFT JOIN (
    SELECT event_id, SUM(amount) AS total_paid 
    FROM events.event_payments 
    WHERE is_deleted = false 
    GROUP BY event_id
) p ON e.id = p.event_id
WHERE e.is_deleted = false;

-- View 2: Event Profitability View
CREATE OR REPLACE VIEW vw_EventProfitability AS
SELECT 
    e.id AS event_id,
    e.event_number,
    e.name AS event_name,
    e.budget_amount AS revenue,
    COALESCE(c.actual_food + c.actual_labor + c.actual_logistics, 0) AS actual_cost,
    (e.budget_amount - COALESCE(c.actual_food + c.actual_labor + c.actual_logistics, 0)) AS net_profit,
    CASE 
        WHEN e.budget_amount > 0 
        THEN ROUND(((e.budget_amount - COALESCE(c.actual_food + c.actual_labor + c.actual_logistics, 0)) / e.budget_amount) * 100, 2)
        ELSE 0 
    END AS margin_percentage
FROM events.events e
LEFT JOIN events.event_costings c ON e.id = c.event_id
WHERE e.is_deleted = false;
```

---

## 4. Functions & Stored Procedures (`src/lib/db/event-functions.sql`)

```sql
-- Function to generate Time-Ordered Event Numbers (e.g. NY-EV-2026-00045)
CREATE OR REPLACE FUNCTION events.fn_generate_event_number(p_branch_id UUID, p_year INT)
RETURNS VARCHAR AS $$
DECLARE
    v_prefix VARCHAR(10);
    v_seq_val INT;
    v_event_num VARCHAR(50);
BEGIN
    -- Resolve Branch Prefix Code
    SELECT LEFT(UPPER(name), 3) INTO v_prefix FROM masterdata.branches WHERE id = p_branch_id;
    IF NOT FOUND THEN
        v_prefix := 'GEN';
    END IF;

    -- Increment or Initialize Sequence
    INSERT INTO core.number_series (branch_id, document_type, next_value, fiscal_year, pattern)
    VALUES (p_branch_id, 'EVENT', 1, p_year, '{PREFIX}-EV-{YEAR}-{SEQ}')
    ON CONFLICT (branch_id, document_type, fiscal_year)
    DO UPDATE SET next_value = core.number_series.next_value + 1
    RETURNING next_value INTO v_seq_val;

    v_event_num := v_prefix || '-EV-' || p_year::TEXT || '-' || LPAD(v_seq_val::TEXT, 5, '0');
    RETURN v_event_num;
END;
$$ LANGUAGE plpgsql;
```

---

## 5. Triggers (`src/lib/db/event-triggers.sql`)

```sql
-- Trigger Function for Updating timestamp
CREATE OR REPLACE FUNCTION events.trg_fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger Function for optimistic locking / version increments
CREATE OR REPLACE FUNCTION events.trg_fn_increment_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bind to Events table
CREATE TRIGGER trg_events_update_time
    BEFORE UPDATE ON events.events
    FOR EACH ROW EXECUTE FUNCTION events.trg_fn_update_timestamp();

CREATE TRIGGER trg_events_inc_version
    BEFORE UPDATE ON events.events
    FOR EACH ROW EXECUTE FUNCTION events.trg_fn_increment_version();
```
