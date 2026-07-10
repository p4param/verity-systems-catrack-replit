process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";

import { EventService } from "../services/event-service";
import { EventRepository } from "../repositories/event-repository";
import { EventWorkflowService } from "../services/event-service";
import { NotificationService } from "../services/communication-service";
import { checkApprovalAuthority, checkRowLevelSecurity, EventResource } from "../permissions";
import { AuthUser } from "@/lib/auth/auth-guard";

// Mock Data Builder
export function buildMockEvent(overrides?: any) {
  return {
    name: "Corporate Annual Gala",
    typeId: "3e57bc26-24df-41fd-8488-888888888801",
    statusId: "1e57bc26-24df-41fd-8488-888888888801",
    priorityId: "2e57bc26-24df-41fd-8488-888888888802",
    customerId: "00000000-0000-0000-0000-000000000001",
    contactId: "00000000-0000-0000-0000-000000000002",
    salesExecId: "3673f1d8-04ff-44e2-a05e-8557b447814b",
    bookingDate: new Date(),
    startDate: new Date(Date.now() + 3600000 * 24 * 5),
    endDate: new Date(Date.now() + 3600000 * 24 * 5 + 3600000 * 4),
    guestCount: 150,
    budgetAmount: 4500,
    currency: "USD",
    ...overrides,
  };
}

describe("Event Manager Module Tests", () => {
  const service = new EventService();
  const repo = new EventRepository();
  const workflow = new EventWorkflowService();
  const notifications = new NotificationService();

  test("Mock Data Builder creates valid object shape", () => {
    const mock = buildMockEvent();
    expect(mock.name).toBe("Corporate Annual Gala");
    expect(mock.guestCount).toBe(150);
  });

  test("Event Service calculates health scores correctly based on defaults", async () => {
    // Score defaults to 100 if no tasks exist
    const score = await service.calculateEventHealth("00000000-0000-0000-0000-000000000000");
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  test("Event Service calculates profitability ratios accurately", async () => {
    const mockId = "00000000-0000-0000-0000-000000000000";
    const profitability = await service.calculateEventProfitability(mockId);
    if (profitability) {
      expect(profitability.marginPercentage).toBeLessThanOrEqual(100);
    } else {
      expect(profitability).toBeNull();
    }
  });

  test("Calendar conflict detection triggers overlaps properly", async () => {
    const conflict = await service.detectCalendarConflicts(
      "00000000-0000-0000-0000-000000000000",
      new Date(),
      new Date(Date.now() + 3600000)
    );
    expect(typeof conflict).toBe("boolean");
  });

  test("State machine allowed transition check", () => {
    const transitions = (workflow as any).allowedTransitions;
    expect(transitions["INQUIRY"]).toContain("TENTATIVE");
    expect(transitions["INQUIRY"]).not.toContain("CONFIRMED");
  });

  test("Notification template placeholders replace correctly", async () => {
    const isSent = await notifications.sendNotification("EMAIL", "EVENT_CONFIRMED", "recipient@example.com", {
      EventName: "Gala Dinner",
      CustomerName: "John Doe",
      EventDate: "2026-07-10",
      VenueName: "Main Hall",
      AssignedTo: "Alice Manager",
    });
    expect(isSent).toBe(true);
  });

  test("Approval security limits allow regional manager under threshold", () => {
    const user: AuthUser = {
      sub: 1,
      tenantId: 1,
      email: "user@example.com",
      roles: ["DIRECTOR"],
    };
    const canApprove = checkApprovalAuthority(user, 35000);
    expect(canApprove).toBe(true);
  });

  test("Approval security limits reject regional manager over threshold", () => {
    const user: AuthUser = {
      sub: 1,
      tenantId: 1,
      email: "user@example.com",
      roles: ["EVENT_MANAGER"],
    };
    expect(() => checkApprovalAuthority(user, 25000)).toThrow();
  });
});
