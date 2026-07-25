/**
 * BWP-001 Relationship Foundation — Prisma Persistence Implementation
 * Governed by ES-001, ES-009, ES-010, ES-014
 */
import { PrismaClient, RelationshipType as PrismaRelType, RelationshipStatus as PrismaRelStatus } from '@/generated/client';
import { IRelationshipRepository } from '../../domain/IRelationshipRepository';
import { Relationship } from '../../domain/Relationship';
import {
  RelationshipType,
  RelationshipStatus,
  RelationshipSearchParams,
  ContactProps,
  RelationshipNoteProps,
  RelationshipDocumentProps,
} from '../../domain/RelationshipModels';

export class PrismaRelationshipRepository implements IRelationshipRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async save(relationship: Relationship): Promise<Relationship> {
    const isNew = !(await this.prisma.catRelationship.findFirst({
      where: { id: relationship.id, tenantId: relationship.tenantId },
    }));

    if (isNew) {
      await this.prisma.catRelationship.create({
        data: {
          id: relationship.id,
          tenantId: relationship.tenantId,
          relationshipNumber: relationship.relationshipNumber,
          name: relationship.name,
          type: relationship.type as PrismaRelType,
          status: relationship.status as PrismaRelStatus,
          primaryContactId: relationship.primaryContactId,
          createdBy: relationship.createdBy,
          createdAt: relationship.createdAt,
          updatedAt: relationship.updatedAt,
          updatedBy: relationship.updatedBy,
          version: BigInt(1),
          contacts: {
            create: relationship.contacts.map((c) => ({
              id: c.id,
              tenantId: c.tenantId,
              name: c.name,
              email: c.email,
              phone: c.phone,
              role: c.role,
              isPrimary: c.isPrimary,
              createdBy: c.createdBy,
            })),
          },
          notes: {
            create: relationship.notes.map((n) => ({
              id: n.id,
              tenantId: n.tenantId,
              content: n.content,
              createdBy: n.createdBy,
            })),
          },
          documents: {
            create: relationship.documents.map((d) => ({
              id: d.id,
              tenantId: d.tenantId,
              fileName: d.fileName,
              fileUrl: d.fileUrl,
              fileSize: d.fileSize,
              fileType: d.fileType,
              createdBy: d.createdBy,
            })),
          },
        },
      });
    } else {
      // OCC Lock Check & Update
      const existing = await this.prisma.catRelationship.findFirst({
        where: {
          id: relationship.id,
          tenantId: relationship.tenantId,
          isDeleted: false,
        },
      });

      if (!existing) {
        throw new Error(`Relationship '${relationship.id}' not found or deleted.`);
      }

      if (existing.version !== relationship.version) {
        throw new Error(`OptimisticLockException: Relationship version mismatch (expected ${relationship.version}, found ${existing.version}).`);
      }

      const nextVersion = existing.version + BigInt(1);

      await this.prisma.$transaction(async (tx) => {
        await tx.catRelationship.update({
          where: { id: relationship.id },
          data: {
            name: relationship.name,
            type: relationship.type as PrismaRelType,
            status: relationship.status as PrismaRelStatus,
            primaryContactId: relationship.primaryContactId,
            updatedAt: new Date(),
            updatedBy: relationship.updatedBy,
            version: nextVersion,
          },
        });

        // Upsert Contacts
        for (const c of relationship.contacts) {
          await tx.catContact.upsert({
            where: { id: c.id },
            create: {
              id: c.id,
              tenantId: c.tenantId,
              relationshipId: relationship.id,
              name: c.name,
              email: c.email,
              phone: c.phone,
              role: c.role,
              isPrimary: c.isPrimary,
              createdBy: c.createdBy,
            },
            update: {
              name: c.name,
              email: c.email,
              phone: c.phone,
              role: c.role,
              isPrimary: c.isPrimary,
              updatedAt: new Date(),
            },
          });
        }

        // Add Notes if new
        for (const n of relationship.notes) {
          const noteExists = await tx.catRelationshipNote.findUnique({ where: { id: n.id } });
          if (!noteExists) {
            await tx.catRelationshipNote.create({
              data: {
                id: n.id,
                tenantId: n.tenantId,
                relationshipId: relationship.id,
                content: n.content,
                createdBy: n.createdBy,
              },
            });
          }
        }

        // Add Documents if new
        for (const d of relationship.documents) {
          const docExists = await tx.catRelationshipDocument.findUnique({ where: { id: d.id } });
          if (!docExists) {
            await tx.catRelationshipDocument.create({
              data: {
                id: d.id,
                tenantId: d.tenantId,
                relationshipId: relationship.id,
                fileName: d.fileName,
                fileUrl: d.fileUrl,
                fileSize: d.fileSize,
                fileType: d.fileType,
                createdBy: d.createdBy,
              },
            });
          }
        }
      });
    }

    return (await this.findById(relationship.tenantId, relationship.id))!;
  }

  public async findById(tenantId: string, id: string): Promise<Relationship | null> {
    const record = await this.prisma.catRelationship.findFirst({
      where: {
        id,
        tenantId,
        isDeleted: false,
      },
      include: {
        contacts: { where: { isDeleted: false } },
        notes: { where: { isDeleted: false } },
        documents: { where: { isDeleted: false } },
      },
    });

    if (!record) return null;

    return this.mapToDomain(record);
  }

  public async findByNumber(tenantId: string, relationshipNumber: string): Promise<Relationship | null> {
    const record = await this.prisma.catRelationship.findFirst({
      where: {
        tenantId,
        relationshipNumber,
        isDeleted: false,
      },
      include: {
        contacts: { where: { isDeleted: false } },
        notes: { where: { isDeleted: false } },
        documents: { where: { isDeleted: false } },
      },
    });

    if (!record) return null;

    return this.mapToDomain(record);
  }

  public async search(params: RelationshipSearchParams): Promise<{ items: Relationship[]; total: number }> {
    const { tenantId, query, type, status, limit = 20, offset = 0 } = params;

    const whereClause: any = {
      tenantId,
      isDeleted: false,
    };

    if (type) whereClause.type = type as PrismaRelType;
    if (status) whereClause.status = status as PrismaRelStatus;

    if (query && query.trim().length > 0) {
      const q = query.trim();
      whereClause.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { relationshipNumber: { contains: q, mode: 'insensitive' } },
        {
          contacts: {
            some: {
              isDeleted: false,
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
    }

    const [total, records] = await Promise.all([
      this.prisma.catRelationship.count({ where: whereClause }),
      this.prisma.catRelationship.findMany({
        where: whereClause,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          contacts: { where: { isDeleted: false } },
          notes: { where: { isDeleted: false } },
          documents: { where: { isDeleted: false } },
        },
      }),
    ]);

    return {
      items: records.map((r) => this.mapToDomain(r)),
      total,
    };
  }

  public async findDuplicates(
    tenantId: string,
    name: string,
    email?: string,
    phone?: string
  ): Promise<Array<{ id: string; name: string; email?: string; phone?: string }>> {
    const nameQuery = name.trim();
    const orConditions: any[] = [{ name: { equals: nameQuery, mode: 'insensitive' } }];

    if (email && email.trim()) {
      orConditions.push({
        contacts: {
          some: {
            isDeleted: false,
            email: { equals: email.trim(), mode: 'insensitive' },
          },
        },
      });
    }

    if (phone && phone.trim()) {
      orConditions.push({
        contacts: {
          some: {
            isDeleted: false,
            phone: { equals: phone.trim() },
          },
        },
      });
    }

    const records = await this.prisma.catRelationship.findMany({
      where: {
        tenantId,
        isDeleted: false,
        OR: orConditions,
      },
      include: {
        contacts: { where: { isDeleted: false } },
      },
      take: 5,
    });

    return records.map((r) => {
      const primary = r.contacts.find((c) => c.isPrimary) || r.contacts[0];
      return {
        id: r.id,
        name: r.name,
        email: primary?.email || undefined,
        phone: primary?.phone || undefined,
      };
    });
  }

  public async delete(tenantId: string, id: string, deletedBy?: string): Promise<void> {
    await this.prisma.catRelationship.updateMany({
      where: { id, tenantId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: deletedBy || null,
      },
    });
  }

  public async getNextRelationshipNumber(tenantId: string): Promise<string> {
    const count = await this.prisma.catRelationship.count({
      where: { tenantId },
    });
    const nextSeq = count + 1;
    return `REL-${nextSeq.toString().padStart(5, '0')}`;
  }

  private mapToDomain(record: any): Relationship {
    const contactsProps: ContactProps[] = (record.contacts || []).map((c: any) => ({
      id: c.id,
      tenantId: c.tenantId,
      relationshipId: c.relationshipId,
      name: c.name,
      email: c.email,
      phone: c.phone,
      role: c.role,
      isPrimary: c.isPrimary,
      createdAt: c.createdAt,
      createdBy: c.createdBy,
    }));

    const notesProps: RelationshipNoteProps[] = (record.notes || []).map((n: any) => ({
      id: n.id,
      tenantId: n.tenantId,
      relationshipId: n.relationshipId,
      content: n.content,
      createdAt: n.createdAt,
      createdBy: n.createdBy,
    }));

    const docProps: RelationshipDocumentProps[] = (record.documents || []).map((d: any) => ({
      id: d.id,
      tenantId: d.tenantId,
      relationshipId: d.relationshipId,
      fileName: d.fileName,
      fileUrl: d.fileUrl,
      fileSize: d.fileSize,
      fileType: d.fileType,
      createdAt: d.createdAt,
      createdBy: d.createdBy,
    }));

    return Relationship.reconstitute({
      id: record.id,
      tenantId: record.tenantId,
      relationshipNumber: record.relationshipNumber,
      name: record.name,
      type: record.type as RelationshipType,
      status: record.status as RelationshipStatus,
      primaryContactId: record.primaryContactId,
      contacts: contactsProps,
      notes: notesProps,
      documents: docProps,
      createdAt: record.createdAt,
      createdBy: record.createdBy,
      updatedAt: record.updatedAt,
      updatedBy: record.updatedBy,
      isDeleted: record.isDeleted,
      deletedAt: record.deletedAt,
      deletedBy: record.deletedBy,
      version: record.version,
    });
  }
}
