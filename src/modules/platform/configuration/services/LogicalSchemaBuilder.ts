import { 
  SchemaManifest, 
  TableSchemaObject, 
  ColumnDefinition, 
  ConstraintDefinition, 
  IndexDefinition, 
  PersistenceProfile, 
  AuditProfile 
} from "./SchemaPlatformTypes";

export class LogicalSchemaBuilder {
  /**
   * Translates entity metadata into a database-independent logical SchemaManifest.
   */
  static build(entity: any): SchemaManifest {
    const moduleCode = entity.module.code.toLowerCase();
    const entityCode = entity.code.toLowerCase();
    const tableName = `${moduleCode}_${entityCode}`;

    // Read metadata profile configurations (with sensible defaults)
    const entityMetadata = typeof entity.metadata === "string" 
      ? JSON.parse(entity.metadata) 
      : (entity.metadata || {});

    const persistenceProfile: PersistenceProfile = entityMetadata.persistenceProfile || "MASTER";
    const auditProfile: AuditProfile = entityMetadata.auditProfile || "FULL";

    // 1. Column Definitions
    const columns: ColumnDefinition[] = [];

    // Primary Key
    columns.push({
      name: "id",
      dataType: "UUID",
      required: true,
      isPrimaryKey: true,
    });

    // Tenant Isolation
    const tenantIsolation = entityMetadata.tenantIsolation !== false;
    if (tenantIsolation) {
      columns.push({
        name: "tenant_id",
        dataType: "INTEGER",
        required: true,
        isPrimaryKey: false,
      });
    }

    // Process fields from metadata
    const fields = entity.fields || [];
    for (const field of fields) {
      const fieldProps = field.properties || {};
      const name = field.code.toLowerCase();

      // Skip manually declared ID or Tenant fields to avoid duplicates
      if (name === "id" || name === "tenant_id") continue;

      let dataType = field.dataType;
      let length = fieldProps.length || fieldProps.characterLimit || undefined;

      // ─── Physical dataType normalization ──────────────────────────────────────
      // The physical DB dataType is determined by the CONTROL TYPE, not field.dataType.
      // field.dataType is the CAP logical type (for display/validation); the physical
      // storage type is a separate concern. This decoupling prevents unsafe migration
      // errors when field.dataType is inconsistent with the uiControl.

      // Lookup controls always store a foreign-key UUID on the physical table
      const lookupControls = ["LOOKUP", "SEL_LOOKUP", "AUTOCOMP"];
      if (lookupControls.includes(field.uiControl)) {
        dataType = "UUID";
      }

      // Multi-lookup / multi-select controls store serialized JSON arrays
      const jsonControls = ["MULTI_LOOKUP", "MULTI_SELECT", "SEL_MULTISELECT", "CHECKBOX_GROUP", "ATTACHMENT", "IMAGE_UPLOAD", "FILE_UPLOAD", "IMAGE"];
      if (jsonControls.includes(field.uiControl)) {
        dataType = "JSON";
      }

      // TextArea controls use TEXT (unlimited) instead of VARCHAR
      if (dataType === "STRING" && (field.uiControl === "TEXTAREA" || field.uiControl === "TXT_AREA" || field.uiControl === "RICH_TEXT" || field.uiControl === "MARKDOWN")) {
        dataType = "TEXT";
      }

      columns.push({
        name,
        dataType,
        length,
        required: field.required || false,
        defaultValue: field.defaultValue || undefined,
        isPrimaryKey: false,
        isGenerated: fieldProps.isGenerated || false,
        generationExpression: fieldProps.generationExpression || undefined,
      });
    }

    // Append Audit Columns based on Profile
    if (auditProfile === "STANDARD" || auditProfile === "FULL" || auditProfile === "LEDGER") {
      columns.push({
        name: "created_at",
        dataType: "DATETIME",
        required: true,
        isPrimaryKey: false,
        defaultValue: "CURRENT_TIMESTAMP",
      });
      columns.push({
        name: "created_by",
        dataType: "UUID",
        required: false,
        isPrimaryKey: false,
      });
    }

    if (auditProfile === "FULL") {
      columns.push({
        name: "updated_at",
        dataType: "DATETIME",
        required: true,
        isPrimaryKey: false,
        defaultValue: "CURRENT_TIMESTAMP",
      });
      columns.push({
        name: "updated_by",
        dataType: "UUID",
        required: false,
        isPrimaryKey: false,
      });

      // Soft Delete Hook configuration
      const softDelete = entityMetadata.softDelete !== false;
      if (softDelete) {
        columns.push({
          name: "is_deleted",
          dataType: "BOOLEAN",
          required: true,
          isPrimaryKey: false,
          defaultValue: "false",
        });
        columns.push({
          name: "deleted_at",
          dataType: "DATETIME",
          required: false,
          isPrimaryKey: false,
        });
        columns.push({
          name: "deleted_by",
          dataType: "UUID",
          required: false,
          isPrimaryKey: false,
        });
      }
    }

    // Optimistic Concurrency Row Versioning
    const optimisticLocking = entityMetadata.optimisticLocking !== false;
    if (optimisticLocking) {
      columns.push({
        name: "row_version",
        dataType: "BIGINT",
        required: true,
        isPrimaryKey: false,
        defaultValue: "1",
      });
    }

    // 2. Index Definitions
    const indexes: IndexDefinition[] = [];

    // Automatic Indexes for marked fields
    for (const field of fields) {
      if (field.indexed || field.isIndexed || field.properties?.indexed) {
        indexes.push({
          name: `idx_${tableName}_${field.code.toLowerCase()}`,
          columns: [field.code.toLowerCase()],
          isUnique: false,
        });
      }
    }

    // Composite indexes configured in entity metadata
    const compositeIndexes = entityMetadata.compositeIndexes || [];
    for (const compIdx of compositeIndexes) {
      indexes.push({
        name: compIdx.name || `idx_${tableName}_` + compIdx.columns.join("_"),
        columns: compIdx.columns.map((c: string) => c.toLowerCase()),
        isUnique: compIdx.isUnique || false,
      });
    }

    // 3. Constraints (Primary Key, Unique, Check, and Foreign Keys)
    const constraints: ConstraintDefinition[] = [];

    // Primary Key Constraint
    constraints.push({
      name: `pk_${tableName}`,
      type: "PRIMARY",
      columns: ["id"],
    });

    // Unique Constraints
    for (const field of fields) {
      if (field.properties?.unique || field.isUnique) {
        constraints.push({
          name: `uq_${tableName}_${field.code.toLowerCase()}`,
          type: "UNIQUE",
          columns: [field.code.toLowerCase()],
        });
      }
    }

    // Foreign Keys for relationship references
    for (const field of fields) {
      if ((field.uiControl === "LOOKUP" || field.uiControl === "SEL_LOOKUP") && field.lookupDefinition) {
        const refEntityCode = field.lookupDefinition.referencedEntityCode?.toLowerCase();
        const refModuleCode = field.lookupDefinition.referencedModuleCode?.toLowerCase() || moduleCode;
        
        if (refEntityCode) {
          constraints.push({
            name: `fk_${tableName}_${field.code.toLowerCase()}`,
            type: "FOREIGN",
            columns: [field.code.toLowerCase()],
            refTable: `${refModuleCode}_${refEntityCode}`,
            refColumns: ["id"],
          });
        }
      }
    }

    // Check Constraints
    const customConstraints = entityMetadata.constraints || [];
    for (const constr of customConstraints) {
      constraints.push({
        name: constr.name || `chk_${tableName}_` + constr.columns.join("_"),
        type: constr.type || "CHECK",
        columns: constr.columns || [],
        checkExpression: constr.checkExpression,
      });
    }

    const tableSchema: TableSchemaObject = {
      type: "TABLE",
      name: tableName,
      columns,
      constraints,
      indexes,
      persistenceProfile,
      auditProfile,
    };

    return {
      entityId: entity.id,
      persistenceModelCode: entity.code,
      schemaVersion: entity.version || 1,
      tables: [tableSchema],
    };
  }
}

