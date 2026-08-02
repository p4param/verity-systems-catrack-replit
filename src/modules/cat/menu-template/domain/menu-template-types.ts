// EM-WP04 — Menu Templates.
// Menu Templates are first-class business entities: their own Directory,
// their own Workspace, editable independently after creation. Persistence
// is completely separate from Events (see the cat_menu_template_* tables)
// — a Template is never FK'd to the Event it may have been created from.

export interface MenuTemplateSummary {
  id: string;
  templateName: string;
  description?: string;
  totalMeals: number;
  totalCategories: number;
  totalItems: number;
  dietaryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MenuTemplateHeader {
  id: string;
  templateName: string;
  description?: string;
}
