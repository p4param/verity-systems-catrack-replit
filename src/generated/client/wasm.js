
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.TenantScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  displayName: 'displayName',
  description: 'description',
  logoUrl: 'logoUrl',
  defaultTimeZone: 'defaultTimeZone',
  defaultCulture: 'defaultCulture',
  defaultCurrency: 'defaultCurrency',
  status: 'status',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  isDeleted: 'isDeleted',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  version: 'version'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  fullName: 'fullName',
  email: 'email',
  passwordHash: 'passwordHash',
  status: 'status',
  mfaEnabled: 'mfaEnabled',
  mfaSecret: 'mfaSecret',
  mfaSetupRequired: 'mfaSetupRequired',
  isActive: 'isActive',
  isLocked: 'isLocked',
  lastLoginAt: 'lastLoginAt',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy'
};

exports.Prisma.RoleScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  description: 'description',
  isSystem: 'isSystem',
  requiresMfa: 'requiresMfa',
  isActive: 'isActive',
  createdAt: 'createdAt'
};

exports.Prisma.UserRoleScalarFieldEnum = {
  userId: 'userId',
  roleId: 'roleId',
  assignedAt: 'assignedAt',
  assignedBy: 'assignedBy'
};

exports.Prisma.PermissionScalarFieldEnum = {
  id: 'id',
  code: 'code',
  description: 'description'
};

exports.Prisma.RolePermissionScalarFieldEnum = {
  roleId: 'roleId',
  permissionId: 'permissionId'
};

exports.Prisma.PasswordResetTokenScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  tokenHash: 'tokenHash',
  expiresAt: 'expiresAt',
  usedAt: 'usedAt',
  createdAt: 'createdAt'
};

exports.Prisma.PasswordResetRequestScalarFieldEnum = {
  id: 'id',
  email: 'email',
  ipAddress: 'ipAddress',
  requestedAt: 'requestedAt'
};

exports.Prisma.MfaBackupCodeScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  codeHash: 'codeHash',
  used: 'used',
  createdAt: 'createdAt'
};

exports.Prisma.RefreshTokenScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  tokenHash: 'tokenHash',
  mfaVerified: 'mfaVerified',
  deviceInfo: 'deviceInfo',
  ipAddress: 'ipAddress',
  lastActiveAt: 'lastActiveAt',
  expiresAt: 'expiresAt',
  revokedAt: 'revokedAt',
  revokedByIp: 'revokedByIp',
  replacedByToken: 'replacedByToken',
  createdAt: 'createdAt'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  actorUserId: 'actorUserId',
  targetUserId: 'targetUserId',
  action: 'action',
  details: 'details',
  ipAddress: 'ipAddress',
  createdAt: 'createdAt'
};

exports.Prisma.SecurityAlertScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  title: 'title',
  message: 'message',
  severity: 'severity',
  metadata: 'metadata',
  isRead: 'isRead',
  createdAt: 'createdAt'
};

exports.Prisma.UserInviteScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  email: 'email',
  tokenHash: 'tokenHash',
  expiresAt: 'expiresAt',
  createdBy: 'createdBy',
  usedAt: 'usedAt',
  createdAt: 'createdAt'
};

exports.Prisma.CategoryScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  isActive: 'isActive',
  createdAt: 'createdAt'
};

exports.Prisma.VendorScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  contactInfo: 'contactInfo',
  taxId: 'taxId',
  paymentTerms: 'paymentTerms',
  creditLimit: 'creditLimit',
  isActive: 'isActive',
  createdAt: 'createdAt'
};

exports.Prisma.ApparelScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  categoryId: 'categoryId',
  name: 'name',
  unit: 'unit',
  minStockLevel: 'minStockLevel',
  unitValue: 'unitValue',
  isActive: 'isActive',
  createdAt: 'createdAt'
};

exports.Prisma.StockMovementScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  apparelId: 'apparelId',
  movementType: 'movementType',
  quantityChange: 'quantityChange',
  referenceType: 'referenceType',
  referenceId: 'referenceId',
  reason: 'reason',
  condition: 'condition',
  recoveryOfMovementId: 'recoveryOfMovementId',
  lossResponsibility: 'lossResponsibility',
  createdAt: 'createdAt',
  createdBy: 'createdBy'
};

exports.Prisma.EventScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  eventDate: 'eventDate',
  status: 'status',
  createdAt: 'createdAt'
};

exports.Prisma.EventReservationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  eventId: 'eventId',
  apparelId: 'apparelId',
  reservedQty: 'reservedQty',
  status: 'status',
  createdAt: 'createdAt',
  createdBy: 'createdBy'
};

exports.Prisma.LaundryOrderScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  vendorId: 'vendorId',
  dispatchDate: 'dispatchDate',
  expectedReturnDate: 'expectedReturnDate',
  status: 'status',
  createdAt: 'createdAt',
  createdBy: 'createdBy'
};

exports.Prisma.LaundryOrderItemScalarFieldEnum = {
  id: 'id',
  laundryOrderId: 'laundryOrderId',
  apparelId: 'apparelId',
  qtyDispatched: 'qtyDispatched',
  qtyReturned: 'qtyReturned',
  qtyDamaged: 'qtyDamaged',
  qtyMissing: 'qtyMissing'
};

exports.Prisma.MovementTypeScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  code: 'code',
  direction: 'direction',
  affectsClean: 'affectsClean',
  affectsDirty: 'affectsDirty',
  isRecoveryType: 'isRecoveryType',
  isSystemControlled: 'isSystemControlled',
  isActive: 'isActive',
  createdAt: 'createdAt'
};

exports.Prisma.ReasonCodeScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  code: 'code',
  description: 'description',
  appliesTo: 'appliesTo',
  requiresApproval: 'requiresApproval',
  isActive: 'isActive',
  createdAt: 'createdAt'
};

exports.Prisma.StockConditionMasterScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  code: 'code',
  description: 'description',
  isActive: 'isActive',
  createdAt: 'createdAt'
};

exports.Prisma.UnitOfMeasureScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  code: 'code',
  description: 'description',
  conversionFactor: 'conversionFactor',
  isActive: 'isActive',
  createdAt: 'createdAt'
};

exports.Prisma.LocationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  type: 'type',
  isActive: 'isActive',
  createdAt: 'createdAt'
};

exports.Prisma.DocumentNumberingScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  entityType: 'entityType',
  prefix: 'prefix',
  currentSequence: 'currentSequence',
  resetYearly: 'resetYearly',
  lastResetYear: 'lastResetYear',
  isActive: 'isActive',
  createdAt: 'createdAt'
};

exports.Prisma.InventorySettingsScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  allowNegativeStock: 'allowNegativeStock',
  requireApprovalForRecovery: 'requireApprovalForRecovery',
  defaultLaundrySLA: 'defaultLaundrySLA',
  enableMultiLocation: 'enableMultiLocation',
  enableValuation: 'enableValuation',
  currencySymbol: 'currencySymbol',
  defaultTaxRate: 'defaultTaxRate',
  updatedAt: 'updatedAt'
};

exports.Prisma.SupplierScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  contactInfo: 'contactInfo',
  taxId: 'taxId',
  paymentTerms: 'paymentTerms',
  creditLimit: 'creditLimit',
  isPreferred: 'isPreferred',
  isActive: 'isActive',
  createdAt: 'createdAt'
};

exports.Prisma.PurchaseOrderScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  supplierId: 'supplierId',
  poNumber: 'poNumber',
  status: 'status',
  orderDate: 'orderDate',
  expectedDate: 'expectedDate',
  notes: 'notes',
  createdBy: 'createdBy',
  approvedBy: 'approvedBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PurchaseOrderItemScalarFieldEnum = {
  id: 'id',
  purchaseOrderId: 'purchaseOrderId',
  apparelId: 'apparelId',
  orderedQty: 'orderedQty',
  receivedQty: 'receivedQty',
  unitCost: 'unitCost'
};

exports.Prisma.DashboardSnapshotScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  snapshotDate: 'snapshotDate',
  totalPhysicalInventory: 'totalPhysicalInventory',
  availableInventory: 'availableInventory',
  reservedInventory: 'reservedInventory',
  dirtyInventory: 'dirtyInventory',
  inLaundryInventory: 'inLaundryInventory',
  inventoryHealth: 'inventoryHealth',
  availabilityScore: 'availabilityScore',
  stockoutRiskScore: 'stockoutRiskScore',
  dirtyRatioScore: 'dirtyRatioScore',
  lossRatioScore: 'lossRatioScore',
  agingScore: 'agingScore',
  predictedDemand30Days: 'predictedDemand30Days',
  forecastAccuracy: 'forecastAccuracy',
  predictedPurchaseRequirement: 'predictedPurchaseRequirement',
  stockoutRisk: 'stockoutRisk',
  upcomingEvents: 'upcomingEvents',
  eventsThisMonth: 'eventsThisMonth',
  eventCompletionRate: 'eventCompletionRate',
  eventsPendingReconciliation: 'eventsPendingReconciliation',
  grossLoss: 'grossLoss',
  recovered: 'recovered',
  netLoss: 'netLoss',
  lossRate: 'lossRate',
  recoveryRate: 'recoveryRate',
  financialImpact: 'financialImpact',
  vendorScore: 'vendorScore',
  highRiskVendorCount: 'highRiskVendorCount',
  averageTurnaroundDays: 'averageTurnaroundDays',
  vendorLiability: 'vendorLiability',
  dirtyStock: 'dirtyStock',
  inLaundry: 'inLaundry',
  laundryAging0to3: 'laundryAging0to3',
  laundryAging4to7: 'laundryAging4to7',
  laundryAgingOver7: 'laundryAgingOver7',
  avgLaundryCycleDays: 'avgLaundryCycleDays',
  delayedLaundryOrders: 'delayedLaundryOrders',
  stockoutRiskLevel: 'stockoutRiskLevel',
  vendorRiskLevel: 'vendorRiskLevel',
  laundryBottleneckLevel: 'laundryBottleneckLevel',
  eventCapacityRiskLevel: 'eventCapacityRiskLevel',
  inventoryValue: 'inventoryValue',
  monthlyConsumptionValue: 'monthlyConsumptionValue',
  costOfLosses: 'costOfLosses',
  costOfDamages: 'costOfDamages',
  recoverySavings: 'recoverySavings',
  createdAt: 'createdAt'
};

exports.Prisma.KPITrendSnapshotScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  snapshotDate: 'snapshotDate',
  metricCode: 'metricCode',
  metricValue: 'metricValue',
  createdAt: 'createdAt'
};

exports.Prisma.AIRecommendationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  priority: 'priority',
  type: 'type',
  title: 'title',
  description: 'description',
  payload: 'payload',
  status: 'status',
  createdAt: 'createdAt'
};

exports.Prisma.LaundryVendorRateScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  vendorId: 'vendorId',
  apparelId: 'apparelId',
  washingRate: 'washingRate',
  ironingRate: 'ironingRate',
  dryCleaningRate: 'dryCleaningRate',
  effectiveFrom: 'effectiveFrom',
  effectiveTo: 'effectiveTo',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.LaundryVendorInvoiceScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  invoiceNo: 'invoiceNo',
  vendorId: 'vendorId',
  fromDate: 'fromDate',
  toDate: 'toDate',
  invoiceDate: 'invoiceDate',
  subtotal: 'subtotal',
  taxRate: 'taxRate',
  taxAmount: 'taxAmount',
  totalAmount: 'totalAmount',
  paidAmount: 'paidAmount',
  status: 'status',
  remarks: 'remarks',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.LaundryVendorInvoiceItemScalarFieldEnum = {
  id: 'id',
  invoiceId: 'invoiceId',
  apparelId: 'apparelId',
  quantity: 'quantity',
  rate: 'rate',
  amount: 'amount',
  remarks: 'remarks'
};

exports.Prisma.LaundryBillingSourceScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  invoiceId: 'invoiceId',
  stockMovementId: 'stockMovementId',
  quantity: 'quantity',
  createdAt: 'createdAt'
};

exports.Prisma.VendorLiabilityScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  vendorId: 'vendorId',
  stockMovementId: 'stockMovementId',
  movementTypeCode: 'movementTypeCode',
  apparelId: 'apparelId',
  quantity: 'quantity',
  unitCost: 'unitCost',
  amount: 'amount',
  settledAmount: 'settledAmount',
  status: 'status',
  remarks: 'remarks',
  createdAt: 'createdAt'
};

exports.Prisma.VendorLiabilityCreditScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  vendorLiabilityId: 'vendorLiabilityId',
  recoveryMovementId: 'recoveryMovementId',
  quantity: 'quantity',
  unitCost: 'unitCost',
  amount: 'amount',
  createdAt: 'createdAt'
};

exports.Prisma.VendorPaymentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  paymentNo: 'paymentNo',
  vendorId: 'vendorId',
  paymentDate: 'paymentDate',
  amount: 'amount',
  paymentMethod: 'paymentMethod',
  referenceNo: 'referenceNo',
  remarks: 'remarks',
  status: 'status',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.VendorPaymentAllocationScalarFieldEnum = {
  id: 'id',
  paymentId: 'paymentId',
  invoiceId: 'invoiceId',
  amountApplied: 'amountApplied'
};

exports.Prisma.VendorLedgerScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  vendorId: 'vendorId',
  transactionDate: 'transactionDate',
  transactionType: 'transactionType',
  referenceType: 'referenceType',
  referenceId: 'referenceId',
  debit: 'debit',
  credit: 'credit',
  remarks: 'remarks',
  createdAt: 'createdAt'
};

exports.Prisma.CateringEventScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  eventNumber: 'eventNumber',
  name: 'name',
  typeId: 'typeId',
  statusId: 'statusId',
  priorityId: 'priorityId',
  customerId: 'customerId',
  contactId: 'contactId',
  salesExecId: 'salesExecId',
  managerId: 'managerId',
  bookingDate: 'bookingDate',
  startDate: 'startDate',
  endDate: 'endDate',
  guestCount: 'guestCount',
  budgetAmount: 'budgetAmount',
  currency: 'currency',
  remarks: 'remarks',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  isDeleted: 'isDeleted',
  version: 'version'
};

exports.Prisma.CateringEventTypeScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  name: 'name',
  code: 'code',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  isDeleted: 'isDeleted',
  version: 'version'
};

exports.Prisma.CateringEventStatusScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  name: 'name',
  code: 'code',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  isDeleted: 'isDeleted',
  version: 'version'
};

exports.Prisma.CateringEventCategoryScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  name: 'name',
  code: 'code',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  isDeleted: 'isDeleted',
  version: 'version'
};

exports.Prisma.CateringEventPriorityScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  name: 'name',
  code: 'code',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  isDeleted: 'isDeleted',
  version: 'version'
};

exports.Prisma.CateringEventFunctionScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  eventId: 'eventId',
  name: 'name',
  startAt: 'startAt',
  endAt: 'endAt',
  guestCount: 'guestCount',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  isDeleted: 'isDeleted',
  version: 'version'
};

exports.Prisma.CateringEventVenueScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  eventId: 'eventId',
  venueId: 'venueId',
  rentAmount: 'rentAmount',
  contractSigned: 'contractSigned',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  isDeleted: 'isDeleted',
  version: 'version'
};

exports.Prisma.CateringEventContactScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  eventId: 'eventId',
  contactName: 'contactName',
  email: 'email',
  phone: 'phone',
  role: 'role',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  isDeleted: 'isDeleted',
  version: 'version'
};

exports.Prisma.CateringEventAssignmentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  eventId: 'eventId',
  userId: 'userId',
  roleCode: 'roleCode',
  assignedAt: 'assignedAt',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  isDeleted: 'isDeleted',
  version: 'version'
};

exports.Prisma.CateringEventScheduleScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  eventId: 'eventId',
  title: 'title',
  startAt: 'startAt',
  endAt: 'endAt',
  description: 'description',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  isDeleted: 'isDeleted',
  version: 'version'
};

exports.Prisma.CateringEventCalendarScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  eventId: 'eventId',
  calendarType: 'calendarType',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  isDeleted: 'isDeleted',
  version: 'version'
};

exports.Prisma.CateringEventActivityScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  eventId: 'eventId',
  activityType: 'activityType',
  notes: 'notes',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  isDeleted: 'isDeleted',
  version: 'version'
};

exports.Prisma.CateringEventNoteScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  eventId: 'eventId',
  title: 'title',
  content: 'content',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  isDeleted: 'isDeleted',
  version: 'version'
};

exports.Prisma.CateringEventTaskScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  eventId: 'eventId',
  title: 'title',
  description: 'description',
  priority: 'priority',
  status: 'status',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  isDeleted: 'isDeleted',
  version: 'version'
};

exports.Prisma.CateringEventTaskChecklistScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  taskId: 'taskId',
  title: 'title',
  isCompleted: 'isCompleted',
  completedAt: 'completedAt',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  isDeleted: 'isDeleted',
  version: 'version'
};

exports.Prisma.CateringEventDocumentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  eventId: 'eventId',
  name: 'name',
  filePath: 'filePath',
  fileSize: 'fileSize',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  isDeleted: 'isDeleted',
  version: 'version'
};

exports.Prisma.CateringEventCommunicationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  eventId: 'eventId',
  channel: 'channel',
  recipient: 'recipient',
  subject: 'subject',
  content: 'content',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  isDeleted: 'isDeleted',
  version: 'version'
};

exports.Prisma.CateringEventPaymentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  eventId: 'eventId',
  amount: 'amount',
  method: 'method',
  transactionId: 'transactionId',
  paidAt: 'paidAt',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  isDeleted: 'isDeleted',
  version: 'version'
};

exports.Prisma.CateringEventCostingScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  eventId: 'eventId',
  estimatedFood: 'estimatedFood',
  estimatedLabor: 'estimatedLabor',
  estimatedLogistics: 'estimatedLogistics',
  actualFood: 'actualFood',
  actualLabor: 'actualLabor',
  actualLogistics: 'actualLogistics',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  isDeleted: 'isDeleted',
  version: 'version'
};

exports.Prisma.CateringEventBudgetScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  eventId: 'eventId',
  allocatedAmount: 'allocatedAmount',
  spentAmount: 'spentAmount',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  isDeleted: 'isDeleted',
  version: 'version'
};

exports.Prisma.CateringEventResourceScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  eventId: 'eventId',
  name: 'name',
  quantity: 'quantity',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  isDeleted: 'isDeleted',
  version: 'version'
};

exports.Prisma.CateringEventResourceRequirementScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  eventId: 'eventId',
  resourceType: 'resourceType',
  quantity: 'quantity',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  isDeleted: 'isDeleted',
  version: 'version'
};

exports.Prisma.CateringEventMenuScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  functionId: 'functionId',
  eventId: 'eventId',
  packageVersionId: 'packageVersionId',
  pricePerHead: 'pricePerHead',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  isDeleted: 'isDeleted',
  version: 'version'
};

exports.Prisma.CateringEventHealthScoreScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  eventId: 'eventId',
  score: 'score',
  calculatedAt: 'calculatedAt',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  isDeleted: 'isDeleted',
  version: 'version'
};

exports.Prisma.CateringEventApprovalScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  eventId: 'eventId',
  approverId: 'approverId',
  status: 'status',
  notes: 'notes',
  actionedAt: 'actionedAt',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  isDeleted: 'isDeleted',
  version: 'version'
};

exports.Prisma.CateringEventTimelineScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  eventId: 'eventId',
  summary: 'summary',
  details: 'details',
  loggedAt: 'loggedAt',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  isDeleted: 'isDeleted',
  version: 'version'
};

exports.Prisma.CateringEventTagScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  name: 'name',
  colorCode: 'colorCode',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  isDeleted: 'isDeleted',
  version: 'version'
};

exports.Prisma.CateringEventCustomFieldScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  name: 'name',
  fieldType: 'fieldType',
  isRequired: 'isRequired',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  isDeleted: 'isDeleted',
  version: 'version'
};

exports.Prisma.CateringEventCustomFieldValueScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  eventId: 'eventId',
  fieldId: 'fieldId',
  valueText: 'valueText',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  isDeleted: 'isDeleted',
  version: 'version'
};

exports.Prisma.CateringEventNotificationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  eventId: 'eventId',
  userId: 'userId',
  channel: 'channel',
  title: 'title',
  body: 'body',
  isRead: 'isRead',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  isDeleted: 'isDeleted',
  version: 'version'
};

exports.Prisma.CateringEventAuditLogScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  eventId: 'eventId',
  actionType: 'actionType',
  previousState: 'previousState',
  currentState: 'currentState',
  changedBy: 'changedBy',
  changedAt: 'changedAt',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  isDeleted: 'isDeleted',
  version: 'version'
};

exports.Prisma.WorkflowDefinitionScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  name: 'name',
  code: 'code',
  isActive: 'isActive',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  version: 'version',
  status: 'status'
};

exports.Prisma.WorkflowStateScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  workflowId: 'workflowId',
  name: 'name',
  code: 'code',
  sortOrder: 'sortOrder',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  isDeleted: 'isDeleted',
  version: 'version'
};

exports.Prisma.PlatformModuleScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  description: 'description',
  icon: 'icon',
  sortOrder: 'sortOrder',
  isActive: 'isActive',
  isSystem: 'isSystem',
  status: 'status',
  version: 'version',
  metadata: 'metadata',
  navigationGroup: 'navigationGroup',
  displayOrder: 'displayOrder',
  route: 'route',
  defaultPage: 'defaultPage',
  color: 'color',
  badge: 'badge',
  badgeColor: 'badgeColor',
  menuVisible: 'menuVisible',
  showInSearch: 'showInSearch',
  showOnDashboard: 'showOnDashboard',
  showInMobile: 'showInMobile',
  isLicensed: 'isLicensed',
  requiresLicense: 'requiresLicense',
  featureFlag: 'featureFlag',
  moduleDependencies: 'moduleDependencies',
  minimumRole: 'minimumRole',
  defaultPermissionSet: 'defaultPermissionSet',
  defaultLandingPage: 'defaultLandingPage',
  helpUrl: 'helpUrl',
  documentationUrl: 'documentationUrl',
  supportEmail: 'supportEmail',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy'
};

exports.Prisma.ConfigurationEntityScalarFieldEnum = {
  id: 'id',
  moduleId: 'moduleId',
  code: 'code',
  name: 'name',
  pluralName: 'pluralName',
  description: 'description',
  allowCRUD: 'allowCRUD',
  allowImport: 'allowImport',
  allowExport: 'allowExport',
  allowWorkflow: 'allowWorkflow',
  allowAttachments: 'allowAttachments',
  allowAudit: 'allowAudit',
  allowComments: 'allowComments',
  allowTags: 'allowTags',
  allowHierarchy: 'allowHierarchy',
  allowSoftDelete: 'allowSoftDelete',
  status: 'status',
  version: 'version',
  isActive: 'isActive',
  isSystem: 'isSystem',
  isCustom: 'isCustom',
  metadataLocked: 'metadataLocked',
  showInNavigation: 'showInNavigation',
  menuGroup: 'menuGroup',
  menuOrder: 'menuOrder',
  icon: 'icon',
  route: 'route',
  apiEnabled: 'apiEnabled',
  apiName: 'apiName',
  metadata: 'metadata',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy'
};

exports.Prisma.RuntimeArtifactScalarFieldEnum = {
  id: 'id',
  entityId: 'entityId',
  version: 'version',
  status: 'status',
  payload: 'payload',
  generatedAt: 'generatedAt',
  generatedBy: 'generatedBy',
  generatorVersion: 'generatorVersion'
};

exports.Prisma.EntityFieldDefinitionScalarFieldEnum = {
  id: 'id',
  entityId: 'entityId',
  code: 'code',
  label: 'label',
  dataType: 'dataType',
  required: 'required',
  unique: 'unique',
  indexed: 'indexed',
  searchable: 'searchable',
  sortable: 'sortable',
  filterable: 'filterable',
  defaultValue: 'defaultValue',
  validation: 'validation',
  dataSource: 'dataSource',
  uiControl: 'uiControl',
  displayOrder: 'displayOrder',
  status: 'status',
  version: 'version',
  metadata: 'metadata',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy'
};

exports.Prisma.EntityFieldOptionScalarFieldEnum = {
  id: 'id',
  fieldDefinitionId: 'fieldDefinitionId',
  code: 'code',
  label: 'label',
  displayOrder: 'displayOrder',
  active: 'active',
  color: 'color',
  icon: 'icon',
  isDefault: 'isDefault',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EntityFieldLookupDefinitionScalarFieldEnum = {
  id: 'id',
  fieldDefinitionId: 'fieldDefinitionId',
  referencedEntityId: 'referencedEntityId',
  displayFieldId: 'displayFieldId',
  valueFieldId: 'valueFieldId',
  searchFieldIds: 'searchFieldIds',
  filterConditions: 'filterConditions',
  sortConditions: 'sortConditions',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EntityViewScalarFieldEnum = {
  id: 'id',
  entityId: 'entityId',
  code: 'code',
  name: 'name',
  viewType: 'viewType',
  isDefault: 'isDefault',
  status: 'status',
  version: 'version',
  metadata: 'metadata',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy'
};

exports.Prisma.EntityLayoutViewScalarFieldEnum = {
  id: 'id',
  entityId: 'entityId',
  code: 'code',
  name: 'name',
  description: 'description',
  layoutType: 'layoutType',
  isDefault: 'isDefault',
  status: 'status',
  version: 'version',
  layout: 'layout',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy'
};

exports.Prisma.EntityRecordScalarFieldEnum = {
  id: 'id',
  entityId: 'entityId',
  companyId: 'companyId',
  branchId: 'branchId',
  recordNumber: 'recordNumber',
  status: 'status',
  version: 'version',
  parentRecordId: 'parentRecordId',
  metadata: 'metadata',
  isDeleted: 'isDeleted',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy'
};

exports.Prisma.EntityValueScalarFieldEnum = {
  id: 'id',
  recordId: 'recordId',
  fieldDefinitionId: 'fieldDefinitionId',
  valueString: 'valueString',
  valueNumber: 'valueNumber',
  valueBoolean: 'valueBoolean',
  valueDate: 'valueDate',
  valueDateTime: 'valueDateTime',
  valueJson: 'valueJson',
  valueReferenceId: 'valueReferenceId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EntityRelationshipScalarFieldEnum = {
  id: 'id',
  sourceRecordId: 'sourceRecordId',
  targetRecordId: 'targetRecordId',
  relationshipType: 'relationshipType',
  description: 'description',
  metadata: 'metadata',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy'
};

exports.Prisma.LookupValueScalarFieldEnum = {
  id: 'id',
  entityId: 'entityId',
  code: 'code',
  name: 'name',
  displayName: 'displayName',
  sortOrder: 'sortOrder',
  color: 'color',
  icon: 'icon',
  parentLookupId: 'parentLookupId',
  isDefault: 'isDefault',
  isActive: 'isActive',
  metadata: 'metadata',
  isDeleted: 'isDeleted',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy'
};

exports.Prisma.ValidationRuleScalarFieldEnum = {
  id: 'id',
  fieldDefinitionId: 'fieldDefinitionId',
  ruleType: 'ruleType',
  expression: 'expression',
  errorMessage: 'errorMessage',
  sortOrder: 'sortOrder',
  isActive: 'isActive',
  metadata: 'metadata',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy'
};

exports.Prisma.EntityPermissionScalarFieldEnum = {
  id: 'id',
  entityId: 'entityId',
  permissionCode: 'permissionCode',
  roleCode: 'roleCode',
  canCreate: 'canCreate',
  canRead: 'canRead',
  canUpdate: 'canUpdate',
  canDelete: 'canDelete',
  canApprove: 'canApprove',
  canExport: 'canExport',
  metadata: 'metadata',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy'
};

exports.Prisma.EntityAuditScalarFieldEnum = {
  id: 'id',
  entityId: 'entityId',
  recordId: 'recordId',
  action: 'action',
  oldValue: 'oldValue',
  newValue: 'newValue',
  performedBy: 'performedBy',
  performedAt: 'performedAt',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent'
};

exports.Prisma.NavigationGroupScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  description: 'description',
  icon: 'icon',
  color: 'color',
  displayOrder: 'displayOrder',
  isVisible: 'isVisible',
  isCollapsedByDefault: 'isCollapsedByDefault',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy'
};

exports.Prisma.NavigationItemScalarFieldEnum = {
  id: 'id',
  title: 'title',
  parentId: 'parentId',
  navigationGroupId: 'navigationGroupId',
  platformModuleId: 'platformModuleId',
  entityId: 'entityId',
  route: 'route',
  icon: 'icon',
  displayOrder: 'displayOrder',
  menuType: 'menuType',
  target: 'target',
  openInNewTab: 'openInNewTab',
  visible: 'visible',
  mobileVisible: 'mobileVisible',
  customerPortalVisible: 'customerPortalVisible',
  vendorPortalVisible: 'vendorPortalVisible',
  favoriteAllowed: 'favoriteAllowed',
  searchable: 'searchable',
  metadata: 'metadata',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy'
};

exports.Prisma.NavigationProfileScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  description: 'description',
  isActive: 'isActive',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy'
};

exports.Prisma.NavigationLayoutScalarFieldEnum = {
  id: 'id',
  profileId: 'profileId',
  navigationStructure: 'navigationStructure',
  isPublished: 'isPublished',
  version: 'version',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy'
};

exports.Prisma.NavigationPermissionScalarFieldEnum = {
  id: 'id',
  navigationItemId: 'navigationItemId',
  roleCode: 'roleCode',
  permissionCode: 'permissionCode',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy'
};

exports.Prisma.NavigationVersionScalarFieldEnum = {
  id: 'id',
  versionNumber: 'versionNumber',
  description: 'description',
  structure: 'structure',
  isPublished: 'isPublished',
  createdAt: 'createdAt',
  createdBy: 'createdBy'
};

exports.Prisma.NavigationHistoryScalarFieldEnum = {
  id: 'id',
  action: 'action',
  details: 'details',
  performedBy: 'performedBy',
  createdAt: 'createdAt'
};

exports.Prisma.NavigationFavoriteScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  navigationItemId: 'navigationItemId',
  displayOrder: 'displayOrder',
  createdAt: 'createdAt'
};

exports.Prisma.NavigationQuickLinkScalarFieldEnum = {
  id: 'id',
  navigationItemId: 'navigationItemId',
  displayOrder: 'displayOrder',
  createdAt: 'createdAt'
};

exports.Prisma.PlatformModulePermissionScalarFieldEnum = {
  id: 'id',
  platformModuleId: 'platformModuleId',
  permissionId: 'permissionId',
  permissionPurpose: 'permissionPurpose',
  displayOrder: 'displayOrder',
  isRequired: 'isRequired',
  metadata: 'metadata'
};

exports.Prisma.NavigationSearchIndexScalarFieldEnum = {
  id: 'id',
  title: 'title',
  route: 'route',
  description: 'description',
  keywords: 'keywords',
  metadata: 'metadata',
  createdAt: 'createdAt'
};

exports.Prisma.PlatformRecordSequenceScalarFieldEnum = {
  id: 'id',
  entityId: 'entityId',
  prefix: 'prefix',
  lastValue: 'lastValue',
  updatedAt: 'updatedAt'
};

exports.Prisma.PlatformApplicationScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  displayName: 'displayName',
  description: 'description',
  category: 'category',
  iconUrl: 'iconUrl',
  websiteUrl: 'websiteUrl',
  status: 'status',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  isDeleted: 'isDeleted',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  version: 'version'
};

exports.Prisma.PlatformApplicationPackageScalarFieldEnum = {
  id: 'id',
  applicationId: 'applicationId',
  semVer: 'semVer',
  displayName: 'displayName',
  description: 'description',
  releaseNotes: 'releaseNotes',
  status: 'status',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  isDeleted: 'isDeleted',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  version: 'version'
};

exports.Prisma.TenantWorkspaceScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  code: 'code',
  name: 'name',
  displayName: 'displayName',
  description: 'description',
  timeZone: 'timeZone',
  culture: 'culture',
  currency: 'currency',
  status: 'status',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  isDeleted: 'isDeleted',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  version: 'version'
};

exports.Prisma.WorkspaceInstallationScalarFieldEnum = {
  id: 'id',
  workspaceId: 'workspaceId',
  packageId: 'packageId',
  status: 'status',
  installedAt: 'installedAt',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  isDeleted: 'isDeleted',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  version: 'version'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.StockCondition = exports.$Enums.StockCondition = {
  CLEAN: 'CLEAN',
  DIRTY: 'DIRTY'
};

exports.ViewType = exports.$Enums.ViewType = {
  GRID: 'GRID',
  FORM: 'FORM',
  CARD: 'CARD',
  KANBAN: 'KANBAN',
  CALENDAR: 'CALENDAR',
  TIMELINE: 'TIMELINE',
  TREE: 'TREE',
  DASHBOARD: 'DASHBOARD',
  DETAIL: 'DETAIL',
  QUICK_CREATE: 'QUICK_CREATE'
};

exports.LayoutType = exports.$Enums.LayoutType = {
  FORM: 'FORM',
  DETAIL: 'DETAIL',
  QUICK_CREATE: 'QUICK_CREATE',
  WIZARD: 'WIZARD',
  MOBILE: 'MOBILE',
  PRINT: 'PRINT'
};

exports.Prisma.ModelName = {
  Tenant: 'Tenant',
  User: 'User',
  Role: 'Role',
  UserRole: 'UserRole',
  Permission: 'Permission',
  RolePermission: 'RolePermission',
  PasswordResetToken: 'PasswordResetToken',
  PasswordResetRequest: 'PasswordResetRequest',
  MfaBackupCode: 'MfaBackupCode',
  RefreshToken: 'RefreshToken',
  AuditLog: 'AuditLog',
  SecurityAlert: 'SecurityAlert',
  UserInvite: 'UserInvite',
  Category: 'Category',
  Vendor: 'Vendor',
  Apparel: 'Apparel',
  StockMovement: 'StockMovement',
  Event: 'Event',
  EventReservation: 'EventReservation',
  LaundryOrder: 'LaundryOrder',
  LaundryOrderItem: 'LaundryOrderItem',
  MovementType: 'MovementType',
  ReasonCode: 'ReasonCode',
  StockConditionMaster: 'StockConditionMaster',
  UnitOfMeasure: 'UnitOfMeasure',
  Location: 'Location',
  DocumentNumbering: 'DocumentNumbering',
  InventorySettings: 'InventorySettings',
  Supplier: 'Supplier',
  PurchaseOrder: 'PurchaseOrder',
  PurchaseOrderItem: 'PurchaseOrderItem',
  DashboardSnapshot: 'DashboardSnapshot',
  KPITrendSnapshot: 'KPITrendSnapshot',
  AIRecommendation: 'AIRecommendation',
  LaundryVendorRate: 'LaundryVendorRate',
  LaundryVendorInvoice: 'LaundryVendorInvoice',
  LaundryVendorInvoiceItem: 'LaundryVendorInvoiceItem',
  LaundryBillingSource: 'LaundryBillingSource',
  VendorLiability: 'VendorLiability',
  VendorLiabilityCredit: 'VendorLiabilityCredit',
  VendorPayment: 'VendorPayment',
  VendorPaymentAllocation: 'VendorPaymentAllocation',
  VendorLedger: 'VendorLedger',
  CateringEvent: 'CateringEvent',
  CateringEventType: 'CateringEventType',
  CateringEventStatus: 'CateringEventStatus',
  CateringEventCategory: 'CateringEventCategory',
  CateringEventPriority: 'CateringEventPriority',
  CateringEventFunction: 'CateringEventFunction',
  CateringEventVenue: 'CateringEventVenue',
  CateringEventContact: 'CateringEventContact',
  CateringEventAssignment: 'CateringEventAssignment',
  CateringEventSchedule: 'CateringEventSchedule',
  CateringEventCalendar: 'CateringEventCalendar',
  CateringEventActivity: 'CateringEventActivity',
  CateringEventNote: 'CateringEventNote',
  CateringEventTask: 'CateringEventTask',
  CateringEventTaskChecklist: 'CateringEventTaskChecklist',
  CateringEventDocument: 'CateringEventDocument',
  CateringEventCommunication: 'CateringEventCommunication',
  CateringEventPayment: 'CateringEventPayment',
  CateringEventCosting: 'CateringEventCosting',
  CateringEventBudget: 'CateringEventBudget',
  CateringEventResource: 'CateringEventResource',
  CateringEventResourceRequirement: 'CateringEventResourceRequirement',
  CateringEventMenu: 'CateringEventMenu',
  CateringEventHealthScore: 'CateringEventHealthScore',
  CateringEventApproval: 'CateringEventApproval',
  CateringEventTimeline: 'CateringEventTimeline',
  CateringEventTag: 'CateringEventTag',
  CateringEventCustomField: 'CateringEventCustomField',
  CateringEventCustomFieldValue: 'CateringEventCustomFieldValue',
  CateringEventNotification: 'CateringEventNotification',
  CateringEventAuditLog: 'CateringEventAuditLog',
  WorkflowDefinition: 'WorkflowDefinition',
  WorkflowState: 'WorkflowState',
  PlatformModule: 'PlatformModule',
  ConfigurationEntity: 'ConfigurationEntity',
  RuntimeArtifact: 'RuntimeArtifact',
  EntityFieldDefinition: 'EntityFieldDefinition',
  EntityFieldOption: 'EntityFieldOption',
  EntityFieldLookupDefinition: 'EntityFieldLookupDefinition',
  EntityView: 'EntityView',
  EntityLayoutView: 'EntityLayoutView',
  EntityRecord: 'EntityRecord',
  EntityValue: 'EntityValue',
  EntityRelationship: 'EntityRelationship',
  LookupValue: 'LookupValue',
  ValidationRule: 'ValidationRule',
  EntityPermission: 'EntityPermission',
  EntityAudit: 'EntityAudit',
  NavigationGroup: 'NavigationGroup',
  NavigationItem: 'NavigationItem',
  NavigationProfile: 'NavigationProfile',
  NavigationLayout: 'NavigationLayout',
  NavigationPermission: 'NavigationPermission',
  NavigationVersion: 'NavigationVersion',
  NavigationHistory: 'NavigationHistory',
  NavigationFavorite: 'NavigationFavorite',
  NavigationQuickLink: 'NavigationQuickLink',
  PlatformModulePermission: 'PlatformModulePermission',
  NavigationSearchIndex: 'NavigationSearchIndex',
  PlatformRecordSequence: 'PlatformRecordSequence',
  PlatformApplication: 'PlatformApplication',
  PlatformApplicationPackage: 'PlatformApplicationPackage',
  TenantWorkspace: 'TenantWorkspace',
  WorkspaceInstallation: 'WorkspaceInstallation'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
