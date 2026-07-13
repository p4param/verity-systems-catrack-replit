import { CurrentUser } from "@/lib/auth/auth-types";

export type EventResource = {
  tenantId: string;
  companyId: string;
  branchId: string;
  managerId?: string | null;
  salesExecId?: string | null;
  budgetAmount: number;
};

export const EventPermissions = {
  VIEW_EVENT: "VIEW_EVENT",
  CREATE_EVENT: "CREATE_EVENT",
  EDIT_EVENT: "EDIT_EVENT",
  DELETE_EVENT: "DELETE_EVENT",
  APPROVE_EVENT: "APPROVE_EVENT",
  CANCEL_EVENT: "CANCEL_EVENT",
  REOPEN_EVENT: "REOPEN_EVENT",
  MANAGE_PAYMENTS: "MANAGE_PAYMENTS",
  MANAGE_DOCUMENTS: "MANAGE_DOCUMENTS",
  MANAGE_TASKS: "MANAGE_TASKS",
  ASSIGN_RESOURCES: "ASSIGN_RESOURCES",
  VIEW_FINANCIALS: "VIEW_FINANCIALS",
  VIEW_REPORTS: "VIEW_REPORTS",
  EXPORT_DATA: "EXPORT_DATA",
} as const;

export type EventPermissionType = keyof typeof EventPermissions;

// Row-level security: check if user owns, is assigned, or belongs to the correct branch/city
export function checkRowLevelSecurity(user: CurrentUser, resource: EventResource): boolean {
  const userUuid = "00000000-0000-0000-0000-" + user.sub.toString().padStart(12, "0");
  const tenantUuid = "00000000-0000-0000-0000-" + user.tenantId.toString().padStart(12, "0");

  // 1. Hard tenant isolation
  if (resource.tenantId !== tenantUuid) {
    throw new Error("Security Violation: Access across tenant boundary is prohibited.");
  }

  // 2. Administrators bypass row-level checks
  if (user.roles.includes("ADMIN")) return true;

  // 3. Row-level filters
  const isBranchManager = user.roles.includes("BRANCH_MANAGER");
  const isRegionalManager = user.roles.includes("REGIONAL_MANAGER");

  if (isBranchManager && resource.branchId === tenantUuid) return true; // Branch matches
  if (isRegionalManager && resource.companyId === tenantUuid) return true; // Company matches

  // 4. Ownership / Assignment rules
  const isOwner = resource.managerId === userUuid || resource.salesExecId === userUuid;
  if (isOwner) return true;

  throw new Error("Access Denied: You do not have ownership or assignment access to this event record");
}

// Approval authorization limits
export function checkApprovalAuthority(user: CurrentUser, budgetAmount: number): boolean {
  if (user.roles.includes("ADMIN") || user.roles.includes("CFO")) return true;

  const isDirector = user.roles.includes("DIRECTOR");
  if (isDirector && budgetAmount <= 50000) {
    return true; // Directors can approve events up to $50,000
  }

  const isManager = user.roles.includes("EVENT_MANAGER");
  if (isManager && budgetAmount <= 10000) {
    return true; // Managers can approve events up to $10,000
  }

  throw new Error(`Insufficient Approval Limit: Budget $${budgetAmount} exceeds approval authority limit for your role`);
}

// Global checks
export function authorizeEventAction(
  user: CurrentUser,
  permission: EventPermissionType,
  resource?: EventResource
): boolean {
  // Verify user has the general permission code
  const permissionsList = user.permissions || [];
  
  // Backwards compatibility fallback mapping
  const matchesPermission = permissionsList.includes(permission) || permissionsList.includes("INVENTORY_MANAGE") || permissionsList.includes("INVENTORY_VIEW");
  if (!matchesPermission) {
    throw new Error(`Access Denied: Missing general permission code ${permission}`);
  }

  // Verify Row Level constraints
  if (resource) {
    checkRowLevelSecurity(user, resource);

    // Additional approval matrix check
    if (permission === "APPROVE_EVENT") {
      checkApprovalAuthority(user, resource.budgetAmount);
    }
  }

  return true;
}
