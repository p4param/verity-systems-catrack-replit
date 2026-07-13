import { MetadataRegistry } from "@/modules/platform/configuration/registry/metadata-registry";

/**
 * RuntimeRegistry acts as the abstraction layer for the Runtime Engine.
 * It prevents the UI Generator from directly coupling to raw metadata arrays
 * and provides typed accessor methods.
 */
export class RuntimeRegistry {
  
  /**
   * Retrieves a UI Control definition by its ID.
   */
  static getUIControl(id: string) {
    return MetadataRegistry.UIControls.find((c) => c.id === id);
  }

  /**
   * Retrieves a Data Source definition by its ID.
   */
  static getDataSource(id: string) {
    return MetadataRegistry.DataSources.find((s) => s.id === id);
  }

  /**
   * Checks if a specific UI Control is supported by a Data Source
   */
  static isDataSourceSupportedByControl(uiControlId: string, dataSourceId: string): boolean {
    const control = this.getUIControl(uiControlId);
    if (!control) return false;
    // We now use FieldControlDefinition's runtime capabilities
    return control.runtime.capabilities.supportedDataSources.includes(dataSourceId);
  }

  /**
   * Evaluates if a given field definition supports lookup capabilities (has a lookup config).
   */
  static isLookupField(fieldDef: any): boolean {
    return fieldDef.dataSource === "LOOKUP_ENTITY" || fieldDef.dataSource === "LOOKUP_VIEW";
  }

  /**
   * Get formatting rules for a given formatter ID
   */
  static getFormatter(id: string) {
    return MetadataRegistry.Formatters.find((f) => f.id === id);
  }

  /**
   * Fetches the currently ACTIVE runtime artifact package (manifest) for a given module and entity.
   */
  static async getActiveArtifact(moduleCode: string, entityCode: string) {
    // We dynamically import prisma here so we don't break purely frontend usages of the class if they exist,
    // although RuntimeRegistry is largely a server-side abstraction for the Runtime Engine.
    const { prisma } = await import("@/lib/prisma");
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(entityCode);
    const entity = await prisma.configurationEntity.findFirst({
      where: {
        OR: [
          { 
            code: { equals: entityCode, mode: 'insensitive' },
            module: { code: { equals: moduleCode, mode: 'insensitive' } }
          },
          ...(isUuid ? [{ id: entityCode }] : [])
        ]
      }
    });

    if (!entity) return null;

    const artifact = await prisma.runtimeArtifact.findFirst({
      where: {
        entityId: entity.id,
        status: "ACTIVE"
      },
      orderBy: { version: 'desc' }
    });

    return artifact ? artifact : null;
  }
}
