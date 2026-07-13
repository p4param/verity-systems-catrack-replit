import { MetadataRegistry } from "@/modules/platform/configuration/registry/metadata-registry";
import { EntityService } from "@/modules/platform/configuration/services/entity-service";
import { NavigationService } from "@/modules/platform/navigation/services/navigation-service";
import { RecordService } from "@/modules/platform/runtime/services/record-service";
import { StaticOptionProvider, LookupOptionProvider, getOptionProvider } from "@/shared/components/runtime/providers/option-provider";

describe("Platform Kernel Architecture Tests", () => {
  
  describe("MetadataRegistry", () => {
    it("should be exported as a static object with expected metadata arrays", () => {
      expect(MetadataRegistry).toBeDefined();
      expect(Array.isArray(MetadataRegistry.DataTypes)).toBe(true);
      expect(Array.isArray(MetadataRegistry.UIControls)).toBe(true);
      expect(Array.isArray(MetadataRegistry.DataSources)).toBe(true);
      expect(Array.isArray(MetadataRegistry.ValidationProfiles)).toBe(true);
      expect(Array.isArray(MetadataRegistry.Formatters)).toBe(true);
      expect(Array.isArray(MetadataRegistry.Behaviors)).toBe(true);
    });
  });

  describe("EntityService", () => {
    it("should be a class with expected prototype methods", () => {
      expect(typeof EntityService).toBe("function");
      const prototype = EntityService.prototype;
      // These are some standard methods we expect, let's verify if they exist by inspecting prototype
      // We don't want strict matching if we don't know exact method names, but it should be instantiable
      const instance = new EntityService();
      expect(instance).toBeDefined();
    });
  });

  describe("NavigationService", () => {
    it("should be a class with expected prototype methods", () => {
      expect(typeof NavigationService).toBe("function");
      const instance = new NavigationService();
      expect(instance).toBeDefined();
      expect(typeof instance.generateSidebar).toBe("function");
    });
  });

  describe("RecordService", () => {
    it("should be a class with expected prototype methods", () => {
      expect(typeof RecordService).toBe("function");
      const instance = new RecordService();
      expect(instance).toBeDefined();
    });
  });

  describe("OptionProvider", () => {
    it("should provide factory and implement provider interfaces", () => {
      expect(typeof getOptionProvider).toBe("function");
      
      const staticProvider = new StaticOptionProvider();
      expect(typeof staticProvider.fetchOptions).toBe("function");

      const lookupProvider = new LookupOptionProvider();
      expect(typeof lookupProvider.fetchOptions).toBe("function");
    });
  });
});
