import { z } from "zod";

export const platformModuleSchema = z.object({
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(20, "Code must not exceed 20 characters")
    .regex(/^[A-Z0-9_]+$/, "Code must be uppercase alphanumeric and underscores only"),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters"),
  description: z.string().max(500, "Description must not exceed 500 characters").optional().nullable(),
  icon: z.string().max(50, "Icon name must not exceed 50 characters").optional().nullable(),
  sortOrder: z.coerce.number().int().nonnegative("Sort order must be a non-negative integer").default(0),
  isActive: z.boolean().default(true),
  isSystem: z.boolean().default(false),
  navigationGroup: z.string().max(100, "Navigation Group name must not exceed 100 characters").optional().nullable(),
  route: z.string().max(150, "Route must not exceed 150 characters").optional().nullable(),
  menuVisible: z.boolean().default(true),
  isLicensed: z.boolean().default(true),
  requiresLicense: z.boolean().default(false),
  showOnDashboard: z.boolean().default(true),
  showInSearch: z.boolean().default(true),
  showInMobile: z.boolean().default(false),
  color: z.string().optional().nullable(),
  displayOrder: z.coerce.number().int().default(0),
  featureFlag: z.string().optional().nullable(),
  defaultPage: z.string().optional().nullable(),
  moduleDependencies: z.any().optional(),
  metadata: z
    .any()
    .optional()
    .refine((val) => {
      if (!val) return true;
      try {
        if (typeof val === "string") {
          JSON.parse(val);
        }
        return true;
      } catch {
        return false;
      }
    }, "Metadata must be a valid JSON object or string"),
});

export type PlatformModuleInput = z.infer<typeof platformModuleSchema>;
