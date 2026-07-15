/**
 * VS05F2 — Control Registry Full Certification Suite
 *
 * Certification: 13 assertions per Core control.
 * Total: 21 Core controls × 13 = 273 assertions + screenshot regression manifest.
 *
 * Test groups:
 *   Group A — Canonical code resolution (no DiagnosticControl or ProductionFallbackControl)
 *   Group B — RuntimeControlDefinition catalog completeness
 *   Group C — ControlCompatibilityRegistry (all aliases resolve correctly)
 *   Group D — Semver fallback resolution
 *   Group E — Screenshot regression (the 5 failures shown in the issue screenshot)
 *   Group F — Visual certification manifest verification
 */

import {
  resolveControl,
  DiagnosticControl,
  ProductionFallbackControl,
  getControlDefinition,
  getVersions,
  listControls,
  ControlCompatibilityRegistry,
} from "@/shared/components/runtime/registry/UIControlRegistry";
import { RuntimeControlCatalog } from "@/shared/components/runtime/registry/RuntimeControlCatalog";
import { ControlMarketplace } from "@/shared/components/runtime/registry/ControlMarketplace";

// ─── Canonical Core Control Codes ─────────────────────────────────────────────

const CORE_CONTROLS = [
  "TXT_INPUT", "TXT_AREA", "TXT_PASSWORD", "TXT_EMAIL", "TXT_PHONE", "TXT_URL",
  "NUM_INTEGER", "NUM_DECIMAL", "NUM_CURRENCY", "NUM_PERCENTAGE",
  "DATE", "DATE_DATETIME", "DATE_TIME",
  "BOOL_CHECKBOX", "BOOL_SWITCH", "BOOL_RADIOGROUP",
  "SEL_DROPDOWN", "SEL_MULTISELECT", "SEL_LOOKUP",
  "DOC_FILEUPLOAD", "DOC_IMAGEUPLOAD",
] as const;

// ─── Known Legacy Alias Pairs (alias → expectedCanonical) ─────────────────────

const ALIAS_PAIRS: [string, string][] = [
  // Screenshot failures — these MUST resolve correctly
  ["MULTI_SELECT",   "SEL_MULTISELECT"],
  ["SELECT",         "SEL_DROPDOWN"],
  ["RICH_TEXT",      "TXT_AREA"],          // interim: enterprise fallback
  ["FILE_UPLOAD",    "DOC_FILEUPLOAD"],
  ["COLOR_PICKER",   "TXT_INPUT"],         // interim: enterprise fallback

  // Standard aliases
  ["TEXT_INPUT",     "TXT_INPUT"],
  ["TEXTAREA",       "TXT_AREA"],
  ["SWITCH",         "BOOL_SWITCH"],
  ["TOGGLE",         "BOOL_SWITCH"],
  ["CHECKBOX",       "BOOL_CHECKBOX"],
  ["RADIO_GROUP",    "BOOL_RADIOGROUP"],
  ["DATE_PICKER",    "DATE"],
  ["DATETIME_PICKER","DATE_DATETIME"],
  ["TIME_PICKER",    "DATE_TIME"],
  ["LOOKUP",         "SEL_LOOKUP"],
  ["DROPDOWN",       "SEL_DROPDOWN"],
  ["MULTISELECT",    "SEL_MULTISELECT"],
  ["NUMBER_INPUT",   "NUM_INTEGER"],
  ["INTEGER",        "NUM_INTEGER"],
  ["DECIMAL_INPUT",  "NUM_DECIMAL"],
  ["DECIMAL",        "NUM_DECIMAL"],
  ["CURRENCY_INPUT", "NUM_CURRENCY"],
  ["PERCENTAGE",     "NUM_PERCENTAGE"],
  ["EMAIL_INPUT",    "TXT_EMAIL"],
  ["EMAIL",          "TXT_EMAIL"],
  ["PHONE_INPUT",    "TXT_PHONE"],
  ["PHONE",          "TXT_PHONE"],
  ["URL_INPUT",      "TXT_URL"],
  ["URL",            "TXT_URL"],
  ["PASSWORD",       "TXT_PASSWORD"],
  ["IMAGE_UPLOAD",   "DOC_IMAGEUPLOAD"],
];

// ─── Valid ControlCategory values ─────────────────────────────────────────────

const VALID_CATEGORIES = new Set([
  "TEXT", "NUMBER", "DATE", "BOOLEAN", "SELECTION", "DOCUMENT", "MEDIA", "ADVANCED",
]);

const VALID_TIERS = new Set(["CORE", "ENTERPRISE", "PLUGIN"]);
const VALID_MATURITIES = new Set(["Experimental", "Preview", "Stable", "Deprecated"]);

// ─── Group A: Canonical Core Control Resolution ───────────────────────────────

describe("VS05F2 Certification — Group A: Core Control Resolution", () => {
  describe.each(CORE_CONTROLS)("Control: %s", (code) => {
    it("A1 — resolves to a React component", () => {
      const Component = resolveControl(code, "1.0.0");
      expect(typeof Component).toBe("function");
    });

    it("A2 — is NOT DiagnosticControl", () => {
      const Component = resolveControl(code, "1.0.0");
      expect(Component).not.toBe(DiagnosticControl);
    });

    it("A3 — is NOT ProductionFallbackControl", () => {
      const Component = resolveControl(code, "1.0.0");
      expect(Component).not.toBe(ProductionFallbackControl);
    });
  });
});

// ─── Group B: RuntimeControlDefinition Catalog Completeness ──────────────────

describe("VS05F2 Certification — Group B: Catalog Completeness", () => {
  describe.each(CORE_CONTROLS)("Control Definition: %s", (code) => {
    let def: ReturnType<typeof getControlDefinition>;

    beforeAll(() => {
      def = getControlDefinition(code);
    });

    it("B4 — definition exists in registry", () => {
      expect(def).toBeDefined();
    });

    it("B5 — ControlCapabilities object present with required flags", () => {
      expect(def?.capabilities).toBeDefined();
      expect(typeof def?.capabilities.supportsValidation).toBe("boolean");
      expect(typeof def?.capabilities.supportsAccessibility).toBe("boolean");
    });

    it("B6 — propertySchema is an array", () => {
      expect(Array.isArray(def?.propertySchema)).toBe(true);
    });

    it("B7 — defaultProperties is a plain object", () => {
      expect(def?.defaultProperties).toBeDefined();
      expect(typeof def?.defaultProperties).toBe("object");
    });

    it("B8 — category is a valid ControlCategory", () => {
      expect(VALID_CATEGORIES.has(def?.category as string)).toBe(true);
    });

    it("B9 — displayName is a non-empty string", () => {
      expect(typeof def?.displayName).toBe("string");
      expect((def?.displayName ?? "").length).toBeGreaterThan(0);
    });

    it("B10 — icon is a non-empty string", () => {
      expect(typeof def?.icon).toBe("string");
      expect((def?.icon ?? "").length).toBeGreaterThan(0);
    });

    it("B11 — tier is a valid ControlTier", () => {
      expect(VALID_TIERS.has(def?.tier as string)).toBe(true);
    });

    it("B12 — maturity is a valid ControlMaturity", () => {
      expect(VALID_MATURITIES.has(def?.maturity as string)).toBe(true);
    });

    it("B13 — keywords is a non-empty array", () => {
      expect(Array.isArray(def?.keywords)).toBe(true);
      expect((def?.keywords ?? []).length).toBeGreaterThan(0);
    });
  });
});

// ─── Group C: ControlCompatibilityRegistry Alias Resolution ──────────────────

describe("VS05F2 Certification — Group C: Alias Resolution", () => {
  test.each(ALIAS_PAIRS)(
    "alias '%s' resolves to a real component (maps to %s)",
    (alias, expectedCanonical) => {
      const Component = resolveControl(alias, "1.0.0");
      expect(Component).toBeDefined();
      expect(Component).not.toBe(DiagnosticControl);
      expect(Component).not.toBe(ProductionFallbackControl);

      // Verify the alias entry in ControlCompatibilityRegistry
      const entry = ControlCompatibilityRegistry[alias.toUpperCase()];
      expect(entry).toBeDefined();
      expect(entry.targetCode.toUpperCase()).toBe(expectedCanonical.toUpperCase());
    }
  );
});

// ─── Group D: Semver Fallback Resolution ─────────────────────────────────────

describe("VS05F2 Certification — Group D: Semver Fallback", () => {
  test.each(CORE_CONTROLS)(
    "%s: version 1.0.1 falls back to 1.0.0",
    (code) => {
      const Component = resolveControl(code, "1.0.1");
      expect(Component).toBeDefined();
      expect(Component).not.toBe(DiagnosticControl);
      expect(Component).not.toBe(ProductionFallbackControl);
    }
  );

  test.each(CORE_CONTROLS)(
    "%s: version 1.9.9 falls back to 1.x.x",
    (code) => {
      const Component = resolveControl(code, "1.9.9");
      expect(Component).toBeDefined();
      expect(Component).not.toBe(DiagnosticControl);
    }
  );
});

// ─── Group E: Screenshot Regression ──────────────────────────────────────────
//
// These are the exact 5 failures shown in the issue screenshot.
// They MUST never regress.
//

describe("VS05F2 Certification — Group E: Screenshot Regression (must never regress)", () => {
  it("MULTI_SELECT resolves — was showing 'Renderer Not Implemented'", () => {
    const Component = resolveControl("MULTI_SELECT", "1.0");
    expect(Component).not.toBe(DiagnosticControl);
    expect(Component).not.toBe(ProductionFallbackControl);
  });

  it("RICH_TEXT resolves — was showing 'Renderer Not Implemented'", () => {
    const Component = resolveControl("RICH_TEXT", "1.0");
    expect(Component).not.toBe(DiagnosticControl);
    expect(Component).not.toBe(ProductionFallbackControl);
  });

  it("SELECT resolves — was showing 'Renderer Not Implemented'", () => {
    const Component = resolveControl("SELECT", "1.0");
    expect(Component).not.toBe(DiagnosticControl);
    expect(Component).not.toBe(ProductionFallbackControl);
  });

  it("FILE_UPLOAD resolves — was showing 'Renderer Not Implemented'", () => {
    const Component = resolveControl("FILE_UPLOAD", "1.0");
    expect(Component).not.toBe(DiagnosticControl);
    expect(Component).not.toBe(ProductionFallbackControl);
  });

  it("COLOR_PICKER resolves — was showing 'Renderer Not Implemented'", () => {
    const Component = resolveControl("COLOR_PICKER", "1.0");
    expect(Component).not.toBe(DiagnosticControl);
    expect(Component).not.toBe(ProductionFallbackControl);
  });
});

// ─── Group F: RuntimeControlCatalog & ControlMarketplace ─────────────────────

describe("VS05F2 Certification — Group F: Catalog & Marketplace", () => {
  it("Catalog returns all 21 Core controls", () => {
    const coreControls = RuntimeControlCatalog.getByTier("CORE");
    expect(coreControls.length).toBeGreaterThanOrEqual(21);
  });

  it("Catalog search finds TXT_INPUT by keyword 'text'", () => {
    const results = RuntimeControlCatalog.search("text");
    const codes = results.map((r) => r.code);
    expect(codes).toContain("TXT_INPUT");
  });

  it("Catalog search finds SEL_MULTISELECT by keyword 'chips'", () => {
    const results = RuntimeControlCatalog.search("chips");
    const codes = results.map((r) => r.code);
    expect(codes).toContain("SEL_MULTISELECT");
  });

  it("Catalog getPropertySchemaByGroup returns grouped schema", () => {
    const grouped = RuntimeControlCatalog.getPropertySchemaByGroup("SEL_MULTISELECT");
    expect(grouped.has("Appearance")).toBe(true);
    expect(grouped.has("Behavior")).toBe(true);
    expect(grouped.has("Validation")).toBe(true);
  });

  it("ControlCompatibilityRegistry identifies RICH_TEXT as deprecated", () => {
    expect(RuntimeControlCatalog.isDeprecated("RICH_TEXT")).toBe(true);
  });

  it("ControlCompatibilityRegistry suggests TXT_RICHTEXT as replacement for RICH_TEXT", () => {
    const replacement = RuntimeControlCatalog.getSuggestedReplacement("RICH_TEXT");
    expect(replacement).toBe("TXT_RICHTEXT");
  });

  it("ControlMarketplace has @cap/runtime-controls-core installed", () => {
    expect(ControlMarketplace.isInstalled("@cap/runtime-controls-core")).toBe(true);
  });

  it("ControlMarketplace lists 21 Core control codes", () => {
    const codes = ControlMarketplace.getAllProvidedCodes();
    expect(codes.length).toBeGreaterThanOrEqual(21);
    expect(codes).toContain("SEL_MULTISELECT");
  });

  it("Catalog summary shows correct totals", () => {
    const summary = RuntimeControlCatalog.getSummary();
    expect(summary.totalControls).toBeGreaterThanOrEqual(21);
    expect(summary.totalAliases).toBeGreaterThanOrEqual(30);
    expect(summary.byTier["CORE"]).toBeGreaterThanOrEqual(21);
  });
});

// ─── Group G: Version Resilience (VS05F2 Certification Failure Regression) ───
//
// Root cause that caused VS05F2 certification failure:
//   FieldRenderer passed field.version (DB record version) as control version.
//   field.version=2 would look up SEL_DROPDOWN@2.0.0 → not found → DiagnosticControl.
//   Meanwhile DiagnosticControl scanned all entries and found @1.0.0 → "Available Vers. 1.0.0".
//
// These tests assert that resolveControl NEVER returns DiagnosticControl due to version mismatch.
//

describe("VS05F2 Certification — Group G: Version Resilience (must never regress)", () => {
  const VERSION_VARIANTS = ["1", "2", "3", "10", "1.0", "1.0.0", "2.0.0", "5.0.0", "99.0.0"];

  test.each(CORE_CONTROLS)(
    "%s resolves regardless of version passed (DB row version simulation)",
    (code) => {
      for (const v of VERSION_VARIANTS) {
        const Component = resolveControl(code, v);
        expect(Component).toBeDefined();
        expect(Component).not.toBe(DiagnosticControl);
        expect(Component).not.toBe(ProductionFallbackControl);
      }
    }
  );

  it("MULTI_SELECT resolves even when field.version=3 (DB row version bug)", () => {
    const Component = resolveControl("MULTI_SELECT", "3");
    expect(Component).not.toBe(DiagnosticControl);
    expect(Component).not.toBe(ProductionFallbackControl);
  });

  it("FILE_UPLOAD resolves even when field.version=5 (DB row version bug)", () => {
    const Component = resolveControl("FILE_UPLOAD", "5");
    expect(Component).not.toBe(DiagnosticControl);
    expect(Component).not.toBe(ProductionFallbackControl);
  });

  it("SELECT resolves even when field.version=2 (DB row version bug)", () => {
    const Component = resolveControl("SELECT", "2");
    expect(Component).not.toBe(DiagnosticControl);
    expect(Component).not.toBe(ProductionFallbackControl);
  });

  it("RICH_TEXT resolves to TextAreaControl interim (not DiagnosticControl)", () => {
    // RICH_TEXT → TXT_AREA (deprecated interim alias, Enterprise replacedBy TXT_RICHTEXT)
    // Should render TextArea, NOT DiagnosticControl
    const Component = resolveControl("RICH_TEXT", "1.0.0");
    expect(Component).not.toBe(DiagnosticControl);
    expect(Component).not.toBe(ProductionFallbackControl);
    expect(typeof Component).toBe("function");
  });

  it("RICH_TEXT resolves even when field.version=4 (combines alias + version bug)", () => {
    const Component = resolveControl("RICH_TEXT", "4");
    expect(Component).not.toBe(DiagnosticControl);
    expect(Component).not.toBe(ProductionFallbackControl);
  });
});
