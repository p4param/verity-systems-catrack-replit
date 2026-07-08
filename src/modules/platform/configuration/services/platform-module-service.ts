import { PlatformModuleRepository, CreateModuleDto, UpdateModuleDto } from "../repositories/platform-module-repository";
import { createAuditLog } from "@/lib/audit";
import { formatUserIdToUuid } from "@/lib/auth/uuid-helper";
import { prisma } from "@/lib/prisma";

const VALID_GROUPS = [
  "Administration",
  "Operations",
  "Sales",
  "Production",
  "Finance",
  "Reports",
  "Masters",
  "Utilities",
  "Mobile",
  "Customer Portal",
  "Vendor Portal"
];

function invalidateCache() {
  try {
    const { revalidateTag } = require("next/cache");
    revalidateTag("navigation");
  } catch {
    // Fail silently in test contexts or SSR compilation
  }
}

export class PlatformModuleService {
  private repository = new PlatformModuleRepository();

  async getAll() {
    return this.repository.getAll();
  }

  async getById(id: string) {
    return this.repository.getById(id);
  }

  async getByCode(code: string) {
    return this.repository.getByCode(code);
  }

  async create(data: CreateModuleDto, tenantId: number, actorUserId: number) {
    const existing = await this.repository.getByCode(data.code);
    if (existing) {
      throw new Error(`Module with code ${data.code} already exists`);
    }

    const platformModule = await this.repository.create({
      ...data,
      createdBy: formatUserIdToUuid(data.createdBy)
    });

    // Automatically align/register a NavigationItem if navigationGroup is specified
    if (platformModule.navigationGroup) {
      const group = await prisma.navigationGroup.findFirst({
        where: {
          OR: [
            { name: platformModule.navigationGroup },
            { code: platformModule.navigationGroup.toUpperCase() }
          ]
        }
      });
      if (group) {
        const count = await prisma.navigationItem.count({
          where: { navigationGroupId: group.id }
        });
        await prisma.navigationItem.create({
          data: {
            title: platformModule.name,
            navigationGroupId: group.id,
            platformModuleId: platformModule.id,
            route: platformModule.route,
            icon: platformModule.icon,
            displayOrder: count,
            menuType: "PAGE",
            visible: true,
            createdBy: formatUserIdToUuid(actorUserId),
            updatedBy: formatUserIdToUuid(actorUserId)
          }
        });
      }
    }

    await createAuditLog({
      tenantId,
      actorUserId,
      action: "PLATFORM_MODULE_CREATE",
      details: `Created platform module: ${platformModule.code} (${platformModule.name})`,
    });

    invalidateCache();
    return platformModule;
  }

  async update(id: string, data: UpdateModuleDto, tenantId: number, actorUserId: number) {
    const existing = await this.repository.getById(id);
    if (!existing) {
      throw new Error(`Module not found`);
    }

    const platformModule = await this.repository.update(id, {
      ...data,
      updatedBy: formatUserIdToUuid(data.updatedBy || actorUserId)
    });

    // Automatically synchronize/align the linked NavigationItem if navigationGroup is specified or updated
    if (platformModule.navigationGroup) {
      const group = await prisma.navigationGroup.findFirst({
        where: {
          OR: [
            { name: platformModule.navigationGroup },
            { code: platformModule.navigationGroup.toUpperCase() }
          ]
        }
      });
      if (group) {
        const existingItem = await prisma.navigationItem.findFirst({
          where: { platformModuleId: id }
        });
        if (existingItem) {
          await prisma.navigationItem.update({
            where: { id: existingItem.id },
            data: {
              navigationGroupId: group.id,
              route: platformModule.route || existingItem.route,
              icon: platformModule.icon || existingItem.icon,
              title: platformModule.name || existingItem.title,
              updatedBy: formatUserIdToUuid(actorUserId)
            }
          });
        } else {
          const count = await prisma.navigationItem.count({
            where: { navigationGroupId: group.id }
          });
          await prisma.navigationItem.create({
            data: {
              title: platformModule.name,
              navigationGroupId: group.id,
              platformModuleId: id,
              route: platformModule.route,
              icon: platformModule.icon,
              displayOrder: count,
              menuType: "PAGE",
              visible: true,
              createdBy: formatUserIdToUuid(actorUserId),
              updatedBy: formatUserIdToUuid(actorUserId)
            }
          });
        }
      }
    }

    const wasActivated = !existing.isActive && platformModule.isActive;
    const wasDeactivated = existing.isActive && !platformModule.isActive;
    let action = "PLATFORM_MODULE_UPDATE";
    if (wasActivated) action = "PLATFORM_MODULE_ACTIVATE";
    if (wasDeactivated) action = "PLATFORM_MODULE_DEACTIVATE";

    await createAuditLog({
      tenantId,
      actorUserId,
      action,
      details: `Updated platform module: ${platformModule.code} (${platformModule.name}). Changes: ${JSON.stringify(data)}`,
    });

    invalidateCache();
    return platformModule;
  }

  async delete(id: string, tenantId: number, actorUserId: number) {
    const existing = await this.repository.getById(id);
    if (!existing) {
      throw new Error(`Module not found`);
    }
    if (existing.isSystem) {
      throw new Error(`System modules cannot be deleted`);
    }

    // Clean up any linked navigation items
    await prisma.navigationItem.deleteMany({
      where: { platformModuleId: id }
    });

    await this.repository.delete(id);

    await createAuditLog({
      tenantId,
      actorUserId,
      action: "PLATFORM_MODULE_DELETE",
      details: `Deleted platform module: ${existing.code} (${existing.name})`,
    });

    invalidateCache();
    return existing;
  }

  async toggleActive(id: string, tenantId: number, actorUserId: number) {
    const existing = await this.repository.getById(id);
    if (!existing) {
      throw new Error(`Module not found`);
    }

    if (existing.isActive) {
      // Deactivating / Disabling:
      // Ensure no enabled modules depend on this one
      const allModules = await this.repository.getAll();
      const dependents: string[] = [];
      for (const m of allModules) {
        if (m.isActive && m.id !== id) {
          const deps = (m.moduleDependencies as string[]) || [];
          if (deps.includes(existing.code)) {
            dependents.push(m.name);
          }
        }
      }

      if (dependents.length > 0) {
        throw new Error(
          `Cannot disable module ${existing.name} because active modules depend on it: ${dependents.join(", ")}`
        );
      }
    } else {
      // Activating / Enabling:
      // Ensure all dependencies are enabled
      const deps = (existing.moduleDependencies as string[]) || [];
      if (deps.length > 0) {
        const allModules = await this.repository.getAll();
        const inactiveDeps: string[] = [];
        for (const depCode of deps) {
          const depModule = allModules.find((m) => m.code === depCode);
          if (!depModule || !depModule.isActive) {
            inactiveDeps.push(depCode);
          }
        }

        if (inactiveDeps.length > 0) {
          throw new Error(
            `Cannot enable module ${existing.name} because its dependencies are disabled: ${inactiveDeps.join(", ")}`
          );
        }
      }
    }

    const updated = await this.repository.update(id, {
      isActive: !existing.isActive,
      updatedBy: formatUserIdToUuid(actorUserId),
    });

    await createAuditLog({
      tenantId,
      actorUserId,
      action: updated.isActive ? "PLATFORM_MODULE_ACTIVATE" : "PLATFORM_MODULE_DEACTIVATE",
      details: `${updated.isActive ? "Activated" : "Deactivated"} platform module: ${updated.code}`,
    });

    invalidateCache();
    return updated;
  }

  async reorder(orderedIds: string[], tenantId: number, actorUserId: number) {
    for (let i = 0; i < orderedIds.length; i++) {
      await this.repository.update(orderedIds[i], {
        displayOrder: i,
        sortOrder: i,
        updatedBy: formatUserIdToUuid(actorUserId)
      });
    }

    await createAuditLog({
      tenantId,
      actorUserId,
      action: "PLATFORM_MODULE_REORDER",
      details: `Reordered platform modules hierarchy: ${JSON.stringify(orderedIds)}`,
    });

    invalidateCache();
    return { success: true };
  }

  async validateDependencies() {
    const allModules = await this.repository.getAll();
    const anomalies: Array<{ type: string; message: string; severity: "ERROR" | "WARNING" }> = [];
    const codeSet = new Set(allModules.map((m) => m.code));

    // 1. Duplicate Module Codes (Verify in-memory in case array has unsaved/duplicate code items)
    const codeCounts = new Map<string, number>();
    for (const m of allModules) {
      codeCounts.set(m.code, (codeCounts.get(m.code) || 0) + 1);
    }
    for (const [code, count] of codeCounts.entries()) {
      if (count > 1) {
        anomalies.push({
          type: "DUPLICATE_MODULE_CODE",
          message: `Duplicate module code "${code}" exists ${count} times`,
          severity: "ERROR"
        });
      }
    }

    // 2. Duplicate Routes
    const routeMap = new Map<string, string[]>();
    for (const m of allModules) {
      if (m.route) {
        if (!routeMap.has(m.route)) {
          routeMap.set(m.route, []);
        }
        routeMap.get(m.route)!.push(m.code);
      }
    }
    for (const [route, codes] of routeMap.entries()) {
      if (codes.length > 1) {
        anomalies.push({
          type: "DUPLICATE_ROUTE",
          message: `Duplicate route "${route}" configured across modules: ${codes.join(", ")}`,
          severity: "ERROR"
        });
      }
    }

    // 3. Duplicate Display Orders in the same group
    const groupOrders = new Map<string, Map<number, string[]>>();
    for (const m of allModules) {
      if (m.navigationGroup) {
        if (!groupOrders.has(m.navigationGroup)) {
          groupOrders.set(m.navigationGroup, new Map());
        }
        const groupMap = groupOrders.get(m.navigationGroup)!;
        const order = m.displayOrder;
        if (!groupMap.has(order)) {
          groupMap.set(order, []);
        }
        groupMap.get(order)!.push(m.code);
      }
    }
    for (const [group, orderMap] of groupOrders.entries()) {
      for (const [order, codes] of orderMap.entries()) {
        if (codes.length > 1) {
          anomalies.push({
            type: "DUPLICATE_DISPLAY_ORDER",
            message: `Duplicate display order ${order} in group "${group}" across modules: ${codes.join(", ")}`,
            severity: "WARNING"
          });
        }
      }
    }

    // 4. Broken parents, missing icons, missing default permissions, etc.
    for (const m of allModules) {
      // Missing Navigation Group
      if (!m.navigationGroup || !m.navigationGroup.trim()) {
        anomalies.push({
          type: "MISSING_NAVIGATION_GROUP",
          message: `Module ${m.code} is not assigned to any navigation group`,
          severity: "WARNING"
        });
      } else if (!VALID_GROUPS.includes(m.navigationGroup)) {
        anomalies.push({
          type: "INVALID_GROUP",
          message: `Module ${m.code} has invalid navigation group "${m.navigationGroup}"`,
          severity: "WARNING"
        });
      }

      // Missing Icon
      if (!m.icon || !m.icon.trim()) {
        anomalies.push({
          type: "MISSING_ICON",
          message: `Module ${m.code} is missing an icon representation`,
          severity: "WARNING"
        });
      }

      // Missing Landing Page
      if (m.isActive && (!m.defaultPage || !m.defaultPage.trim())) {
        anomalies.push({
          type: "MISSING_LANDING_PAGE",
          message: `Active module ${m.code} has no default landing page configured`,
          severity: "WARNING"
        });
      }

      // Missing default permissions
      const perms = m.defaultPermissionSet;
      if (!perms || !Array.isArray(perms) || perms.length === 0) {
        anomalies.push({
          type: "MISSING_PERMISSIONS",
          message: `Module ${m.code} does not define any default permission sets`,
          severity: "WARNING"
        });
      }

      // Broken parent reference & disabled required module checks
      const deps = (m.moduleDependencies as string[]) || [];
      for (const depCode of deps) {
        const parent = allModules.find((p) => p.code === depCode);
        if (!parent) {
          anomalies.push({
            type: "BROKEN_PARENT",
            message: `Module ${m.code} depends on missing parent module code "${depCode}"`,
            severity: "ERROR"
          });
        } else if (m.isActive && !parent.isActive) {
          anomalies.push({
            type: "DISABLED_REQUIRED_MODULE",
            message: `Active module ${m.code} depends on disabled module "${depCode}"`,
            severity: "ERROR"
          });
        }
      }
    }

    // 5. Circular Dependencies check (DFS)
    const graph = new Map<string, string[]>();
    for (const m of allModules) {
      graph.set(m.code, (m.moduleDependencies as string[]) || []);
    }

    const visiting = new Set<string>();
    const visited = new Set<string>();

    const detectCycle = (code: string, path: string[]) => {
      visiting.add(code);
      path.push(code);

      const neighbors = graph.get(code) || [];
      for (const neighbor of neighbors) {
        if (visiting.has(neighbor)) {
          const startIndex = path.indexOf(neighbor);
          const cyclePath = path.slice(startIndex).concat(neighbor);
          anomalies.push({
            type: "CIRCULAR_DEPENDENCY",
            message: `Circular dependency detected: ${cyclePath.join(" -> ")}`,
            severity: "ERROR"
          });
        } else if (!visited.has(neighbor)) {
          detectCycle(neighbor, [...path]);
        }
      }

      visiting.delete(code);
      visited.add(code);
    };

    for (const m of allModules) {
      if (!visited.has(m.code)) {
        detectCycle(m.code, []);
      }
    }

    return {
      isValid: !anomalies.some((a) => a.severity === "ERROR"),
      anomalies
    };
  }

  async getNavigationTree() {
    const activeNav = await this.repository.getNavigation();
    const tree: Array<{ group: string; modules: any[] }> = [];

    for (const group of VALID_GROUPS) {
      const groupModules = activeNav
        .filter((m) => m.navigationGroup === group)
        .sort((a, b) => a.displayOrder - b.displayOrder);
      tree.push({
        group,
        modules: groupModules
      });
    }

    return tree;
  }

  async getDashboardCards() {
    const modules = await this.repository.getDashboardModules();
    return modules.map((m) => ({
      code: m.code,
      name: m.name,
      description: m.description,
      icon: m.icon,
      color: m.color || "blue",
      badge: m.badge,
      badgeColor: m.badgeColor,
      route: m.route,
      defaultPage: m.defaultPage
    }));
  }

  async getSearchIndex() {
    const activeModules = await this.repository.getEnabledModules();
    return activeModules
      .filter((m) => m.showInSearch)
      .map((m) => ({
        id: m.id,
        code: m.code,
        name: m.name,
        description: m.description,
        route: m.route,
        group: m.navigationGroup
      }));
  }

  async cloneModule(id: string, newCode: string, tenantId: number, actorUserId: number) {
    const existing = await this.repository.getById(id);
    if (!existing) {
      throw new Error(`Module to clone not found`);
    }

    const codeConflict = await this.repository.getByCode(newCode);
    if (codeConflict) {
      throw new Error(`Module with code ${newCode} already exists`);
    }

    const cloned = await this.repository.create({
      code: newCode,
      name: `${existing.name} (Clone)`,
      description: existing.description || undefined,
      icon: existing.icon || undefined,
      sortOrder: existing.sortOrder,
      isActive: false,
      isSystem: false,
      metadata: existing.metadata as any,
      navigationGroup: existing.navigationGroup || undefined,
      displayOrder: existing.displayOrder,
      route: existing.route || undefined,
      defaultPage: existing.defaultPage || undefined,
      color: existing.color || undefined,
      badge: existing.badge || undefined,
      badgeColor: existing.badgeColor || undefined,
      menuVisible: existing.menuVisible,
      showInSearch: existing.showInSearch,
      showOnDashboard: existing.showOnDashboard,
      showInMobile: existing.showInMobile,
      isLicensed: existing.isLicensed,
      requiresLicense: existing.requiresLicense,
      featureFlag: existing.featureFlag,
      moduleDependencies: existing.moduleDependencies as any,
      minimumRole: existing.minimumRole || undefined,
      defaultPermissionSet: existing.defaultPermissionSet as any,
      defaultLandingPage: existing.defaultLandingPage || undefined,
      helpUrl: existing.helpUrl || undefined,
      documentationUrl: existing.documentationUrl || undefined,
      supportEmail: existing.supportEmail || undefined,
      createdBy: formatUserIdToUuid(actorUserId)
    });

    await createAuditLog({
      tenantId,
      actorUserId,
      action: "PLATFORM_MODULE_CLONE",
      details: `Cloned platform module: ${existing.code} to new module ${newCode}`,
    });

    invalidateCache();
    return cloned;
  }

  async publishRuntime(tenantId: number, actorUserId: number) {
    const allModules = await this.repository.getAll();
    const validationResult = await this.validateDependencies();

    const navigationTree = await this.getNavigationTree();
    const dashboardCards = await this.getDashboardCards();
    const searchIndex = await this.getSearchIndex();

    let healthStatus: "HEALTHY" | "WARNING" | "CRITICAL" = "HEALTHY";
    if (validationResult.anomalies.some((a) => a.severity === "ERROR")) {
      healthStatus = "CRITICAL";
    } else if (validationResult.anomalies.some((a) => a.severity === "WARNING")) {
      healthStatus = "WARNING";
    }

    invalidateCache();

    await createAuditLog({
      tenantId,
      actorUserId,
      action: "PLATFORM_RUNTIME_PUBLISH",
      details: `Published platform runtime configuration. Health Status: ${healthStatus}. Anomalies Count: ${validationResult.anomalies.length}`,
    });

    return {
      success: true,
      publishedAt: new Date().toISOString(),
      healthStatus,
      validation: validationResult,
      generated: {
        navigationTree,
        dashboardCards,
        searchIndex
      }
    };
  }
}
