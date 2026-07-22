/**
 * EWP-004 Infrastructure Repository — PrismaNotificationRecipientRepository
 * Governed by CC-004, ES-001, ES-009, ES-010
 */

import { prisma } from "@/lib/prisma";
import { INotificationRecipientRepository } from "../../domain/recipients/INotificationRecipientRepository";
import { NotificationRecipient, RecipientType, RecipientStatus } from "../../domain/recipients/NotificationRecipient";
import { DuplicateSequenceException } from "../../domain/recipients/NotificationRecipientErrors";

export class OptimisticLockException extends Error {
  constructor(aggregateId: string, version: number) {
    super(`Optimistic concurrency lock conflict on recipient aggregate ${aggregateId} at version ${version}`);
    this.name = "OptimisticLockException";
  }
}

export class PrismaNotificationRecipientRepository implements INotificationRecipientRepository {
  private toDomain(row: any): NotificationRecipient {
    return NotificationRecipient.create({
      id: row.id,
      notificationId: row.notificationId,
      tenantId: row.tenantId,
      workspaceId: row.workspaceId,
      recipientSequence: row.recipientSequence,
      recipientType: row.recipientType as RecipientType,
      recipientUserId: row.recipientUserId,
      recipientGroupId: row.recipientGroupId,
      recipientEndpoint: row.recipientEndpoint,
      channelId: row.channelId,
      deliveryPreferenceSnapshot: row.deliveryPreferenceSnapshot as Record<string, any> | null,
      localization: {
        culture: row.culture,
        language: row.language,
        timezone: row.timezone,
      },
      status: row.status as RecipientStatus,
      suppressionReason: row.suppressionReason,
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

  async findById(id: string, tenantId: string): Promise<NotificationRecipient | null> {
    const row = await prisma.notificationRecipient.findFirst({
      where: {
        id,
        tenantId,
        isDeleted: false,
      },
    });

    if (!row) return null;
    return this.toDomain(row);
  }

  async listByNotification(notificationId: string, tenantId: string): Promise<NotificationRecipient[]> {
    const rows = await prisma.notificationRecipient.findMany({
      where: {
        notificationId,
        tenantId,
        isDeleted: false,
      },
      orderBy: { recipientSequence: "asc" },
    });

    return rows.map((r) => this.toDomain(r));
  }

  async listEligible(notificationId: string, tenantId: string): Promise<NotificationRecipient[]> {
    const rows = await prisma.notificationRecipient.findMany({
      where: {
        notificationId,
        tenantId,
        status: "ELIGIBLE",
        isDeleted: false,
      },
      orderBy: { recipientSequence: "asc" },
    });

    return rows.map((r) => this.toDomain(r));
  }

  async listSuppressed(notificationId: string, tenantId: string): Promise<NotificationRecipient[]> {
    const rows = await prisma.notificationRecipient.findMany({
      where: {
        notificationId,
        tenantId,
        status: "SUPPRESSED",
        isDeleted: false,
      },
      orderBy: { recipientSequence: "asc" },
    });

    return rows.map((r) => this.toDomain(r));
  }

  async listByRecipientUser(tenantId: string, recipientUserId: string): Promise<NotificationRecipient[]> {
    const rows = await prisma.notificationRecipient.findMany({
      where: {
        tenantId,
        recipientUserId,
        isDeleted: false,
      },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((r) => this.toDomain(r));
  }

  async existsRecipientSequence(notificationId: string, recipientSequence: number): Promise<boolean> {
    const count = await prisma.notificationRecipient.count({
      where: {
        notificationId,
        recipientSequence,
        isDeleted: false,
      },
    });

    return count > 0;
  }

  async save(recipient: NotificationRecipient): Promise<void> {
    try {
      const existing = await prisma.notificationRecipient.findUnique({
        where: { id: recipient.id },
      });

      if (!existing) {
        // Insert path
        await prisma.notificationRecipient.create({
          data: {
            id: recipient.id,
            notificationId: recipient.notificationId,
            tenantId: recipient.tenantId,
            workspaceId: recipient.workspaceId,
            recipientSequence: recipient.recipientSequence,
            recipientType: recipient.recipientType,
            recipientUserId: recipient.recipientUserId,
            recipientGroupId: recipient.recipientGroupId,
            recipientEndpoint: recipient.recipientEndpoint,
            channelId: recipient.channelId,
            deliveryPreferenceSnapshot: recipient.deliveryPreferenceSnapshot ?? undefined,
            culture: recipient.localization.culture,
            language: recipient.localization.language,
            timezone: recipient.localization.timezone,
            status: recipient.status,
            suppressionReason: recipient.suppressionReason,
            createdAt: recipient.createdAt,
            createdBy: recipient.createdBy,
            updatedAt: recipient.updatedAt,
            updatedBy: recipient.updatedBy,
            isDeleted: recipient.isDeleted,
            deletedAt: recipient.deletedAt,
            deletedBy: recipient.deletedBy,
            version: 1,
          },
        });
      } else {
        // OCC Update path
        const result = await prisma.notificationRecipient.updateMany({
          where: {
            id: recipient.id,
            tenantId: recipient.tenantId,
            version: recipient.version,
            isDeleted: false,
          },
          data: {
            status: recipient.status,
            suppressionReason: recipient.suppressionReason,
            updatedAt: recipient.updatedAt,
            updatedBy: recipient.updatedBy,
            isDeleted: recipient.isDeleted,
            deletedAt: recipient.deletedAt,
            deletedBy: recipient.deletedBy,
            version: { increment: 1 },
          },
        });

        if (result.count === 0) {
          throw new OptimisticLockException(recipient.id, recipient.version);
        }
      }
    } catch (error: any) {
      if (error instanceof OptimisticLockException) throw error;
      if (error?.code === "P2002") {
        throw new DuplicateSequenceException(recipient.notificationId, recipient.recipientSequence);
      }
      throw error;
    }
  }

  async delete(id: string, tenantId: string, deletedBy: string): Promise<void> {
    await prisma.notificationRecipient.updateMany({
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
