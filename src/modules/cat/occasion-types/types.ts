export interface CatOccasionType {
  id: string;
  occasionNumber: string;
  name: string;
  code: string;
  isActive: boolean;
  showInDiscoveryQuickSelect: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface OccasionTypeLookupItem {
  id: string;
  name: string;
  code: string;
  showInDiscoveryQuickSelect: boolean;
  displayOrder: number;
}
