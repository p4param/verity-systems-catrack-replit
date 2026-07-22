/**
 * EWP-005 Infrastructure Repository — PrismaProviderProfileRepository
 * Governed by CC-005, ES-001, ES-009, ES-010
 */

import { prisma } from "@/lib/prisma";
import { IProviderProfileRepository } from "../../domain/providers/IProviderProfileRepository";
import { ProviderProfile, ProviderType, ProviderStatus, ProviderHealthStatus } from "../../domain/providers/ProviderProfile";
import { DuplicateProviderCodeException } from "../../domain/providers/ProviderProfileErrors";

export class OptimisticLockException extends Error {
  constructor(aggregateId: string, version: number) {
    super(`Optimistic concurrency lock conflict on provider aggregate ${aggregateId} at version ${version}`);
    this.name = "OptimisticLockException";
  }
}

export class PrismaProviderProfileRepository implements IProviderProfileRepository {
  private toDomain(row: any): ProviderProfile {
    return ProviderProfile.create({
      id: row.id,
      tenantId: row.tenantId,
      workspaceId: row.workspaceId,
      providerCode: row.providerCode,
      providerName: row.providerName,
      description: row.description,
      providerType: row.providerType as ProviderType,
      status: row.status as ProviderStatus,
      healthStatus: row.healthStatus as ProviderHealthStatus,
      priority: row.priority,
      isDefault: row.isDefault,
      isEnabled: row.isEnabled,
      supportedChannels: (row.supportedChannels as string[]) || [],
      capabilityMetadata: (row.capabilityMetadata as Record<string, any>) || {},
      configurationMetadata: (row.configurationMetadata as Record<string, any>) || null,
      createdAt: row.createdAt,
      createdBy: row.createdBy,
      updatedAt: row.updatedAt,
      updatedBy: row.updatedBy,
      isDeleted: row.isDeleted,
      deletedAt: row.deletedAt,
      deletedBy: row.deletedBy,
      version: row.version,
    });
  }

  async findById(id: string, tenantId: string): Promise<ProviderProfile | null> {
    const row = await prisma.providerProfile.findFirst({
      where: {
        id,
        tenantId,
        isDeleted: false,
      },
    });

    if (!row) return null;
    return this.toDomain(row);
  }

  async findByCode(tenantId: string, providerCode: string): Promise<ProviderProfile | null> {
    const row = await prisma.providerProfile.findFirst({
      where: {
        tenantId,
        providerCode: providerCode.toUpperCase(),
        isDeleted: false,
      },
    });

    if (!row) return null;
    return this.toDomain(row);
  }

  async findDefaultProvider(tenantId: string, channelId: string): Promise<ProviderProfile | null> {
    const rows = await prisma.providerProfile.findMany({
      where: {
        tenantId,
        isDefault: true,
        isEnabled: true,
        isDeleted: false,
      },
      orderBy: { priority: "asc" },
    });

    const defaultProvider = rows.find((row) => {
      const channels = (row.supportedChannels as string[]) || [];
      return channels.includes(channelId);
    });

    if (!defaultProvider) return null;
    return this.toDomain(defaultProvider);
  }

  async listEnabledProviders(tenantId: string): Promise<ProviderProfile[]> {
    const rows = await prisma.providerProfile.findMany({
      where: {
        tenantId,
        isEnabled: true,
        isDeleted: false,
      },
      orderBy: { priority: "asc" },
    });

    return rows.map((r) => this.toDomain(r));
  }

  async listHealthyProviders(tenantId: string): Promise<ProviderProfile[]> {
    const rows = await prisma.providerProfile.findMany({
      where: {
        tenantId,
        isEnabled: true,
        healthStatus: "HEALTHY",
        isDeleted: false,
      },
      orderBy: { priority: "asc" },
    });

    return rows.map((r) => this.toDomain(r));
  }

  async listByChannel(tenantId: string, channelId: string): Promise<ProviderProfile[]> {
    const rows = await prisma.providerProfile.findMany({
      where: {
        tenantId,
        isEnabled: true,
        isDeleted: false,
      },
      orderBy: { priority: "asc" },
    });

    const channelProviders = rows.filter((row) => {
      const channels = (row.supportedChannels as string[]) || [];
      return channels.includes(channelId);
    });

    return channelProviders.map((r) => this.toDomain(r));
  }

  async existsProviderCode(tenantId: string, providerCode: string): Promise<boolean> {
    const count = await prisma.providerProfile.count({
      where: {
        tenantId,
        providerCode: providerCode.toUpperCase(),
        isDeleted: false,
      },
    });

    return count > 0;
  }

  async save(provider: ProviderProfile): Promise<void> {
    try {
      const existing = await prisma.providerProfile.findUnique({
        where: { id: provider.id },
      });

      if (!existing) {
        await prisma.providerProfile.create({
          data: {
            id: provider.id,
            tenantId: provider.tenantId,
            workspaceId: provider.workspaceId,
            providerCode: provider.providerCode,
            providerName: provider.providerName,
            description: provider.description,
            providerType: provider.providerType,
            status: provider.status,
            healthStatus: provider.healthStatus,
            priority: provider.priority,
            isDefault: provider.isDefault,
            isEnabled: provider.isEnabled,
            supportedChannels: provider.supportedChannels,
            capabilityMetadata: provider.capabilityMetadata,
            configurationMetadata: provider.configurationMetadata ?? undefined,
            createdAt: provider.createdAt,
            createdBy: provider.createdBy,
            updatedAt: provider.updatedAt,
            updatedBy: provider.updatedBy,
            isDeleted: provider.isDeleted,
            deletedAt: provider.deletedAt,
            deletedBy: provider.deletedBy,
            version: 1,
          },
        });
      } else {
        const result = await prisma.providerProfile.updateMany({
          where: {
            id: provider.id,
            tenantId: provider.tenantId,
            version: provider.version,
            isDeleted: false,
          },
          data: {
            providerName: provider.providerName,
            description: provider.description,
            status: provider.status,
            healthStatus: provider.healthStatus,
            priority: provider.priority,
            isDefault: provider.isDefault,
            isEnabled: provider.isEnabled,
            supportedChannels: provider.supportedChannels,
            capabilityMetadata: provider.capabilityMetadata,
            configurationMetadata: provider.configurationMetadata ?? undefined,
            updatedAt: provider.updatedAt,
            updatedBy: provider.updatedBy,
            isDeleted: provider.isDeleted,
            deletedAt: provider.deletedAt,
            deletedBy: provider.deletedBy,
            version: { increment: 1 },
          },
        });

        if (result.count === 0) {
          throw new OptimisticLockException(provider.id, provider.version);
        }
      }
    } catch (error: any) {
      if (error instanceof OptimisticLockException) throw error;
      if (error?.code === "P2002") {
        throw new DuplicateProviderCodeException(provider.tenantId, provider.providerCode);
      }
      throw error;
    }
  }

  async clearOtherDefaults(tenantId: string, channelId: string, excludeProviderId: string): Promise<void> {
    // Mandated single transaction boundary (AR-011)
    await prisma.$transaction(async (tx) => {
      const rows = await tx.providerProfile.findMany({
        where: {
          tenantId,
          isDefault: true,
          isDeleted: false,
          id: { not: excludeProviderId },
        },
      });

      for (const row of rows) {
        const channels = (row.supportedChannels as string[]) || [];
        if (channels.includes(channelId)) {
          await tx.providerProfile.update({
            where: { id: row.id },
            data: { isDefault: false, version: { increment: 1 } },
          });
        }
      }
    });
  }

  async delete(id: string, tenantId: string, deletedBy: string): Promise<void> {
    await prisma.providerProfile.updateMany({
      where: {
        id,
        tenantId,
        isDeleted: false,
      },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy,
      },
    });
  }
}
