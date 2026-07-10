import { z } from "zod";
import { FIELD_CATALOG } from "../constants/field-catalog";

const validFieldTypes = FIELD_CATALOG.map((f) => f.type) as [string, ...string[]];

export const fieldSchema = z.object({
  entityId: z.string().uuid(),
  code: z.string().min(2, "Code must be at least 2 characters").max(50).regex(/^[A-Z][A-Z0-9_]*$/, "Code must be uppercase and only contain letters, numbers, and underscores (e.g. CUSTOMER_NAME)"),
  label: z.string().min(2, "Label must be at least 2 characters").max(100),
  dataType: z.string(),
  uiControl: z.string(),
  required: z.boolean().default(false),
  unique: z.boolean().default(false),
  indexed: z.boolean().default(false),
  searchable: z.boolean().default(false),
  sortable: z.boolean().default(false),
  filterable: z.boolean().default(false),
  defaultValue: z.any().optional(),
  validation: z.any().optional(),
  dataSource: z.enum(["STATIC", "LOOKUP", "FORMULA", "API", "AI"]).default("STATIC"),
  lookupEntity: z.string().uuid().optional().nullable(),
  displayOrder: z.number().int().default(0),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  metadata: z.any().optional(),
});

// Used for incoming HTTP requests where dataType and uiControl will be derived from the selected catalog type
export const createFieldDtoSchema = z.object({
  code: z.string().min(2).max(50).regex(/^[A-Z][A-Z0-9_]*$/),
  label: z.string().min(2).max(100),
  catalogType: z.enum(validFieldTypes),
  required: z.boolean().default(false),
  unique: z.boolean().default(false),
  searchable: z.boolean().default(false),
  sortable: z.boolean().default(false),
  filterable: z.boolean().default(false),
  defaultValue: z.any().optional(),
  validation: z.any().optional(),
  dataSource: z.enum(["STATIC", "LOOKUP", "FORMULA", "API", "AI"]).optional(),
  lookupEntity: z.string().uuid().optional().nullable(),
  displayOrder: z.number().int().optional(),
  metadata: z.any().optional(),
  options: z.array(z.object({
    code: z.string(),
    label: z.string(),
    displayOrder: z.number().int().default(0),
    color: z.string().optional().nullable(),
    icon: z.string().optional().nullable(),
    isDefault: z.boolean().default(false)
  })).optional(),
});

export const updateFieldDtoSchema = createFieldDtoSchema.partial().extend({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

export type CreateFieldDto = z.infer<typeof createFieldDtoSchema>;
export type UpdateFieldDto = z.infer<typeof updateFieldDtoSchema>;
