// EM-WP06 — Recipe Management.
// Extends the Menu Catalog Item Workspace (EM-WP05, single Overview tab)
// with a Recipes tab. Same pattern as event-workspace-types.ts.

export type MenuCatalogWorkspaceKey = 'OVERVIEW' | 'RECIPES';

export interface MenuCatalogWorkspaceNavItem {
  key: MenuCatalogWorkspaceKey;
  label: string;
  description: string;
}

export const MENU_CATALOG_WORKSPACE_NAV_ITEMS: MenuCatalogWorkspaceNavItem[] = [
  { key: 'OVERVIEW', label: 'Overview', description: 'Identity, Classification, Dietary, Service, Description, Image, and Status.' },
  { key: 'RECIPES', label: 'Recipes', description: 'Recipe Variants: Summary, Yield, Ingredients, Preparation Steps, Equipment & Quality.' },
];
