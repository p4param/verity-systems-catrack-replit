import { z } from "zod";

// ---------------------------------------------------------------------------
// Common Base Contract
// Every layout node shares this base shape: id, code, name, description,
// displayOrder, visible, and an extensible metadata bag.
// ---------------------------------------------------------------------------

const LayoutNodeBaseSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  displayOrder: z.number().int().min(0).default(0),
  visible: z.boolean().default(true),
  metadata: z.record(z.string(), z.any()).optional().default({}),
});

export type LayoutNodeBase = z.infer<typeof LayoutNodeBaseSchema>;

// ---------------------------------------------------------------------------
// Responsive Span System
// Extensible breakpoint model (xs–xl) instead of hard-coded device categories.
// Each breakpoint defines the number of grid columns (out of 12) to span.
// ---------------------------------------------------------------------------

const ResponsiveSpanSchema = z.object({
  xs: z.number().int().min(1).max(12).default(12),
  sm: z.number().int().min(1).max(12).optional(),
  md: z.number().int().min(1).max(12).optional(),
  lg: z.number().int().min(1).max(12).optional(),
  xl: z.number().int().min(1).max(12).optional(),
});

export type ResponsiveSpan = z.infer<typeof ResponsiveSpanSchema>;

// ---------------------------------------------------------------------------
// Field Placement
// References fields by immutable fieldId (not fieldCode).
// Includes presentation overrides, appearance, and behavior expressions.
// ---------------------------------------------------------------------------

const LayoutFieldPlacementSchema = LayoutNodeBaseSchema.extend({
  fieldId: z.string().uuid(),
  span: ResponsiveSpanSchema.optional().default({ xs: 12, md: 6 }),

  // Presentation Overrides (override field-level defaults)
  labelPosition: z.enum(["TOP", "LEFT", "RIGHT", "HIDDEN"]).optional(),
  requiredOverride: z.boolean().optional().nullable(),
  readOnlyOverride: z.boolean().optional().nullable(),
  hiddenOverride: z.boolean().optional().nullable(),

  // Appearance
  placeholder: z.string().optional().nullable(),
  helpText: z.string().optional().nullable(),
  width: z.number().optional().nullable(),
  cssClass: z.string().optional().nullable(),

  // Behavior Expressions (metadata-only for this milestone)
  visibilityExpression: z.string().optional().nullable(),
  enableExpression: z.string().optional().nullable(),
  defaultValueExpression: z.string().optional().nullable(),
});

export type LayoutFieldPlacement = z.infer<typeof LayoutFieldPlacementSchema>;

// ---------------------------------------------------------------------------
// Column
// A column contains an array of field placements and defines its own
// responsive span within its parent row.
// ---------------------------------------------------------------------------

const LayoutColumnSchema = LayoutNodeBaseSchema.extend({
  span: ResponsiveSpanSchema.optional().default({ xs: 12, md: 6 }),
  placements: z.array(LayoutFieldPlacementSchema).default([]),
});

export type LayoutColumn = z.infer<typeof LayoutColumnSchema>;

// ---------------------------------------------------------------------------
// Row
// A row contains an array of columns. The grid system is 12-column based.
// ---------------------------------------------------------------------------

const LayoutRowSchema = LayoutNodeBaseSchema.extend({
  columns: z.array(LayoutColumnSchema).default([]),
});

export type LayoutRow = z.infer<typeof LayoutRowSchema>;

// ---------------------------------------------------------------------------
// Group
// A visual grouping of rows with an optional title and border.
// ---------------------------------------------------------------------------

const LayoutGroupSchema = LayoutNodeBaseSchema.extend({
  title: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  rows: z.array(LayoutRowSchema).default([]),
});

export type LayoutGroup = z.infer<typeof LayoutGroupSchema>;

// ---------------------------------------------------------------------------
// Section
// A collapsible card-like container with title, icon, and groups.
// ---------------------------------------------------------------------------

const LayoutSectionSchema = LayoutNodeBaseSchema.extend({
  title: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  collapsible: z.boolean().default(false),
  initiallyExpanded: z.boolean().default(true),
  groups: z.array(LayoutGroupSchema).default([]),
});

export type LayoutSection = z.infer<typeof LayoutSectionSchema>;

// ---------------------------------------------------------------------------
// Tab
// A top-level organizational unit containing sections.
// ---------------------------------------------------------------------------

const LayoutTabSchema = LayoutNodeBaseSchema.extend({
  title: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  sections: z.array(LayoutSectionSchema).default([]),
});

export type LayoutTab = z.infer<typeof LayoutTabSchema>;

// ---------------------------------------------------------------------------
// Layout Root
// The root node of the layout tree. Contains version, responsive defaults,
// and the array of tabs.
// ---------------------------------------------------------------------------

const LayoutRootSchema = z.object({
  layoutVersion: z.string().default("1.0"),
  responsiveColumns: z.object({
    xs: z.number().int().default(1),
    sm: z.number().int().default(1),
    md: z.number().int().default(2),
    lg: z.number().int().default(2),
    xl: z.number().int().default(3),
  }).optional().default({ xs: 1, sm: 1, md: 2, lg: 2, xl: 3 }),
  tabs: z.array(LayoutTabSchema).default([]),
});

export type LayoutRoot = z.infer<typeof LayoutRootSchema>;

// ---------------------------------------------------------------------------
// Layout Type Enum (Zod mirror of Prisma LayoutType)
// ---------------------------------------------------------------------------

export const LayoutTypeEnum = z.enum([
  "FORM",
  "DETAIL",
  "QUICK_CREATE",
  "WIZARD",
  "MOBILE",
  "PRINT",
]);

export type LayoutTypeValue = z.infer<typeof LayoutTypeEnum>;

// ---------------------------------------------------------------------------
// Create / Update DTOs
// ---------------------------------------------------------------------------

export const createLayoutDtoSchema = z.object({
  code: z.string().min(2, "Code must be at least 2 characters").max(50, "Code is too long")
    .regex(/^[A-Z][A-Z0-9_]*$/, "Code must start with a letter and contain only uppercase letters, digits, and underscores"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  description: z.string().optional().nullable(),
  layoutType: LayoutTypeEnum,
  isDefault: z.boolean().optional().default(false),
  layout: LayoutRootSchema.optional().default({
    layoutVersion: "1.0",
    responsiveColumns: { xs: 1, sm: 1, md: 2, lg: 2, xl: 3 },
    tabs: [],
  }),
});

export const updateLayoutDtoSchema = createLayoutDtoSchema.partial().extend({
  layout: LayoutRootSchema.optional(),
});

export type CreateLayoutDto = z.infer<typeof createLayoutDtoSchema>;
export type UpdateLayoutDto = z.infer<typeof updateLayoutDtoSchema>;

// ---------------------------------------------------------------------------
// Publish-time Validation
// Validates that the layout is structurally complete before being published.
// ---------------------------------------------------------------------------

export function validateLayoutForPublish(
  layout: LayoutRoot,
  validFieldIds: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const fieldIdSet = new Set(validFieldIds);
  const usedFieldIds = new Set<string>();

  if (!layout.tabs || layout.tabs.length === 0) {
    errors.push("Layout must contain at least one tab.");
  }

  for (const tab of layout.tabs || []) {
    if (!tab.id) errors.push(`Tab "${tab.name}" is missing an ID.`);
    for (const section of tab.sections || []) {
      if (!section.id) errors.push(`Section "${section.name}" in tab "${tab.name}" is missing an ID.`);
      for (const group of section.groups || []) {
        for (const row of group.rows || []) {
          for (const col of row.columns || []) {
            for (const placement of col.placements || []) {
              if (!placement.fieldId) {
                errors.push(`Field placement "${placement.name}" in tab "${tab.name}" is missing a fieldId.`);
              } else if (!fieldIdSet.has(placement.fieldId)) {
                errors.push(`Field placement "${placement.name}" references unknown field ID: ${placement.fieldId}`);
              }
              if (usedFieldIds.has(placement.fieldId)) {
                // Duplicate is a warning, not a hard error — some layouts may repeat fields
              }
              usedFieldIds.add(placement.fieldId);
            }
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// Re-export individual schemas for external consumption
export {
  LayoutNodeBaseSchema,
  ResponsiveSpanSchema,
  LayoutFieldPlacementSchema,
  LayoutColumnSchema,
  LayoutRowSchema,
  LayoutGroupSchema,
  LayoutSectionSchema,
  LayoutTabSchema,
  LayoutRootSchema,
};
