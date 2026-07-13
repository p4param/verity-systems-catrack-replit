import { z } from "zod";
import { MetadataRegistry } from "../registry/metadata-registry";

const validDataTypes = MetadataRegistry.DataTypes.map((t) => t.id) as [string, ...string[]];
const validUIControls = MetadataRegistry.UIControls.map((c) => c.id) as [string, ...string[]];
const validDataSources = MetadataRegistry.DataSources.map((s) => s.id) as [string, ...string[]];
const validValidationProfiles = MetadataRegistry.ValidationProfiles.map((p) => p.id) as [string, ...string[]];
const validFormatters = MetadataRegistry.Formatters.map((f) => f.id) as [string, ...string[]];
const validBehaviors = MetadataRegistry.Behaviors.map((b) => b.id) as [string, ...string[]];

export const lookupDefinitionSchema = z.object({
  referencedEntityId: z.string().uuid(),
  displayFieldId: z.string().uuid().optional().nullable(),
  valueFieldId: z.string().uuid().optional().nullable(),
  searchFieldIds: z.array(z.string().uuid()).optional().nullable(),
  filterConditions: z.any().optional().nullable(),
  sortConditions: z.any().optional().nullable()
});

import { FieldControlRegistry } from "../registry/field-control-registry";

const baseCreateFieldSchema = z.object({
  code: z.string().min(2).max(50).regex(/^[A-Z][A-Z0-9_]*$/),
  label: z.string().min(2).max(100),
  dataType: z.enum(validDataTypes),
  uiControl: z.enum(validUIControls),
  dataSource: z.enum(validDataSources),
  
  // Optional detailed configurations
  lookupDefinition: lookupDefinitionSchema.optional().nullable(),

  // Base flags
  required: z.boolean().default(false),
  unique: z.boolean().default(false),
  searchable: z.boolean().default(false),
  sortable: z.boolean().default(false),
  filterable: z.boolean().default(false),
  
  defaultValue: z.any().optional(),
  
  // Strongly typed extended metadata
  validationProfile: z.enum(validValidationProfiles).optional(),
  formatter: z.enum(validFormatters).optional(),
  behavior: z.enum(validBehaviors).optional(),
  
  displayOrder: z.number().int().optional(),
  metadata: z.object({
    internalName: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
    
    // Validation
    minLength: z.number().int().optional().nullable(),
    maxLength: z.number().int().optional().nullable(),
    regex: z.string().optional().nullable(),
    validationMessage: z.string().optional().nullable(),
    validationProfile: z.enum(validValidationProfiles as any).optional().nullable(),
    validationTrigger: z.enum(["ON_CHANGE", "ON_SAVE", "BOTH"]).optional().nullable(),
    
    // Behavior
    isReadonly: z.boolean().optional().nullable(),
    isHidden: z.boolean().optional().nullable(),
    isDisabled: z.boolean().optional().nullable(),
    isCalculated: z.boolean().optional().nullable(),
    isSystemManaged: z.boolean().optional().nullable(),
    isCopyable: z.boolean().optional().nullable(),
    isExportable: z.boolean().optional().nullable(),
    isPrintable: z.boolean().optional().nullable(),
    behavior: z.enum(validBehaviors as any).optional().nullable(),
    
    // Appearance
    placeholder: z.string().optional().nullable(),
    helpText: z.string().optional().nullable(),
    tooltip: z.string().optional().nullable(),
    prefix: z.string().optional().nullable(),
    suffix: z.string().optional().nullable(),
    formatter: z.enum(validFormatters as any).optional().nullable(),
    width: z.number().optional().nullable(),
    widthUnit: z.string().optional().nullable(),
    alignment: z.enum(["LEFT", "CENTER", "RIGHT"]).optional().nullable(),
    cssClass: z.string().optional().nullable(),
    icon: z.string().optional().nullable(),
  }).passthrough().optional(),
  options: z.array(z.object({
    code: z.string(),
    label: z.string(),
    displayOrder: z.number().int().default(0),
    color: z.string().optional().nullable(),
    icon: z.string().optional().nullable(),
    isDefault: z.boolean().default(false)
  })).optional(),
});

export const createFieldDtoSchema = baseCreateFieldSchema.superRefine((data, ctx) => {
  const control = FieldControlRegistry.getControl(data.uiControl);
  if (!control) return;

  const capabilities = control.runtime.capabilities;
  
  if (!capabilities.supportedDataTypes.includes(data.dataType)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["uiControl"],
      message: `Control ${data.uiControl} does not support data type ${data.dataType}`,
    });
  }

  if (!capabilities.supportedDataSources.includes(data.dataSource)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["uiControl"],
      message: `Control ${data.uiControl} does not support data source ${data.dataSource}`,
    });
  }
});

export const updateFieldDtoSchema = baseCreateFieldSchema.partial().extend({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
}).superRefine((data, ctx) => {
  if (data.uiControl && data.dataType && data.dataSource) {
    const control = FieldControlRegistry.getControl(data.uiControl);
    if (!control) return;

    const capabilities = control.runtime.capabilities;
    
    if (!capabilities.supportedDataTypes.includes(data.dataType)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["uiControl"],
        message: `Control ${data.uiControl} does not support data type ${data.dataType}`,
      });
    }

    if (!capabilities.supportedDataSources.includes(data.dataSource)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["uiControl"],
        message: `Control ${data.uiControl} does not support data source ${data.dataSource}`,
      });
    }
  }
});

export type CreateFieldDto = z.infer<typeof createFieldDtoSchema>;
export type UpdateFieldDto = z.infer<typeof updateFieldDtoSchema>;
export type FieldLookupDefinitionDto = z.infer<typeof lookupDefinitionSchema>;
