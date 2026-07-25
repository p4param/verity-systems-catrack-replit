import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';
import { PrismaRelationshipRepository } from '@/modules/cat/relationship/infrastructure/persistence/PrismaRelationshipRepository';
import { RelationshipService } from '@/modules/cat/relationship/application/RelationshipService';

export async function POST(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_RELATIONSHIP_EDIT');
    const tenantId = user.tenantId;
    const userId = user.id;

    const params = await props.params;
    const { id } = params;
    const body = await req.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json({ success: false, error: 'Note content is required.' }, { status: 400 });
    }

    const repository = new PrismaRelationshipRepository(prisma);
    const service = new RelationshipService(repository);

    const updated = await service.addNote(tenantId, id, content, userId);

    return NextResponse.json({
      success: true,
      notes: updated.notes,
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('POST /api/cat/relationships/[id]/notes error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

