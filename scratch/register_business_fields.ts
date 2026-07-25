import { prisma } from "../src/lib/prisma";

async function registerBusinessFields() {
  try {
    console.log("🌱 Registering domain business fields for CatContact and CatRelationship...");
    const adminUser = await prisma.user.findFirst();
    const actorUserId = adminUser ? adminUser.id : "00000000-0000-0000-0000-000000000002";

    // 1. Fetch Entities
    const contactEntity = await prisma.configurationEntity.findFirst({
      where: { code: "CatContact" },
    });

    const relEntity = await prisma.configurationEntity.findFirst({
      where: { code: "CatRelationship" },
    });

    if (contactEntity) {
      console.log(`Registering fields for CatContact [${contactEntity.id}]...`);
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

      for (const f of contactFields) {
        await prisma.entityFieldDefinition.upsert({
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
      }
      console.log("✅ CatContact fields registered!");
    }

    if (relEntity) {
      console.log(`Registering fields for CatRelationship [${relEntity.id}]...`);
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

      for (const f of relFields) {
        await prisma.entityFieldDefinition.upsert({
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
      }
      console.log("✅ CatRelationship fields registered!");
    }

    console.log("\n🎉 Business fields registration complete!");
  } catch (err) {
    console.error("❌ Error registering business fields:", err);
  } finally {
    await prisma.$disconnect();
  }
}

registerBusinessFields();
