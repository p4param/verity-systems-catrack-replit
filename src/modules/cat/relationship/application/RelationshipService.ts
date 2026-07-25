/**
 * BWP-001 Relationship Foundation — Application Service
 * Governed by APP-001 Section 7 and ES-008 / ES-014
 */
import { IRelationshipRepository } from '../domain/IRelationshipRepository';
import { Relationship } from '../domain/Relationship';
import {
  CreateRelationshipCommand,
  RelationshipSearchParams,
  RelationshipStatus,
  ContactProps,
} from '../domain/RelationshipModels';
import { DuplicateRelationshipWarning, RelationshipNotFoundException } from '../domain/RelationshipErrors';
import { IDomainEvent } from '../domain/RelationshipEvents';

export class RelationshipService {
  constructor(private readonly repository: IRelationshipRepository) {}

  public async createRelationship(
    cmd: CreateRelationshipCommand,
    options: { allowDuplicates?: boolean } = {}
  ): Promise<{ relationship: Relationship; warnings?: Array<{ id: string; name: string; email?: string; phone?: string }> }> {
    // 1. Advisory Duplicate Search Check (BR-007)
    const duplicates = await this.repository.findDuplicates(
      cmd.tenantId,
      cmd.name,
      cmd.primaryContact?.email,
      cmd.primaryContact?.phone
    );

    if (duplicates.length > 0 && !options.allowDuplicates) {
      throw new DuplicateRelationshipWarning(duplicates);
    }

    // 2. Generate Number Series if not provided
    const relationshipNumber =
      cmd.relationshipNumber || (await this.repository.getNextRelationshipNumber(cmd.tenantId));

    // 3. Create Aggregate
    const relationship = Relationship.create({
      tenantId: cmd.tenantId,
      relationshipNumber,
      name: cmd.name,
      type: cmd.type,
      primaryContact: cmd.primaryContact,
      createdBy: cmd.createdBy,
    });

    // 4. Save to Repository
    const saved = await this.repository.save(relationship);

    // 5. Dispatch Domain Events (FIFO)
    const events = relationship.popDomainEvents();
    this.dispatchDomainEvents(events);

    return {
      relationship: saved,
      warnings: duplicates.length > 0 ? duplicates : undefined,
    };
  }

  public async convertProspectToCustomer(
    tenantId: string,
    relationshipId: string,
    actorId?: string
  ): Promise<Relationship> {
    const relationship = await this.repository.findById(tenantId, relationshipId);
    if (!relationship) {
      throw new RelationshipNotFoundException(relationshipId);
    }

    relationship.convertProspectToCustomer(actorId);

    const saved = await this.repository.save(relationship);
    this.dispatchDomainEvents(relationship.popDomainEvents());

    return saved;
  }

  public async updateStatus(
    tenantId: string,
    relationshipId: string,
    status: RelationshipStatus,
    actorId?: string
  ): Promise<Relationship> {
    const relationship = await this.repository.findById(tenantId, relationshipId);
    if (!relationship) {
      throw new RelationshipNotFoundException(relationshipId);
    }

    relationship.updateStatus(status, actorId);

    const saved = await this.repository.save(relationship);
    this.dispatchDomainEvents(relationship.popDomainEvents());

    return saved;
  }

  public async addContact(
    tenantId: string,
    relationshipId: string,
    contactProps: Omit<ContactProps, 'relationshipId' | 'tenantId'>,
    actorId?: string
  ): Promise<Relationship> {
    const relationship = await this.repository.findById(tenantId, relationshipId);
    if (!relationship) {
      throw new RelationshipNotFoundException(relationshipId);
    }

    relationship.addContact({
      ...contactProps,
      tenantId,
      createdBy: actorId,
    });

    const saved = await this.repository.save(relationship);
    this.dispatchDomainEvents(relationship.popDomainEvents());

    return saved;
  }

  public async setPrimaryContact(
    tenantId: string,
    relationshipId: string,
    contactId: string,
    actorId?: string
  ): Promise<Relationship> {
    const relationship = await this.repository.findById(tenantId, relationshipId);
    if (!relationship) {
      throw new RelationshipNotFoundException(relationshipId);
    }

    relationship.setPrimaryContact(contactId, actorId);

    const saved = await this.repository.save(relationship);
    this.dispatchDomainEvents(relationship.popDomainEvents());

    return saved;
  }

  public async removeContact(
    tenantId: string,
    relationshipId: string,
    contactId: string,
    actorId?: string
  ): Promise<Relationship> {
    const relationship = await this.repository.findById(tenantId, relationshipId);
    if (!relationship) {
      throw new RelationshipNotFoundException(relationshipId);
    }

    relationship.removeContact(contactId, actorId);

    const saved = await this.repository.save(relationship);
    this.dispatchDomainEvents(relationship.popDomainEvents());

    return saved;
  }

  public async addNote(
    tenantId: string,
    relationshipId: string,
    content: string,
    actorId?: string
  ): Promise<Relationship> {
    const relationship = await this.repository.findById(tenantId, relationshipId);
    if (!relationship) {
      throw new RelationshipNotFoundException(relationshipId);
    }

    relationship.addNote(content, actorId);

    const saved = await this.repository.save(relationship);
    this.dispatchDomainEvents(relationship.popDomainEvents());

    return saved;
  }

  public async attachDocument(
    tenantId: string,
    relationshipId: string,
    doc: { fileName: string; fileUrl: string; fileSize: number; fileType: string },
    actorId?: string
  ): Promise<Relationship> {
    const relationship = await this.repository.findById(tenantId, relationshipId);
    if (!relationship) {
      throw new RelationshipNotFoundException(relationshipId);
    }

    relationship.attachDocument({ ...doc, createdBy: actorId });

    const saved = await this.repository.save(relationship);
    this.dispatchDomainEvents(relationship.popDomainEvents());

    return saved;
  }

  public async getRelationship(tenantId: string, relationshipId: string): Promise<Relationship | null> {
    return this.repository.findById(tenantId, relationshipId);
  }

  public async searchRelationships(
    params: RelationshipSearchParams
  ): Promise<{ items: Relationship[]; total: number }> {
    return this.repository.search(params);
  }

  public async checkDuplicates(
    tenantId: string,
    name: string,
    email?: string,
    phone?: string
  ): Promise<Array<{ id: string; name: string; email?: string; phone?: string }>> {
    return this.repository.findDuplicates(tenantId, name, email, phone);
  }

  private dispatchDomainEvents(events: IDomainEvent[]): void {
    events.forEach((evt) => {
      // In production, publish to Platform Event Bus
      console.log(`[DomainEvent dispatched]: ${evt.eventType} for tenant ${evt.tenantId}`);
    });
  }
}
