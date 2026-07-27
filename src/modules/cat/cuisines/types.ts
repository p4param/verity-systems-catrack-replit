export interface CatCuisine {
  id: string;
  cuisineNumber: string;
  name: string;
  code: string;
  isActive: boolean;
  showInDiscoveryQuickSelect: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CuisineLookupItem {
  id: string;
  name: string;
  code: string;
  showInDiscoveryQuickSelect: boolean;
  displayOrder: number;
}
