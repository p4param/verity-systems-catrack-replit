import { Relationship } from '../Relationship';
import { RelationshipType, RelationshipStatus } from '../RelationshipModels';
import { InvalidRelationshipStatusTransitionError } from '../RelationshipErrors';

describe('BWP-001 Relationship Domain Aggregate Unit Tests', () => {
  const tenantId = '00000000-0000-0000-0000-000000000001';

  it('should create a relationship aggregate with auto-generated relationshipNumber and default PROSPECT status', () => {
    const rel = Relationship.create({
      tenantId,
      relationshipNumber: 'REL-10001',
      name: 'Acme Catering Corp',
      type: RelationshipType.ORGANIZATION,
      primaryContact: {
        name: 'John Doe',
        email: 'john@acme.com',
        phone: '+15550199',
        role: 'Event Director',
      },
    });

    expect(rel.id).toBeDefined();
    expect(rel.relationshipNumber).toBe('REL-10001');
    expect(rel.name).toBe('Acme Catering Corp');
    expect(rel.type).toBe(RelationshipType.ORGANIZATION);
    expect(rel.status).toBe(RelationshipStatus.PROSPECT);
    expect(rel.contacts.length).toBe(1);
    expect(rel.contacts[0].isPrimary).toBe(true);
    expect(rel.primaryContactId).toBe(rel.contacts[0].id);

    const events = rel.popDomainEvents();
    expect(events.length).toBe(2); // RelationshipCreatedEvent, ContactAddedEvent
    expect(events[0].eventType).toBe('cat.relationship.created');
  });

  it('should convert prospect to customer (BR-002, BR-003)', () => {
    const rel = Relationship.create({
      tenantId,
      relationshipNumber: 'REL-10002',
      name: 'Jane Smith',
      type: RelationshipType.INDIVIDUAL,
    });

    expect(rel.status).toBe(RelationshipStatus.PROSPECT);

    rel.convertProspectToCustomer('user-admin');

    expect(rel.status).toBe(RelationshipStatus.CUSTOMER);

    const events = rel.popDomainEvents();
    const prospectConverted = events.find((e) => e.eventType === 'cat.relationship.prospect_converted');
    expect(prospectConverted).toBeDefined();
  });

  it('should prevent status transition to customer if blacklisted', () => {
    const rel = Relationship.create({
      tenantId,
      relationshipNumber: 'REL-10003',
      name: 'Blacklisted Corp',
      type: RelationshipType.ORGANIZATION,
    });

    rel.updateStatus(RelationshipStatus.BLACKLISTED);

    expect(() => {
      rel.convertProspectToCustomer('user-admin');
    }).toThrow(InvalidRelationshipStatusTransitionError);
  });

  it('should manage contacts and update primary contact designation (BR-005)', () => {
    const rel = Relationship.create({
      tenantId,
      relationshipNumber: 'REL-10004',
      name: 'Stark Industries',
      type: RelationshipType.ORGANIZATION,
      primaryContact: { name: 'Pepper Potts' },
    });

    expect(rel.contacts.length).toBe(1);
    expect(rel.primaryContactId).toBe(rel.contacts[0].id);

    const newContact = rel.addContact({
      tenantId,
      name: 'Tony Stark',
      email: 'tony@stark.com',
      isPrimary: true,
    });

    expect(rel.contacts.length).toBe(2);
    expect(rel.primaryContactId).toBe(newContact.id);
    expect(rel.contacts.find((c) => c.id !== newContact.id)?.isPrimary).toBe(false);
  });

  it('should add notes and attach documents (VAP platform candidates)', () => {
    const rel = Relationship.create({
      tenantId,
      relationshipNumber: 'REL-10005',
      name: 'Wayne Enterprises',
      type: RelationshipType.ORGANIZATION,
    });

    const note = rel.addNote('Initial discovery call completed.', 'bruce-wayne');
    expect(rel.notes.length).toBe(1);
    expect(note.content).toBe('Initial discovery call completed.');

    const doc = rel.attachDocument({
      fileName: 'contract_draft.pdf',
      fileUrl: 'https://storage.catrack.com/docs/contract_draft.pdf',
      fileSize: 2048576,
      fileType: 'application/pdf',
      createdBy: 'bruce-wayne',
    });

    expect(rel.documents.length).toBe(1);
    expect(doc.fileName).toBe('contract_draft.pdf');
  });
});
