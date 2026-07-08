"use server";

import { EventService, EventWorkflowService } from "../services/event-service";

const service = new EventService();
const workflowService = new EventWorkflowService();

export async function createEvent(data: any) {
  return service.createEvent(data);
}

export async function updateEvent(id: string, version: number, data: any) {
  return service.updateEvent(id, version, data);
}

export async function deleteEvent(id: string, deletedBy: string) {
  return service.deleteEvent(id, deletedBy);
}

export async function changeEventStatus(id: string, statusId: string, updatedBy: string) {
  return workflowService.changeStatus(id, statusId, updatedBy);
}

export async function duplicateEvent(id: string, createdBy: string) {
  const event = await service.getEventById(id);
  if (!event) throw new Error("Event not found");

  return service.createEvent({
    tenantId: event.tenantId,
    companyId: event.companyId,
    branchId: event.branchId,
    name: `${event.name} (Copy)`,
    eventNumber: `EV-${Math.floor(10000 + Math.random() * 90000)}`,
    typeId: event.typeId,
    statusId: event.statusId,
    priorityId: event.priorityId,
    customerId: event.customerId,
    contactId: event.contactId,
    salesExecId: event.salesExecId,
    bookingDate: new Date(),
    startDate: event.startDate,
    endDate: event.endDate,
    guestCount: event.guestCount,
    budgetAmount: event.budgetAmount,
    createdBy,
    updatedBy: createdBy,
  });
}

export async function assignEventManager(id: string, version: number, managerId: string, updatedBy: string) {
  return service.updateEvent(id, version, { managerId, updatedBy });
}

export async function calculateEventHealth(id: string) {
  return service.calculateEventHealth(id);
}

export async function calculateEventProfitability(id: string) {
  return service.calculateEventProfitability(id);
}

export async function generateEventNumber(branchId: string, year: number) {
  return `EV-${year}-${Math.floor(10000 + Math.random() * 90000)}`;
}
