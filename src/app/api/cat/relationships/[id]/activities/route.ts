import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';

// In-memory / note-backed activity storage fallback for RM-007
export async function GET(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_RELATIONSHIP_VIEW');
    const tenantId = user.tenantId;

    const params = await props.params;
    const { id } = params;

    // Fetch notes tagged with [Activity]
    const notes = await prisma.catRelationshipNote.findMany({
      where: { relationshipId: id, tenantId },
      orderBy: { createdAt: 'desc' },
    });

    const activities = notes
      .filter((n) => n.content.includes('[Activity]'))
      .map((n) => {
        const raw = n.content.replace('[Activity] ', '');
        try {
          return { id: n.id, ...JSON.parse(raw), createdAt: n.createdAt };
        } catch {
          return { id: n.id, title: n.content, dueDate: n.createdAt.toISOString(), type: 'TASK', status: 'PENDING' };
        }
      });

    return NextResponse.json({ success: true, activities });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('GET /api/cat/relationships/[id]/activities error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_RELATIONSHIP_EDIT');
    const tenantId = user.tenantId;
    const userId = user.id;

    const params = await props.params;
    const { id } = params;
    const body = await req.json();
    const { title, type, dueDate, priority, notes } = body;

    if (!title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }

    const activityData = {
      title,
      type: type || 'TASK',
      dueDate: dueDate || new Date().toISOString(),
      priority: priority || 'MEDIUM',
      notes: notes || '',
      completed: false,
    };

    const createdNote = await prisma.catRelationshipNote.create({
      data: {
        tenantId,
        relationshipId: id,
        content: `[Activity] ${JSON.stringify(activityData)}`,
        createdBy: userId,
      },
    });

    return NextResponse.json({
      success: true,
      activity: { id: createdNote.id, ...activityData, createdAt: createdNote.createdAt },
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('POST /api/cat/relationships/[id]/activities error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

