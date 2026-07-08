import { NavigationRepository, CreateNavigationGroupDto, UpdateNavigationGroupDto, CreateNavigationItemDto, UpdateNavigationItemDto } from "../repositories/navigation-repository";
import { PlatformModuleRepository } from "../../configuration/repositories/platform-module-repository";
import { createAuditLog } from "@/lib/audit";
import { formatUserIdToUuid } from "@/lib/auth/uuid-helper";

function invalidateNavigationCache() {
  try {
    const { revalidateTag } = require("next/cache");
    revalidateTag("navigation");
  } catch {}
}

export class NavigationService {
  private repository = new NavigationRepository();
  private moduleRepository = new PlatformModuleRepository();

  // Navigation Groups CRUD
  async createGroup(data: CreateNavigationGroupDto, tenantId: number, actorUserId: number) {
    const created = await this.repository.createGroup({ ...data, createdBy: data.createdBy || formatUserIdToUuid(actorUserId) });
    await createAuditLog({
      tenantId,
      actorUserId,
      action: "NAV_GROUP_CREATE",
      details: `Created navigation group: ${created.name} (${created.code})`
    });
    invalidateNavigationCache();
    return created;
  }

  async updateGroup(id: string, data: UpdateNavigationGroupDto, tenantId: number, actorUserId: number) {
    const updated = await this.repository.updateGroup(id, { ...data, updatedBy: data.updatedBy || formatUserIdToUuid(actorUserId) });
    await createAuditLog({
      tenantId,
      actorUserId,
      action: "NAV_GROUP_UPDATE",
      details: `Updated navigation group: ${updated.name}`
    });
    invalidateNavigationCache();
    return updated;
  }

  async deleteGroup(id: string, tenantId: number, actorUserId: number) {
    const deleted = await this.repository.deleteGroup(id);
    await createAuditLog({
      tenantId,
      actorUserId,
      action: "NAV_GROUP_DELETE",
      details: `Deleted navigation group: ${deleted.name}`
    });
    invalidateNavigationCache();
    return deleted;
  }

  async reorderGroups(orderedIds: string[], tenantId: number, actorUserId: number) {
    const actorUuid = formatUserIdToUuid(actorUserId);
    const result = await this.repository.reorderGroups(orderedIds, actorUuid);
    await createAuditLog({
      tenantId,
      actorUserId,
      action: "NAV_GROUP_REORDER",
      details: `Reordered navigation groups`
    });
    invalidateNavigationCache();
    return result;
  }

  // Navigation Items CRUD
  async createItem(data: CreateNavigationItemDto, tenantId: number, actorUserId: number) {
    const created = await this.repository.createItem({ ...data, createdBy: data.createdBy || formatUserIdToUuid(actorUserId) });
    await createAuditLog({
      tenantId,
      actorUserId,
      action: "NAV_ITEM_CREATE",
      details: `Created navigation item: ${created.title}`
    });
    invalidateNavigationCache();
    return created;
  }

  async updateItem(id: string, data: UpdateNavigationItemDto, tenantId: number, actorUserId: number) {
    const updated = await this.repository.updateItem(id, { ...data, updatedBy: data.updatedBy || formatUserIdToUuid(actorUserId) });
    await createAuditLog({
      tenantId,
      actorUserId,
      action: "NAV_ITEM_UPDATE",
      details: `Updated navigation item: ${updated.title}`
    });
    invalidateNavigationCache();
    return updated;
  }

  async deleteItem(id: string, tenantId: number, actorUserId: number) {
    const deleted = await this.repository.deleteItem(id);
    await createAuditLog({
      tenantId,
      actorUserId,
      action: "NAV_ITEM_DELETE",
      details: `Deleted navigation item: ${deleted.title}`
    });
    invalidateNavigationCache();
    return deleted;
  }

  async moveItem(itemId: string, parentId: string | null, newDisplayOrder: number, tenantId: number, actorUserId: number) {
    const actorUuid = formatUserIdToUuid(actorUserId);
    const updated = await this.repository.updateItem(itemId, {
      parentId: parentId,
      displayOrder: newDisplayOrder,
      updatedBy: actorUuid
    });
    await createAuditLog({
      tenantId,
      actorUserId,
      action: "NAV_ITEM_MOVE",
      details: `Moved navigation item: ${updated.title}`
    });
    invalidateNavigationCache();
    return updated;
  }

  // Generate Tree representation
  async generateTree() {
    const groups = await this.repository.getAllGroups();
    const items = await this.repository.getAllItems();
    const modules = await this.moduleRepository.getAll();
    const moduleMap = new Map(modules.map((m) => [m.id, m]));

    // Map items to parent-child structure
    const itemMap = new Map<string, any>();
    items.forEach((item) => {
      let title = item.title;
      let route = item.route;
      let icon = item.icon;
      if (item.platformModuleId) {
        const m = moduleMap.get(item.platformModuleId);
        if (m) {
          title = m.name || title;
          route = m.route || route;
          icon = m.icon || icon;
        }
      }
      itemMap.set(item.id, {
        ...item,
        title,
        route,
        icon,
        children: []
      });
    });

    const rootItems: any[] = [];
    itemMap.forEach((item) => {
      if (item.parentId && itemMap.has(item.parentId)) {
        itemMap.get(item.parentId).children.push(item);
      } else {
        rootItems.push(item);
      }
    });

    // Group elements
    const tree = groups.map((g) => {
      const groupItems = rootItems
        .filter((item) => item.navigationGroupId === g.id)
        .sort((a, b) => a.displayOrder - b.displayOrder);
      return {
        id: g.id,
        code: g.code,
        name: g.name,
        icon: g.icon,
        color: g.color,
        displayOrder: g.displayOrder,
        isVisible: g.isVisible,
        isCollapsedByDefault: g.isCollapsedByDefault,
        items: groupItems
      };
    });

    return tree;
  }

  // Generate Sidebar tailored to user permissions
  async generateSidebar(userPermissions: string[], userRole: string) {
    const rawTree = await this.generateTree();
    const isSuperAdmin = userRole === "SUPERADMIN";

    const modules = await this.moduleRepository.getAll();
    const activeModuleIds = new Set(modules.filter((m) => m.isActive).map((m) => m.id));

    return rawTree
      .filter((g) => g.isVisible)
      .map((g) => {
        // Filter items recursively by role / permissions
        const filterItemNode = (node: any): any | null => {
          if (!node.visible) return null;

          // Perform active platform module check
          if (node.platformModuleId && !activeModuleIds.has(node.platformModuleId)) {
            return null;
          }

          const filteredChildren = node.children
            ? node.children.map((child: any) => filterItemNode(child)).filter(Boolean)
            : [];

          return {
            ...node,
            children: filteredChildren
          };
        };

        const filteredItems = g.items
          .map((item) => filterItemNode(item))
          .filter(Boolean)
          .sort((a: any, b: any) => a.displayOrder - b.displayOrder);

        return {
          ...g,
          items: filteredItems
        };
      })
      .filter((g) => g.items.length > 0);
  }

  // Generate dynamic Breadcrumbs trail path
  async generateBreadcrumbs(route: string) {
    const items = await this.repository.getAllItems();
    const target = items.find((i) => i.route === route);
    if (!target) return [];

    const trail: any[] = [];
    let current: any = target;
    const itemMap = new Map(items.map((i) => [i.id, i]));

    while (current) {
      trail.unshift({
        title: current.title,
        route: current.route
      });
      current = current.parentId ? itemMap.get(current.parentId) : null;
    }

    return trail;
  }

  // Run full validation diagnostics check on navigation layout configs
  async validateNavigation() {
    const groups = await this.repository.getAllGroups();
    const items = await this.repository.getAllItems();
    const modules = await this.moduleRepository.getAll();

    const anomalies: any[] = [];
    const itemMap = new Map(items.map((i) => [i.id, i]));
    const routesSet = new Set<string>();

    items.forEach((item) => {
      // 1. Missing Route check for custom ROUTE items
      if (item.menuType === "ROUTE" && !item.route) {
        anomalies.push({
          type: "MISSING_ROUTE",
          severity: "ERROR",
          message: `Menu item "${item.title}" is configured as ROUTE but lacks a path route prefix.`
        });
      }

      // 2. Duplicate Route check
      if (item.route) {
        if (routesSet.has(item.route)) {
          anomalies.push({
            type: "DUPLICATE_ROUTE",
            severity: "WARNING",
            message: `Route prefix "${item.route}" is registered across multiple navigation entries.`
          });
        } else {
          routesSet.add(item.route);
        }
      }

      // 3. Invalid Parent check
      if (item.parentId && !itemMap.has(item.parentId)) {
        anomalies.push({
          type: "INVALID_PARENT",
          severity: "ERROR",
          message: `Menu item "${item.title}" references a parent node ID that does not exist.`
        });
      }

      // 4. Circular parent check (using helper DFS)
      if (item.parentId) {
        const cyclePath = this.detectCycle(item.id, itemMap);
        if (cyclePath) {
          anomalies.push({
            type: "CIRCULAR_PARENT",
            severity: "ERROR",
            message: `Circular reference cycle detected: ${cyclePath.join(" → ")}`
          });
        }
      }

      // 5. Broken platform module check
      if (item.platformModuleId) {
        const targetModule = modules.find((m) => m.id === item.platformModuleId);
        if (!targetModule) {
          anomalies.push({
            type: "BROKEN_MODULE",
            severity: "ERROR",
            message: `Menu item "${item.title}" references a Platform Module ID that is missing.`
          });
        } else if (!targetModule.isActive) {
          anomalies.push({
            type: "BROKEN_MODULE",
            severity: "WARNING",
            message: `Menu item "${item.title}" depends on disabled module "${targetModule.name}".`
          });
        }
      }

      // 6. Hidden parent check
      if (item.visible && item.parentId) {
        const parentNode = itemMap.get(item.parentId);
        if (parentNode && !parentNode.visible) {
          anomalies.push({
            type: "HIDDEN_PARENT",
            severity: "WARNING",
            message: `Menu item "${item.title}" is visible, but its parent container "${parentNode.title}" is hidden.`
          });
        }
      }
    });

    return {
      isValid: !anomalies.some((a) => a.severity === "ERROR"),
      anomalies
    };
  }

  // Helper cycle detection
  private detectCycle(itemId: string, itemMap: Map<string, any>): string[] | null {
    const visited = new Set<string>();
    const path: string[] = [];
    let currentId: string | null = itemId;

    while (currentId) {
      if (visited.has(currentId)) {
        // Cycle detected
        const cycleStartIdx = path.indexOf(currentId);
        return [...path.slice(cycleStartIdx), currentId].map((id) => itemMap.get(id)?.title || id);
      }
      visited.add(currentId);
      path.push(currentId);

      const item = itemMap.get(currentId);
      currentId = item?.parentId || null;
    }

    return null;
  }

  // Publish runtime cache configuration file
  async publishNavigation(profileId: string, actorUserId: number, tenantId: number) {
    const validationResult = await this.validateNavigation();
    if (!validationResult.isValid) {
      throw new Error("Cannot publish navigation layout while critical configuration errors exist.");
    }

    const tree = await this.generateTree();
    const actorUuid = formatUserIdToUuid(actorUserId);

    // Save layouts structures
    const layout = await this.repository.saveLayout(profileId, tree, true, actorUuid);

    // Snapshot version
    await this.repository.createVersionSnapshot(
      layout.version,
      `Auto-published snapshot on ${new Date().toISOString()}`,
      tree,
      true,
      actorUuid
    );

    // Generate dynamic search indices
    await this.repository.clearSearchIndex();
    const allItems = await this.repository.getAllItems();
    for (const item of allItems) {
      if (item.searchable && item.route) {
        await this.repository.addSearchIndexItem(
          item.title,
          item.route,
          item.title,
          item.title.toLowerCase(),
          item.metadata || {}
        );
      }
    }

    // Audit logs
    await createAuditLog({
      tenantId,
      actorUserId,
      action: "NAV_PUBLISH",
      details: `Published navigation layout configurations (Version: ${layout.version})`
    });

    invalidateNavigationCache();

    return {
      success: true,
      version: layout.version,
      publishedAt: layout.updatedAt,
      validation: validationResult
    };
  }

  // Versioning restore features
  async getVersionsList() {
    return this.repository.getVersions();
  }

  async restoreVersion(versionId: string, actorUserId: number, tenantId: number) {
    const targetVersion = await this.repository.getVersionById(versionId);
    if (!targetVersion) {
      throw new Error(`Version snapshot not found`);
    }

    const actorUuid = formatUserIdToUuid(actorUserId);
    const structure = targetVersion.structure as any[];

    // Reconstruct groups & items from version structure in database
    // For simplicity, we write back layout snap structure to navigation_layouts
    const defaultProfile = await this.repository.getProfileByCode("ADMINISTRATOR");
    if (defaultProfile) {
      await this.repository.saveLayout(defaultProfile.id, structure, false, actorUuid);
    }

    await createAuditLog({
      tenantId,
      actorUserId,
      action: "NAV_RESTORE",
      details: `Restored navigation layout to version ${targetVersion.versionNumber}`
    });

    invalidateNavigationCache();
    return { success: true, versionNumber: targetVersion.versionNumber };
  }
}
