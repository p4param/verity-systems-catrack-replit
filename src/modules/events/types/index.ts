export interface EventDto {
  id: string;
  tenantId: string;
  companyId: string;
  branchId: string;
  eventNumber: string;
  name: string;
  typeId: string;
  statusId: string;
  priorityId: string;
  customerId: string;
  contactId: string;
  salesExecId: string;
  managerId?: string | null;
  bookingDate: Date;
  startDate: Date;
  endDate: Date;
  guestCount: number;
  budgetAmount: number;
  currency: string;
  remarks?: string | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface EventListDto {
  events: EventDto[];
  total: number;
}

export interface EventSummaryDto {
  eventId: string;
  eventNumber: string;
  eventName: string;
  eventType: string;
  eventStatus: string;
  eventPriority: string;
  startDate: Date;
  endDate: Date;
  guestCount: number;
  budgetAmount: number;
  totalActualCost: number;
  totalAmountPaid: number;
}

export interface EventCalendarDto {
  id: string;
  eventId: string;
  title: string;
  startAt: Date;
  endAt: Date;
  calendarType: string;
}

export interface EventDashboardDto {
  todayEventsCount: number;
  upcomingEventsCount: number;
  pendingConfirmationsCount: number;
  eventsByStatus: Record<string, number>;
  eventsByCity: Record<string, number>;
  monthlyRevenue: Record<string, number>;
  healthScoreAverage: number;
}

export interface EventTaskDto {
  id: string;
  eventId: string;
  title: string;
  description?: string | null;
  priority: string;
  status: string;
  createdAt: Date;
}

export interface EventTimelineDto {
  id: string;
  eventId: string;
  summary: string;
  details?: string | null;
  loggedAt: Date;
}

export interface EventFinancialDto {
  estimatedFood: number;
  estimatedLabor: number;
  estimatedLogistics: number;
  actualFood: number;
  actualLabor: number;
  actualLogistics: number;
  invoiceTotal: number;
  amountPaid: number;
}

export interface EventHealthDto {
  score: number;
  calculatedAt: Date;
}
