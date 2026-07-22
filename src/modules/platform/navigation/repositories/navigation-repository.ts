import { prisma } from "@/lib/prisma";

export interface CreateNavigationGroupDto {
  code: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  displayOrder?: number;
  isVisible?: boolean;
  isCollapsedByDefault?: boolean;
  createdBy: string;
}

export interface UpdateNavigationGroupDto {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  displayOrder?: number;
  isVisible?: boolean;
  isCollapsedByDefault?: boolean;
  updatedBy: string;
}

export interface CreateNavigationItemDto {
  title: string;
  parentId?: string;
  navigationGroupId?: string;
  platformModuleId?: string;
  entityId?: string;
  route?: string;
  icon?: string;
  displayOrder?: number;
  menuType?: string;
  target?: string;
  openInNewTab?: boolean;
  visible?: boolean;
  mobileVisible?: boolean;
  customerPortalVisible?: boolean;
  vendorPortalVisible?: boolean;
  favoriteAllowed?: boolean;
  searchable?: boolean;
  metadata?: any;
  createdBy: string;
}

export interface UpdateNavigationItemDto {
  title?: string;
  parentId?: string | null;
  navigationGroupId?: string | null;
  platformModuleId?: string | null;
  entityId?: string | null;
  route?: string | null;
  icon?: string | null;
  displayOrder?: number;
  menuType?: string;
  target?: string;
  openInNewTab?: boolean;
  visible?: boolean;
  mobileVisible?: boolean;
  customerPortalVisible?: boolean;
  vendorPortalVisible?: boolean;
  favoriteAllowed?: boolean;
  searchable?: boolean;
  metadata?: any;
  updatedBy: string;
}

export class NavigationRepository {
  // Navigation Groups
  async getAllGroups() {
    return prisma.navigationGroup.findMany({
      orderBy: { displayOrder: "asc" }
    });
  }

  async getGroupById(id: string) {
    return prisma.navigationGroup.findUnique({
      where: { id }
    });
  }

  async getGroupByCode(code: string) {
    return prisma.navigationGroup.findUnique({
      where: { code }
    });
  }

  async createGroup(data: CreateNavigationGroupDto) {
    const validUser = (data.createdBy && data.createdBy.trim()) ? data.createdBy : "00000000-0000-0000-0000-000000000000";
    return prisma.navigationGroup.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        icon: data.icon,
        color: data.color,
        displayOrder: data.displayOrder ?? 0,
        isVisible: data.isVisible !== false,
        isCollapsedByDefault: data.isCollapsedByDefault === true,
        createdBy: validUser,
        updatedBy: validUser
      }
    });
  }

  async updateGroup(id: string, data: UpdateNavigationGroupDto) {
    const validUser = (data.updatedBy && data.updatedBy.trim()) ? data.updatedBy : "00000000-0000-0000-0000-000000000000";
    return prisma.navigationGroup.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        icon: data.icon,
        color: data.color,
        displayOrder: data.displayOrder,
        isVisible: data.isVisible,
        isCollapsedByDefault: data.isCollapsedByDefault,
        updatedBy: validUser
      }
    });
  }

  async deleteGroup(id: string) {
    return prisma.navigationGroup.delete({
      where: { id }
    });
  }

  async reorderGroups(orderedIds: string[], actorUserId: string) {
    return prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.navigationGroup.update({
          where: { id },
          data: { displayOrder: index, updatedBy: actorUserId }
        })
      )
    );
  }

  // Navigation Items
  async getAllItems() {
    return prisma.navigationItem.findMany({
      orderBy: { displayOrder: "asc" }
    });
  }

  async getItemById(id: string) {
    return prisma.navigationItem.findUnique({
      where: { id },
      include: {
        children: true,
        parent: true,
        platformModule: true,
        entity: true
      }
    });
  }

  async createItem(data: CreateNavigationItemDto) {
    const validUser = (data.createdBy && data.createdBy.trim()) ? data.createdBy : "00000000-0000-0000-0000-000000000000";
    return prisma.navigationItem.create({
      data: {
        title: data.title,
        parentId: data.parentId || null,
        navigationGroupId: data.navigationGroupId || null,
        platformModuleId: data.platformModuleId || null,
        entityId: data.entityId || null,
        route: data.route,
        icon: data.icon,
        displayOrder: data.displayOrder ?? 0,
        menuType: data.menuType ?? "MODULE",
        target: data.target ?? "SAME_WINDOW",
        openInNewTab: data.openInNewTab === true,
        visible: data.visible !== false,
        mobileVisible: data.mobileVisible === true,
        customerPortalVisible: data.customerPortalVisible === true,
        vendorPortalVisible: data.vendorPortalVisible === true,
        favoriteAllowed: data.favoriteAllowed !== false,
        searchable: data.searchable !== false,
        metadata: data.metadata || {},
        createdBy: validUser,
        updatedBy: validUser
      }
    });
  }

  async updateItem(id: string, data: UpdateNavigationItemDto) {
    const validUser = (data.updatedBy && data.updatedBy.trim()) ? data.updatedBy : "00000000-0000-0000-0000-000000000000";
    return prisma.navigationItem.update({
      where: { id },
      data: {
        title: data.title,
        parentId: data.parentId || null,
        navigationGroupId: data.navigationGroupId || null,
        platformModuleId: data.platformModuleId || null,
        entityId: data.entityId || null,
        route: data.route,
        icon: data.icon,
        displayOrder: data.displayOrder,
        menuType: data.menuType,
        target: data.target,
        openInNewTab: data.openInNewTab,
        visible: data.visible,
        mobileVisible: data.mobileVisible,
        customerPortalVisible: data.customerPortalVisible,
        vendorPortalVisible: data.vendorPortalVisible,
        favoriteAllowed: data.favoriteAllowed,
        searchable: data.searchable,
        metadata: data.metadata,
        updatedBy: validUser
      }
    });
  }

  async deleteItem(id: string) {
    return prisma.navigationItem.delete({
      where: { id }
    });
  }

  async reorderItems(orderedIds: string[], actorUserId: string) {
    return prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.navigationItem.update({
          where: { id },
          data: { displayOrder: index, updatedBy: actorUserId }
        })
      )
    );
  }

  // Navigation Profiles
  async getProfiles() {
    return prisma.navigationProfile.findMany({
      include: { layouts: true },
      orderBy: { name: "asc" }
    });
  }

  async getProfileByCode(code: string) {
    return prisma.navigationProfile.findUnique({
      where: { code },
      include: { layouts: true }
    });
  }

  async createProfile(code: string, name: string, description: string | null, createdBy: string) {
    return prisma.navigationProfile.create({
      data: {
        code,
        name,
        description,
        createdBy,
        updatedBy: createdBy
      }
    });
  }

  // Navigation Layouts
  async getLayoutByProfile(profileId: string) {
    return prisma.navigationLayout.findFirst({
      where: { profileId }
    });
  }

  async saveLayout(profileId: string, structure: any, isPublished: boolean, actorUserId: string) {
    const existing = await this.getLayoutByProfile(profileId);
    if (existing) {
      return prisma.navigationLayout.update({
        where: { id: existing.id },
        data: {
          navigationStructure: structure,
          isPublished,
          version: isPublished ? existing.version + 1 : existing.version,
          updatedBy: actorUserId
        }
      });
    } else {
      return prisma.navigationLayout.create({
        data: {
          profileId,
          navigationStructure: structure,
          isPublished,
          version: 1,
          createdBy: actorUserId,
          updatedBy: actorUserId
        }
      });
    }
  }

  // Navigation Versions & History
  async createVersionSnapshot(versionNumber: number, description: string | null, structure: any, isPublished: boolean, createdBy: string) {
    return prisma.navigationVersion.create({
      data: {
        versionNumber,
        description,
        structure,
        isPublished,
        createdBy
      }
    });
  }

  async getVersions() {
    return prisma.navigationVersion.findMany({
      orderBy: { versionNumber: "desc" }
    });
  }

  async getVersionById(id: string) {
    return prisma.navigationVersion.findUnique({
      where: { id }
    });
  }

  async addHistoryLog(action: string, details: string | null, performedBy: string) {
    return prisma.navigationHistory.create({
      data: {
        action,
        details,
        performedBy
      }
    });
  }

  async getHistoryLogs() {
    return prisma.navigationHistory.findMany({
      orderBy: { createdAt: "desc" },
      take: 100
    });
  }

  // Search Index Mapping
  async clearSearchIndex() {
    return prisma.navigationSearchIndex.deleteMany({});
  }

  async addSearchIndexItem(title: string, route: string, description: string | null, keywords: string | null, metadata: any) {
    return prisma.navigationSearchIndex.create({
      data: {
        title,
        route,
        description,
        keywords,
        metadata
      }
    });
  }

  async getSearchIndex() {
    return prisma.navigationSearchIndex.findMany();
  }
}
