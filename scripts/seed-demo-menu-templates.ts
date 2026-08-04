import { getPool, getAdminAndTenant } from "./lib/demo-db";

// Official Demo Dataset — Menu Templates.
// ~15 realistic Menu Templates, each with Meals -> Categories -> Menu
// Items (values copied from the Menu Catalog demo set — no references,
// matching the EM-WP04 snapshot-copy design), Dietary Requirements, and
// Service Instructions. Idempotent: upserts the Template on
// (tenant_id, template_name), then fully reconciles its menu tree.

interface ItemSpec { name: string; qty?: number; unit?: string; remarks?: string }
interface CategorySpec { name: string; items: ItemSpec[] }
interface MealSpec { name: string; categories: CategorySpec[] }
interface DietarySpec { requirement: string; guestCount?: number; notes?: string }
interface TemplateSpec {
  name: string;
  description: string;
  meals: MealSpec[];
  dietary: DietarySpec[];
  serviceInstructions: string;
}

function it(name: string, qty?: number, unit?: string, remarks?: string): ItemSpec {
  return { name, qty, unit, remarks };
}

export const TEMPLATES: TemplateSpec[] = [
  {
    name: 'North Indian Wedding',
    description: 'Full-scale North Indian wedding menu — welcome drinks, live counters, a generous buffet, and a dessert spread.',
    meals: [
      { name: 'Welcome', categories: [
        { name: 'Welcome Drinks', items: [it('Fresh Lime Soda', 300, 'glasses'), it('Jaljeera', 300, 'glasses'), it('Rose Sherbet', 200, 'glasses')] },
      ] },
      { name: 'Dinner Buffet', categories: [
        { name: 'Soups', items: [it('Tomato Soup', 15, 'liter')] },
        { name: 'Veg Starters', items: [it('Paneer Tikka', 300, 'portions'), it('Hara Bhara Kabab', 200, 'portions')] },
        { name: 'Non Veg Starters', items: [it('Chicken Tikka', 300, 'portions'), it('Fish Amritsari', 150, 'portions')] },
        { name: 'Main Course Veg', items: [it('Dal Makhani', 15, 'kg'), it('Shahi Paneer', 12, 'kg'), it('Mix Veg Curry', 10, 'kg')] },
        { name: 'Main Course Non Veg', items: [it('Butter Chicken', 15, 'kg'), it('Mutton Rogan Josh', 10, 'kg')] },
        { name: 'Rice', items: [it('Chicken Biryani', 15, 'kg'), it('Jeera Rice', 10, 'kg')] },
        { name: 'Bread', items: [it('Butter Naan', 300, 'pieces'), it('Tandoori Roti', 300, 'pieces')] },
      ] },
      { name: 'Live Counters', categories: [
        { name: 'Live Counters', items: [it('Chaat Counter', 1, 'station'), it('Pasta Counter', 1, 'station')] },
      ] },
      { name: 'Dessert', categories: [
        { name: 'Desserts', items: [it('Gulab Jamun', 300, 'pieces'), it('Kulfi', 300, 'pieces'), it('Jalebi', 300, 'pieces')] },
      ] },
    ],
    dietary: [
      { requirement: 'Jain', guestCount: 40, notes: 'No onion, no garlic, no root vegetables — separate cooking line required.' },
      { requirement: 'Vegan', guestCount: 20, notes: 'No dairy or ghee — confirm substitute preparations for gravies.' },
    ],
    serviceInstructions: 'Buffet service across two serving lines to manage guest flow. Live counters to open 30 minutes after main buffet.',
  },
  {
    name: 'Luxury Wedding Reception',
    description: 'Premium plated and live-counter wedding reception menu with elevated starters and desserts.',
    meals: [
      { name: 'Welcome', categories: [
        { name: 'Welcome Drinks', items: [it('Welcome Mocktail', 250, 'glasses'), it('Coconut Water', 150, 'glasses')] },
      ] },
      { name: 'Reception Dinner', categories: [
        { name: 'Non Veg Starters', items: [it('Chicken Malai Tikka', 250, 'portions'), it('Mutton Galouti Kabab', 150, 'portions'), it('Prawns Koliwada', 100, 'portions')] },
        { name: 'Veg Starters', items: [it('Paneer Malai Tikka', 200, 'portions')] },
        { name: 'Main Course Non Veg', items: [it('Butter Chicken', 12, 'kg'), it('Chicken Korma', 10, 'kg')] },
        { name: 'Main Course Veg', items: [it('Malai Kofta', 10, 'kg'), it('Dal Makhani', 12, 'kg')] },
        { name: 'Rice', items: [it('Mutton Biryani', 12, 'kg')] },
        { name: 'Bread', items: [it('Garlic Naan', 250, 'pieces')] },
      ] },
      { name: 'Live Counters', categories: [
        { name: 'Live Counters', items: [it('Tikka Counter', 1, 'station'), it('Sundae Counter', 1, 'station')] },
      ] },
      { name: 'Dessert', categories: [
        { name: 'Desserts', items: [it('Rasmalai', 250, 'pieces'), it('Shahi Tukda', 200, 'pieces')] },
      ] },
    ],
    dietary: [
      { requirement: 'Vegetarian', guestCount: 80, notes: 'Full vegetarian plated option required for select tables.' },
      { requirement: 'Nut Allergy', guestCount: 5, notes: 'No cashew, almond, or pistachio garnish on flagged plates.' },
    ],
    serviceInstructions: 'Plated service for the head table; buffet with live-counter accents for general seating. Dessert station to remain open through the night.',
  },
  {
    name: 'Corporate Lunch Buffet',
    description: 'Efficient corporate lunch buffet balancing variety with quick service turnaround.',
    meals: [
      { name: 'Lunch', categories: [
        { name: 'Salads', items: [it('Green Salad', 5, 'kg'), it('Kachumber Salad', 4, 'kg')] },
        { name: 'Soups', items: [it('Sweet Corn Soup', 8, 'liter')] },
        { name: 'Main Course Veg', items: [it('Kadai Paneer', 6, 'kg'), it('Chana Masala', 5, 'kg')] },
        { name: 'Main Course Non Veg', items: [it('Chicken Curry', 6, 'kg')] },
        { name: 'Rice', items: [it('Veg Pulao', 6, 'kg')] },
        { name: 'Bread', items: [it('Tandoori Roti', 150, 'pieces')] },
        { name: 'Desserts', items: [it('Fruit Custard', 4, 'kg')] },
      ] },
    ],
    dietary: [
      { requirement: 'Vegetarian', guestCount: 25, notes: 'Fully vegetarian trays to be clearly labelled on the buffet line.' },
    ],
    serviceInstructions: 'Single-line buffet designed for a 45-minute lunch window. Clear labelling required for all dietary trays.',
  },
  {
    name: 'Corporate Dinner',
    description: 'Structured corporate dinner with a welcome round, plated starters, and a buffet main course.',
    meals: [
      { name: 'Welcome', categories: [
        { name: 'Welcome Drinks', items: [it('Fresh Lime Soda', 100, 'glasses')] },
      ] },
      { name: 'Dinner', categories: [
        { name: 'Veg Starters', items: [it('Paneer Tikka', 100, 'portions')] },
        { name: 'Non Veg Starters', items: [it('Chicken Tikka', 100, 'portions')] },
        { name: 'Main Course Veg', items: [it('Paneer Butter Masala', 8, 'kg')] },
        { name: 'Main Course Non Veg', items: [it('Butter Chicken', 8, 'kg')] },
        { name: 'Rice', items: [it('Jeera Rice', 6, 'kg')] },
        { name: 'Bread', items: [it('Butter Naan', 150, 'pieces')] },
        { name: 'Desserts', items: [it('Gulab Jamun', 150, 'pieces')] },
      ] },
    ],
    dietary: [
      { requirement: 'Vegan', guestCount: 10, notes: 'Dairy-free gravy substitutes required.' },
    ],
    serviceInstructions: 'Welcome drinks served at entry; starters passed for the first 30 minutes before the buffet line opens.',
  },
  {
    name: 'Birthday Celebration',
    description: 'Fun, family-friendly birthday menu with familiar favourites and a dessert-forward finish.',
    meals: [
      { name: 'Welcome', categories: [
        { name: 'Welcome Drinks', items: [it('Pineapple Punch', 80, 'glasses')] },
      ] },
      { name: 'Snacks & Main Course', categories: [
        { name: 'Veg Starters', items: [it('Crispy Corn', 60, 'portions'), it('Cheese Corn Balls', 60, 'portions')] },
        { name: 'Main Course Veg', items: [it('Paneer Butter Masala', 5, 'kg')] },
        { name: 'Main Course Non Veg', items: [it('Chicken Curry', 5, 'kg')] },
        { name: 'Bread', items: [it('Butter Naan', 100, 'pieces')] },
      ] },
      { name: 'Dessert', categories: [
        { name: 'Desserts', items: [it('Ice Cream', 100, 'scoop'), it('Chocolate Brownie', 60, 'pieces')] },
      ] },
    ],
    dietary: [
      { requirement: 'Kids Menu', guestCount: 20, notes: 'Milder spice level for children\'s plates.' },
    ],
    serviceInstructions: 'Cake-cutting moment to be coordinated with dessert service — hold ice cream counter until after cake is cut.',
  },
  {
    name: 'Kitty Party',
    description: 'Light, informal daytime menu for a ladies\' kitty party — chaat, finger food, and a sweet finish.',
    meals: [
      { name: 'Afternoon Snacks', categories: [
        { name: 'Welcome Drinks', items: [it('Virgin Mojito', 40, 'glasses')] },
        { name: 'Veg Starters', items: [it('Dahi Kabab', 50, 'portions')] },
        { name: 'Live Counters', items: [it('Chaat Counter', 1, 'station')] },
        { name: 'Desserts', items: [it('Kulfi', 50, 'pieces')] },
      ] },
    ],
    dietary: [
      { requirement: 'Jain', guestCount: 8, notes: 'No onion or garlic in the chaat preparation for flagged guests.' },
    ],
    serviceInstructions: 'Relaxed afternoon pacing — no formal seating required, food stations arranged for mingling.',
  },
  {
    name: 'House Warming',
    description: 'Traditional vegetarian house warming (Griha Pravesh) lunch menu.',
    meals: [
      { name: 'Welcome', categories: [
        { name: 'Welcome Drinks', items: [it('Aam Panna', 60, 'glasses')] },
      ] },
      { name: 'Lunch', categories: [
        { name: 'Veg Starters', items: [it('Hara Bhara Kabab', 60, 'portions')] },
        { name: 'Main Course Veg', items: [it('Dal Makhani', 6, 'kg'), it('Aloo Gobi', 5, 'kg')] },
        { name: 'Rice', items: [it('Veg Pulao', 5, 'kg')] },
        { name: 'Bread', items: [it('Tandoori Roti', 120, 'pieces')] },
        { name: 'Desserts', items: [it('Gajar Ka Halwa', 4, 'kg')] },
      ] },
    ],
    dietary: [
      { requirement: 'Jain', guestCount: 15, notes: 'Full Jain preparation required for the pooja lunch.' },
    ],
    serviceInstructions: 'Fully vegetarian kitchen line — no non-vegetarian preparation on site for this event.',
  },
  {
    name: 'Festival Buffet',
    description: 'Festive vegetarian buffet built around traditional sweets and regional specialities.',
    meals: [
      { name: 'Welcome', categories: [
        { name: 'Welcome Drinks', items: [it('Thandai', 100, 'glasses')] },
      ] },
      { name: 'Festival Buffet', categories: [
        { name: 'Veg Starters', items: [it('Paneer Tikka', 100, 'portions')] },
        { name: 'Main Course Veg', items: [it('Shahi Paneer', 8, 'kg'), it('Chana Masala', 6, 'kg')] },
        { name: 'Rice', items: [it('Kashmiri Pulao', 6, 'kg')] },
        { name: 'Bread', items: [it('Laccha Paratha', 150, 'pieces')] },
      ] },
      { name: 'Live Counters', categories: [
        { name: 'Live Counters', items: [it('Chaat Counter', 1, 'station')] },
      ] },
      { name: 'Dessert', categories: [
        { name: 'Desserts', items: [it('Jalebi', 150, 'pieces'), it('Motichoor Ladoo', 150, 'pieces'), it('Rabri', 5, 'kg')] },
      ] },
    ],
    dietary: [
      { requirement: 'Vegan', guestCount: 10, notes: 'Dairy-free dessert alternatives required.' },
    ],
    serviceInstructions: 'Fully vegetarian menu for the festival occasion. Sweets counter to remain stocked throughout service.',
  },
  {
    name: 'Punjabi Wedding',
    description: 'Robust Punjabi wedding menu centred on tandoori starters, rich gravies, and lassi.',
    meals: [
      { name: 'Welcome', categories: [
        { name: 'Welcome Drinks', items: [it('Lassi', 300, 'glasses')] },
      ] },
      { name: 'Dinner Buffet', categories: [
        { name: 'Non Veg Starters', items: [it('Tandoori Chicken', 250, 'portions'), it('Amritsari Chicken Tikka', 200, 'portions')] },
        { name: 'Veg Starters', items: [it('Paneer Tikka', 200, 'portions')] },
        { name: 'Main Course Non Veg', items: [it('Butter Chicken', 15, 'kg'), it('Mutton Rogan Josh', 10, 'kg')] },
        { name: 'Main Course Veg', items: [it('Dal Makhani', 15, 'kg')] },
        { name: 'Bread', items: [it('Missi Roti', 250, 'pieces'), it('Butter Naan', 250, 'pieces')] },
        { name: 'Rice', items: [it('Chicken Biryani', 12, 'kg')] },
      ] },
      { name: 'Dessert', categories: [
        { name: 'Desserts', items: [it('Gulab Jamun', 250, 'pieces')] },
      ] },
    ],
    dietary: [
      { requirement: 'Vegetarian', guestCount: 60, notes: 'Separate vegetarian buffet line required.' },
    ],
    serviceInstructions: 'Separate cooking and serving lines for vegetarian and non-vegetarian food per Punjabi wedding convention.',
  },
  {
    name: 'South Indian Wedding',
    description: 'Traditional South Indian wedding menu featuring filter coffee, tangy classics, and a live dosa counter.',
    meals: [
      { name: 'Welcome', categories: [
        { name: 'Welcome Drinks', items: [it('Kokum Sherbet', 200, 'glasses')] },
      ] },
      { name: 'Lunch', categories: [
        { name: 'Soups', items: [it('Rasam', 10, 'liter')] },
        { name: 'Main Course Non Veg', items: [it('Chicken Chettinad', 10, 'kg'), it('Fish Moilee', 8, 'kg')] },
        { name: 'Main Course Veg', items: [it('Veg Kolhapuri', 6, 'kg')] },
        { name: 'Rice', items: [it('Curd Rice', 8, 'kg'), it('Lemon Rice', 6, 'kg')] },
      ] },
      { name: 'Live Counters', categories: [
        { name: 'Live Counters', items: [it('Dosa Counter', 1, 'station')] },
      ] },
      { name: 'Dessert', categories: [
        { name: 'Desserts', items: [it('Kheer', 6, 'kg')] },
      ] },
      { name: 'Beverages', categories: [
        { name: 'Beverages', items: [it('Filter Coffee', 250, 'cup')] },
      ] },
    ],
    dietary: [
      { requirement: 'Vegetarian', guestCount: 70, notes: 'Traditional South Indian vegetarian line required alongside the non-vegetarian menu.' },
    ],
    serviceInstructions: 'Traditional banana-leaf style service available on request for the vegetarian line; filter coffee counter to remain open through the afternoon.',
  },
  {
    name: 'VIP Dinner',
    description: 'Premium plated dinner menu for small, high-profile guest lists.',
    meals: [
      { name: 'Welcome', categories: [
        { name: 'Welcome Drinks', items: [it('Welcome Mocktail', 30, 'glasses')] },
      ] },
      { name: 'Dinner', categories: [
        { name: 'Soups', items: [it('Cream of Mushroom Soup', 3, 'liter')] },
        { name: 'Non Veg Starters', items: [it('Chicken Malai Tikka', 30, 'portions'), it('Mutton Galouti Kabab', 30, 'portions')] },
        { name: 'Main Course Non Veg', items: [it('Butter Chicken', 3, 'kg'), it('Mutton Rogan Josh', 3, 'kg')] },
        { name: 'Main Course Veg', items: [it('Dal Makhani', 3, 'kg')] },
        { name: 'Rice', items: [it('Mutton Biryani', 3, 'kg')] },
        { name: 'Bread', items: [it('Garlic Naan', 40, 'pieces')] },
      ] },
      { name: 'Dessert', categories: [
        { name: 'Desserts', items: [it('Rasmalai', 30, 'pieces')] },
      ] },
    ],
    dietary: [
      { requirement: 'Vegetarian', guestCount: 5, notes: 'Fully plated vegetarian alternative required for flagged guests.' },
    ],
    serviceInstructions: 'Individually plated courses served in sequence. Security and protocol coordination required before service begins.',
  },
  {
    name: 'Cocktail Reception',
    description: 'Stand-and-mingle cocktail reception menu built around passed starters and live counters.',
    meals: [
      { name: 'Cocktail Hour', categories: [
        { name: 'Welcome Drinks', items: [it('Virgin Mojito', 150, 'glasses'), it('Cranberry Fizz', 100, 'glasses')] },
        { name: 'Veg Starters', items: [it('Paneer 65', 150, 'portions'), it('Spring Rolls', 150, 'portions')] },
        { name: 'Non Veg Starters', items: [it('Chicken Lollipop', 150, 'portions'), it('Fish Tikka', 100, 'portions')] },
        { name: 'Live Counters', items: [it('Chinese Wok Counter', 1, 'station'), it('Momo Counter', 1, 'station')] },
      ] },
      { name: 'Dessert', categories: [
        { name: 'Desserts', items: [it('Ice Cream', 150, 'scoop')] },
      ] },
    ],
    dietary: [
      { requirement: 'Vegan', guestCount: 15, notes: 'Confirm oil-based alternatives for fried starters.' },
    ],
    serviceInstructions: 'Passed hors d\'oeuvres by service staff for the first hour; live counters open for the remainder of the reception.',
  },
  {
    name: 'Engagement Ceremony',
    description: 'Celebratory engagement ceremony menu balancing tradition with a lighter, mid-scale format.',
    meals: [
      { name: 'Welcome', categories: [
        { name: 'Welcome Drinks', items: [it('Rose Sherbet', 100, 'glasses')] },
      ] },
      { name: 'Dinner', categories: [
        { name: 'Veg Starters', items: [it('Paneer Tikka', 100, 'portions')] },
        { name: 'Non Veg Starters', items: [it('Chicken Tikka', 100, 'portions')] },
        { name: 'Main Course Veg', items: [it('Kadai Paneer', 6, 'kg')] },
        { name: 'Main Course Non Veg', items: [it('Chicken Korma', 6, 'kg')] },
        { name: 'Rice', items: [it('Veg Biryani', 6, 'kg')] },
        { name: 'Bread', items: [it('Butter Naan', 150, 'pieces')] },
      ] },
      { name: 'Dessert', categories: [
        { name: 'Desserts', items: [it('Rasmalai', 100, 'pieces')] },
      ] },
    ],
    dietary: [
      { requirement: 'Vegetarian', guestCount: 30, notes: 'Vegetarian line to be clearly separated on the buffet.' },
    ],
    serviceInstructions: 'Ring-exchange moment to be coordinated with service staff — hold starter service during the ceremony.',
  },
  {
    name: 'Reception Dinner',
    description: 'Classic evening reception dinner menu, plated starters followed by a buffet main course.',
    meals: [
      { name: 'Welcome', categories: [
        { name: 'Welcome Drinks', items: [it('Fresh Lime Soda', 200, 'glasses')] },
      ] },
      { name: 'Dinner', categories: [
        { name: 'Non Veg Starters', items: [it('Fish Tikka', 150, 'portions'), it('Chicken Reshmi Kabab', 150, 'portions')] },
        { name: 'Veg Starters', items: [it('Paneer Malai Tikka', 120, 'portions')] },
        { name: 'Main Course Non Veg', items: [it('Butter Chicken', 10, 'kg')] },
        { name: 'Main Course Veg', items: [it('Malai Kofta', 8, 'kg')] },
        { name: 'Rice', items: [it('Chicken Biryani', 10, 'kg')] },
        { name: 'Bread', items: [it('Garlic Naan', 200, 'pieces')] },
      ] },
      { name: 'Dessert', categories: [
        { name: 'Desserts', items: [it('Rasmalai', 150, 'pieces'), it('Kulfi', 150, 'pieces')] },
      ] },
    ],
    dietary: [
      { requirement: 'Vegetarian', guestCount: 40, notes: 'Dedicated vegetarian buffet line required.' },
    ],
    serviceInstructions: 'Plated starters served table-side; main course and dessert on buffet lines.',
  },
  {
    name: 'Executive Conference Lunch',
    description: 'Efficient, professional lunch menu for corporate conferences with a tight service window.',
    meals: [
      { name: 'Lunch', categories: [
        { name: 'Salads', items: [it('Caesar Salad', 4, 'kg')] },
        { name: 'Main Course Veg', items: [it('Paneer Lababdar', 5, 'kg')] },
        { name: 'Main Course Non Veg', items: [it('Chicken Curry', 5, 'kg')] },
        { name: 'Rice', items: [it('Steam Rice', 5, 'kg')] },
        { name: 'Bread', items: [it('Tandoori Roti', 100, 'pieces')] },
        { name: 'Desserts', items: [it('Fruit Custard', 4, 'kg')] },
      ] },
      { name: 'Beverages', categories: [
        { name: 'Beverages', items: [it('Filter Coffee', 100, 'cup'), it('Masala Tea', 100, 'cup')] },
      ] },
    ],
    dietary: [
      { requirement: 'Vegan', guestCount: 8, notes: 'Dairy-free main course option required.' },
    ],
    serviceInstructions: 'Designed for a 40-minute lunch break — single efficient buffet line with tea/coffee counter adjacent.',
  },
];

async function main() {
  const pool = getPool();
  const { tenantId, adminId } = await getAdminAndTenant(pool);

  let templatesProcessed = 0;

  for (const tmpl of TEMPLATES) {
    const existing = await pool.query(
      `SELECT id FROM cat_menu_templates WHERE tenant_id = $1 AND template_name = $2 AND is_deleted = false`,
      [tenantId, tmpl.name],
    );

    let templateId: string;
    if (existing.rows.length > 0) {
      templateId = existing.rows[0].id;
      await pool.query(
        `UPDATE cat_menu_templates SET description = $1, updated_at = NOW(), updated_by = $2 WHERE id = $3`,
        [tmpl.description, adminId, templateId],
      );
    } else {
      const inserted = await pool.query(
        `INSERT INTO cat_menu_templates (id, tenant_id, template_name, description, created_at, created_by, updated_at, updated_by, is_deleted)
         VALUES (gen_random_uuid(), $1, $2, $3, NOW(), $4, NOW(), $4, false) RETURNING id`,
        [tenantId, tmpl.name, tmpl.description, adminId],
      );
      templateId = inserted.rows[0].id;
    }

    // Full reconcile: wipe and reinsert the entire tree for this Template.
    await pool.query(`DELETE FROM cat_menu_template_meals WHERE template_id = $1`, [templateId]);
    await pool.query(`DELETE FROM cat_menu_template_dietary_requirements WHERE template_id = $1`, [templateId]);

    for (let mealIdx = 0; mealIdx < tmpl.meals.length; mealIdx++) {
      const meal = tmpl.meals[mealIdx];
      const mealRes = await pool.query(
        `INSERT INTO cat_menu_template_meals (id, tenant_id, template_id, meal_name, display_order, created_at, created_by, updated_at, updated_by)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), $5, NOW(), $5) RETURNING id`,
        [tenantId, templateId, meal.name, mealIdx, adminId],
      );
      const mealId = mealRes.rows[0].id;

      for (let catIdx = 0; catIdx < meal.categories.length; catIdx++) {
        const cat = meal.categories[catIdx];
        const catRes = await pool.query(
          `INSERT INTO cat_menu_template_categories (id, tenant_id, template_id, meal_id, category_name, display_order, created_at, created_by, updated_at, updated_by)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), $6, NOW(), $6) RETURNING id`,
          [tenantId, templateId, mealId, cat.name, catIdx, adminId],
        );
        const catId = catRes.rows[0].id;

        for (let itemIdx = 0; itemIdx < cat.items.length; itemIdx++) {
          const item = cat.items[itemIdx];
          await pool.query(
            `INSERT INTO cat_menu_template_items (id, tenant_id, template_id, category_id, item_name, quantity, unit, remarks, display_order, created_at, created_by, updated_at, updated_by)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, NOW(), $9)`,
            [tenantId, templateId, catId, item.name, item.qty ?? null, item.unit ?? null, item.remarks ?? null, itemIdx, adminId],
          );
        }
      }
    }

    for (let dIdx = 0; dIdx < tmpl.dietary.length; dIdx++) {
      const d = tmpl.dietary[dIdx];
      await pool.query(
        `INSERT INTO cat_menu_template_dietary_requirements (id, tenant_id, template_id, requirement, guest_count, notes, display_order, created_at, created_by, updated_at, updated_by)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), $7, NOW(), $7)`,
        [tenantId, templateId, d.requirement, d.guestCount ?? null, d.notes ?? null, dIdx, adminId],
      );
    }

    await pool.query(
      `INSERT INTO cat_menu_template_settings (id, tenant_id, template_id, service_instructions, created_at, created_by, updated_at, updated_by)
       VALUES (gen_random_uuid(), $1, $2, $3, NOW(), $4, NOW(), $4)
       ON CONFLICT (template_id) DO UPDATE SET service_instructions = EXCLUDED.service_instructions, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
      [tenantId, templateId, tmpl.serviceInstructions, adminId],
    );

    templatesProcessed++;
  }

  console.log(`Menu Templates: ${templatesProcessed} templates processed (of ${TEMPLATES.length} defined).`);
  await pool.end();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
