/**
 * ControlMarketplace — Namespace Reservation (VS05F2)
 *
 * This is a stub. The Marketplace becomes active in a future milestone (VS06+).
 *
 * Future architecture:
 *   ControlCompatibilityRegistry → UIControlRegistry → RuntimeControlCatalog → ControlMarketplace
 *
 * The Marketplace is the discovery layer over installed plugin packages:
 *   @cap/runtime-controls-core          — base platform controls (21 controls)
 *   @cap/runtime-controls-enterprise    — RichText, Signature, Rating, Slider, Color, Tags, JSON
 *   @cap/runtime-controls-hse           — HSE-specific controls (Incident widgets, Risk matrix)
 *   @cap/runtime-controls-finance       — Finance controls (GL lookup, approval matrix)
 *   @cap/runtime-controls-ai            — AI-assisted input, smart suggestions, NLP fields
 *   @cap/runtime-controls-dev           — Developer tools (Code editor, JSON viewer, debug panels)
 *
 * A plugin package calls registerControl() for each control it provides.
 * The Marketplace tracks which packages are installed and surfaces them for:
 *   - Form Designer control picker
 *   - Platform Settings → Installed Packages
 *   - AI-assisted form generation
 *
 * No changes to UIControlRegistry are required when a package is installed.
 * The plugin model is already in place.
 */

import { ControlMarketplaceEntry } from "../types/framework";

/** In-memory registry of installed plugin packages. */
const installedPackages = new Map<string, ControlMarketplaceEntry>();

export class ControlMarketplace {
  /**
   * Register an installed control package.
   * Called by each plugin package on import/initialization.
   */
  static registerPackage(entry: ControlMarketplaceEntry): void {
    installedPackages.set(entry.packageName, entry);
  }

  /** List all installed packages. */
  static getInstalledPackages(): ControlMarketplaceEntry[] {
    return Array.from(installedPackages.values());
  }

  /** Check if a specific package is installed. */
  static isInstalled(packageName: string): boolean {
    return installedPackages.has(packageName);
  }

  /** Get all control codes provided by installed packages. */
  static getAllProvidedCodes(): string[] {
    return Array.from(installedPackages.values()).flatMap((p) => p.controlCodes);
  }
}

// Register the core package as always-installed
ControlMarketplace.registerPackage({
  packageName: "@cap/runtime-controls-core",
  packageVersion: "1.0.0",
  controlCodes: [
    "TXT_INPUT", "TXT_AREA", "TXT_PASSWORD", "TXT_EMAIL", "TXT_PHONE", "TXT_URL",
    "NUM_INTEGER", "NUM_DECIMAL", "NUM_CURRENCY", "NUM_PERCENTAGE",
    "DATE", "DATE_DATETIME", "DATE_TIME",
    "BOOL_CHECKBOX", "BOOL_SWITCH", "BOOL_RADIOGROUP",
    "SEL_DROPDOWN", "SEL_MULTISELECT", "SEL_LOOKUP",
    "DOC_FILEUPLOAD", "DOC_IMAGEUPLOAD",
  ],
  installedAt: new Date().toISOString(),
  tier: "CORE",
});

export default ControlMarketplace;
