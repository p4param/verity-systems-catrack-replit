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

export const createViewDtoSchema = z.object({
  code: z.string().min(2, "Code must be at least 2 characters").max(50, "Code is too long"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  viewType: ViewTypeEnum,
  isDefault: z.boolean().optional(),
  columns: z.any().optional(),
  filters: z.any().optional(),
  sorting: z.any().optional(),
  metadata: z.any().optional(),
  status: z.string().optional()
});

export const updateViewDtoSchema = createViewDtoSchema.partial();

export type CreateViewDto = z.infer<typeof createViewDtoSchema>;
export type UpdateViewDto = z.infer<typeof updateViewDtoSchema>;
