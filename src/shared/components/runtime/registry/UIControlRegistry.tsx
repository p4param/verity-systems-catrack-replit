"use client";

import React from "react";
import { RuntimeControlProps } from "../controls/types";
import { TextInputControl } from "../controls/TextInput";
import { TextAreaControl } from "../controls/TextArea";
import { SelectControl } from "../controls/Select";
import { CheckboxControl } from "../controls/Checkbox";
import { ToggleControl } from "../controls/Toggle";
import { CurrencyControl } from "../controls/Currency";
import { PercentageControl } from "../controls/Percentage";
import { DateControl } from "../controls/Date";
import { LookupControl } from "../controls/Lookup";
import { RadioGroupControl } from "../controls/RadioGroup";
import { FileUploadControl } from "../controls/FileUpload";
import { ImageUploadControl } from "../controls/ImageUpload";
import { MultiSelectControl } from "../controls/MultiSelect";
import { NumberInputControl } from "../controls/NumberInput";
import { DecimalInputControl } from "../controls/DecimalInput";
import { DateTimeControl } from "../controls/DateTime";
import { TimeControl } from "../controls/Time";
import { PasswordControl } from "../controls/Password";
import { EmailControl } from "../controls/Email";
import { PhoneControl } from "../controls/Phone";
import { UrlControl } from "../controls/Url";
import {
  ControlCapabilities,
  RuntimeControlVersion,
  ControlCategory,
  RuntimeControlDefinition,
} from "../types/framework";

// ─── Internal Registry Storage ───────────────────────────────────────────────

const registry = new Map<string, RuntimeControlDefinition>();

// ─── Default Capabilities ────────────────────────────────────────────────────

const defaultCapabilities: ControlCapabilities = {
  supportsFiltering: true,
  supportsSorting: true,
  supportsSearching: true,
  supportsValidation: true,
  supportsDefaultValue: true,
  supportsExport: true,
  supportsPrint: true,
  supportsMobile: true,
  supportsDesigner: true,
  supportsLayout: true,
  supportsWorkflow: true,
  supportsConditionalVisibility: true,
  supportsExpressions: true,
  supportsAI: true,
  supportsOffline: true,
  supportsBulkEdit: true,
  supportsResponsiveLayout: true,
  supportsLocalization: true,
  supportsTheme: true,
  supportsAccessibility: true,
};

const noSearchNoBulk: Partial<ControlCapabilities> = {
  supportsSearching: false,
  supportsSorting: false,
  supportsBulkEdit: false,
};

// ─── ControlCompatibilityRegistry ────────────────────────────────────────────
//
// Maps legacy / short-form / alternate control codes to canonical ES-003 codes.
// Each entry carries optional deprecation metadata surfaced by DiagnosticControl.
//
interface CompatibilityEntry {
  targetCode: string;
  targetVersion?: { major: number };
  deprecated?: boolean;
  deprecatedSince?: string;
  replacedBy?: string;
}

export const ControlCompatibilityRegistry: Record<string, CompatibilityEntry> = {
  // ── Screenshot failures (wrong → correct) ─────────────────────────────────
  "MULTI_SELECT":     { targetCode: "SEL_MULTISELECT" },
  "SELECT":           { targetCode: "SEL_DROPDOWN" },
  "RICH_TEXT":        { targetCode: "TXT_AREA", deprecated: true, replacedBy: "TXT_RICHTEXT", deprecatedSince: "VS05F2" },
  "RICHTEXT":         { targetCode: "TXT_AREA", deprecated: true, replacedBy: "TXT_RICHTEXT", deprecatedSince: "VS05F2" },
  "COLOR_PICKER":     { targetCode: "TXT_INPUT", deprecated: true, replacedBy: "ADV_COLORPICKER", deprecatedSince: "VS05F2" },
  "COLOR":            { targetCode: "TXT_INPUT", deprecated: true, replacedBy: "ADV_COLORPICKER", deprecatedSince: "VS05F2" },

  // ── Corrected mappings (were pointing to wrong controls) ──────────────────
  "NUMBER_INPUT":     { targetCode: "NUM_INTEGER" },
  "INTEGER":          { targetCode: "NUM_INTEGER" },
  "DECIMAL_INPUT":    { targetCode: "NUM_DECIMAL" },
  "DECIMAL":          { targetCode: "NUM_DECIMAL" },
  "EMAIL_INPUT":      { targetCode: "TXT_EMAIL" },
  "PHONE_INPUT":      { targetCode: "TXT_PHONE" },
  "URL_INPUT":        { targetCode: "TXT_URL" },
  "CHECKBOX_GROUP":   { targetCode: "SEL_CHECKBOXGROUP", deprecated: true, replacedBy: "SEL_CHECKBOXGROUP" },
  "MULTI_LOOKUP":     { targetCode: "SEL_MULTISELECT" },
  "MARKDOWN":         { targetCode: "TXT_AREA" },

  // ── Standard aliases ──────────────────────────────────────────────────────
  "TEXT_INPUT":       { targetCode: "TXT_INPUT" },
  "TEXTAREA":         { targetCode: "TXT_AREA" },
  "CURRENCY_INPUT":   { targetCode: "NUM_CURRENCY" },
  "CURRENCY":         { targetCode: "NUM_CURRENCY" },
  "PERCENTAGE":       { targetCode: "NUM_PERCENTAGE" },
  "PERCENTAGE_INPUT": { targetCode: "NUM_PERCENTAGE" },
  "DATE_PICKER":      { targetCode: "DATE" },
  "DATETIME_PICKER":  { targetCode: "DATE_DATETIME" },
  "DATETIME":         { targetCode: "DATE_DATETIME" },
  "TIME_PICKER":      { targetCode: "DATE_TIME" },
  "TIME":             { targetCode: "DATE_TIME" },
  "CHECKBOX":         { targetCode: "BOOL_CHECKBOX" },
  "SWITCH":           { targetCode: "BOOL_SWITCH" },
  "TOGGLE":           { targetCode: "BOOL_SWITCH" },
  "RADIO_GROUP":      { targetCode: "BOOL_RADIOGROUP" },
  "RADIOGROUP":       { targetCode: "BOOL_RADIOGROUP" },
  "FILE_UPLOAD":      { targetCode: "DOC_FILEUPLOAD" },
  "IMAGE_UPLOAD":     { targetCode: "DOC_IMAGEUPLOAD" },
  "LOOKUP":           { targetCode: "SEL_LOOKUP" },
  "DROPDOWN":         { targetCode: "SEL_DROPDOWN" },
  "MULTISELECT":      { targetCode: "SEL_MULTISELECT" },
  "PASSWORD_INPUT":   { targetCode: "TXT_PASSWORD" },
  "PASSWORD":         { targetCode: "TXT_PASSWORD" },
  "EMAIL":            { targetCode: "TXT_EMAIL" },
  "PHONE":            { targetCode: "TXT_PHONE" },
  "URL":              { targetCode: "TXT_URL" },

  // ── Enterprise controls (graceful alias to core until package installed) ──
  "AUTOCOMPLETE":     { targetCode: "SEL_DROPDOWN", deprecated: true, replacedBy: "SEL_AUTOCOMPLETE" },
  "AUTO_COMPLETE":    { targetCode: "SEL_DROPDOWN", deprecated: true, replacedBy: "SEL_AUTOCOMPLETE" },
  "RATING":           { targetCode: "TXT_INPUT",    deprecated: true, replacedBy: "NUM_RATING" },
  "STAR_RATING":      { targetCode: "TXT_INPUT",    deprecated: true, replacedBy: "NUM_RATING" },
  "SLIDER":           { targetCode: "TXT_INPUT",    deprecated: true, replacedBy: "NUM_SLIDER" },
  "RANGE":            { targetCode: "TXT_INPUT",    deprecated: true, replacedBy: "NUM_SLIDER" },
  "TAGS":             { targetCode: "TXT_INPUT",    deprecated: true, replacedBy: "ADV_TAGS" },
  "JSON":             { targetCode: "TXT_AREA",     deprecated: true, replacedBy: "ADV_JSON" },
  "SIGNATURE":        { targetCode: "DOC_FILEUPLOAD", deprecated: true, replacedBy: "DOC_SIGNATURE" },
  "FORMULA":          { targetCode: "TXT_INPUT" },
};

// ─── Diagnostic Control (Development Only) ───────────────────────────────────

export type DiagnosticSource = "Metadata" | "Designer" | "Runtime" | "Plugin";

export const DiagnosticControl: React.FC<RuntimeControlProps & { diagnosticSource?: DiagnosticSource }> = ({
  field,
  diagnosticSource = "Runtime",
}) => {
  const normalCode = field.uiControl?.toUpperCase() ?? "";
  const compat = ControlCompatibilityRegistry[normalCode];
  const resolvedAs = compat?.targetCode ?? "(no alias)";
  const isEnterpriseAlias = compat?.deprecated && compat.replacedBy;

  const availableVersions =
    Array.from(registry.values())
      .filter((r) => r.code.toUpperCase() === resolvedAs.toUpperCase())
      .map((r) => `${r.version.major}.${r.version.minor}.${r.version.patch}`)
      .join(", ") || "None";

  const rows: [string, React.ReactNode][] = [
    ["Control Code", <code key="cc" className="font-mono font-bold">{field.uiControl}</code>],
    ["Resolved As", <code key="ra" className="font-mono">{resolvedAs}</code>],
    ["Available Vers.", availableVersions],
    ["Field", <code key="fd" className="font-mono">{field.code}</code>],
    ["Source", <span key="src" className="capitalize">{diagnosticSource}</span>],
    [
      "Suggested Action",
      isEnterpriseAlias ? (
        <span key="sa" className="text-amber-600 font-medium">
          Install enterprise package for {compat.replacedBy}
        </span>
      ) : (
        <span key="sa2" className="text-amber-600 font-medium">
          Register {resolvedAs} v1.0.0
        </span>
      ),
    ],
  ];

  return (
    <div
      className="p-4 border-2 border-dashed border-destructive/50 bg-destructive/5 rounded-lg space-y-3 text-sm"
      role="alert"
    >
      <div className="flex items-center gap-2 text-destructive font-bold">
        <span>⚠</span>
        <span>Missing Control Renderer</span>
        {isEnterpriseAlias && (
          <span className="ml-auto text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full font-normal">
            Enterprise
          </span>
        )}
      </div>
      <table className="text-xs w-full border-collapse">
        <tbody>
          {rows.map(([label, value], idx) => (
            <tr key={idx} className="border-b border-destructive/10 last:border-0">
              <td className="text-muted-foreground pr-4 py-1 w-36 align-top font-medium">{label}</td>
              <td className="py-1">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Production Fallback ──────────────────────────────────────────────────────

export const ProductionFallbackControl: React.FC<RuntimeControlProps> = ({ field, value }) => (
  <div className="w-full">
    <input
      type="text"
      disabled
      readOnly
      value={value === undefined || value === null ? "" : String(value)}
      className="w-full px-3 py-2 border border-muted bg-muted/10 text-muted-foreground rounded-lg text-xs cursor-not-allowed"
      placeholder={`Unsupported control: ${field.uiControl}`}
    />
  </div>
);

// ─── Registry API ─────────────────────────────────────────────────────────────

export function registerControl(registration: RuntimeControlDefinition): void {
  const v = registration.version;
  const key = `${registration.code.toUpperCase()}@${v.major}.${v.minor}.${v.patch}`;
  registry.set(key, registration);
}

export function resolveControl(
  code: string,
  version: RuntimeControlVersion | string = { major: 1, minor: 0, patch: 0 }
): React.ComponentType<RuntimeControlProps> {
  let parsedVersion: RuntimeControlVersion = { major: 1, minor: 0, patch: 0 };
  if (typeof version === "string") {
    const parts = version.split(".").map(Number);
    parsedVersion = {
      major: isNaN(parts[0]) ? 1 : parts[0],
      minor: isNaN(parts[1]) ? 0 : parts[1],
      patch: isNaN(parts[2]) ? 0 : parts[2],
    };
  } else {
    parsedVersion = version;
  }

  const upperCode = code?.toUpperCase() ?? "";
  const compat = ControlCompatibilityRegistry[upperCode];
  const normCode = (compat?.targetCode ?? upperCode).toUpperCase();

  // Surface deprecation warnings in development
  if (compat?.deprecated && process.env.NODE_ENV === "development") {
    console.warn(
      `[CAP Controls] "${code}" is deprecated since ${compat.deprecatedSince ?? "unknown"}.` +
        (compat.replacedBy ? ` Use "${compat.replacedBy}" (Enterprise package required).` : "")
    );
  }

  // 1. Exact version lookup
  const key = `${normCode}@${parsedVersion.major}.${parsedVersion.minor}.${parsedVersion.patch}`;
  const reg = registry.get(key);
  if (reg) return reg.renderer;

  // 2. Semver fallback: same major, highest minor.patch
  const sameMajorEntries = Array.from(registry.values()).filter(
    (r) => r.code.toUpperCase() === normCode && r.version.major === parsedVersion.major
  );
  if (sameMajorEntries.length > 0) {
    sameMajorEntries.sort((a, b) => {
      if (b.version.minor !== a.version.minor) return b.version.minor - a.version.minor;
      return b.version.patch - a.version.patch;
    });
    return sameMajorEntries[0].renderer;
  }

  // 3. "Any version" fallback: caller passed an incorrect version — return the latest
  //    registered version for this control regardless of major. This is a safety net for
  //    cases where field.version (DB row version) is mistakenly used as control version.
  const anyVersionEntries = Array.from(registry.values()).filter(
    (r) => r.code.toUpperCase() === normCode
  );
  if (anyVersionEntries.length > 0) {
    anyVersionEntries.sort(
      (a, b) =>
        b.version.major - a.version.major ||
        b.version.minor - a.version.minor ||
        b.version.patch - a.version.patch
    );
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[CAP Controls] Version mismatch for "${code}" (${normCode}): ` +
        `requested v${parsedVersion.major}.${parsedVersion.minor}.${parsedVersion.patch}, ` +
        `using latest registered v${anyVersionEntries[0].version.major}.` +
        `${anyVersionEntries[0].version.minor}.${anyVersionEntries[0].version.patch}.`
      );
    }
    return anyVersionEntries[0].renderer;
  }

  // 3. Fallbacks
  if (process.env.NODE_ENV === "development") {
    return DiagnosticControl as React.ComponentType<RuntimeControlProps>;
  }
  console.error(`[CAP Controls] Unsupported control: ${code} (resolved: ${normCode})`);
  return ProductionFallbackControl;
}

export function getControlDefinition(code: string): RuntimeControlDefinition | undefined {
  const upperCode = code?.toUpperCase() ?? "";
  const compat = ControlCompatibilityRegistry[upperCode];
  const normCode = (compat?.targetCode ?? upperCode).toUpperCase();
  return Array.from(registry.values())
    .filter((r) => r.code.toUpperCase() === normCode)
    .sort((a, b) => b.version.major - a.version.major || b.version.minor - a.version.minor)[0];
}

export function getCapabilities(code: string): ControlCapabilities {
  return getControlDefinition(code)?.capabilities ?? defaultCapabilities;
}

export function getVersions(code: string): RuntimeControlVersion[] {
  const upperCode = code?.toUpperCase() ?? "";
  const compat = ControlCompatibilityRegistry[upperCode];
  const normCode = (compat?.targetCode ?? upperCode).toUpperCase();
  return Array.from(registry.values())
    .filter((r) => r.code.toUpperCase() === normCode)
    .map((r) => r.version);
}

export function listControls(): RuntimeControlDefinition[] {
  return Array.from(registry.values());
}

export function getCategories(): ControlCategory[] {
  return ["TEXT", "NUMBER", "DATE", "BOOLEAN", "SELECTION", "DOCUMENT", "MEDIA", "ADVANCED"];
}

// ─── Core Control Registrations ───────────────────────────────────────────────
// VS05F2 — 21 Core controls registered below.

// ── TEXT ──────────────────────────────────────────────────────────────────────

registerControl({
  code: "TXT_INPUT", version: { major: 1, minor: 0, patch: 0 },
  tier: "CORE", maturity: "Stable", category: "TEXT",
  displayName: "Text Input", description: "Single-line text entry field.",
  icon: "Type", keywords: ["text", "string", "input", "single line"],
  renderer: TextInputControl,
  capabilities: defaultCapabilities,
  propertySchema: [
    { key: "placeholder", label: "Placeholder", type: "string", group: "Appearance" },
    { key: "maxLength", label: "Max Length", type: "number", group: "Validation" },
    { key: "prefix", label: "Prefix", type: "string", group: "Appearance" },
    { key: "suffix", label: "Suffix", type: "string", group: "Appearance" },
  ],
  defaultProperties: {},
});

registerControl({
  code: "TXT_AREA", version: { major: 1, minor: 0, patch: 0 },
  tier: "CORE", maturity: "Stable", category: "TEXT",
  displayName: "Text Area", description: "Multi-line text entry field.",
  icon: "AlignLeft", keywords: ["text", "textarea", "multiline", "long text"],
  renderer: TextAreaControl,
  capabilities: { ...defaultCapabilities, supportsSearching: false },
  propertySchema: [
    { key: "rows", label: "Rows", type: "number", group: "Appearance", defaultValue: 4 },
    { key: "autoResize", label: "Auto Resize", type: "boolean", group: "Behavior", defaultValue: false },
    { key: "characterLimit", label: "Character Limit", type: "number", group: "Validation" },
    { key: "placeholder", label: "Placeholder", type: "string", group: "Appearance" },
  ],
  defaultProperties: { rows: 4, autoResize: false },
});

registerControl({
  code: "TXT_PASSWORD", version: { major: 1, minor: 0, patch: 0 },
  tier: "CORE", maturity: "Stable", category: "TEXT",
  displayName: "Password", description: "Masked password input with show/hide toggle.",
  icon: "Lock", keywords: ["password", "secret", "masked"],
  renderer: PasswordControl,
  capabilities: { ...defaultCapabilities, supportsSearching: false, supportsExport: false },
  propertySchema: [
    { key: "placeholder", label: "Placeholder", type: "string", group: "Appearance" },
    { key: "showToggle", label: "Show/Hide Toggle", type: "boolean", group: "Behavior", defaultValue: true },
  ],
  defaultProperties: { showToggle: true },
});

registerControl({
  code: "TXT_EMAIL", version: { major: 1, minor: 0, patch: 0 },
  tier: "CORE", maturity: "Stable", category: "TEXT",
  displayName: "Email", description: "Email address input with format validation.",
  icon: "Mail", keywords: ["email", "e-mail", "address"],
  renderer: EmailControl,
  capabilities: defaultCapabilities,
  propertySchema: [
    { key: "placeholder", label: "Placeholder", type: "string", group: "Appearance" },
    { key: "showMailtoLink", label: "Show Mailto Link", type: "boolean", group: "Behavior", defaultValue: false },
  ],
  defaultProperties: {},
});

registerControl({
  code: "TXT_PHONE", version: { major: 1, minor: 0, patch: 0 },
  tier: "CORE", maturity: "Stable", category: "TEXT",
  displayName: "Phone", description: "Telephone number input.",
  icon: "Phone", keywords: ["phone", "telephone", "mobile", "contact"],
  renderer: PhoneControl,
  capabilities: defaultCapabilities,
  propertySchema: [
    { key: "placeholder", label: "Placeholder", type: "string", group: "Appearance" },
    { key: "countryPrefix", label: "Country Prefix", type: "string", group: "Data" },
  ],
  defaultProperties: {},
});

registerControl({
  code: "TXT_URL", version: { major: 1, minor: 0, patch: 0 },
  tier: "CORE", maturity: "Stable", category: "TEXT",
  displayName: "URL", description: "URL input with link validation. Shows external link in read-only.",
  icon: "Link", keywords: ["url", "link", "website", "http"],
  renderer: UrlControl,
  capabilities: defaultCapabilities,
  propertySchema: [
    { key: "placeholder", label: "Placeholder", type: "string", group: "Appearance" },
    { key: "openInNewTab", label: "Open in New Tab", type: "boolean", group: "Behavior", defaultValue: true },
  ],
  defaultProperties: { openInNewTab: true },
});

// ── NUMBER ────────────────────────────────────────────────────────────────────

registerControl({
  code: "NUM_INTEGER", version: { major: 1, minor: 0, patch: 0 },
  tier: "CORE", maturity: "Stable", category: "NUMBER",
  displayName: "Integer", description: "Whole number input. No decimals allowed.",
  icon: "Hash", keywords: ["number", "integer", "whole", "int", "count"],
  renderer: NumberInputControl,
  capabilities: defaultCapabilities,
  propertySchema: [
    { key: "min", label: "Minimum", type: "number", group: "Validation" },
    { key: "max", label: "Maximum", type: "number", group: "Validation" },
    { key: "step", label: "Step", type: "number", group: "Behavior", defaultValue: 1 },
    { key: "placeholder", label: "Placeholder", type: "string", group: "Appearance" },
  ],
  defaultProperties: { step: 1 },
});

registerControl({
  code: "NUM_DECIMAL", version: { major: 1, minor: 0, patch: 0 },
  tier: "CORE", maturity: "Stable", category: "NUMBER",
  displayName: "Decimal", description: "Decimal number input with configurable precision.",
  icon: "Sigma", keywords: ["number", "decimal", "float", "fraction"],
  renderer: DecimalInputControl,
  capabilities: defaultCapabilities,
  propertySchema: [
    { key: "decimalPlaces", label: "Decimal Places", type: "number", group: "Behavior", defaultValue: 2 },
    { key: "min", label: "Minimum", type: "number", group: "Validation" },
    { key: "max", label: "Maximum", type: "number", group: "Validation" },
    { key: "placeholder", label: "Placeholder", type: "string", group: "Appearance" },
  ],
  defaultProperties: { decimalPlaces: 2 },
});

registerControl({
  code: "NUM_CURRENCY", version: { major: 1, minor: 0, patch: 0 },
  tier: "CORE", maturity: "Stable", category: "NUMBER",
  displayName: "Currency", description: "Monetary value input with currency symbol.",
  icon: "DollarSign", keywords: ["currency", "money", "amount", "price", "cost"],
  renderer: CurrencyControl,
  capabilities: defaultCapabilities,
  propertySchema: [
    { key: "currencySymbol", label: "Currency Symbol", type: "string", group: "Appearance", defaultValue: "$" },
    { key: "decimalPlaces", label: "Decimal Places", type: "number", group: "Behavior", defaultValue: 2 },
  ],
  defaultProperties: {},
});

registerControl({
  code: "NUM_PERCENTAGE", version: { major: 1, minor: 0, patch: 0 },
  tier: "CORE", maturity: "Stable", category: "NUMBER",
  displayName: "Percentage", description: "Percentage value input with % suffix.",
  icon: "Percent", keywords: ["percentage", "percent", "rate", "ratio"],
  renderer: PercentageControl,
  capabilities: defaultCapabilities,
  propertySchema: [
    { key: "decimalPlaces", label: "Decimal Places", type: "number", group: "Behavior", defaultValue: 1 },
    { key: "max", label: "Maximum (%)", type: "number", group: "Validation", defaultValue: 100 },
  ],
  defaultProperties: {},
});

// ── DATE ──────────────────────────────────────────────────────────────────────

registerControl({
  code: "DATE", version: { major: 1, minor: 0, patch: 0 },
  tier: "CORE", maturity: "Stable", category: "DATE",
  displayName: "Date", description: "Date picker input.",
  icon: "Calendar", keywords: ["date", "calendar", "day"],
  renderer: DateControl,
  capabilities: defaultCapabilities,
  propertySchema: [
    { key: "minDate", label: "Min Date", type: "string", group: "Validation" },
    { key: "maxDate", label: "Max Date", type: "string", group: "Validation" },
    { key: "format", label: "Display Format", type: "string", group: "Appearance" },
  ],
  defaultProperties: {},
});

registerControl({
  code: "DATE_DATETIME", version: { major: 1, minor: 0, patch: 0 },
  tier: "CORE", maturity: "Stable", category: "DATE",
  displayName: "Date & Time", description: "Combined date and time picker.",
  icon: "CalendarClock", keywords: ["datetime", "date", "time", "timestamp"],
  renderer: DateTimeControl,
  capabilities: defaultCapabilities,
  propertySchema: [
    { key: "minDate", label: "Min Date", type: "string", group: "Validation" },
    { key: "maxDate", label: "Max Date", type: "string", group: "Validation" },
    { key: "showSeconds", label: "Show Seconds", type: "boolean", group: "Appearance", defaultValue: false },
  ],
  defaultProperties: { showSeconds: false },
});

registerControl({
  code: "DATE_TIME", version: { major: 1, minor: 0, patch: 0 },
  tier: "CORE", maturity: "Stable", category: "DATE",
  displayName: "Time", description: "Time-only picker.",
  icon: "Clock", keywords: ["time", "hour", "minute", "clock"],
  renderer: TimeControl,
  capabilities: defaultCapabilities,
  propertySchema: [
    { key: "use24Hour", label: "24-Hour Format", type: "boolean", group: "Appearance", defaultValue: true },
    { key: "showSeconds", label: "Show Seconds", type: "boolean", group: "Appearance", defaultValue: false },
  ],
  defaultProperties: { use24Hour: true },
});

// ── BOOLEAN ───────────────────────────────────────────────────────────────────

registerControl({
  code: "BOOL_CHECKBOX", version: { major: 1, minor: 0, patch: 0 },
  tier: "CORE", maturity: "Stable", category: "BOOLEAN",
  displayName: "Checkbox", description: "Single boolean checkbox.",
  icon: "CheckSquare", keywords: ["checkbox", "boolean", "check", "tick"],
  renderer: CheckboxControl,
  capabilities: { ...defaultCapabilities, ...noSearchNoBulk },
  propertySchema: [
    { key: "label", label: "Checkbox Label", type: "string", group: "Appearance" },
  ],
  defaultProperties: {},
});

registerControl({
  code: "BOOL_SWITCH", version: { major: 1, minor: 0, patch: 0 },
  tier: "CORE", maturity: "Stable", category: "BOOLEAN",
  displayName: "Toggle / Switch", description: "Boolean toggle switch.",
  icon: "ToggleLeft", keywords: ["switch", "toggle", "boolean", "on off"],
  renderer: ToggleControl,
  capabilities: { ...defaultCapabilities, ...noSearchNoBulk },
  propertySchema: [
    { key: "labelOn", label: "Label (On)", type: "string", group: "Appearance" },
    { key: "labelOff", label: "Label (Off)", type: "string", group: "Appearance" },
  ],
  defaultProperties: {},
});

registerControl({
  code: "BOOL_RADIOGROUP", version: { major: 1, minor: 0, patch: 0 },
  tier: "CORE", maturity: "Stable", category: "BOOLEAN",
  displayName: "Radio Group", description: "Single-choice radio button group.",
  icon: "CircleDot", keywords: ["radio", "choice", "boolean", "yes no"],
  renderer: RadioGroupControl,
  capabilities: { ...defaultCapabilities, ...noSearchNoBulk },
  propertySchema: [
    { key: "orientation", label: "Orientation", type: "enum", group: "Appearance",
      enumValues: ["horizontal", "vertical"], defaultValue: "vertical" },
  ],
  defaultProperties: { orientation: "vertical" },
});

// ── SELECTION ─────────────────────────────────────────────────────────────────

registerControl({
  code: "SEL_DROPDOWN", version: { major: 1, minor: 0, patch: 0 },
  tier: "CORE", maturity: "Stable", category: "SELECTION",
  displayName: "Dropdown", description: "Single-value dropdown select.",
  icon: "ChevronDown", keywords: ["dropdown", "select", "choice", "list"],
  renderer: SelectControl,
  capabilities: defaultCapabilities,
  propertySchema: [
    { key: "placeholder", label: "Placeholder", type: "string", group: "Appearance" },
    { key: "allowClear", label: "Allow Clear", type: "boolean", group: "Behavior", defaultValue: false },
  ],
  defaultProperties: {},
});

registerControl({
  code: "SEL_MULTISELECT", version: { major: 1, minor: 0, patch: 0 },
  tier: "CORE", maturity: "Stable", category: "SELECTION",
  displayName: "Multi-Select", description: "Multi-value selection with chips, dropdown, token, or listbox display.",
  icon: "ListChecks", keywords: ["multi", "multiselect", "chips", "multiple choice"],
  renderer: MultiSelectControl,
  capabilities: defaultCapabilities,
  propertySchema: [
    { key: "displayMode", label: "Display Mode", type: "enum", group: "Appearance",
      enumValues: ["chips", "dropdown", "token", "listbox"], defaultValue: "chips" },
    { key: "maxSelections", label: "Max Selections", type: "number", group: "Validation" },
    { key: "searchable", label: "Searchable", type: "boolean", group: "Behavior", defaultValue: true },
    { key: "placeholder", label: "Placeholder", type: "string", group: "Appearance" },
  ],
  defaultProperties: { displayMode: "chips", searchable: true },
});

registerControl({
  code: "SEL_LOOKUP", version: { major: 1, minor: 0, patch: 0 },
  tier: "CORE", maturity: "Stable", category: "SELECTION",
  displayName: "Lookup", description: "Entity relationship lookup with server-side search.",
  icon: "Search", keywords: ["lookup", "reference", "relation", "fk", "foreign key"],
  renderer: LookupControl,
  capabilities: defaultCapabilities,
  propertySchema: [
    { key: "entityCode", label: "Target Entity", type: "string", group: "Data" },
    { key: "displayField", label: "Display Field", type: "string", group: "Data" },
    { key: "searchField", label: "Search Field", type: "string", group: "Data" },
    { key: "placeholder", label: "Placeholder", type: "string", group: "Appearance" },
  ],
  defaultProperties: {},
});

// ── DOCUMENT ──────────────────────────────────────────────────────────────────

registerControl({
  code: "DOC_FILEUPLOAD", version: { major: 1, minor: 0, patch: 0 },
  tier: "CORE", maturity: "Stable", category: "DOCUMENT",
  displayName: "File Upload", description: "File attachment with drag-and-drop and StorageProvider integration.",
  icon: "Upload", keywords: ["file", "upload", "attachment", "document"],
  renderer: FileUploadControl,
  capabilities: { ...defaultCapabilities, ...noSearchNoBulk },
  propertySchema: [
    { key: "allowMultiple", label: "Allow Multiple", type: "boolean", group: "Behavior", defaultValue: true },
    { key: "maxFiles", label: "Max Files", type: "number", group: "Validation", defaultValue: 5 },
    { key: "maxSizeMB", label: "Max Size (MB)", type: "number", group: "Validation", defaultValue: 10 },
    { key: "allowedExtensions", label: "Allowed Extensions", type: "array", group: "Validation" },
    { key: "storageProfile", label: "Storage Profile", type: "string", group: "Data",
      description: "Named storage profile (e.g. INCIDENT_ATTACHMENTS). Administrator configures the backend." },
  ],
  defaultProperties: { allowMultiple: true, maxFiles: 5, maxSizeMB: 10 },
});

registerControl({
  code: "DOC_IMAGEUPLOAD", version: { major: 1, minor: 0, patch: 0 },
  tier: "CORE", maturity: "Stable", category: "DOCUMENT",
  displayName: "Image Upload", description: "Image upload with preview and drag-and-drop.",
  icon: "Image", keywords: ["image", "photo", "picture", "upload"],
  renderer: ImageUploadControl,
  capabilities: { ...defaultCapabilities, ...noSearchNoBulk },
  propertySchema: [
    { key: "allowMultiple", label: "Allow Multiple", type: "boolean", group: "Behavior", defaultValue: false },
    { key: "maxFiles", label: "Max Files", type: "number", group: "Validation", defaultValue: 1 },
    { key: "maxSizeMB", label: "Max Size (MB)", type: "number", group: "Validation", defaultValue: 5 },
    { key: "storageProfile", label: "Storage Profile", type: "string", group: "Data" },
  ],
  defaultProperties: { allowMultiple: false, maxFiles: 1, maxSizeMB: 5 },
});
