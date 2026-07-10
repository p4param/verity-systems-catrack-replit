import { z } from "zod";

export const entitySchema = z.object({
  moduleId: z.string().uuid("Module ID must be a valid UUID"),
  code: z.string()
    .min(2, "Code must be at least 2 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Code must be alphanumeric and contain no spaces"),
  name: z.string().min(2, "Name is required"),
  pluralName: z.string().min(2, "Plural name is required"),
  description: z.string().optional().nullable(),
  
  allowCRUD: z.boolean().optional(),
  allowImport: z.boolean().optional(),
  allowExport: z.boolean().optional(),
  allowWorkflow: z.boolean().optional(),
  allowAttachments: z.boolean().optional(),
  allowAudit: z.boolean().optional(),
  allowComments: z.boolean().optional(),
  allowTags: z.boolean().optional(),
  allowHierarchy: z.boolean().optional(),
  allowSoftDelete: z.boolean().optional(),

  status: z.enum(["DRAFT", "VALIDATED", "PUBLISHED", "INACTIVE", "ARCHIVED"]).optional(),
  isActive: z.boolean().optional(),
  isSystem: z.boolean().optional(),
  isCustom: z.boolean().optional(),
  metadataLocked: z.boolean().optional(),

  showInNavigation: z.boolean().optional(),
  menuGroup: z.string().optional().nullable(),
  menuOrder: z.coerce.number().optional(),
  icon: z.string().optional().nullable(),
  route: z.string().optional().nullable(),

  apiEnabled: z.boolean().optional(),
  apiName: z.string().optional().nullable(),
});
