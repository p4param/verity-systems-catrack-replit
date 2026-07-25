/**
 * BWP-001 Relationship Foundation — Domain Exceptions
 */

export class RelationshipException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RelationshipException';
  }
}

export class RelationshipNotFoundException extends RelationshipException {
  constructor(id: string) {
    super(`Relationship with ID '${id}' was not found.`);
    this.name = 'RelationshipNotFoundException';
  }
}

export class ContactNotFoundException extends RelationshipException {
  constructor(contactId: string) {
    super(`Contact with ID '${contactId}' was not found on relationship.`);
    this.name = 'ContactNotFoundException';
  }
}

export class InvalidRelationshipStatusTransitionError extends RelationshipException {
  constructor(currentStatus: string, targetStatus: string) {
    super(`Invalid relationship status transition from '${currentStatus}' to '${targetStatus}'.`);
    this.name = 'InvalidRelationshipStatusTransitionError';
  }
}

export class DuplicateRelationshipWarning extends RelationshipException {
  public readonly matches: Array<{ id: string; name: string; email?: string; phone?: string }>;

  constructor(matches: Array<{ id: string; name: string; email?: string; phone?: string }>) {
    super(`Advisory Duplicate Warning: Found ${matches.length} existing matching relationship(s).`);
    this.name = 'DuplicateRelationshipWarning';
    this.matches = matches;
  }
}
