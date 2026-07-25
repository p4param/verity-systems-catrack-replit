/**
 * BWP-001 Relationship Foundation — Navigation Metadata Registry
 * Registers Catrack Relationship feature into the VAP Application Shell navigation.
 */
import { CAT_RELATIONSHIP_PERMISSIONS } from '../domain/RelationshipPermissions';

export interface NavigationMetadataItem {
  code: string;
  title: string;
  path: string;
  icon: string;
  requiredPermission: string;
  order: number;
  badge?: string;
}

export interface NavigationMetadataGroup {
  code: string;
  name: string;
  icon: string;
  order: number;
  items: NavigationMetadataItem[];
}

export const CATRACK_NAVIGATION_METADATA: NavigationMetadataGroup = {
  code: 'CAT_OPERATIONS',
  name: 'Catering Operations',
  icon: 'Utensils',
  order: 10,
  items: [
    {
      code: 'CAT_RELATIONSHIPS',
      title: 'Relationships',
      path: '/cat/relationships',
      icon: 'Users',
      requiredPermission: CAT_RELATIONSHIP_PERMISSIONS.VIEW,
      order: 1,
      badge: 'BWP-001',
    },
  ],
};
