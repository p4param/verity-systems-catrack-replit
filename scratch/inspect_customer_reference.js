const { PrismaClient } = require('../src/generated/client');

async function inspectCustomerReference() {
  const prisma = new PrismaClient();
  try {
    const customer = await prisma.configurationEntity.findFirst({
      where: { code: 'CUSTOMER' },
      include: {
        fields: true,
        views: true,
        layoutViews: true,
        navigationItems: true,
        artifacts: true,
      },
    });

    if (!customer) {
      console.log('Customer entity not found');
      return;
    }

    console.log('=== CUSTOMER Entity Reference Metadata ===');
    console.log('\n--- Entity Attributes ---');
    console.log(JSON.stringify({
      code: customer.code,
      name: customer.name,
      pluralName: customer.pluralName,
      status: customer.status,
      showInNavigation: customer.showInNavigation,
      menuGroup: customer.menuGroup,
      icon: customer.icon,
      route: customer.route,
    }, null, 2));

    console.log('\n--- Fields ---');
    console.log(JSON.stringify(customer.fields, null, 2));

    console.log('\n--- Data Views ---');
    console.log(JSON.stringify(customer.views, null, 2));

    console.log('\n--- Layout Views ---');
    console.log(JSON.stringify(customer.layoutViews, null, 2));

    console.log('\n--- Navigation Items ---');
    console.log(JSON.stringify(customer.navigationItems, null, 2));

  } catch (err) {
    console.error('Error inspecting customer reference:', err);
  } finally {
    await prisma.$disconnect();
  }
}

inspectCustomerReference();
