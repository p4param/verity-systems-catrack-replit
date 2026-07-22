/**
 * EWP-005 Infrastructure Repository Integration Tests — PrismaProviderProfileRepository
 * Governed by CC-005, ES-001, ES-009, ES-010
 */

import {
  PrismaProviderProfileRepository,
  OptimisticLockException,
} from "../PrismaProviderProfileRepository";
import { ProviderProfile } from "../../../domain/providers/ProviderProfile";
import { DuplicateProviderCodeException } from "../../../domain/providers/ProviderProfileErrors";

describe("PrismaProviderProfileRepository", () => {
  let repository: PrismaProviderProfileRepository;

  const tenantId = "22222222-2222-2222-2222-222222222222";
  const channelId = "channel-email-99";

  const defaultProps = {
    tenantId,
    providerCode: "TWILIO_SMS_PROD",
    providerName: "Twilio SMS Gateway",
    providerType: "TWILIO" as const,
    supportedChannels: [channelId],
    capabilityMetadata: { smsRateLimit: 50 },
  };

  beforeEach(() => {
    repository = new PrismaProviderProfileRepository();
  });

  it("saves and retrieves provider profile by id enforcing tenant isolation and soft delete filter", async () => {
    const provider = ProviderProfile.create(defaultProps);
    await repository.save(provider);

    const fetched = await repository.findById(provider.id, tenantId);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(provider.id);
    expect(fetched?.providerCode).toBe("TWILIO_SMS_PROD");

    const wrongTenant = await repository.findById(provider.id, "99999999-9999-9999-9999-999999999999");
    expect(wrongTenant).toBeNull();
  });

  it("findByCode retrieves provider by code case-insensitively", async () => {
    const provider = ProviderProfile.create(defaultProps);
    await repository.save(provider);

    const fetched = await repository.findByCode(tenantId, "twilio_sms_prod");
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(provider.id);
  });

  it("enforces unique tenant provider code constraint and throws DuplicateProviderCodeException", async () => {
    const p1 = ProviderProfile.create(defaultProps);
    const p2 = ProviderProfile.create(defaultProps);

    await repository.save(p1);
    await expect(repository.save(p2)).rejects.toThrow(DuplicateProviderCodeException);
  });

  it("handles OCC version update and throws OptimisticLockException on stale version", async () => {
    const provider = ProviderProfile.create(defaultProps);
    await repository.save(provider);

    provider.enable();
    await repository.save(provider);

    // Stale update with version 1
    const staleProvider = ProviderProfile.create({
      ...defaultProps,
      id: provider.id,
      version: 1,
      status: "CONFIGURED",
    });

    await expect(repository.save(staleProvider)).rejects.toThrow(OptimisticLockException);
  });

  it("clearOtherDefaults transaction resets isDefault on other providers for channel", async () => {
    const p1 = ProviderProfile.create({ ...defaultProps, providerCode: "CODE_A", isDefault: true });
    const p2 = ProviderProfile.create({ ...defaultProps, providerCode: "CODE_B", isDefault: true });

    await repository.save(p1);
    await repository.save(p2);

    await repository.clearOtherDefaults(tenantId, channelId, p2.id);

    const fetchedP1 = await repository.findById(p1.id, tenantId);
    const fetchedP2 = await repository.findById(p2.id, tenantId);

    expect(fetchedP1?.isDefault).toBe(false);
    expect(fetchedP2?.isDefault).toBe(true);
  });

  it("soft deletes provider and hides it from queries", async () => {
    const provider = ProviderProfile.create(defaultProps);
    await repository.save(provider);

    await repository.delete(provider.id, tenantId, "admin-user");

    const fetched = await repository.findById(provider.id, tenantId);
    expect(fetched).toBeNull();
  });
});
