import { PrismaClient, ConfigurationEntity } from "@/generated/client";
import { EntityValidator, ValidationMessage } from "../types";

export class MetadataValidator implements EntityValidator {
  name = "MetadataValidator";
  description = "Validates the core metadata attributes required for Business Entity registration (VS03).";

  async validate(entity: ConfigurationEntity, prisma: PrismaClient | any): Promise<ValidationMessage[]> {
    const messages: ValidationMessage[] = [];

    // --- REQUIRED ERRORS (Block Publish) ---
    if (!entity.code || entity.code.trim() === "") {
      messages.push({
        level: "ERROR",
        code: "MISSING_CODE",
        field: "code",
        message: "Entity Code is required to publish.",
      });
    }

    if (!entity.name || entity.name.trim() === "") {
      messages.push({
        level: "ERROR",
        code: "MISSING_NAME",
        field: "name",
        message: "Entity Name is required to publish.",
      });
    }

    if (!entity.pluralName || entity.pluralName.trim() === "") {
      messages.push({
        level: "ERROR",
        code: "MISSING_PLURAL_NAME",
        field: "pluralName",
        message: "Entity Plural Name is required to publish.",
      });
    }

    // --- PROGRESSIVE WARNINGS (Do not block publish, but indicate missing capabilities) ---
    
    // Check if fields exist (VS04 foreshadowing)
    const fieldsCount = await prisma.entityFieldDefinition.count({
      where: { entityId: entity.id }
    });
    if (fieldsCount === 0) {
      messages.push({
        level: "WARNING",
        code: "MISSING_FIELDS",
        message: "No fields defined. Entity will publish without data schema capabilities."
      });
    }

    // Check if views exist (VS05 foreshadowing)
    const viewsCount = await prisma.entityView.count({
      where: { entityId: entity.id }
    });
    if (viewsCount === 0) {
      messages.push({
        level: "WARNING",
        code: "MISSING_VIEWS",
        message: "No views defined. Entity will use fallback layout for lists and details."
      });
    }

    // --- INFORMATION (Best Practice guidance) ---
    if (!entity.description || entity.description.trim() === "") {
      messages.push({
        level: "INFO",
        code: "MISSING_DESCRIPTION",
        field: "description",
        message: "Adding a description helps other developers understand this entity's purpose."
      });
    }
    
    if (entity.showInNavigation && !entity.icon) {
      messages.push({
        level: "INFO",
        code: "MISSING_ICON",
        field: "icon",
        message: "Adding an icon is recommended when Show In Navigation is enabled."
      });
    }

    return messages;
  }
}

