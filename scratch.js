const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();

prisma.configurationEntity.findFirst({
  where: { code: 'status', module: { code: 'reference' } },
  include: { fields: { include: { lookupDefinition: true } }, module: true }
}).then(e => {
  if (!e) { console.log('Entity not found'); return; }
  console.log('Entity:', e.code, '| Module:', e.module.code);
  e.fields.forEach(f => {
    console.log(' Field:', f.code, '| dataType:', f.dataType, '| uiControl:', f.uiControl, '| dataSource:', f.dataSource, '| hasLookup:', !!f.lookupDefinition);
  });
}).catch(e => console.error('Error:', e.message)).finally(() => prisma.$disconnect());
