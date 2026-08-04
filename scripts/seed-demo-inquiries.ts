import { getPool, getAdminAndTenant } from "./lib/demo-db";

// Official Demo Dataset — Inquiries.
// One Inquiry per demo Relationship, each a believable event brief that
// will carry through Quotation, Publication, Decision, and Conversion.
// Idempotent: upserts on a stable inquiry_number (INQ-DEMO-01..10),
// independent of the app's own auto-incrementing INQ-YYYY-###### codes.

interface InquirySpec {
  code: string; // stable business key, e.g. INQ-DEMO-01
  relationshipCode: string; // matches seed-demo-relationships.ts
  title: string;
  eventType: 'WEDDING' | 'CORPORATE' | 'BIRTHDAY' | 'ANNIVERSARY' | 'SOCIAL' | 'OTHER';
  eventDate: string; // YYYY-MM-DD
  venue: string;
  guestCount: number;
  budgetRange: string;
  servicveStyle: string;
  foodPreference: string;
  salesperson: string;
  source: string;
}

const INQUIRIES: InquirySpec[] = [
  { code: 'INQ-DEMO-01', relationshipCode: 'REL-DEMO-01', title: 'Rahul & Priya Wedding', eventType: 'WEDDING', eventDate: '2026-11-14', venue: 'The Grand Pavilion, New Delhi', guestCount: 400, budgetRange: '₹40,00,000 - ₹50,00,000', servicveStyle: 'Buffet with Live Counters', foodPreference: 'Mixed (Veg & Non-Veg)', salesperson: 'Ananya Singh', source: 'Referral' },
  { code: 'INQ-DEMO-02', relationshipCode: 'REL-DEMO-02', title: "Aarav's 7th Birthday Celebration", eventType: 'BIRTHDAY', eventDate: '2026-09-20', venue: 'Sunset Terrace, Mumbai', guestCount: 60, budgetRange: '₹2,00,000 - ₹3,00,000', servicveStyle: 'Buffet', foodPreference: 'Pure Vegetarian', salesperson: 'Rohit Malhotra', source: 'Website' },
  { code: 'INQ-DEMO-03', relationshipCode: 'REL-DEMO-03', title: 'ABC Technologies Annual Meet', eventType: 'CORPORATE', eventDate: '2026-10-05', venue: 'Business Convention Centre, Bengaluru', guestCount: 150, budgetRange: '₹8,00,000 - ₹10,00,000', servicveStyle: 'Plated', foodPreference: 'Mixed (Veg & Non-Veg)', salesperson: 'Divya Nair', source: 'Corporate Account Manager' },
  { code: 'INQ-DEMO-04', relationshipCode: 'REL-DEMO-04', title: 'Anjali & Karan Luxury Destination Wedding', eventType: 'WEDDING', eventDate: '2026-12-12', venue: 'Lakeside Resort & Spa, Udaipur', guestCount: 500, budgetRange: '₹80,00,000 - ₹1,00,00,000', servicveStyle: 'Plated with Live Counters', foodPreference: 'Mixed (Veg & Non-Veg)', salesperson: 'Ananya Singh', source: 'Wedding Planner Referral' },
  { code: 'INQ-DEMO-05', relationshipCode: 'REL-DEMO-05', title: 'Sharma Family Reception', eventType: 'SOCIAL', eventDate: '2026-10-25', venue: 'Emerald Banquet Hall, Pune', guestCount: 250, budgetRange: '₹15,00,000 - ₹18,00,000', servicveStyle: 'Buffet', foodPreference: 'Mixed (Veg & Non-Veg)', salesperson: 'Rohit Malhotra', source: 'Referral' },
  { code: 'INQ-DEMO-06', relationshipCode: 'REL-DEMO-06', title: 'Global Finance Corp Awards Night', eventType: 'CORPORATE', eventDate: '2026-11-08', venue: 'Skyline Convention Centre, Mumbai', guestCount: 200, budgetRange: '₹20,00,000 - ₹25,00,000', servicveStyle: 'Cocktail & Plated', foodPreference: 'Mixed (Veg & Non-Veg)', salesperson: 'Divya Nair', source: 'Corporate Account Manager' },
  { code: 'INQ-DEMO-07', relationshipCode: 'REL-DEMO-07', title: 'Gupta Family Diwali Celebration', eventType: 'SOCIAL', eventDate: '2026-11-01', venue: 'Gupta Residence Lawn, Jaipur', guestCount: 100, budgetRange: '₹5,00,000 - ₹6,00,000', servicveStyle: 'Buffet with Live Counters', foodPreference: 'Pure Vegetarian', salesperson: 'Rohit Malhotra', source: 'Referral' },
  { code: 'INQ-DEMO-08', relationshipCode: 'REL-DEMO-08', title: 'Nair Residence House Warming Ceremony', eventType: 'SOCIAL', eventDate: '2026-09-28', venue: 'Nair Residence, Kochi', guestCount: 80, budgetRange: '₹3,00,000 - ₹4,00,000', servicveStyle: 'Buffet', foodPreference: 'Pure Vegetarian (Jain options)', salesperson: 'Divya Nair', source: 'Website' },
  { code: 'INQ-DEMO-09', relationshipCode: 'REL-DEMO-09', title: 'Meridian Capital Advisors VIP Leadership Dinner', eventType: 'CORPORATE', eventDate: '2026-10-15', venue: 'The Executive Club, New Delhi', guestCount: 30, budgetRange: '₹6,00,000 - ₹8,00,000', servicveStyle: 'Plated', foodPreference: 'Mixed (Veg & Non-Veg)', salesperson: 'Ananya Singh', source: 'Corporate Account Manager' },
  { code: 'INQ-DEMO-10', relationshipCode: 'REL-DEMO-10', title: 'TechNova Product Launch Event', eventType: 'CORPORATE', eventDate: '2026-10-30', venue: 'Innovation Hub Auditorium, Hyderabad', guestCount: 180, budgetRange: '₹12,00,000 - ₹15,00,000', servicveStyle: 'Cocktail Reception', foodPreference: 'Mixed (Veg & Non-Veg)', salesperson: 'Divya Nair', source: 'Website' },
];

async function main() {
  const pool = getPool();
  const { tenantId, adminId } = await getAdminAndTenant(pool);

  let processed = 0;
  let skippedMissingRelationship = 0;

  for (const inq of INQUIRIES) {
    const relRes = await pool.query(
      `SELECT id FROM cat_relationships WHERE tenant_id = $1 AND relationship_number = $2`,
      [tenantId, inq.relationshipCode],
    );
    if (relRes.rows.length === 0) {
      console.warn(`Skipping "${inq.title}" — Relationship ${inq.relationshipCode} not found. Run seed-demo-relationships.ts first.`);
      skippedMissingRelationship++;
      continue;
    }
    const relationshipId = relRes.rows[0].id;

    const existing = await pool.query(`SELECT id FROM cat_inquiries WHERE tenant_id = $1 AND inquiry_number = $2`, [tenantId, inq.code]);

    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE cat_inquiries SET
           title = $1, relationship_id = $2, event_type = $3, tentative_event_date = $4::date, venue = $5,
           expected_guest_count = $6, budget_range = $7, priority = 'HIGH', inquiry_stage = 'BOOKED',
           assigned_salesperson = $8, inquiry_source = $9, service_style = $10, food_preference = $11,
           updated_at = NOW(), updated_by = $12
         WHERE id = $13`,
        [inq.title, relationshipId, inq.eventType, inq.eventDate, inq.venue, inq.guestCount, inq.budgetRange, inq.salesperson, inq.source, inq.servicveStyle, inq.foodPreference, adminId, existing.rows[0].id],
      );
    } else {
      await pool.query(
        `INSERT INTO cat_inquiries (
           id, tenant_id, inquiry_number, title, relationship_id, event_type, tentative_event_date, venue,
           expected_guest_count, budget_range, priority, inquiry_stage, assigned_salesperson, inquiry_source,
           service_style, food_preference, created_at, created_by, updated_at, updated_by, is_deleted
         ) VALUES (
           gen_random_uuid(), $1, $2, $3, $4, $5, $6::date, $7,
           $8, $9, 'HIGH', 'BOOKED', $10, $11,
           $12, $13, NOW(), $14, NOW(), $14, false
         )`,
        [tenantId, inq.code, inq.title, relationshipId, inq.eventType, inq.eventDate, inq.venue, inq.guestCount, inq.budgetRange, inq.salesperson, inq.source, inq.servicveStyle, inq.foodPreference, adminId],
      );
    }

    processed++;
  }

  console.log(`Inquiries: ${processed} processed, ${skippedMissingRelationship} skipped (of ${INQUIRIES.length} defined).`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
