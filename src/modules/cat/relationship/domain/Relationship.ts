/**
 * BWP-001 Relationship Foundation — Aggregate Root
 * Governed by BWP-001, APP-001, and ES-008 / ES-014 / ES-015 / ES-016
 */
import {
  RelationshipProps,
  RelationshipType,
  RelationshipStatus,
  ContactProps,
  RelationshipNoteProps,
  RelationshipDocumentProps,
  RelationshipTimelineEntry,
} from './RelationshipModels';
import { Contact } from './Contact';
import {
  InvalidRelationshipStatusTransitionError,
  ContactNotFoundException,
} from './RelationshipErrors';
import {
  IDomainEvent,
  RelationshipCreatedEvent,
  RelationshipStatusUpdatedEvent,
  ProspectConvertedToCustomerEvent,
  ContactAddedEvent,
  NoteAddedEvent,
} from './RelationshipEvents';

export class Relationship {
  private readonly _id: string;
  private readonly _tenantId: string;
  private readonly _relationshipNumber: string;
  private _name: string;
  private _type: RelationshipType;
  private _status: RelationshipStatus;
  private _primaryContactId: string | null;
  private _contacts: Map<string, Contact> = new Map();

  /**
   * Local implementations for Notes, Documents, and Timeline.
   * VAP Platform Enhancement Candidates (APP-001 Section 5).
   */
  private _notes: RelationshipNoteProps[] = [];
  private _documents: RelationshipDocumentProps[] = [];
  private _timeline: RelationshipTimelineEntry[] = [];

  private readonly _createdAt: Date;
  private readonly _createdBy: string | null;
  private _updatedAt: Date;
  private _updatedBy: string | null;
  private _isDeleted: boolean;
  private _version: bigint;

  private _domainEvents: IDomainEvent[] = [];

  private constructor(props: RelationshipProps) {
    this._id = props.id || crypto.randomUUID();
    this._tenantId = props.tenantId;
    this._relationshipNumber = props.relationshipNumber;
    this._name = props.name;
    this._type = props.type;
    this._status = props.status;
    this._primaryContactId = props.primaryContactId || null;
    this._createdAt = props.createdAt || new Date();
    this._createdBy = props.createdBy || null;
    this._updatedAt = props.updatedAt || new Date();
    this._updatedBy = props.updatedBy || null;
    this._isDeleted = props.isDeleted ?? false;
    this._version = props.version ?? BigInt(1);

    if (props.contacts) {
      props.contacts.forEach((c) => {
        const contactInstance = Contact.create(c);
        this._contacts.set(contactInstance.id, contactInstance);
      });
    }

    if (props.notes) {
      this._notes = [...props.notes];
    }
    if (props.documents) {
      this._documents = [...props.documents];
    }
    if (props.timeline) {
      this._timeline = [...props.timeline];
    }
  }

  // Static Factory Method
  public static create(props: {
    tenantId: string;
    relationshipNumber: string;
    name: string;
    type: RelationshipType;
    status?: RelationshipStatus;
    primaryContact?: { name: string; email?: string; phone?: string; role?: string };
    createdBy?: string;
  }): Relationship {
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Relationship name is required.');
    }

    const initialStatus = props.status || RelationshipStatus.PROSPECT;
    const instance = new Relationship({
      tenantId: props.tenantId,
      relationshipNumber: props.relationshipNumber,
      name: props.name,
      type: props.type,
      status: initialStatus,
      createdBy: props.createdBy,
    });

    // Record Creation Event first
    instance._domainEvents.push(
      new RelationshipCreatedEvent(
        instance.tenantId,
        instance.id,
        instance.relationshipNumber,
        instance.name,
        instance.type,
        instance.status,
        props.createdBy
      )
    );

    // If primary contact provided at creation
    if (props.primaryContact) {
      const contact = instance.addContact({
        tenantId: props.tenantId,
        relationshipId: instance.id,
        name: props.primaryContact.name,
        email: props.primaryContact.email,
        phone: props.primaryContact.phone,
        role: props.primaryContact.role,
        isPrimary: true,
        createdBy: props.createdBy,
      });
      instance._primaryContactId = contact.id;
    }

    // Add timeline entry for creation
    instance.recordTimelineEntry('CREATED', `Relationship ${instance.relationshipNumber} created as ${initialStatus}.`, props.createdBy);

    return instance;
  }

  // Reconstitute from Persistence
  public static reconstitute(props: RelationshipProps): Relationship {
    return new Relationship(props);
  }

  // Getters
  public get id(): string { return this._id; }
  public get tenantId(): string { return this._tenantId; }
  public get relationshipNumber(): string { return this._relationshipNumber; }
  public get name(): string { return this._name; }
  public get type(): RelationshipType { return this._type; }
  public get status(): RelationshipStatus { return this._status; }
  public get primaryContactId(): string | null { return this._primaryContactId; }
  public get contacts(): Contact[] { return Array.from(this._contacts.values()); }
  public get notes(): RelationshipNoteProps[] { return [...this._notes]; }
  public get documents(): RelationshipDocumentProps[] { return [...this._documents]; }
  public get timeline(): RelationshipTimelineEntry[] { return [...this._timeline]; }
  public get createdAt(): Date { return this._createdAt; }
  public get createdBy(): string | null { return this._createdBy; }
  public get updatedAt(): Date { return this._updatedAt; }
  public get updatedBy(): string | null { return this._updatedBy; }
  public get isDeleted(): boolean { return this._isDeleted; }
  public get version(): bigint { return this._version; }

  // Business Command: Convert Prospect to Customer (BR-002, BR-003)
  public convertProspectToCustomer(convertedBy?: string): void {
    if (this._status === RelationshipStatus.CUSTOMER) {
      return; // Already customer (idempotent)
    }

    if (this._status === RelationshipStatus.BLACKLISTED) {
      throw new InvalidRelationshipStatusTransitionError(this._status, RelationshipStatus.CUSTOMER);
    }

    const previousStatus = this._status;
    this._status = RelationshipStatus.CUSTOMER;
    this._updatedAt = new Date();
    this._updatedBy = convertedBy || null;

    this.recordTimelineEntry(
      'CONVERTED_TO_CUSTOMER',
      `Prospect converted to Customer (Number: ${this._relationshipNumber}).`,
      convertedBy
    );

    this._domainEvents.push(
      new ProspectConvertedToCustomerEvent(this._tenantId, this._id, this._relationshipNumber, convertedBy)
    );
    this._domainEvents.push(
      new RelationshipStatusUpdatedEvent(this._tenantId, this._id, previousStatus, this._status, convertedBy)
    );
  }

  // Business Command: Update Status
  public updateStatus(targetStatus: RelationshipStatus, updatedBy?: string): void {
    if (this._status === targetStatus) return;

    const previousStatus = this._status;
    this._status = targetStatus;
    this._updatedAt = new Date();
    this._updatedBy = updatedBy || null;

    this.recordTimelineEntry('STATUS_UPDATED', `Status updated from ${previousStatus} to ${targetStatus}.`, updatedBy);

    this._domainEvents.push(
      new RelationshipStatusUpdatedEvent(this._tenantId, this._id, previousStatus, targetStatus, updatedBy)
    );
  }

  // Contact Management (BR-005)
  public addContact(props: Omit<ContactProps, 'relationshipId'> & { relationshipId?: string }): Contact {
    const contactProps: ContactProps = {
      ...props,
      relationshipId: this._id,
      tenantId: this._tenantId,
    };

    // If this is set as primary or is the first contact, make it primary
    if (props.isPrimary || this._contacts.size === 0) {
      contactProps.isPrimary = true;
      // Clear other primary flags
      this._contacts.forEach((c) => c.setPrimary(false));
    }

    const contact = Contact.create(contactProps);
    this._contacts.set(contact.id, contact);

    if (contact.isPrimary) {
      this._primaryContactId = contact.id;
    }

    this._updatedAt = new Date();
    this.recordTimelineEntry('CONTACT_ADDED', `Contact '${contact.name}' added.`, props.createdBy);

    this._domainEvents.push(
      new ContactAddedEvent(this._tenantId, this._id, contact.id, contact.name, contact.isPrimary)
    );

    return contact;
  }

  public setPrimaryContact(contactId: string, updatedBy?: string): void {
    const contact = this._contacts.get(contactId);
    if (!contact) {
      throw new ContactNotFoundException(contactId);
    }

    this._contacts.forEach((c) => c.setPrimary(c.id === contactId));
    this._primaryContactId = contactId;
    this._updatedAt = new Date();
    this._updatedBy = updatedBy || null;

    this.recordTimelineEntry('PRIMARY_CONTACT_SET', `Contact '${contact.name}' designated as primary.`, updatedBy);
  }

  public removeContact(contactId: string, updatedBy?: string): void {
    const contact = this._contacts.get(contactId);
    if (!contact) {
      throw new ContactNotFoundException(contactId);
    }

    this._contacts.delete(contactId);
    if (this._primaryContactId === contactId) {
      const firstRemaining = this.contacts[0];
      if (firstRemaining) {
        firstRemaining.setPrimary(true);
        this._primaryContactId = firstRemaining.id;
      } else {
        this._primaryContactId = null;
      }
    }

    this._updatedAt = new Date();
    this._updatedBy = updatedBy || null;
    this.recordTimelineEntry('CONTACT_REMOVED', `Contact '${contact.name}' removed.`, updatedBy);
  }

  // Notes & Documents (Local implementations; VAP Platform Candidates)
  public addNote(content: string, createdBy?: string): RelationshipNoteProps {
    if (!content || content.trim().length === 0) {
      throw new Error('Note content cannot be empty.');
    }

    const note: RelationshipNoteProps = {
      id: crypto.randomUUID(),
      tenantId: this._tenantId,
      relationshipId: this._id,
      content: content.trim(),
      createdAt: new Date(),
      createdBy: createdBy || null,
    };

    this._notes.push(note);
    this._updatedAt = new Date();
    this.recordTimelineEntry('NOTE_ADDED', `Note added.`, createdBy);

    this._domainEvents.push(new NoteAddedEvent(this._tenantId, this._id, note.id!, createdBy));
    return note;
  }

  public attachDocument(doc: { fileName: string; fileUrl: string; fileSize: number; fileType: string; createdBy?: string }): RelationshipDocumentProps {
    const document: RelationshipDocumentProps = {
      id: crypto.randomUUID(),
      tenantId: this._tenantId,
      relationshipId: this._id,
      fileName: doc.fileName,
      fileUrl: doc.fileUrl,
      fileSize: doc.fileSize,
      fileType: doc.fileType,
      createdAt: new Date(),
      createdBy: doc.createdBy || null,
    };

    this._documents.push(document);
    this._updatedAt = new Date();
    this.recordTimelineEntry('DOCUMENT_ATTACHED', `Document '${doc.fileName}' attached.`, doc.createdBy);
    return document;
  }

  private recordTimelineEntry(eventType: string, description: string, actorId?: string): void {
    this._timeline.push({
      id: crypto.randomUUID(),
      timestamp: new Date(),
      eventType,
      description,
      actorId,
    });
  }

  // Domain Events Collection
  public popDomainEvents(): IDomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }
}
