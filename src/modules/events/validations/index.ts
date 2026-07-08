import { z } from "zod";

export const CreateEventSchema = z.object({
  name: z.string().min(3).max(255),
  typeId: z.string().uuid(),
  statusId: z.string().uuid(),
  priorityId: z.string().uuid(),
  customerId: z.string().uuid(),
  contactId: z.string().uuid(),
  salesExecId: z.string().uuid(),
  managerId: z.string().uuid().optional().nullable(),
  branchId: z.string().uuid().optional().nullable(),
  bookingDate: z.coerce.date(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  guestCount: z.number().int().positive(),
  budgetAmount: z.number().positive(),
  currency: z.string().length(3).default("USD"),
  remarks: z.string().optional().nullable(),
});

export const UpdateEventSchema = CreateEventSchema.partial().extend({
  version: z.number().int(),
});

export const EventFunctionSchema = z.object({
  name: z.string().min(2).max(150),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  guestCount: z.number().int().positive(),
});

export const EventTaskSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  status: z.enum(["DRAFT", "ASSIGNED", "COMPLETED"]),
});

export const EventPaymentSchema = z.object({
  amount: z.number().positive(),
  method: z.string(),
  transactionId: z.string().optional().nullable(),
});

export const EventSearchSchema = z.object({
  query: z.string().optional(),
  branchId: z.string().uuid().optional(),
  statusId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const EventStatusSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
});
