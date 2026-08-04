import { getPool, getAdminAndTenant } from "./lib/demo-db";

// Official Demo Dataset — Relationships & Contacts.
// 10 realistic customer relationships (mix of Individual and
// Organization) that carry the full Sales journey through to a
// Converted Event. Idempotent: upserts on a stable relationship_number
// (REL-DEMO-01..10), not the app's own auto-incrementing REL-##### codes,
// so this script never collides with organically created relationships.

interface ContactSpec { name: string; email: string; phone: string; role: string }
interface RelationshipSpec {
  code: string; // stable business key, e.g. REL-DEMO-01
  name: string;
  type: 'INDIVIDUAL' | 'ORGANIZATION';
  contact: ContactSpec;
}

const RELATIONSHIPS: RelationshipSpec[] = [
  { code: 'REL-DEMO-01', name: 'Rahul Verma & Priya Malhotra', type: 'INDIVIDUAL', contact: { name: 'Rahul Verma', email: 'rahul.verma@example.com', phone: '+91 98450 12301', role: 'Groom' } },
  { code: 'REL-DEMO-02', name: 'Mehta Family', type: 'INDIVIDUAL', contact: { name: 'Rohan Mehta', email: 'rohan.mehta@example.com', phone: '+91 98450 12302', role: 'Parent' } },
  { code: 'REL-DEMO-03', name: 'ABC Technologies Pvt Ltd', type: 'ORGANIZATION', contact: { name: 'Neha Kapoor', email: 'neha.kapoor@example.com', phone: '+91 98450 12303', role: 'HR Manager' } },
  { code: 'REL-DEMO-04', name: 'Anjali & Karan Kapoor', type: 'INDIVIDUAL', contact: { name: 'Karan Kapoor', email: 'karan.kapoor@example.com', phone: '+91 98450 12304', role: 'Groom' } },
  { code: 'REL-DEMO-05', name: 'Sharma Family', type: 'INDIVIDUAL', contact: { name: 'Vikram Sharma', email: 'vikram.sharma@example.com', phone: '+91 98450 12305', role: 'Host' } },
  { code: 'REL-DEMO-06', name: 'Global Finance Corp', type: 'ORGANIZATION', contact: { name: 'Ritu Desai', email: 'ritu.desai@example.com', phone: '+91 98450 12306', role: 'Events Coordinator' } },
  { code: 'REL-DEMO-07', name: 'Gupta Family', type: 'INDIVIDUAL', contact: { name: 'Anil Gupta', email: 'anil.gupta@example.com', phone: '+91 98450 12307', role: 'Host' } },
  { code: 'REL-DEMO-08', name: 'Nair Residence', type: 'INDIVIDUAL', contact: { name: 'Suresh Nair', email: 'suresh.nair@example.com', phone: '+91 98450 12308', role: 'Host' } },
  { code: 'REL-DEMO-09', name: 'Meridian Capital Advisors', type: 'ORGANIZATION', contact: { name: 'Kavita Rao', email: 'kavita.rao@example.com', phone: '+91 98450 12309', role: 'Executive Assistant' } },
  { code: 'REL-DEMO-10', name: 'TechNova Solutions', type: 'ORGANIZATION', contact: { name: 'Arjun Mehra', email: 'arjun.mehra@example.com', phone: '+91 98450 12310', role: 'Marketing Head' } },
];

async function main() {
  const pool = getPool();
  const { tenantId, adminId } = await getAdminAndTenant(pool);

  let processed = 0;

  for (const rel of RELATIONSHIPS) {
    const existing = await pool.query(
      `SELECT id FROM cat_relationships WHERE tenant_id = $1 AND relationship_number = $2`,
      [tenantId, rel.code],
    );

    let relationshipId: string;
    if (existing.rows.length > 0) {
      relationshipId = existing.rows[0].id;
      await pool.query(
        `UPDATE cat_relationships SET name = $1, type = $2, status = 'CUSTOMER', updated_at = NOW(), updated_by = $3 WHERE id = $4`,
        [rel.name, rel.type, adminId, relationshipId],
      );
    } else {
      const inserted = await pool.query(
        `INSERT INTO cat_relationships (id, tenant_id, relationship_number, name, type, status, created_at, created_by, updated_at, updated_by, is_deleted, version)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, 'CUSTOMER', NOW(), $5, NOW(), $5, false, 1) RETURNING id`,
        [tenantId, rel.code, rel.name, rel.type, adminId],
      );
      relationshipId = inserted.rows[0].id;
    }

    const existingContact = await pool.query(
      `SELECT id FROM cat_contacts WHERE tenant_id = $1 AND relationship_id = $2 AND name = $3`,
      [tenantId, relationshipId, rel.contact.name],
    );

    let contactId: string;
    if (existingContact.rows.length > 0) {
      contactId = existingContact.rows[0].id;
      await pool.query(
        `UPDATE cat_contacts SET email = $1, phone = $2, role = $3, is_primary = true, updated_at = NOW(), updated_by = $4 WHERE id = $5`,
        [rel.contact.email, rel.contact.phone, rel.contact.role, adminId, contactId],
      );
    } else {
      const insertedContact = await pool.query(
        `INSERT INTO cat_contacts (id, tenant_id, relationship_id, name, email, phone, role, is_primary, created_at, created_by, updated_at, updated_by, is_deleted)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, NOW(), $7, NOW(), $7, false) RETURNING id`,
        [tenantId, relationshipId, rel.contact.name, rel.contact.email, rel.contact.phone, rel.contact.role, adminId],
      );
      contactId = insertedContact.rows[0].id;
    }

    await pool.query(`UPDATE cat_relationships SET primary_contact_id = $1 WHERE id = $2`, [contactId, relationshipId]);

    processed++;
  }

  console.log(`Relationships: ${processed} relationships (with primary contacts) processed (of ${RELATIONSHIPS.length} defined).`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
