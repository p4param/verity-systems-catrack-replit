import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';
import { PrismaRelationshipRepository } from '@/modules/cat/relationship/infrastructure/persistence/PrismaRelationshipRepository';
import { RelationshipService } from '@/modules/cat/relationship/application/RelationshipService';
import { RelationshipType, RelationshipStatus } from '@/modules/cat/relationship/domain/RelationshipModels';
import { DuplicateRelationshipWarning } from '@/modules/cat/relationship/domain/RelationshipErrors';

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission(req, 'CAT_RELATIONSHIP_VIEW');
    const tenantId = user.tenantId;

    const { searchParams } = new URL(req.url);

    const query = searchParams.get('query') || undefined;
    const type = searchParams.get('type') as RelationshipType | undefined;
    const status = searchParams.get('status') as RelationshipStatus | undefined;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const repository = new PrismaRelationshipRepository(prisma);
    const service = new RelationshipService(repository);

    const result = await service.searchRelationships({
      tenantId,
      query,
      type,
      status,
      limit,
      offset,
    });

    const items = result.items.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      relationshipNumber: r.relationshipNumber,
      name: r.name,
      type: r.type,
      status: r.status,
      primaryContactId: r.primaryContactId,
      contacts: r.contacts.map((c) => c.toProps()),
      notesCount: r.notes.length,
      documentsCount: r.documents.length,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      items,
      total: result.total,
      limit,
      offset,
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('GET /api/cat/relationships error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission(req, 'CAT_RELATIONSHIP_CREATE');
    const tenantId = user.tenantId;
    const userId = user.id;

    const body = await req.json();

    const { name, type, primaryContact, allowDuplicates } = body;

    if (!name || !type) {
      return NextResponse.json(
        { success: false, error: 'Name and type (INDIVIDUAL | ORGANIZATION) are required.' },
        { status: 400 }
      );
    }

    const repository = new PrismaRelationshipRepository(prisma);
    const service = new RelationshipService(repository);

    try {
      const result = await service.createRelationship(
        {
          tenantId,
          name,
          type: type as RelationshipType,
          primaryContact,
          createdBy: userId,
        },
        { allowDuplicates: !!allowDuplicates }
      );

      return NextResponse.json({
        success: true,
        relationship: {
          id: result.relationship.id,
          relationshipNumber: result.relationship.relationshipNumber,
          name: result.relationship.name,
          type: result.relationship.type,
          status: result.relationship.status,
          primaryContactId: result.relationship.primaryContactId,
          contacts: result.relationship.contacts.map((c) => c.toProps()),
          createdAt: result.relationship.createdAt,
        },
        warnings: result.warnings,
      });
    } catch (err: any) {
      if (err instanceof DuplicateRelationshipWarning) {
        return NextResponse.json(
          {
            success: false,
            isWarning: true,
            error: err.message,
            matches: err.matches,
          },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('POST /api/cat/relationships error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

