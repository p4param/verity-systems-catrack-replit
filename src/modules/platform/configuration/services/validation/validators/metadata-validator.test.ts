import { MetadataValidator } from "./metadata-validator";
import { ConfigurationEntity } from "@/generated/client";

describe("MetadataValidator", () => {
  let validator: MetadataValidator;
  let mockPrisma: any;

  beforeEach(() => {
    validator = new MetadataValidator();
    mockPrisma = {
      entityFieldDefinition: {
        count: jest.fn().mockResolvedValue(1),
      },
      entityView: {
        count: jest.fn().mockResolvedValue(1),
      },
    };
  });

  const getValidEntity = (): ConfigurationEntity => ({
    id: "uuid",
    moduleId: "uuid",
    code: "TEST_ENTITY",
    name: "Test Entity",
    pluralName: "Test Entities",
    description: "A test description",
    status: "DRAFT",
    version: 1,
    isActive: true,
    isSystem: false,
    isCustom: true,
    metadataLocked: false,
    showInNavigation: true,
    menuGroup: null,
    menuOrder: 1,
    icon: "box",
    route: null,
    apiEnabled: true,
    apiName: "testEntities",
    metadata: {},
    allowCRUD: true,
    allowImport: false,
    allowExport: false,
    allowWorkflow: false,
    allowAttachments: false,
    allowAudit: false,
    allowComments: false,
    allowTags: false,
    allowHierarchy: false,
    allowSoftDelete: false,
    createdBy: "uuid",
    updatedBy: "uuid",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  it("should return no errors for a fully valid entity", async () => {
    const entity = getValidEntity();
    const result = await validator.validate(entity, mockPrisma);
    expect(result).toEqual([]);
  });

  it("should return ERROR if code is missing", async () => {
    const entity = getValidEntity();
    entity.code = "";
    const result = await validator.validate(entity, mockPrisma);
    expect(result).toContainEqual(expect.objectContaining({ level: "ERROR", code: "MISSING_CODE" }));
  });

  it("should return ERROR if name is missing", async () => {
    const entity = getValidEntity();
    entity.name = "";
    const result = await validator.validate(entity, mockPrisma);
    expect(result).toContainEqual(expect.objectContaining({ level: "ERROR", code: "MISSING_NAME" }));
  });

  it("should return WARNING if fields are missing", async () => {
    const entity = getValidEntity();
    mockPrisma.entityFieldDefinition.count.mockResolvedValue(0);
    const result = await validator.validate(entity, mockPrisma);
    expect(result).toContainEqual(expect.objectContaining({ level: "WARNING", code: "MISSING_FIELDS" }));
  });

  it("should return WARNING if views are missing", async () => {
    const entity = getValidEntity();
    mockPrisma.entityView.count.mockResolvedValue(0);
    const result = await validator.validate(entity, mockPrisma);
    expect(result).toContainEqual(expect.objectContaining({ level: "WARNING", code: "MISSING_VIEWS" }));
  });

  it("should return INFO if description is missing", async () => {
    const entity = getValidEntity();
    entity.description = "";
    const result = await validator.validate(entity, mockPrisma);
    expect(result).toContainEqual(expect.objectContaining({ level: "INFO", code: "MISSING_DESCRIPTION" }));
  });
});

