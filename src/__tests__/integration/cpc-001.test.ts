import { EntityService } from "@/modules/platform/configuration/services/entity-service";
import { PlatformModuleService } from "@/modules/platform/configuration/services/platform-module-service";
import { FieldService } from "@/modules/platform/configuration/services/field-service";
import { prisma } from "@/lib/prisma";
import { RuntimeRegistry } from "@/shared/components/runtime/registry/RuntimeRegistry";
import { RuntimeManifest } from "@/modules/platform/runtime/services/manifest-generator";

describe("CPC-001 Extended Validation: Priority Entity", () => {
  let entityId: string;
  let moduleId: string;
  const tenantId = 1;
  const actorUserId = 1;
  const entityService = new EntityService();
  const moduleService = new PlatformModuleService();
  const fieldService = new FieldService();

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
      where: { code: "CPC_TEST_MODULE" }
    });

    if (existingModule) {
      moduleId = existingModule.id;
    } else {
      const createdModule = await moduleService.create({
        code: "CPC_TEST_MODULE",
        name: "CPC Test Module",
        description: "Test module for CPC validation",
        icon: "Box",
        navigationGroup: "Tests",
        displayOrder: 1,
        isActive: true,
        route: "/cpc-test",
        defaultPage: "/cpc-test/home",
        defaultPermissionSet: ["ADMIN_ACCESS"]
      }, tenantId, actorUserId);
      moduleId = createdModule.id;
    }

    // Clean up existing Priority entity if it exists
    const existingEntity = await prisma.configurationEntity.findUnique({
      where: { code: "PRIORITY_TEST" }
    });
    if (existingEntity) {
      await prisma.configurationEntity.delete({ where: { id: existingEntity.id } });
    }
  });

  afterAll(async () => {
    if (entityId) {
      await prisma.configurationEntity.delete({ where: { id: entityId } }).catch(() => {});
    }
    if (moduleId) {
      await prisma.platformModule.delete({ where: { id: moduleId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it("should create the Priority entity", async () => {
    const createdEntity = await entityService.create({
      moduleId: moduleId,
      code: "PRIORITY_TEST",
      name: "Priority",
      pluralName: "Priorities",
      description: "Priority configuration",
      isSystem: false,
      isCustom: true,
      allowAudit: true,
      status: "DRAFT"
    }, tenantId, actorUserId);

    expect(createdEntity).toBeDefined();
    expect(createdEntity.code).toBe("PRIORITY_TEST");
    entityId = createdEntity.id;
  });

  it("should create required fields for Priority", async () => {
    // 1. Code Field
    await fieldService.createField(entityId, {
      code: "CODE",
      label: "Priority Code",
      dataType: "STRING",
      uiControl: "TEXT_INPUT",
      dataSource: "STATIC",
      required: true,
      unique: true,
      searchable: true,
      displayOrder: 1,
      options: [],
    }, tenantId, actorUserId);

    // 2. Name Field
    await fieldService.createField(entityId, {
      code: "NAME",
      label: "Priority Name",
      dataType: "STRING",
      uiControl: "TEXT_INPUT",
      dataSource: "STATIC",
      required: true,
      unique: false,
      searchable: true,
      displayOrder: 2,
      options: [],
    }, tenantId, actorUserId);

    // 3. Level Field (Integer)
    await fieldService.createField(entityId, {
      code: "LEVEL",
      label: "Severity Level",
      dataType: "INTEGER",
      uiControl: "NUMBER_INPUT",
      dataSource: "STATIC",
      required: true,
      unique: false,
      searchable: false,
      displayOrder: 3,
      options: [],
    }, tenantId, actorUserId);

    const fields = await prisma.entityFieldDefinition.findMany({
      where: { entityId: entityId }
    });
    
    expect(fields.length).toBe(3);
  });

  it("should validate and publish the Priority entity", async () => {
    const result = await entityService.publish(entityId, tenantId, actorUserId);
    expect(result.validationResult.isValid).toBe(true);
    expect(result.entity.status).toBe("PUBLISHED");
  });

  it("should have registered the manifest in RuntimeRegistry", async () => {
    const artifact = await RuntimeRegistry.getActiveArtifact("CPC_TEST_MODULE", "PRIORITY_TEST");
    expect(artifact).toBeDefined();
    const manifest = artifact?.payload as unknown as RuntimeManifest;
    expect(manifest?.entity).toBe("priority_test");
    expect(manifest?.fields.length).toBe(3);
    
    const codeField = manifest?.fields.find(f => f.code === "CODE");
    expect(codeField).toBeDefined();
    expect(codeField?.uiControl).toBe("TEXT_INPUT");
  });
});
