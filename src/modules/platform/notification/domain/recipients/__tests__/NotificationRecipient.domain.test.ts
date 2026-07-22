/**
 * EWP-004 Domain Unit Tests — NotificationRecipient
 * Governed by CC-004, ES-008
 */

import { NotificationRecipient } from "../NotificationRecipient";
import {
  InvalidRecipientStateTransitionException,
  RecipientSuppressedException,
  RecipientTerminalStateException,
} from "../NotificationRecipientErrors";

describe("NotificationRecipient Aggregate Root", () => {
  const defaultProps = {
    notificationId: "11111111-1111-1111-1111-111111111111",
    tenantId: "22222222-2222-2222-2222-222222222222",
    recipientSequence: 1,
    recipientType: "INDIVIDUAL_USER" as const,
    recipientUserId: "33333333-3333-3333-3333-333333333333",
    recipientEndpoint: "user@example.com",
    channelId: "44444444-4444-4444-4444-444444444444",
    deliveryPreferenceSnapshot: { emailEnabled: true, digest: "NONE" },
    localization: {
      culture: "en-US",
      language: "en",
      timezone: "America/New_York",
    },
  };

  it("instantiates recipient in RESOLVED status and emits RecipientResolvedEvent", () => {
    const recipient = NotificationRecipient.create(defaultProps);

    expect(recipient.id).toBeDefined();
    expect(recipient.status).toBe("RESOLVED");
    expect(recipient.recipientSequence).toBe(1);
    expect(recipient.recipientEndpoint).toBe("user@example.com");
    expect(recipient.localization.culture).toBe("en-US");

    const events = recipient.popDomainEvents();
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe("RecipientResolved");
  });

  it("legal state transition RESOLVED -> ELIGIBLE emits RecipientEligibleEvent", () => {
    const recipient = NotificationRecipient.create(defaultProps);
    recipient.popDomainEvents();

    recipient.markEligible("user-1");

    expect(recipient.status).toBe("ELIGIBLE");
    const events = recipient.popDomainEvents();
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe("RecipientEligible");
  });

  it("legal state transition RESOLVED -> SUPPRESSED emits RecipientSuppressedEvent", () => {
    const recipient = NotificationRecipient.create(defaultProps);
    recipient.popDomainEvents();

    recipient.suppress("Opted out of marketing channel", "user-1");

    expect(recipient.status).toBe("SUPPRESSED");
    expect(recipient.suppressionReason).toBe("Opted out of marketing channel");

    const events = recipient.popDomainEvents();
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe("RecipientSuppressed");
  });

  it("legal state transition ELIGIBLE -> COMPLETED emits RecipientCompletedEvent", () => {
    const recipient = NotificationRecipient.create(defaultProps);
    recipient.markEligible();
    recipient.popDomainEvents();

    recipient.markCompleted();

    expect(recipient.status).toBe("COMPLETED");
    const events = recipient.popDomainEvents();
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe("RecipientCompleted");
  });

  it("legal state transition SUPPRESSED -> COMPLETED emits RecipientCompletedEvent", () => {
    const recipient = NotificationRecipient.create(defaultProps);
    recipient.suppress("User bounced", "system");
    recipient.popDomainEvents();

    recipient.markCompleted();

    expect(recipient.status).toBe("COMPLETED");
    const events = recipient.popDomainEvents();
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe("RecipientCompleted");
  });

  it("blocks markEligible on SUPPRESSED recipient and throws RecipientSuppressedException", () => {
    const recipient = NotificationRecipient.create(defaultProps);
    recipient.suppress("Opt-out blacklist", "system");

    expect(() => recipient.markEligible()).toThrow(RecipientSuppressedException);
  });

  it("blocks transition to terminal COMPLETED from RESOLVED status", () => {
    const recipient = NotificationRecipient.create(defaultProps);
    expect(() => recipient.markCompleted()).toThrow(InvalidRecipientStateTransitionException);
  });

  it("enforces terminal state COMPLETED immutability", () => {
    const recipient = NotificationRecipient.create(defaultProps);
    recipient.markEligible();
    recipient.markCompleted();

    expect(() => recipient.markEligible()).toThrow(RecipientTerminalStateException);
    expect(() => recipient.suppress("Reason")).toThrow(RecipientTerminalStateException);
    expect(() => recipient.markCompleted()).toThrow(RecipientTerminalStateException);
  });

  it("requires suppression reason when calling suppress", () => {
    const recipient = NotificationRecipient.create(defaultProps);
    expect(() => recipient.suppress("   ")).toThrow("Suppression reason is required when suppressing a recipient");
  });

  it("validates sequence number >= 1", () => {
    expect(() =>
      NotificationRecipient.create({
        ...defaultProps,
        recipientSequence: 0,
      })
    ).toThrow("RecipientSequence must be a positive integer >= 1");
  });

  it("enforces preference snapshot immutability on domain getter", () => {
    const recipient = NotificationRecipient.create(defaultProps);
    const pref1 = recipient.deliveryPreferenceSnapshot;
    if (pref1) pref1.emailEnabled = false;

    expect(recipient.deliveryPreferenceSnapshot?.emailEnabled).toBe(true);
  });
});
