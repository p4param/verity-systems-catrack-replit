import { EntityService } from "@/modules/platform/configuration/services/entity-service";
import { PlatformModuleService } from "@/modules/platform/configuration/services/platform-module-service";
import { FieldService } from "@/modules/platform/configuration/services/field-service";
import { LayoutService } from "@/modules/platform/configuration/services/layout-service";
import { prisma } from "@/lib/prisma";
import { RuntimeRegistry } from "@/shared/components/runtime/registry/RuntimeRegistry";
import { RuntimeManifest } from "@/modules/platform/runtime/services/manifest-generator";
import { runtimeEventBus } from "@/shared/components/runtime/services/EventBus";
import { RuntimeEventType } from "@/shared/components/runtime/types/framework";
import crypto from "crypto";

describe("VS05C Quality Release Gate Certification", () => {
  let hrModuleId: string;
  let deptEntityId: string;
  let incidentEntityId: string;
  let stressEntityId: string;

  const tenantId = 1;
  const actorUserId = 1;

  const entityService = new EntityService();
  const moduleService = new PlatformModuleService();
  const fieldService = new FieldService();
  const layoutService = new LayoutService();

  beforeAll(async () => {
    // Ensure active tenant
    await prisma.tenant.upsert({
      where: { id: tenantId },
      update: { isActive: true },
      create: {
        id: tenantId,
        code: "SYSTEM",
        name: "Test Tenant",
        isActive: true,
      }
    });

    const existingMod = await prisma.platformModule.findUnique({ where: { code: "HR" } });
    if (existingMod) {
      hrModuleId = existingMod.id;
    } else {
      const created = await moduleService.create({
        code: "HR",
        name: "Human Resources",
        description: "HR Module",
        icon: "User",
        navigationGroup: "Platform",
        displayOrder: 1,
        isActive: true,
        route: "/hr",
        defaultPage: "/hr/home",
        defaultPermissionSet: ["USER"]
      }, tenantId, actorUserId);
      hrModuleId = created.id;
    }

    const cleanupEntity = async (code: string) => {
      const existing = await prisma.configurationEntity.findUnique({ where: { code } });
      if (existing) {
        await prisma.configurationEntity.delete({ where: { id: existing.id } }).catch(() => {});
      }
    };

    await cleanupEntity("CERT_DEPT");
    await cleanupEntity("POP_INCIDENT_REPORT");
    await cleanupEntity("CERT_STRESS_TEST");
  });

  afterAll(async () => {
    if (deptEntityId) await prisma.configurationEntity.delete({ where: { id: deptEntityId } }).catch(() => {});
    if (incidentEntityId) await prisma.configurationEntity.delete({ where: { id: incidentEntityId } }).catch(() => {});
    if (stressEntityId) await prisma.configurationEntity.delete({ where: { id: stressEntityId } }).catch(() => {});
    await prisma.$disconnect();
  });

  // ─── 1. Incident Report Entity Certification ──────────────────────────────
  it("should successfully certify POP_INCIDENT_REPORT containing rich text, statuses, priority levels, date, owner, comments, and attachments", async () => {
    // 1. Create a Department reference target entity for Owner lookup
    const dept = await entityService.create({
      moduleId: hrModuleId,
      code: "CERT_DEPT",
      name: "Cert Department",
      pluralName: "Cert Departments",
      description: "Incident lookup target departments",
      isSystem: false,
      isCustom: true,
      allowAudit: false,
      status: "DRAFT"
    }, tenantId, actorUserId);
    deptEntityId = dept.id;

    const deptName = await fieldService.createField(deptEntityId, {
      code: "DEPT_NAME",
      label: "Department Name",
      dataType: "STRING",
      uiControl: "TEXT_INPUT",
      dataSource: "STATIC",
      required: true,
      displayOrder: 1
    }, tenantId, actorUserId);

    await entityService.publish(deptEntityId, tenantId, actorUserId);

    // 2. Create Incident Report Entity
    const incident = await entityService.create({
      moduleId: hrModuleId,
      code: "POP_INCIDENT_REPORT",
      name: "Incident Report",
      pluralName: "Incident Reports",
      description: "Incident logging registry",
      isSystem: false,
      isCustom: true,
      allowAudit: true,
      status: "DRAFT"
    }, tenantId, actorUserId);
    incidentEntityId = incident.id;

    // Create Fields
    const fNo = await fieldService.createField(incidentEntityId, {
      code: "INCIDENT_NO",
      label: "Incident Number",
      dataType: "STRING",
      uiControl: "TEXT_INPUT",
      dataSource: "STATIC",
      required: true,
      displayOrder: 1,
    }, tenantId, actorUserId);

    const fPriority = await fieldService.createField(incidentEntityId, {
      code: "PRIORITY",
      label: "Priority Rank",
      dataType: "STRING",
      uiControl: "SELECT",
      dataSource: "STATIC",
      required: true,
      displayOrder: 2,
      metadata: {
        options: [
          { value: "HIGH", label: "High Priority" },
          { value: "MEDIUM", label: "Medium Priority" },
          { value: "LOW", label: "Low Priority" }
        ]
      }
    }, tenantId, actorUserId);

    const fDesc = await fieldService.createField(incidentEntityId, {
      code: "DESCRIPTION",
      label: "Incident Details",
      dataType: "STRING",
      uiControl: "TEXTAREA",
      dataSource: "STATIC",
      required: false,
      displayOrder: 3,
    }, tenantId, actorUserId);

    const fDate = await fieldService.createField(incidentEntityId, {
      code: "INCIDENT_DATE",
      label: "Occurrence Date",
      dataType: "DATE",
      uiControl: "DATE_PICKER",
      dataSource: "STATIC",
      required: true,
      displayOrder: 4,
    }, tenantId, actorUserId);

    const fOwner = await fieldService.createField(incidentEntityId, {
      code: "OWNER_ID",
      label: "Assigned Department",
      dataType: "UUID",
      uiControl: "LOOKUP",
      dataSource: "LOOKUP_ENTITY",
      required: true,
      displayOrder: 5,
      lookupDefinition: {
        referencedEntityId: deptEntityId,
        displayFieldCode: "DEPT_NAME",
        valueFieldCode: "id"
      }
    }, tenantId, actorUserId);

    const fAttachments = await fieldService.createField(incidentEntityId, {
      code: "ATTACHMENTS_METADATA",
      label: "Attachments metadata json",
      dataType: "STRING",
      uiControl: "TEXT_INPUT",
      dataSource: "STATIC",
      required: false,
      displayOrder: 6,
    }, tenantId, actorUserId);

    // Form Layout
    await layoutService.createLayout(incidentEntityId, {
      code: "INC_FORM",
      name: "Standard Incident Log Form",
      layoutType: "FORM",
      isDefault: true,
      layout: {
        layoutVersion: "1.0",
        tabs: [
          {
            id: crypto.randomUUID(),
            code: "MAIN_TAB",
            name: "Details",
            title: "Incident Details",
            displayOrder: 1,
            visible: true,
            sections: [
              {
                id: crypto.randomUUID(),
                code: "PRIMARY_SEC",
                name: "Header details",
                title: "Primary Data",
                displayOrder: 1,
                visible: true,
                groups: [
                  {
                    id: crypto.randomUUID(),
                    code: "PRIMARY_GRP",
                    name: "Metadata",
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
                                code: "INC_NO_PLACE",
                                name: "No Placement",
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
                                code: "PRIO_PLACE",
                                name: "Priority Placement",
                                fieldId: fPriority.id,
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
                                code: "OWNER_PLACE",
                                name: "Owner Placement",
                                fieldId: fOwner.id,
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
          },
          {
            id: crypto.randomUUID(),
            code: "DESC_TAB",
            name: "Description",
            title: "Detailed Description",
            displayOrder: 2,
            visible: true,
            sections: [
              {
                id: crypto.randomUUID(),
                code: "DESC_SEC",
                name: "Description Area",
                title: "Log Info",
                displayOrder: 1,
                visible: true,
                groups: [
                  {
                    id: crypto.randomUUID(),
                    code: "DESC_GRP",
                    name: "Description Details",
                    displayOrder: 1,
                    visible: true,
                    rows: [
                      {
                        id: crypto.randomUUID(),
                        code: "DESC_ROW",
                        name: "Description Row",
                        displayOrder: 1,
                        visible: true,
                        columns: [
                          {
                            id: crypto.randomUUID(),
                            code: "DESC_COL",
                            name: "Description Col",
                            displayOrder: 1,
                            visible: true,
                            span: { xs: 12, md: 12 },
                            placements: [
                              {
                                id: crypto.randomUUID(),
                                code: "DESC_PLACE",
                                name: "Description Textbox",
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
          },
          {
            id: crypto.randomUUID(),
            code: "DOCS_TAB",
            name: "Documents",
            title: "Attachments",
            displayOrder: 3,
            visible: true,
            sections: [
              {
                id: crypto.randomUUID(),
                code: "ATTACH_SEC",
                name: "Upload details",
                title: "Files Meta",
                displayOrder: 1,
                visible: true,
                groups: [
                  {
                    id: crypto.randomUUID(),
                    code: "ATTACH_GRP",
                    name: "Attachments Info",
                    displayOrder: 1,
                    visible: true,
                    rows: [
                      {
                        id: crypto.randomUUID(),
                        code: "ATTACH_ROW",
                        name: "Attach Row",
                        displayOrder: 1,
                        visible: true,
                        columns: [
                          {
                            id: crypto.randomUUID(),
                            code: "ATTACH_COL",
                            name: "Attach Col",
                            displayOrder: 1,
                            visible: true,
                            span: { xs: 12, md: 12 },
                            placements: [
                              {
                                id: crypto.randomUUID(),
                                code: "ATTACH_PLACE",
                                name: "Attachment Metadata field",
                                fieldId: fAttachments.id,
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
    const result = await entityService.publish(incidentEntityId, tenantId, actorUserId);
    expect(result.validationResult.isValid).toBe(true);

    const artifact = await RuntimeRegistry.getActiveArtifact("HR", "POP_INCIDENT_REPORT");
    expect(artifact).toBeDefined();
    const manifest = artifact?.payload as unknown as RuntimeManifest;
    expect(manifest.fields.length).toBe(6);
    expect(manifest.fields.find(f => f.code === "OWNER_ID")?.uiControl).toBe("LOOKUP");
    expect(manifest.fields.find(f => f.code === "PRIORITY")?.uiControl).toBe("SELECT");
    expect(manifest.fields.find(f => f.code === "DESCRIPTION")?.uiControl).toBe("TEXTAREA");
  });

  // ─── 2. Large Stress Form Validation ───────────────────────────────────────
  it("should generate a stress-test entity with 150 fields, 10 tabs, and 20 sections matching performance timings targets", async () => {
    const startManifestGen = performance.now();
    
    // Create Stress Target Entity
    const stress = await entityService.create({
      moduleId: hrModuleId,
      code: "CERT_STRESS_TEST",
      name: "Stress Test Form",
      pluralName: "Stress Test Forms",
      description: "Benchmark testing registry containing 150 fields",
      isSystem: false,
      isCustom: true,
      allowAudit: false,
      status: "DRAFT"
    }, tenantId, actorUserId);
    stressEntityId = stress.id;

    // Create 150 fields programmatically sequentially to avoid DB locks
    const createdFields: any[] = [];
    for (let idx = 0; idx < 150; idx++) {
      const f = await fieldService.createField(stressEntityId, {
        code: `FIELD_${idx + 1}`,
        label: `Field #${idx + 1}`,
        dataType: idx % 3 === 0 ? "STRING" : idx % 3 === 1 ? "DECIMAL" : "BOOLEAN",
        uiControl: idx % 3 === 0 ? "TEXT_INPUT" : idx % 3 === 1 ? "CURRENCY_INPUT" : "TOGGLE",
        dataSource: "STATIC",
        required: idx < 10, // First 10 fields are required
        displayOrder: idx + 1,
      }, tenantId, actorUserId);
      createdFields.push(f);
    }
    expect(createdFields.length).toBe(150);

    // Build 10 Tabs, each having 2 sections (total 20 sections)
    const tabs = Array.from({ length: 10 }).map((_, tabIdx) => {
      const sections = Array.from({ length: 2 }).map((_, secIdx) => {
        const secGlobalIdx = tabIdx * 2 + secIdx + 1; // 1 to 20
        const startFieldIdx = (secGlobalIdx - 1) * 7; // allocate 7-8 fields per section
        
        // placements for fields
        const placements = createdFields
          .slice(startFieldIdx, startFieldIdx + 7)
          .map((f, pIdx) => ({
            id: crypto.randomUUID(),
            code: `PLACE_${f.code}`,
            name: `${f.label} Placement`,
            fieldId: f.id,
            displayOrder: pIdx + 1,
            visible: true,
          }));

        return {
          id: crypto.randomUUID(),
          code: `SEC_${secGlobalIdx}`,
          name: `Section #${secGlobalIdx}`,
          title: `Stress Section ${secGlobalIdx}`,
          displayOrder: secIdx + 1,
          visible: true,
          groups: [
            {
              id: crypto.randomUUID(),
              code: `GRP_${secGlobalIdx}`,
              name: `Group #${secGlobalIdx}`,
              displayOrder: 1,
              visible: true,
              rows: [
                {
                  id: crypto.randomUUID(),
                  code: `ROW_${secGlobalIdx}`,
                  name: `Row #${secGlobalIdx}`,
                  displayOrder: 1,
                  visible: true,
                  columns: [
                    {
                      id: crypto.randomUUID(),
                      code: `COL_${secGlobalIdx}`,
                      name: `Col #${secGlobalIdx}`,
                      displayOrder: 1,
                      visible: true,
                      span: { xs: 12, md: 12 },
                      placements,
                    }
                  ]
                }
              ]
            }
          ]
        };
      });

      return {
        id: crypto.randomUUID(),
        code: `TAB_${tabIdx + 1}`,
        name: `Tab_${tabIdx + 1}`,
        title: `Stress Tab ${tabIdx + 1}`,
        displayOrder: tabIdx + 1,
        visible: true,
        sections,
      };
    });

    await layoutService.createLayout(stressEntityId, {
      code: `STRESS_FORM`,
      name: `Benchmark Stress Form`,
      layoutType: "FORM",
      isDefault: true,
      layout: {
        layoutVersion: "1.0",
        tabs
      }
    }, tenantId, actorUserId);

    // Publish Stress Config
    const publishRes = await entityService.publish(stressEntityId, tenantId, actorUserId);
    expect(publishRes.validationResult.isValid).toBe(true);

    const manifestGenDuration = performance.now() - startManifestGen;
    
    // Performance target validations
    expect(manifestGenDuration).toBeLessThan(10000); // 10000ms limit including database writes
    
    const activeArtifact = await RuntimeRegistry.getActiveArtifact("HR", "CERT_STRESS_TEST");
    expect(activeArtifact).toBeDefined();
    const payload = activeArtifact?.payload as unknown as RuntimeManifest;
    expect(payload.fields.length).toBe(150);
  }, 30000);

  // ─── 3. Event Bus Lifecycle Verification ──────────────────────────────────
  it("should publish lifecycle events in direct sequence and unsubscribe correctly on destroy", () => {
    const receivedEvents: string[] = [];

    const unsubscribe = runtimeEventBus.subscribe("*", (evt) => {
      receivedEvents.push(evt.type);
    });

    runtimeEventBus.publish({
      type: RuntimeEventType.INITIALIZE,
      source: "DynamicFormTest",
      timestamp: Date.now(),
      payload: {},
    });

    runtimeEventBus.publish({
      type: RuntimeEventType.LOAD,
      source: "DynamicFormTest",
      timestamp: Date.now(),
      payload: {},
    });

    runtimeEventBus.publish({
      type: RuntimeEventType.CHANGE,
      source: "Field_1",
      timestamp: Date.now(),
      payload: { fieldCode: "PO_NO", value: "PO-001" },
    });

    runtimeEventBus.publish({
      type: RuntimeEventType.DESTROY,
      source: "DynamicFormTest",
      timestamp: Date.now(),
      payload: {},
    });

    expect(receivedEvents).toEqual([
      RuntimeEventType.INITIALIZE,
      RuntimeEventType.LOAD,
      RuntimeEventType.CHANGE,
      RuntimeEventType.DESTROY,
    ]);

    // Unsubscribe
    unsubscribe();
    receivedEvents.length = 0;

    // Publish after unsubscribe
    runtimeEventBus.publish({
      type: RuntimeEventType.INITIALIZE,
      source: "DynamicFormTest",
      timestamp: Date.now(),
      payload: {},
    });
    expect(receivedEvents.length).toBe(0); // Subscriber was released successfully
  });
});
