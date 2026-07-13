import { z } from "zod";

export const ViewTypeEnum = z.enum([
  "GRID",
  "FORM",
  "CARD",
  "KANBAN",
  "CALENDAR",
  "TIMELINE",
  "TREE",
  "DASHBOARD",
  "DETAIL",
  "QUICK_CREATE"
]);

export const ViewScopeEnum = z.enum(["SYSTEM", "PUBLIC", "PRIVATE"]);
export const FilterOperatorEnum = z.enum(["equals", "notEquals", "contains", "notContains", "startsWith", "endsWith", "greaterThan", "lessThan", "greaterThanOrEqual", "lessThanOrEqual", "in", "notIn", "isEmpty", "isNotEmpty"]);

export const ViewColumnSchema = z.object({
  field: z.string().min(1, "Field code is required"),
  header: z.string().optional(),
  visible: z.boolean().default(true),
  width: z.number().optional(),
  pinned: z.enum(["left", "right", "none"]).default("none"),
  sortable: z.boolean().default(true),
  filterable: z.boolean().default(true),
  searchable: z.boolean().default(true),
  displayOrder: z.number().int().min(0),
  formatter: z.string().optional(),
});

export const ViewSortSchema = z.object({
  field: z.string().min(1, "Field code is required"),
  direction: z.enum(["ASC", "DESC"]),
  sequence: z.number().int().min(1),
});

export const ViewGroupSchema = z.object({
  field: z.string().min(1, "Field code is required"),
  direction: z.enum(["ASC", "DESC"]).default("ASC"),
  displayOrder: z.number().int().min(0),
});

export const ViewFilterConditionSchema = z.object({
  field: z.string().min(1, "Field code is required"),
  operator: FilterOperatorEnum,
  value: z.union([z.string(), z.number(), z.boolean(), z.date(), z.array(z.string()), z.array(z.number())]).nullable(),
});

export type ViewFilterCondition = z.infer<typeof ViewFilterConditionSchema>;

// Recursive types for nested groups
export type ViewFilterGroup = {
  logic: "AND" | "OR";
  conditions: Array<ViewFilterCondition | ViewFilterGroup>;
};

export const ViewFilterGroupSchema: z.ZodType<ViewFilterGroup> = z.lazy(() =>
  z.object({
    logic: z.enum(["AND", "OR"]),
    conditions: z.array(z.union([ViewFilterConditionSchema, ViewFilterGroupSchema])),
  })
);

export const ViewMetadataSchema = z.object({
  scope: ViewScopeEnum.default("PUBLIC"),
  columns: z.array(ViewColumnSchema).default([]),
  filters: ViewFilterGroupSchema.optional(),
  sorting: z.array(ViewSortSchema).default([]),
  grouping: z.array(ViewGroupSchema).default([]),
  defaultSearchFields: z.array(z.string()).default([]),
  conditionalFormatting: z.any().optional(), // Reserved
  aggregations: z.any().optional(), // Reserved
  rowActions: z.any().optional(), // Reserved
  toolbarActions: z.any().optional(), // Reserved
  summary: z.any().optional(), // Reserved
  export: z.any().optional(), // Reserved
});

export const createViewDtoSchema = z.object({
  code: z.string().min(2, "Code must be at least 2 characters").max(50, "Code is too long"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  viewType: ViewTypeEnum,
  isDefault: z.boolean().optional(),
  status: z.string().optional(),
  metadata: ViewMetadataSchema.optional(),
});

export const updateViewDtoSchema = createViewDtoSchema.partial();

export type CreateViewDto = z.infer<typeof createViewDtoSchema>;
export type UpdateViewDto = z.infer<typeof updateViewDtoSchema>;
export type ViewMetadata = z.infer<typeof ViewMetadataSchema>;
export type ViewColumn = z.infer<typeof ViewColumnSchema>;
export type ViewSort = z.infer<typeof ViewSortSchema>;
