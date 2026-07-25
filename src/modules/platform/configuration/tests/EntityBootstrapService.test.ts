import { prisma } from "@/lib/prisma";
import { EntityBootstrapService, PLATFORM_SYSTEM_FIELDS } from "../services/EntityBootstrapService";

describe("EntityBootstrapService Unit & Integration Tests", () => {
  const bootstrapService = new EntityBootstrapService();
  let testModule: any;
  let testEntity: any;
  const actorUserId = "00000000-0000-0000-0000-000000000002";

  beforeAll(async () => {
    // 1. Create a dummy test module
    testModule = await prisma.platformModule.upsert({
      where: { code: "BOOTSTRAP_TEST_MOD" },
      update: {},
      create: {
        code: "BOOTSTRAP_TEST_MOD",
        name: "Bootstrap Test Module",
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });

    // 2. Create a bare configuration entity
    testEntity = await prisma.configurationEntity.create({
      data: {
        moduleId: testModule.id,
        code: "BOOTSTRAP_TEST_ENT",
        name: "Bootstrap Test Entity",
        pluralName: "Bootstrap Test Entities",
        showInNavigation: true,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });
  });

  afterAll(async () => {
    if (testEntity) {
      await prisma.configurationEntity.delete({ where: { id: testEntity.id } }).catch(() => {});
    }
    if (testModule) {
      await prisma.platformModule.delete({ where: { id: testModule.id } }).catch(() => {});
    }
  });

  test("should bootstrap platform system fields, default views (ALL_RECORDS & ACTIVE_RECORDS), and default MAIN_FORM layout", async () => {
    const result = await bootstrapService.bootstrapEntity(testEntity.id, actorUserId);
    expect(result.success).toBe(true);

    const fetched = await prisma.configurationEntity.findUnique({
      where: { id: testEntity.id },
      include: {
        fields: true,
        views: true,
        layoutViews: true,
        navigationItems: true,
        artifacts: true,
      },
    });

    expect(fetched).not.toBeNull();

    // 1. Verify 6 system fields created
    expect(fetched!.fields.length).toBe(6);
    const fieldCodes = fetched!.fields.map((f) => f.code);
    PLATFORM_SYSTEM_FIELDS.forEach((sysF) => {
      expect(fieldCodes).toContain(sysF.code);
    });

    // 2. Verify 2 default views created (ALL_RECORDS, ACTIVE_RECORDS)
    expect(fetched!.views.length).toBe(2);
    const viewCodes = fetched!.views.map((v) => v.code);
    expect(viewCodes).toContain("ALL_RECORDS");
    expect(viewCodes).toContain("ACTIVE_RECORDS");

    const defaultView = fetched!.views.find((v) => v.code === "ALL_RECORDS");
    expect(defaultView?.isDefault).toBe(true);

    // 3. Verify 1 default layout view created (MAIN_FORM)
    expect(fetched!.layoutViews.length).toBe(1);
    const layout = fetched!.layoutViews[0];
    expect(layout.code).toBe("MAIN_FORM");
    expect(layout.isDefault).toBe(true);

    // 4. Verify navigation scaffolding created
    expect(fetched!.navigationItems.length).toBe(1);

    // 5. Verify NO RuntimeArtifact created during bootstrap (publishing is explicit)
    expect(fetched!.artifacts.length).toBe(0);
  });

  test("should be idempotent and not create duplicate metadata if re-run", async () => {
    const result = await bootstrapService.bootstrapEntity(testEntity.id, actorUserId);
    expect(result.success).toBe(true);

    const fetched = await prisma.configurationEntity.findUnique({
      where: { id: testEntity.id },
      include: {
        fields: true,
        views: true,
        layoutViews: true,
      },
    });

    expect(fetched!.fields.length).toBe(6);
    expect(fetched!.views.length).toBe(2);
    expect(fetched!.layoutViews.length).toBe(1);
  });
});
