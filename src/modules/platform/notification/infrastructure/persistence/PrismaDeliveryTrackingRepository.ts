/**
 * EWP-006 Infrastructure Repository — PrismaDeliveryTrackingRepository
 * Governed by CC-006, ES-001, ES-009, ES-010
 */

import { prisma } from "@/lib/prisma";
import { IDeliveryTrackingRepository } from "../../domain/tracking/IDeliveryTrackingRepository";
import { DeliveryTracking, TrackingStatus } from "../../domain/tracking/DeliveryTracking";
import { TrackingTimeline } from "../../domain/tracking/value-objects/TrackingTimeline";
import { DuplicateTrackingException } from "../../domain/tracking/DeliveryTrackingErrors";

export class OptimisticLockException extends Error {
  constructor(aggregateId: string, version: number) {
    super(`Optimistic concurrency lock conflict on tracking aggregate ${aggregateId} at version ${version}`);
    this.name = "OptimisticLockException";
  }
}

export class PrismaDeliveryTrackingRepository implements IDeliveryTrackingRepository {
  private toDomain(row: any): DeliveryTracking {
    const timelineJson = Array.isArray(row.trackingTimeline) ? row.trackingTimeline : [];
    const timeline = TrackingTimeline.fromJSON(timelineJson);

    return DeliveryTracking.create({
      id: row.id,
      notificationId: row.notificationId,
      tenantId: row.tenantId,
      workspaceId: row.workspaceId,
      correlationId: row.correlationId,
      providerProfileId: row.providerProfileId,
      trackingStatus: row.trackingStatus as TrackingStatus,
      providerAcknowledgementId: row.providerAcknowledgementId,
      providerStatus: row.providerStatus,
      providerTimestamp: row.providerTimestamp,
      deliveryTimestamp: row.deliveryTimestamp,
      readTimestamp: row.readTimestamp,
      trackingTimeline: timeline,
      telemetryMetadata: (row.telemetryMetadata as Record<string, any>) || null,
      auditMetadata: (row.auditMetadata as Record<string, any>) || null,
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

  async findById(id: string, tenantId: string): Promise<DeliveryTracking | null> {
    const row = await prisma.deliveryTracking.findFirst({
      where: {
        id,
        tenantId,
        isDeleted: false,
      },
    });

    if (!row) return null;
    return this.toDomain(row);
  }

  async findByNotification(notificationId: string, tenantId: string): Promise<DeliveryTracking | null> {
    const row = await prisma.deliveryTracking.findFirst({
      where: {
        notificationId,
        tenantId,
        isDeleted: false,
      },
    });

    if (!row) return null;
    return this.toDomain(row);
  }

  async findByCorrelationId(correlationId: string, tenantId: string): Promise<DeliveryTracking | null> {
    const row = await prisma.deliveryTracking.findFirst({
      where: {
        correlationId,
        tenantId,
        isDeleted: false,
      },
    });

    if (!row) return null;
    return this.toDomain(row);
  }

  async listPendingAcknowledgements(tenantId: string, limit = 50): Promise<DeliveryTracking[]> {
    const rows = await prisma.deliveryTracking.findMany({
      where: {
        tenantId,
        trackingStatus: "TRACKING_STARTED",
        isDeleted: false,
      },
      take: limit,
      orderBy: { createdAt: "asc" },
    });

    return rows.map((r) => this.toDomain(r));
  }

  async listCompletedTracking(tenantId: string, limit = 50): Promise<DeliveryTracking[]> {
    const rows = await prisma.deliveryTracking.findMany({
      where: {
        tenantId,
        trackingStatus: "TRACKING_COMPLETED",
        isDeleted: false,
      },
      take: limit,
      orderBy: { updatedAt: "desc" },
    });

    return rows.map((r) => this.toDomain(r));
  }

  async existsTracking(notificationId: string): Promise<boolean> {
    const count = await prisma.deliveryTracking.count({
      where: {
        notificationId,
        isDeleted: false,
      },
    });

    return count > 0;
  }

  async save(tracking: DeliveryTracking): Promise<void> {
    try {
      const existing = await prisma.deliveryTracking.findUnique({
        where: { id: tracking.id },
      });

      if (!existing) {
        await prisma.deliveryTracking.create({
          data: {
            id: tracking.id,
            notificationId: tracking.notificationId,
            tenantId: tracking.tenantId,
            workspaceId: tracking.workspaceId,
            correlationId: tracking.correlationId,
            providerProfileId: tracking.providerProfileId,
            trackingStatus: tracking.trackingStatus,
            providerAcknowledgementId: tracking.providerAcknowledgementId,
            providerStatus: tracking.providerStatus,
            providerTimestamp: tracking.providerTimestamp,
            deliveryTimestamp: tracking.deliveryTimestamp,
            readTimestamp: tracking.readTimestamp,
            trackingTimeline: tracking.trackingTimeline.toJSON(),
            telemetryMetadata: tracking.telemetryMetadata ?? undefined,
            auditMetadata: tracking.auditMetadata ?? undefined,
            createdAt: tracking.createdAt,
            createdBy: tracking.createdBy,
            updatedAt: tracking.updatedAt,
            updatedBy: tracking.updatedBy,
            isDeleted: tracking.isDeleted,
            deletedAt: tracking.deletedAt,
            deletedBy: tracking.deletedBy,
            version: 1,
          },
        });
      } else {
        const result = await prisma.deliveryTracking.updateMany({
          where: {
            id: tracking.id,
            tenantId: tracking.tenantId,
            version: tracking.version,
            isDeleted: false,
          },
          data: {
            providerProfileId: tracking.providerProfileId,
            trackingStatus: tracking.trackingStatus,
            providerAcknowledgementId: tracking.providerAcknowledgementId,
            providerStatus: tracking.providerStatus,
            providerTimestamp: tracking.providerTimestamp,
            deliveryTimestamp: tracking.deliveryTimestamp,
            readTimestamp: tracking.readTimestamp,
            trackingTimeline: tracking.trackingTimeline.toJSON(),
            telemetryMetadata: tracking.telemetryMetadata ?? undefined,
            auditMetadata: tracking.auditMetadata ?? undefined,
            updatedAt: tracking.updatedAt,
            updatedBy: tracking.updatedBy,
            isDeleted: tracking.isDeleted,
            deletedAt: tracking.deletedAt,
            deletedBy: tracking.deletedBy,
            version: { increment: 1 },
          },
        });

        if (result.count === 0) {
          throw new OptimisticLockException(tracking.id, tracking.version);
        }
      }
    } catch (error: any) {
      if (error instanceof OptimisticLockException) throw error;
      if (error?.code === "P2002") {
        throw new DuplicateTrackingException(tracking.notificationId);
      }
      throw error;
    }
  }

  async delete(id: string, tenantId: string, deletedBy: string): Promise<void> {
    await prisma.deliveryTracking.updateMany({
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
