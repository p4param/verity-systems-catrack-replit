import { prisma } from "../src/lib/prisma";
import { publishService } from "../src/modules/platform/configuration/services/publish-service";
import { entityBootstrapService } from "../src/modules/platform/configuration/services/EntityBootstrapService";

async function registerCompleteBusinessEntities() {
  try {
    console.log("🚀 Registering Complete Business Entities (CatRelationship & CatContact) matching CUSTOMER metadata model...");

    const adminUser = await prisma.user.findFirst();
    const actorUserId = adminUser ? adminUser.id : "00000000-0000-0000-0000-000000000002";

    // 1. Get Platform Module
    const platformModule = await prisma.platformModule.findUnique({
      where: { code: "CAT_RELATIONSHIPS" },
    });

    if (!platformModule) {
      throw new Error("Platform Module CAT_RELATIONSHIPS not found.");
    }

    // ─── 2. REGISTER CatRelationship ──────────────────────────────────────────
    console.log("\n--- Registering CatRelationship Metadata ---");

    const relEntity = await prisma.configurationEntity.upsert({
      where: { code: "CatRelationship" },
      update: {
        name: "Relationship",
        pluralName: "Relationships",
        description: "Master business identity representing Individuals or Organizations in Catrack Catering ERP",
        status: "DRAFT",
        isActive: true,
        showInNavigation: true,
        menuGroup: "Operations",
        route: "/cat/relationships",
      },
      create: {
        moduleId: platformModule.id,
        code: "CatRelationship",
        name: "Relationship",
        pluralName: "Relationships",
        description: "Master business identity representing Individuals or Organizations in Catrack Catering ERP",
        status: "DRAFT",
        isActive: true,
        isSystem: false,
        isCustom: true,
        showInNavigation: true,
        menuGroup: "Operations",
        route: "/cat/relationships",
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });

    // Bootstrap Platform System Fields & Generic Views/Layouts
    await entityBootstrapService.bootstrapEntity(relEntity.id, actorUserId);

    // Business Fields Definition
    const relFields = [
      {
        code: "relationshipNumber",
        label: "Relationship Number",
        dataType: "STRING",
        required: true,
        unique: true,
        indexed: true,
        searchable: true,
        sortable: true,
        filterable: true,
        uiControl: "TEXT_INPUT",
        displayOrder: 1,
      },
      {
        code: "name",
        label: "Relationship Name",
        dataType: "STRING",
        required: true,
        unique: false,
        indexed: true,
        searchable: true,
        sortable: true,
        filterable: true,
        uiControl: "TEXT_INPUT",
        displayOrder: 2,
      },
      {
        code: "type",
        label: "Relationship Type",
        dataType: "STRING",
        required: true,
        unique: false,
        indexed: true,
        searchable: false,
        sortable: true,
        filterable: true,
        defaultValue: "ORGANIZATION",
        uiControl: "SELECT",
        displayOrder: 3,
      },
      {
        code: "status",
        label: "Lifecycle Status",
        dataType: "STRING",
        required: true,
        unique: false,
        indexed: true,
        searchable: false,
        sortable: true,
        filterable: true,
        defaultValue: "PROSPECT",
        uiControl: "SELECT",
        displayOrder: 4,
      },
      {
        code: "primaryContactId",
        label: "Primary Contact ID",
        dataType: "UUID",
        required: false,
        unique: false,
        indexed: true,
        searchable: false,
        sortable: false,
        filterable: false,
        uiControl: "TEXT_INPUT",
        displayOrder: 5,
      },
    ];

    const createdRelFields: Record<string, string> = {};
    for (const f of relFields) {
      const fieldRec = await prisma.entityFieldDefinition.upsert({
        where: { entityId_code: { entityId: relEntity.id, code: f.code } },
        update: { label: f.label, dataType: f.dataType, uiControl: f.uiControl },
        create: {
          entityId: relEntity.id,
          code: f.code,
          label: f.label,
          dataType: f.dataType,
          required: f.required,
          unique: f.unique,
          indexed: f.indexed,
          searchable: f.searchable,
          sortable: f.sortable,
          filterable: f.filterable,
          defaultValue: f.defaultValue || null,
          uiControl: f.uiControl,
          displayOrder: f.displayOrder,
          status: "DRAFT",
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
      });
      createdRelFields[f.code] = fieldRec.id;
    }
    console.log("✅ CatRelationship business fields registered.");

    // Data Views Definition
    await prisma.entityView.upsert({
      where: { entityId_code: { entityId: relEntity.id, code: "ALL_RELATIONSHIPS" } },
      update: { name: "All Relationships", isDefault: true },
      create: {
        entityId: relEntity.id,
        code: "ALL_RELATIONSHIPS",
        name: "All Relationships",
        viewType: "GRID",
        isDefault: true,
        status: "DRAFT",
        createdBy: actorUserId,
        updatedBy: actorUserId,
        metadata: { columns: ["relationshipNumber", "name", "type", "status", "createdAt"] },
      },
    });
    console.log("✅ CatRelationship data view registered.");

    // Layout View Definition
    const tabId = "tab_rel_main";
    const secId = "sec_rel_info";
    const grpId = "grp_rel_details";
    const row1Id = "row_rel_1";
    const row2Id = "row_rel_2";

    const relLayoutStructure = {
      layoutVersion: "1.0",
      responsiveColumns: { xs: 1, sm: 1, md: 2, lg: 2, xl: 3 },
      tabs: [
        {
          id: tabId,
          code: "TAB_MAIN",
          name: "Main Details",
          title: "Main Details",
          displayOrder: 0,
          sections: [
            {
              id: secId,
              code: "SEC_GENERAL",
              name: "General Information",
              title: "General Information",
              displayOrder: 0,
              groups: [
                {
                  id: grpId,
                  code: "GRP_REL_FIELDS",
                  name: "Relationship Fields",
                  title: "Relationship Fields",
                  displayOrder: 0,
                  rows: [
                    {
                      id: row1Id,
                      code: "ROW_1",
                      name: "Row 1",
                      displayOrder: 0,
                      columns: [
                        {
                          id: "col_1_1",
                          code: "COL_NUMBER",
                          name: "Column 1",
                          span: { xs: 12, md: 6 },
                          displayOrder: 0,
                          placements: [
                            {
                              id: "place_rel_num",
                              code: "PLACE_REL_NUM",
                              name: "Relationship Number",
                              fieldId: createdRelFields["relationshipNumber"],
                              span: { xs: 12, md: 6 },
                              displayOrder: 0,
                            },
                          ],
                        },
                        {
                          id: "col_1_2",
                          code: "COL_NAME",
                          name: "Column 2",
                          span: { xs: 12, md: 6 },
                          displayOrder: 1,
                          placements: [
                            {
                              id: "place_rel_name",
                              code: "PLACE_REL_NAME",
                              name: "Relationship Name",
                              fieldId: createdRelFields["name"],
                              span: { xs: 12, md: 6 },
                              displayOrder: 0,
                            },
                          ],
                        },
                      ],
                    },
                    {
                      id: row2Id,
                      code: "ROW_2",
                      name: "Row 2",
                      displayOrder: 1,
                      columns: [
                        {
                          id: "col_2_1",
                          code: "COL_TYPE",
                          name: "Column 1",
                          span: { xs: 12, md: 6 },
                          displayOrder: 0,
                          placements: [
                            {
                              id: "place_rel_type",
                              code: "PLACE_REL_TYPE",
                              name: "Relationship Type",
                              fieldId: createdRelFields["type"],
                              span: { xs: 12, md: 6 },
                              displayOrder: 0,
                            },
                          ],
                        },
                        {
                          id: "col_2_2",
                          code: "COL_STATUS",
                          name: "Column 2",
                          span: { xs: 12, md: 6 },
                          displayOrder: 1,
                          placements: [
                            {
                              id: "place_rel_status",
                              code: "PLACE_REL_STATUS",
                              name: "Lifecycle Status",
                              fieldId: createdRelFields["status"],
                              span: { xs: 12, md: 6 },
                              displayOrder: 0,
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    await prisma.entityLayoutView.upsert({
      where: { entityId_code: { entityId: relEntity.id, code: "RELATIONSHIP_FORM_V1" } },
      update: { name: "Relationship Form Layout", layout: relLayoutStructure, isDefault: true },
      create: {
        entityId: relEntity.id,
        code: "RELATIONSHIP_FORM_V1",
        name: "Relationship Form Layout",
        description: "Primary form layout for Relationship records",
        layoutType: "FORM",
        isDefault: true,
        status: "DRAFT",
        layout: relLayoutStructure,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });
    console.log("✅ CatRelationship layout view registered.");

    // Publish CatRelationship to generate Runtime Artifact
    const relPublish = await publishService.publishEntity(relEntity.id, actorUserId);
    console.log(`✅ CatRelationship published successfully (Artifact v${relPublish.artifactVersion})!`);


    // ─── 3. REGISTER CatContact ──────────────────────────────────────────────
    console.log("\n--- Registering CatContact Metadata ---");

    const contactEntity = await prisma.configurationEntity.upsert({
      where: { code: "CatContact" },
      update: {
        name: "Contact",
        pluralName: "Contacts",
        description: "Contact person associated with a Catrack Relationship",
        status: "DRAFT",
        isActive: true,
        showInNavigation: false,
      },
      create: {
        moduleId: platformModule.id,
        code: "CatContact",
        name: "Contact",
        pluralName: "Contacts",
        description: "Contact person associated with a Catrack Relationship",
        status: "DRAFT",
        isActive: true,
        isSystem: false,
        isCustom: true,
        showInNavigation: false,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });

    // Bootstrap Platform System Fields & Generic Views/Layouts
    await entityBootstrapService.bootstrapEntity(contactEntity.id, actorUserId);

    // Business Fields Definition
    const contactFields = [
      {
        code: "name",
        label: "Contact Name",
        dataType: "STRING",
        required: true,
        unique: false,
        indexed: true,
        searchable: true,
        sortable: true,
        filterable: true,
        uiControl: "TEXT_INPUT",
        displayOrder: 1,
      },
      {
        code: "email",
        label: "Email Address",
        dataType: "STRING",
        required: false,
        unique: false,
        indexed: true,
        searchable: true,
        sortable: true,
        filterable: true,
        uiControl: "TEXT_INPUT",
        displayOrder: 2,
      },
      {
        code: "phone",
        label: "Phone Number",
        dataType: "STRING",
        required: false,
        unique: false,
        indexed: true,
        searchable: true,
        sortable: true,
        filterable: true,
        uiControl: "TEXT_INPUT",
        displayOrder: 3,
      },
      {
        code: "role",
        label: "Role / Position",
        dataType: "STRING",
        required: false,
        unique: false,
        indexed: false,
        searchable: true,
        sortable: true,
        filterable: true,
        uiControl: "TEXT_INPUT",
        displayOrder: 4,
      },
      {
        code: "isPrimary",
        label: "Is Primary Contact",
        dataType: "BOOLEAN",
        required: true,
        unique: false,
        indexed: true,
        searchable: false,
        sortable: true,
        filterable: true,
        defaultValue: "false",
        uiControl: "CHECKBOX",
        displayOrder: 5,
      },
    ];

    const createdContactFields: Record<string, string> = {};
    for (const f of contactFields) {
      const fieldRec = await prisma.entityFieldDefinition.upsert({
        where: { entityId_code: { entityId: contactEntity.id, code: f.code } },
        update: { label: f.label, dataType: f.dataType, uiControl: f.uiControl },
        create: {
          entityId: contactEntity.id,
          code: f.code,
          label: f.label,
          dataType: f.dataType,
          required: f.required,
          unique: f.unique,
          indexed: f.indexed,
          searchable: f.searchable,
          sortable: f.sortable,
          filterable: f.filterable,
          defaultValue: f.defaultValue || null,
          uiControl: f.uiControl,
          displayOrder: f.displayOrder,
          status: "DRAFT",
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
      });
      createdContactFields[f.code] = fieldRec.id;
    }
    console.log("✅ CatContact business fields registered.");

    // Data Views Definition
    await prisma.entityView.upsert({
      where: { entityId_code: { entityId: contactEntity.id, code: "ALL_CONTACTS" } },
      update: { name: "All Contacts", isDefault: true },
      create: {
        entityId: contactEntity.id,
        code: "ALL_CONTACTS",
        name: "All Contacts",
        viewType: "GRID",
        isDefault: true,
        status: "DRAFT",
        createdBy: actorUserId,
        updatedBy: actorUserId,
        metadata: { columns: ["name", "email", "phone", "role", "isPrimary"] },
      },
    });
    console.log("✅ CatContact data view registered.");

    // Layout View Definition
    const contactLayoutStructure = {
      layoutVersion: "1.0",
      responsiveColumns: { xs: 1, sm: 1, md: 2, lg: 2, xl: 3 },
      tabs: [
        {
          id: "tab_contact_main",
          code: "TAB_MAIN",
          name: "Contact Details",
          title: "Contact Details",
          displayOrder: 0,
          sections: [
            {
              id: "sec_contact_info",
              code: "SEC_CONTACT",
              name: "Contact Information",
              title: "Contact Information",
              displayOrder: 0,
              groups: [
                {
                  id: "grp_contact_fields",
                  code: "GRP_FIELDS",
                  name: "Fields",
                  title: "Fields",
                  displayOrder: 0,
                  rows: [
                    {
                      id: "row_c_1",
                      code: "ROW_1",
                      name: "Row 1",
                      displayOrder: 0,
                      columns: [
                        {
                          id: "col_c_1",
                          code: "COL_NAME",
                          name: "Column 1",
                          span: { xs: 12, md: 6 },
                          displayOrder: 0,
                          placements: [
                            {
                              id: "place_c_name",
                              code: "PLACE_NAME",
                              name: "Contact Name",
                              fieldId: createdContactFields["name"],
                              span: { xs: 12, md: 6 },
                              displayOrder: 0,
                            },
                          ],
                        },
                        {
                          id: "col_c_2",
                          code: "COL_EMAIL",
                          name: "Column 2",
                          span: { xs: 12, md: 6 },
                          displayOrder: 1,
                          placements: [
                            {
                              id: "place_c_email",
                              code: "PLACE_EMAIL",
                              name: "Email Address",
                              fieldId: createdContactFields["email"],
                              span: { xs: 12, md: 6 },
                              displayOrder: 0,
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    await prisma.entityLayoutView.upsert({
      where: { entityId_code: { entityId: contactEntity.id, code: "CONTACT_FORM_V1" } },
      update: { name: "Contact Form Layout", layout: contactLayoutStructure, isDefault: true },
      create: {
        entityId: contactEntity.id,
        code: "CONTACT_FORM_V1",
        name: "Contact Form Layout",
        description: "Primary form layout for Contact records",
        layoutType: "FORM",
        isDefault: true,
        status: "DRAFT",
        layout: contactLayoutStructure,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });
    console.log("✅ CatContact layout view registered.");

    // Publish CatContact to generate Runtime Artifact
    const contactPublish = await publishService.publishEntity(contactEntity.id, actorUserId);
    console.log(`✅ CatContact published successfully (Artifact v${contactPublish.artifactVersion})!`);

    console.log("\n🎉 Complete Metadata Registration for CatRelationship & CatContact Complete!");
  } catch (err) {
    console.error("❌ Business entity metadata registration failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

registerCompleteBusinessEntities();
