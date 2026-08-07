// PM-WP03B — Purchase Order Management.
// A Purchase Order is a persisted commercial commitment, not a logistics
// document — the first entity in this chain that is not recomputed on
// every request. Partially Received/Received are named in the type for
// documentation purposes only (per the PM-WP03A Engineering Package) —
// nothing in this work package ever produces or accepts them; there is
// no Goods Receipt mechanism yet to drive them honestly.
export type PurchaseOrderStatus = 'DRAFT' | 'APPROVED' | 'ISSUED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';

export const PURCHASE_ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'Draft',
  APPROVED: 'Approved',
  ISSUED: 'Issued',
  PARTIALLY_RECEIVED: 'Partially Received',
  RECEIVED: 'Received',
  CANCELLED: 'Cancelled',
};

// Implemented in PM-WP03B — the only two states a Purchase Order can
// actually be created/transitioned into today.
export const IMPLEMENTED_PURCHASE_ORDER_STATUSES: PurchaseOrderStatus[] = ['DRAFT', 'APPROVED', 'ISSUED', 'CANCELLED'];

// How a Draft began. Set once at creation, never changes afterward — it
// describes how the PO started, not how it has since evolved (a
// PLANNING-origin PO can still gain MANUAL-source items later; origin
// itself never flips to MANUAL because of that).
export type PurchaseOrderOrigin = 'PLANNING' | 'MANUAL';

export const PURCHASE_ORDER_ORIGIN_LABELS: Record<PurchaseOrderOrigin, string> = {
  PLANNING: 'Purchase Planning',
  MANUAL: 'Manual',
};

// Per-item provenance — independent of the header's origin (see above).
export type PurchaseOrderItemSource = 'PLANNING' | 'MANUAL';

export interface PurchaseOrderSummary {
  id: string;
  poNumber: string;
  origin: PurchaseOrderOrigin;
  vendorId: string;
  vendorName: string;
  workDate?: string;
  status: PurchaseOrderStatus;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderDetail {
  id: string;
  poNumber: string;
  origin: PurchaseOrderOrigin;
  vendorId: string;
  vendorName: string;
  vendorStatus: string;
  workDate?: string;
  status: PurchaseOrderStatus;
  approvedAt?: string;
  issuedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItem {
  id: string;
  ingredientId: string;
  ingredientCode: string;
  ingredientName: string;
  unit: string;
  quantity: number;
  source: PurchaseOrderItemSource;
  displayOrder: number;
}

// Purchase Order Review's client-side row shape (pre-save, in-memory
// only — nothing persisted until Save Draft). Carries ingredientCode/
// name/unit purely for display in the Review table; the create API only
// reads ingredientId/quantity/source from each item and always
// re-derives code/name/unit itself from Ingredient Master at insert
// time — it never trusts client-supplied labels.
export interface DraftPurchaseOrderItemInput {
  ingredientId: string;
  ingredientCode: string;
  ingredientName: string;
  unit: string;
  quantity: number;
  source: PurchaseOrderItemSource;
}
