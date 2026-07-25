/**
 * BWP-001 Relationship Foundation — Readonly Domain Events
 */

export interface IDomainEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly occurredAt: Date;
  readonly tenantId: string;
}

export class RelationshipCreatedEvent implements IDomainEvent {
  public readonly eventId: string = crypto.randomUUID();
  public readonly eventType: string = 'cat.relationship.created';
  public readonly occurredAt: Date = new Date();

  constructor(
    public readonly tenantId: string,
    public readonly relationshipId: string,
    public readonly relationshipNumber: string,
    public readonly name: string,
    public readonly type: string,
    public readonly status: string,
    public readonly createdBy?: string
  ) {}
}

export class RelationshipStatusUpdatedEvent implements IDomainEvent {
  public readonly eventId: string = crypto.randomUUID();
  public readonly eventType: string = 'cat.relationship.status_updated';
  public readonly occurredAt: Date = new Date();

  constructor(
    public readonly tenantId: string,
    public readonly relationshipId: string,
    public readonly previousStatus: string,
    public readonly newStatus: string,
    public readonly updatedBy?: string
  ) {}
}

export class ProspectConvertedToCustomerEvent implements IDomainEvent {
  public readonly eventId: string = crypto.randomUUID();
  public readonly eventType: string = 'cat.relationship.prospect_converted';
  public readonly occurredAt: Date = new Date();

  constructor(
    public readonly tenantId: string,
    public readonly relationshipId: string,
    public readonly relationshipNumber: string,
    public readonly convertedBy?: string
  ) {}
}

export class ContactAddedEvent implements IDomainEvent {
  public readonly eventId: string = crypto.randomUUID();
  public readonly eventType: string = 'cat.relationship.contact_added';
  public readonly occurredAt: Date = new Date();

  constructor(
    public readonly tenantId: string,
    public readonly relationshipId: string,
    public readonly contactId: string,
    public readonly contactName: string,
    public readonly isPrimary: boolean
  ) {}
}

export class NoteAddedEvent implements IDomainEvent {
  public readonly eventId: string = crypto.randomUUID();
  public readonly eventType: string = 'cat.relationship.note_added';
  public readonly occurredAt: Date = new Date();

  constructor(
    public readonly tenantId: string,
    public readonly relationshipId: string,
    public readonly noteId: string,
    public readonly authorId?: string
  ) {}
}
