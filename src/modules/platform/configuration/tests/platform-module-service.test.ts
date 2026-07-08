import { PlatformModuleService } from "../services/platform-module-service";
import { PlatformModuleRepository } from "../repositories/platform-module-repository";
import { createAuditLog } from "@/lib/audit";

jest.mock("../repositories/platform-module-repository");
jest.mock("@/lib/audit", () => ({
  createAuditLog: jest.fn(),
}));

describe("PlatformModuleService", () => {
  let service: PlatformModuleService;
  let mockRepository: jest.Mocked<PlatformModuleRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PlatformModuleService();
    mockRepository = (service as any).repository;
  });

  test("create should throw if module code already exists", async () => {
    mockRepository.getByCode.mockResolvedValue({ id: "existing-uuid" } as any);

    await expect(
      service.create({ code: "CRM", name: "CRM", createdBy: "user-uuid" }, 1, 1)
    ).rejects.toThrow("Module with code CRM already exists");

    expect(mockRepository.create).not.toHaveBeenCalled();
  });

  test("create should succeed and write audit log", async () => {
    mockRepository.getByCode.mockResolvedValue(null);
    mockRepository.create.mockResolvedValue({ id: "new-uuid", code: "CRM", name: "CRM" } as any);

    const result = await service.create({ code: "CRM", name: "CRM", createdBy: "user-uuid" }, 1, 1);
    expect(result.id).toBe("new-uuid");
    expect(mockRepository.create).toHaveBeenCalled();
    expect(createAuditLog).toHaveBeenCalledWith({
      tenantId: 1,
      actorUserId: 1,
      action: "PLATFORM_MODULE_CREATE",
      details: expect.stringContaining("Created platform module: CRM"),
    });
  });

  test("delete should throw for system modules", async () => {
    mockRepository.getById.mockResolvedValue({ id: "system-uuid", isSystem: true } as any);

    await expect(service.delete("system-uuid", 1, 1)).rejects.toThrow(
      "System modules cannot be deleted"
    );
    expect(mockRepository.delete).not.toHaveBeenCalled();
  });

  test("toggleActive should block disabling if other active modules depend on it", async () => {
    mockRepository.getById.mockResolvedValue({ id: "inv-uuid", code: "INVENTORY", name: "Inventory", isActive: true } as any);
    mockRepository.getAll.mockResolvedValue([
      { id: "inv-uuid", code: "INVENTORY", name: "Inventory", isActive: true },
      { id: "kit-uuid", code: "KITCHEN", name: "Kitchen", isActive: true, moduleDependencies: ["INVENTORY"] }
    ] as any);

    await expect(service.toggleActive("inv-uuid", 1, 1)).rejects.toThrow(
      "Cannot disable module Inventory because active modules depend on it: Kitchen"
    );
    expect(mockRepository.update).not.toHaveBeenCalled();
  });

  test("toggleActive should block enabling if dependencies are disabled", async () => {
    mockRepository.getById.mockResolvedValue({ id: "kit-uuid", code: "KITCHEN", name: "Kitchen", isActive: false, moduleDependencies: ["INVENTORY"] } as any);
    mockRepository.getAll.mockResolvedValue([
      { id: "inv-uuid", code: "INVENTORY", name: "Inventory", isActive: false },
      { id: "kit-uuid", code: "KITCHEN", name: "Kitchen", isActive: false, moduleDependencies: ["INVENTORY"] }
    ] as any);

    await expect(service.toggleActive("kit-uuid", 1, 1)).rejects.toThrow(
      "Cannot enable module Kitchen because its dependencies are disabled: INVENTORY"
    );
    expect(mockRepository.update).not.toHaveBeenCalled();
  });

  test("validateDependencies should flag duplicate routes, broken references, and cycles", async () => {
    mockRepository.getAll.mockResolvedValue([
      { code: "M1", route: "/duplicate", moduleDependencies: [] },
      { code: "M2", route: "/duplicate", moduleDependencies: ["M3"] }, // Broken dependency on M3, duplicate route
      { code: "C1", route: "/c1", moduleDependencies: ["C2"] },
      { code: "C2", route: "/c2", moduleDependencies: ["C1"] } // Circular dependency C1 <-> C2
    ] as any);

    const validation = await service.validateDependencies();
    expect(validation.isValid).toBe(false);
    
    const anomalyTypes = validation.anomalies.map(a => a.type);
    expect(anomalyTypes).toContain("DUPLICATE_ROUTE");
    expect(anomalyTypes).toContain("BROKEN_PARENT");
    expect(anomalyTypes).toContain("CIRCULAR_DEPENDENCY");
  });

  test("getNavigationTree should group and sort active navigation modules", async () => {
    mockRepository.getNavigation.mockResolvedValue([
      { code: "CRM", name: "CRM", navigationGroup: "Sales", displayOrder: 2 },
      { code: "QUO", name: "Quotation", navigationGroup: "Sales", displayOrder: 1 },
      { code: "INV", name: "Inventory", navigationGroup: "Operations", displayOrder: 1 }
    ] as any);

    const tree = await service.getNavigationTree();
    const salesGroup = tree.find(t => t.group === "Sales");
    expect(salesGroup).toBeDefined();
    expect(salesGroup!.modules).toHaveLength(2);
    // Should be sorted by displayOrder
    expect(salesGroup!.modules[0].code).toBe("QUO");
    expect(salesGroup!.modules[1].code).toBe("CRM");

    const opsGroup = tree.find(t => t.group === "Operations");
    expect(opsGroup!.modules[0].code).toBe("INV");
  });
});
