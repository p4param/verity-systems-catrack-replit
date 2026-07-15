import { prisma } from "@/lib/prisma";
import { PlatformModuleService } from "@/modules/platform/configuration/services/platform-module-service";
import { EntityService } from "@/modules/platform/configuration/services/entity-service";
import { FieldService } from "@/modules/platform/configuration/services/field-service";
import { publishService } from "@/modules/platform/configuration/services/publish-service";
import { SchemaPlatformEngine } from "@/modules/platform/configuration/services/SchemaPlatformEngine";
import { formatUserIdToUuid } from "@/lib/auth/uuid-helper";

describe("Schema Platform Engine Integration & Evolution Tests (CM-002)", () => {
  let testModule: any;
  let testEntity: any;
  const tenantId = 1;
  const actorUserId = 1;

  const moduleService = new PlatformModuleService();
  const entityService = new EntityService();
  const fieldService = new FieldService();
  const schemaEngine = new SchemaPlatformEngine();

  beforeAll(async () => {
    // Ensure Tenant exists
    await prisma.tenant.upsert({
      where: { id: tenantId },
      update: {},
      create: {
        id: tenantId,
        code: "schema_test",
        name: "Schema Test Tenant",
        isActive: true,
      }
    });

    // Create Test Module
    const existingModule = await prisma.platformModule.findUnique({
      where: { code: "DB_TEST_MOD" }
    });

    if (existingModule) {
      testModule = existingModule;
    } else {
      testModule = await moduleService.create({
        code: "DB_TEST_MOD",
        name: "Database Engine Test Module",
        description: "A module designed to test SchemaPlatformEngine capabilities",
        icon: "Database",
        navigationGroup: "Tests",
        displayOrder: 2,
        isActive: true,
        route: "/db-test",
        defaultPage: "/db-test/home",
        defaultPermissionSet: ["ADMIN_ACCESS"]
      }, tenantId, actorUserId);
    }

    // Clean up existing migration table records and test tables if they exist
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "public"."platform_migrations" CASCADE;`).catch(() => {});
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "public"."db_test_mod_db_test_ent" CASCADE;`).catch(() => {});

    // Create Configuration Entity
    testEntity = await entityService.create({
      moduleId: testModule.id,
      code: "DB_TEST_ENT",
      name: "Database Engine Test Entity",
      pluralName: "Database Engine Test Entities",
      description: "Verifies physical table creations and migrations flow",
      status: "DRAFT",
      isSystem: false,
      isCustom: true,
      allowAudit: true,
      metadata: JSON.stringify({
        persistenceProfile: "MASTER",
        auditProfile: "FULL",
        softDelete: true,
        optimisticLocking: true,
        tenantIsolation: true
      })
    }, tenantId, actorUserId);
  });

  afterAll(async () => {
    // Teardown test schema structures
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "public"."db_test_mod_db_test_ent" CASCADE;`).catch(() => {});
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "public"."platform_migrations" CASCADE;`).catch(() => {});
    
    if (testEntity) {
      await prisma.configurationEntity.delete({ where: { id: testEntity.id } }).catch(() => {});
    }
    if (testModule) {
      await prisma.platformModule.delete({ where: { id: testModule.id } }).catch(() => {});
    }
  });

  test("should compile manifest and execute transactional Postgres table creations on first publish", async () => {
    // 1. Add fields to draft entity
    const fText = await fieldService.createField(testEntity.id, {
      code: "F_TEXT",
      label: "Title Text",
      dataType: "STRING",
      uiControl: "TEXT_INPUT",
      dataSource: "STATIC",
      required: true,
      displayOrder: 1,
    }, tenantId, actorUserId);

    const fNumber = await fieldService.createField(testEntity.id, {
      code: "F_NUMBER",
      label: "Quantity",
      dataType: "INTEGER",
      uiControl: "NUMBER_INPUT",
      dataSource: "STATIC",
      required: false,
      displayOrder: 2,
    }, tenantId, actorUserId);

    // 2. Publish entity via standard pipeline (triggers syncSchema)
    const publishRes = await publishService.publishEntity(testEntity.id, formatUserIdToUuid(actorUserId));
    expect(publishRes.success).toBe(true);

    // 3. Verify Table exists in Postgres catalog
    const tableExists = await prisma.$queryRawUnsafe<any[]>(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'db_test_mod_db_test_ent'
      )`
    );
    expect(tableExists[0].exists).toBe(true);

    // 4. Verify specific columns (id, tenant_id, f_text, f_number, created_at, row_version, is_deleted) are present
    const columns = await prisma.$queryRawUnsafe<any[]>(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_schema = 'public' 
       AND table_name = 'db_test_mod_db_test_ent'`
    );

    const colNames = columns.map(c => c.column_name.toLowerCase());
    expect(colNames).toContain("id");
    expect(colNames).toContain("tenant_id");
    expect(colNames).toContain("f_text");
    expect(colNames).toContain("f_number");
    expect(colNames).toContain("created_at");
    expect(colNames).toContain("row_version");
    expect(colNames).toContain("is_deleted");

    // 5. Verify migrations logs registry records
    const migrationLogs = await prisma.$queryRawUnsafe<any[]>(
      `SELECT version, succeeded, apply_sql FROM "public"."platform_migrations" WHERE entity_id = $1::uuid`,
      testEntity.id
    );
    expect(migrationLogs.length).toBe(1);
    expect(migrationLogs[0].version).toBe(1);
    expect(migrationLogs[0].succeeded).toBe(true);
    expect(migrationLogs[0].apply_sql).toContain("CREATE TABLE");
  });

  test("should safely evolve the physical table by adding a column and index during next publish iteration", async () => {
    // 1. Reset entity status to DRAFT so we can edit/publish it again
    await prisma.configurationEntity.update({
      where: { id: testEntity.id },
      data: { status: "DRAFT" }
    });

    // 2. Add a new field
    await fieldService.createField(testEntity.id, {
      code: "F_DATE",
      label: "Due Date",
      dataType: "DATE",
      uiControl: "DATE_PICKER",
      dataSource: "STATIC",
      required: false,
      indexed: true, // Configures physical index key
      displayOrder: 3,
    }, tenantId, actorUserId);

    // 3. Re-publish entity
    const publishRes = await publishService.publishEntity(testEntity.id, formatUserIdToUuid(actorUserId));
    expect(publishRes.success).toBe(true);

    // 4. Verify new column exists
    const columns = await prisma.$queryRawUnsafe<any[]>(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = 'public' 
       AND table_name = 'db_test_mod_db_test_ent'`
    );
    const colNames = columns.map(c => c.column_name.toLowerCase());
    expect(colNames).toContain("f_date");

    // 5. Verify index exists in database
    const indexes = await prisma.$queryRawUnsafe<any[]>(
      `SELECT indexname FROM pg_indexes 
       WHERE schemaname = 'public' 
       AND tablename = 'db_test_mod_db_test_ent'`
    );
    const indexNames = indexes.map(i => i.indexname.toLowerCase());
    expect(indexNames).toContain("idx_db_test_mod_db_test_ent_f_date");

    // 6. Verify second migration logged successfully
    const migrationLogs = await prisma.$queryRawUnsafe<any[]>(
      `SELECT version, succeeded, apply_sql FROM "public"."platform_migrations" WHERE entity_id = $1::uuid ORDER BY version ASC`,
      testEntity.id
    );
    expect(migrationLogs.length).toBe(2);
    expect(migrationLogs[1].version).toBe(2);
    expect(migrationLogs[1].apply_sql).toContain("ALTER TABLE");
    expect(migrationLogs[1].apply_sql).toContain("ADD COLUMN");
    expect(migrationLogs[1].apply_sql).toContain("CREATE INDEX");
  });

  test("should block and abort publish execution if an unsafe change is detected (e.g. column drop) unless safety is bypassed", async () => {
    // 1. Reset entity to DRAFT
    await prisma.configurationEntity.update({
      where: { id: testEntity.id },
      data: { status: "DRAFT" }
    });

    // 2. Simulate deletion of one of the fields in metadata
    const fieldToDelete = await prisma.entityFieldDefinition.findFirst({
      where: { entityId: testEntity.id, code: "F_NUMBER" }
    });
    expect(fieldToDelete).toBeDefined();
    
    await fieldService.deleteField(fieldToDelete!.id, tenantId, actorUserId);

    // 3. Publishing standard pipeline should throw safety block validation error
    await expect(
      publishService.publishEntity(testEntity.id, formatUserIdToUuid(actorUserId))
    ).rejects.toThrow("Unsafe migration blocked");

    // 4. Verify F_NUMBER column is still intact physically in database
    const columns = await prisma.$queryRawUnsafe<any[]>(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = 'public' 
       AND table_name = 'db_test_mod_db_test_ent'`
    );
    const colNames = columns.map(c => c.column_name.toLowerCase());
    expect(colNames).toContain("f_number");

    // 5. Run bypass syncSchema check manually inside transaction to verify force-override drop execution
    await prisma.$transaction(async (tx) => {
      await schemaEngine.syncSchema(testEntity.id, tenantId, tx, true); // bypassSafety = true
    });

    // 6. Verify column was dropped physically after override execution
    const columnsAfterBypass = await prisma.$queryRawUnsafe<any[]>(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = 'public' 
       AND table_name = 'db_test_mod_db_test_ent'`
    );
    const colNamesAfter = columnsAfterBypass.map(c => c.column_name.toLowerCase());
    expect(colNamesAfter).not.toContain("f_number");
  });
});
