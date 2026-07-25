/**
 * BWP-001 Relationship Foundation — Internal Contact Domain Entity (BR-005)
 */
import { ContactProps } from './RelationshipModels';

export class Contact {
  private readonly _id: string;
  private readonly _tenantId: string;
  private readonly _relationshipId: string;
  private _name: string;
  private _email: string | null;
  private _phone: string | null;
  private _role: string | null;
  private _isPrimary: boolean;
  private readonly _createdAt: Date;
  private readonly _createdBy: string | null;

  private constructor(props: ContactProps) {
    this._id = props.id || crypto.randomUUID();
    this._tenantId = props.tenantId;
    this._relationshipId = props.relationshipId;
    this._name = props.name;
    this._email = props.email || null;
    this._phone = props.phone || null;
    this._role = props.role || null;
    this._isPrimary = props.isPrimary ?? false;
    this._createdAt = props.createdAt || new Date();
    this._createdBy = props.createdBy || null;
  }

  public static create(props: ContactProps): Contact {
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Contact name is required.');
    }
    return new Contact(props);
  }

  public get id(): string { return this._id; }
  public get tenantId(): string { return this._tenantId; }
  public get relationshipId(): string { return this._relationshipId; }
  public get name(): string { return this._name; }
  public get email(): string | null { return this._email; }
  public get phone(): string | null { return this._phone; }
  public get role(): string | null { return this._role; }
  public get isPrimary(): boolean { return this._isPrimary; }
  public get createdAt(): Date { return this._createdAt; }
  public get createdBy(): string | null { return this._createdBy; }

  public setPrimary(isPrimary: boolean): void {
    this._isPrimary = isPrimary;
  }

  public updateDetails(name: string, email?: string | null, phone?: string | null, role?: string | null): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Contact name is required.');
    }
    this._name = name;
    this._email = email !== undefined ? email : this._email;
    this._phone = phone !== undefined ? phone : this._phone;
    this._role = role !== undefined ? role : this._role;
  }

  public toProps(): ContactProps {
    return {
      id: this._id,
      tenantId: this._tenantId,
      relationshipId: this._relationshipId,
      name: this._name,
      email: this._email,
      phone: this._phone,
      role: this._role,
      isPrimary: this._isPrimary,
      createdAt: this._createdAt,
      createdBy: this._createdBy,
    };
  }
}
