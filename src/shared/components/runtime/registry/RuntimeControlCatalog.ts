/**
 * RuntimeControlCatalog — VS05F2
 *
 * Discovery layer above UIControlRegistry.
 * Provides search, filtering, and metadata retrieval for the Form Designer,
 * documentation generator, and AI assistance.
 *
 * Architecture:
 *   UIControlRegistry    — implementation registry (code@version → renderer)
 *   RuntimeControlCatalog — discovery (category, tier, keywords, schema, maturity)
 *   ControlMarketplace   — installed plugin packages (future VS06+)
 *
 * Note: In-memory for VS05F2. Database-backed discovery belongs with the
 * Form Designer and plugin management features in later milestones.
 */

import {
  RuntimeControlDefinition,
  ControlCategory,
  ControlTier,
  ControlMaturity,
  RuntimeControlPropertySchema,
  ControlPropertyGroup,
} from "../types/framework";
import { listControls, ControlCompatibilityRegistry } from "./UIControlRegistry";

export class RuntimeControlCatalog {
  /** All registered control definitions. */
  static getAll(): RuntimeControlDefinition[] {
    return listControls();
  }

  /** Controls filtered by category. */
  static getByCategory(category: ControlCategory): RuntimeControlDefinition[] {
    return listControls().filter((c) => c.category === category);
  }

  /** Controls filtered by tier (CORE | ENTERPRISE | PLUGIN). */
  static getByTier(tier: ControlTier): RuntimeControlDefinition[] {
    return listControls().filter((c) => c.tier === tier);
  }

  /** Controls filtered by maturity. */
  static getByMaturity(maturity: ControlMaturity): RuntimeControlDefinition[] {
    return listControls().filter((c) => c.maturity === maturity);
  }

  /**
   * Full-text search across code, displayName, description, and keywords.
   * Case-insensitive. Returns ranked results (code match > keyword match > description match).
   */
  static search(query: string): RuntimeControlDefinition[] {
    if (!query.trim()) return listControls();
    const q = query.toLowerCase();
    const all = listControls();
    const scored = all.map((c) => {
      let score = 0;
      if (c.code.toLowerCase().includes(q)) score += 100;
      if (c.displayName.toLowerCase().includes(q)) score += 80;
      if (c.keywords.some((k) => k.toLowerCase().includes(q))) score += 60;
      if (c.description.toLowerCase().includes(q)) score += 20;
      return { c, score };
    });
    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.c);
  }

  /** Get the property schema for a control, grouped by ControlPropertyGroup. */
  static getPropertySchema(code: string): RuntimeControlPropertySchema[] {
    const def = listControls().find((c) => c.code.toUpperCase() === code.toUpperCase());
    return def?.propertySchema ?? [];
  }

  /**
   * Get property schema for a control, organized by group.
   * Returns a Map of group → properties for easy property panel rendering.
   */
  static getPropertySchemaByGroup(
    code: string
  ): Map<ControlPropertyGroup, RuntimeControlPropertySchema[]> {
    const schema = this.getPropertySchema(code);
    const grouped = new Map<ControlPropertyGroup, RuntimeControlPropertySchema[]>();
    for (const prop of schema) {
      if (!grouped.has(prop.group)) grouped.set(prop.group, []);
      grouped.get(prop.group)!.push(prop);
    }
    return grouped;
  }

  /** Get the Lucide icon name for a control code. */
  static getIcon(code: string): string {
    const def = listControls().find((c) => c.code.toUpperCase() === code.toUpperCase());
    return def?.icon ?? "Box";
  }

  /** Check if a control code is deprecated (via ControlCompatibilityRegistry). */
  static isDeprecated(code: string): boolean {
    const entry = ControlCompatibilityRegistry[code.toUpperCase()];
    return entry?.deprecated === true;
  }

  /**
   * Get the suggested canonical replacement for a deprecated/legacy code.
   * Returns null if not deprecated.
   */
  static getSuggestedReplacement(code: string): string | null {
    const entry = ControlCompatibilityRegistry[code.toUpperCase()];
    if (!entry) return null;
    return entry.replacedBy ?? entry.targetCode ?? null;
  }

  /** Get all legacy alias codes that resolve to the given canonical code. */
  static getAliasesFor(canonicalCode: string): string[] {
    return Object.entries(ControlCompatibilityRegistry)
      .filter(([, entry]) => entry.targetCode.toUpperCase() === canonicalCode.toUpperCase())
      .map(([alias]) => alias);
  }

  /** Get a summary of the entire catalog for diagnostics or documentation. */
  static getSummary(): {
    totalControls: number;
    byCategory: Record<string, number>;
    byTier: Record<string, number>;
    byMaturity: Record<string, number>;
    totalAliases: number;
  } {
    const all = listControls();
    const byCategory: Record<string, number> = {};
    const byTier: Record<string, number> = {};
    const byMaturity: Record<string, number> = {};

    for (const c of all) {
      byCategory[c.category] = (byCategory[c.category] || 0) + 1;
      byTier[c.tier] = (byTier[c.tier] || 0) + 1;
      byMaturity[c.maturity] = (byMaturity[c.maturity] || 0) + 1;
    }

    return {
      totalControls: all.length,
      byCategory,
      byTier,
      byMaturity,
      totalAliases: Object.keys(ControlCompatibilityRegistry).length,
    };
  }
}

export default RuntimeControlCatalog;
