import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/permission-guard';
import {
  addTimelineEntry,
  getOrCreateInquiryActivities,
  groupActivitiesByUrgency,
} from '@/modules/cat/inquiry/services/inquiryActivityService';
import {
  ActivityPriority,
  ActivityStatus,
  ActivityType,
  InquiryActivity,
} from '@/modules/cat/inquiry/domain/activity-types';
import { DiscoveryAreaKey } from '@/modules/cat/inquiry/domain/discovery-types';

export async function GET(req: NextRequest, props: any) {
  try {
    await requirePermission(req, 'CAT_INQUIRY_VIEW');
    const params = await props.params;
    const { id: inquiryId } = params;

    const activities = getOrCreateInquiryActivities(inquiryId);
    const grouped = groupActivitiesByUrgency(activities);

    return NextResponse.json({
      success: true,
      activities,
      grouped,
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error fetching inquiry activities:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, props: any) {
  try {
    await requirePermission(req, 'CAT_INQUIRY_EDIT');
    const params = await props.params;
    const { id: inquiryId } = params;
    const body = await req.json();

    const {
      title,
      type = 'FOLLOW_UP',
      dueDate,
      priority = 'MEDIUM',
      assignedTo = 'Sales Operations',
      discoveryAreaKey,
    } = body as {
      title: string;
      type?: ActivityType;
      dueDate?: string;
      priority?: ActivityPriority;
      assignedTo?: string;
      discoveryAreaKey?: DiscoveryAreaKey;
    };

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: 'Activity title is required' },
        { status: 400 }
      );
    }

    const activities = getOrCreateInquiryActivities(inquiryId);

    const newActivity: InquiryActivity = {
      id: `${inquiryId}-act-${Date.now()}`,
      inquiryId,
      title: title.trim(),
      type,
      status: 'OPEN' as ActivityStatus,
      priority,
      dueDate: dueDate || new Date().toISOString().split('T')[0],
      assignedTo,
      discoveryAreaKey,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    activities.unshift(newActivity);

    // Auto-generate system timeline entry
    addTimelineEntry(
      inquiryId,
      'ACTIVITY_EVENT',
      `New Activity Scheduled: ${newActivity.title}`,
      `Activity of type ${newActivity.type} assigned to ${newActivity.assignedTo} (Due: ${newActivity.dueDate}).`,
      assignedTo
    );

    const grouped = groupActivitiesByUrgency(activities);

    return NextResponse.json({
      success: true,
      activity: newActivity,
      activities,
      grouped,
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error creating activity:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, props: any) {
  try {
    await requirePermission(req, 'CAT_INQUIRY_EDIT');
    const params = await props.params;
    const { id: inquiryId } = params;
    const body = await req.json();

    const { activityId, status, outcome, completedBy = 'Sales Manager' } = body as {
      activityId: string;
      status?: ActivityStatus;
      outcome?: string;
      completedBy?: string;
    };

    if (!activityId) {
      return NextResponse.json(
        { success: false, error: 'activityId is required' },
        { status: 400 }
      );
    }

    const activities = getOrCreateInquiryActivities(inquiryId);
    const targetActivity = activities.find((a) => a.id === activityId);

    if (!targetActivity) {
      return NextResponse.json(
        { success: false, error: 'Activity not found' },
        { status: 404 }
      );
    }

    if (status) {
      targetActivity.status = status;
      if (status === 'COMPLETED') {
        targetActivity.outcome = outcome || targetActivity.outcome || 'Task completed successfully.';
        targetActivity.completedAt = new Date().toISOString();
        targetActivity.completedBy = completedBy;

        // Auto-publish Timeline event for Activity Completion
        addTimelineEntry(
          inquiryId,
          'ACTIVITY_EVENT',
          `Completed Activity: ${targetActivity.title}`,
          `Outcome: ${targetActivity.outcome}`,
          completedBy
        );
      }
    }

    targetActivity.updatedAt = new Date().toISOString();

    const grouped = groupActivitiesByUrgency(activities);

    return NextResponse.json({
      success: true,
      activity: targetActivity,
      activities,
      grouped,
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error updating activity:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

