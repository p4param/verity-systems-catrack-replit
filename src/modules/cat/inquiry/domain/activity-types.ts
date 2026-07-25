import { DiscoveryAreaKey } from './discovery-types';

export type ActivityType =
  | 'FOLLOW_UP'
  | 'CLIENT_CALL'
  | 'CLIENT_MEETING'
  | 'SITE_VISIT'
  | 'MENU_TASTING'
  | 'COMMERCIAL_REVIEW'
  | 'INTERNAL_NOTE';

export type ActivityStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type ActivityPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface InquiryActivity {
  id: string;
  inquiryId: string;
  title: string;
  type: ActivityType;
  status: ActivityStatus;
  priority: ActivityPriority;
  dueDate: string; // YYYY-MM-DD or ISO string
  assignedTo: string;
  discoveryAreaKey?: DiscoveryAreaKey;
  outcome?: string; // Business outcome upon completion
  completedAt?: string;
  completedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type TimelineCategory =
  | 'MILESTONE'
  | 'DISCOVERY_EVENT'
  | 'ACTIVITY_EVENT'
  | 'NOTE'
  | 'SYSTEM_AUDIT';

export interface TimelineItem {
  id: string;
  inquiryId: string;
  category: TimelineCategory;
  title: string;
  description: string;
  actor: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface GroupedActivities {
  overdue: InquiryActivity[];
  today: InquiryActivity[];
  tomorrow: InquiryActivity[];
  upcoming: InquiryActivity[];
  completed: InquiryActivity[];
}
