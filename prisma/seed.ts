/**
 * @deprecated LEGACY — Event specific master seeding.
 * This is superseded by the Core Master Data Engine (MDE) seed.
 */
import { PrismaClient } from "../src/generated/client";

const prisma = new PrismaClient();

async function main() {
  const companyId = "2444c125-9ef1-4bdf-87f5-8d5cb5b2632b";
  const branchId = "6475a34e-4f7f-4318-ae7f-0b32ee7c2a4c";
  const tenantId = "8ee8a6c8-5dc6-4113-8898-0c67f4c54093";
  const creatorId = "3673f1d8-04ff-44e2-a05e-8557b447814b";

  console.log("Seeding Catering Event Manager Module...");

  // 1. Event Statuses
  const statuses = [
    { code: "INQUIRY", name: "Inquiry" },
    { code: "TENTATIVE", name: "Tentative Booking" },
    { code: "QUOTATION", name: "Quotation" },
    { code: "NEGOTIATION", name: "Negotiation" },
    { code: "CONFIRMED", name: "Confirmed" },
    { code: "PLANNING", name: "Planning" },
    { code: "PRODUCTION", name: "Production" },
    { code: "DISPATCH", name: "Dispatch" },
    { code: "EXECUTION", name: "Execution" },
    { code: "SETTLEMENT", name: "Settlement" },
    { code: "COMPLETED", name: "Completed" },
    { code: "ARCHIVED", name: "Archived" },
  ];

  for (const status of statuses) {
    await prisma.cateringEventStatus.upsert({
      where: { id: "00000000-0000-0000-0000-000000000000" }, // Mock unique target
      create: {
        tenantId,
        companyId,
        branchId,
        code: status.code,
        name: status.name,
        createdBy: creatorId,
        updatedBy: creatorId,
      },
      update: {},
    });
  }

  // 2. Event Priorities
  const priorities = [
    { code: "LOW", name: "Low" },
    { code: "MEDIUM", name: "Medium" },
    { code: "HIGH", name: "High" },
  ];

  for (const priority of priorities) {
    await prisma.cateringEventPriority.upsert({
      where: { id: "00000000-0000-0000-0000-000000000000" },
      create: {
        tenantId,
        companyId,
        branchId,
        code: priority.code,
        name: priority.name,
        createdBy: creatorId,
        updatedBy: creatorId,
      },
      update: {},
    });
  }

  // 3. Event Types
  const types = [
    { code: "WEDDING", name: "Wedding" },
    { code: "RECEPTION", name: "Reception" },
    { code: "ENGAGEMENT", name: "Engagement" },
    { code: "BIRTHDAY", name: "Birthday" },
    { code: "CORPORATE", name: "Corporate Event" },
    { code: "CONFERENCE", name: "Conference" },
    { code: "EXHIBITION", name: "Exhibition" },
    { code: "RELIGIOUS", name: "Religious Event" },
  ];

  for (const type of types) {
    await prisma.cateringEventType.upsert({
      where: { id: "00000000-0000-0000-0000-000000000000" },
      create: {
        tenantId,
        companyId,
        branchId,
        code: type.code,
        name: type.name,
        createdBy: creatorId,
        updatedBy: creatorId,
      },
      update: {},
    });
  }

  // 4. Platform Modules
  const modules = [
    { code: "CRM", name: "CRM", description: "Customer Relationship Management", icon: "Users", sortOrder: 10 },
    { code: "EVENT", name: "Event Management", description: "Catering Event Management", icon: "Calendar", sortOrder: 20 },
    { code: "QUOTATION", name: "Quotation", description: "Quotations and Estimates", icon: "FileText", sortOrder: 30 },
    { code: "PRODUCTION", name: "Production", description: "Event Production Management", icon: "Sliders", sortOrder: 40 },
    { code: "KITCHEN", name: "Kitchen", description: "Kitchen and Menu Operations", icon: "ChefHat", sortOrder: 50 },
    { code: "INVENTORY", name: "Inventory", description: "Inventory and Stock Control", icon: "Box", sortOrder: 60 },
    { code: "PROCUREMENT", name: "Procurement", description: "Purchasing and Suppliers", icon: "ShoppingBag", sortOrder: 70 },
    { code: "LAUNDRY", name: "Laundry", description: "Laundry Operations and Vendor Billing", icon: "Shirt", sortOrder: 80 },
    { code: "FLEET", name: "Fleet", description: "Logistics and Fleet Operations", icon: "Truck", sortOrder: 90 },
    { code: "FINANCE", name: "Finance", description: "General Ledger and Cash Flow", icon: "DollarSign", sortOrder: 100 },
    { code: "HR", name: "HR", description: "Human Resources and Staffing", icon: "Users2", sortOrder: 110 },
    { code: "ADMINISTRATION", name: "Administration", description: "Security, Audits, Roles and Users", icon: "Shield", sortOrder: 120 },
    { code: "REPORTING", name: "Reporting", description: "BI and Reports Engine", icon: "BarChart3", sortOrder: 130 },
    { code: "CUSTOMER_PORTAL", name: "Customer Portal", description: "External Portal for Customers", icon: "Globe", sortOrder: 140 },
    { code: "VENDOR_PORTAL", name: "Vendor Portal", description: "External Portal for Vendors", icon: "Globe2", sortOrder: 150 },
  ];

  for (const mod of modules) {
    await prisma.platformModule.upsert({
      where: { code: mod.code },
      update: {
        name: mod.name,
        description: mod.description,
        icon: mod.icon,
        sortOrder: mod.sortOrder,
        updatedBy: creatorId,
      },
      create: {
        code: mod.code,
        name: mod.name,
        description: mod.description,
        icon: mod.icon,
        sortOrder: mod.sortOrder,
        isActive: true,
        isSystem: true,
        createdBy: creatorId,
        updatedBy: creatorId,
      },
    });
  }

  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
