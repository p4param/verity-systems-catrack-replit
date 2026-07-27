export interface CatServiceStyle {
  id: string;
  styleNumber: string;
  name: string;
  code: string;
  isActive: boolean;
  showInDiscoveryQuickSelect: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceStyleLookupItem {
  id: string;
  name: string;
  code: string;
  showInDiscoveryQuickSelect: boolean;
  displayOrder: number;
}
