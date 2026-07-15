import { getOptionProvider } from "../providers/option-provider";
import { RuntimeCulture } from "../types/framework";

export interface FormattingService {
  formatCurrency(value: number, culture: RuntimeCulture): string;
  formatPercentage(value: number, culture: RuntimeCulture): string;
  formatDate(value: any, culture: RuntimeCulture): string;
  formatDateTime(value: any, culture: RuntimeCulture): string;
}

export interface LookupService {
  fetchOptions(field: any, query: string, fetchWithAuth: any): Promise<any[]>;
}

export interface LocalizationService {
  translate(key: string, culture: RuntimeCulture, defaultText: string): string;
}

export interface PermissionService {
  hasPermission(roles: readonly string[], requiredPermission: string): boolean;
}

export interface ValidationService {
  validateField(field: any, value: any): string | undefined;
}

export interface MetadataService {
  getEntityMetadata(entityCode: string): Promise<any>;
}

export interface ManifestService {
  getManifest(moduleCode: string, entityCode: string): Promise<any>;
}

export interface ExpressionService {
  evaluateVisibility(expression: string, values: Record<string, unknown>): boolean;
  evaluateCalculation(expression: string, values: Record<string, unknown>): any;
}

// ─── Concrete Formatting Service ──────────────────────────────────────────────

export class CAPFormattingService implements FormattingService {
  formatCurrency(value: number, culture: RuntimeCulture): string {
    try {
      return new Intl.NumberFormat(culture.locale, {
        style: "currency",
        currency: culture.currencyCode,
      }).format(value);
    } catch (e) {
      return `${culture.currencySymbol}${value.toFixed(2)}`;
    }
  }

  formatPercentage(value: number, culture: RuntimeCulture): string {
    try {
      return new Intl.NumberFormat(culture.locale, {
        style: "percent",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value / 100);
    } catch (e) {
      return `${value}%`;
    }
  }

  formatDate(value: any, culture: RuntimeCulture): string {
    if (!value) return "";
    try {
      const d = new Date(value);
      return new Intl.DateTimeFormat(culture.locale, { dateStyle: "medium" }).format(d);
    } catch (e) {
      return String(value).split("T")[0];
    }
  }

  formatDateTime(value: any, culture: RuntimeCulture): string {
    if (!value) return "";
    try {
      const d = new Date(value);
      return new Intl.DateTimeFormat(culture.locale, { dateStyle: "medium", timeStyle: "short" }).format(d);
    } catch (e) {
      return String(value);
    }
  }
}

// ─── Concrete Lookup Service ──────────────────────────────────────────────────

export class CAPLookupService implements LookupService {
  async fetchOptions(field: any, query: string, fetchWithAuth: any): Promise<any[]> {
    try {
      const provider = getOptionProvider(field.dataSource || "LOOKUP");
      return await provider.fetchOptions(field, query, fetchWithAuth);
    } catch (e) {
      console.error(`Lookup Service failed to fetch options for field: ${field.code}`, e);
      return [];
    }
  }
}

// ─── Concrete Localization Service ────────────────────────────────────────────

export class CAPLocalizationService implements LocalizationService {
  private dictionary: Record<string, Record<string, string>> = {
    "en-US": {
      "platform.emptyState": "No Layout Published",
      "platform.emptyStateDesc": "Publish an entity layout to render this form.",
      "platform.requiredAttention": "fields require attention.",
      "platform.requiredAttentionOne": "field requires attention.",
      "platform.loading": "Loading layout components...",
    },
    "hi-IN": {
      "platform.emptyState": "कोई लेआउट प्रकाशित नहीं है",
      "platform.emptyStateDesc": "इस फॉर्म को रेंडर करने के लिए एक लेआउट प्रकाशित करें।",
      "platform.requiredAttention": "क्षेत्रों पर ध्यान देने की आवश्यकता है।",
      "platform.requiredAttentionOne": "क्षेत्र पर ध्यान देने की आवश्यकता है।",
      "platform.loading": "घटकों को लोड किया जा रहा है...",
    }
  };

  translate(key: string, culture: RuntimeCulture, defaultText: string): string {
    const localeDict = this.dictionary[culture.locale] || this.dictionary["en-US"];
    return localeDict?.[key] || defaultText;
  }
}

// ─── Concrete Permission Service ──────────────────────────────────────────────

export class CAPPermissionService implements PermissionService {
  hasPermission(roles: readonly string[], requiredPermission: string): boolean {
    if (roles.includes("ADMIN") || roles.includes("ADMIN_ACCESS")) return true;
    return roles.includes(requiredPermission);
  }
}

// ─── Concrete Validation Service ──────────────────────────────────────────────

export class CAPValidationService implements ValidationService {
  validateField(field: any, value: any): string | undefined {
    if (field.required && (value === undefined || value === null || value === "")) {
      return `${field.label || field.code} is required.`;
    }
    if (field.dataType === "INTEGER" || field.dataType === "DECIMAL") {
      if (value !== undefined && value !== null && value !== "" && isNaN(Number(value))) {
        return `${field.label || field.code} must be a number.`;
      }
    }
    return undefined;
  }
}

// ─── Concrete Metadata & Expression Stubs ─────────────────────────────────────

export class CAPMetadataService implements MetadataService {
  async getEntityMetadata(entityCode: string): Promise<any> {
    return null;
  }
}

export class CAPManifestService implements ManifestService {
  async getManifest(moduleCode: string, entityCode: string): Promise<any> {
    return null;
  }
}

export class CAPExpressionService implements ExpressionService {
  evaluateVisibility(expression: string, values: Record<string, unknown>): boolean {
    return true;
  }
  evaluateCalculation(expression: string, values: Record<string, unknown>): any {
    return null;
  }
}

// ─── Service Provider Implementation ──────────────────────────────────────────

export interface RuntimeServiceProvider {
  formatting: FormattingService;
  lookup: LookupService;
  localization: LocalizationService;
  permission: PermissionService;
  validation: ValidationService;
  metadata: MetadataService;
  manifest: ManifestService;
  expression: ExpressionService;
}

export const formattingService = new CAPFormattingService();
export const lookupService = new CAPLookupService();
export const localizationService = new CAPLocalizationService();
export const permissionService = new CAPPermissionService();
export const validationService = new CAPValidationService();
export const metadataService = new CAPMetadataService();
export const manifestService = new CAPManifestService();
export const expressionService = new CAPExpressionService();

export const capServiceProvider: RuntimeServiceProvider = {
  formatting: formattingService,
  lookup: lookupService,
  localization: localizationService,
  permission: permissionService,
  validation: validationService,
  metadata: metadataService,
  manifest: manifestService,
  expression: expressionService,
};
