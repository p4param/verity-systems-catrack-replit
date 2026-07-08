import { prisma } from "@/lib/prisma";

export interface CreateModuleDto {
  code: string;
  name: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
  isActive?: boolean;
  isSystem?: boolean;
  metadata?: any;
  navigationGroup?: string;
  displayOrder?: number;
  route?: string;
  defaultPage?: string;
  color?: string;
  badge?: string;
  badgeColor?: string;
  menuVisible?: boolean;
  showInSearch?: boolean;
  showOnDashboard?: boolean;
  showInMobile?: boolean;
  isLicensed?: boolean;
  requiresLicense?: boolean;
  featureFlag?: string;
  moduleDependencies?: any;
  minimumRole?: string;
  defaultPermissionSet?: any;
  defaultLandingPage?: string;
  helpUrl?: string;
  documentationUrl?: string;
  supportEmail?: string;
  createdBy: string;
}

export interface UpdateModuleDto {
  name?: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
  isActive?: boolean;
  isSystem?: boolean;
  metadata?: any;
  navigationGroup?: string;
  displayOrder?: number;
  route?: string;
  defaultPage?: string;
  color?: string;
  badge?: string;
  badgeColor?: string;
  menuVisible?: boolean;
  showInSearch?: boolean;
  showOnDashboard?: boolean;
  showInMobile?: boolean;
  isLicensed?: boolean;
  requiresLicense?: boolean;
  featureFlag?: string;
  moduleDependencies?: any;
  minimumRole?: string;
  defaultPermissionSet?: any;
  defaultLandingPage?: string;
  helpUrl?: string;
  documentationUrl?: string;
  supportEmail?: string;
  updatedBy: string;
}

export class PlatformModuleRepository {
  async getAll() {
    return prisma.platformModule.findMany({
      orderBy: { sortOrder: "asc" },
    });
  }

  async getById(id: string) {
    return prisma.platformModule.findUnique({
      where: { id },
    });
  }

  async getByCode(code: string) {
    return prisma.platformModule.findUnique({
      where: { code },
    });
  }

  async create(data: CreateModuleDto) {
    return prisma.platformModule.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        icon: data.icon,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
        isSystem: data.isSystem ?? false,
        metadata: data.metadata ?? {},
        navigationGroup: data.navigationGroup ?? null,
        displayOrder: data.displayOrder ?? 0,
        route: data.route ?? null,
        defaultPage: data.defaultPage ?? null,
        color: data.color ?? null,
        badge: data.badge ?? null,
        badgeColor: data.badgeColor ?? null,
        menuVisible: data.menuVisible !== false,
        showInSearch: data.showInSearch !== false,
        showOnDashboard: data.showOnDashboard !== false,
        showInMobile: data.showInMobile === true,
        isLicensed: data.isLicensed !== false,
        requiresLicense: data.requiresLicense === true,
        featureFlag: data.featureFlag ?? "Production",
        moduleDependencies: data.moduleDependencies ?? [],
        minimumRole: data.minimumRole ?? "USER",
        defaultPermissionSet: data.defaultPermissionSet ?? [],
        defaultLandingPage: data.defaultLandingPage ?? null,
        helpUrl: data.helpUrl ?? null,
        documentationUrl: data.documentationUrl ?? null,
        supportEmail: data.supportEmail ?? null,
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      },
    });
  }

  async update(id: string, data: UpdateModuleDto) {
    return prisma.platformModule.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        icon: data.icon,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
        isSystem: data.isSystem,
        metadata: data.metadata,
        navigationGroup: data.navigationGroup,
        displayOrder: data.displayOrder,
        route: data.route,
        defaultPage: data.defaultPage,
        color: data.color,
        badge: data.badge,
        badgeColor: data.badgeColor,
        menuVisible: data.menuVisible,
        showInSearch: data.showInSearch,
        showOnDashboard: data.showOnDashboard,
        showInMobile: data.showInMobile,
        isLicensed: data.isLicensed,
        requiresLicense: data.requiresLicense,
        featureFlag: data.featureFlag,
        moduleDependencies: data.moduleDependencies,
        minimumRole: data.minimumRole,
        defaultPermissionSet: data.defaultPermissionSet,
        defaultLandingPage: data.defaultLandingPage,
        helpUrl: data.helpUrl,
        documentationUrl: data.documentationUrl,
        supportEmail: data.supportEmail,
        updatedBy: data.updatedBy,
      },
    });
  }

  async delete(id: string) {
    return prisma.platformModule.delete({
      where: { id },
    });
  }

  async getNavigation() {
    return prisma.platformModule.findMany({
      where: {
        isActive: true,
        menuVisible: true,
      },
      orderBy: { displayOrder: "asc" },
    });
  }

  async getEnabledModules() {
    return prisma.platformModule.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  }

  async getModulesByGroup(group: string) {
    return prisma.platformModule.findMany({
      where: { navigationGroup: group },
      orderBy: { displayOrder: "asc" },
    });
  }

  async getVisibleModules() {
    return prisma.platformModule.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });
  }

  async getDashboardModules() {
    return prisma.platformModule.findMany({
      where: {
        isActive: true,
        showOnDashboard: true,
      },
      orderBy: { displayOrder: "asc" },
    });
  }
}
