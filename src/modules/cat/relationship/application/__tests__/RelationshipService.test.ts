import { RelationshipService } from '../RelationshipService';
import { IRelationshipRepository } from '../../domain/IRelationshipRepository';
import { Relationship } from '../../domain/Relationship';
import { RelationshipType, RelationshipStatus } from '../../domain/RelationshipModels';
import { DuplicateRelationshipWarning } from '../../domain/RelationshipErrors';

class MockRelationshipRepository implements IRelationshipRepository {
  private items: Map<string, Relationship> = new Map();
  private seq = 1000;

  async save(relationship: Relationship): Promise<Relationship> {
    this.items.set(relationship.id, relationship);
    return relationship;
  }

  async findById(tenantId: string, id: string): Promise<Relationship | null> {
    const item = this.items.get(id);
    if (item && item.tenantId === tenantId && !item.isDeleted) {
      return item;
    }
    return null;
  }

  async findByNumber(tenantId: string, relationshipNumber: string): Promise<Relationship | null> {
    for (const item of this.items.values()) {
      if (item.tenantId === tenantId && item.relationshipNumber === relationshipNumber && !item.isDeleted) {
        return item;
      }
    }
    return null;
  }

  async search(params: any): Promise<{ items: Relationship[]; total: number }> {
    const list = Array.from(this.items.values()).filter(r => r.tenantId === params.tenantId && !r.isDeleted);
    return { items: list, total: list.length };
  }

  async findDuplicates(tenantId: string, name: string, email?: string): Promise<Array<{ id: string; name: string; email?: string; phone?: string }>> {
    const dups: Array<{ id: string; name: string; email?: string; phone?: string }> = [];
    for (const item of this.items.values()) {
      if (item.tenantId === tenantId && item.name.toLowerCase() === name.toLowerCase() && !item.isDeleted) {
        dups.push({ id: item.id, name: item.name });
      }
    }
    return dups;
  }

  async delete(tenantId: string, id: string): Promise<void> {
    this.items.delete(id);
  }

  async getNextRelationshipNumber(tenantId: string): Promise<string> {
    this.seq++;
    return `REL-${this.seq}`;
  }
}

describe('BWP-001 Relationship Application Service Tests', () => {
  let repository: MockRelationshipRepository;
  let service: RelationshipService;
  const tenantId = '00000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    repository = new MockRelationshipRepository();
    service = new RelationshipService(repository);
  });

  it('should create relationship and generate number series', async () => {
    const result = await service.createRelationship({
      tenantId,
      name: 'Delta Events Ltd',
      type: RelationshipType.ORGANIZATION,
      primaryContact: { name: 'Delta Contact', email: 'delta@events.com' },
    });

    expect(result.relationship.id).toBeDefined();
    expect(result.relationship.relationshipNumber).toMatch(/^REL-/);
    expect(result.relationship.name).toBe('Delta Events Ltd');
    expect(result.relationship.status).toBe(RelationshipStatus.PROSPECT);
  });

  it('should throw advisory DuplicateRelationshipWarning on creation if matching duplicate exists', async () => {
    await service.createRelationship({
      tenantId,
      name: 'Duplicate Enterprise',
      type: RelationshipType.ORGANIZATION,
    });

    // Second attempt with same name without allowDuplicates flag
    await expect(
      service.createRelationship({
        tenantId,
        name: 'Duplicate Enterprise',
        type: RelationshipType.ORGANIZATION,
      })
    ).rejects.toThrow(DuplicateRelationshipWarning);

    // With allowDuplicates flag enabled (advisory user confirmation)
    const forced = await service.createRelationship(
      {
        tenantId,
        name: 'Duplicate Enterprise',
        type: RelationshipType.ORGANIZATION,
      },
      { allowDuplicates: true }
    );

    expect(forced.relationship).toBeDefined();
  });

  it('should execute Prospect to Customer conversion (BR-002, BR-003)', async () => {
    const created = await service.createRelationship({
      tenantId,
      name: 'Prospect Client',
      type: RelationshipType.INDIVIDUAL,
    });

    expect(created.relationship.status).toBe(RelationshipStatus.PROSPECT);

    const converted = await service.convertProspectToCustomer(tenantId, created.relationship.id, 'user-admin');

    expect(converted.status).toBe(RelationshipStatus.CUSTOMER);
  });

  it('should manage contacts, notes, and documents', async () => {
    const created = await service.createRelationship({
      tenantId,
      name: 'Omni Consumer Products',
      type: RelationshipType.ORGANIZATION,
    });

    const relId = created.relationship.id;

    const withContact = await service.addContact(tenantId, relId, {
      name: 'Alex Murphy',
      email: 'alex@ocp.com',
      isPrimary: true,
    });

    expect(withContact.contacts.length).toBe(1);
    expect(withContact.primaryContactId).toBe(withContact.contacts[0].id);

    const withNote = await service.addNote(tenantId, relId, 'Met at industry expo.', 'user-sales');
    expect(withNote.notes.length).toBe(1);

    const withDoc = await service.attachDocument(tenantId, relId, {
      fileName: 'brochure.pdf',
      fileUrl: 'https://cdn.catrack.com/brochure.pdf',
      fileSize: 102400,
      fileType: 'application/pdf',
    });

    expect(withDoc.documents.length).toBe(1);
  });
});
