import { PrismaClient } from '@/generated/client';
import { PrismaRelationshipRepository } from '../PrismaRelationshipRepository';
import { Relationship } from '../../../domain/Relationship';
import { RelationshipType, RelationshipStatus } from '../../../domain/RelationshipModels';

describe('BWP-001 Relationship Repository Integration Tests', () => {
  let prisma: PrismaClient;
  let repository: PrismaRelationshipRepository;
  const tenantId = '00000000-0000-0000-0000-000000000001';

  beforeAll(() => {
    prisma = new PrismaClient();
    repository = new PrismaRelationshipRepository(prisma as any);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should save and find relationship by id and number with tenant isolation', async () => {
    const relNum = `REL-TEST-${Date.now()}`;
    const rel = Relationship.create({
      tenantId,
      relationshipNumber: relNum,
      name: 'Integration Test Corp',
      type: RelationshipType.ORGANIZATION,
      primaryContact: { name: 'Test User', email: 'test@integration.com' },
    });

    const saved = await repository.save(rel);
    expect(saved).toBeDefined();
    expect(saved.id).toBe(rel.id);

    const foundById = await repository.findById(tenantId, rel.id);
    expect(foundById).not.toBeNull();
    expect(foundById?.name).toBe('Integration Test Corp');

    const foundByNum = await repository.findByNumber(tenantId, relNum);
    expect(foundByNum).not.toBeNull();
    expect(foundByNum?.id).toBe(rel.id);

    // Cross tenant scoping check
    const wrongTenantFound = await repository.findById('00000000-0000-0000-0000-000000000099', rel.id);
    expect(wrongTenantFound).toBeNull();
  });

  it('should perform multi-field search across relationship name, contact name, email, and phone', async () => {
    const searchTag = `SearchTarget_${Date.now()}`;
    const rel = Relationship.create({
      tenantId,
      relationshipNumber: `REL-SRCH-${Date.now()}`,
      name: `Company ${searchTag}`,
      type: RelationshipType.ORGANIZATION,
      primaryContact: { name: `Contact ${searchTag}`, email: `email_${searchTag}@test.com`, phone: '+1999888' },
    });

    await repository.save(rel);

    // Search by name
    const searchByName = await repository.search({ tenantId, query: searchTag });
    expect(searchByName.items.length).toBeGreaterThanOrEqual(1);

    // Search by email
    const searchByEmail = await repository.search({ tenantId, query: `email_${searchTag}` });
    expect(searchByEmail.items.length).toBeGreaterThanOrEqual(1);

    // Search by phone
    const searchByPhone = await repository.search({ tenantId, query: '+1999888' });
    expect(searchByPhone.items.length).toBeGreaterThanOrEqual(1);
  });

  it('should perform advisory duplicate search', async () => {
    const dupName = `DuplicateName_${Date.now()}`;
    const dupEmail = `dup_${Date.now()}@test.com`;

    const rel = Relationship.create({
      tenantId,
      relationshipNumber: `REL-DUP-${Date.now()}`,
      name: dupName,
      type: RelationshipType.INDIVIDUAL,
      primaryContact: { name: 'Dup Contact', email: dupEmail },
    });

    await repository.save(rel);

    const matches = await repository.findDuplicates(tenantId, dupName, dupEmail);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches[0].name).toBe(dupName);
  });
});
