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
    const { name, email, phone, role, isPrimary } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Contact name is required.' }, { status: 400 });
    }

    const repository = new PrismaRelationshipRepository(prisma);
    const service = new RelationshipService(repository);

    const updated = await service.addContact(
      tenantId,
      id,
      { name, email, phone, role, isPrimary: !!isPrimary },
      userId
    );

    return NextResponse.json({
      success: true,
      contacts: updated.contacts.map((c) => c.toProps()),
      primaryContactId: updated.primaryContactId,
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('POST /api/cat/relationships/[id]/contacts error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_RELATIONSHIP_EDIT');
    const tenantId = user.tenantId;
    const userId = user.id;

    const params = await props.params;
    const { id } = params;
    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get('contactId');

    if (!contactId) {
      return NextResponse.json({ success: false, error: 'contactId parameter is required.' }, { status: 400 });
    }

    const repository = new PrismaRelationshipRepository(prisma);
    const service = new RelationshipService(repository);

    const updated = await service.removeContact(tenantId, id, contactId, userId);

    return NextResponse.json({
      success: true,
      contacts: updated.contacts.map((c) => c.toProps()),
      primaryContactId: updated.primaryContactId,
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('DELETE /api/cat/relationships/[id]/contacts error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

