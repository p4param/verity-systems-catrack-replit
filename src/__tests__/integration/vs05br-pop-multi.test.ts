import { EntityService } from "@/modules/platform/configuration/services/entity-service";
import { PlatformModuleService } from "@/modules/platform/configuration/services/platform-module-service";
import { FieldService } from "@/modules/platform/configuration/services/field-service";
import { LayoutService } from "@/modules/platform/configuration/services/layout-service";
import { prisma } from "@/lib/prisma";
import { RuntimeRegistry } from "@/shared/components/runtime/registry/RuntimeRegistry";
import { RuntimeManifest } from "@/modules/platform/runtime/services/manifest-generator";
import crypto from "crypto";

describe("VS05BR Proof of Platform: Multi-Entity Layout Framework", () => {
  let hrModuleId: string;
  let financeModuleId: string;
  let procurementModuleId: string;

  let deptEntityId: string;
  let custEntityId: string;
  let suppEntityId: string;
  let poEntityId: string;

  const tenantId = 1;
  const actorUserId = 1;

  const entityService = new EntityService();
  const moduleService = new PlatformModuleService();
  const fieldService = new FieldService();
  const layoutService = new LayoutService();

  beforeAll(async () => {
    // Ensure Tenant exists
    await prisma.tenant.upsert({
      where: { id: tenantId },
      update: {},
      create: {
        id: tenantId,
        code: "test",
        name: "Test Tenant",
        isActive: true,
      }
    });

    // Create Platform Modules if not exists
    const createMod = async (code: string, name: string) => {
      const existing = await prisma.platformModule.findUnique({ where: { code } });
      if (existing) return existing.id;
      const created = await moduleService.create({
        code,
        name,
        description: `${name} Module`,
        icon: "Box",
        navigationGroup: "Platform",
        displayOrder: 1,
        isActive: true,
        route: `/${code.toLowerCase()}`,
        defaultPage: `/${code.toLowerCase()}/home`,
        defaultPermissionSet: ["USER"]
      }, tenantId, actorUserId);
      return created.id;
    };

    hrModuleId = await createMod("HR", "Human Resources");
    financeModuleId = await createMod("FINANCE", "Finance");
    procurementModuleId = await createMod("PROCUREMENT", "Procurement");

    // Clean up existing test entities if any
    const cleanupEntity = async (code: string) => {
      const existing = await prisma.configurationEntity.findUnique({ where: { code } });
      if (existing) {
        await prisma.configurationEntity.delete({ where: { id: existing.id } }).catch(() => {});
      }
    };

    await cleanupEntity("POP_DEPARTMENT");
    await cleanupEntity("POP_CUSTOMER");
    await cleanupEntity("POP_SUPPLIER");
    await cleanupEntity("POP_PURCHASE_ORDER");
  });

  afterAll(async () => {
    if (deptEntityId) await prisma.configurationEntity.delete({ where: { id: deptEntityId } }).catch(() => {});
    if (custEntityId) await prisma.configurationEntity.delete({ where: { id: custEntityId } }).catch(() => {});
    if (suppEntityId) await prisma.configurationEntity.delete({ where: { id: suppEntityId } }).catch(() => {});
    if (poEntityId) await prisma.configurationEntity.delete({ where: { id: poEntityId } }).catch(() => {});
    await prisma.$disconnect();
  });

  // ─── Entity 1: Department ──────────────────────────────────────────────────
  it("should build, lay out, and publish the POP_DEPARTMENT entity", async () => {
    // Create Entity
    const entity = await entityService.create({
      moduleId: hrModuleId,
      code: "POP_DEPARTMENT",
      name: "Pop Department",
      pluralName: "Pop Departments",
      description: "Department metadata setup",
      isSystem: false,
      isCustom: true,
      allowAudit: true,
      status: "DRAFT"
    }, tenantId, actorUserId);
    deptEntityId = entity.id;

    // Fields
    const fCode = await fieldService.createField(deptEntityId, {
      code: "DEPT_CODE",
      label: "Department Code",
      dataType: "STRING",
      uiControl: "TEXT_INPUT",
      dataSource: "STATIC",
      required: true,
      unique: true,
      displayOrder: 1,
    }, tenantId, actorUserId);

    const fName = await fieldService.createField(deptEntityId, {
      code: "DEPT_NAME",
      label: "Department Name",
      dataType: "STRING",
      uiControl: "TEXT_INPUT",
      dataSource: "STATIC",
      required: true,
      displayOrder: 2,
    }, tenantId, actorUserId);

    // Form Layout
    await layoutService.createLayout(deptEntityId, {
      code: "DEFAULT_FORM",
      name: "Main Department Form",
      layoutType: "FORM",
      isDefault: true,
      layout: {
        layoutVersion: "1.0",
        tabs: [
          {
            id: crypto.randomUUID(),
            code: "GENERAL_TAB",
            name: "General",
            title: "General Info",
            displayOrder: 1,
            visible: true,
            sections: [
              {
                id: crypto.randomUUID(),
                code: "MAIN_SECTION",
                name: "Basic Info",
                title: "Basic Info",
                displayOrder: 1,
                visible: true,
                groups: [
                  {
                    id: crypto.randomUUID(),
                    code: "MAIN_GROUP",
                    name: "Group 1",
                    displayOrder: 1,
                    visible: true,
                    rows: [
                      {
                        id: crypto.randomUUID(),
                        code: "ROW_1",
                        name: "Row 1",
                        displayOrder: 1,
                        visible: true,
                        columns: [
                          {
                            id: crypto.randomUUID(),
                            code: "COL_1",
                            name: "Col 1",
                            displayOrder: 1,
                            visible: true,
                            span: { xs: 12, md: 6 },
                            placements: [
                              {
                                id: crypto.randomUUID(),
                                code: "CODE_PLACE",
                                name: "Code Placement",
                                fieldId: fCode.id,
                                displayOrder: 1,
                                visible: true,
                              }
                            ]
                          },
                          {
                            id: crypto.randomUUID(),
                            code: "COL_2",
                            name: "Col 2",
                            displayOrder: 2,
                            visible: true,
                            span: { xs: 12, md: 6 },
                            placements: [
                              {
                                id: crypto.randomUUID(),
                                code: "NAME_PLACE",
                                name: "Name Placement",
                                fieldId: fName.id,
                                displayOrder: 1,
                                visible: true,
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    }, tenantId, actorUserId);

    // Publish
    const result = await entityService.publish(deptEntityId, tenantId, actorUserId);
    expect(result.validationResult.isValid).toBe(true);
    
    // Manifest verification
    const artifact = await RuntimeRegistry.getActiveArtifact("HR", "POP_DEPARTMENT");
    expect(artifact).toBeDefined();
    const manifest = artifact?.payload as unknown as RuntimeManifest;
    expect(manifest.entityName).toBe("Pop Department");
    expect(manifest.presentation.layoutViews[0].code).toBe("DEFAULT_FORM");
  });

  // ─── Entity 2: Customer ────────────────────────────────────────────────────
  it("should build, lay out, and publish the POP_CUSTOMER entity with Selection and Currency controls", async () => {
    const entity = await entityService.create({
      moduleId: financeModuleId,
      code: "POP_CUSTOMER",
      name: "Customer",
      pluralName: "Customers",
      description: "Customer accounts metadata",
      isSystem: false,
      isCustom: true,
      allowAudit: true,
      status: "DRAFT"
    }, tenantId, actorUserId);
    custEntityId = entity.id;

    // Fields
    const fCode = await fieldService.createField(custEntityId, {
      code: "CUST_CODE",
      label: "Customer Code",
      dataType: "STRING",
      uiControl: "TEXT_INPUT",
      dataSource: "STATIC",
      required: true,
      displayOrder: 1,
    }, tenantId, actorUserId);

    const fCredit = await fieldService.createField(custEntityId, {
      code: "CREDIT_LIMIT",
      label: "Credit Limit",
      dataType: "DECIMAL",
      uiControl: "CURRENCY_INPUT",
      dataSource: "STATIC",
      required: false,
      displayOrder: 2,
    }, tenantId, actorUserId);

    const fMembership = await fieldService.createField(custEntityId, {
      code: "MEMBERSHIP",
      label: "Membership Tier",
      dataType: "STRING",
      uiControl: "SELECT",
      dataSource: "STATIC",
      required: false,
      displayOrder: 3,
      options: [
        { code: "GOLD", label: "Gold Club", displayOrder: 1 },
        { code: "SILVER", label: "Silver Tier", displayOrder: 2 }
      ],
    }, tenantId, actorUserId);

    // Form Layout
    await layoutService.createLayout(custEntityId, {
      code: "CUST_FORM",
      name: "Customer Profile Form",
      layoutType: "FORM",
      isDefault: true,
      layout: {
        layoutVersion: "1.0",
        tabs: [
          {
            id: crypto.randomUUID(),
            code: "PROFILE_TAB",
            name: "Profile",
            title: "Profile Settings",
            displayOrder: 1,
            visible: true,
            sections: [
              {
                id: crypto.randomUUID(),
                code: "CREDIT_SECTION",
                name: "Financials",
                title: "Financial Details",
                displayOrder: 1,
                visible: true,
                groups: [
                  {
                    id: crypto.randomUUID(),
                    code: "CREDIT_GROUP",
                    name: "Accounts",
                    displayOrder: 1,
                    visible: true,
                    rows: [
                      {
                        id: crypto.randomUUID(),
                        code: "ROW_1",
                        name: "Row 1",
                        displayOrder: 1,
                        visible: true,
                        columns: [
                          {
                            id: crypto.randomUUID(),
                            code: "COL_1",
                            name: "Col 1",
                            displayOrder: 1,
                            visible: true,
                            span: { xs: 12, md: 4 },
                            placements: [
                              {
                                id: crypto.randomUUID(),
                                code: "CODE_PLACE",
                                name: "Code Placement",
                                fieldId: fCode.id,
                                displayOrder: 1,
                                visible: true,
                              }
                            ]
                          },
                          {
                            id: crypto.randomUUID(),
                            code: "COL_2",
                            name: "Col 2",
                            displayOrder: 2,
                            visible: true,
                            span: { xs: 12, md: 4 },
                            placements: [
                              {
                                id: crypto.randomUUID(),
                                code: "CREDIT_PLACE",
                                name: "Credit Limit Placement",
                                fieldId: fCredit.id,
                                displayOrder: 1,
                                visible: true,
                              }
                            ]
                          },
                          {
                            id: crypto.randomUUID(),
                            code: "COL_3",
                            name: "Col 3",
                            displayOrder: 3,
                            visible: true,
                            span: { xs: 12, md: 4 },
                            placements: [
                              {
                                id: crypto.randomUUID(),
                                code: "TIER_PLACE",
                                name: "Tier Placement",
                                fieldId: fMembership.id,
                                displayOrder: 1,
                                visible: true,
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    }, tenantId, actorUserId);

    // Publish
    const result = await entityService.publish(custEntityId, tenantId, actorUserId);
    expect(result.validationResult.isValid).toBe(true);

    const artifact = await RuntimeRegistry.getActiveArtifact("FINANCE", "POP_CUSTOMER");
    expect(artifact).toBeDefined();
    const manifest = artifact?.payload as unknown as RuntimeManifest;
    expect(manifest.fields.length).toBe(3);
    const currencyField = manifest.fields.find(f => f.code === "CREDIT_LIMIT");
    expect(currencyField.uiControl).toBe("CURRENCY_INPUT");
  });

  // ─── Entity 3: Supplier ────────────────────────────────────────────────────
  it("should build, lay out, and publish the POP_SUPPLIER entity with DatePicker and Textarea controls", async () => {
    const entity = await entityService.create({
      moduleId: procurementModuleId,
      code: "POP_SUPPLIER",
      name: "Supplier",
      pluralName: "Suppliers",
      description: "Supplier registry",
      isSystem: false,
      isCustom: true,
      allowAudit: true,
      status: "DRAFT"
    }, tenantId, actorUserId);
    suppEntityId = entity.id;

    // Fields
    const fCode = await fieldService.createField(suppEntityId, {
      code: "SUPP_CODE",
      label: "Supplier Code",
      dataType: "STRING",
      uiControl: "TEXT_INPUT",
      dataSource: "STATIC",
      required: true,
      displayOrder: 1,
    }, tenantId, actorUserId);

    const fDate = await fieldService.createField(suppEntityId, {
      code: "ONBOARD_DATE",
      label: "Onboard Date",
      dataType: "DATE",
      uiControl: "DATE_PICKER",
      dataSource: "STATIC",
      required: false,
      displayOrder: 2,
    }, tenantId, actorUserId);

    const fDesc = await fieldService.createField(suppEntityId, {
      code: "DESCRIPTION",
      label: "Supplier Description",
      dataType: "STRING",
      uiControl: "TEXTAREA",
      dataSource: "STATIC",
      required: false,
      displayOrder: 3,
    }, tenantId, actorUserId);

    // Form Layout
    await layoutService.createLayout(suppEntityId, {
      code: "SUPP_FORM",
      name: "Supplier Profile Form",
      layoutType: "FORM",
      isDefault: true,
      layout: {
        layoutVersion: "1.0",
        tabs: [
          {
            id: crypto.randomUUID(),
            code: "SUPP_TAB",
            name: "Details",
            title: "Supplier Details",
            displayOrder: 1,
            visible: true,
            sections: [
              {
                id: crypto.randomUUID(),
                code: "SUPP_SEC",
                name: "Details Section",
                title: "Onboarding Info",
                displayOrder: 1,
                visible: true,
                groups: [
                  {
                    id: crypto.randomUUID(),
                    code: "SUPP_GRP",
                    name: "General Group",
                    displayOrder: 1,
                    visible: true,
                    rows: [
                      {
                        id: crypto.randomUUID(),
                        code: "ROW_1",
                        name: "Row 1",
                        displayOrder: 1,
                        visible: true,
                        columns: [
                          {
                            id: crypto.randomUUID(),
                            code: "COL_1",
                            name: "Col 1",
                            displayOrder: 1,
                            visible: true,
                            span: { xs: 12, md: 6 },
                            placements: [
                              {
                                id: crypto.randomUUID(),
                                code: "CODE_PLACE",
                                name: "Code Placement",
                                fieldId: fCode.id,
                                displayOrder: 1,
                                visible: true,
                              }
                            ]
                          },
                          {
                            id: crypto.randomUUID(),
                            code: "COL_2",
                            name: "Col 2",
                            displayOrder: 2,
                            visible: true,
                            span: { xs: 12, md: 6 },
                            placements: [
                              {
                                id: crypto.randomUUID(),
                                code: "DATE_PLACE",
                                name: "Date Placement",
                                fieldId: fDate.id,
                                displayOrder: 1,
                                visible: true,
                              }
                            ]
                          }
                        ]
                      },
                      {
                        id: crypto.randomUUID(),
                        code: "ROW_2",
                        name: "Row 2",
                        displayOrder: 2,
                        visible: true,
                        columns: [
                          {
                            id: crypto.randomUUID(),
                            code: "COL_3",
                            name: "Col 3",
                            displayOrder: 1,
                            visible: true,
                            span: { xs: 12, md: 12 },
                            placements: [
                              {
                                id: crypto.randomUUID(),
                                code: "DESC_PLACE",
                                name: "Desc Placement",
                                fieldId: fDesc.id,
                                displayOrder: 1,
                                visible: true,
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    }, tenantId, actorUserId);

    // Publish
    const result = await entityService.publish(suppEntityId, tenantId, actorUserId);
    expect(result.validationResult.isValid).toBe(true);

    const artifact = await RuntimeRegistry.getActiveArtifact("PROCUREMENT", "POP_SUPPLIER");
    expect(artifact).toBeDefined();
    const manifest = artifact?.payload as unknown as RuntimeManifest;
    expect(manifest.fields.length).toBe(3);
    const textareaField = manifest.fields.find(f => f.code === "DESCRIPTION");
    expect(textareaField.uiControl).toBe("TEXTAREA");
  });

  // ─── Entity 4: Purchase Order (Transaction Entity) ─────────────────────────
  it("should build, lay out, and publish the POP_PURCHASE_ORDER transaction entity with lookup references, decimals, and dates", async () => {
    const entity = await entityService.create({
      moduleId: procurementModuleId,
      code: "POP_PURCHASE_ORDER",
      name: "Purchase Order",
      pluralName: "Purchase Orders",
      description: "Purchase Order transactions registry",
      isSystem: false,
      isCustom: true,
      allowAudit: true,
      status: "DRAFT"
    }, tenantId, actorUserId);
    poEntityId = entity.id;

    // Fields
    const fNo = await fieldService.createField(poEntityId, {
      code: "PO_NO",
      label: "PO Number",
      dataType: "STRING",
      uiControl: "TEXT_INPUT",
      dataSource: "STATIC",
      required: true,
      displayOrder: 1,
    }, tenantId, actorUserId);

    const fSupplier = await fieldService.createField(poEntityId, {
      code: "SUPPLIER_ID",
      label: "Supplier Reference",
      dataType: "UUID",
      uiControl: "LOOKUP",
      dataSource: "LOOKUP_ENTITY",
      required: true,
      displayOrder: 2,
      lookupDefinition: {
        referencedEntityId: suppEntityId,
        displayFieldCode: "SUPP_NAME",
        valueFieldCode: "id"
      }
    }, tenantId, actorUserId);

    const fDate = await fieldService.createField(poEntityId, {
      code: "ORDER_DATE",
      label: "Order Date",
      dataType: "DATE",
      uiControl: "DATE_PICKER",
      dataSource: "STATIC",
      required: true,
      displayOrder: 3,
    }, tenantId, actorUserId);

    const fTotal = await fieldService.createField(poEntityId, {
      code: "TOTAL_AMOUNT",
      label: "Total Amount",
      dataType: "DECIMAL",
      uiControl: "CURRENCY_INPUT",
      dataSource: "STATIC",
      required: true,
      displayOrder: 4,
    }, tenantId, actorUserId);

    // Form Layout
    await layoutService.createLayout(poEntityId, {
      code: "PO_FORM",
      name: "Standard PO Form",
      layoutType: "FORM",
      isDefault: true,
      layout: {
        layoutVersion: "1.0",
        tabs: [
          {
            id: crypto.randomUUID(),
            code: "MAIN_TAB",
            name: "OrderDetails",
            title: "Order Details",
            displayOrder: 1,
            visible: true,
            sections: [
              {
                id: crypto.randomUUID(),
                code: "HEADER_SEC",
                name: "Header Info",
                title: "PO Header Info",
                displayOrder: 1,
                visible: true,
                groups: [
                  {
                    id: crypto.randomUUID(),
                    code: "HEADER_GRP",
                    name: "Primary Metadata",
                    displayOrder: 1,
                    visible: true,
                    rows: [
                      {
                        id: crypto.randomUUID(),
                        code: "ROW_1",
                        name: "Row 1",
                        displayOrder: 1,
                        visible: true,
                        columns: [
                          {
                            id: crypto.randomUUID(),
                            code: "COL_1",
                            name: "Col 1",
                            displayOrder: 1,
                            visible: true,
                            span: { xs: 12, md: 6 },
                            placements: [
                              {
                                id: crypto.randomUUID(),
                                code: "PO_NO_PLACE",
                                name: "PO Number Placement",
                                fieldId: fNo.id,
                                displayOrder: 1,
                                visible: true,
                              }
                            ]
                          },
                          {
                            id: crypto.randomUUID(),
                            code: "COL_2",
                            name: "Col 2",
                            displayOrder: 2,
                            visible: true,
                            span: { xs: 12, md: 6 },
                            placements: [
                              {
                                id: crypto.randomUUID(),
                                code: "SUPP_PLACE",
                                name: "Supplier Placement",
                                fieldId: fSupplier.id,
                                displayOrder: 1,
                                visible: true,
                              }
                            ]
                          }
                        ]
                      },
                      {
                        id: crypto.randomUUID(),
                        code: "ROW_2",
                        name: "Row 2",
                        displayOrder: 2,
                        visible: true,
                        columns: [
                          {
                            id: crypto.randomUUID(),
                            code: "COL_3",
                            name: "Col 3",
                            displayOrder: 1,
                            visible: true,
                            span: { xs: 12, md: 6 },
                            placements: [
                              {
                                id: crypto.randomUUID(),
                                code: "DATE_PLACE",
                                name: "Date Placement",
                                fieldId: fDate.id,
                                displayOrder: 1,
                                visible: true,
                              }
                            ]
                          },
                          {
                            id: crypto.randomUUID(),
                            code: "COL_4",
                            name: "Col 4",
                            displayOrder: 2,
                            visible: true,
                            span: { xs: 12, md: 6 },
                            placements: [
                              {
                                id: crypto.randomUUID(),
                                code: "TOTAL_PLACE",
                                name: "Total Placement",
                                fieldId: fTotal.id,
                                displayOrder: 1,
                                visible: true,
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    }, tenantId, actorUserId);

    // Publish
    const result = await entityService.publish(poEntityId, tenantId, actorUserId);
    expect(result.validationResult.isValid).toBe(true);

    const artifact = await RuntimeRegistry.getActiveArtifact("PROCUREMENT", "POP_PURCHASE_ORDER");
    expect(artifact).toBeDefined();
    const manifest = artifact?.payload as unknown as RuntimeManifest;
    expect(manifest.fields.length).toBe(4);
    const lookupField = manifest.fields.find(f => f.code === "SUPPLIER_ID");
    expect(lookupField.uiControl).toBe("LOOKUP");
    expect(lookupField.dataType).toBe("UUID");
  });
});
