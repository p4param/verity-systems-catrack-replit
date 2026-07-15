export enum RuntimeEventType {
  INITIALIZE = "INITIALIZE",
  LOAD = "LOAD",
  FOCUS = "FOCUS",
  CHANGE = "CHANGE",
  VALIDATE = "VALIDATE",
  BLUR = "BLUR",
  DESTROY = "DESTROY",
  EXECUTION_STARTED = "EXECUTION_STARTED",
  EXECUTION_COMPLETED = "EXECUTION_COMPLETED",
  EXECUTION_DEFERRED = "EXECUTION_DEFERRED",
  EXECUTION_FAILED = "EXECUTION_FAILED",
  EXECUTION_CANCELLED = "EXECUTION_CANCELLED"
}

export interface RuntimeEvent<T = unknown> {
  type: RuntimeEventType;
  source: string;
  timestamp: number;
  payload: T;
}

export interface RuntimeSpacingTokens {
  tabGap: string;
  tabListPadding: string;
  sectionGap: string;
  sectionPadding: string;
  sectionHeaderPadding: string;
  groupSpacing: string;
  rowGap: string;
  fieldGap: string;
  footerPadding: string;
  toolbarPadding: string;
  pagePadding: string;
}

export interface RuntimeTypographyTokens {
  pageTitle: string;
  breadcrumb: string;
  tabLabel: string;
  sectionTitle: string;
  fieldLabel: string;
  fieldHelp: string;
  fieldError: string;
  footerText: string;
}

export interface RuntimeColorTokens {
  requiredAsterisk: string;
  validationSummaryBg: string;
  sectionHeaderBg: string;
  cardBg: string;
  stickyFooterBg: string;
}

export interface RuntimeBorderTokens {
  input: string;
  button: string;
  card: string;
}

export interface RuntimeShadowTokens {
  card: string;
  footer: string;
  popover: string;
}

export interface RuntimeAnimationTokens {
  collapse: string;
  hover: string;
}

export interface RuntimeComponentTokens {
  inputRadius: string;
  buttonRadius: string;
}

export interface RuntimeDensitySpacing {
  tabGap: string;
  sectionGap: string;
  sectionPadding: string;
  groupSpacing: string;
  rowGap: string;
  fieldGap: string;
  pagePadding: string;
}

export interface RuntimeDesignSystem {
  spacing: RuntimeSpacingTokens;
  typography: RuntimeTypographyTokens;
  colors: RuntimeColorTokens;
  borders: RuntimeBorderTokens;
  shadows: RuntimeShadowTokens;
  animations: RuntimeAnimationTokens;
  components: RuntimeComponentTokens;
  density: {
    COMPACT: RuntimeDensitySpacing;
    COMFORTABLE: RuntimeDensitySpacing;
    RELAXED: RuntimeDensitySpacing;
  };
}

export interface RuntimeCulture {
  locale: string;
  currencyCode: string;
  currencySymbol: string;
  decimalSeparator: string;
  thousandSeparator: string;
  shortDateFormat: string;
  longDateFormat: string;
  firstDayOfWeek: number;
  rtl: boolean;
}

export interface RuntimePermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface RuntimeContext {
  readonly entity: {
    readonly id: string;
    readonly code: string;
    readonly name: string;
  };
  readonly permissions: Readonly<RuntimePermissions>;
  readonly designSystem: Readonly<RuntimeDesignSystem>;
  readonly culture: Readonly<RuntimeCulture>;
  readonly timezone: string;
  readonly workflow: {
    readonly state: string;
  };
}

export interface RecordContext {
  readonly currentValues: Readonly<Record<string, unknown>>;
  readonly originalValues: Readonly<Record<string, unknown>>;
  readonly dirtyFields: Readonly<Record<string, boolean>>;
  readonly modifiedSincePublish: boolean;
  readonly validation: {
    readonly errors: Readonly<Record<string, string>>;
    readonly isValid: boolean;
  };
}

export interface EntityFieldDefinition {
  id: string;
  entityId: string;
  code: string;
  label: string;
  dataType: "STRING" | "INTEGER" | "DECIMAL" | "BOOLEAN" | "DATE" | "JSON" | "UUID";
  required: boolean;
  unique: boolean;
  indexed: boolean;
  searchable: boolean;
  sortable: boolean;
  filterable: boolean;
  defaultValue?: string | null;
  validation?: Record<string, unknown> | null;
  dataSource?: string | null;
  uiControl: string;
  displayOrder: number;
  status: string;
  version: number;
  metadata?: Record<string, unknown> | null;
  /**
   * Control-specific runtime properties (displayMode, maxLength, storageProfile, etc.).
   * Populated from metadata.properties. Controls read from field.properties directly.
   */
  properties?: Record<string, unknown> | null;
  options?: Array<{ code: string; label: string; displayOrder: number }>;
  lookupDefinition?: Record<string, unknown> | null;
}

export interface LayoutFieldPlacement {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  displayOrder: number;
  visible: boolean;
  metadata?: Record<string, unknown>;
  fieldId: string;
  span?: {
    xs: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  labelPosition?: "TOP" | "LEFT" | "RIGHT" | "HIDDEN";
  requiredOverride?: boolean | null;
  readOnlyOverride?: boolean | null;
  hiddenOverride?: boolean | null;
  placeholder?: string | null;
  helpText?: string | null;
  width?: number | null;
  cssClass?: string | null;
  visibilityExpression?: string | null;
  enableExpression?: string | null;
  defaultValueExpression?: string | null;
}

export interface RuntimeAppearance {
  cssClass?: string;
  placeholder?: string;
  tooltip?: string;
  helpText?: string;
  prefix?: string;
  suffix?: string;
  icon?: string;
  width?: number;
  alignment?: "left" | "center" | "right";
}

export interface RuntimeFieldState {
  visible: boolean;
  hidden: boolean;
  readonly: boolean;
  disabled: boolean;
  required: boolean;
  dirty: boolean;
  modified: boolean;
  focused: boolean;
  loading: boolean;
  error?: string;
}

export type RuntimeMode =
  | "CREATE"
  | "EDIT"
  | "VIEW"
  | "READONLY"
  | "QUICK_CREATE"
  | "INLINE_EDIT"
  | "BULK_EDIT"
  | "PREVIEW"
  | "PRINT";

export interface RuntimeControlVersion {
  major: number;
  minor: number;
  patch: number;
}

export type ControlCategory = 
  | "TEXT"
  | "NUMBER"
  | "DATE"
  | "BOOLEAN"
  | "SELECTION"
  | "DOCUMENT"
  | "MEDIA"
  | "ADVANCED";

export type ControlTier = "CORE" | "ENTERPRISE" | "PLUGIN";

export type ControlMaturity = "Experimental" | "Preview" | "Stable" | "Deprecated";

export type ControlPropertyGroup =
  | "Appearance"
  | "Behavior"
  | "Validation"
  | "Data"
  | "Events"
  | "Advanced";

// ─── Control Property Schema ──────────────────────────────────────────────────

export interface RuntimeControlPropertySchema {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "enum" | "array";
  group: ControlPropertyGroup;
  enumValues?: string[];
  defaultValue?: unknown;
  description?: string;
  required?: boolean;
}

// ─── Control Capabilities ─────────────────────────────────────────────────────

export interface ControlCapabilities {
  supportsFiltering: boolean;
  supportsSorting: boolean;
  supportsSearching: boolean;
  supportsValidation: boolean;
  supportsDefaultValue: boolean;
  supportsExport: boolean;
  supportsPrint: boolean;
  supportsMobile: boolean;
  supportsDesigner: boolean;
  supportsLayout: boolean;
  supportsWorkflow: boolean;
  supportsConditionalVisibility: boolean;
  supportsExpressions: boolean;
  supportsAI: boolean;
  supportsOffline: boolean;
  supportsBulkEdit: boolean;
  supportsResponsiveLayout: boolean;
  supportsLocalization: boolean;
  supportsTheme: boolean;
  supportsAccessibility: boolean;
}

// ─── Control Lifecycle ────────────────────────────────────────────────────────

export interface RuntimeControlLifecycle {
  /** Called once after the control mounts. */
  onInitialize?: (fieldCode: string, value: unknown) => void;
  /** Called when the control's data finishes loading (e.g. lookup options). */
  onLoad?: (fieldCode: string) => void;
  /** Called when the control receives focus. */
  onFocus?: (fieldCode: string) => void;
  /** Called before a value change is committed. Return false to cancel. */
  onValueChanging?: (fieldCode: string, prev: unknown, next: unknown) => boolean;
  /** Called after a value change is committed. */
  onValueChanged?: (fieldCode: string, value: unknown) => void;
  /** Called to run custom validation. Returns error message or undefined. */
  onValidate?: (fieldCode: string, value: unknown) => string | undefined;
  /** Called when the control loses focus. */
  onBlur?: (fieldCode: string, value: unknown) => void;
  /** Called just before the control unmounts. */
  onDestroy?: (fieldCode: string) => void;
}

// ─── Control Migration ────────────────────────────────────────────────────────

/**
 * Defines how a control's stored properties should be migrated between
 * major versions. Registered alongside the control definition.
 */
export interface ControlMigration {
  fromMajor: number;
  toMajor: number;
  migrate: (properties: Record<string, unknown>) => Record<string, unknown>;
}

// ─── Designer Props ───────────────────────────────────────────────────────────

export interface RuntimeControlDesignerProps {
  controlCode: string;
  version: RuntimeControlVersion;
  properties: Record<string, unknown>;
  onChange: (properties: Record<string, unknown>) => void;
}

export type RuntimeControlValidator = (value: unknown, properties: Record<string, unknown>) => string | undefined;

// ─── Theme Adapter (Namespace Reservation) ────────────────────────────────────
//
// Future architecture: Control → Renderer → ThemeAdapter → HTML
// Today: ThemeAdapter is a passthrough (ShadCN is the default theme).
// In future milestones, ThemeAdapter will allow targeting Material UI,
// Fluent UI, SAP Fiori, or custom enterprise design systems without
// rewriting a single control.
//
export interface RuntimeThemeAdapter {
  readonly name: string;
  readonly version: string;
  // Adapter entry point — reserved for future implementation.
  adapt?: <TProps extends object>(
    componentType: string,
    props: TProps
  ) => React.ReactElement;
}

// ─── Control Definition ───────────────────────────────────────────────────────

export interface RuntimeControlDefinition {
  // Identity
  code: string;
  version: RuntimeControlVersion;
  tier: ControlTier;
  maturity: ControlMaturity;

  // Rendering
  renderer: React.ComponentType<any>;
  designer?: React.ComponentType<RuntimeControlDesignerProps>;

  // Schema
  propertySchema: RuntimeControlPropertySchema[];
  defaultProperties: Record<string, unknown>;
  migrations?: ControlMigration[];

  // Capabilities
  capabilities: ControlCapabilities;
  category: ControlCategory;

  // Catalog metadata (for Form Designer, docs, search, AI)
  displayName: string;
  description: string;
  icon: string;
  keywords: string[];

  // Lifecycle (optional — controls opt in)
  lifecycle?: RuntimeControlLifecycle;
}

// ─── Control State ────────────────────────────────────────────────────────────

export interface RuntimeControlState {
  value: unknown;
  displayValue?: string;
  dirty: boolean;
  touched: boolean;
  readonly: boolean;
  disabled: boolean;
  loading: boolean;
  validationState: "VALID" | "INVALID" | "WARNING";
}

export enum RuntimeControlEvent {
  INITIALIZE = "INITIALIZE",
  LOAD = "LOAD",
  FOCUS = "FOCUS",
  CHANGE = "CHANGE",
  BLUR = "BLUR",
  VALIDATE = "VALIDATE",
  OPEN = "OPEN",
  CLOSE = "CLOSE",
  DESTROY = "DESTROY"
}

// ─── Control Marketplace (Namespace Reservation) ──────────────────────────────
//
// Future architecture: Registry → Catalog → Marketplace
// The Marketplace is the discovery layer over installed plugin packages:
//   @cap/runtime-controls-core
//   @cap/runtime-controls-enterprise
//   @cap/runtime-controls-hse
//   @cap/runtime-controls-finance
//   @cap/runtime-controls-ai
//
// Not implemented in VS05F2. Namespace reserved to prevent future conflicts.
//
export interface ControlMarketplaceEntry {
  packageName: string;
  packageVersion: string;
  controlCodes: string[];
  installedAt: string;
  tier: ControlTier;
}

