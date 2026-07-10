import { EntityRepository } from "../repositories/entity-repository";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    configurationEntity: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    }
  }
}));

describe("EntityRepository", () => {
  let repository: EntityRepository;

  beforeEach(() => {
    repository = new EntityRepository();
    jest.clearAllMocks();
  });

  describe("getAll", () => {
    it("should retrieve all entities ordered by menuOrder and name", async () => {
      const mockEntities = [{ id: "1", name: "Entity1" }, { id: "2", name: "Entity2" }];
      (prisma.configurationEntity.findMany as jest.Mock).mockResolvedValue(mockEntities);

      const result = await repository.getAll();

      expect(prisma.configurationEntity.findMany).toHaveBeenCalledWith({
        include: { module: true },
        orderBy: [{ menuOrder: "asc" }, { name: "asc" }],
      });
      expect(result).toEqual(mockEntities);
    });
  });

  describe("create", () => {
    it("should create an entity with correct defaults", async () => {
      const dto = {
        moduleId: "mod-1",
        code: "TEST",
        name: "Test",
        pluralName: "Tests",
        createdBy: "user-1",
      };
      const expectedRecord = { id: "new-id", ...dto, allowCRUD: true, status: "DRAFT" };
      (prisma.configurationEntity.create as jest.Mock).mockResolvedValue(expectedRecord);

      const result = await repository.create(dto);

      expect(prisma.configurationEntity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code: "TEST",
            allowCRUD: true,
            status: "DRAFT",
            isSystem: false,
          }),
        })
      );
      expect(result).toEqual(expectedRecord);
    });
  });

  describe("updateStatus", () => {
    it("should update only the status and updatedBy fields", async () => {
      (prisma.configurationEntity.update as jest.Mock).mockResolvedValue({ id: "1", status: "ARCHIVED" });
      
      await repository.updateStatus("1", "ARCHIVED", "user-2");
      
      expect(prisma.configurationEntity.update).toHaveBeenCalledWith({
        where: { id: "1" },
        data: { status: "ARCHIVED", updatedBy: "user-2" },
      });
    });
  });

  describe("exists", () => {
    it("should return true if count > 0", async () => {
      (prisma.configurationEntity.count as jest.Mock).mockResolvedValue(1);
      const result = await repository.exists("EXISTING_CODE");
      expect(result).toBe(true);
    });

    it("should return false if count === 0", async () => {
      (prisma.configurationEntity.count as jest.Mock).mockResolvedValue(0);
      const result = await repository.exists("NEW_CODE");
      expect(result).toBe(false);
    });
  });
});
