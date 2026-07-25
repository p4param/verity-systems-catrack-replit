import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';

export async function POST(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_RELATIONSHIP_EDIT');
    const tenantId = user.tenantId;
    const userId = user.id;

    const params = await props.params;
    const { id } = params;
    const body = await req.json();
    const { targetStage, reason } = body;

    if (!targetStage) {
      return NextResponse.json({ success: false, error: 'targetStage is required' }, { status: 400 });
    }

    const relationship = await prisma.catRelationship.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!relationship) {
      return NextResponse.json({ success: false, error: 'Relationship not found' }, { status: 404 });
    }

    const prevStatus = relationship.status;

    // Update relationship stage / status
    const updated = await prisma.catRelationship.update({
      where: { id },
      data: {
        status: targetStage,
        updatedBy: userId,
        updatedAt: new Date(),
      },
    });

    // Create system audit note for stage transition
    await prisma.catRelationshipNote.create({
      data: {
        tenantId,
        relationshipId: id,
        content: `[Stage Transition] Changed lifecycle stage from ${prevStatus} to ${targetStage}.${reason ? ` Reason: ${reason}` : ''}`,
        createdBy: userId,
      },
    });

    return NextResponse.json({
      success: true,
      relationship: {
        id: updated.id,
        status: updated.status,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('POST /api/cat/relationships/[id]/stage error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

