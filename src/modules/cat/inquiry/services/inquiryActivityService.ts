import {
  ActivityStatus,
  GroupedActivities,
  InquiryActivity,
  TimelineCategory,
  TimelineItem,
} from '../domain/activity-types';

// In-memory data store for Inquiry Activities and Timeline events
const activityStore: Record<string, InquiryActivity[]> = {};
const timelineStore: Record<string, TimelineItem[]> = {};

export function getInitialActivities(inquiryId: string): InquiryActivity[] {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const inThreeDays = new Date(today);
  inThreeDays.setDate(today.getDate() + 3);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  return [
    {
      id: `${inquiryId}-act-1`,
      inquiryId,
      title: 'Initial Customer Requirement Qualification Call',
      type: 'CLIENT_CALL',
      status: 'COMPLETED',
      priority: 'HIGH',
      dueDate: formatDate(yesterday),
      assignedTo: 'Sales Team',
      discoveryAreaKey: 'EVENT_BASICS',
      outcome: 'Confirmed event date and initial guest count estimate of 250 guests.',
      completedAt: yesterday.toISOString(),
      completedBy: 'Sales Manager',
      createdAt: yesterday.toISOString(),
      updatedAt: yesterday.toISOString(),
    },
    {
      id: `${inquiryId}-act-2`,
      inquiryId,
      title: 'Venue Site Inspection & Kitchen Facilities Review',
      type: 'SITE_VISIT',
      status: 'OPEN',
      priority: 'URGENT',
      dueDate: formatDate(today),
      assignedTo: 'Event Planner',
      discoveryAreaKey: 'VENUE',
      createdAt: today.toISOString(),
      updatedAt: today.toISOString(),
    },
    {
      id: `${inquiryId}-act-3`,
      inquiryId,
      title: 'Follow-up on Dietary Restrictions & Custom Menu Options',
      type: 'FOLLOW_UP',
      status: 'OPEN',
      priority: 'MEDIUM',
      dueDate: formatDate(tomorrow),
      assignedTo: 'Head Chef',
      discoveryAreaKey: 'FOOD_BEVERAGE',
      createdAt: today.toISOString(),
      updatedAt: today.toISOString(),
    },
    {
      id: `${inquiryId}-act-4`,
      inquiryId,
      title: 'Budget Range & Commercial Terms Review',
      type: 'COMMERCIAL_REVIEW',
      status: 'OPEN',
      priority: 'HIGH',
      dueDate: formatDate(inThreeDays),
      assignedTo: 'Sales Manager',
      discoveryAreaKey: 'BUDGET_COMMERCIALS',
      createdAt: today.toISOString(),
      updatedAt: today.toISOString(),
    },
  ];
}

export function getInitialTimeline(inquiryId: string): TimelineItem[] {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 3600000);
  const yesterday = new Date(now.getTime() - 86400000);

  return [
    {
      id: `${inquiryId}-tl-1`,
      inquiryId,
      category: 'MILESTONE',
      title: 'Inquiry Created',
      description: 'Fresh catering inquiry logged into the Catrack ERP pipeline.',
      actor: 'Sales Operations',
      timestamp: yesterday.toISOString(),
    },
    {
      id: `${inquiryId}-tl-2`,
      inquiryId,
      category: 'DISCOVERY_EVENT',
      title: 'Discovery Phase Started',
      description: 'Discovery areas initialized for event requirements gathering.',
      actor: 'Sales Manager',
      timestamp: yesterday.toISOString(),
    },
    {
      id: `${inquiryId}-tl-3`,
      inquiryId,
      category: 'ACTIVITY_EVENT',
      title: 'Completed Call: Initial Customer Requirement Qualification',
      description: 'Outcome: Confirmed event date and initial guest count estimate of 250 guests.',
      actor: 'Sales Manager',
      timestamp: oneHourAgo.toISOString(),
    },
  ];
}

export function getOrCreateInquiryActivities(inquiryId: string): InquiryActivity[] {
  if (!activityStore[inquiryId]) {
    activityStore[inquiryId] = getInitialActivities(inquiryId);
  }
  return activityStore[inquiryId];
}

export function getOrCreateInquiryTimeline(inquiryId: string): TimelineItem[] {
  if (!timelineStore[inquiryId]) {
    timelineStore[inquiryId] = getInitialTimeline(inquiryId);
  }
  return timelineStore[inquiryId];
}

export function groupActivitiesByUrgency(activities: InquiryActivity[]): GroupedActivities {
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = tomorrowObj.toISOString().split('T')[0];

  const overdue: InquiryActivity[] = [];
  const today: InquiryActivity[] = [];
  const tomorrow: InquiryActivity[] = [];
  const upcoming: InquiryActivity[] = [];
  const completed: InquiryActivity[] = [];

  for (const act of activities) {
    if (act.status === 'COMPLETED' || act.status === 'CANCELLED') {
      completed.push(act);
      continue;
    }

    const dueStr = act.dueDate ? act.dueDate.split('T')[0] : todayStr;

    if (dueStr < todayStr) {
      overdue.push(act);
    } else if (dueStr === todayStr) {
      today.push(act);
    } else if (dueStr === tomorrowStr) {
      tomorrow.push(act);
    } else {
      upcoming.push(act);
    }
  }

  return { overdue, today, tomorrow, upcoming, completed };
}

export function addTimelineEntry(
  inquiryId: string,
  category: TimelineCategory,
  title: string,
  description: string,
  actor = 'System'
): TimelineItem {
  const timeline = getOrCreateInquiryTimeline(inquiryId);
  const newItem: TimelineItem = {
    id: `${inquiryId}-tl-${Date.now()}`,
    inquiryId,
    category,
    title,
    description,
    actor,
    timestamp: new Date().toISOString(),
  };
  timeline.unshift(newItem); // Newest first
  return newItem;
}
