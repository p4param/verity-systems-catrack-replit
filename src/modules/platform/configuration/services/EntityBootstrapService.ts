import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/client";
import { logger } from "@/lib/logger";

export interface SystemFieldDefinition {
  code: string;
  label: string;
  dataType: string;
  required: boolean;
  unique: boolean;
  indexed: boolean;
  searchable: boolean;
  sortable: boolean;
  filterable: boolean;
  defaultValue?: string;
  uiControl: string;
  displayOrder: number;
}

export const PLATFORM_SYSTEM_FIELDS: SystemFieldDefinition[] = [
  {
    code: "id",
    label: "ID",
    dataType: "UUID",
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
    code: "createdAt",
    label: "Created At",
    dataType: "DATETIME",
    required: true,
    unique: false,
    indexed: true,
    searchable: false,
    sortable: true,
    filterable: true,
    uiControl: "DATE_PICKER",
    displayOrder: 98,
  },
  {
    code: "createdBy",
    label: "Created By",
    dataType: "UUID",
    required: true,
    unique: false,
    indexed: true,
    searchable: true,
    sortable: true,
    filterable: true,
    uiControl: "TEXT_INPUT",
    displayOrder: 99,
  },
  {
    code: "updatedAt",
    label: "Updated At",
    dataType: "DATETIME",
    required: true,
    unique: false,
    indexed: false,
    searchable: false,
    sortable: true,
    filterable: true,
    uiControl: "DATE_PICKER",
    displayOrder: 100,
  },
  {
    code: "updatedBy",
    label: "Updated By",
    dataType: "UUID",
    required: true,
    unique: false,
    indexed: false,
    searchable: false,
    sortable: false,
    filterable: false,
    uiControl: "TEXT_INPUT",
    displayOrder: 101,
  },
  {
    code: "isDeleted",
    label: "Is Deleted",
    dataType: "BOOLEAN",
    required: true,
    unique: false,
    indexed: true,
    searchable: false,
    sortable: false,
    filterable: true,
    defaultValue: "false",
    uiControl: "CHECKBOX",
    displayOrder: 102,
  },
];

function formatFieldLabel(code: string): string {
  if (code === "id") return "ID";
  if (code === "relationshipNumber") return "Relationship Number";
  if (code === "primaryContactId") return "Primary Contact";
  if (code === "isPrimary") return "Is Primary Contact";

  const result = code.replace(/([A-Z])/g, " $1");
  return result.charAt(0).toUpperCase() + result.slice(1).trim();
}

export class EntityBootstrapService {
  /**
   * Bootstraps platform-level metadata and automatically synchronizes business fields from Prisma DMMF:
   * 1. Creates standard platform system fields (id, createdAt, createdBy, updatedAt, updatedBy, isDeleted).
   * 2. Automatically syncs physical business fields from Prisma DMMF into entity_field_definitions.
   * 3. Creates default data views (ALL_RECORDS, ACTIVE_RECORDS).
   * 4. Creates default main form layout (MAIN_FORM) containing field placements.
   * 5. Generates navigation scaffolding if showInNavigation is enabled.
   */
  async bootstrapEntity(
    entityId: string,
    actorUserId: string,
    tx?: Prisma.TransactionClient
  ) {
    const db = tx || prisma;
    const formattedUserId = actorUserId;

    logger.info(`Bootstrapping platform metadata & Prisma DMMF for entity ${entityId}`, { entityId, userId: actorUserId });

    const entity = await db.configurationEntity.findUnique({
      where: { id: entityId },
      include: { module: true, fields: true, views: true, layoutViews: true },
    });

    if (!entity) {
      throw new Error(`Entity not found for bootstrapping: ${entityId}`);
    }

    // 1. System Fields Bootstrap
    const existingFieldCodes = new Set(entity.fields.map((f: any) => f.code));
    for (const sysField of PLATFORM_SYSTEM_FIELDS) {
      if (!existingFieldCodes.has(sysField.code)) {
        await db.entityFieldDefinition.create({
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
            defaultValue: sysField.defaultValue || null,
            uiControl: sysField.uiControl,
            displayOrder: sysField.displayOrder,
            status: "DRAFT",
            createdBy: formattedUserId,
            updatedBy: formattedUserId,
            metadata: { isSystemField: true },
          },
        });
        existingFieldCodes.add(sysField.code);
        logger.info(`Bootstrapped system field: ${sysField.code} on entity ${entity.code}`);
      }
    }

    // 2. Sync Physical Business Fields from Prisma DMMF Schema
    const dmmfModels = Prisma.dmmf.datamodel.models;
    const prismaModel = dmmfModels.find(
      (m) =>
        m.name === entity.code ||
        m.dbName === entity.code ||
        m.name.toLowerCase() === entity.code.toLowerCase()
    );

    if (prismaModel) {
      logger.info(`Found Prisma model DMMF for ${entity.code}, syncing physical fields...`);

      const ignoredSystemCodes = new Set([
        "id", "tenantId", "companyId", "branchId", "version",
        "createdAt", "createdBy", "updatedAt", "updatedBy",
        "deletedAt", "deletedBy", "isDeleted"
      ]);

      let displayOrderCounter = 10;
      for (const field of prismaModel.fields) {
        if (field.kind === "object") continue; // Skip relations
        if (ignoredSystemCodes.has(field.name)) continue;

        if (!existingFieldCodes.has(field.name)) {
          let dataType = "STRING";
          let uiControl = "TEXT_INPUT";

          if (field.type === "Int" || field.type === "Float" || field.type === "Decimal") {
            dataType = "NUMBER";
            uiControl = "NUMBER_INPUT";
          } else if (field.type === "Boolean") {
            dataType = "BOOLEAN";
            uiControl = "CHECKBOX";
          } else if (field.type === "DateTime") {
            dataType = "DATETIME";
            uiControl = "DATE_PICKER";
          } else if (field.kind === "enum" || field.type === "RelationshipType" || field.type === "RelationshipStatus") {
            dataType = "LOOKUP";
            uiControl = "SELECT";
          }

          await db.entityFieldDefinition.create({
            data: {
              entityId,
              code: field.name,
              label: formatFieldLabel(field.name),
              dataType,
              required: field.isRequired,
              unique: field.isUnique,
              indexed: field.isUnique,
              searchable: dataType === "STRING",
              sortable: true,
              filterable: true,
              defaultValue: field.hasDefaultValue && typeof field.default === "string" ? field.default : null,
              uiControl,
              displayOrder: displayOrderCounter++,
              status: "DRAFT",
              createdBy: formattedUserId,
              updatedBy: formattedUserId,
              metadata: { isSyncedFromPrisma: true },
            },
          });
          existingFieldCodes.add(field.name);
          logger.info(`Synced business field from Prisma DMMF: ${field.name} on entity ${entity.code}`);
        }
      }
    }

    // Load all fields for layout and view building
    const allFields = await db.entityFieldDefinition.findMany({
      where: { entityId },
      orderBy: { displayOrder: "asc" },
    });

    const businessFields = allFields.filter((f) => !PLATFORM_SYSTEM_FIELDS.some((sf) => sf.code === f.code));

    // 3. Default Views Bootstrap (ALL_RECORDS, ACTIVE_RECORDS)
    const existingViewCodes = new Set(entity.views.map((v: any) => v.code));
    
    if (!existingViewCodes.has("ALL_RECORDS")) {
      await db.entityView.create({
        data: {
          entityId,
          code: "ALL_RECORDS",
          name: "All Records",
          viewType: "GRID",
          isDefault: true,
          status: "DRAFT",
          createdBy: formattedUserId,
          updatedBy: formattedUserId,
          metadata: { columns: allFields.map((f) => f.code) },
        },
      });
      logger.info(`Bootstrapped default view ALL_RECORDS on entity ${entity.code}`);
    }

    if (!existingViewCodes.has("ACTIVE_RECORDS")) {
      await db.entityView.create({
        data: {
          entityId,
          code: "ACTIVE_RECORDS",
          name: "Active Records",
          viewType: "GRID",
          isDefault: false,
          status: "DRAFT",
          createdBy: formattedUserId,
          updatedBy: formattedUserId,
          metadata: { columns: allFields.map((f) => f.code), filter: { isDeleted: false } },
        },
      });
      logger.info(`Bootstrapped default view ACTIVE_RECORDS on entity ${entity.code}`);
    }

    // 4. Default Layout View Bootstrap (MAIN_FORM)
    const existingLayoutCodes = new Set(entity.layoutViews.map((l: any) => l.code));
    if (!existingLayoutCodes.has("MAIN_FORM")) {
      // Build placements for business fields
      const placements = businessFields.map((f, idx) => ({
        id: `place_${f.code}`,
        code: `PLACE_${f.code.toUpperCase()}`,
        name: f.label,
        fieldId: f.id,
        span: { xs: 12, md: 6 },
        displayOrder: idx,
      }));

      const mainLayoutStructure = {
        layoutVersion: "1.0",
        responsiveColumns: { xs: 1, sm: 1, md: 2, lg: 2, xl: 3 },
        tabs: [
          {
            id: `tab_${entity.code.toLowerCase()}_main`,
            code: "TAB_MAIN",
            name: "Main Details",
            title: "Main Details",
            displayOrder: 0,
            sections: [
              {
                id: `sec_${entity.code.toLowerCase()}_info`,
                code: "SEC_GENERAL",
                name: "General Information",
                title: "General Information",
                displayOrder: 0,
                groups: [
                  {
                    id: `grp_${entity.code.toLowerCase()}_fields`,
                    code: "GRP_FIELDS",
                    name: "Fields",
                    title: "Fields",
                    displayOrder: 0,
                    rows: [
                      {
                        id: `row_${entity.code.toLowerCase()}_1`,
                        code: "ROW_1",
                        name: "Row 1",
                        displayOrder: 0,
                        columns: [
                          {
                            id: `col_${entity.code.toLowerCase()}_1`,
                            code: "COL_1",
                            name: "Column 1",
                            span: { xs: 12, md: 12 },
                            displayOrder: 0,
                            placements,
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

      await db.entityLayoutView.create({
        data: {
          entityId,
          code: "MAIN_FORM",
          name: "Main Form Layout",
          description: "Default main form layout for record entry",
          layoutType: "FORM",
          isDefault: true,
          status: "DRAFT",
          createdBy: formattedUserId,
          updatedBy: formattedUserId,
          layout: mainLayoutStructure,
        },
      });
      logger.info(`Bootstrapped default layout MAIN_FORM on entity ${entity.code}`);
    }

    // 5. Navigation Scaffolding
    if (entity.showInNavigation) {
      const route = entity.route || `/runtime/${entity.module.code.toLowerCase()}/${entity.code.toLowerCase()}`;
      const existingNav = await db.navigationItem.findFirst({ where: { entityId } });
      if (!existingNav) {
        await db.navigationItem.create({
          data: {
            entityId,
            platformModuleId: entity.moduleId,
            title: entity.name,
            route,
            icon: entity.icon || "box",
            visible: true,
            createdBy: formattedUserId,
            updatedBy: formattedUserId,
          },
        });
        logger.info(`Bootstrapped navigation item for entity ${entity.code}`);
      }
    }

    logger.info(`Successfully completed platform bootstrapping & Prisma DMMF sync for entity ${entity.code}`);
    return { success: true, entityId };
  }
}

export const entityBootstrapService = new EntityBootstrapService();
