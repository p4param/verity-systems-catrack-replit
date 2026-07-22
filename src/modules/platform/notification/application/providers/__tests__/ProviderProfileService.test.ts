/**
 * EWP-005 Application Service Unit Tests — ProviderProfileService
 * Governed by CC-005, ES-008, ES-009, ES-010
 */

import { ProviderProfileService } from "../ProviderProfileService";
import { IProviderProfileRepository } from "../../../domain/providers/IProviderProfileRepository";
import { ProviderProfile } from "../../../domain/providers/ProviderProfile";
import { ProviderProfileNotFoundError } from "../../../domain/providers/ProviderProfileErrors";

class InMemoryProviderProfileRepository implements IProviderProfileRepository {
  private items: Map<string, ProviderProfile> = new Map();

  async findById(id: string, tenantId: string): Promise<ProviderProfile | null> {
    const item = this.items.get(id);
    if (!item || item.tenantId !== tenantId || item.isDeleted) return null;
    return item;
  }

  async findByCode(tenantId: string, providerCode: string): Promise<ProviderProfile | null> {
    const code = providerCode.toUpperCase();
    return Array.from(this.items.values()).find(
      (p) => p.tenantId === tenantId && p.providerCode === code && !p.isDeleted
    ) || null;
  }

  async findDefaultProvider(tenantId: string, channelId: string): Promise<ProviderProfile | null> {
    return Array.from(this.items.values()).find(
      (p) => p.tenantId === tenantId && p.isDefault && p.isEnabled && p.supportedChannels.includes(channelId) && !p.isDeleted
    ) || null;
  }

  async listEnabledProviders(tenantId: string): Promise<ProviderProfile[]> {
    return Array.from(this.items.values()).filter(
      (p) => p.tenantId === tenantId && p.isEnabled && !p.isDeleted
    );
  }

  async listHealthyProviders(tenantId: string): Promise<ProviderProfile[]> {
    return Array.from(this.items.values()).filter(
      (p) => p.tenantId === tenantId && p.isEnabled && p.healthStatus === "HEALTHY" && !p.isDeleted
    );
  }

  async listByChannel(tenantId: string, channelId: string): Promise<ProviderProfile[]> {
    return Array.from(this.items.values()).filter(
      (p) => p.tenantId === tenantId && p.isEnabled && p.supportedChannels.includes(channelId) && !p.isDeleted
    );
  }

  async existsProviderCode(tenantId: string, providerCode: string): Promise<boolean> {
    const code = providerCode.toUpperCase();
    return Array.from(this.items.values()).some(
      (p) => p.tenantId === tenantId && p.providerCode === code && !p.isDeleted
    );
  }

  async save(provider: ProviderProfile): Promise<void> {
    this.items.set(provider.id, provider);
  }

  async clearOtherDefaults(tenantId: string, channelId: string, excludeProviderId: string): Promise<void> {
    for (const p of Array.from(this.items.values())) {
      if (p.tenantId === tenantId && p.id !== excludeProviderId && p.supportedChannels.includes(channelId)) {
        p.setDefault(false, channelId);
      }
    }
  }

  async delete(id: string, tenantId: string, deletedBy: string): Promise<void> {
    const item = this.items.get(id);
    if (item && item.tenantId === tenantId) {
      item.softDelete(deletedBy);
    }
  }
}

describe("ProviderProfileService", () => {
  let service: ProviderProfileService;
  let repository: InMemoryProviderProfileRepository;

  const tenantId = "33333333-3333-3333-3333-333333333333";
  const channelId = "channel-email-001";

  const defaultRegisterProps = {
    tenantId,
    providerCode: "AWS_SES_PROD",
    providerName: "AWS SES Email Gateway",
    providerType: "SMTP" as const,
    supportedChannels: [channelId],
    capabilityMetadata: { rateLimit: 500 },
  };

  beforeEach(() => {
    repository = new InMemoryProviderProfileRepository();
    service = new ProviderProfileService(repository);
  });

  it("registerProvider orchestrates creation and publishes ProviderRegisteredEvent", async () => {
    const provider = await service.registerProvider(defaultRegisterProps, "actor-1");

    expect(provider.id).toBeDefined();
    expect(provider.status).toBe("CONFIGURED");
    expect(provider.createdBy).toBe("actor-1");

    const events = service.getPublishedEvents();
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe("ProviderRegistered");
  });

  it("registerProvider throws DuplicateProviderCodeException on code collision", async () => {
    await service.registerProvider(defaultRegisterProps, "actor-1");

    await expect(
      service.registerProvider(defaultRegisterProps, "actor-1")
    ).rejects.toThrow("already exists within tenant");
  });

  it("enableProvider orchestrates state transition and publishes ProviderEnabledEvent", async () => {
    const provider = await service.registerProvider(defaultRegisterProps, "actor-1");
    service.clearPublishedEvents();

    const updated = await service.enableProvider(provider.id, tenantId, "actor-2");

    expect(updated.status).toBe("ACTIVE");
    expect(updated.isEnabled).toBe(true);

    const events = service.getPublishedEvents();
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe("ProviderEnabled");
  });

  it("disableProvider orchestrates state transition and publishes ProviderDisabledEvent", async () => {
    const provider = await service.registerProvider(defaultRegisterProps, "actor-1");
    await service.enableProvider(provider.id, tenantId);
    service.clearPublishedEvents();

    const updated = await service.disableProvider(provider.id, tenantId, "actor-3");

    expect(updated.status).toBe("DISABLED");
    expect(updated.isEnabled).toBe(false);

    const events = service.getPublishedEvents();
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe("ProviderDisabled");
  });

  it("retireProvider orchestrates terminal transition and publishes ProviderRetiredEvent", async () => {
    const provider = await service.registerProvider(defaultRegisterProps, "actor-1");
    service.clearPublishedEvents();

    const updated = await service.retireProvider(provider.id, tenantId, "actor-4");

    expect(updated.status).toBe("RETIRED");

    const events = service.getPublishedEvents();
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe("ProviderRetired");
  });

  it("updateHealthStatus orchestrates health change and publishes ProviderHealthUpdatedEvent", async () => {
    const provider = await service.registerProvider(defaultRegisterProps, "actor-1");
    service.clearPublishedEvents();

    const updated = await service.updateHealthStatus(provider.id, tenantId, "DEGRADED", "health-ping");

    expect(updated.healthStatus).toBe("DEGRADED");

    const events = service.getPublishedEvents();
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe("ProviderHealthUpdated");
  });

  it("setDefault coordinates single-default invariant across channel providers", async () => {
    const p1 = await service.registerProvider(
      { ...defaultRegisterProps, providerCode: "PROV_1", isDefault: true },
      "actor-1"
    );
    const p2 = await service.registerProvider(
      { ...defaultRegisterProps, providerCode: "PROV_2", isDefault: false },
      "actor-1"
    );

    service.clearPublishedEvents();

    await service.setDefault(p2.id, tenantId, channelId, true, "actor-1");

    const fetchedP1 = await service.getById(p1.id, tenantId);
    const fetchedP2 = await service.getById(p2.id, tenantId);

    expect(fetchedP1?.isDefault).toBe(false);
    expect(fetchedP2?.isDefault).toBe(true);

    const events = service.getPublishedEvents();
    expect(events.some((e) => e.eventType === "DefaultProviderChanged")).toBe(true);
  });

  it("throws ProviderProfileNotFoundError on non-existent providerId", async () => {
    await expect(
      service.enableProvider("invalid-id", tenantId, "actor-1")
    ).rejects.toThrow(ProviderProfileNotFoundError);
  });
});
