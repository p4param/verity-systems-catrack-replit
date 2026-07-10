import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/client";
import { logger } from "@/lib/logger";

export interface RuntimeManifest {
  module: string;
  entity: string;
  route: string;
  defaultView: string;
  defaultForm: string;
  permissions: {
    view: string;
    create: string;
    edit: string;
    delete: string;
  };
  numberStrategy: string;
  searchEnabled: boolean;
  fields: any[];
  views: any[];
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
          include: { options: { orderBy: { displayOrder: 'asc' } } },
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
    const defaultView = entity.views.find((v: any) => v.isDefault)?.code || entity.views[0]?.code || "GRID";
    
    // Build the manifest object according to architectural guidelines
    const manifest: RuntimeManifest = {
      module: moduleCode,
      entity: entityCode,
      route,
      defaultView,
      defaultForm: "MAIN", // Future: support multiple form layouts
      permissions: {
        view: `${entity.code}.View`,
        create: `${entity.code}.Create`,
        edit: `${entity.code}.Edit`,
        delete: `${entity.code}.Delete`
      },
      numberStrategy: "AUTO",
      searchEnabled: entity.allowAudit, // Or other flag if appropriate
      fields: entity.fields,
      views: entity.views,
    };

    // Store in metadata.runtimeManifest
    const existingMetadata = entity.metadata && typeof entity.metadata === "object" ? entity.metadata : {};
    
    await db.configurationEntity.update({
      where: { id: entityId },
      data: {
        route, // Update the actual route column as well
        metadata: {
          ...(existingMetadata as Record<string, any>),
          runtimeManifest: manifest
        }
      }
    });

    logger.info(`Generated Runtime Manifest for ${entity.code}`, { entityId, module: moduleCode });

    return manifest;
  }
}

export const manifestGeneratorService = new ManifestGeneratorService();
