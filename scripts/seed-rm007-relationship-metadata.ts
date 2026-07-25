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

const CAT_RELATIONSHIP_FIELDS = [
  { code: "relationshipNumber", label: "Relationship Number", dataType: "STRING", required: true, unique: true, indexed: true, searchable: true, sortable: true, filterable: true, uiControl: "TEXT_INPUT", displayOrder: 10 },
  { code: "name", label: "Display Name", dataType: "STRING", required: true, unique: false, indexed: true, searchable: true, sortable: true, filterable: true, uiControl: "TEXT_INPUT", displayOrder: 11 },
  { code: "type", label: "Type", dataType: "LOOKUP", required: true, unique: false, indexed: true, searchable: true, sortable: true, filterable: true, uiControl: "SELECT", defaultValue: "ORGANIZATION", displayOrder: 12 },
  { code: "status", label: "Lifecycle Status", dataType: "LOOKUP", required: true, unique: false, indexed: true, searchable: true, sortable: true, filterable: true, uiControl: "SELECT", defaultValue: "PROSPECT", displayOrder: 13 },
  { code: "rating", label: "Relationship Rating", dataType: "LOOKUP", required: false, unique: false, indexed: true, searchable: false, sortable: true, filterable: true, uiControl: "SELECT", defaultValue: "WARM", displayOrder: 14 },
  { code: "source", label: "Lead Source", dataType: "LOOKUP", required: false, unique: false, indexed: false, searchable: true, sortable: true, filterable: true, uiControl: "SELECT", defaultValue: "DIRECT", displayOrder: 15 },
  { code: "owner", label: "Relationship Owner", dataType: "STRING", required: false, unique: false, indexed: false, searchable: true, sortable: true, filterable: true, uiControl: "TEXT_INPUT", displayOrder: 16 },
  { code: "primaryContactId", label: "Primary Contact", dataType: "UUID", required: false, unique: false, indexed: true, searchable: false, sortable: false, filterable: true, uiControl: "TEXT_INPUT", displayOrder: 17 },
];

const CAT_CONTACT_FIELDS = [
  { code: "name", label: "Contact Name", dataType: "STRING", required: true, unique: false, indexed: true, searchable: true, sortable: true, filterable: true, uiControl: "TEXT_INPUT", displayOrder: 10 },
  { code: "relationshipId", label: "Relationship", dataType: "UUID", required: true, unique: false, indexed: true, searchable: false, sortable: true, filterable: true, uiControl: "TEXT_INPUT", displayOrder: 11 },
  { code: "email", label: "Email Address", dataType: "STRING", required: false, unique: false, indexed: true, searchable: true, sortable: true, filterable: true, uiControl: "TEXT_INPUT", displayOrder: 12 },
  { code: "phone", label: "Phone Number", dataType: "STRING", required: false, unique: false, indexed: true, searchable: true, sortable: true, filterable: true, uiControl: "TEXT_INPUT", displayOrder: 13 },
  { code: "role", label: "Role / Position", dataType: "STRING", required: false, unique: false, indexed: false, searchable: true, sortable: true, filterable: true, uiControl: "TEXT_INPUT", displayOrder: 14 },
  { code: "isPrimary", label: "Is Primary Contact", dataType: "BOOLEAN", required: true, unique: false, indexed: true, searchable: false, sortable: true, filterable: true, defaultValue: "false", uiControl: "CHECKBOX", displayOrder: 15 },
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
          metadata: { isRm007Field: true },
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

  if (!existingViews.has("ACTIVE_RECORDS")) {
    await prisma.entityView.create({
      data: {
        entityId,
        code: "ACTIVE_RECORDS",
        name: "Active Records",
        viewType: "GRID",
        isDefault: false,
        status: "DRAFT",
        createdBy: actorUserId,
        updatedBy: actorUserId,
        metadata: { columns: allFields.map((f) => f.code), filter: { isDeleted: false } },
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
  console.log("🌱 Seed & Publish RM-007 Relationship Management Metadata...");

  const adminUser = await prisma.user.findFirst({ where: { email: "admin@verity.com" } });
  const actorUserId = adminUser?.id || "system";

  let catModule = await prisma.platformModule.findFirst({ where: { code: "CAT" } });
  if (!catModule) {
    catModule = await prisma.platformModule.create({
      data: {
        code: "CAT",
        name: "Customer & Account Tracking",
        description: "Catrack Catering ERP — Customer and Relationship Management (BWP-001)",
        icon: "users",
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

  let relEntity = await prisma.configurationEntity.findUnique({ where: { code: "CatRelationship" } });
  if (!relEntity) {
    relEntity = await prisma.configurationEntity.create({
      data: {
        module: { connect: { id: catModule.id } },
        code: "CatRelationship",
        name: "Relationship",
        pluralName: "Relationships",
        description: "Business relationship record. Covers the full lifecycle from Lead to Customer (RM-007).",
        allowCRUD: true,
        allowImport: true,
        allowExport: true,
        allowWorkflow: true,
        allowAttachments: true,
        allowAudit: true,
        allowComments: true,
        showInNavigation: true,
        icon: "users",
        route: "/cat/relationships",
        menuGroup: "Sales",
        menuOrder: 1,
        apiEnabled: true,
        apiName: "cat-relationships",
        status: "DRAFT",
        isActive: true,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });
  }

  let contactEntity = await prisma.configurationEntity.findUnique({ where: { code: "CatContact" } });
  if (!contactEntity) {
    contactEntity = await prisma.configurationEntity.create({
      data: {
        module: { connect: { id: catModule.id } },
        code: "CatContact",
        name: "Contact",
        pluralName: "Contacts",
        description: "Contact person associated with a Relationship (RM-007).",
        allowCRUD: true,
        allowImport: false,
        allowExport: true,
        allowWorkflow: false,
        allowAttachments: false,
        allowAudit: true,
        showInNavigation: false,
        icon: "user",
        route: "/cat/contacts",
        menuOrder: 2,
        apiEnabled: true,
        apiName: "cat-contacts",
        status: "DRAFT",
        isActive: true,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });
  }

  await ensureMetadataForEntity(relEntity.id, CAT_RELATIONSHIP_FIELDS, actorUserId);
  await ensureMetadataForEntity(contactEntity.id, CAT_CONTACT_FIELDS, actorUserId);

  console.log("Publishing CatRelationship...");
  const pubRel = await publishService.publishEntity(relEntity.id, actorUserId);
  console.log(`✅ CatRelationship published (v${pubRel.artifactVersion})`);

  console.log("Publishing CatContact...");
  const pubContact = await publishService.publishEntity(contactEntity.id, actorUserId);
  console.log(`✅ CatContact published (v${pubContact.artifactVersion})`);

  console.log("🎉 RM-007 Metadata Seed and Publish complete!");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
