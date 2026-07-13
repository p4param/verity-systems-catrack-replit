import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/client";
import { logger } from "@/lib/logger";

export interface RuntimeManifest {
  module: string;
  entity: string;
  route: string;
  permissions: {
    view: string;
    create: string;
    edit: string;
    delete: string;
  };
  numberStrategy: string;
  searchEnabled: boolean;
  fields: any[];
  presentation: {
    version: string;
    defaultDataViewId: string;
    defaultDataViewCode: string;
    defaultLayoutView: string;
    dataViews: any[];
    layoutViews: any[];
    shared: any;
  };
  _artifact?: {
    version: number;
    generatedAt: string;
    generatorVersion: string;
  };
}

export class ManifestGeneratorService {
  /**
   * Generates a Runtime Manifest for a given entity and optionally saves it.
   */
  async generateManifest(entityId: string, tx?: Prisma.TransactionClient): Promise<RuntimeManifest> {
    const db = tx || prisma;
    
    const entity = await db.configurationEntity.findUnique({
      where: { id: entityId },
      include: {
        module: true,
        fields: {
          include: { 
            options: { orderBy: { displayOrder: 'asc' } },
            lookupDefinition: true
          },
          orderBy: { displayOrder: 'asc' }
        },
        views: true,
      }
    });

    if (!entity) {
      throw new Error(`Cannot generate manifest: Entity ${entityId} not found`);
    }

    const moduleCode = entity.module.code.toLowerCase();
    const entityCode = entity.code.toLowerCase();
    const route = `/runtime/${moduleCode}/${entityCode}`;
    
    // Find defaults
    const defaultViewObj = entity.views.find((v: any) => v.isDefault) || entity.views[0] || {};
    
    // Build the manifest object according to architectural guidelines
    const manifest: RuntimeManifest = {
      module: moduleCode,
      entity: entityCode,
      route,
      permissions: {
        view: `${entity.code}.View`,
        create: `${entity.code}.Create`,
        edit: `${entity.code}.Edit`,
        delete: `${entity.code}.Delete`
      },
      numberStrategy: "AUTO",
      searchEnabled: entity.allowAudit, // Or other flag if appropriate
      fields: entity.fields,
      presentation: {
        version: "1.0",
        defaultDataViewId: defaultViewObj.id || "",
        defaultDataViewCode: defaultViewObj.code || "GRID",
        defaultLayoutView: "MAIN", // Placeholder for VS05B
        dataViews: entity.views.map((v: any) => ({ ...v, category: "DATA" })),
        layoutViews: [], // Placeholder for VS05B
        shared: {}, // Placeholder for reusable presentation components
      },
    };

    logger.info(`Generated Runtime Manifest for ${entity.code}`, { entityId, module: moduleCode });

    return manifest;
  }
}

export const manifestGeneratorService = new ManifestGeneratorService();
