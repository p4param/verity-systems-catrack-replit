import { EntityService } from "@/modules/platform/configuration/services/entity-service";
import { PlatformModuleService } from "@/modules/platform/configuration/services/platform-module-service";
import { FieldService } from "@/modules/platform/configuration/services/field-service";
import { LayoutService } from "@/modules/platform/configuration/services/layout-service";
import { prisma } from "@/lib/prisma";
import { RuntimeRegistry } from "@/shared/components/runtime/registry/RuntimeRegistry";
import { RuntimeManifest } from "@/modules/platform/runtime/services/manifest-generator";
import crypto from "crypto";

describe("VS05BR Proof of Platform: Department Entity Metadata", () => {
  let entityId: string;
  let moduleId: string;
  let layoutId: string;
  const tenantId = 1;
  const actorUserId = 1;

  const entityService = new EntityService();
  const moduleService = new PlatformModuleService();
  const fieldService = new FieldService();
  const layoutService = new LayoutService();

  // Field definitions to retrieve after creation
  let deptCodeFieldId = "";
  let deptNameFieldId = "";
  let descFieldId = "";
  let managerFieldId = "";
  let statusFieldId = "";
  let createdOnFieldId = "";

  beforeAll(async () => {
    // 1. Ensure Tenant exists
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

    // 2. Create Platform Module (if not exists)
    const existingModule = await prisma.platformModule.findUnique({
      where: { code: "HR" }
    });

    if (existingModule) {
      moduleId = existingModule.id;
    } else {
      const createdModule = await moduleService.create({
        code: "HR",
        name: "Human Resources",
        description: "HR Module",
        icon: "Users",
        navigationGroup: "Platform",
        displayOrder: 2,
        isActive: true,
        route: "/hr",
        defaultPage: "/hr/home",
        defaultPermissionSet: ["HR_ACCESS"]
      }, tenantId, actorUserId);
      moduleId = createdModule.id;
    }

    // Clean up existing DEPARTMENT entity if it exists
    const existingEntity = await prisma.configurationEntity.findUnique({
      where: { code: "DEPARTMENT" }
    });
    if (existingEntity) {
      await prisma.configurationEntity.delete({ where: { id: existingEntity.id } });
    }
  });

  afterAll(async () => {
    if (entityId) {
      await prisma.configurationEntity.delete({ where: { id: entityId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it("should create the Department entity", async () => {
    const createdEntity = await entityService.create({
      moduleId: moduleId,
      code: "DEPARTMENT",
      name: "Department",
      pluralName: "Departments",
      description: "Company Department configuration",
      isSystem: false,
      isCustom: true,
      allowAudit: true,
      status: "DRAFT"
    }, tenantId, actorUserId);

    expect(createdEntity).toBeDefined();
    expect(createdEntity.code).toBe("DEPARTMENT");
    entityId = createdEntity.id;
  });

  it("should create fields for Department", async () => {
    // 1. Department Code (String, Text input)
    const f1 = await fieldService.createField(entityId, {
      code: "DEPT_CODE",
      label: "Department Code",
      dataType: "STRING",
      uiControl: "TEXT_INPUT",
      dataSource: "STATIC",
      required: true,
      unique: true,
      searchable: true,
      displayOrder: 1,
      options: [],
    }, tenantId, actorUserId);
    deptCodeFieldId = f1.id;

    // 2. Department Name (String, Text input)
    const f2 = await fieldService.createField(entityId, {
      code: "DEPT_NAME",
      label: "Department Name",
      dataType: "STRING",
      uiControl: "TEXT_INPUT",
      dataSource: "STATIC",
      required: true,
      unique: false,
      searchable: true,
      displayOrder: 2,
      options: [],
    }, tenantId, actorUserId);
    deptNameFieldId = f2.id;

    // 3. Description (String, Text area)
    const f3 = await fieldService.createField(entityId, {
      code: "DESCRIPTION",
      label: "Description",
      dataType: "STRING",
      uiControl: "TEXTAREA",
      dataSource: "STATIC",
      required: false,
      unique: false,
      searchable: false,
      displayOrder: 3,
      options: [],
    }, tenantId, actorUserId);
    descFieldId = f3.id;

    // 4. Manager (String/Lookup representation)
    const f4 = await fieldService.createField(entityId, {
      code: "MANAGER",
      label: "Manager",
      dataType: "STRING",
      uiControl: "TEXT_INPUT",
      dataSource: "STATIC",
      required: false,
      unique: false,
      searchable: true,
      displayOrder: 4,
      options: [],
    }, tenantId, actorUserId);
    managerFieldId = f4.id;

    // 5. Status (Dropdown with Active/Inactive)
    const f5 = await fieldService.createField(entityId, {
      code: "STATUS",
      label: "Status",
      dataType: "STRING",
      uiControl: "SELECT",
      dataSource: "STATIC",
      required: false,
      unique: false,
      searchable: false,
      displayOrder: 5,
      options: [
        { code: "ACTIVE", label: "Active", displayOrder: 1 },
        { code: "INACTIVE", label: "Inactive", displayOrder: 2 }
      ],
    }, tenantId, actorUserId);
    statusFieldId = f5.id;

    // 6. Created On (DateTime, Date Picker)
    const f6 = await fieldService.createField(entityId, {
      code: "CREATED_ON",
      label: "Created On",
      dataType: "DATE",
      uiControl: "DATE_PICKER",
      dataSource: "STATIC",
      required: false,
      unique: false,
      searchable: false,
      displayOrder: 6,
      options: [],
    }, tenantId, actorUserId);
    createdOnFieldId = f6.id;

    const fields = await prisma.entityFieldDefinition.findMany({
      where: { entityId: entityId }
    });
    expect(fields.length).toBe(6);
  });

  it("should create the Layout View for Department", async () => {
    // Generate UUIDs for all nodes in the hierarchy to verify standard UUID nodes
    const tabId = crypto.randomUUID();
    const sectionId = crypto.randomUUID();
    const groupId = crypto.randomUUID();
    const row1Id = crypto.randomUUID();
    const row2Id = crypto.randomUUID();
    const row3Id = crypto.randomUUID();
    const row4Id = crypto.randomUUID();
    const col1Id = crypto.randomUUID();
    const col2Id = crypto.randomUUID();
    const col3Id = crypto.randomUUID();
    const col4Id = crypto.randomUUID();
    const col5Id = crypto.randomUUID();
    const col6Id = crypto.randomUUID();
    const p1Id = crypto.randomUUID();
    const p2Id = crypto.randomUUID();
    const p3Id = crypto.randomUUID();
    const p4Id = crypto.randomUUID();
    const p5Id = crypto.randomUUID();
    const p6Id = crypto.randomUUID();

    const layoutPayload = {
      code: "MAIN_FORM",
      name: "Main Form Layout",
      description: "Default Department data input form",
      layoutType: "FORM" as const,
      isDefault: true,
      layout: {
        layoutVersion: "1.0",
        responsiveColumns: { xs: 1, sm: 1, md: 2, lg: 2, xl: 3 },
        tabs: [
          {
            id: tabId,
            code: "GENERAL_TAB",
            name: "General",
            title: "General",
            description: "General Department configuration",
            displayOrder: 1,
            visible: true,
            metadata: {},
            sections: [
              {
                id: sectionId,
                code: "BASIC_INFO_SECTION",
                name: "Basic Information",
                title: "Basic Information",
                description: "Basic name and code",
                displayOrder: 1,
                visible: true,
                collapsible: true,
                initiallyExpanded: true,
                metadata: {},
                groups: [
                  {
                    id: groupId,
                    code: "MAIN_GROUP",
                    name: "Fields",
                    title: "Fields",
                    description: "Main properties",
                    displayOrder: 1,
                    visible: true,
                    metadata: {},
                    rows: [
                      {
                        id: row1Id,
                        code: "ROW_1",
                        name: "Row 1",
                        description: null,
                        displayOrder: 1,
                        visible: true,
                        metadata: {},
                        columns: [
                          {
                            id: col1Id,
                            code: "COL_1_1",
                            name: "Column 1-1",
                            description: null,
                            displayOrder: 1,
                            visible: true,
                            metadata: {},
                            span: { xs: 12, md: 6 },
                            placements: [
                              {
                                id: p1Id,
                                code: "DEPT_CODE_PLACEMENT",
                                name: "Department Code Placement",
                                fieldId: deptCodeFieldId,
                                span: { xs: 12, md: 6 },
                                labelPosition: "TOP" as const,
                                displayOrder: 1,
                                visible: true,
                                metadata: {},
                              }
                            ]
                          },
                          {
                            id: col2Id,
                            code: "COL_1_2",
                            name: "Column 1-2",
                            description: null,
                            displayOrder: 2,
                            visible: true,
                            metadata: {},
                            span: { xs: 12, md: 6 },
                            placements: [
                              {
                                id: p2Id,
                                code: "DEPT_NAME_PLACEMENT",
                                name: "Department Name Placement",
                                fieldId: deptNameFieldId,
                                span: { xs: 12, md: 6 },
                                labelPosition: "TOP" as const,
                                displayOrder: 1,
                                visible: true,
                                metadata: {},
                              }
                            ]
                          }
                        ]
                      },
                      {
                        id: row2Id,
                        code: "ROW_2",
                        name: "Row 2",
                        description: null,
                        displayOrder: 2,
                        visible: true,
                        metadata: {},
                        columns: [
                          {
                            id: col3Id,
                            code: "COL_2_1",
                            name: "Column 2-1",
                            description: null,
                            displayOrder: 1,
                            visible: true,
                            metadata: {},
                            span: { xs: 12, md: 12 },
                            placements: [
                              {
                                id: p3Id,
                                code: "DESCRIPTION_PLACEMENT",
                                name: "Description Placement",
                                fieldId: descFieldId,
                                span: { xs: 12, md: 12 },
                                labelPosition: "TOP" as const,
                                displayOrder: 1,
                                visible: true,
                                metadata: {},
                              }
                            ]
                          }
                        ]
                      },
                      {
                        id: row3Id,
                        code: "ROW_3",
                        name: "Row 3",
                        description: null,
                        displayOrder: 3,
                        visible: true,
                        metadata: {},
                        columns: [
                          {
                            id: col4Id,
                            code: "COL_3_1",
                            name: "Column 3-1",
                            description: null,
                            displayOrder: 1,
                            visible: true,
                            metadata: {},
                            span: { xs: 12, md: 6 },
                            placements: [
                              {
                                id: p4Id,
                                code: "MANAGER_PLACEMENT",
                                name: "Manager Placement",
                                fieldId: managerFieldId,
                                span: { xs: 12, md: 6 },
                                labelPosition: "TOP" as const,
                                displayOrder: 1,
                                visible: true,
                                metadata: {},
                              }
                            ]
                          },
                          {
                            id: col5Id,
                            code: "COL_3_2",
                            name: "Column 3-2",
                            description: null,
                            displayOrder: 2,
                            visible: true,
                            metadata: {},
                            span: { xs: 12, md: 6 },
                            placements: [
                              {
                                id: p5Id,
                                code: "STATUS_PLACEMENT",
                                name: "Status Placement",
                                fieldId: statusFieldId,
                                span: { xs: 12, md: 6 },
                                labelPosition: "TOP" as const,
                                displayOrder: 1,
                                visible: true,
                                metadata: {},
                              }
                            ]
                          }
                        ]
                      },
                      {
                        id: row4Id,
                        code: "ROW_4",
                        name: "Row 4",
                        description: null,
                        displayOrder: 4,
                        visible: true,
                        metadata: {},
                        columns: [
                          {
                            id: col6Id,
                            code: "COL_4_1",
                            name: "Column 4-1",
                            description: null,
                            displayOrder: 1,
                            visible: true,
                            metadata: {},
                            span: { xs: 12, md: 6 },
                            placements: [
                              {
                                id: p6Id,
                                code: "CREATED_ON_PLACEMENT",
                                name: "Created On Placement",
                                fieldId: createdOnFieldId,
                                span: { xs: 12, md: 6 },
                                labelPosition: "TOP" as const,
                                displayOrder: 1,
                                visible: true,
                                metadata: {},
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
    };

    const createdLayout = await layoutService.createLayout(entityId, layoutPayload, tenantId, actorUserId);
    expect(createdLayout).toBeDefined();
    expect(createdLayout.code).toBe("MAIN_FORM");
    layoutId = createdLayout.id;
  });

  it("should validate and publish the Department entity", async () => {
    const result = await entityService.publish(entityId, tenantId, actorUserId);
    expect(result.validationResult.isValid).toBe(true);
    expect(result.entity.status).toBe("PUBLISHED");
  });

  it("should retrieve compiled Layout views inside manifest payload", async () => {
    const artifact = await RuntimeRegistry.getActiveArtifact("HR", "DEPARTMENT");
    expect(artifact).toBeDefined();
    const manifest = artifact?.payload as unknown as RuntimeManifest;
    
    expect(manifest?.entity).toBe("department");
    expect(manifest?.fields.length).toBe(6);

    const layoutViews = manifest?.presentation?.layoutViews || [];
    expect(layoutViews.length).toBe(1);

    const mainForm = layoutViews[0];
    expect(mainForm.code).toBe("MAIN_FORM");
    expect(mainForm.layoutType).toBe("FORM");

    const tabs = mainForm.layout.tabs;
    expect(tabs.length).toBe(1);

    const tab = tabs[0];
    expect(tab.title).toBe("General");

    const sections = tab.sections;
    expect(sections.length).toBe(1);

    const section = sections[0];
    expect(section.title).toBe("Basic Information");
    expect(section.collapsible).toBe(true);

    const groups = section.groups;
    expect(groups.length).toBe(1);

    const rows = groups[0].rows;
    expect(rows.length).toBe(4);

    // Row 1 should have 2 columns
    expect(rows[0].columns.length).toBe(2);
    // Column 1 should place DEPT_CODE
    expect(rows[0].columns[0].placements[0].fieldId).toBe(deptCodeFieldId);
  });
});
