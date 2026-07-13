import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/client";
import { logger } from "@/lib/logger";
import { manifestGeneratorService, RuntimeManifest } from "../../runtime/services/manifest-generator";

export interface PublishResult {
  success: boolean;
  artifactVersion: number;
  message?: string;
}

export class PublishService {
  /**
   * Executes the 9-stage transactional Publish Pipeline for an entity.
   */
  async publishEntity(entityId: string, publishedByUserId?: string): Promise<PublishResult> {
    logger.info(`Starting formal publish pipeline for entity ${entityId}`);
    const generatorVersion = "1.0.0"; // Increment if pipeline changes

    try {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Metadata Validation
        const entity = await tx.configurationEntity.findUnique({
          where: { id: entityId },
          include: { module: true, fields: true, views: true }
        });

        if (!entity) throw new Error("Entity not found");
        if (entity.status !== "DRAFT" && entity.status !== "PUBLISHED") {
            throw new Error(`Cannot publish entity in status: ${entity.status}`);
        }
        
        // 2. Dependency Validation
        // (Ensure lookups point to valid entities. In real system, this would scan entity.fields for lookup definitions)
        
        // 3. Permission Validation
        // In this step we could generate standard permissions if they don't exist.
        // For CPC-001, permissions are dynamically enforced via claims.

        // 4. Runtime Artifact Generation
        const artifactPayload = await manifestGeneratorService.generateManifest(entityId, tx);
        
        // 5. Navigation Generation
        // Inject route into configuration entity for runtime registry to pick up
        const route = `/runtime/${entity.module.code.toLowerCase()}/${entity.code.toLowerCase()}`;
        
        if (entity.showInNavigation) {
          const existingNav = await tx.navigationItem.findFirst({ where: { entityId: entityId } });
          
          if (existingNav) {
            await tx.navigationItem.update({
              where: { id: existingNav.id },
              data: {
                title: entity.name,
                route,
                icon: entity.icon || "box",
                updatedBy: publishedByUserId
              }
            });
          } else {
            await tx.navigationItem.create({
              data: {
                title: entity.name,
                route,
                icon: entity.icon || "box",
                visible: true,
                entityId: entityId,
                createdBy: publishedByUserId || "system",
                updatedBy: publishedByUserId || "system",
              }
            });
          }
        }
        
        // 6. Runtime Index Registration
        // Mark entity for search indexing if not already
        const existingSearch = await tx.navigationSearchIndex.findFirst({ where: { route } });
        if (existingSearch) {
          await tx.navigationSearchIndex.update({
            where: { id: existingSearch.id },
            data: { title: entity.name, description: entity.description }
          });
        } else {
          await tx.navigationSearchIndex.create({
            data: {
              title: entity.name,
              route,
              description: entity.description || `Manage ${entity.pluralName}`,
              keywords: entity.code,
            }
          });
        }
        
        // 7 & 8. Cache Refresh & Version Increment
        // Find current active version
        const currentActive = await tx.runtimeArtifact.findFirst({
          where: { entityId, status: "ACTIVE" },
          orderBy: { version: 'desc' }
        });
        
        const nextVersion = currentActive ? currentActive.version + 1 : 1;
        
        // Mark old artifacts as inactive
        await tx.runtimeArtifact.updateMany({
          where: { entityId, status: "ACTIVE" },
          data: { status: "INACTIVE" }
        });
        
        // Insert new artifact
        const newArtifact = await tx.runtimeArtifact.create({
          data: {
            entityId,
            version: nextVersion,
            status: "ACTIVE",
            payload: artifactPayload as unknown as Prisma.InputJsonValue,
            generatedBy: publishedByUserId || null,
            generatorVersion
          }
        });

        // Update entity status and route
        await tx.configurationEntity.update({
          where: { id: entityId },
          data: { 
            status: "PUBLISHED", 
            route,
            version: { increment: 1 }
          }
        });

        return {
          success: true,
          artifactVersion: newArtifact.version
        };
      });

      logger.info(`Publish pipeline completed successfully for entity ${entityId}. New Version: ${result.artifactVersion}`);
      return result;

    } catch (error: any) {
      logger.error(`Publish pipeline failed for entity ${entityId}: ${error.message}`);
      throw error;
    }
  }
}

export const publishService = new PublishService();
