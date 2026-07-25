/**
 * bootstrap-cat-relationship-metadata.js
 *
 * ONE-TIME LEGACY METADATA RECONSTRUCTION
 * ----------------------------------------
 * This script creates the missing Metadata Model for CatRelationship and CatContact.
 *
 * These entities were implemented before the VAP-Bootstrap-v2.1 Business Entity Generation
 * Rule required that both the Metadata Model and Implementation Model be generated together.
 *
 * This DMMF-read approach is a one-time remediation path for pre-existing entities only.
 * After this migration, the Metadata Model is the authoritative business definition.
 * The Implementation Model is maintained in synchronization with it.
 *
 * This script SHALL NOT be used as a pattern for future business entity generation.
 * All future entities must follow the standard VAP lifecycle:
 *   Entity → Fields → Data Views → Layout Views → Navigation → Publish → Runtime
 *
 * DOES NOT publish. Publishing is an explicit lifecycle step (VAP-Bootstrap-v2.1).
 *
 * Run: node scripts/bootstrap-cat-relationship-metadata.js
 */

'use strict';

const { PrismaClient, Prisma } = require('../src/generated/client');

const prisma = new PrismaClient();

// ── Platform System Fields ────────────────────────────────────────────────────
const PLATFORM_SYSTEM_FIELDS = [
  { code: 'id',        label: 'ID',         dataType: 'UUID',     required: true,  unique: true,  indexed: true,  searchable: true,  sortable: true,  filterable: true,  defaultValue: null,    uiControl: 'TEXT_INPUT',  displayOrder: 1   },
  { code: 'createdAt', label: 'Created At', dataType: 'DATETIME', required: true,  unique: false, indexed: true,  searchable: false, sortable: true,  filterable: true,  defaultValue: null,    uiControl: 'DATE_PICKER', displayOrder: 98  },
  { code: 'createdBy', label: 'Created By', dataType: 'UUID',     required: true,  unique: false, indexed: true,  searchable: true,  sortable: true,  filterable: true,  defaultValue: null,    uiControl: 'TEXT_INPUT',  displayOrder: 99  },
  { code: 'updatedAt', label: 'Updated At', dataType: 'DATETIME', required: true,  unique: false, indexed: false, searchable: false, sortable: true,  filterable: true,  defaultValue: null,    uiControl: 'DATE_PICKER', displayOrder: 100 },
  { code: 'updatedBy', label: 'Updated By', dataType: 'UUID',     required: true,  unique: false, indexed: false, searchable: false, sortable: false, filterable: false, defaultValue: null,    uiControl: 'TEXT_INPUT',  displayOrder: 101 },
  { code: 'isDeleted', label: 'Is Deleted', dataType: 'BOOLEAN',  required: true,  unique: false, indexed: true,  searchable: false, sortable: false, filterable: true,  defaultValue: 'false', uiControl: 'CHECKBOX',    displayOrder: 102 },
];

const SYSTEM_FIELD_CODES = new Set(PLATFORM_SYSTEM_FIELDS.map(f => f.code));
const IGNORED_CODES = new Set([
  'id', 'tenantId', 'companyId', 'branchId', 'version',
  'createdAt', 'createdBy', 'updatedAt', 'updatedBy',
  'deletedAt', 'deletedBy', 'isDeleted',
]);

// ── Label formatter ───────────────────────────────────────────────────────────
function formatFieldLabel(code) {
  const overrides = {
    id: 'ID',
    relationshipNumber: 'Relationship Number',
    primaryContactId: 'Primary Contact',
    isPrimary: 'Is Primary Contact',
    relationshipId: 'Relationship',
    fileName: 'File Name',
    fileUrl: 'File URL',
    fileSize: 'File Size',
    fileType: 'File Type',
    tenantId: 'Tenant',
  };
  if (overrides[code]) return overrides[code];
  const result = code.replace(/([A-Z])/g, ' $1');
  return result.charAt(0).toUpperCase() + result.slice(1).trim();
}

// ── Map Prisma DMMF field type to VAP dataType / uiControl ───────────────────
function mapFieldType(field) {
  if (field.type === 'Int' || field.type === 'Float' || field.type === 'Decimal') {
    return { dataType: 'NUMBER', uiControl: 'NUMBER_INPUT' };
  }
  if (field.type === 'Boolean') {
    return { dataType: 'BOOLEAN', uiControl: 'CHECKBOX' };
  }
  if (field.type === 'DateTime') {
    return { dataType: 'DATETIME', uiControl: 'DATE_PICKER' };
  }
  if (field.kind === 'enum') {
    return { dataType: 'LOOKUP', uiControl: 'SELECT' };
  }
  return { dataType: 'STRING', uiControl: 'TEXT_INPUT' };
}

// ── Core bootstrap function ───────────────────────────────────────────────────
async function bootstrapEntity(entityId, actorUserId) {
  const entity = await prisma.configurationEntity.findUnique({
    where: { id: entityId },
    include: { module: true, fields: true, views: true, layoutViews: true },
  });

  if (!entity) throw new Error(`Entity not found: ${entityId}`);

  console.log(`\n  [${entity.code}] Starting metadata reconstruction...`);

  const existingFieldCodes = new Set(entity.fields.map(f => f.code));

  // 1. Register system fields
  for (const sysField of PLATFORM_SYSTEM_FIELDS) {
    if (!existingFieldCodes.has(sysField.code)) {
      await prisma.entityFieldDefinition.create({
        data: {
          entityId,
          code: sysField.code,
          label: sysField.label,
          dataType: sysField.dataType,
          required: sysField.required,
          unique: sysField.unique,
          indexed: sysField.indexed,
          searchable: sysField.searchable,
          sortable: sysField.sortable,
          filterable: sysField.filterable,
          defaultValue: sysField.defaultValue,
          uiControl: sysField.uiControl,
          displayOrder: sysField.displayOrder,
          status: 'DRAFT',
          createdBy: actorUserId,
          updatedBy: actorUserId,
          metadata: { isSystemField: true },
        },
      });
      existingFieldCodes.add(sysField.code);
      console.log(`    + System field: ${sysField.code}`);
    } else {
      console.log(`    ~ System field already exists: ${sysField.code}`);
    }
  }

  // 2. Register all business fields via one-time legacy metadata reconstruction from Prisma DMMF.
  //    After this migration, the Metadata Model is authoritative for all field definitions.
  const dmmfModels = Prisma.dmmf.datamodel.models;
  const prismaModel = dmmfModels.find(
    m => m.name === entity.code || m.name.toLowerCase() === entity.code.toLowerCase()
  );

  let businessFieldCount = 0;
  if (prismaModel) {
    let displayOrderCounter = 10;
    for (const field of prismaModel.fields) {
      if (field.kind === 'object') continue;
      if (IGNORED_CODES.has(field.name)) continue;
      if (existingFieldCodes.has(field.name)) {
        console.log(`    ~ Business field already exists: ${field.name}`);
        continue;
      }

      const { dataType, uiControl } = mapFieldType(field);
      await prisma.entityFieldDefinition.create({
        data: {
          entityId,
          code: field.name,
          label: formatFieldLabel(field.name),
          dataType,
          required: field.isRequired,
          unique: field.isUnique,
          indexed: field.isUnique,
          searchable: dataType === 'STRING',
          sortable: true,
          filterable: true,
          defaultValue: (field.hasDefaultValue && typeof field.default === 'string') ? field.default : null,
          uiControl,
          displayOrder: displayOrderCounter++,
          status: 'DRAFT',
          createdBy: actorUserId,
          updatedBy: actorUserId,
          metadata: { isLegacyMigration: true, migratedAt: new Date().toISOString() },
        },
      });
      existingFieldCodes.add(field.name);
      businessFieldCount++;
      console.log(`    + Business field: ${field.name} (${dataType})`);
    }
  } else {
    console.warn(`    ⚠  No Prisma DMMF model found for entity code: ${entity.code}`);
  }

  // Load all registered fields for view/layout building
  const allFields = await prisma.entityFieldDefinition.findMany({
    where: { entityId },
    orderBy: { displayOrder: 'asc' },
  });

  const businessFields = allFields.filter(f => !SYSTEM_FIELD_CODES.has(f.code));

  // 3. Create default Data Views
  const existingViewCodes = new Set(entity.views.map(v => v.code));

  if (!existingViewCodes.has('ALL_RECORDS')) {
    await prisma.entityView.create({
      data: {
        entityId,
        code: 'ALL_RECORDS',
        name: 'All Records',
        viewType: 'GRID',
        isDefault: true,
        status: 'DRAFT',
        createdBy: actorUserId,
        updatedBy: actorUserId,
        metadata: { columns: allFields.map(f => f.code) },
      },
    });
    console.log(`    + Data View: ALL_RECORDS`);
  } else {
    console.log(`    ~ Data View already exists: ALL_RECORDS`);
  }

  if (!existingViewCodes.has('ACTIVE_RECORDS')) {
    await prisma.entityView.create({
      data: {
        entityId,
        code: 'ACTIVE_RECORDS',
        name: 'Active Records',
        viewType: 'GRID',
        isDefault: false,
        status: 'DRAFT',
        createdBy: actorUserId,
        updatedBy: actorUserId,
        metadata: { columns: allFields.map(f => f.code), filter: { isDeleted: false } },
      },
    });
    console.log(`    + Data View: ACTIVE_RECORDS`);
  } else {
    console.log(`    ~ Data View already exists: ACTIVE_RECORDS`);
  }

  // 4. Create default Layout View (MAIN_FORM)
  const existingLayoutCodes = new Set(entity.layoutViews.map(l => l.code));

  if (!existingLayoutCodes.has('MAIN_FORM')) {
    const placements = businessFields.map((f, idx) => ({
      id: `place_${f.code}`,
      code: `PLACE_${f.code.toUpperCase()}`,
      name: f.label,
      fieldId: f.id,
      span: { xs: 12, md: 6 },
      displayOrder: idx,
    }));

    const layoutStructure = {
      layoutVersion: '1.0',
      responsiveColumns: { xs: 1, sm: 1, md: 2, lg: 2, xl: 3 },
      tabs: [{
        id: `tab_${entity.code.toLowerCase()}_main`,
        code: 'TAB_MAIN',
        name: 'Main Details',
        title: 'Main Details',
        displayOrder: 0,
        sections: [{
          id: `sec_${entity.code.toLowerCase()}_info`,
          code: 'SEC_GENERAL',
          name: 'General Information',
          title: 'General Information',
          displayOrder: 0,
          groups: [{
            id: `grp_${entity.code.toLowerCase()}_fields`,
            code: 'GRP_FIELDS',
            name: 'Fields',
            title: 'Fields',
            displayOrder: 0,
            rows: [{
              id: `row_${entity.code.toLowerCase()}_1`,
              code: 'ROW_1',
              name: 'Row 1',
              displayOrder: 0,
              columns: [{
                id: `col_${entity.code.toLowerCase()}_1`,
                code: 'COL_1',
                name: 'Column 1',
                span: { xs: 12, md: 12 },
                displayOrder: 0,
                placements,
              }],
            }],
          }],
        }],
      }],
    };

    await prisma.entityLayoutView.create({
      data: {
        entityId,
        code: 'MAIN_FORM',
        name: 'Main Form Layout',
        description: 'Default main form layout for record entry',
        layoutType: 'FORM',
        isDefault: true,
        status: 'DRAFT',
        createdBy: actorUserId,
        updatedBy: actorUserId,
        layout: layoutStructure,
      },
    });
    console.log(`    + Layout View: MAIN_FORM`);
  } else {
    console.log(`    ~ Layout View already exists: MAIN_FORM`);
  }

  // 5. Create NavigationItem if showInNavigation is enabled
  if (entity.showInNavigation) {
    const route = entity.route || `/runtime/${entity.module.code.toLowerCase()}/${entity.code.toLowerCase()}`;
    const existingNav = await prisma.navigationItem.findFirst({ where: { entityId } });
    if (!existingNav) {
      await prisma.navigationItem.create({
        data: {
          entityId,
          platformModuleId: entity.moduleId,
          title: entity.name,
          route,
          icon: entity.icon || 'box',
          visible: true,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
      });
      console.log(`    + Navigation Item: ${route}`);
    } else {
      console.log(`    ~ Navigation Item already exists`);
    }
  }

  console.log(`  [${entity.code}] Status: DRAFT (not published)`);

  return {
    entityId,
    entityCode: entity.code,
    totalFields: allFields.length,
    businessFieldsRegistered: businessFieldCount,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('=================================================================');
  console.log('  VAP Legacy Metadata Reconstruction');
  console.log('  CatRelationship & CatContact — One-time Bootstrap');
  console.log('=================================================================');
  console.log('');
  console.log('  This is a one-time remediation script.');
  console.log('  After completion, the Metadata Model is the authoritative');
  console.log('  business definition. Do NOT use this pattern for new entities.');
  console.log('');

  // 1. Locate admin user (actorUserId for audit trail)
  const adminUser = await prisma.user.findFirst({
    where: { email: 'admin@verity.com' },
  });
  if (!adminUser) {
    throw new Error('Admin user (admin@verity.com) not found. Run "npx prisma db seed" first.');
  }
  const actorUserId = adminUser.id;
  console.log(`✓ Actor: ${adminUser.email} [${actorUserId}]`);

  // 2. Locate or create the CAT PlatformModule
  let catModule = await prisma.platformModule.findFirst({
    where: { code: 'CAT' },
  });

  if (!catModule) {
    catModule = await prisma.platformModule.create({
      data: {
        code: 'CAT',
        name: 'Customer & Account Tracking',
        description: 'Catrack Catering ERP — Customer and Relationship Management (BWP-001)',
        icon: 'users',
        route: '/cat',
        navigationGroup: 'Sales',
        sortOrder: 10,
        isActive: true,
        isSystem: false,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });
    console.log(`+ PlatformModule created: CAT [${catModule.id}]`);
  } else {
    console.log(`✓ PlatformModule found: CAT [${catModule.id}]`);
  }

  // 3. Create or locate ConfigurationEntity: CatRelationship
  let catRelEntity = await prisma.configurationEntity.findUnique({
    where: { code: 'CatRelationship' },
  });

  if (!catRelEntity) {
    catRelEntity = await prisma.configurationEntity.create({
      data: {
        moduleId: catModule.id,
        code: 'CatRelationship',
        name: 'Relationship',
        pluralName: 'Relationships',
        description: 'Business relationship record. Covers the full lifecycle from Prospect to Customer (BWP-001).',
        allowCRUD: true,
        allowImport: false,
        allowExport: true,
        allowWorkflow: true,
        allowAttachments: true,
        allowAudit: true,
        allowComments: true,
        allowTags: false,
        allowHierarchy: false,
        allowSoftDelete: true,
        showInNavigation: true,
        icon: 'users',
        route: '/cat/relationships',
        menuGroup: 'Sales',
        menuOrder: 1,
        apiEnabled: true,
        apiName: 'cat-relationships',
        status: 'DRAFT',
        isActive: true,
        isSystem: false,
        isCustom: false,
        createdBy: actorUserId,
      },
    });
    console.log(`+ ConfigurationEntity created: CatRelationship [${catRelEntity.id}]`);
  } else {
    console.log(`✓ ConfigurationEntity found: CatRelationship [${catRelEntity.id}]`);
  }

  // 4. Create or locate ConfigurationEntity: CatContact
  let catContactEntity = await prisma.configurationEntity.findUnique({
    where: { code: 'CatContact' },
  });

  if (!catContactEntity) {
    catContactEntity = await prisma.configurationEntity.create({
      data: {
        moduleId: catModule.id,
        code: 'CatContact',
        name: 'Contact',
        pluralName: 'Contacts',
        description: 'Contact person associated with a Relationship. Contacts belong to Relationships and do not exist independently (BR-005).',
        allowCRUD: true,
        allowImport: false,
        allowExport: true,
        allowWorkflow: false,
        allowAttachments: false,
        allowAudit: true,
        allowComments: false,
        allowTags: false,
        allowHierarchy: false,
        allowSoftDelete: true,
        showInNavigation: false,
        icon: 'user',
        route: '/cat/contacts',
        menuOrder: 2,
        apiEnabled: true,
        apiName: 'cat-contacts',
        status: 'DRAFT',
        isActive: true,
        isSystem: false,
        isCustom: false,
        createdBy: actorUserId,
      },
    });
    console.log(`+ ConfigurationEntity created: CatContact [${catContactEntity.id}]`);
  } else {
    console.log(`✓ ConfigurationEntity found: CatContact [${catContactEntity.id}]`);
  }

  // 5. Bootstrap metadata for each entity
  const relResult     = await bootstrapEntity(catRelEntity.id,     actorUserId);
  const contactResult = await bootstrapEntity(catContactEntity.id, actorUserId);

  // 6. Summary
  console.log('');
  console.log('=================================================================');
  console.log('  Summary');
  console.log('=================================================================');
  console.log('');
  console.log(`  CatRelationship  — Total fields: ${relResult.totalFields}  (${relResult.businessFieldsRegistered} new business fields registered)`);
  console.log(`  CatContact       — Total fields: ${contactResult.totalFields}  (${contactResult.businessFieldsRegistered} new business fields registered)`);
  console.log('');
  console.log('  Both entities are in DRAFT status. Publishing has NOT occurred.');
  console.log('  Next step: Open VAP Configuration Admin → verify fields, views,');
  console.log('  and layouts → then Publish explicitly from the admin UI.');
  console.log('');
  console.log('  The Metadata Model is now the authoritative business definition.');
  console.log('  The Implementation Model remains synchronized with it.');
  console.log('');
}

main()
  .catch(e => {
    console.error('');
    console.error('Bootstrap failed:', e.message);
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
