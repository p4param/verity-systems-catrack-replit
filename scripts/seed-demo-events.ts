import { getPool, getAdminAndTenant } from "./lib/demo-db";

// Official Demo Dataset — Events.
// Converts each demo Quotation to an Event (replicating
// src/app/api/cat/quotations/[id]/convert/route.ts exactly: event_number
// format, origin_quotation_revision, grand_total/currency from the
// published snapshot, event fields from the originating Inquiry), then
// seeds a realistic Event Planning brief and applies the mapped Menu
// Template as a snapshot-copy (matching EM-WP04's Apply Template
// semantics — new ids throughout, no live link back to the Template).
// Idempotent: reuses cat_quotations.converted_event_id when present;
// Planning and Menu are fully reconciled (wipe-and-reinsert) on every run.

interface TimelineEntry { timeLabel: string; activity: string; responsibleParty: string; notes?: string }
interface KeyContact { name: string; role: string; phone: string; email: string; notes?: string }
interface ChecklistItem { text: string; done: boolean }

interface EventSpec {
  quotationCode: string;
  templateName: string;
  opsOwner: string;
  opsPhone: string;
  opsEmail: string;
  operationalSummary: string;
  timeline: TimelineEntry[];
  keyContacts: KeyContact[];
  operationalNotes: string;
  risks: string[];
  checklist: ChecklistItem[];
}

const EVENTS: EventSpec[] = [
  {
    quotationCode: 'QT-DEMO-01', templateName: 'North Indian Wedding',
    opsOwner: 'Suresh Iyer', opsPhone: '+91 99870 11201', opsEmail: 'suresh.iyer@example.com',
    operationalSummary: 'Large-scale wedding reception for 400 guests. Two-line buffet with live chaat and pasta counters. Coordinate closely with venue banquet team for parallel setup.',
    timeline: [
      { timeLabel: '2:00 PM', activity: 'Kitchen team arrives, begins mise en place', responsibleParty: 'Kitchen Team' },
      { timeLabel: '5:00 PM', activity: 'Live counters and buffet stations set up', responsibleParty: 'Setup Crew' },
      { timeLabel: '7:00 PM', activity: 'Welcome drinks service begins as guests arrive', responsibleParty: 'Service Staff' },
      { timeLabel: '8:30 PM', activity: 'Main buffet opens', responsibleParty: 'Service Staff' },
    ],
    keyContacts: [
      { name: 'Rahul Verma', role: 'Client (Groom)', phone: '+91 98450 12301', email: 'rahul.verma@example.com' },
      { name: 'Suresh Iyer', role: 'Operations Lead', phone: '+91 99870 11201', email: 'suresh.iyer@example.com' },
    ],
    operationalNotes: 'Family requested extra bread variety at the buffet. Confirm final headcount 10 days prior — this family has historically increased guest count close to the date.',
    risks: ['Two guests have severe nut allergies — flag with kitchen team and keep a nut-free garnish station.', 'Venue has limited backstage power outlets — confirm live counter power allocation in advance.'],
    checklist: [
      { text: 'Confirm final guest count with family', done: true },
      { text: 'Venue kitchen access and power walkthrough', done: true },
      { text: 'Live counter staffing confirmed', done: false },
      { text: 'Jain and Vegan preparation line briefed', done: false },
    ],
  },
  {
    quotationCode: 'QT-DEMO-02', templateName: 'Birthday Celebration',
    opsOwner: 'Meena Pillai', opsPhone: '+91 99870 11202', opsEmail: 'meena.pillai@example.com',
    operationalSummary: 'Small, cheerful birthday event for 60 guests, mostly families with children. Coordinate cake-cutting with dessert counter timing.',
    timeline: [
      { timeLabel: '4:00 PM', activity: 'Setup and dessert counter arrangement', responsibleParty: 'Setup Crew' },
      { timeLabel: '5:30 PM', activity: 'Snacks and welcome drinks service begins', responsibleParty: 'Service Staff' },
      { timeLabel: '6:30 PM', activity: 'Cake-cutting moment, hold ice cream counter', responsibleParty: 'Operations Lead' },
    ],
    keyContacts: [
      { name: 'Rohan Mehta', role: 'Client (Parent)', phone: '+91 98450 12302', email: 'rohan.mehta@example.com' },
      { name: 'Meena Pillai', role: 'Operations Lead', phone: '+91 99870 11202', email: 'meena.pillai@example.com' },
    ],
    operationalNotes: 'Milder spice level requested across all preparations given the number of children attending.',
    risks: ['Confirm cake arrival time with the family — dessert counter timing depends on it.'],
    checklist: [
      { text: 'Confirm cake-cutting time with family', done: true },
      { text: 'Kids menu spice level briefed to kitchen', done: true },
      { text: 'Dessert counter staffing confirmed', done: false },
    ],
  },
  {
    quotationCode: 'QT-DEMO-03', templateName: 'Executive Conference Lunch',
    opsOwner: 'Ravi Shankar', opsPhone: '+91 99870 11203', opsEmail: 'ravi.shankar@example.com',
    operationalSummary: 'Corporate annual meet lunch for 150 delegates. Service must run precisely on schedule around the conference agenda.',
    timeline: [
      { timeLabel: '11:00 AM', activity: 'Catering team arrives, sets up buffet and beverage stations', responsibleParty: 'Setup Crew' },
      { timeLabel: '12:30 PM', activity: 'Lunch service opens for delegates', responsibleParty: 'Service Staff' },
      { timeLabel: '1:15 PM', activity: 'Lunch service closes, tea/coffee station remains open', responsibleParty: 'Service Staff' },
    ],
    keyContacts: [
      { name: 'Neha Kapoor', role: 'Client (HR Manager)', phone: '+91 98450 12303', email: 'neha.kapoor@example.com' },
      { name: 'Ravi Shankar', role: 'Operations Lead', phone: '+91 99870 11203', email: 'ravi.shankar@example.com' },
    ],
    operationalNotes: 'Coordinate with venue AV team to avoid setup overlap. Corporate account — invoice per standard 15-day terms.',
    risks: ['Conference schedule may shift — hold a flexible 30-minute service buffer.'],
    checklist: [
      { text: 'Confirm conference schedule with client', done: true },
      { text: 'AV/catering setup overlap resolved with venue', done: false },
      { text: 'Tea/coffee station staffing confirmed', done: false },
    ],
  },
  {
    quotationCode: 'QT-DEMO-04', templateName: 'Luxury Wedding Reception',
    opsOwner: 'Suresh Iyer', opsPhone: '+91 99870 11201', opsEmail: 'suresh.iyer@example.com',
    operationalSummary: 'Premium destination wedding reception for 500 guests at Lakeside Resort & Spa, Udaipur. Dedicated banquet manager on-site for the full event.',
    timeline: [
      { timeLabel: '1:00 PM', activity: 'Logistics team arrives on-site, cold storage setup', responsibleParty: 'Logistics Team' },
      { timeLabel: '4:00 PM', activity: 'Kitchen team begins premium prep with resort kitchen access', responsibleParty: 'Kitchen Team' },
      { timeLabel: '7:00 PM', activity: 'Welcome drinks and cocktail hour begins', responsibleParty: 'Service Staff' },
      { timeLabel: '8:30 PM', activity: 'Plated dinner service begins', responsibleParty: 'Banquet Manager' },
    ],
    keyContacts: [
      { name: 'Karan Kapoor', role: 'Client (Groom)', phone: '+91 98450 12304', email: 'karan.kapoor@example.com' },
      { name: 'Suresh Iyer', role: 'Operations Lead / Banquet Manager', phone: '+91 99870 11201', email: 'suresh.iyer@example.com' },
    ],
    operationalNotes: 'Family expects a menu tasting session prior to final confirmation — already completed per Sales notes. Destination logistics require ingredients transported 48 hours in advance.',
    risks: ['Destination logistics — confirm cold-chain transport plan with resort kitchen 1 week prior.', 'High guest count with plated service requires precise staffing ratio — confirm final staff count.'],
    checklist: [
      { text: 'Cold-chain transport plan confirmed', done: true },
      { text: 'Resort kitchen access and cold storage confirmed', done: true },
      { text: 'Banquet manager travel and stay arranged', done: false },
      { text: 'Final guest count confirmed (14 days prior)', done: false },
    ],
  },
  {
    quotationCode: 'QT-DEMO-05', templateName: 'Reception Dinner',
    opsOwner: 'Meena Pillai', opsPhone: '+91 99870 11202', opsEmail: 'meena.pillai@example.com',
    operationalSummary: 'Evening reception dinner for 250 guests with plated starters and a buffet main course.',
    timeline: [
      { timeLabel: '4:30 PM', activity: 'Setup and buffet station arrangement', responsibleParty: 'Setup Crew' },
      { timeLabel: '7:00 PM', activity: 'Welcome drinks service begins', responsibleParty: 'Service Staff' },
      { timeLabel: '7:30 PM', activity: 'Plated starters served table-side', responsibleParty: 'Service Staff' },
      { timeLabel: '8:30 PM', activity: 'Buffet main course opens', responsibleParty: 'Service Staff' },
    ],
    keyContacts: [
      { name: 'Vikram Sharma', role: 'Client (Host)', phone: '+91 98450 12305', email: 'vikram.sharma@example.com' },
      { name: 'Meena Pillai', role: 'Operations Lead', phone: '+91 99870 11202', email: 'meena.pillai@example.com' },
    ],
    operationalNotes: 'Family requested extra bread variety — confirmed with kitchen during proposal review.',
    risks: ['Venue backup power for live counter — confirm with venue technical team.'],
    checklist: [
      { text: 'Confirm final guest count', done: true },
      { text: 'Bread variety confirmed with kitchen', done: true },
      { text: 'Venue power backup confirmed', done: false },
    ],
  },
  {
    quotationCode: 'QT-DEMO-06', templateName: 'Corporate Dinner',
    opsOwner: 'Ravi Shankar', opsPhone: '+91 99870 11203', opsEmail: 'ravi.shankar@example.com',
    operationalSummary: 'High-visibility awards night for 200 guests. Presentation quality and pacing are critical given media presence.',
    timeline: [
      { timeLabel: '5:00 PM', activity: 'Setup and cocktail station arrangement', responsibleParty: 'Setup Crew' },
      { timeLabel: '6:30 PM', activity: 'Cocktail hour begins', responsibleParty: 'Service Staff' },
      { timeLabel: '8:00 PM', activity: 'Plated dinner service begins, timed around awards programme', responsibleParty: 'Operations Lead' },
    ],
    keyContacts: [
      { name: 'Ritu Desai', role: 'Client (Events Coordinator)', phone: '+91 98450 12306', email: 'ritu.desai@example.com' },
      { name: 'Ravi Shankar', role: 'Operations Lead', phone: '+91 99870 11203', email: 'ravi.shankar@example.com' },
    ],
    operationalNotes: 'Confirm run-of-show with event emcee 1 week prior — service must pause during award announcements.',
    risks: ['Media presence — ensure service staff briefed on discretion near press areas.'],
    checklist: [
      { text: 'Run-of-show received from client', done: false },
      { text: 'Bar staffing confirmed', done: true },
      { text: 'Stage-side service coordination briefed', done: false },
    ],
  },
  {
    quotationCode: 'QT-DEMO-07', templateName: 'Festival Buffet',
    opsOwner: 'Meena Pillai', opsPhone: '+91 99870 11202', opsEmail: 'meena.pillai@example.com',
    operationalSummary: 'Fully vegetarian Diwali celebration for 100 guests at a residential lawn venue in Jaipur.',
    timeline: [
      { timeLabel: '5:00 PM', activity: 'Outdoor setup and live counter power check', responsibleParty: 'Setup Crew' },
      { timeLabel: '7:00 PM', activity: 'Welcome drinks and chaat counter service begins', responsibleParty: 'Service Staff' },
      { timeLabel: '8:00 PM', activity: 'Main buffet and sweets counter open', responsibleParty: 'Service Staff' },
    ],
    keyContacts: [
      { name: 'Anil Gupta', role: 'Client (Host)', phone: '+91 98450 12307', email: 'anil.gupta@example.com' },
      { name: 'Meena Pillai', role: 'Operations Lead', phone: '+91 99870 11202', email: 'meena.pillai@example.com' },
    ],
    operationalNotes: 'Residential venue — confirm outdoor power access and neighbourhood noise timing restrictions in advance.',
    risks: ['Outdoor event — confirm backup plan in case of unseasonal rain.'],
    checklist: [
      { text: 'Outdoor power access confirmed', done: true },
      { text: 'Backup rain plan discussed with family', done: false },
      { text: 'Sweets counter stock confirmed', done: false },
    ],
  },
  {
    quotationCode: 'QT-DEMO-08', templateName: 'House Warming',
    opsOwner: 'Ravi Shankar', opsPhone: '+91 99870 11203', opsEmail: 'ravi.shankar@example.com',
    operationalSummary: 'Traditional Griha Pravesh house warming lunch for 80 guests, pure vegetarian with a Jain line.',
    timeline: [
      { timeLabel: '10:00 AM', activity: 'Kitchen team arrives, begins prep for pooja lunch', responsibleParty: 'Kitchen Team' },
      { timeLabel: '12:30 PM', activity: 'Lunch service begins after pooja concludes', responsibleParty: 'Service Staff' },
    ],
    keyContacts: [
      { name: 'Suresh Nair', role: 'Client (Host)', phone: '+91 98450 12308', email: 'suresh.nair@example.com' },
      { name: 'Ravi Shankar', role: 'Operations Lead', phone: '+91 99870 11203', email: 'ravi.shankar@example.com' },
    ],
    operationalNotes: 'Coordinate lunch start time with pooja schedule — confirm with family morning of the event.',
    risks: ['Pooja timing may run over — hold service start flexible by up to 30 minutes.'],
    checklist: [
      { text: 'Pooja schedule confirmed with family', done: true },
      { text: 'Jain preparation line briefed', done: true },
      { text: 'Residential kitchen access confirmed', done: false },
    ],
  },
  {
    quotationCode: 'QT-DEMO-09', templateName: 'VIP Dinner',
    opsOwner: 'Suresh Iyer', opsPhone: '+91 99870 11201', opsEmail: 'suresh.iyer@example.com',
    operationalSummary: 'Intimate, high-profile leadership dinner for 30 guests. Discretion and premium plating are the priority.',
    timeline: [
      { timeLabel: '6:00 PM', activity: 'Kitchen and service team arrive, security clearance check-in', responsibleParty: 'Operations Lead' },
      { timeLabel: '7:30 PM', activity: 'Welcome drinks served', responsibleParty: 'Service Staff' },
      { timeLabel: '8:00 PM', activity: 'Individually plated dinner service begins', responsibleParty: 'Service Staff' },
    ],
    keyContacts: [
      { name: 'Kavita Rao', role: 'Client (Executive Assistant)', phone: '+91 98450 12309', email: 'kavita.rao@example.com' },
      { name: 'Suresh Iyer', role: 'Operations Lead', phone: '+91 99870 11201', email: 'suresh.iyer@example.com' },
    ],
    operationalNotes: 'Coordinate staff security clearance with client security team well in advance of the event date.',
    risks: ['Security clearance delays could affect setup time — confirm staff list submission deadline with client.'],
    checklist: [
      { text: 'Staff list submitted for security clearance', done: true },
      { text: 'Menu finalised and confirmed with client', done: true },
      { text: 'Premium service staffing confirmed', done: false },
    ],
  },
  {
    quotationCode: 'QT-DEMO-10', templateName: 'Cocktail Reception',
    opsOwner: 'Ravi Shankar', opsPhone: '+91 99870 11203', opsEmail: 'ravi.shankar@example.com',
    operationalSummary: 'High-energy product launch cocktail reception for 180 guests, with press and media attendance.',
    timeline: [
      { timeLabel: '4:00 PM', activity: 'Setup and live counter arrangement', responsibleParty: 'Setup Crew' },
      { timeLabel: '6:00 PM', activity: 'Cocktail reception and passed starters begin', responsibleParty: 'Service Staff' },
      { timeLabel: '7:00 PM', activity: 'Pause passed-starter service during keynote', responsibleParty: 'Operations Lead' },
      { timeLabel: '7:30 PM', activity: 'Live counters open post-keynote', responsibleParty: 'Service Staff' },
    ],
    keyContacts: [
      { name: 'Arjun Mehra', role: 'Client (Marketing Head)', phone: '+91 98450 12310', email: 'arjun.mehra@example.com' },
      { name: 'Ravi Shankar', role: 'Operations Lead', phone: '+91 99870 11203', email: 'ravi.shankar@example.com' },
    ],
    operationalNotes: 'Confirm keynote timing with client 3 days prior to plan service pause accordingly.',
    risks: ['Media table requires discreet, unobtrusive service — brief staff accordingly.'],
    checklist: [
      { text: 'Keynote timing confirmed with client', done: false },
      { text: 'Media table service briefed', done: false },
      { text: 'Live counter staffing confirmed', done: true },
    ],
  },
];

async function applyTemplateToEvent(pool: any, tenantId: string, adminId: string, eventId: string, templateName: string) {
  const tmplRes = await pool.query(
    `SELECT id FROM cat_menu_templates WHERE tenant_id = $1 AND template_name = $2 AND is_deleted = false`,
    [tenantId, templateName],
  );
  if (tmplRes.rows.length === 0) {
    console.warn(`  Menu Template "${templateName}" not found — skipping menu application. Run seed-demo-menu-templates.ts first.`);
    return;
  }
  const templateId = tmplRes.rows[0].id;

  const meals = await pool.query(
    `SELECT id, meal_name, display_order FROM cat_menu_template_meals WHERE template_id = $1 ORDER BY display_order`,
    [templateId],
  );
  const categories = await pool.query(
    `SELECT id, meal_id, category_name, display_order FROM cat_menu_template_categories WHERE template_id = $1 ORDER BY display_order`,
    [templateId],
  );
  const items = await pool.query(
    `SELECT category_id, item_name, quantity, unit, remarks, display_order FROM cat_menu_template_items WHERE template_id = $1 ORDER BY display_order`,
    [templateId],
  );
  const dietary = await pool.query(
    `SELECT requirement, guest_count, notes, display_order FROM cat_menu_template_dietary_requirements WHERE template_id = $1 ORDER BY display_order`,
    [templateId],
  );
  const settings = await pool.query(`SELECT service_instructions FROM cat_menu_template_settings WHERE template_id = $1`, [templateId]);

  // Full replace of the Event's menu — a deep copy with brand-new ids, matching EM-WP04's Apply Template semantics.
  await pool.query(`DELETE FROM cat_event_meals WHERE event_id = $1`, [eventId]);
  await pool.query(`DELETE FROM cat_event_dietary_requirements WHERE event_id = $1`, [eventId]);

  const mealIdMap = new Map<string, string>();
  for (const meal of meals.rows) {
    const res = await pool.query(
      `INSERT INTO cat_event_meals (id, tenant_id, event_id, meal_name, display_order, created_at, created_by, updated_at, updated_by)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), $5, NOW(), $5) RETURNING id`,
      [tenantId, eventId, meal.meal_name, meal.display_order, adminId],
    );
    mealIdMap.set(meal.id, res.rows[0].id);
  }

  const categoryIdMap = new Map<string, string>();
  for (const cat of categories.rows) {
    const newMealId = mealIdMap.get(cat.meal_id);
    if (!newMealId) continue;
    const res = await pool.query(
      `INSERT INTO cat_event_menu_categories (id, tenant_id, event_id, meal_id, category_name, display_order, created_at, created_by, updated_at, updated_by)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), $6, NOW(), $6) RETURNING id`,
      [tenantId, eventId, newMealId, cat.category_name, cat.display_order, adminId],
    );
    categoryIdMap.set(cat.id, res.rows[0].id);
  }

  for (const item of items.rows) {
    const newCategoryId = categoryIdMap.get(item.category_id);
    if (!newCategoryId) continue;
    await pool.query(
      `INSERT INTO cat_event_menu_items (id, tenant_id, event_id, category_id, item_name, quantity, unit, remarks, display_order, created_at, created_by, updated_at, updated_by)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, NOW(), $9)`,
      [tenantId, eventId, newCategoryId, item.item_name, item.quantity, item.unit, item.remarks, item.display_order, adminId],
    );
  }

  for (const d of dietary.rows) {
    await pool.query(
      `INSERT INTO cat_event_dietary_requirements (id, tenant_id, event_id, requirement, guest_count, notes, display_order, created_at, created_by, updated_at, updated_by)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), $7, NOW(), $7)`,
      [tenantId, eventId, d.requirement, d.guest_count, d.notes, d.display_order, adminId],
    );
  }

  await pool.query(
    `INSERT INTO cat_event_menu_settings (id, tenant_id, event_id, service_instructions, created_at, created_by, updated_at, updated_by)
     VALUES (gen_random_uuid(), $1, $2, $3, NOW(), $4, NOW(), $4)
     ON CONFLICT (event_id) DO UPDATE SET service_instructions = EXCLUDED.service_instructions, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
    [tenantId, eventId, settings.rows[0]?.service_instructions || null, adminId],
  );
}

async function seedPlanning(pool: any, tenantId: string, adminId: string, eventId: string, spec: EventSpec) {
  await pool.query(`DELETE FROM cat_event_timeline_items WHERE event_id = $1`, [eventId]);
  await pool.query(`DELETE FROM cat_event_key_contacts WHERE event_id = $1`, [eventId]);
  await pool.query(`DELETE FROM cat_event_risks WHERE event_id = $1`, [eventId]);
  await pool.query(`DELETE FROM cat_event_planning_checklist_items WHERE event_id = $1`, [eventId]);

  await pool.query(
    `INSERT INTO cat_event_planning (id, tenant_id, event_id, operations_owner, operations_contact_phone, operations_contact_email, operational_summary, operational_notes, created_at, created_by, updated_at, updated_by)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), $8, NOW(), $8)
     ON CONFLICT (event_id) DO UPDATE SET
       operations_owner = EXCLUDED.operations_owner, operations_contact_phone = EXCLUDED.operations_contact_phone,
       operations_contact_email = EXCLUDED.operations_contact_email, operational_summary = EXCLUDED.operational_summary,
       operational_notes = EXCLUDED.operational_notes, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
    [tenantId, eventId, spec.opsOwner, spec.opsPhone, spec.opsEmail, spec.operationalSummary, spec.operationalNotes, adminId],
  );

  for (let idx = 0; idx < spec.timeline.length; idx++) {
    const t = spec.timeline[idx];
    await pool.query(
      `INSERT INTO cat_event_timeline_items (id, tenant_id, event_id, time_label, activity, responsible_party, notes, display_order, created_at, created_by, updated_at, updated_by)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), $8, NOW(), $8)`,
      [tenantId, eventId, t.timeLabel, t.activity, t.responsibleParty, t.notes || null, idx, adminId],
    );
  }
  for (let idx = 0; idx < spec.keyContacts.length; idx++) {
    const c = spec.keyContacts[idx];
    await pool.query(
      `INSERT INTO cat_event_key_contacts (id, tenant_id, event_id, contact_name, role, phone, email, notes, display_order, created_at, created_by, updated_at, updated_by)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, NOW(), $9)`,
      [tenantId, eventId, c.name, c.role, c.phone, c.email, c.notes || null, idx, adminId],
    );
  }
  for (let idx = 0; idx < spec.risks.length; idx++) {
    await pool.query(
      `INSERT INTO cat_event_risks (id, tenant_id, event_id, statement, display_order, created_at, created_by, updated_at, updated_by)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), $5, NOW(), $5)`,
      [tenantId, eventId, spec.risks[idx], idx, adminId],
    );
  }
  for (let idx = 0; idx < spec.checklist.length; idx++) {
    const c = spec.checklist[idx];
    await pool.query(
      `INSERT INTO cat_event_planning_checklist_items (id, tenant_id, event_id, item_text, is_complete, display_order, created_at, created_by, updated_at, updated_by)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), $6, NOW(), $6)`,
      [tenantId, eventId, c.text, c.done, idx, adminId],
    );
  }
}

async function main() {
  const pool = getPool();
  const { tenantId, adminId } = await getAdminAndTenant(pool);

  let converted = 0;
  let reused = 0;
  let skipped = 0;

  for (const spec of EVENTS) {
    const qRes = await pool.query(
      `SELECT id, title, converted_event_id FROM cat_quotations WHERE tenant_id = $1 AND quotation_number = $2`,
      [tenantId, spec.quotationCode],
    );
    if (qRes.rows.length === 0) {
      console.warn(`Skipping ${spec.quotationCode} — Quotation not found. Run seed-demo-quotations.ts first.`);
      skipped++;
      continue;
    }
    const quotation = qRes.rows[0];

    let eventId: string;

    if (quotation.converted_event_id) {
      eventId = quotation.converted_event_id;
      reused++;
    } else {
      const pubRes = await pool.query(
        `SELECT revision_number, snapshot_json FROM cat_quotation_publications WHERE quotation_id = $1 ORDER BY revision_number DESC LIMIT 1`,
        [quotation.id],
      );
      if (pubRes.rows.length === 0) {
        console.warn(`Skipping ${spec.quotationCode} — no published revision found.`);
        skipped++;
        continue;
      }
      const pub = pubRes.rows[0];
      const grandTotal = pub.snapshot_json?.pricingSummary?.grandTotal ?? null;
      const currencyCode = pub.snapshot_json?.commercialTerms?.currencyCode ?? 'INR';

      const inqRes = await pool.query(
        `SELECT i.relationship_id, i.event_type, i.tentative_event_date, i.venue, i.expected_guest_count
         FROM cat_quotations q JOIN cat_inquiries i ON i.id = q.inquiry_id WHERE q.id = $1`,
        [quotation.id],
      );
      const inquiry = inqRes.rows[0];

      const currentYear = new Date().getFullYear();
      const countRes = await pool.query(`SELECT COUNT(*)::int as count FROM cat_events WHERE tenant_id = $1`, [tenantId]);
      const seqNumber = (countRes.rows[0]?.count || 0) + 1;
      const eventNumber = `EVT-${currentYear}-${String(seqNumber).padStart(6, '0')}`;

      const eventRes = await pool.query(
        `INSERT INTO cat_events (
           id, tenant_id, event_number, relationship_id, origin_quotation_id, origin_quotation_revision,
           event_name, event_type, event_date, venue, guest_count, grand_total, currency_code, status,
           created_at, created_by, updated_at, updated_by
         ) VALUES (
           gen_random_uuid(), $1, $2, $3, $4, $5,
           $6, $7, $8, $9, $10, $11, $12, 'PLANNING',
           NOW(), $13, NOW(), $13
         ) RETURNING id`,
        [tenantId, eventNumber, inquiry.relationship_id, quotation.id, pub.revision_number,
         quotation.title, inquiry.event_type, inquiry.tentative_event_date, inquiry.venue, inquiry.expected_guest_count,
         grandTotal, currencyCode, adminId],
      );
      eventId = eventRes.rows[0].id;

      await pool.query(
        `UPDATE cat_quotations SET converted_event_id = $1, converted_at = NOW(), converted_by = $2, updated_at = NOW(), updated_by = $2 WHERE id = $3`,
        [eventId, adminId, quotation.id],
      );

      converted++;
    }

    await seedPlanning(pool, tenantId, adminId, eventId, spec);
    await applyTemplateToEvent(pool, tenantId, adminId, eventId, spec.templateName);
  }

  console.log(`Events: ${converted} newly converted, ${reused} already converted (reused), ${skipped} skipped (of ${EVENTS.length} defined). Planning and Menu applied for all.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
