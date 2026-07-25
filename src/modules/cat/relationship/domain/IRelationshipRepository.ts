/**
 * BWP-001 Relationship Foundation — Repository Interface
 */
import { Relationship } from './Relationship';
import { RelationshipSearchParams } from './RelationshipModels';

export interface IRelationshipRepository {
  save(relationship: Relationship): Promise<Relationship>;
  findById(tenantId: string, id: string): Promise<Relationship | null>;
  findByNumber(tenantId: string, relationshipNumber: string): Promise<Relationship | null>;
  
  /**
   * Multi-field search across relationship name, contact name, contact email, and contact phone.
   */
  search(params: RelationshipSearchParams): Promise<{ items: Relationship[]; total: number }>;

  /**
   * Advisory duplicate search helper
   */
  findDuplicates(tenantId: string, name: string, email?: string, phone?: string): Promise<Array<{ id: string; name: string; email?: string; phone?: string }>>;

  delete(tenantId: string, id: string, deletedBy?: string): Promise<void>;
  getNextRelationshipNumber(tenantId: string): Promise<string>;
}
