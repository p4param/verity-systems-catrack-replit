import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/client";
import { logger } from "@/lib/logger";
import type {
  PersistenceModel,
  PersistenceTable,
  ColumnSpec,
  PersistencePolicy,
  DeleteStrategy,
  LockingStrategy,
  AuditProfile,
} from "@/modules/platform/persistence/types/PersistenceModel";

export interface RuntimeManifest {
  module: string;
  entity: string;
  entityId: string;
  entityName: string;
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
    defaultLayoutViewId: string;
    defaultLayoutViewCode: string;
    dataViews: any[];
    layoutViews: any[];
    shared: any;
  };
  /**
   * Physical persistence mapping — set at Publish time by PublishService.
   * This is the source of truth for repository routing in RuntimeDataEngine.
   * Never inspect platform_migrations at runtime — read this field instead.
   *
   * storageMode:
   *   "PHYSICAL" → entity has been published and physical table exists (DynamicTableRepository)
   *   "EAV"      → entity uses legacy entity_records / entity_values storage (EavRepository)
   */
  persistence?: {
    /** Active persistence provider code. */
    provider: "POSTGRES" | string;
    /** Routing decision for RuntimeDataEngine. Set after successful CM-002 schema sync. */
    storageMode: "PHYSICAL" | "EAV";
    /** Full physical database mapping — tables, columns, indexes, relationships. */
    model: PersistenceModel;
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
        layoutViews: true,
      }
    });

    if (!entity) {
      throw new Error(`Cannot generate manifest: Entity ${entityId} not found`);
    }

    const moduleCode = entity.module.code.toLowerCase();
    const entityCode = entity.code.toLowerCase();
    const route = `/runtime/${moduleCode}/${entityCode}`;
    
    // Find data view defaults
    const defaultDataView: { id?: string; code?: string } = entity.views.find((v: any) => v.isDefault) || entity.views[0] || {};

    // Find layout view defaults
    const defaultLayoutView: { id?: string; code?: string } = entity.layoutViews.find((v: any) => v.isDefault) || entity.layoutViews[0] || {};
    
    // Build the manifest object according to architectural guidelines
    const manifest: RuntimeManifest = {
      module: moduleCode,
      entity: entityCode,
      entityId: entity.id,
      entityName: entity.name,
      route,
      permissions: {
        view: `${entity.code}.View`,
        create: `${entity.code}.Create`,
        edit: `${entity.code}.Edit`,
        delete: `${entity.code}.Delete`
      },
      numberStrategy: "AUTO",
      searchEnabled: entity.allowAudit,
      fields: entity.fields,
      presentation: {
        version: "1.0",
        defaultDataViewId: defaultDataView.id || "",
        defaultDataViewCode: defaultDataView.code || "GRID",
        defaultLayoutViewId: defaultLayoutView.id || "",
        defaultLayoutViewCode: defaultLayoutView.code || "",
        dataViews: entity.views.map((v: any) => ({ ...v, category: "DATA" })),
        layoutViews: entity.layoutViews.map((v: any) => ({
          id: v.id,
          code: v.code,
          name: v.name,
          description: v.description,
          layoutType: v.layoutType,
          isDefault: v.isDefault,
          version: v.version,
          layout: v.layout,
        })),
        shared: {},
      },
    };

    // ── Build Persistence Model ──────────────────────────────────────────────
    //
    // IMPORTANT: Always query platform_migrations via the top-level prisma client,
    // NEVER via tx (the transaction client).
    //
    // Reason: platform_migrations is written by SchemaPlatformEngine *before* the
    // DML transaction starts (DDL is outside the transaction). If this raw query
    // is executed via tx and platform_migrations doesn't exist yet, PostgreSQL
    // throws an error that puts tx into state 25P02 (aborted transaction), making
    // ALL subsequent tx.* calls fail — including navigationSearchIndex.findFirst().
    //
    try {
      const migrations = (await prisma.$queryRawUnsafe(
        `SELECT manifest_json, succeeded FROM platform_migrations WHERE entity_id = $1 AND succeeded = true ORDER BY applied_at DESC LIMIT 1`,
        entityId
      )) as any[];

      if (migrations && migrations.length > 0 && migrations[0].manifest_json) {
        // Parse the schema manifest to reconstruct physical table mapping
        const schemaManifest = typeof migrations[0].manifest_json === "string"
          ? JSON.parse(migrations[0].manifest_json)
          : migrations[0].manifest_json;

        const tableName: string = schemaManifest.tableName ?? `${moduleCode}_${entityCode}`;
        const schemaName: string = schemaManifest.schema ?? "public";

        // Build ColumnSpec array from entity fields
        const businessColumns: ColumnSpec[] = (entity.fields as any[]).map((f: any) => ({
          name: f.code.toLowerCase(),
          dataType: f.dataType,
          sqlType: mapDataTypeToSql(f.dataType),
          required: f.required ?? false,
          isPrimaryKey: false,
          isSystem: false,
          defaultValue: f.defaultValue ?? undefined,
        }));

        // System columns always present on physical tables
        const systemColumns: ColumnSpec[] = [
          { name: "id", dataType: "UUID", sqlType: "UUID", required: true, isPrimaryKey: true, isSystem: true },
          { name: "tenant_id", dataType: "INTEGER", sqlType: "INTEGER", required: true, isPrimaryKey: false, isSystem: true },
          { name: "record_number", dataType: "STRING", sqlType: "VARCHAR(50)", required: false, isPrimaryKey: false, isSystem: true },
          { name: "status", dataType: "STRING", sqlType: "VARCHAR(50)", required: false, isPrimaryKey: false, isSystem: true },
          { name: "row_version", dataType: "INTEGER", sqlType: "INTEGER", required: false, isPrimaryKey: false, isSystem: true },
          { name: "is_deleted", dataType: "BOOLEAN", sqlType: "BOOLEAN", required: true, isPrimaryKey: false, isSystem: true, defaultValue: "false" },
          { name: "deleted_at", dataType: "DATETIME", sqlType: "TIMESTAMP WITH TIME ZONE", required: false, isPrimaryKey: false, isSystem: true },
          { name: "deleted_by", dataType: "UUID", sqlType: "UUID", required: false, isPrimaryKey: false, isSystem: true },
          { name: "created_at", dataType: "DATETIME", sqlType: "TIMESTAMP WITH TIME ZONE", required: false, isPrimaryKey: false, isSystem: true },
          { name: "created_by", dataType: "UUID", sqlType: "UUID", required: false, isPrimaryKey: false, isSystem: true },
          { name: "updated_at", dataType: "DATETIME", sqlType: "TIMESTAMP WITH TIME ZONE", required: false, isPrimaryKey: false, isSystem: true },
          { name: "updated_by", dataType: "UUID", sqlType: "UUID", required: false, isPrimaryKey: false, isSystem: true },
        ];

        const primaryTable: PersistenceTable = {
          name: tableName,
          schema: schemaName,
          isPrimary: true,
          columns: [...systemColumns, ...businessColumns],
          indexes: [],
        };

        const policy: PersistencePolicy = {
          deleteStrategy: "SOFT",
          lockingStrategy: "ROW_VERSION",
          auditProfile: "STANDARD",
          softDelete: {
            enabled: true,
            field: "is_deleted",
            deletedAtField: "deleted_at",
            deletedByField: "deleted_by",
          },
          concurrency: {
            field: "row_version",
            strategy: "ROW_VERSION",
          },
        };

        const persistenceModel: PersistenceModel = {
          tables: [primaryTable],
          relationships: [],
          primaryKey: "id",
          policy,
        };

        manifest.persistence = {
          provider: "POSTGRES",
          storageMode: "PHYSICAL",
          model: persistenceModel,
        };

        logger.info(`[ManifestGenerator] storageMode=PHYSICAL for ${entity.code} → ${tableName}`);
      } else {
        // No successful migration → EAV fallback
        manifest.persistence = buildEavPersistence();
        logger.info(`[ManifestGenerator] storageMode=EAV for ${entity.code} (no published schema)`);
      }
    } catch (err: any) {
      // platform_migrations may not exist in dev/test environments
      // Fall back to EAV gracefully
      if (err?.message?.includes("platform_migrations")) {
        logger.warn(`[ManifestGenerator] platform_migrations table not found — defaulting to EAV for ${entity.code}`);
      } else {
        logger.error(`[ManifestGenerator] Persistence model build failed for ${entity.code}:`, err);
      }
      manifest.persistence = buildEavPersistence();
    }

    logger.info(`Generated Runtime Manifest for ${entity.code}`, { entityId, module: moduleCode });

    return manifest;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildEavPersistence(): RuntimeManifest["persistence"] {
  return {
    provider: "POSTGRES",
    storageMode: "EAV",
    model: {
      tables: [],
      relationships: [],
      primaryKey: "id",
      policy: {
        deleteStrategy: "SOFT",
        lockingStrategy: "NONE",
        auditProfile: "STANDARD",
        softDelete: { enabled: true, field: "isDeleted", deletedAtField: "deletedAt", deletedByField: "deletedBy" },
        concurrency: { field: "version", strategy: "NONE" },
      },
    },
  };
}

function mapDataTypeToSql(dataType: string): string {
  switch ((dataType ?? "").toUpperCase()) {
    case "STRING": return "VARCHAR(255)";
    case "TEXT": return "TEXT";
    case "INTEGER": case "NUMBER": return "INTEGER";
    case "DECIMAL": return "NUMERIC(18,6)";
    case "BOOLEAN": return "BOOLEAN";
    case "DATE": return "DATE";
    case "DATETIME": return "TIMESTAMP WITH TIME ZONE";
    case "UUID": case "REFERENCE": return "UUID";
    case "JSON": return "JSONB";
    default: return "TEXT";
  }
}

export const manifestGeneratorService = new ManifestGeneratorService();
