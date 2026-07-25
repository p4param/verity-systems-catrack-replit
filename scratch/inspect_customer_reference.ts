import { prisma } from "../src/lib/prisma";

async function inspectCustomerReference() {
  try {
    const customer = await prisma.configurationEntity.findFirst({
      where: { code: "CUSTOMER" },
      include: {
        fields: {
          include: {
            options: true,
          },
        },
        views: true,
        layoutViews: true,
        navigationItems: true,
        artifacts: true,
      },
    });

    if (!customer) {
      console.log("CUSTOMER entity not found in database.");
      return;
    }

    console.log("=== CUSTOMER Entity Reference Metadata ===");
    console.log("\n--- Entity Header ---");
    console.log(JSON.stringify({
      id: customer.id,
      moduleId: customer.moduleId,
      code: customer.code,
      name: customer.name,
      pluralName: customer.pluralName,
      status: customer.status,
      showInNavigation: customer.showInNavigation,
      menuGroup: customer.menuGroup,
      icon: customer.icon,
      route: customer.route,
      allowCRUD: customer.allowCRUD,
      allowAudit: customer.allowAudit,
    }, null, 2));

    console.log("\n--- Fields (" + customer.fields.length + ") ---");
    console.log(JSON.stringify(customer.fields, null, 2));

    console.log("\n--- Data Views (" + customer.views.length + ") ---");
    console.log(JSON.stringify(customer.views, null, 2));

    console.log("\n--- Layout Views (" + customer.layoutViews.length + ") ---");
    console.log(JSON.stringify(customer.layoutViews, null, 2));

    console.log("\n--- Navigation Items (" + customer.navigationItems.length + ") ---");
    console.log(JSON.stringify(customer.navigationItems, null, 2));

    console.log("\n--- Artifacts (" + customer.artifacts.length + ") ---");
    console.log(JSON.stringify(customer.artifacts.map(a => ({
      id: a.id,
      version: a.version,
      status: a.status,
      generatorVersion: a.generatorVersion,
    })), null, 2));

  } catch (err) {
    console.error("Error inspecting customer reference:", err);
  } finally {
    await prisma.$disconnect();
  }
}

inspectCustomerReference();
