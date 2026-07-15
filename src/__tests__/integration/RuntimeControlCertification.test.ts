import { 
  listControls, 
  resolveControl, 
  getCapabilities, 
  getVersions, 
  getCategories,
  DiagnosticControl,
  ProductionFallbackControl
} from "@/shared/components/runtime/registry/UIControlRegistry";
import { RuntimeControlVersion } from "@/shared/components/runtime/types/framework";

describe("VS05FC - Runtime Controls Quality Gate Certification", () => {
  
  test("should discover categories standard registry definitions list", () => {
    const categories = getCategories();
    expect(categories).toContain("TEXT");
    expect(categories).toContain("NUMBER");
    expect(categories).toContain("DATE");
    expect(categories).toContain("BOOLEAN");
    expect(categories).toContain("SELECTION");
    expect(categories).toContain("DOCUMENT");
  });

  test("should discover and list all registered system controls", () => {
    const list = listControls();
    expect(list.length).toBeGreaterThanOrEqual(10);
    
    // Core codes check
    const codes = list.map(c => c.code);
    expect(codes).toContain("TXT_INPUT");
    expect(codes).toContain("TXT_AREA");
    expect(codes).toContain("NUM_CURRENCY");
    expect(codes).toContain("DATE");
    expect(codes).toContain("BOOL_CHECKBOX");
    expect(codes).toContain("BOOL_SWITCH");
    expect(codes).toContain("BOOL_RADIOGROUP");
    expect(codes).toContain("DOC_FILEUPLOAD");
    expect(codes).toContain("DOC_IMAGEUPLOAD");
    expect(codes).toContain("SEL_DROPDOWN");
    expect(codes).toContain("SEL_LOOKUP");
  });

  test("should resolve semver compatibility versions and match aliases", () => {
    // String legacy version resolves
    const rendererStr = resolveControl("TEXT_INPUT", "1.0");
    expect(rendererStr).toBeDefined();

    // Semver object resolves
    const versionObj: RuntimeControlVersion = { major: 1, minor: 0, patch: 0 };
    const rendererObj = resolveControl("TXT_INPUT", versionObj);
    expect(rendererObj).toBe(rendererStr); // matches TXT_INPUT alias resolver

    // Retrieve active version list
    const versionsList = getVersions("TXT_INPUT");
    expect(versionsList.length).toBeGreaterThan(0);
    expect(versionsList[0].major).toBe(1);
  });

  test("should correctly identify capabilities structure flags", () => {
    const caps = getCapabilities("TXT_AREA");
    expect(caps).toBeDefined();
    expect(caps.supportsSearching).toBe(false); // TXT_AREA has searching disabled
    expect(caps.supportsResponsiveLayout).toBe(true);
    expect(caps.supportsTheme).toBe(true);
  });

  test("should return development or production fallback on non-registered controls", () => {
    const originalEnv = process.env.NODE_ENV;

    // Dev Fallback
    process.env.NODE_ENV = "development";
    const devFallback = resolveControl("NON_EXISTENT_CONTROL");
    expect(devFallback).toBe(DiagnosticControl);

    // Prod Fallback
    process.env.NODE_ENV = "production";
    const prodFallback = resolveControl("NON_EXISTENT_CONTROL");
    expect(prodFallback).toBe(ProductionFallbackControl);

    // Restore Env
    process.env.NODE_ENV = originalEnv;
  });
});
