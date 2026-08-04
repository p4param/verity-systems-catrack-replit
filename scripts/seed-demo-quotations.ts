import { getPool, getAdminAndTenant } from "./lib/demo-db";

// Official Demo Dataset — Quotations.
// One full Quotation lifecycle per demo Inquiry: proposal content ->
// commercial pricing -> commercial terms -> Publish (creates the
// immutable snapshot + advances to Revision 1) -> Delivery -> Customer
// Decision (Accepted) -> ready for Conversion. Idempotent: upserts the
// Quotation on a stable quotation_number (QT-DEMO-01..10); Publication /
// Delivery / Decision are re-derived from current content on every run
// (delete-then-reinsert for that Quotation), so re-running always leaves
// a single, internally consistent lifecycle.
//
// GST at 18% on (charges - discounts + adjustments), matching
// GST_RATE_PERCENT in src/modules/cat/quotation/domain/proposal-pricing-types.ts.

const GST_RATE_PERCENT = 18;

const STANDARD_TERMS = `1. This proposal is valid for 30 days from the date of publication unless otherwise stated.
2. Final guest count must be confirmed no later than 7 days prior to the event date; billing is based on the higher of the confirmed or actual count.
3. Menu items are subject to seasonal ingredient availability and may be substituted with prior client approval.
4. All prices are inclusive of applicable staff service but exclusive of venue rental unless explicitly stated.
5. Cancellations within 15 days of the event date are subject to a cancellation charge as per the advance payment terms.
6. Any additional services requested on the event day will be billed separately and confirmed via written approval.`;

interface ScopeBlock { title: string; description: string; notes?: string }
interface Highlight { title: string; description: string; notes?: string }
interface Charge { description: string; amount: number }

interface QuotationSpec {
  code: string;
  inquiryCode: string;
  title: string;
  proposalObjective: string;
  executiveNotes: string;
  scopeBlocks: ScopeBlock[];
  proposalNarrative: string;
  internalAuthorNotes: string;
  highlights: Highlight[];
  assumptions: string[];
  exclusions: string[];
  charges: Charge[];
  discounts: Charge[];
  adjustments: Charge[];
  paymentMethod: 'BANK_TRANSFER' | 'CHEQUE' | 'CASH' | 'ONLINE';
  advanceRequired: boolean;
  advanceType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  advanceValue: number;
  balancePayment: string;
  commercialNotes: string;
  contactName: string;
  contactEmail: string;
}

const QUOTATIONS: QuotationSpec[] = [
  {
    code: 'QT-DEMO-01', inquiryCode: 'INQ-DEMO-01', title: 'Wedding Proposal — Rahul & Priya',
    proposalObjective: 'Deliver a memorable North Indian wedding celebration for 400 guests at The Grand Pavilion, New Delhi, blending traditional flavours with a premium live-counter experience.',
    executiveNotes: 'Couple has requested a strong vegetarian and non-vegetarian balance with at least two live counters. Family has worked with us before for a smaller family function.',
    scopeBlocks: [
      { title: 'Wedding Reception Catering', description: 'Full-service catering for 400 guests including welcome drinks, starters, main course buffet, and dessert counters.', notes: 'Two serving lines required for smooth guest flow.' },
      { title: 'Live Counter Experience', description: 'Chaat and Pasta live counters staffed throughout the reception.' },
      { title: 'On-Site Service Staff', description: 'Uniformed service and buffet staff for the full duration of the event.' },
    ],
    proposalNarrative: 'We are delighted to present a wedding menu that honours North Indian culinary traditions while offering guests an interactive, memorable dining experience through our live counters. Our team will manage the full catering operation from welcome drinks through to the dessert service, ensuring a seamless flow across both vegetarian and non-vegetarian offerings.',
    internalAuthorNotes: 'Confirm final headcount with family 10 days prior — historically this family increases guest count close to the date.',
    highlights: [
      { title: 'Signature Live Counters', description: 'Guests enjoy freshly prepared chaat and pasta stations throughout the evening.' },
      { title: 'Dedicated Jain & Vegan Lines', description: 'Separate preparation area for guests with special dietary needs.' },
    ],
    assumptions: ['Venue kitchen and power supply will be made available to the catering team by 12:00 PM on the event day.', 'Final guest count will be confirmed 10 days prior to the event.'],
    exclusions: ['Venue rental, decor, and floral arrangements are not included in this proposal.', 'Alcohol and bar service are not included.'],
    charges: [
      { description: 'Catering Service — 400 guests @ ₹9,000/guest', amount: 3600000 },
      { description: 'Decor for Catering Stations', amount: 400000 },
      { description: 'Live Counter Setup (Chaat & Pasta)', amount: 200000 },
    ],
    discounts: [{ description: 'Early Booking Discount', amount: 100000 }],
    adjustments: [],
    paymentMethod: 'BANK_TRANSFER', advanceRequired: true, advanceType: 'PERCENTAGE', advanceValue: 40,
    balancePayment: 'Balance due 7 days prior to the event date.',
    commercialNotes: 'Rates locked for bookings confirmed before 30 September 2026.',
    contactName: 'Rahul Verma', contactEmail: 'rahul.verma@example.com',
  },
  {
    code: 'QT-DEMO-02', inquiryCode: 'INQ-DEMO-02', title: "Birthday Proposal — Aarav's 7th Celebration",
    proposalObjective: 'Provide a fun, kid-friendly vegetarian catering experience for Aarav\'s 7th birthday celebration for 60 guests.',
    executiveNotes: 'Family requested milder spice levels and an ice cream counter for the children.',
    scopeBlocks: [
      { title: 'Birthday Party Catering', description: 'Vegetarian snacks, main course, and dessert service for 60 guests.' },
      { title: 'Kids Dessert Counter', description: 'Ice cream and chocolate brownie counter for the children.' },
    ],
    proposalNarrative: 'A relaxed, family-friendly menu designed around familiar favourites, with milder spicing suited to a younger guest list and a fun dessert counter to mark the occasion.',
    internalAuthorNotes: 'Coordinate cake-cutting timing with the family in advance; hold ice cream counter until after cake service.',
    highlights: [{ title: 'Kid-Friendly Menu', description: 'Mild spice levels across all preparations, suitable for children.' }],
    assumptions: ['Venue has basic kitchen access for on-site finishing.'],
    exclusions: ['Birthday cake is not included — family to arrange separately.', 'Entertainment and decor are not included.'],
    charges: [
      { description: 'Catering Service — 60 guests @ ₹2,500/guest', amount: 150000 },
      { description: 'Decor for Catering Stations', amount: 40000 },
      { description: 'Dessert Counter Setup', amount: 15000 },
    ],
    discounts: [], adjustments: [],
    paymentMethod: 'ONLINE', advanceRequired: true, advanceType: 'PERCENTAGE', advanceValue: 50,
    balancePayment: 'Balance due on the day of the event.',
    commercialNotes: 'Package priced for a 3-hour service window.',
    contactName: 'Rohan Mehta', contactEmail: 'rohan.mehta@example.com',
  },
  {
    code: 'QT-DEMO-03', inquiryCode: 'INQ-DEMO-03', title: 'Corporate Catering Proposal — ABC Technologies Annual Meet',
    proposalObjective: 'Deliver an efficient, professional plated lunch and dinner service for ABC Technologies\' 150-guest annual meet.',
    executiveNotes: 'Corporate client, repeat business expected annually. Emphasis on punctual service given tight conference schedule.',
    scopeBlocks: [
      { title: 'Conference Catering', description: 'Plated lunch and light dinner service for 150 delegates.' },
      { title: 'Tea & Coffee Stations', description: 'Continuous tea and coffee service through the day.' },
    ],
    proposalNarrative: 'Our conference catering service is built around punctuality and consistency, ensuring your delegates are served efficiently within the constraints of a structured agenda, without compromising on quality.',
    internalAuthorNotes: 'Confirm AV team schedule with venue to avoid overlap with catering service windows.',
    highlights: [{ title: 'On-Time Service Guarantee', description: 'Structured service timeline aligned to the conference agenda.' }],
    assumptions: ['Venue will provide catering staff access 2 hours prior to the first session.'],
    exclusions: ['AV equipment and stage setup are not included.', 'Branded collateral and signage are not included.'],
    charges: [
      { description: 'Conference Catering — 150 guests @ ₹3,500/guest', amount: 525000 },
      { description: 'Venue Catering Setup', amount: 150000 },
      { description: 'Tea & Coffee Station (Full Day)', amount: 100000 },
    ],
    discounts: [{ description: 'Corporate Loyalty Discount', amount: 25000 }],
    adjustments: [],
    paymentMethod: 'BANK_TRANSFER', advanceRequired: true, advanceType: 'PERCENTAGE', advanceValue: 30,
    balancePayment: 'Balance due within 15 days of invoice, per corporate account terms.',
    commercialNotes: 'Invoiced to ABC Technologies Pvt Ltd corporate account.',
    contactName: 'Neha Kapoor', contactEmail: 'neha.kapoor@example.com',
  },
  {
    code: 'QT-DEMO-04', inquiryCode: 'INQ-DEMO-04', title: 'Luxury Wedding Proposal — Anjali & Karan',
    proposalObjective: 'Curate a premium, plated destination wedding experience for 500 guests at Lakeside Resort & Spa, Udaipur, with elevated live-counter accents.',
    executiveNotes: 'High-profile destination wedding. Family expects premium presentation, dedicated banquet manager, and tasting session prior to confirmation.',
    scopeBlocks: [
      { title: 'Destination Wedding Catering', description: 'Premium plated and buffet-hybrid catering for 500 guests across the reception.', notes: 'Includes a dedicated on-site banquet manager.' },
      { title: 'Premium Live Counters', description: 'Tikka and dessert sundae live counters staffed by senior chefs.' },
      { title: 'Menu Tasting Session', description: 'Pre-event tasting session for the family to finalise the menu.' },
    ],
    proposalNarrative: 'This proposal reflects a premium culinary experience befitting a destination celebration — combining elevated plated service with interactive live counters, executed by our senior banquet team on location in Udaipur.',
    internalAuthorNotes: 'Logistics team to confirm transport and cold-chain plan for ingredients given the destination location.',
    highlights: [
      { title: 'Dedicated Banquet Manager', description: 'A senior banquet manager will be on-site for the full duration of the event.' },
      { title: 'Premium Nut & Saffron Garnishing', description: 'Signature premium garnishing across key dishes for a luxury presentation.' },
    ],
    assumptions: ['Resort will provide kitchen access and cold storage 48 hours prior to the event.', 'Final guest count confirmed 14 days prior given the destination logistics.'],
    exclusions: ['Guest transportation and accommodation are not included.', 'Decor, florals, and stage design are not included.'],
    charges: [
      { description: 'Destination Wedding Catering — 500 guests @ ₹12,000/guest', amount: 6000000 },
      { description: 'Decor & Florals for Catering Stations', amount: 1000000 },
      { description: 'Premium Live Counters & Bar Support', amount: 600000 },
      { description: 'Destination Logistics Surcharge', amount: 500000 },
    ],
    discounts: [{ description: 'Repeat Client Loyalty Discount', amount: 200000 }],
    adjustments: [],
    paymentMethod: 'BANK_TRANSFER', advanceRequired: true, advanceType: 'PERCENTAGE', advanceValue: 50,
    balancePayment: 'Balance due 14 days prior to the event date given destination logistics.',
    commercialNotes: 'Rates include destination logistics for Udaipur; subject to revision if venue changes.',
    contactName: 'Karan Kapoor', contactEmail: 'karan.kapoor@example.com',
  },
  {
    code: 'QT-DEMO-05', inquiryCode: 'INQ-DEMO-05', title: 'Reception Proposal — Sharma Family',
    proposalObjective: 'Deliver a warm, generous reception buffet for 250 guests celebrating the Sharma family milestone.',
    executiveNotes: 'Family requested a balance of North Indian classics with a live chaat counter.',
    scopeBlocks: [
      { title: 'Reception Buffet Catering', description: 'Full buffet service for 250 guests across welcome, main course, and dessert.' },
      { title: 'Live Chaat Counter', description: 'Live chaat counter staffed for the duration of the reception.' },
    ],
    proposalNarrative: 'A generous, crowd-pleasing reception menu anchored in North Indian classics, rounded out with an interactive chaat counter to keep guests engaged throughout the evening.',
    internalAuthorNotes: 'Family has a preference for extra bread variety — confirm final bread selection during proposal review.',
    highlights: [{ title: 'Interactive Chaat Counter', description: 'A guest favourite, staffed throughout the reception.' }],
    assumptions: ['Venue will provide power backup for live counter equipment.'],
    exclusions: ['Decor and floral arrangements are not included.', 'Photography and videography are not included.'],
    charges: [
      { description: 'Reception Buffet Catering — 250 guests @ ₹5,000/guest', amount: 1250000 },
      { description: 'Decor for Catering Stations', amount: 200000 },
      { description: 'Live Chaat Counter Setup', amount: 100000 },
    ],
    discounts: [{ description: 'Off-Peak Season Discount', amount: 50000 }],
    adjustments: [],
    paymentMethod: 'CHEQUE', advanceRequired: true, advanceType: 'PERCENTAGE', advanceValue: 40,
    balancePayment: 'Balance due 7 days prior to the event date.',
    commercialNotes: 'Rates valid for the confirmed date only; subject to revision if rescheduled.',
    contactName: 'Vikram Sharma', contactEmail: 'vikram.sharma@example.com',
  },
  {
    code: 'QT-DEMO-06', inquiryCode: 'INQ-DEMO-06', title: 'Awards Night Proposal — Global Finance Corp',
    proposalObjective: 'Deliver an elevated cocktail-and-plated dinner experience for Global Finance Corp\'s 200-guest awards night.',
    executiveNotes: 'High-visibility corporate event with media presence; presentation quality is critical.',
    scopeBlocks: [
      { title: 'Awards Night Catering', description: 'Cocktail hour followed by plated dinner service for 200 guests.' },
      { title: 'Stage-Side Service Coordination', description: 'Service staff coordinated around the awards programme schedule.' },
    ],
    proposalNarrative: 'A polished cocktail-and-plated experience designed to complement the formality of an awards evening, with service staff briefed to work around the programme schedule without disrupting proceedings.',
    internalAuthorNotes: 'Coordinate service pauses with the event emcee schedule — confirm run-of-show 1 week prior.',
    highlights: [{ title: 'Programme-Synced Service', description: 'Service timed to pause during award announcements.' }],
    assumptions: ['Final run-of-show will be shared with the catering team at least 1 week prior to the event.'],
    exclusions: ['Stage, AV, and lighting are not included.', 'Alcohol procurement is not included; bar staffing only.'],
    charges: [
      { description: 'Awards Night Catering — 200 guests @ ₹7,000/guest', amount: 1400000 },
      { description: 'Stage-Side Catering Setup', amount: 400000 },
      { description: 'Bar Service Staffing', amount: 250000 },
    ],
    discounts: [], adjustments: [],
    paymentMethod: 'BANK_TRANSFER', advanceRequired: true, advanceType: 'PERCENTAGE', advanceValue: 30,
    balancePayment: 'Balance due within 15 days of invoice, per corporate account terms.',
    commercialNotes: 'Invoiced to Global Finance Corp corporate account.',
    contactName: 'Ritu Desai', contactEmail: 'ritu.desai@example.com',
  },
  {
    code: 'QT-DEMO-07', inquiryCode: 'INQ-DEMO-07', title: 'Diwali Celebration Proposal — Gupta Family',
    proposalObjective: 'Deliver a festive, fully vegetarian Diwali celebration menu for 100 guests at the Gupta family residence.',
    executiveNotes: 'Fully vegetarian event with an emphasis on traditional festive sweets.',
    scopeBlocks: [
      { title: 'Festival Buffet Catering', description: 'Vegetarian buffet catering for 100 guests, festival-themed menu.' },
      { title: 'Sweets & Chaat Counter', description: 'Live chaat counter and traditional sweets service.' },
    ],
    proposalNarrative: 'A festive vegetarian menu rooted in tradition, anchored by a generous sweets spread and an interactive chaat counter to bring guests together for the Diwali celebration.',
    internalAuthorNotes: 'Confirm lawn/outdoor power access for live counter equipment given the residential venue.',
    highlights: [{ title: 'Traditional Sweets Spread', description: 'A generous, freshly prepared festive sweets counter.' }],
    assumptions: ['Residential venue will provide adequate outdoor power access for live counters.'],
    exclusions: ['Diyas, lighting, and festive decor are not included.'],
    charges: [
      { description: 'Festival Buffet Catering — 100 guests @ ₹4,000/guest', amount: 400000 },
      { description: 'Decor & Lighting for Catering Stations', amount: 80000 },
    ],
    discounts: [], adjustments: [],
    paymentMethod: 'CASH', advanceRequired: true, advanceType: 'PERCENTAGE', advanceValue: 50,
    balancePayment: 'Balance due on the day of the event.',
    commercialNotes: 'Residential venue — confirm access logistics 3 days prior.',
    contactName: 'Anil Gupta', contactEmail: 'anil.gupta@example.com',
  },
  {
    code: 'QT-DEMO-08', inquiryCode: 'INQ-DEMO-08', title: 'House Warming Proposal — Nair Residence',
    proposalObjective: 'Provide a traditional pure vegetarian house warming lunch for 80 guests at the Nair residence, Kochi.',
    executiveNotes: 'Traditional Griha Pravesh ceremony; pure vegetarian with Jain options for select guests.',
    scopeBlocks: [
      { title: 'House Warming Lunch Catering', description: 'Pure vegetarian lunch service for 80 guests.' },
    ],
    proposalNarrative: 'A traditional, pure vegetarian lunch menu suited to the Griha Pravesh occasion, with a dedicated Jain preparation line for guests with that requirement.',
    internalAuthorNotes: 'Confirm pooja timing with the family to schedule lunch service accordingly.',
    highlights: [{ title: 'Dedicated Jain Line', description: 'Separate preparation for Jain dietary requirements.' }],
    assumptions: ['Residential kitchen access will be available from the morning of the event.'],
    exclusions: ['Pooja arrangements and priest fees are not included.'],
    charges: [
      { description: 'House Warming Lunch Catering — 80 guests @ ₹3,000/guest', amount: 240000 },
      { description: 'Pooja Prasad Arrangement', amount: 20000 },
    ],
    discounts: [], adjustments: [],
    paymentMethod: 'ONLINE', advanceRequired: true, advanceType: 'PERCENTAGE', advanceValue: 50,
    balancePayment: 'Balance due on the day of the event.',
    commercialNotes: 'Residential venue in Kochi — local team to be assigned.',
    contactName: 'Suresh Nair', contactEmail: 'suresh.nair@example.com',
  },
  {
    code: 'QT-DEMO-09', inquiryCode: 'INQ-DEMO-09', title: 'VIP Leadership Dinner Proposal — Meridian Capital Advisors',
    proposalObjective: 'Deliver an intimate, premium plated dinner for 30 senior leadership guests hosted by Meridian Capital Advisors.',
    executiveNotes: 'High-profile, low-headcount event requiring premium plating and discretion. Security coordination required.',
    scopeBlocks: [
      { title: 'VIP Plated Dinner Service', description: 'Fully plated multi-course dinner service for 30 guests.' },
    ],
    proposalNarrative: 'An intimate, individually plated dinner experience designed for a discerning leadership audience, with premium ingredients and precise, discreet service.',
    internalAuthorNotes: 'Coordinate with client security team on staff access and timing prior to the event.',
    highlights: [{ title: 'Individually Plated Courses', description: 'Each course plated and served individually for a premium dining experience.' }],
    assumptions: ['Client will coordinate security clearance for catering staff in advance.'],
    exclusions: ['Wine and premium bar selections are not included.'],
    charges: [
      { description: 'VIP Plated Dinner — 30 guests @ ₹15,000/guest', amount: 450000 },
      { description: 'Premium Service Staffing', amount: 150000 },
    ],
    discounts: [], adjustments: [],
    paymentMethod: 'BANK_TRANSFER', advanceRequired: true, advanceType: 'PERCENTAGE', advanceValue: 50,
    balancePayment: 'Balance due within 7 days of invoice.',
    commercialNotes: 'Invoiced to Meridian Capital Advisors corporate account.',
    contactName: 'Kavita Rao', contactEmail: 'kavita.rao@example.com',
  },
  {
    code: 'QT-DEMO-10', inquiryCode: 'INQ-DEMO-10', title: 'Product Launch Catering Proposal — TechNova Solutions',
    proposalObjective: 'Deliver a high-energy cocktail reception for 180 guests at the TechNova Solutions product launch.',
    executiveNotes: 'Brand-conscious client; presentation and pacing are key given media and press attendance.',
    scopeBlocks: [
      { title: 'Product Launch Cocktail Catering', description: 'Passed starters and live-counter cocktail reception for 180 guests.' },
      { title: 'Media Table Service', description: 'Dedicated light service for the press and media table.' },
    ],
    proposalNarrative: 'A high-energy cocktail reception menu built for a product launch audience — easy to eat while networking, with live counters to add a sense of occasion for press and guests alike.',
    internalAuthorNotes: 'Confirm launch reveal timing with the client to pause passed-starter service during the keynote.',
    highlights: [{ title: 'Live Wok & Momo Counters', description: 'High-visibility live counters positioned near the networking area.' }],
    assumptions: ['Venue will confirm keynote timing at least 3 days prior for service planning.'],
    exclusions: ['Stage, AV, and product display setup are not included.'],
    charges: [
      { description: 'Product Launch Cocktail Catering — 180 guests @ ₹5,500/guest', amount: 990000 },
      { description: 'Stage-Side Catering Setup', amount: 200000 },
      { description: 'Live Counter Staffing', amount: 100000 },
    ],
    discounts: [], adjustments: [],
    paymentMethod: 'BANK_TRANSFER', advanceRequired: true, advanceType: 'PERCENTAGE', advanceValue: 30,
    balancePayment: 'Balance due within 15 days of invoice, per corporate account terms.',
    commercialNotes: 'Invoiced to TechNova Solutions corporate account.',
    contactName: 'Arjun Mehra', contactEmail: 'arjun.mehra@example.com',
  },
];

function computePricing(charges: Charge[], discounts: Charge[], adjustments: Charge[]) {
  const chargesTotal = charges.reduce((s, c) => s + c.amount, 0);
  const discountTotal = discounts.reduce((s, c) => s + c.amount, 0);
  const adjustmentTotal = adjustments.reduce((s, c) => s + c.amount, 0);
  const subtotal = chargesTotal - discountTotal + adjustmentTotal;
  const gstAmount = Math.round(subtotal * (GST_RATE_PERCENT / 100));
  const grandTotal = subtotal + gstAmount;
  return { chargesTotal, discountTotal, adjustmentTotal, subtotal, gstAmount, grandTotal };
}

async function main() {
  const pool = getPool();
  const { tenantId, adminId } = await getAdminAndTenant(pool);

  let processed = 0;
  let skipped = 0;

  for (const q of QUOTATIONS) {
    const inqRes = await pool.query(`SELECT id FROM cat_inquiries WHERE tenant_id = $1 AND inquiry_number = $2`, [tenantId, q.inquiryCode]);
    if (inqRes.rows.length === 0) {
      console.warn(`Skipping "${q.title}" — Inquiry ${q.inquiryCode} not found. Run seed-demo-inquiries.ts first.`);
      skipped++;
      continue;
    }
    const inquiryId = inqRes.rows[0].id;

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    const existing = await pool.query(`SELECT id FROM cat_quotations WHERE tenant_id = $1 AND quotation_number = $2`, [tenantId, q.code]);

    const commonFields = {
      title: q.title,
      inquiry_id: inquiryId,
      proposal_objective: q.proposalObjective,
      executive_notes: q.executiveNotes,
      proposal_narrative: q.proposalNarrative,
      internal_author_notes: q.internalAuthorNotes,
      valid_until: validUntil.toISOString().slice(0, 10),
      validity_notes: 'Valid for 30 days from publication.',
      payment_method: q.paymentMethod,
      advance_required: q.advanceRequired,
      advance_type: q.advanceType,
      advance_value: q.advanceValue,
      balance_payment: q.balancePayment,
      commercial_notes: q.commercialNotes,
      terms_and_conditions: STANDARD_TERMS,
    };

    let quotationId: string;
    if (existing.rows.length > 0) {
      quotationId = existing.rows[0].id;
      await pool.query(
        `UPDATE cat_quotations SET
           title = $1, inquiry_id = $2, status = 'ACCEPTED',
           proposal_objective = $3, executive_notes = $4, proposal_narrative = $5, internal_author_notes = $6,
           executive_summary_status = 'READY', scope_of_services_status = 'READY', proposal_narrative_status = 'READY',
           proposal_highlights_status = 'READY', assumptions_exclusions_status = 'READY', commercial_pricing_status = 'READY',
           commercial_terms_status = 'READY',
           valid_until = $7::date, validity_notes = $8, payment_method = $9, advance_required = $10, advance_type = $11,
           advance_value = $12, balance_payment = $13, commercial_notes = $14, currency_code = 'INR',
           terms_and_conditions = $15, updated_at = NOW(), updated_by = $16
         WHERE id = $17`,
        [commonFields.title, commonFields.inquiry_id, commonFields.proposal_objective, commonFields.executive_notes,
         commonFields.proposal_narrative, commonFields.internal_author_notes, commonFields.valid_until, commonFields.validity_notes,
         commonFields.payment_method, commonFields.advance_required, commonFields.advance_type, commonFields.advance_value,
         commonFields.balance_payment, commonFields.commercial_notes, commonFields.terms_and_conditions, adminId, quotationId],
      );
    } else {
      const inserted = await pool.query(
        `INSERT INTO cat_quotations (
           id, tenant_id, quotation_number, inquiry_id, title, purpose, status,
           proposal_objective, executive_notes, executive_summary_status,
           scope_of_services_status, proposal_narrative, internal_author_notes, proposal_narrative_status,
           proposal_highlights_status, assumptions_exclusions_status, commercial_pricing_status,
           valid_until, validity_notes, payment_method, advance_required, advance_type, advance_value,
           balance_payment, commercial_notes, currency_code, commercial_terms_status, terms_and_conditions,
           created_at, created_by, updated_at, updated_by, is_deleted, version
         ) VALUES (
           gen_random_uuid(), $1, $2, $3, $4, 'STANDARD_PROPOSAL', 'ACCEPTED',
           $5, $6, 'READY',
           'READY', $7, $8, 'READY',
           'READY', 'READY', 'READY',
           $9::date, $10, $11, $12, $13, $14,
           $15, $16, 'INR', 'READY', $17,
           NOW(), $18, NOW(), $18, false, 1
         ) RETURNING id`,
        [tenantId, q.code, inquiryId, q.title,
         q.proposalObjective, q.executiveNotes, q.proposalNarrative, q.internalAuthorNotes,
         commonFields.valid_until, commonFields.validity_notes, q.paymentMethod, q.advanceRequired, q.advanceType, q.advanceValue,
         q.balancePayment, q.commercialNotes, STANDARD_TERMS, adminId],
      );
      quotationId = inserted.rows[0].id;
    }

    // Reconcile proposal content lists.
    await pool.query(`DELETE FROM cat_quotation_scope_service_blocks WHERE quotation_id = $1`, [quotationId]);
    await pool.query(`DELETE FROM cat_quotation_proposal_highlights WHERE quotation_id = $1`, [quotationId]);
    await pool.query(`DELETE FROM cat_quotation_proposal_assumptions WHERE quotation_id = $1`, [quotationId]);
    await pool.query(`DELETE FROM cat_quotation_proposal_exclusions WHERE quotation_id = $1`, [quotationId]);
    await pool.query(`DELETE FROM cat_quotation_proposal_charges WHERE quotation_id = $1`, [quotationId]);
    await pool.query(`DELETE FROM cat_quotation_proposal_discounts WHERE quotation_id = $1`, [quotationId]);
    await pool.query(`DELETE FROM cat_quotation_proposal_adjustments WHERE quotation_id = $1`, [quotationId]);

    for (let idx = 0; idx < q.scopeBlocks.length; idx++) {
      const b = q.scopeBlocks[idx];
      await pool.query(
        `INSERT INTO cat_quotation_scope_service_blocks (id, tenant_id, quotation_id, block_title, customer_description, internal_notes, display_order, created_at, created_by, updated_at, updated_by)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), $7, NOW(), $7)`,
        [tenantId, quotationId, b.title, b.description, b.notes || null, idx, adminId],
      );
    }
    for (let idx = 0; idx < q.highlights.length; idx++) {
      const h = q.highlights[idx];
      await pool.query(
        `INSERT INTO cat_quotation_proposal_highlights (id, tenant_id, quotation_id, highlight_title, highlight_description, internal_notes, display_order, created_at, created_by, updated_at, updated_by)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), $7, NOW(), $7)`,
        [tenantId, quotationId, h.title, h.description, h.notes || null, idx, adminId],
      );
    }
    for (let idx = 0; idx < q.assumptions.length; idx++) {
      await pool.query(
        `INSERT INTO cat_quotation_proposal_assumptions (id, tenant_id, quotation_id, statement, display_order, created_at, created_by, updated_at, updated_by)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), $5, NOW(), $5)`,
        [tenantId, quotationId, q.assumptions[idx], idx, adminId],
      );
    }
    for (let idx = 0; idx < q.exclusions.length; idx++) {
      await pool.query(
        `INSERT INTO cat_quotation_proposal_exclusions (id, tenant_id, quotation_id, statement, display_order, created_at, created_by, updated_at, updated_by)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), $5, NOW(), $5)`,
        [tenantId, quotationId, q.exclusions[idx], idx, adminId],
      );
    }
    for (let idx = 0; idx < q.charges.length; idx++) {
      const c = q.charges[idx];
      await pool.query(
        `INSERT INTO cat_quotation_proposal_charges (id, tenant_id, quotation_id, description, amount, display_order, created_at, created_by, updated_at, updated_by)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), $6, NOW(), $6)`,
        [tenantId, quotationId, c.description, c.amount, idx, adminId],
      );
    }
    for (let idx = 0; idx < q.discounts.length; idx++) {
      const d = q.discounts[idx];
      await pool.query(
        `INSERT INTO cat_quotation_proposal_discounts (id, tenant_id, quotation_id, description, amount, display_order, created_at, created_by, updated_at, updated_by)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), $6, NOW(), $6)`,
        [tenantId, quotationId, d.description, d.amount, idx, adminId],
      );
    }
    for (let idx = 0; idx < q.adjustments.length; idx++) {
      const a = q.adjustments[idx];
      await pool.query(
        `INSERT INTO cat_quotation_proposal_adjustments (id, tenant_id, quotation_id, description, amount, display_order, created_at, created_by, updated_at, updated_by)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), $6, NOW(), $6)`,
        [tenantId, quotationId, a.description, a.amount, idx, adminId],
      );
    }

    // Revisions/Publication are only created once. A published snapshot is
    // immutable by design — once an Event has been converted from it, the
    // DB enforces this with a RESTRICT foreign key
    // (cat_events -> cat_quotation_publications), so re-running this
    // script must never attempt to delete an existing publication.
    const existingPub = await pool.query(
      `SELECT revision_number FROM cat_quotation_publications WHERE quotation_id = $1 ORDER BY revision_number DESC LIMIT 1`,
      [quotationId],
    );

    let publishedRevisionNumber: number;
    if (existingPub.rows.length > 0) {
      publishedRevisionNumber = existingPub.rows[0].revision_number;
    } else {
      publishedRevisionNumber = 1;
      // Revision 0 (working draft), then simulate Publish -> Revision 1
      // (matching src/app/api/cat/quotations/[id]/publish/route.ts exactly).
      await pool.query(
        `INSERT INTO cat_quotation_revisions (id, tenant_id, quotation_id, revision_number, status, is_current, created_at, created_by)
         VALUES (gen_random_uuid(), $1, $2, 0, 'DRAFT', false, NOW(), $3)`,
        [tenantId, quotationId, adminId],
      );
      await pool.query(
        `INSERT INTO cat_quotation_revisions (id, tenant_id, quotation_id, revision_number, status, is_current, created_at, created_by)
         VALUES (gen_random_uuid(), $1, $2, 1, 'DRAFT', true, NOW(), $3)`,
        [tenantId, quotationId, adminId],
      );

      const pricing = computePricing(q.charges, q.discounts, q.adjustments);
      const snapshot = {
        proposalContent: {
          executiveSummary: { proposalObjective: q.proposalObjective, executiveNotes: q.executiveNotes },
          scopeOfServices: q.scopeBlocks.map((b) => ({ blockTitle: b.title, customerDescription: b.description, internalNotes: b.notes })),
          proposalNarrative: { proposalNarrative: q.proposalNarrative, internalAuthorNotes: q.internalAuthorNotes },
          proposalHighlights: q.highlights.map((h) => ({ highlightTitle: h.title, highlightDescription: h.description, internalNotes: h.notes })),
          assumptionsExclusions: { assumptions: q.assumptions.map((s) => ({ statement: s })), exclusions: q.exclusions.map((s) => ({ statement: s })) },
        },
        commercialPricing: { charges: q.charges, discounts: q.discounts, adjustments: q.adjustments },
        commercialTerms: {
          validUntil: commonFields.valid_until,
          validityNotes: commonFields.validity_notes,
          paymentMethod: q.paymentMethod,
          advanceRequired: q.advanceRequired,
          advanceType: q.advanceType,
          advanceValue: q.advanceValue,
          balancePayment: q.balancePayment,
          commercialNotes: q.commercialNotes,
          currencyCode: 'INR',
        },
        termsAndConditions: STANDARD_TERMS,
        pricingSummary: pricing,
      };

      await pool.query(
        `INSERT INTO cat_quotation_publications (id, tenant_id, quotation_id, revision_number, status, snapshot_json, published_at, published_by)
         VALUES (gen_random_uuid(), $1, $2, $3, 'PUBLISHED', $4::jsonb, NOW(), $5)`,
        [tenantId, quotationId, publishedRevisionNumber, JSON.stringify(snapshot), adminId],
      );
    }

    // Delivery and Decision carry no such restriction — safe to reconcile freely.
    await pool.query(`DELETE FROM cat_quotation_proposal_decisions WHERE quotation_id = $1`, [quotationId]);
    await pool.query(`DELETE FROM cat_quotation_proposal_deliveries WHERE quotation_id = $1`, [quotationId]);

    const deliveredAt = new Date();
    await pool.query(
      `INSERT INTO cat_quotation_proposal_deliveries (id, tenant_id, quotation_id, revision_number, channel, status, recipient_name, recipient_email, subject, message, delivered_at, delivered_by)
       VALUES (gen_random_uuid(), $1, $2, $3, 'EMAIL', 'SENT', $4, $5, $6, $7, $8, $9)`,
      [tenantId, quotationId, publishedRevisionNumber, q.contactName, q.contactEmail, `Your Proposal — ${q.title}`, `Dear ${q.contactName}, please find attached our catering proposal for your review. We look forward to your confirmation.`, deliveredAt, adminId],
    );

    const decidedAt = new Date(deliveredAt.getTime() + 2 * 24 * 60 * 60 * 1000);
    await pool.query(
      `INSERT INTO cat_quotation_proposal_decisions (id, tenant_id, quotation_id, revision_number, decision, notes, recorded_at, recorded_by)
       VALUES (gen_random_uuid(), $1, $2, $3, 'ACCEPTED', $4, $5, $6)`,
      [tenantId, quotationId, publishedRevisionNumber, 'Client confirmed acceptance via phone, followed by written confirmation over email.', decidedAt, adminId],
    );

    processed++;
  }

  console.log(`Quotations: ${processed} processed (published, delivered, accepted), ${skipped} skipped (of ${QUOTATIONS.length} defined).`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
