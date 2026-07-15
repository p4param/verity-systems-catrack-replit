import { PrismaClient, ConfigurationEntity } from "@/generated/client";

export type ValidationLevel = "ERROR" | "WARNING" | "INFO";

export interface ValidationMessage {
  level: ValidationLevel;
  code: string;
  message: string;
  field?: string;
}

export interface ValidationResult {
  isValid: boolean; // false if there are any ERRORs
  messages: ValidationMessage[];
}

export interface EntityValidator {
  name: string;
  description: string;
  validate(entity: ConfigurationEntity, prisma: PrismaClient | any): Promise<ValidationMessage[]>;
}

