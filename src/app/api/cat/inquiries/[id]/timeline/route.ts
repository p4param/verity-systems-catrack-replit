import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/permission-guard';
import {
  addTimelineEntry,
  getOrCreateInquiryTimeline,
} from '@/modules/cat/inquiry/services/inquiryActivityService';

export async function GET(req: NextRequest, props: any) {
  try {
    await requirePermission(req, 'CAT_INQUIRY_VIEW');
    const params = await props.params;
    const { id: inquiryId } = params;

    const timeline = getOrCreateInquiryTimeline(inquiryId);

    return NextResponse.json({
      success: true,
      timeline,
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error fetching inquiry timeline:', error);
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

    const { content, actor = 'Sales Team' } = body as {
      content: string;
      actor?: string;
    };

    if (!content || !content.trim()) {
      return NextResponse.json(
        { success: false, error: 'Note content is required' },
        { status: 400 }
      );
    }

    // Revision 2 rule: Notes generate a Timeline entry under category NOTE
    // Notes DO NOT create activities.
    const timelineEntry = addTimelineEntry(
      inquiryId,
      'NOTE',
      `Informational Note`,
      content.trim(),
      actor
    );

    const timeline = getOrCreateInquiryTimeline(inquiryId);

    return NextResponse.json({
      success: true,
      entry: timelineEntry,
      timeline,
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error posting inquiry note:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

