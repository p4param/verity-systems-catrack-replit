import { getPool, getAdminAndTenant, upsertByKey } from "./lib/demo-db";

// Official Demo Dataset — Vendors (PM-WP01).
// ~20 realistic Indian catering vendors across Business Categories (Food
// Supplier, Equipment Rental, Packaging, Transport, Cleaning, Utility),
// giving future Purchase Planning realistic supplier choices. Only Food
// Supplier / Packaging vendors carry a Supply Portfolio (Ingredient
// links) — other categories genuinely supply nothing Ingredient Master
// tracks yet, matching real business reality, not a data gap. Idempotent:
// upserts vendors on (tenant_id, name); each vendor's Supply Portfolio is
// fully reconciled (delete-all-then-reinsert) on every run.
//
// DD-001D — Purchase Planning (PM-WP02) recommendation scenarios, all
// anchored to ingredients in the DD-001C shared Work Date's (2026-11-14)
// Consolidated Ingredient Demand so every scenario is visible and
// testable in the real Purchase Planning grid, not just in isolation:
//   - One preferred vendor            -> Paneer (Golden Valley Dairy)
//   - Multiple vendors, no preferred  -> Ghee (Golden Valley Dairy, Sunrise Oil Mills)
//   - No preferred, single vendor     -> Turmeric (Spice Route Traders)
//   - Multiple vendors (5), preferred -> Salt (5 vendors; Spice Route Traders preferred)
//   - Multiple preferred vendors      -> Coriander (Green Leaf Herbs + Fresh Farms Produce Co., both preferred)
//   - Blocked preferred vendor        -> Bakery Bread (EcoPack Disposable Solutions, preferred+BLOCKED, alongside Premium Bakery Ingredients Co.)
//   - No active vendor                -> Chickpeas (SparkleClean Facility Services, INACTIVE, sole link)
//   - No vendor configured            -> naturally already true for several in-house "Produced" items
//                                         (Puri, Tamarind Chutney, Green Chutney, White Sauce, Pizza Sauce)
//                                         and a few unmapped raw items (Lemon, Seasonal Fruits) — no seed
//                                         change needed, verified in verify-demo-dataset.ts.

interface VendorSpec {
  name: string;
  businessCategory: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  taxId: string;
  paymentTerms: string;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  notes?: string;
  suppliesIngredients?: string[];
  preferredIngredients?: string[];
}

export const VENDORS: VendorSpec[] = [
  {
    name: 'Fresh Farms Produce Co.', businessCategory: 'Food Supplier',
    contactPerson: 'Ramesh Patil', phone: '+91 98220 11001', email: 'orders@freshfarmsproduce.example.com',
    address: 'APMC Market Yard, Gate 4', city: 'Pune', state: 'Maharashtra', taxId: '27AABCF1234A1Z5',
    paymentTerms: 'Net 15', status: 'ACTIVE',
    suppliesIngredients: ['Tomato', 'Onion', 'Potato', 'Capsicum', 'Carrot', 'Cauliflower', 'Green Peas', 'Spinach', 'Cabbage', 'French Beans', 'Brinjal', 'Cucumber', 'Beetroot', 'Lettuce', 'Mushroom', 'Sweet Corn', 'Coriander', 'Salt'],
    preferredIngredients: ['Tomato', 'Onion', 'Potato', 'Coriander'],
  },
  {
    name: 'Golden Valley Dairy', businessCategory: 'Food Supplier',
    contactPerson: 'Suman Deshmukh', phone: '+91 98220 11002', email: 'supply@goldenvalleydairy.example.com',
    address: 'Industrial Estate, Phase 2', city: 'Pune', state: 'Maharashtra', taxId: '27AABCG2234A1Z6',
    paymentTerms: 'Net 7', status: 'ACTIVE',
    suppliesIngredients: ['Paneer', 'Butter', 'Fresh Cream', 'Milk', 'Curd', 'Cheese', 'Khoya', 'Ghee'],
    preferredIngredients: ['Paneer', 'Fresh Cream'],
  },
  {
    name: 'Spice Route Traders', businessCategory: 'Food Supplier',
    contactPerson: 'Vikram Shah', phone: '+91 98250 11003', email: 'sales@spiceroutetraders.example.com',
    address: 'Khari Baoli Spice Market, Shop 112', city: 'Delhi', state: 'Delhi', taxId: '07AABCS3234A1Z7',
    paymentTerms: 'Net 30', status: 'ACTIVE',
    suppliesIngredients: ['Red Chilli Powder', 'Turmeric', 'Garam Masala', 'Cardamom', 'Cinnamon', 'Cloves', 'Bay Leaf', 'Star Anise', 'Fennel Seeds', 'Cumin Seeds', 'Mustard Seeds', 'Coriander Seeds', 'Kasuri Methi', 'Saffron', 'Nutmeg', 'Carom Seeds (Ajwain)', 'Asafoetida (Hing)', 'Black Pepper', 'Salt'],
    preferredIngredients: ['Garam Masala', 'Red Chilli Powder', 'Saffron', 'Salt'],
  },
  {
    name: 'Coastal Poultry & Meats', businessCategory: 'Food Supplier',
    contactPerson: 'Antony Fernandes', phone: '+91 98450 11004', email: 'orders@coastalpoultry.example.com',
    address: 'Cold Storage Complex, Unit 6', city: 'Mumbai', state: 'Maharashtra', taxId: '27AABCP4234A1Z8',
    paymentTerms: 'Net 7', status: 'ACTIVE',
    suppliesIngredients: ['Chicken', 'Mutton', 'Fish', 'Prawns', 'Eggs'],
    preferredIngredients: ['Chicken'],
  },
  {
    name: 'Annapurna Grains & Flours', businessCategory: 'Food Supplier',
    contactPerson: 'Prakash Agarwal', phone: '+91 98290 11005', email: 'sales@annapurnagrains.example.com',
    address: 'Grain Merchants Association Rd', city: 'Indore', state: 'Madhya Pradesh', taxId: '23AABCA5234A1Z9',
    paymentTerms: 'Net 30', status: 'ACTIVE',
    suppliesIngredients: ['Rice', 'Basmati Rice', 'Wheat Flour', 'Maida', 'Besan', 'Semolina (Rawa)', 'Vermicelli', 'Poha', 'Toor Dal', 'Urad Dal', 'Salt'],
    preferredIngredients: ['Basmati Rice'],
  },
  {
    name: 'Himalayan Dry Fruits Co.', businessCategory: 'Food Supplier',
    contactPerson: 'Tsering Dolma', phone: '+91 98160 11006', email: 'trade@himalayandryfruits.example.com',
    address: 'Dry Fruit Bazaar, Lane 3', city: 'Amritsar', state: 'Punjab', taxId: '03AABCH6234A1ZA',
    paymentTerms: 'Advance', status: 'ACTIVE',
    suppliesIngredients: ['Cashew', 'Almonds', 'Raisins', 'Pistachios'],
    preferredIngredients: ['Cashew', 'Pistachios'],
  },
  {
    name: 'Sunrise Oil Mills', businessCategory: 'Food Supplier',
    contactPerson: 'Manoj Yadav', phone: '+91 98270 11007', email: 'orders@sunriseoilmills.example.com',
    address: 'MIDC Industrial Area, Block C', city: 'Nashik', state: 'Maharashtra', taxId: '27AABCO7234A1ZB',
    paymentTerms: 'Net 15', status: 'ACTIVE',
    suppliesIngredients: ['Cooking Oil', 'Ghee'],
  },
  {
    name: 'Metro Sweeteners & Sugar Co.', businessCategory: 'Food Supplier',
    contactPerson: 'Harish Chandran', phone: '+91 98400 11008', email: 'sales@metrosweeteners.example.com',
    address: 'Sugar Merchants Complex', city: 'Coimbatore', state: 'Tamil Nadu', taxId: '33AABCM8234A1ZC',
    paymentTerms: 'Net 30', status: 'ACTIVE',
    suppliesIngredients: ['Sugar', 'Jaggery', 'Honey', 'Salt'],
  },
  {
    name: 'Green Leaf Herbs', businessCategory: 'Food Supplier',
    contactPerson: 'Lakshmi Narayanan', phone: '+91 98430 11009', email: 'orders@greenleafherbs.example.com',
    address: 'Wholesale Vegetable Market, Stall 22', city: 'Bengaluru', state: 'Karnataka', taxId: '29AABCG9234A1ZD',
    paymentTerms: 'Net 7', status: 'ACTIVE',
    suppliesIngredients: ['Coriander', 'Mint', 'Curry Leaves', 'Green Chilli', 'Garlic', 'Ginger'],
    preferredIngredients: ['Coriander'],
  },
  {
    name: 'Konkan Coconut & Tamarind Traders', businessCategory: 'Food Supplier',
    contactPerson: 'Suresh Naik', phone: '+91 98220 11010', email: 'trade@konkantraders.example.com',
    address: 'Coastal Highway Market Rd', city: 'Ratnagiri', state: 'Maharashtra', taxId: '27AABCK1234A1ZE',
    paymentTerms: 'Net 15', status: 'ACTIVE',
    suppliesIngredients: ['Coconut', 'Tamarind', 'Kokum', 'Raw Mango'],
  },
  {
    name: 'Premium Bakery Ingredients Co.', businessCategory: 'Food Supplier',
    contactPerson: 'Farida Sheikh', phone: '+91 98200 11011', email: 'sales@premiumbakeryingredients.example.com',
    address: 'Bakers Lane, Crawford Market', city: 'Mumbai', state: 'Maharashtra', taxId: '27AABCB2234A1ZF',
    paymentTerms: 'Net 15', status: 'ACTIVE',
    suppliesIngredients: ['Cocoa Powder', 'Baking Powder', 'Custard Powder', 'Bakery Bread', 'Cookies'],
  },
  {
    name: 'National Beverage Ingredients Co.', businessCategory: 'Food Supplier',
    contactPerson: 'Deepak Bansal', phone: '+91 98110 11012', email: 'orders@nationalbeverage.example.com',
    address: 'Trade Tower, Sector 18', city: 'Noida', state: 'Uttar Pradesh', taxId: '09AABCN3234A1ZG',
    paymentTerms: 'Net 30', status: 'ACTIVE',
    suppliesIngredients: ['Tea Leaves', 'Coffee Powder', 'Soy Sauce', 'Vinegar', 'Pasta', 'Noodles', 'Rose Syrup'],
  },
  {
    name: 'SafePack Consumables & Packaging', businessCategory: 'Packaging',
    contactPerson: 'Nitin Kohli', phone: '+91 98110 11013', email: 'sales@safepack.example.com',
    address: 'Packaging Hub, Udyog Vihar', city: 'Gurugram', state: 'Haryana', taxId: '06AABCS4234A1ZH',
    paymentTerms: 'Net 30', status: 'ACTIVE',
    suppliesIngredients: ['Aluminium Foil', 'Butter Paper', 'Tissue Paper', 'Tooth Picks', 'Disposable Plates', 'Disposable Glasses', 'Wooden Spoon', 'Garbage Bags', 'Cling Wrap', 'Paper Napkins'],
  },
  {
    name: 'QuickServe Packaged Goods Distributors', businessCategory: 'Food Supplier',
    contactPerson: 'Ritesh Malhotra', phone: '+91 98730 11014', email: 'orders@quickservepackaged.example.com',
    address: 'FMCG Distribution Park', city: 'Ahmedabad', state: 'Gujarat', taxId: '24AABCQ5234A1ZI',
    paymentTerms: 'Net 15', status: 'ACTIVE',
    suppliesIngredients: ['Mineral Water', 'Soft Drinks', 'Ice Cream Cups', 'Juice Packs', 'Butter Portions', 'Namkeen Packets', 'Papad', 'Salt'],
  },
  {
    name: 'Royal Event Equipment Rentals', businessCategory: 'Equipment Rental',
    contactPerson: 'Arvind Sethi', phone: '+91 98100 11015', email: 'bookings@royaleventrentals.example.com',
    address: 'Banquet Row, Rajouri Garden', city: 'Delhi', state: 'Delhi', taxId: '07AABCR6234A1ZJ',
    paymentTerms: 'Advance', status: 'ACTIVE',
    notes: 'Chafing dishes, live counter stations, tandoors for hire.',
  },
  {
    name: 'Metro Tent & Furniture Rentals', businessCategory: 'Equipment Rental',
    contactPerson: 'Balwant Singh', phone: '+91 98140 11016', email: 'info@metrotentrentals.example.com',
    address: 'Wedding Grounds Rd, Sector 9', city: 'Chandigarh', state: 'Punjab', taxId: '03AABCT7234A1ZK',
    paymentTerms: 'Advance', status: 'ACTIVE',
  },
  {
    name: 'Speedway Logistics & Transport', businessCategory: 'Transport',
    contactPerson: 'Faisal Ansari', phone: '+91 98670 11017', email: 'dispatch@speedwaylogistics.example.com',
    address: 'Transport Nagar, Bay 14', city: 'Pune', state: 'Maharashtra', taxId: '27AABCS8234A1ZL',
    paymentTerms: 'Net 15', status: 'ACTIVE',
    notes: 'Refrigerated vans for cold-chain ingredient transport between kitchens and venues.',
  },
  {
    name: 'SparkleClean Facility Services', businessCategory: 'Cleaning',
    contactPerson: 'Meera Joshi', phone: '+91 98330 11018', email: 'contracts@sparkleclean.example.com',
    address: 'Service Plaza, MG Road', city: 'Pune', state: 'Maharashtra', taxId: '27AABCC9234A1ZM',
    paymentTerms: 'Net 30', status: 'INACTIVE',
    notes: 'Contract lapsed — under renewal review.',
    // DD-001D — Purchase Planning "No Active Vendor" scenario: Chickpeas
    // has no other Vendor link, so once linked here it resolves to
    // NO_ACTIVE_VENDOR (a link exists, but no active one), distinct from
    // NO_VENDOR (no link at all).
    suppliesIngredients: ['Chickpeas'],
  },
  {
    name: 'PowerGrid Utility Services', businessCategory: 'Utility',
    contactPerson: 'Sanjay Verma', phone: '+91 98990 11019', email: 'support@powergridutility.example.com',
    address: 'Power House Rd', city: 'Pune', state: 'Maharashtra', taxId: '27AABCU1234A1ZN',
    paymentTerms: 'Net 7', status: 'ACTIVE',
    notes: 'Backup generators and power distribution for outdoor events.',
  },
  {
    name: 'EcoPack Disposable Solutions', businessCategory: 'Packaging',
    contactPerson: 'Rohit Bhatia', phone: '+91 98180 11020', email: 'sales@ecopackdisposable.example.com',
    address: 'Green Industrial Estate', city: 'Surat', state: 'Gujarat', taxId: '24AABCE2234A1ZO',
    paymentTerms: 'Net 30', status: 'BLOCKED',
    notes: 'Blocked pending resolution of a quality complaint on a prior order.',
    // DD-001D — Purchase Planning "Blocked Preferred Vendor" scenario:
    // Bakery Bread is also supplied (non-preferred, Active) by Premium
    // Bakery Ingredients Co., so this deliberately demonstrates Rule 3 —
    // the recommendation surfaces the blocked preference rather than
    // silently falling back to the active alternative.
    suppliesIngredients: ['Bakery Bread'],
    preferredIngredients: ['Bakery Bread'],
  },
];

async function main() {
  const pool = getPool();
  const { tenantId, adminId } = await getAdminAndTenant(pool);

  const ingredientRows = await pool.query(`SELECT id, name FROM cat_ingredient_master_items WHERE tenant_id = $1`, [tenantId]);
  const ingredientIdByName = new Map<string, string>(ingredientRows.rows.map((r: any) => [r.name, r.id]));

  let vendorsCreated = 0;
  let vendorsUpdated = 0;
  let linksWritten = 0;
  const currentYear = new Date().getFullYear();

  for (let index = 0; index < VENDORS.length; index++) {
    const v = VENDORS[index];
    const vendorCode = `VEN-${currentYear}-${String(index + 1).padStart(4, '0')}`;

    const result = await upsertByKey(
      pool,
      'cat_vendors',
      { tenant_id: tenantId, name: v.name },
      {
        vendor_code: vendorCode,
        business_category: v.businessCategory,
        contact_person: v.contactPerson,
        phone: v.phone,
        email: v.email,
        address: v.address,
        city: v.city,
        state: v.state,
        tax_id: v.taxId,
        payment_terms: v.paymentTerms,
        status: v.status,
        notes: v.notes || null,
        updated_at: new Date(),
        updated_by: adminId,
      },
    );
    const vendorId = result.id;
    if (result.created) {
      await pool.query(`UPDATE cat_vendors SET created_by = $1 WHERE id = $2`, [adminId, vendorId]);
      vendorsCreated++;
    } else {
      vendorsUpdated++;
    }

    // Supply Portfolio — full reconcile per vendor, same pattern as Recipe
    // Variants' ingredient reconciliation.
    //
    // PM-WP04A: writes `priority` (1 for preferredIngredients, NULL/
    // unranked otherwise) as the sole recommendation-ranking field —
    // `is_preferred` is frozen going forward (kept only as a migration
    // rollback safety net) and is deliberately no longer written here.
    // `preferredIngredients` stays the VendorSpec field name for now
    // (minimal diff) — its only two vendors sharing one ingredient
    // (Coriander: Green Leaf Herbs + Fresh Farms Produce Co.) is the
    // deliberate Multiple-Priority-1-Vendors defensive fixture; direct
    // SQL insert here bypasses the five domain operations entirely, the
    // same way every seed script bypasses application-level flows.
    await pool.query(`DELETE FROM cat_vendor_ingredients WHERE vendor_id = $1`, [vendorId]);
    const preferredSet = new Set(v.preferredIngredients || []);
    for (const ingredientName of v.suppliesIngredients || []) {
      const ingredientId = ingredientIdByName.get(ingredientName);
      if (!ingredientId) {
        console.warn(`  Skipping "${v.name}" -> "${ingredientName}" — no matching Ingredient Master item. Run seed-demo-ingredient-master.ts first.`);
        continue;
      }
      const priority = preferredSet.has(ingredientName) ? 1 : null;
      await pool.query(
        `INSERT INTO cat_vendor_ingredients (id, tenant_id, vendor_id, ingredient_id, priority, created_at, created_by, updated_at, updated_by)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), $5, NOW(), $5)`,
        [tenantId, vendorId, ingredientId, priority, adminId],
      );
      linksWritten++;
    }
  }

  console.log(`Vendors: ${vendorsCreated} created, ${vendorsUpdated} updated (of ${VENDORS.length} total). Supply Portfolio links written: ${linksWritten}.`);
  await pool.end();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
