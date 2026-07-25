import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';
import { PrismaRelationshipRepository } from '@/modules/cat/relationship/infrastructure/persistence/PrismaRelationshipRepository';
import { RelationshipService } from '@/modules/cat/relationship/application/RelationshipService';

export async function GET(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_RELATIONSHIP_VIEW');
    const tenantId = user.tenantId;

    const params = await props.params;
    const { id } = params;
    const repository = new PrismaRelationshipRepository(prisma);
    const service = new RelationshipService(repository);

    const relationship = await service.getRelationship(tenantId, id);
    if (!relationship) {
      return NextResponse.json({ success: false, error: 'Relationship not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      relationship: {
        id: relationship.id,
        tenantId: relationship.tenantId,
        relationshipNumber: relationship.relationshipNumber,
        name: relationship.name,
        type: relationship.type,
        status: relationship.status,
        primaryContactId: relationship.primaryContactId,
        contacts: relationship.contacts.map((c) => c.toProps()),
        notes: relationship.notes,
        documents: relationship.documents,
        timeline: relationship.timeline,
        createdAt: relationship.createdAt,
        updatedAt: relationship.updatedAt,
      },
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('GET /api/cat/relationships/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_RELATIONSHIP_DELETE');
    const tenantId = user.tenantId;
    const userId = user.id;

    const params = await props.params;
    const { id } = params;
    const repository = new PrismaRelationshipRepository(prisma);

    await repository.delete(tenantId, id, userId);

    return NextResponse.json({ success: true, message: 'Relationship soft deleted.' });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('DELETE /api/cat/relationships/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

