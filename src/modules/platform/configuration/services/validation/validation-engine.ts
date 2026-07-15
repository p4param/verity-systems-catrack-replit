import { PrismaClient, ConfigurationEntity } from "@/generated/client";
import { EntityValidator, ValidationResult, ValidationMessage } from "./types";
import { MetadataValidator } from "./validators/metadata-validator";
// Future validators like SchemaValidator, ViewValidator, etc. can be imported here

export class ValidationEngine {
  private validators: EntityValidator[] = [];

  constructor() {
    // Register validators in sequence
    // This allows the platform to progressively add validators as new capabilities are introduced
    this.registerValidator(new MetadataValidator());
    
    // Future placeholders
    // this.registerValidator(new SchemaValidator());
    // this.registerValidator(new ViewValidator());
    // this.registerValidator(new RuntimeValidator());
    // this.registerValidator(new DataValidator());
  }

  private registerValidator(validator: EntityValidator) {
    this.validators.push(validator);
  }

  /**
   * Run all registered validators against an entity
   */
  async validateEntityForPublish(
    entity: ConfigurationEntity, 
    prisma: PrismaClient | any
  ): Promise<ValidationResult> {
    const allMessages: ValidationMessage[] = [];
    let isValid = true;

    for (const validator of this.validators) {
      try {
        const messages = await validator.validate(entity, prisma);
        allMessages.push(...messages);
        
        // If any error is found, the entity cannot be published
        if (messages.some(m => m.level === "ERROR")) {
          isValid = false;
        }
      } catch (error: any) {
        // Fallback for unexpected validator crashes
        allMessages.push({
          level: "ERROR",
          code: "VALIDATOR_CRASH",
          message: `Validator '${validator.name}' crashed: ${error.message}`
        });
        isValid = false;
      }
    }

    return {
      isValid,
      messages: allMessages
    };
  }
}

