/**
 * EWP-005 Domain Unit Tests — ProviderProfile
 * Governed by CC-005, ES-008
 */

import { ProviderProfile } from "../ProviderProfile";
import { ProviderRetiredException } from "../ProviderProfileErrors";

describe("ProviderProfile Aggregate Root", () => {
  const defaultProps = {
    tenantId: "11111111-1111-1111-1111-111111111111",
    providerCode: "SENDGRID_PRIMARY",
    providerName: "SendGrid Primary Delivery Adapter",
    description: "Primary transactional email provider",
    providerType: "SENDGRID" as const,
    supportedChannels: ["channel-email-001"],
    capabilityMetadata: { batching: true, rateLimit: 100 },
  };

  it("instantiates provider profile in CONFIGURED status and emits ProviderRegisteredEvent", () => {
    const provider = ProviderProfile.create(defaultProps);

    expect(provider.id).toBeDefined();
    expect(provider.status).toBe("CONFIGURED");
    expect(provider.providerCode).toBe("SENDGRID_PRIMARY");
    expect(provider.healthStatus).toBe("HEALTHY");
    expect(provider.supportedChannels).toEqual(["channel-email-001"]);

    const events = provider.popDomainEvents();
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe("ProviderRegistered");
  });

  it("legal state transition enable() emits ProviderEnabledEvent", () => {
    const provider = ProviderProfile.create(defaultProps);
    provider.popDomainEvents();

    provider.enable("user-admin");

    expect(provider.status).toBe("ACTIVE");
    expect(provider.isEnabled).toBe(true);

    const events = provider.popDomainEvents();
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe("ProviderEnabled");
  });

  it("legal state transition disable() emits ProviderDisabledEvent", () => {
    const provider = ProviderProfile.create(defaultProps);
    provider.enable();
    provider.popDomainEvents();

    provider.disable("user-admin");

    expect(provider.status).toBe("DISABLED");
    expect(provider.isEnabled).toBe(false);

    const events = provider.popDomainEvents();
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe("ProviderDisabled");
  });

  it("legal state transition retire() emits ProviderRetiredEvent and sets status RETIRED", () => {
    const provider = ProviderProfile.create(defaultProps);
    provider.enable();
    provider.popDomainEvents();

    provider.retire("user-admin");

    expect(provider.status).toBe("RETIRED");
    expect(provider.isEnabled).toBe(false);

    const events = provider.popDomainEvents();
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe("ProviderRetired");
  });

  it("enforces terminal RETIRED state immutability", () => {
    const provider = ProviderProfile.create(defaultProps);
    provider.retire();

    expect(() => provider.enable()).toThrow(ProviderRetiredException);
    expect(() => provider.disable()).toThrow(ProviderRetiredException);
    expect(() => provider.updateHealthStatus("DEGRADED")).toThrow(ProviderRetiredException);
    expect(() => provider.setDefault(true, "channel-email-001")).toThrow(ProviderRetiredException);
    expect(() => provider.setPriority(10)).toThrow(ProviderRetiredException);
    expect(() => provider.updateMetadata("New Name")).toThrow(ProviderRetiredException);
  });

  it("updateHealthStatus emits ProviderHealthUpdatedEvent on change", () => {
    const provider = ProviderProfile.create(defaultProps);
    provider.popDomainEvents();

    provider.updateHealthStatus("DEGRADED", "health-check-service");

    expect(provider.healthStatus).toBe("DEGRADED");

    const events = provider.popDomainEvents();
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe("ProviderHealthUpdated");
  });

  it("setDefault throws error if channel is not supported", () => {
    const provider = ProviderProfile.create(defaultProps);
    expect(() => provider.setDefault(true, "unsupported-channel")).toThrow(
      "Provider SENDGRID_PRIMARY does not support channel unsupported-channel"
    );
  });

  it("setDefault emits DefaultProviderChangedEvent on valid channel", () => {
    const provider = ProviderProfile.create(defaultProps);
    provider.popDomainEvents();

    provider.setDefault(true, "channel-email-001", "admin");

    expect(provider.isDefault).toBe(true);

    const events = provider.popDomainEvents();
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe("DefaultProviderChanged");
  });

  it("deduplicates supportedChannels array", () => {
    const provider = ProviderProfile.create({
      ...defaultProps,
      supportedChannels: ["ch-1", "ch-2", "ch-1"],
    });

    expect(provider.supportedChannels).toEqual(["ch-1", "ch-2"]);
  });

  it("requires non-empty tenantId, providerCode, providerName, and supportedChannels", () => {
    expect(() => ProviderProfile.create({ ...defaultProps, tenantId: "" })).toThrow("TenantId is required");
    expect(() => ProviderProfile.create({ ...defaultProps, providerCode: "" })).toThrow("ProviderCode is required");
    expect(() => ProviderProfile.create({ ...defaultProps, providerName: "" })).toThrow("ProviderName is required");
    expect(() => ProviderProfile.create({ ...defaultProps, supportedChannels: [] })).toThrow(
      "SupportedChannels array must contain at least one NotificationChannel reference"
    );
  });
});
