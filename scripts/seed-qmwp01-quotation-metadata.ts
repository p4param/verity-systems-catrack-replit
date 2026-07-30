import { publishService } from "../src/modules/platform/configuration/services/publish-service";
import { prisma } from "../src/lib/prisma";

// QM-WP01 — Quotation Foundation.
// Mirrors scripts/seed-im001-inquiry-metadata.ts exactly: registers the
// CatQuotation entity in the platform's metadata Configuration Engine and
// publishes it. Per this codebase's established precedent (confirmed against
// CatInquiry/CatRelationship), this metadata layer runs in parallel with the
// real hand-built cat_quotations table/API/pages — it does not generate or
// drive them. It exists for admin-UI/documentation consistency with every
// other CAT entity, not because the feature depends on it functionally.

const PLATFORM_SYSTEM_FIELDS = [
  { code: "id", label: "ID", dataType: "UUID", required: true, unique: true, indexed: true, searchable: true, sortable: true, filterable: true, defaultValue: null, uiControl: "TEXT_INPUT", displayOrder: 1 },
  { code: "createdAt", label: "Created At", dataType: "DATETIME", required: true, unique: false, indexed: true, searchable: false, sortable: true, filterable: true, defaultValue: null, uiControl: "DATE_PICKER", displayOrder: 98 },
  { code: "createdBy", label: "Created By", dataType: "UUID", required: true, unique: false, indexed: true, searchable: true, sortable: true, filterable: true, defaultValue: null, uiControl: "TEXT_INPUT", displayOrder: 99 },
  { code: "updatedAt", label: "Updated At", dataType: "DATETIME", required: true, unique: false, indexed: false, searchable: false, sortable: true, filterable: true, defaultValue: null, uiControl: "DATE_PICKER", displayOrder: 100 },
  { code: "updatedBy", label: "Updated By", dataType: "UUID", required: true, unique: false, indexed: false, searchable: false, sortable: false, filterable: false, defaultValue: null, uiControl: "TEXT_INPUT", displayOrder: 101 },
  { code: "isDeleted", label: "Is Deleted", dataType: "BOOLEAN", required: true, unique: false, indexed: true, searchable: false, sortable: false, filterable: true, defaultValue: "false", uiControl: "CHECKBOX", displayOrder: 102 },
];

const CAT_QUOTATION_FIELDS = [
  { code: "quotationNumber", label: "Quotation Number", dataType: "STRING", required: true, unique: true, indexed: true, searchable: true, sortable: true, filterable: true, uiControl: "TEXT_INPUT", displayOrder: 10 },
  { code: "inquiryId", label: "Inquiry", dataType: "UUID", required: true, unique: false, indexed: true, searchable: false, sortable: true, filterable: true, uiControl: "TEXT_INPUT", displayOrder: 11 },
  { code: "title", label: "Title", dataType: "STRING", required: true, unique: false, indexed: true, searchable: true, sortable: true, filterable: true, uiControl: "TEXT_INPUT", displayOrder: 12 },
  { code: "purpose", label: "Purpose", dataType: "LOOKUP", required: true, unique: false, indexed: true, searchable: true, sortable: true, filterable: true, uiControl: "SELECT", defaultValue: "STANDARD_PROPOSAL", displayOrder: 13 },
  { code: "description", label: "Description", dataType: "TEXT", required: false, unique: false, indexed: false, searchable: true, sortable: false, filterable: false, uiControl: "TEXT_AREA", displayOrder: 14 },
  { code: "status", label: "Status", dataType: "LOOKUP", required: true, unique: false, indexed: true, searchable: true, sortable: true, filterable: true, uiControl: "SELECT", defaultValue: "DRAFT", displayOrder: 15 },
];

async function ensureMetadataForEntity(entityId: string, fields: any[], actorUserId: string) {
  const entity = await prisma.configurationEntity.findUnique({
    where: { id: entityId },
    include: { fields: true, views: true, layoutViews: true },
  });
  if (!entity) return;

  const existingFieldCodes = new Set(entity.fields.map((f) => f.code));

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
          metadata: { isQmWp01Field: true },
        },
      });
      existingFieldCodes.add(field.code);
    }
  }

  const allFields = await prisma.entityFieldDefinition.findMany({
    where: { entityId },
    orderBy: { displayOrder: "asc" },
  });

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
  console.log("Seed & Publish QM-WP01 Quotation Metadata...");

  const adminUser = await prisma.user.findFirst({ where: { email: "admin@verity.com" } });
  const actorUserId = adminUser?.id || "system";

  const catModule = await prisma.platformModule.findFirst({ where: { code: "CAT" } });
  if (!catModule) throw new Error('PlatformModule "CAT" not found — run scripts/seed-im001-inquiry-metadata.ts first.');

  let quotationEntity = await prisma.configurationEntity.findUnique({ where: { code: "CatQuotation" } });
  if (!quotationEntity) {
    quotationEntity = await prisma.configurationEntity.create({
      data: {
        module: { connect: { id: catModule.id } },
        code: "CatQuotation",
        name: "Quotation",
        pluralName: "Quotations",
        description: "Commercial Quotation foundation record for Catrack Catering ERP (QM-WP01).",
        allowCRUD: true,
        allowImport: false,
        allowExport: true,
        allowWorkflow: true,
        allowAttachments: false,
        allowAudit: true,
        allowComments: false,
        showInNavigation: true,
        icon: "DollarSign",
        route: "/cat/quotations",
        menuGroup: "Sales",
        menuOrder: 3,
        apiEnabled: true,
        apiName: "cat-quotations",
        status: "DRAFT",
        isActive: true,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });
    console.log(`+ ConfigurationEntity created: CatQuotation [${quotationEntity.id}]`);
  } else {
    console.log(`~ ConfigurationEntity already exists: CatQuotation [${quotationEntity.id}]`);
  }

  await ensureMetadataForEntity(quotationEntity.id, CAT_QUOTATION_FIELDS, actorUserId);
  console.log("+ Fields, View, and Layout ensured for CatQuotation");

  let navItem = await prisma.navigationItem.findFirst({ where: { entityId: quotationEntity.id } });
  if (!navItem) {
    await prisma.navigationItem.create({
      data: {
        entityId: quotationEntity.id,
        title: "Quotations",
        route: "/cat/quotations",
        icon: "DollarSign",
        displayOrder: 3,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });
    console.log("+ NavigationItem created for CatQuotation");
  }

  console.log("Publishing CatQuotation Metadata to Generic Runtime...");
  const published = await publishService.publishEntity(quotationEntity.id, actorUserId);
  console.log("Published CatQuotation:", published);

  console.log("QM-WP01 Quotation Metadata Seed & Publish Completed.");
}

main()
  .catch((e) => {
    console.error("Error seeding QM-WP01 Quotation metadata:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
