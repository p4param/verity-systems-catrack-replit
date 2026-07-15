import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/client";
import { logger } from "@/lib/logger";
import { manifestGeneratorService, RuntimeManifest } from "../../runtime/services/manifest-generator";
import { validateLayoutForPublish, LayoutRootSchema } from "../validations/layout-validation";

import { SchemaPlatformEngine } from "./SchemaPlatformEngine";
import type { MigrationManifest } from "./SchemaPlatformTypes";

export interface PublishResult {
  success: boolean;
  artifactVersion: number;
  message?: string;
}

export class PublishService {
  /**
   * Executes the 9-stage Publish Pipeline for an entity.
   *
   * Architecture note — WHY syncSchema runs OUTSIDE the Prisma $transaction:
   *
   * PostgreSQL DDL (CREATE TABLE, ALTER TABLE, CREATE INDEX) causes an implicit
   * COMMIT. When DDL is run inside a Prisma $transaction via $executeRawUnsafe,
   * any DDL error leaves the transaction in state 25P02 ("current transaction is
   * aborted") and all subsequent DML queries in the same transaction are rejected.
   *
   * Fix: DDL phase runs first via an independent db connection (outside tx).
   * If DDL succeeds, the DML phase runs inside a clean Prisma $transaction.
   * If DDL fails, the DML transaction is never started — no 25P02 possible.
   */
  async publishEntity(entityId: string, publishedByUserId?: string): Promise<PublishResult> {
    logger.info(`Starting formal publish pipeline for entity ${entityId}`);
    const generatorVersion = "1.0.0";

    try {
      // ─── PHASE 1: DDL (runs OUTSIDE Prisma transaction) ─────────────────────
      // syncSchema uses $executeRawUnsafe for DDL. DDL must not run inside a
      // Prisma $transaction to avoid the 25P02 aborted-transaction error.
      const schemaPlatformEngine = new SchemaPlatformEngine();
      try {
        await schemaPlatformEngine.syncSchemaOutsideTransaction(entityId, 1);
        logger.info(`DDL phase complete for entity ${entityId}.`);
      } catch (ddlError: any) {
        logger.error(`DDL phase failed for entity ${entityId}: ${ddlError.message}`);
        throw ddlError; // Abort publish — no DML transaction started
      }

      // ─── PHASE 2: DML (Prisma $transaction — no DDL inside) ─────────────────
      const result = await prisma.$transaction(async (tx) => {
        // 1. Metadata Validation
        const entity = await tx.configurationEntity.findUnique({
          where: { id: entityId },
          include: { module: true, fields: true, views: true, layoutViews: true }
        });

        if (!entity) throw new Error("Entity not found");
        if (entity.status !== "DRAFT" && entity.status !== "PUBLISHED") {
          throw new Error(`Cannot publish entity in status: ${entity.status}`);
        }

        // 2.5 Layout Validation
        const validFieldIds = entity.fields.map((f: any) => f.id);
        for (const layoutView of (entity as any).layoutViews || []) {
          try {
            const layoutRoot = LayoutRootSchema.parse(layoutView.layout);
            const result = validateLayoutForPublish(layoutRoot, validFieldIds);
            if (!result.valid) {
              logger.warn(`Layout "${layoutView.code}" has validation warnings:`, { errors: result.errors });
            }
          } catch (parseErr: any) {
            logger.warn(`Layout "${layoutView.code}" has invalid structure: ${parseErr.message}`);
          }
        }

        // 4. Runtime Artifact Generation
        const artifactPayload = await manifestGeneratorService.generateManifest(entityId, tx);

        // 5. Navigation Generation
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
        const currentActive = await tx.runtimeArtifact.findFirst({
          where: { entityId, status: "ACTIVE" },
          orderBy: { version: "desc" }
        });

        const nextVersion = currentActive ? currentActive.version + 1 : 1;

        await tx.runtimeArtifact.updateMany({
          where: { entityId, status: "ACTIVE" },
          data: { status: "INACTIVE" }
        });

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

