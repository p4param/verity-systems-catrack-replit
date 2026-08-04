import { getPool, getAdminAndTenant, upsertByKey } from "./lib/demo-db";

// Official Demo Dataset — Ingredient Master.
// ~100 real, recognizable Indian catering ingredients across Purchased,
// Produced, Packaged, and Consumables. Idempotent: upserts on (tenant_id,
// name). EM-WP07 schema only — no schema changes.

function img(name: string) {
  return `https://placehold.co/400x300/e2e8f0/1e293b?text=${encodeURIComponent(name)}`;
}

interface Ing {
  name: string;
  type: string;
  baseUnit: string;
  purchaseUnit: string;
  storage: string;
  shelfLife: string;
  procurementCategory: string;
  foodCharacteristics: string;
  description: string;
}

function i(
  name: string,
  type: string,
  baseUnit: string,
  purchaseUnit: string,
  storage: string,
  shelfLife: string,
  procurementCategory: string,
  foodCharacteristics: string,
  description: string,
): Ing {
  return { name, type, baseUnit, purchaseUnit, storage, shelfLife, procurementCategory, foodCharacteristics, description };
}

const PURCHASED: Ing[] = [
  // Dairy
  i('Paneer', 'Dairy', 'kg', '5 kg block', 'Refrigerated', '5 days', 'Dairy & Chilled', 'Vegetarian, Perishable, High Protein', 'Fresh Indian cottage cheese, used across starters, gravies, and main course dishes.'),
  i('Butter', 'Dairy', 'kg', '500 g block', 'Refrigerated', '30 days', 'Dairy & Chilled', 'Vegetarian, Perishable, Contains Dairy', 'Unsalted table butter used for gravies, naan, and finishing dishes.'),
  i('Fresh Cream', 'Dairy', 'liter', '1 liter tetra pack', 'Refrigerated', '10 days', 'Dairy & Chilled', 'Vegetarian, Perishable, Contains Dairy', 'Dairy cream used to enrich gravies, soups, and desserts.'),
  i('Milk', 'Dairy', 'liter', '20 liter can', 'Refrigerated', '2 days', 'Dairy & Chilled', 'Vegetarian, Perishable, Contains Dairy', 'Full-cream milk used for gravies, desserts, and beverages.'),
  i('Curd', 'Dairy', 'kg', '5 kg tub', 'Refrigerated', '5 days', 'Dairy & Chilled', 'Vegetarian, Perishable, Contains Dairy', 'Fresh set curd used for marination, raita, and beverages.'),
  i('Cheese', 'Dairy', 'kg', '2 kg block', 'Refrigerated', '45 days', 'Dairy & Chilled', 'Vegetarian, Perishable, Contains Dairy', 'Processed cheese block used for continental and fusion dishes.'),
  i('Khoya', 'Dairy', 'kg', '5 kg block', 'Refrigerated', '4 days', 'Dairy & Chilled', 'Vegetarian, Perishable, Contains Dairy', 'Reduced milk solids used as the base for Indian sweets.'),
  // Vegetables
  i('Tomato', 'Vegetable', 'kg', '25 kg crate', 'Cool Dry Storage', '7 days', 'Produce', 'Vegetarian, Perishable', 'Fresh red tomatoes, the base of most Indian gravies.'),
  i('Onion', 'Vegetable', 'kg', '50 kg sack', 'Cool Dry Storage', '30 days', 'Produce', 'Vegetarian, Non-Perishable (short term)', 'Fresh onions, a base ingredient across nearly every savoury preparation.'),
  i('Garlic', 'Vegetable', 'kg', '10 kg bag', 'Cool Dry Storage', '30 days', 'Produce', 'Vegetarian, Non-Perishable (short term)', 'Fresh garlic used in masalas, marinades, and tempering.'),
  i('Ginger', 'Vegetable', 'kg', '10 kg bag', 'Cool Dry Storage', '21 days', 'Produce', 'Vegetarian, Perishable', 'Fresh ginger used in masalas, marinades, and beverages.'),
  i('Green Chilli', 'Vegetable', 'kg', '5 kg bag', 'Refrigerated', '10 days', 'Produce', 'Vegetarian, Perishable', 'Fresh green chillies used for heat in gravies and garnish.'),
  i('Coriander', 'Herb', 'kg', '1 kg bunch pack', 'Refrigerated', '5 days', 'Produce', 'Vegetarian, Perishable', 'Fresh coriander leaves used for garnish and chutneys.'),
  i('Mint', 'Herb', 'kg', '1 kg bunch pack', 'Refrigerated', '4 days', 'Produce', 'Vegetarian, Perishable', 'Fresh mint leaves used in chutneys, beverages, and biryani.'),
  i('Potato', 'Vegetable', 'kg', '50 kg sack', 'Cool Dry Storage', '30 days', 'Produce', 'Vegetarian, Non-Perishable (short term)', 'Fresh potatoes used across starters, curries, and snacks.'),
  i('Capsicum', 'Vegetable', 'kg', '10 kg crate', 'Refrigerated', '10 days', 'Produce', 'Vegetarian, Perishable', 'Bell peppers used in Indo-Chinese and continental preparations.'),
  i('Carrot', 'Vegetable', 'kg', '10 kg crate', 'Refrigerated', '14 days', 'Produce', 'Vegetarian, Perishable', 'Fresh carrots used in salads, halwa, and curries.'),
  i('Cauliflower', 'Vegetable', 'kg', '10 kg crate', 'Refrigerated', '7 days', 'Produce', 'Vegetarian, Perishable', 'Fresh cauliflower used in Gobi preparations and mixed veg.'),
  i('Green Peas', 'Vegetable', 'kg', '10 kg bag (frozen)', 'Frozen', '90 days', 'Produce', 'Vegetarian, Perishable (frozen)', 'Shelled green peas used in pulao, curries, and snacks.'),
  i('Spinach', 'Vegetable', 'kg', '5 kg crate', 'Refrigerated', '4 days', 'Produce', 'Vegetarian, Perishable', 'Fresh spinach used for Palak Paneer and soups.'),
  i('Cabbage', 'Vegetable', 'kg', '10 kg crate', 'Refrigerated', '14 days', 'Produce', 'Vegetarian, Perishable', 'Fresh cabbage used in Manchurian and salads.'),
  i('French Beans', 'Vegetable', 'kg', '5 kg crate', 'Refrigerated', '7 days', 'Produce', 'Vegetarian, Perishable', 'Fresh beans used in mixed vegetable preparations.'),
  i('Brinjal', 'Vegetable', 'kg', '10 kg crate', 'Refrigerated', '7 days', 'Produce', 'Vegetarian, Perishable', 'Fresh eggplant used for Baingan Bharta and curries.'),
  i('Bottle Gourd', 'Vegetable', 'kg', '10 kg crate', 'Cool Dry Storage', '7 days', 'Produce', 'Vegetarian, Perishable', 'Fresh lauki used in curries and halwa.'),
  i('Pumpkin', 'Vegetable', 'kg', '10 kg crate', 'Cool Dry Storage', '14 days', 'Produce', 'Vegetarian, Perishable', 'Fresh pumpkin used in curries and desserts.'),
  i('Okra', 'Vegetable', 'kg', '5 kg crate', 'Refrigerated', '5 days', 'Produce', 'Vegetarian, Perishable', 'Fresh bhindi used in dry sabzi preparations.'),
  i('Mushroom', 'Vegetable', 'kg', '3 kg crate', 'Refrigerated', '5 days', 'Produce', 'Vegetarian, Perishable', 'Fresh button mushrooms used in starters and curries.'),
  i('Broccoli', 'Vegetable', 'kg', '5 kg crate', 'Refrigerated', '7 days', 'Produce', 'Vegetarian, Perishable', 'Fresh broccoli used in continental and soup preparations.'),
  i('Sweet Corn', 'Vegetable', 'kg', '10 kg bag (frozen)', 'Frozen', '90 days', 'Produce', 'Vegetarian, Perishable (frozen)', 'Corn kernels used in soups, salads, and starters.'),
  i('Cucumber', 'Vegetable', 'kg', '10 kg crate', 'Refrigerated', '7 days', 'Produce', 'Vegetarian, Perishable', 'Fresh cucumber used in salads and raita.'),
  i('Beetroot', 'Vegetable', 'kg', '10 kg crate', 'Refrigerated', '14 days', 'Produce', 'Vegetarian, Perishable', 'Fresh beetroot used in salads and juices.'),
  i('Lettuce', 'Vegetable', 'kg', '5 kg crate', 'Refrigerated', '5 days', 'Produce', 'Vegetarian, Perishable', 'Romaine lettuce used for Caesar Salad and continental plating.'),
  i('Chickpeas', 'Vegetable', 'kg', '25 kg sack', 'Dry Storage', '365 days', 'Dry Goods', 'Vegetarian, Vegan, Non-Perishable', 'Dried white chickpeas (kabuli chana), soaked and boiled for Chana Masala and Chickpea Salad.'),
  // Fruits
  i('Lemon', 'Fruit', 'kg', '5 kg bag', 'Cool Dry Storage', '14 days', 'Produce', 'Vegetarian, Perishable', 'Fresh lemons used for garnish, beverages, and marination.'),
  i('Coconut', 'Fruit', 'piece', 'Bag of 20', 'Cool Dry Storage', '15 days', 'Produce', 'Vegetarian, Perishable', 'Fresh coconut used for chutneys, curries, and desserts.'),
  i('Raw Mango', 'Fruit', 'kg', '10 kg crate', 'Cool Dry Storage', '10 days', 'Produce', 'Vegetarian, Vegan, Perishable', 'Sour green mango used for Aam Panna and pickling.'),
  i('Kokum', 'Fruit', 'kg', '1 kg pouch', 'Dry Storage', '365 days', 'Dry Goods', 'Vegetarian, Vegan, Non-Perishable', 'Dried kokum rind, soaked to make the tangy Kokum Sherbet base.'),
  i('Seasonal Fruits', 'Fruit', 'kg', '10 kg crate', 'Refrigerated', '4 days', 'Produce', 'Vegetarian, Vegan, Perishable', 'Mixed seasonal fresh fruits used for Fruit Salad and Fruit Custard.'),
  // Grains & Flours
  i('Rice', 'Grain', 'kg', '25 kg sack', 'Dry Storage', '180 days', 'Dry Goods', 'Vegetarian, Non-Perishable', 'Regular white rice used for daily preparations.'),
  i('Basmati Rice', 'Grain', 'kg', '25 kg sack', 'Dry Storage', '365 days', 'Dry Goods', 'Vegetarian, Non-Perishable', 'Long-grain aromatic rice used for biryani and pulao.'),
  i('Wheat Flour', 'Grain', 'kg', '25 kg sack', 'Dry Storage', '90 days', 'Dry Goods', 'Vegetarian, Non-Perishable', 'Whole wheat flour used for rotis and parathas.'),
  i('Maida', 'Grain', 'kg', '25 kg sack', 'Dry Storage', '120 days', 'Dry Goods', 'Vegetarian, Non-Perishable', 'Refined flour used for naan, bakery items, and desserts.'),
  i('Besan', 'Grain', 'kg', '25 kg sack', 'Dry Storage', '120 days', 'Dry Goods', 'Vegetarian, Non-Perishable', 'Gram flour used in pakoras, kadhi, and sweets.'),
  i('Semolina (Rawa)', 'Grain', 'kg', '10 kg bag', 'Dry Storage', '90 days', 'Dry Goods', 'Vegetarian, Non-Perishable', 'Coarse wheat semolina used for halwa and upma.'),
  i('Vermicelli', 'Grain', 'kg', '5 kg bag', 'Dry Storage', '180 days', 'Dry Goods', 'Vegetarian, Non-Perishable', 'Roasted vermicelli used for Kheer and Upma.'),
  i('Poha', 'Grain', 'kg', '10 kg bag', 'Dry Storage', '120 days', 'Dry Goods', 'Vegetarian, Non-Perishable', 'Flattened rice used for light breakfast preparations.'),
  // Proteins
  i('Chicken', 'Protein', 'kg', '10 kg crate', 'Frozen', '3 days (thawed) / 90 days (frozen)', 'Meat & Poultry', 'Non-Vegetarian, Perishable, High Protein', 'Fresh/frozen chicken used across starters and curries.'),
  i('Mutton', 'Protein', 'kg', '10 kg crate', 'Frozen', '2 days (thawed) / 90 days (frozen)', 'Meat & Poultry', 'Non-Vegetarian, Perishable, High Protein', 'Goat meat used for premium curries and biryani.'),
  i('Fish', 'Protein', 'kg', '10 kg crate', 'Frozen', '2 days (thawed) / 60 days (frozen)', 'Meat & Poultry', 'Non-Vegetarian, Perishable, High Protein', 'Fresh/frozen fish used for regional curry and fry preparations.'),
  i('Prawns', 'Protein', 'kg', '5 kg crate', 'Frozen', '2 days (thawed) / 60 days (frozen)', 'Meat & Poultry', 'Non-Vegetarian, Perishable, Shellfish', 'Prawns used for coastal starters and curries.'),
  i('Eggs', 'Protein', 'piece', 'Tray of 30', 'Refrigerated', '21 days', 'Dairy & Chilled', 'Non-Vegetarian, Perishable', 'Fresh eggs used in curries, bakery, and breakfast items.'),
  // Oils & Fats
  i('Cooking Oil', 'Oil & Fat', 'liter', '15 liter tin', 'Dry Storage', '180 days', 'Dry Goods', 'Vegetarian, Non-Perishable', 'Refined vegetable oil used for general cooking and frying.'),
  i('Ghee', 'Oil & Fat', 'kg', '15 kg tin', 'Dry Storage', '180 days', 'Dry Goods', 'Vegetarian, Non-Perishable, Contains Dairy', 'Clarified butter used for tempering, sweets, and finishing.'),
  // Sweeteners
  i('Sugar', 'Sweetener', 'kg', '50 kg sack', 'Dry Storage', '365 days', 'Dry Goods', 'Vegetarian, Non-Perishable', 'Refined white sugar used across desserts and beverages.'),
  i('Jaggery', 'Sweetener', 'kg', '25 kg block', 'Dry Storage', '180 days', 'Dry Goods', 'Vegetarian, Non-Perishable', 'Unrefined cane sugar used in traditional sweets.'),
  i('Honey', 'Sweetener', 'kg', '5 kg jar', 'Dry Storage', '365 days', 'Dry Goods', 'Vegetarian, Non-Perishable', 'Natural honey used in glazes and beverages.'),
  // Spices
  i('Salt', 'Spice', 'kg', '25 kg sack', 'Dry Storage', '730 days', 'Dry Goods', 'Vegetarian, Vegan, Non-Perishable', 'Iodised table salt used across all preparations.'),
  i('Black Pepper', 'Spice', 'kg', '1 kg pouch', 'Dry Storage', '365 days', 'Dry Goods', 'Vegetarian, Vegan, Non-Perishable', 'Whole and ground black pepper used for seasoning.'),
  i('Red Chilli Powder', 'Spice', 'kg', '5 kg pouch', 'Dry Storage', '180 days', 'Dry Goods', 'Vegetarian, Vegan, Non-Perishable', 'Ground dried red chillies used for colour and heat.'),
  i('Turmeric', 'Spice', 'kg', '5 kg pouch', 'Dry Storage', '365 days', 'Dry Goods', 'Vegetarian, Vegan, Non-Perishable', 'Ground turmeric used for colour and base seasoning.'),
  i('Garam Masala', 'Spice', 'kg', '2 kg pouch', 'Dry Storage', '180 days', 'Dry Goods', 'Vegetarian, Vegan, Non-Perishable', 'Blended whole-spice powder used to finish North Indian gravies.'),
  i('Cardamom', 'Spice', 'kg', '500 g pouch', 'Dry Storage', '365 days', 'Dry Goods', 'Vegetarian, Vegan, Non-Perishable', 'Green cardamom pods used in gravies, biryani, and desserts.'),
  i('Cinnamon', 'Spice', 'kg', '500 g pouch', 'Dry Storage', '365 days', 'Dry Goods', 'Vegetarian, Vegan, Non-Perishable', 'Cinnamon sticks used in whole-spice tempering.'),
  i('Cloves', 'Spice', 'kg', '500 g pouch', 'Dry Storage', '365 days', 'Dry Goods', 'Vegetarian, Vegan, Non-Perishable', 'Whole cloves used in gravies, biryani, and tea.'),
  i('Bay Leaf', 'Spice', 'kg', '250 g pouch', 'Dry Storage', '365 days', 'Dry Goods', 'Vegetarian, Vegan, Non-Perishable', 'Dried bay leaves used in whole-spice tempering.'),
  i('Star Anise', 'Spice', 'kg', '250 g pouch', 'Dry Storage', '365 days', 'Dry Goods', 'Vegetarian, Vegan, Non-Perishable', 'Used in biryani and Chinese-style gravies.'),
  i('Fennel Seeds', 'Spice', 'kg', '1 kg pouch', 'Dry Storage', '365 days', 'Dry Goods', 'Vegetarian, Vegan, Non-Perishable', 'Used in spice blends and as a post-meal mouth freshener.'),
  i('Cumin Seeds', 'Spice', 'kg', '2 kg pouch', 'Dry Storage', '365 days', 'Dry Goods', 'Vegetarian, Vegan, Non-Perishable', 'Whole cumin used for tempering across Indian cuisine.'),
  i('Mustard Seeds', 'Spice', 'kg', '2 kg pouch', 'Dry Storage', '365 days', 'Dry Goods', 'Vegetarian, Vegan, Non-Perishable', 'Whole mustard seeds used for South Indian tempering.'),
  i('Coriander Seeds', 'Spice', 'kg', '2 kg pouch', 'Dry Storage', '365 days', 'Dry Goods', 'Vegetarian, Vegan, Non-Perishable', 'Whole and ground coriander used as a base spice.'),
  i('Kasuri Methi', 'Spice', 'kg', '500 g pouch', 'Dry Storage', '180 days', 'Dry Goods', 'Vegetarian, Vegan, Non-Perishable', 'Dried fenugreek leaves used to finish North Indian gravies.'),
  i('Saffron', 'Spice', 'g', '10 g box', 'Dry Storage', '730 days', 'Dry Goods', 'Vegetarian, Vegan, Non-Perishable, Premium', 'Premium saffron threads used in biryani and desserts.'),
  i('Nutmeg', 'Spice', 'kg', '250 g pouch', 'Dry Storage', '365 days', 'Dry Goods', 'Vegetarian, Vegan, Non-Perishable', 'Used in small quantities to round out rich gravies.'),
  i('Carom Seeds (Ajwain)', 'Spice', 'kg', '1 kg pouch', 'Dry Storage', '365 days', 'Dry Goods', 'Vegetarian, Vegan, Non-Perishable', 'Whole ajwain seeds used in batters and dough for their distinctive aroma.'),
  i('Asafoetida (Hing)', 'Spice', 'kg', '500 g tin', 'Dry Storage', '365 days', 'Dry Goods', 'Vegetarian, Vegan, Non-Perishable', 'Pungent resin powder used to replace onion-garlic aromatics in Jain preparations.'),
  i('Curry Leaves', 'Herb', 'kg', '1 kg bunch pack', 'Refrigerated', '4 days', 'Produce', 'Vegetarian, Perishable', 'Fresh curry leaves used for South Indian tempering.'),
  // Nuts & Dry Fruits
  i('Cashew', 'Dry Fruit', 'kg', '5 kg pouch', 'Dry Storage', '120 days', 'Dry Goods', 'Vegetarian, Vegan, Contains Tree Nuts', 'Used whole for garnish and ground into gravy bases.'),
  i('Almonds', 'Dry Fruit', 'kg', '5 kg pouch', 'Dry Storage', '180 days', 'Dry Goods', 'Vegetarian, Vegan, Contains Tree Nuts', 'Used in garnish, desserts, and Mughlai gravies.'),
  i('Raisins', 'Dry Fruit', 'kg', '5 kg pouch', 'Dry Storage', '180 days', 'Dry Goods', 'Vegetarian, Vegan, Non-Perishable', 'Used in pulao, biryani, and desserts.'),
  i('Pistachios', 'Dry Fruit', 'kg', '2 kg pouch', 'Dry Storage', '180 days', 'Dry Goods', 'Vegetarian, Vegan, Contains Tree Nuts, Premium', 'Used for garnish on premium desserts and kulfi.'),
  // Condiments
  i('Vinegar', 'Condiment', 'liter', '5 liter can', 'Dry Storage', '365 days', 'Dry Goods', 'Vegetarian, Vegan, Non-Perishable', 'Used in Indo-Chinese preparations and pickling.'),
  i('Soy Sauce', 'Condiment', 'liter', '5 liter can', 'Dry Storage', '365 days', 'Dry Goods', 'Vegetarian, Vegan, Non-Perishable, Contains Soy', 'Used across Indo-Chinese starters and gravies.'),
  i('Rose Syrup', 'Condiment', 'liter', '2 liter bottle', 'Dry Storage', '365 days', 'Dry Goods', 'Vegetarian, Non-Perishable', 'Concentrated rose-flavoured syrup used for Rose Sherbet and layered mocktails.'),
  // DD-001A additions — essential ingredients for beverage, South Indian
  // tempering, Italian, and bakery recipes with no existing substitute.
  i('Tea Leaves', 'Beverage Base', 'kg', '1 kg pouch', 'Dry Storage', '365 days', 'Dry Goods', 'Vegetarian, Vegan, Non-Perishable', 'Loose black tea leaves used for brewed Masala Tea.'),
  i('Coffee Powder', 'Beverage Base', 'kg', '1 kg pouch', 'Dry Storage', '180 days', 'Dry Goods', 'Vegetarian, Vegan, Non-Perishable', 'Roasted coffee-chicory blend used for South Indian filter coffee decoction.'),
  i('Toor Dal', 'Grain', 'kg', '25 kg sack', 'Dry Storage', '180 days', 'Dry Goods', 'Vegetarian, Vegan, Non-Perishable', 'Split pigeon pea lentil, the base of Rasam and Sambhar.'),
  i('Urad Dal', 'Grain', 'kg', '25 kg sack', 'Dry Storage', '180 days', 'Dry Goods', 'Vegetarian, Vegan, Non-Perishable', 'Split black lentil, fermented with rice for Dosa batter.'),
  i('Tamarind', 'Fruit', 'kg', '5 kg block', 'Dry Storage', '180 days', 'Produce', 'Vegetarian, Vegan, Non-Perishable', 'Dried tamarind pulp block, soaked and extracted for souring South Indian and chaat preparations.'),
  i('Pasta', 'Grain', 'kg', '5 kg pack', 'Dry Storage', '365 days', 'Dry Goods', 'Vegetarian, Non-Perishable, Contains Egg (some varieties)', 'Dried Italian pasta used for the live Pasta Counter and Minestrone Soup.'),
  i('Noodles', 'Grain', 'kg', '5 kg pack', 'Dry Storage', '180 days', 'Dry Goods', 'Vegetarian, Non-Perishable', 'Hakka-style wheat noodles used for the live Chinese Wok Counter.'),
  i('Cocoa Powder', 'Bakery', 'kg', '1 kg pouch', 'Dry Storage', '365 days', 'Dry Goods', 'Vegetarian, Non-Perishable', 'Unsweetened cocoa powder used for brownies and dessert-counter garnish.'),
  i('Baking Powder', 'Bakery', 'kg', '500 g pouch', 'Dry Storage', '365 days', 'Dry Goods', 'Vegetarian, Vegan, Non-Perishable', 'Leavening agent used in bakery items such as Chocolate Brownie.'),
  i('Custard Powder', 'Bakery', 'kg', '1 kg pouch', 'Dry Storage', '365 days', 'Dry Goods', 'Vegetarian, Non-Perishable', 'Flavoured cornstarch base used to set Fruit Custard.'),
];

const PRODUCED: Ing[] = [
  i('Brown Gravy', 'Produced Base', 'kg', '5 kg batch', 'Refrigerated', '3 days', 'Kitchen Produced', 'Non-Vegetarian, Perishable', 'House-made base gravy for continental and Chinese-style curries.'),
  i('White Sauce', 'Produced Base', 'kg', '5 kg batch', 'Refrigerated', '2 days', 'Kitchen Produced', 'Vegetarian, Perishable, Contains Dairy', 'Bechamel-style white sauce used for pasta and bakes.'),
  i('Tomato Base', 'Produced Base', 'kg', '10 kg batch', 'Refrigerated', '3 days', 'Kitchen Produced', 'Vegetarian, Vegan, Perishable', 'House-made tomato base used across North Indian gravies.'),
  i('Butter Masala Base', 'Produced Base', 'kg', '10 kg batch', 'Refrigerated', '3 days', 'Kitchen Produced', 'Vegetarian, Perishable, Contains Dairy', 'Rich tomato-butter base used for Butter Chicken and Paneer Butter Masala.'),
  i('Green Chutney', 'Produced Condiment', 'kg', '3 kg batch', 'Refrigerated', '2 days', 'Kitchen Produced', 'Vegetarian, Vegan, Perishable', 'Mint-coriander chutney served with starters and snacks.'),
  i('Mint Chutney', 'Produced Condiment', 'kg', '3 kg batch', 'Refrigerated', '2 days', 'Kitchen Produced', 'Vegetarian, Vegan, Perishable', 'Cooling mint-yogurt chutney served with kebabs.'),
  i('Tamarind Chutney', 'Produced Condiment', 'kg', '5 kg batch', 'Refrigerated', '10 days', 'Kitchen Produced', 'Vegetarian, Vegan, Perishable', 'Sweet-tangy tamarind chutney used for chaat counters.'),
  i('Pizza Sauce', 'Produced Base', 'kg', '5 kg batch', 'Refrigerated', '5 days', 'Kitchen Produced', 'Vegetarian, Vegan, Perishable', 'House-made tomato-herb sauce for live pizza counters.'),
  i('White Gravy', 'Produced Base', 'kg', '5 kg batch', 'Refrigerated', '3 days', 'Kitchen Produced', 'Vegetarian, Perishable, Contains Dairy, Contains Tree Nuts', 'Cashew-based mild gravy used for Malai Kofta and Korma.'),
  i('Makhani Gravy', 'Produced Base', 'kg', '10 kg batch', 'Refrigerated', '3 days', 'Kitchen Produced', 'Vegetarian, Perishable, Contains Dairy', 'Signature buttery tomato gravy used for Dal Makhani and Paneer Makhani.'),
  i('Malai Kofta Gravy', 'Produced Base', 'kg', '5 kg batch', 'Refrigerated', '3 days', 'Kitchen Produced', 'Vegetarian, Perishable, Contains Dairy, Contains Tree Nuts', 'Cashew-cream gravy specifically balanced for Malai Kofta.'),
  i('Manchurian Sauce', 'Produced Base', 'kg', '5 kg batch', 'Refrigerated', '4 days', 'Kitchen Produced', 'Vegetarian, Vegan, Perishable, Contains Soy', 'Indo-Chinese sauce base used for Veg and Chicken Manchurian.'),
  i('Schezwan Sauce', 'Produced Base', 'kg', '5 kg batch', 'Refrigerated', '10 days', 'Kitchen Produced', 'Vegetarian, Vegan, Perishable, Spicy', 'Fiery Indo-Chinese sauce used across live wok counters.'),
  i('Korma Base', 'Produced Base', 'kg', '5 kg batch', 'Refrigerated', '3 days', 'Kitchen Produced', 'Non-Vegetarian, Perishable, Contains Dairy, Contains Tree Nuts', 'Aromatic nut-yogurt base for Chicken and Mutton Korma.'),
  i('Mix Veg Curry', 'Produced Base', 'kg', '5 kg batch', 'Refrigerated', '2 days', 'Kitchen Produced', 'Vegetarian, Perishable', 'Pre-cooked mixed vegetable masala base used as a component in composite dishes such as biryani.'),
  i('Puri', 'Produced Snack', 'piece', 'Batch of 500', 'Cool Dry Storage', '1 day', 'Kitchen Produced', 'Vegetarian, Vegan, Perishable', 'Small crisp-fried wheat-semolina shells, made fresh each service day for the Chaat and Pani Puri counters.'),
];

const PACKAGED: Ing[] = [
  i('Mineral Water', 'Packaged Beverage', 'bottle', 'Case of 24', 'Dry Storage', '365 days', 'Packaged Goods', 'Vegetarian, Vegan, Non-Perishable', 'Sealed bottled drinking water for guest service.'),
  i('Soft Drinks', 'Packaged Beverage', 'bottle', 'Case of 24', 'Dry Storage', '180 days', 'Packaged Goods', 'Vegetarian, Non-Perishable', 'Assorted branded aerated beverages for guest service.'),
  i('Ice Cream Cups', 'Packaged Dessert', 'cup', 'Box of 50', 'Frozen', '180 days', 'Packaged Goods', 'Vegetarian, Perishable (frozen), Contains Dairy', 'Individually packaged ice cream cups for dessert counters.'),
  i('Juice Packs', 'Packaged Beverage', 'pack', 'Case of 27', 'Dry Storage', '120 days', 'Packaged Goods', 'Vegetarian, Vegan, Non-Perishable', 'Tetra-packed fruit juices for welcome and kids service.'),
  i('Butter Portions', 'Packaged Dairy', 'piece', 'Box of 100', 'Refrigerated', '90 days', 'Packaged Goods', 'Vegetarian, Perishable, Contains Dairy', 'Individually wrapped butter portions for bread service.'),
  i('Namkeen Packets', 'Packaged Snack', 'pack', 'Box of 40', 'Dry Storage', '90 days', 'Packaged Goods', 'Vegetarian, Non-Perishable', 'Assorted savoury snack packets for welcome hampers.'),
  i('Papad', 'Packaged Snack', 'piece', 'Pack of 200', 'Dry Storage', '180 days', 'Packaged Goods', 'Vegetarian, Vegan, Non-Perishable', 'Ready-to-fry lentil wafers served alongside main course.'),
  i('Bakery Bread', 'Packaged Bakery', 'loaf', 'Pack of 10', 'Cool Dry Storage', '5 days', 'Packaged Goods', 'Vegetarian, Perishable', 'Sliced bread used for continental breakfast counters.'),
  i('Cookies', 'Packaged Bakery', 'pack', 'Box of 24', 'Dry Storage', '120 days', 'Packaged Goods', 'Vegetarian, Perishable', 'Assorted packaged cookies for tea and coffee counters.'),
];

const CONSUMABLES: Ing[] = [
  i('Aluminium Foil', 'Consumable', 'roll', 'Box of 6 rolls', 'Dry Storage', '730 days', 'Consumables & Packaging', 'Non-Food, Non-Perishable', 'Used for food covering, storage, and chafing dish lining.'),
  i('Butter Paper', 'Consumable', 'pack', 'Pack of 500 sheets', 'Dry Storage', '730 days', 'Consumables & Packaging', 'Non-Food, Non-Perishable', 'Used for lining trays and wrapping snacks.'),
  i('Tissue Paper', 'Consumable', 'pack', 'Case of 20 packs', 'Dry Storage', '730 days', 'Consumables & Packaging', 'Non-Food, Non-Perishable', 'Guest-facing paper napkins for table and buffet service.'),
  i('Tooth Picks', 'Consumable', 'box', 'Case of 50 boxes', 'Dry Storage', '730 days', 'Consumables & Packaging', 'Non-Food, Non-Perishable', 'Used for canape and starter service.'),
  i('Disposable Plates', 'Consumable', 'piece', 'Pack of 100', 'Dry Storage', '730 days', 'Consumables & Packaging', 'Non-Food, Non-Perishable', 'Single-use plates for large-scale buffet service.'),
  i('Disposable Glasses', 'Consumable', 'piece', 'Pack of 100', 'Dry Storage', '730 days', 'Consumables & Packaging', 'Non-Food, Non-Perishable', 'Single-use glasses for beverage service.'),
  i('Wooden Spoon', 'Consumable', 'piece', 'Pack of 100', 'Dry Storage', '730 days', 'Consumables & Packaging', 'Non-Food, Non-Perishable', 'Disposable wooden cutlery for live counters and desserts.'),
  i('Garbage Bags', 'Consumable', 'roll', 'Pack of 10 rolls', 'Dry Storage', '730 days', 'Consumables & Packaging', 'Non-Food, Non-Perishable', 'Heavy-duty bags for kitchen and event-site waste management.'),
  i('Cling Wrap', 'Consumable', 'roll', 'Box of 6 rolls', 'Dry Storage', '730 days', 'Consumables & Packaging', 'Non-Food, Non-Perishable', 'Used for covering prepped ingredients and storage trays.'),
  i('Paper Napkins', 'Consumable', 'pack', 'Case of 20 packs', 'Dry Storage', '730 days', 'Consumables & Packaging', 'Non-Food, Non-Perishable', 'Printed paper napkins for plated and buffet table settings.'),
];

export const ALL: Ing[] = [...PURCHASED, ...PRODUCED, ...PACKAGED, ...CONSUMABLES];

async function main() {
  const pool = getPool();
  const { tenantId, adminId } = await getAdminAndTenant(pool);

  let created = 0;
  let updated = 0;
  const currentYear = new Date().getFullYear();

  for (let index = 0; index < ALL.length; index++) {
    const ing = ALL[index];
    // Deterministic, stable Ingredient Code — ING-{YEAR}-{4-digit sequence}
    // in array order, matching the codebase's {PREFIX}-{YEAR}-{padded
    // sequence} convention. Only takes effect on first insert; upsertByKey
    // reasserts the same value on every rerun since array order is stable,
    // so it never actually changes once a row exists.
    const ingredientCode = `ING-${currentYear}-${String(index + 1).padStart(4, '0')}`;
    const result = await upsertByKey(
      pool,
      'cat_ingredient_master_items',
      { tenant_id: tenantId, name: ing.name },
      {
        ingredient_code: ingredientCode,
        ingredient_type: ing.type,
        base_unit: ing.baseUnit,
        purchase_unit: ing.purchaseUnit,
        storage: ing.storage,
        shelf_life: ing.shelfLife,
        procurement_category: ing.procurementCategory,
        food_characteristics: ing.foodCharacteristics,
        description: ing.description,
        image_url: img(ing.name),
        status: 'ACTIVE',
        updated_at: new Date(),
        updated_by: adminId,
      },
    );
    if (result.created) {
      await pool.query(`UPDATE cat_ingredient_master_items SET created_by = $1 WHERE id = $2`, [adminId, result.id]);
      created++;
    } else {
      updated++;
    }
  }

  console.log(`Ingredient Master: ${created} created, ${updated} updated (of ${ALL.length} total).`);
  await pool.end();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
