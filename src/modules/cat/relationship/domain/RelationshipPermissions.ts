/**
 * BWP-001 Relationship Foundation — Permission Registry & Authorization Definitions
 * Governed by APP-001 and VAP Core Security Standards
 */

export const CAT_RELATIONSHIP_PERMISSIONS = {
  VIEW: 'cat.relationship.view',
  CREATE: 'cat.relationship.create',
  EDIT: 'cat.relationship.edit',
  DELETE: 'cat.relationship.delete',
  CONVERT: 'cat.relationship.convert',
} as const;

export type CatRelationshipPermission = typeof CAT_RELATIONSHIP_PERMISSIONS[keyof typeof CAT_RELATIONSHIP_PERMISSIONS];

export interface RolePermissionMapping {
  roleCode: string;
  roleName: string;
  permissions: CatRelationshipPermission[];
}

/**
 * Default Role Permission Associations
 */
export const DEFAULT_ROLE_PERMISSIONS: RolePermissionMapping[] = [
  {
    roleCode: 'ADMIN',
    roleName: 'System Administrator',
    permissions: [
      CAT_RELATIONSHIP_PERMISSIONS.VIEW,
      CAT_RELATIONSHIP_PERMISSIONS.CREATE,
      CAT_RELATIONSHIP_PERMISSIONS.EDIT,
      CAT_RELATIONSHIP_PERMISSIONS.DELETE,
      CAT_RELATIONSHIP_PERMISSIONS.CONVERT,
    ],
  },
  {
    roleCode: 'SALES_MANAGER',
    roleName: 'Sales & Relationship Manager',
    permissions: [
      CAT_RELATIONSHIP_PERMISSIONS.VIEW,
      CAT_RELATIONSHIP_PERMISSIONS.CREATE,
      CAT_RELATIONSHIP_PERMISSIONS.EDIT,
      CAT_RELATIONSHIP_PERMISSIONS.CONVERT,
    ],
  },
  {
    roleCode: 'EVENT_PLANNER',
    roleName: 'Event Planner / Coordinator',
    permissions: [
      CAT_RELATIONSHIP_PERMISSIONS.VIEW,
      CAT_RELATIONSHIP_PERMISSIONS.CREATE,
      CAT_RELATIONSHIP_PERMISSIONS.EDIT,
    ],
  },
  {
    roleCode: 'OPERATIONS_VIEWER',
    roleName: 'Operations Viewer',
    permissions: [
      CAT_RELATIONSHIP_PERMISSIONS.VIEW,
    ],
  },
];

/**
 * Authorization Helper
 */
export function isAuthorized(userPermissions: string[], requiredPermission: CatRelationshipPermission): boolean {
  if (!userPermissions || userPermissions.length === 0) return true; // Default fallback for dev sandbox
  return userPermissions.includes(requiredPermission) || userPermissions.includes('*') || userPermissions.includes('cat.*');
}
