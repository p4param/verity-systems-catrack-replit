import { EntityValidationService } from "../services/entity-validation-service";
import { EntityRepository } from "../repositories/entity-repository";
import { prisma } from "@/lib/prisma";

jest.mock("../repositories/entity-repository");
jest.mock("@/lib/prisma", () => ({
  prisma: {
    entityRecord: { count: jest.fn() },
    entityFieldDefinition: { count: jest.fn() }
  }
}));

describe("EntityValidationService", () => {
  let service: EntityValidationService;
  let mockRepository: jest.Mocked<EntityRepository>;

  beforeEach(() => {
    mockRepository = new EntityRepository() as jest.Mocked<EntityRepository>;
    service = new EntityValidationService();
    (service as any).repository = mockRepository;
    jest.clearAllMocks();
  });

  describe("validateForCreate", () => {
    it("should throw error for reserved keywords", async () => {
      await expect(service.validateForCreate({ code: "system", name: "Sys", moduleId: "1" }))
        .rejects.toThrow(/reserved keyword/);
    });

    it("should throw error for invalid alphanumeric code", async () => {
      await expect(service.validateForCreate({ code: "INVALID CODE", name: "Invalid", moduleId: "1" }))
        .rejects.toThrow(/alphanumeric/);
    });

    it("should throw error if code already exists", async () => {
      mockRepository.exists.mockResolvedValue(true);
      await expect(service.validateForCreate({ code: "VALID_CODE", name: "Valid", moduleId: "1" }))
        .rejects.toThrow(/already exists/);
    });

    it("should pass for valid new entity", async () => {
      mockRepository.exists.mockResolvedValue(false);
      mockRepository.getByNameInModule.mockResolvedValue(null);
      await expect(service.validateForCreate({ code: "VALID_CODE", name: "Valid", moduleId: "1" }))
        .resolves.not.toThrow();
    });
  });

  describe("validateForDelete", () => {
    it("should throw error if entity is system", async () => {
      mockRepository.getById.mockResolvedValue({ id: "1", isSystem: true, status: "DRAFT" } as any);
      await expect(service.validateForDelete("1")).rejects.toThrow(/System entities cannot be deleted/);
    });

    it("should throw error if entity is published", async () => {
      mockRepository.getById.mockResolvedValue({ id: "1", isSystem: false, status: "PUBLISHED" } as any);
      await expect(service.validateForDelete("1")).rejects.toThrow(/Published entities cannot be deleted/);
    });

    it("should throw error if there are associated records", async () => {
      mockRepository.getById.mockResolvedValue({ id: "1", isSystem: false, status: "DRAFT" } as any);
      (prisma.entityRecord.count as jest.Mock).mockResolvedValue(5);
      await expect(service.validateForDelete("1")).rejects.toThrow(/5 runtime records/);
    });

    it("should pass for a valid draft entity with no dependencies", async () => {
      mockRepository.getById.mockResolvedValue({ id: "1", isSystem: false, status: "DRAFT" } as any);
      (prisma.entityRecord.count as jest.Mock).mockResolvedValue(0);
      (prisma.entityFieldDefinition.count as jest.Mock).mockResolvedValue(0);
      
      await expect(service.validateForDelete("1")).resolves.not.toThrow();
    });
  });
});
