import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';
import { PrismaRelationshipRepository } from '@/modules/cat/relationship/infrastructure/persistence/PrismaRelationshipRepository';
import { RelationshipService } from '@/modules/cat/relationship/application/RelationshipService';

export async function POST(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_RELATIONSHIP_CONVERT');
    const tenantId = user.tenantId;
    const userId = user.id;

    const params = await props.params;
    const { id } = params;
    const repository = new PrismaRelationshipRepository(prisma);
    const service = new RelationshipService(repository);

    const updated = await service.convertProspectToCustomer(tenantId, id, userId);

    return NextResponse.json({
      success: true,
      relationship: {
        id: updated.id,
        relationshipNumber: updated.relationshipNumber,
        status: updated.status,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('POST /api/cat/relationships/[id]/convert error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

