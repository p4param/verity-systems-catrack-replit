import { NavigationRepository } from "../repositories/navigation-repository";
import { NavigationService } from "../services/navigation-service";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    navigationGroup: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn()
    },
    navigationItem: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn()
    },
    navigationProfile: {
      findMany: jest.fn(),
      findUnique: jest.fn()
    },
    navigationLayout: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    navigationVersion: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn()
    },
    navigationHistory: {
      create: jest.fn(),
      findMany: jest.fn()
    },
    navigationSearchIndex: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn()
    },
    platformModule: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    $transaction: jest.fn((promises) => Promise.all(promises))
  }
}));

jest.mock("@/lib/audit", () => ({
  createAuditLog: jest.fn(() => Promise.resolve())
}));

describe("NavigationRepository", () => {
  let repository: NavigationRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new NavigationRepository();
  });

  it("should get all groups ordered by displayOrder", async () => {
    (prisma.navigationGroup.findMany as jest.Mock).mockResolvedValue([
      { id: "1", code: "G1", name: "Group 1", displayOrder: 10 }
    ]);

    const result = await repository.getAllGroups();
    expect(result).toHaveLength(1);
    expect(prisma.navigationGroup.findMany).toHaveBeenCalledWith({
      orderBy: { displayOrder: "asc" }
    });
  });

  it("should create a navigation group", async () => {
    const data = {
      code: "TEST",
      name: "Test Group",
      createdBy: "3673f1d8-04ff-44e2-a05e-8557b447814b"
    };

    (prisma.navigationGroup.create as jest.Mock).mockResolvedValue({ id: "1", ...data });

    const result = await repository.createGroup(data);
    expect(result.code).toBe("TEST");
    expect(prisma.navigationGroup.create).toHaveBeenCalled();
  });
});

describe("NavigationService", () => {
  let service: NavigationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NavigationService();
  });

  it("should detect cycle references in parent nesting", async () => {
    const items = [
      { id: "A", title: "Item A", parentId: "B", menuType: "ROUTE" },
      { id: "B", title: "Item B", parentId: "A", menuType: "ROUTE" }
    ];

    (prisma.navigationItem.findMany as jest.Mock).mockResolvedValue(items);
    (prisma.navigationGroup.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.platformModule.findMany as jest.Mock).mockResolvedValue([]);

    const result = await service.validateNavigation();
    expect(result.isValid).toBe(false);
    expect(result.anomalies.some(a => a.type === "CIRCULAR_PARENT")).toBe(true);
  });

  it("should check duplicate route mapping errors", async () => {
    const items = [
      { id: "A", title: "Item A", parentId: null, route: "/shared", menuType: "ROUTE" },
      { id: "B", title: "Item B", parentId: null, route: "/shared", menuType: "ROUTE" }
    ];

    (prisma.navigationItem.findMany as jest.Mock).mockResolvedValue(items);
    (prisma.navigationGroup.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.platformModule.findMany as jest.Mock).mockResolvedValue([]);

    const result = await service.validateNavigation();
    expect(result.anomalies.some(a => a.type === "DUPLICATE_ROUTE")).toBe(true);
  });
});
