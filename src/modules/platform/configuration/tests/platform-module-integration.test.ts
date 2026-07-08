import { PlatformModuleService } from "../services/platform-module-service";
import { PlatformModuleRepository } from "../repositories/platform-module-repository";
import { createAuditLog } from "@/lib/audit";

jest.mock("../repositories/platform-module-repository");
jest.mock("@/lib/audit", () => ({
  createAuditLog: jest.fn(),
}));

describe("PlatformModuleIntegrationTests", () => {
  let service: PlatformModuleService;
  let mockRepository: jest.Mocked<PlatformModuleRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PlatformModuleService();
    mockRepository = (service as any).repository;
  });

  test("cloneModule should create a new inactive copy of the module configuration", async () => {
    const mockSource = {
      id: "source-uuid",
      code: "CRM",
      name: "Customer Relationship Management",
      icon: "Users",
      sortOrder: 10,
      isActive: true,
      isSystem: true,
      metadata: { config: true },
      navigationGroup: "Sales",
      displayOrder: 10,
      route: "/crm",
      moduleDependencies: ["INVENTORY"],
      defaultPermissionSet: ["VIEW_CRM"]
    };

    mockRepository.getById.mockResolvedValue(mockSource as any);
    mockRepository.getByCode.mockResolvedValue(null);
    mockRepository.create.mockResolvedValue({ id: "cloned-uuid", code: "CRM_CLONE", name: "Customer Relationship Management (Clone)" } as any);

    const result = await service.cloneModule("source-uuid", "CRM_CLONE", 1, 1);

    expect(result.id).toBe("cloned-uuid");
    expect(mockRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "CRM_CLONE",
        name: "Customer Relationship Management (Clone)",
        isActive: false, // Clone should be inactive by default
        isSystem: false, // Clone shouldn't be system lock
        navigationGroup: "Sales",
        route: "/crm"
      })
    );
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "PLATFORM_MODULE_CLONE",
        details: expect.stringContaining("Cloned platform module: CRM to new module CRM_CLONE")
      })
    );
  });

  test("validateDependencies should report missing icons, default pages, display orders, and disabled required dependencies", async () => {
    mockRepository.getAll.mockResolvedValue([
      { code: "M1", name: "Module 1", isActive: true, icon: "", navigationGroup: "Sales", displayOrder: 1, route: "/m1", defaultPage: "", defaultPermissionSet: [] }, // Missing icon, missing landing page, missing permissions
      { code: "M2", name: "Module 2", isActive: true, icon: "Box", navigationGroup: "Sales", displayOrder: 1, route: "/m2", defaultPage: "/m2/home", defaultPermissionSet: ["PERM"], moduleDependencies: ["M3"] }, // Depends on disabled M3, duplicate display order with M1 in Sales
      { code: "M3", name: "Module 3", isActive: false, icon: "Calendar", navigationGroup: "Operations", displayOrder: 1, route: "/m3", defaultPage: "/m3/home", defaultPermissionSet: ["PERM"] }
    ] as any);

    const validation = await service.validateDependencies();
    expect(validation.isValid).toBe(false);

    const anomalies = validation.anomalies;
    const types = anomalies.map(a => a.type);

    expect(types).toContain("MISSING_ICON");
    expect(types).toContain("MISSING_LANDING_PAGE");
    expect(types).toContain("MISSING_PERMISSIONS");
    expect(types).toContain("DUPLICATE_DISPLAY_ORDER");
    expect(types).toContain("DISABLED_REQUIRED_MODULE");
  });

  test("publishRuntime should run validation and return cache generation lists with health status", async () => {
    mockRepository.getAll.mockResolvedValue([
      { code: "M1", name: "M1", isActive: true, icon: "Box", navigationGroup: "Sales", displayOrder: 1, route: "/m1", defaultPage: "/m1/home", defaultPermissionSet: ["PERM"] }
    ] as any);
    mockRepository.getNavigation.mockResolvedValue([
      { code: "M1", name: "M1", navigationGroup: "Sales", displayOrder: 1 }
    ] as any);
    mockRepository.getDashboardModules.mockResolvedValue([]);
    mockRepository.getEnabledModules.mockResolvedValue([]);

    const result = await service.publishRuntime(1, 1);

    expect(result.success).toBe(true);
    expect(result.healthStatus).toBe("HEALTHY");
    expect(result.generated.navigationTree.find(t => t.group === "Sales")!.modules).toHaveLength(1);
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "PLATFORM_RUNTIME_PUBLISH",
        details: expect.stringContaining("Published platform runtime configuration. Health Status: HEALTHY")
      })
    );
  });
});
