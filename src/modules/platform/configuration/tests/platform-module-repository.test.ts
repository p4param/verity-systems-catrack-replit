import { PlatformModuleRepository } from "../repositories/platform-module-repository";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    platformModule: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe("PlatformModuleRepository", () => {
  let repository: PlatformModuleRepository;

  beforeEach(() => {
    repository = new PlatformModuleRepository();
    jest.clearAllMocks();
  });

  test("getAll should retrieve modules ordered by sortOrder", async () => {
    const mockModules = [
      { code: "CRM", name: "CRM", sortOrder: 10 },
      { code: "EVENT", name: "Events", sortOrder: 20 },
    ];
    (prisma.platformModule.findMany as jest.Mock).mockResolvedValue(mockModules);

    const result = await repository.getAll();
    expect(result).toEqual(mockModules);
    expect(prisma.platformModule.findMany).toHaveBeenCalledWith({
      orderBy: { sortOrder: "asc" },
    });
  });

  test("getById should fetch single module", async () => {
    const mockModule = { id: "some-uuid", code: "CRM", name: "CRM" };
    (prisma.platformModule.findUnique as jest.Mock).mockResolvedValue(mockModule);

    const result = await repository.getById("some-uuid");
    expect(result).toEqual(mockModule);
    expect(prisma.platformModule.findUnique).toHaveBeenCalledWith({
      where: { id: "some-uuid" },
    });
  });

  test("create should save new module", async () => {
    const newModuleData = {
      code: "TEST",
      name: "Test Module",
      createdBy: "user-uuid",
    };
    const createdModule = { id: "new-uuid", ...newModuleData };
    (prisma.platformModule.create as jest.Mock).mockResolvedValue(createdModule);

    const result = await repository.create(newModuleData);
    expect(result).toEqual(createdModule);
    expect(prisma.platformModule.create).toHaveBeenCalledWith({
      data: {
        code: "TEST",
        name: "Test Module",
        description: undefined,
        icon: undefined,
        sortOrder: 0,
        isActive: true,
        isSystem: false,
        metadata: {},
        navigationGroup: null,
        displayOrder: 0,
        route: null,
        defaultPage: null,
        color: null,
        badge: null,
        badgeColor: null,
        menuVisible: true,
        showInSearch: true,
        showOnDashboard: true,
        showInMobile: false,
        isLicensed: true,
        requiresLicense: false,
        featureFlag: "Production",
        moduleDependencies: [],
        minimumRole: "USER",
        defaultPermissionSet: [],
        defaultLandingPage: null,
        helpUrl: null,
        documentationUrl: null,
        supportEmail: null,
        createdBy: "user-uuid",
        updatedBy: "user-uuid",
      },
    });
  });
});
