/**
 * BWP-001 Relationship Foundation — Domain Models & Value Types
 */

export enum RelationshipType {
  INDIVIDUAL = 'INDIVIDUAL',
  ORGANIZATION = 'ORGANIZATION',
}

export enum RelationshipStatus {
  PROSPECT = 'PROSPECT',
  CUSTOMER = 'CUSTOMER',
  INACTIVE = 'INACTIVE',
  BLACKLISTED = 'BLACKLISTED',
}

export interface ContactProps {
  id?: string;
  tenantId: string;
  relationshipId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  isPrimary?: boolean;
  createdAt?: Date;
  createdBy?: string | null;
  updatedAt?: Date;
  updatedBy?: string | null;
  isDeleted?: boolean;
}

export interface RelationshipNoteProps {
  id?: string;
  tenantId: string;
  relationshipId: string;
  content: string;
  createdAt?: Date;
  createdBy?: string | null;
}

export interface RelationshipDocumentProps {
  id?: string;
  tenantId: string;
  relationshipId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  createdAt?: Date;
  createdBy?: string | null;
}

export interface RelationshipTimelineEntry {
  id: string;
  timestamp: Date;
  eventType: string;
  description: string;
  actorId?: string;
}

export interface RelationshipProps {
  id?: string;
  tenantId: string;
  relationshipNumber: string;
  name: string;
  type: RelationshipType;
  status: RelationshipStatus;
  primaryContactId?: string | null;
  contacts?: ContactProps[];
  notes?: RelationshipNoteProps[];
  documents?: RelationshipDocumentProps[];
  timeline?: RelationshipTimelineEntry[];
  createdAt?: Date;
  createdBy?: string | null;
  updatedAt?: Date;
  updatedBy?: string | null;
  isDeleted?: boolean;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  version?: bigint;
}

export interface CreateRelationshipCommand {
  tenantId: string;
  name: string;
  type: RelationshipType;
  relationshipNumber?: string;
  primaryContact?: {
    name: string;
    email?: string;
    phone?: string;
    role?: string;
  };
  createdBy?: string;
}

export interface RelationshipSearchParams {
  tenantId: string;
  query?: string;
  type?: RelationshipType;
  status?: RelationshipStatus;
  limit?: number;
  offset?: number;
}
