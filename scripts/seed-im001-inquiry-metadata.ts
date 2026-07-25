import { publishService } from "../src/modules/platform/configuration/services/publish-service";
import { prisma } from "../src/lib/prisma";

const PLATFORM_SYSTEM_FIELDS = [
  { code: "id", label: "ID", dataType: "UUID", required: true, unique: true, indexed: true, searchable: true, sortable: true, filterable: true, defaultValue: null, uiControl: "TEXT_INPUT", displayOrder: 1 },
  { code: "createdAt", label: "Created At", dataType: "DATETIME", required: true, unique: false, indexed: true, searchable: false, sortable: true, filterable: true, defaultValue: null, uiControl: "DATE_PICKER", displayOrder: 98 },
  { code: "createdBy", label: "Created By", dataType: "UUID", required: true, unique: false, indexed: true, searchable: true, sortable: true, filterable: true, defaultValue: null, uiControl: "TEXT_INPUT", displayOrder: 99 },
  { code: "updatedAt", label: "Updated At", dataType: "DATETIME", required: true, unique: false, indexed: false, searchable: false, sortable: true, filterable: true, defaultValue: null, uiControl: "DATE_PICKER", displayOrder: 100 },
  { code: "updatedBy", label: "Updated By", dataType: "UUID", required: true, unique: false, indexed: false, searchable: false, sortable: false, filterable: false, defaultValue: null, uiControl: "TEXT_INPUT", displayOrder: 101 },
  { code: "isDeleted", label: "Is Deleted", dataType: "BOOLEAN", required: true, unique: false, indexed: true, searchable: false, sortable: false, filterable: true, defaultValue: "false", uiControl: "CHECKBOX", displayOrder: 102 },
];

const CAT_INQUIRY_FIELDS = [
  { code: "inquiryNumber", label: "Inquiry Number", dataType: "STRING", required: true, unique: true, indexed: true, searchable: true, sortable: true, filterable: true, uiControl: "TEXT_INPUT", displayOrder: 10 },
  { code: "title", label: "Inquiry Title", dataType: "STRING", required: true, unique: false, indexed: true, searchable: true, sortable: true, filterable: true, uiControl: "TEXT_INPUT", displayOrder: 11 },
  { code: "relationshipId", label: "Relationship", dataType: "UUID", required: true, unique: false, indexed: true, searchable: false, sortable: true, filterable: true, uiControl: "TEXT_INPUT", displayOrder: 12 },
  { code: "eventType", label: "Event Type", dataType: "LOOKUP", required: true, unique: false, indexed: true, searchable: true, sortable: true, filterable: true, uiControl: "SELECT", defaultValue: "WEDDING", displayOrder: 13 },
  { code: "tentativeEventDate", label: "Tentative Event Date", dataType: "DATETIME", required: false, unique: false, indexed: true, searchable: false, sortable: true, filterable: true, uiControl: "DATE_PICKER", displayOrder: 14 },
  { code: "expectedGuestCount", label: "Expected Guest Count", dataType: "INT", required: false, unique: false, indexed: false, searchable: false, sortable: true, filterable: true, uiControl: "NUMBER_INPUT", displayOrder: 15 },
  { code: "budgetRange", label: "Budget Range", dataType: "LOOKUP", required: false, unique: false, indexed: false, searchable: false, sortable: true, filterable: true, uiControl: "SELECT", defaultValue: "10K_25K", displayOrder: 16 },
  { code: "priority", label: "Priority", dataType: "LOOKUP", required: true, unique: false, indexed: true, searchable: true, sortable: true, filterable: true, uiControl: "SELECT", defaultValue: "MEDIUM", displayOrder: 17 },
  { code: "inquiryStage", label: "Inquiry Stage", dataType: "LOOKUP", required: true, unique: false, indexed: true, searchable: true, sortable: true, filterable: true, uiControl: "SELECT", defaultValue: "NEW", displayOrder: 18 },
  { code: "assignedSalesperson", label: "Assigned Salesperson", dataType: "STRING", required: false, unique: false, indexed: true, searchable: true, sortable: true, filterable: true, uiControl: "TEXT_INPUT", displayOrder: 19 },
  { code: "inquirySource", label: "Inquiry Source", dataType: "LOOKUP", required: false, unique: false, indexed: false, searchable: true, sortable: true, filterable: true, uiControl: "SELECT", defaultValue: "WEBSITE", displayOrder: 20 },
  { code: "venue", label: "Venue", dataType: "STRING", required: false, unique: false, indexed: false, searchable: true, sortable: true, filterable: true, uiControl: "TEXT_INPUT", displayOrder: 21 },
  { code: "serviceStyle", label: "Service Style", dataType: "LOOKUP", required: false, unique: false, indexed: false, searchable: false, sortable: true, filterable: true, uiControl: "SELECT", defaultValue: "BUFFET", displayOrder: 22 },
  { code: "foodPreference", label: "Food Preference", dataType: "LOOKUP", required: false, unique: false, indexed: false, searchable: false, sortable: true, filterable: true, uiControl: "SELECT", defaultValue: "MIXED", displayOrder: 23 },
];

async function ensureMetadataForEntity(entityId: string, fields: any[], actorUserId: string) {
  const entity = await prisma.configurationEntity.findUnique({
    where: { id: entityId },
    include: { fields: true, views: true, layoutViews: true }
  });

  if (!entity) return;

  const existingFieldCodes = new Set(entity.fields.map((f) => f.code));

  // 1. System fields
  for (const sysField of PLATFORM_SYSTEM_FIELDS) {
    if (!existingFieldCodes.has(sysField.code)) {
      await prisma.entityFieldDefinition.create({
        data: {
          entityId,
          code: sysField.code,
          label: sysField.label,
          dataType: sysField.dataType,
          required: sysField.required,
          unique: sysField.unique,
          indexed: sysField.indexed,
          searchable: sysField.searchable,
          sortable: sysField.sortable,
          filterable: sysField.filterable,
          defaultValue: sysField.defaultValue,
          uiControl: sysField.uiControl,
          displayOrder: sysField.displayOrder,
          status: "DRAFT",
          createdBy: actorUserId,
          updatedBy: actorUserId,
          metadata: { isSystemField: true },
        },
      });
      existingFieldCodes.add(sysField.code);
    }
  }

  // 2. Business fields
  for (const field of fields) {
    if (!existingFieldCodes.has(field.code)) {
      await prisma.entityFieldDefinition.create({
        data: {
          entityId,
          code: field.code,
          label: field.label,
          dataType: field.dataType,
          required: field.required,
          unique: field.unique || false,
          indexed: field.indexed || false,
          searchable: field.searchable || false,
          sortable: field.sortable || true,
          filterable: field.filterable || true,
          defaultValue: field.defaultValue || null,
          uiControl: field.uiControl,
          displayOrder: field.displayOrder,
          status: "DRAFT",
          createdBy: actorUserId,
          updatedBy: actorUserId,
          metadata: { isIm001Field: true },
        },
      });
      existingFieldCodes.add(field.code);
    }
  }

  const allFields = await prisma.entityFieldDefinition.findMany({
    where: { entityId },
    orderBy: { displayOrder: "asc" },
  });

  // 3. Views
  const existingViews = new Set(entity.views.map((v) => v.code));
  if (!existingViews.has("ALL_RECORDS")) {
    await prisma.entityView.create({
      data: {
        entityId,
        code: "ALL_RECORDS",
        name: "All Records",
        viewType: "GRID",
        isDefault: true,
        status: "DRAFT",
        createdBy: actorUserId,
        updatedBy: actorUserId,
        metadata: { columns: allFields.map((f) => f.code) },
      },
    });
  }

  // 4. Layout
  const existingLayouts = new Set(entity.layoutViews.map((l) => l.code));
  if (!existingLayouts.has("MAIN_FORM")) {
    const placements = allFields
      .filter((f) => !PLATFORM_SYSTEM_FIELDS.some((sf) => sf.code === f.code))
      .map((f, idx) => ({
        id: `place_${f.code}`,
        code: `PLACE_${f.code.toUpperCase()}`,
        name: f.label,
        fieldId: f.id,
        span: { xs: 12, md: 6 },
        displayOrder: idx,
      }));

    await prisma.entityLayoutView.create({
      data: {
        entityId,
        code: "MAIN_FORM",
        name: "Main Form Layout",
        description: "Standard layout view for record maintenance",
        layoutType: "FORM",
        isDefault: true,
        status: "DRAFT",
        createdBy: actorUserId,
        updatedBy: actorUserId,
        layout: {
          layoutVersion: "1.0",
          responsiveColumns: { xs: 1, md: 2 },
          tabs: [
            {
              id: `tab_main`,
              code: "TAB_MAIN",
              name: "Main Details",
              displayOrder: 0,
              sections: [
                {
                  id: `sec_info`,
                  code: "SEC_GENERAL",
                  name: "General Information",
                  displayOrder: 0,
                  groups: [
                    {
                      id: `grp_fields`,
                      code: "GRP_FIELDS",
                      name: "Fields",
                      displayOrder: 0,
                      rows: [
                        {
                          id: `row_1`,
                          code: "ROW_1",
                          displayOrder: 0,
                          columns: [{ id: "col_1", code: "COL_1", span: { xs: 12, md: 12 }, displayOrder: 0, placements }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    });
  }
}

async function main() {
  console.log("🌱 Seed & Publish IM-WP01 Inquiry Metadata...");

  const adminUser = await prisma.user.findFirst({ where: { email: "admin@verity.com" } });
  const actorUserId = adminUser?.id || "system";

  let catModule = await prisma.platformModule.findFirst({ where: { code: "CAT" } });
  if (!catModule) {
    catModule = await prisma.platformModule.create({
      data: {
        code: "CAT",
        name: "Customer & Account Tracking",
        description: "Catrack Catering ERP — Commercial Suite",
        icon: "briefcase",
        route: "/cat",
        navigationGroup: "Sales",
        sortOrder: 10,
        isActive: true,
        isSystem: false,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });
  }

  // 1. CatInquiry ConfigurationEntity
  let inquiryEntity = await prisma.configurationEntity.findUnique({ where: { code: "CatInquiry" } });
  if (!inquiryEntity) {
    inquiryEntity = await prisma.configurationEntity.create({
      data: {
        module: { connect: { id: catModule.id } },
        code: "CatInquiry",
        name: "Inquiry",
        pluralName: "Inquiries",
        description: "Commercial Inquiry foundation record for Catrack Catering ERP (IM-WP01).",
        allowCRUD: true,
        allowImport: true,
        allowExport: true,
        allowWorkflow: true,
        allowAttachments: true,
        allowAudit: true,
        allowComments: true,
        showInNavigation: true,
        icon: "file-text",
        route: "/cat/inquiries",
        menuGroup: "Sales",
        menuOrder: 2,
        apiEnabled: true,
        apiName: "cat-inquiries",
        status: "DRAFT",
        isActive: true,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });
  }

  // 2. Ensure Fields & Views for CatInquiry
  await ensureMetadataForEntity(inquiryEntity.id, CAT_INQUIRY_FIELDS, actorUserId);

  // 3. Navigation Item
  let navItem = await prisma.navigationItem.findFirst({ where: { entityId: inquiryEntity.id } });
  if (!navItem) {
    await prisma.navigationItem.create({
      data: {
        entityId: inquiryEntity.id,
        title: "Inquiries",
        route: "/cat/inquiries",
        icon: "file-text",
        displayOrder: 2,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });
  }

  // 4. PUBLISH METADATA & BUILD DB DDL
  console.log("🚀 Publishing CatInquiry Metadata to Generic Runtime...");
  const pubInquiry = await publishService.publishEntity(inquiryEntity.id, actorUserId);
  console.log("✅ CatInquiry Published successfully!", pubInquiry);

  console.log("🎉 IM-WP01 Inquiry Metadata Seed & Publish Completed Successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding IM-WP01 Inquiry metadata:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
