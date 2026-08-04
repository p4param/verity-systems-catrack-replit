import { getPool, getAdminAndTenant, upsertByKey } from "./lib/demo-db";

// Official Demo Dataset — Menu Catalog.
// ~150 real, recognizable Indian catering menu items across 12 categories.
// Idempotent: upserts on (tenant_id, name). EM-WP05 schema only — no
// schema changes. "Meal Suitability" and "Serving Style" (requested
// concepts without dedicated columns) are captured via the existing
// serving_notes and description fields rather than adding new columns.

function img(name: string) {
  return `https://placehold.co/400x300/fef3c7/78350f?text=${encodeURIComponent(name)}`;
}

type Dietary = 'VEG' | 'NON_VEG' | 'EGG' | 'VEGAN';

interface MenuItem {
  name: string;
  category: string;
  cuisine: string;
  dietary: Dietary;
  servingStyle: string;
  unit: string;
  description: string;
  dietaryNotes?: string;
}

function m(
  name: string,
  category: string,
  cuisine: string,
  dietary: Dietary,
  servingStyle: string,
  unit: string,
  description: string,
  dietaryNotes = '',
): MenuItem {
  return { name, category, cuisine, dietary, servingStyle, unit, description, dietaryNotes };
}

const WELCOME_DRINKS: MenuItem[] = [
  m('Fresh Lime Soda', 'Welcome Drinks', 'Global', 'VEGAN', 'Live Counter', 'glass', 'Chilled lime juice topped with soda, served sweet, salted, or mixed on request.'),
  m('Jaljeera', 'Welcome Drinks', 'North Indian', 'VEGAN', 'Live Counter', 'glass', 'Tangy cumin-mint cooler, a classic North Indian welcome drink.'),
  m('Virgin Mojito', 'Welcome Drinks', 'Continental', 'VEGAN', 'Live Counter', 'glass', 'Muddled mint and lime cooler topped with soda, served over crushed ice.'),
  m('Watermelon Cooler', 'Welcome Drinks', 'Global', 'VEGAN', 'Buffet', 'glass', 'Fresh watermelon juice served chilled, ideal for summer daytime events.'),
  m('Masala Chaas', 'Welcome Drinks', 'North Indian', 'VEG', 'Live Counter', 'glass', 'Spiced buttermilk tempered with cumin and curry leaves.'),
  m('Pineapple Punch', 'Welcome Drinks', 'Global', 'VEGAN', 'Buffet', 'glass', 'Sweet pineapple-based fruit punch served over ice.'),
  m('Rose Sherbet', 'Welcome Drinks', 'North Indian', 'VEGAN', 'Buffet', 'glass', 'Chilled rose-flavoured sherbet, a traditional wedding welcome drink.'),
  m('Aam Panna', 'Welcome Drinks', 'North Indian', 'VEGAN', 'Buffet', 'glass', 'Raw mango cooler, tangy and refreshing for summer events.'),
  m('Kokum Sherbet', 'Welcome Drinks', 'South Indian', 'VEGAN', 'Buffet', 'glass', 'Tangy kokum-based cooler popular across Western and Southern India.'),
  m('Welcome Mocktail', 'Welcome Drinks', 'Continental', 'VEGAN', 'Live Counter', 'glass', 'Signature layered fruit mocktail crafted for the guest welcome moment.'),
  m('Cranberry Fizz', 'Welcome Drinks', 'Continental', 'VEGAN', 'Buffet', 'glass', 'Cranberry juice topped with soda and a citrus twist.'),
  m('Coconut Water', 'Welcome Drinks', 'South Indian', 'VEGAN', 'Live Counter', 'glass', 'Fresh tender coconut water, served chilled straight from the shell.'),
  m('Thandai', 'Welcome Drinks', 'North Indian', 'VEG', 'Buffet', 'glass', 'Chilled milk-based drink infused with nuts and festive spices.', 'Contains Tree Nuts'),
];

const SOUPS: MenuItem[] = [
  m('Tomato Soup', 'Soups', 'Continental', 'VEG', 'Plated', 'bowl', 'Classic cream of tomato soup finished with a swirl of fresh cream.'),
  m('Sweet Corn Soup', 'Soups', 'Chinese', 'VEG', 'Plated', 'bowl', 'Comforting corn soup, available in vegetable or chicken preparation.'),
  m('Hot & Sour Soup', 'Soups', 'Chinese', 'VEG', 'Plated', 'bowl', 'Spicy and tangy Indo-Chinese soup with julienned vegetables.'),
  m('Manchow Soup', 'Soups', 'Chinese', 'VEG', 'Plated', 'bowl', 'Peppery Indo-Chinese soup topped with crispy fried noodles.'),
  m('Cream of Mushroom Soup', 'Soups', 'Continental', 'VEG', 'Plated', 'bowl', 'Velvety mushroom soup finished with cream and herbs.'),
  m('Lemon Coriander Soup', 'Soups', 'Chinese', 'VEGAN', 'Plated', 'bowl', 'Light, clear soup with fresh lemon and coriander.'),
  m('Paneer Corn Soup', 'Soups', 'Continental', 'VEG', 'Plated', 'bowl', 'Creamy soup with diced paneer and sweet corn kernels.'),
  m('Minestrone Soup', 'Soups', 'Italian', 'VEG', 'Plated', 'bowl', 'Classic Italian vegetable and pasta soup in a light tomato broth.'),
  m('Broccoli Almond Soup', 'Soups', 'Continental', 'VEG', 'Plated', 'bowl', 'Broccoli soup finished with toasted almond flakes.', 'Contains Tree Nuts'),
  m('Spinach Soup', 'Soups', 'Continental', 'VEG', 'Plated', 'bowl', 'Light pureed spinach soup finished with a touch of cream.'),
  m('Rasam', 'Soups', 'South Indian', 'VEGAN', 'Buffet', 'bowl', 'Tangy South Indian tamarind and pepper broth, served as a soup course.'),
  m('Murgh Shorba', 'Soups', 'Mughlai', 'NON_VEG', 'Plated', 'bowl', 'Light spiced chicken broth in the Mughlai tradition.'),
  m('Chicken Clear Soup', 'Soups', 'Continental', 'NON_VEG', 'Plated', 'bowl', 'Light clear chicken broth with fine vegetable julienne.'),
];

const SALADS: MenuItem[] = [
  m('Green Salad', 'Salads', 'Global', 'VEGAN', 'Buffet', 'kg', 'Fresh seasonal cucumber, tomato, and onion salad.'),
  m('Kachumber Salad', 'Salads', 'North Indian', 'VEGAN', 'Buffet', 'kg', 'Finely diced Indian-style salad dressed with lemon and chaat masala.'),
  m('Fruit Salad', 'Salads', 'Global', 'VEGAN', 'Buffet', 'kg', 'Fresh seasonal fruit medley, lightly tossed.'),
  m('Russian Salad', 'Salads', 'Continental', 'VEG', 'Buffet', 'kg', 'Boiled vegetables and mayonnaise salad, a banquet classic.', 'Contains Egg (mayonnaise)'),
  m('Greek Salad', 'Salads', 'Continental', 'VEG', 'Buffet', 'kg', 'Cucumber, olives, and feta-style cheese with a herb dressing.'),
  m('Sprouts Salad', 'Salads', 'North Indian', 'VEGAN', 'Buffet', 'kg', 'Healthy sprouted moong salad with lemon and coriander.'),
  m('Caesar Salad', 'Salads', 'Continental', 'VEG', 'Plated', 'kg', 'Romaine lettuce with Caesar dressing, croutons, and parmesan.', 'Contains Egg, Contains Dairy'),
  m('Pasta Salad', 'Salads', 'Italian', 'VEG', 'Buffet', 'kg', 'Cold pasta salad tossed with vegetables and herb dressing.'),
  m('Chickpea Salad', 'Salads', 'Continental', 'VEGAN', 'Buffet', 'kg', 'Boiled chickpeas tossed with onion, tomato, and lemon dressing.'),
  m('Curd Salad (Raita)', 'Salads', 'North Indian', 'VEG', 'Buffet', 'kg', 'Whisked curd with cucumber, boondi, or pineapple variants.'),
  m('Coleslaw', 'Salads', 'Continental', 'VEG', 'Buffet', 'kg', 'Shredded cabbage and carrot salad in a creamy dressing.'),
  m('Fattoush', 'Salads', 'Continental', 'VEGAN', 'Buffet', 'kg', 'Levantine-style salad with toasted pita and sumac dressing.'),
];

const VEG_STARTERS: MenuItem[] = [
  m('Paneer Tikka', 'Veg Starters', 'North Indian', 'VEG', 'Live Counter', 'plate', 'Char-grilled marinated cottage cheese cubes from the tandoor.'),
  m('Hara Bhara Kabab', 'Veg Starters', 'North Indian', 'VEGAN', 'Plated', 'plate', 'Spinach and green pea patties, shallow fried and lightly spiced.'),
  m('Veg Seekh Kabab', 'Veg Starters', 'North Indian', 'VEGAN', 'Live Counter', 'plate', 'Skewered minced vegetable kababs grilled in the tandoor.'),
  m('Aloo Tikki', 'Veg Starters', 'North Indian', 'VEGAN', 'Live Counter', 'plate', 'Crisp shallow-fried spiced potato patties.'),
  m('Crispy Corn', 'Veg Starters', 'Chinese', 'VEG', 'Plated', 'plate', 'Golden fried corn kernels tossed in a peppery seasoning.'),
  m('Veg Manchurian', 'Veg Starters', 'Chinese', 'VEGAN', 'Live Counter', 'plate', 'Fried vegetable dumplings tossed in a tangy Indo-Chinese sauce.', 'Contains Soy'),
  m('Paneer 65', 'Veg Starters', 'South Indian', 'VEG', 'Plated', 'plate', 'Spicy deep-fried paneer tossed in South Indian style seasoning.'),
  m('Chilli Paneer', 'Veg Starters', 'Chinese', 'VEG', 'Live Counter', 'plate', 'Crisp paneer tossed with capsicum and onion in a spicy sauce.', 'Contains Soy'),
  m('Mushroom Chilli', 'Veg Starters', 'Chinese', 'VEGAN', 'Live Counter', 'plate', 'Batter-fried mushrooms tossed in a spicy Indo-Chinese sauce.', 'Contains Soy'),
  m('Spring Rolls', 'Veg Starters', 'Chinese', 'VEG', 'Plated', 'plate', 'Crisp fried rolls filled with julienned vegetables.'),
  m('Dahi Kabab', 'Veg Starters', 'North Indian', 'VEG', 'Plated', 'plate', 'Hung curd patties, shallow fried with a crisp coating.'),
  m('Cheese Corn Balls', 'Veg Starters', 'Continental', 'VEG', 'Plated', 'plate', 'Deep-fried balls of cheese and sweet corn.'),
  m('Tandoori Aloo', 'Veg Starters', 'North Indian', 'VEGAN', 'Live Counter', 'plate', 'Baby potatoes marinated and grilled in the tandoor.'),
  m('Paneer Malai Tikka', 'Veg Starters', 'Mughlai', 'VEG', 'Live Counter', 'plate', 'Creamy cheese-marinated cottage cheese, mildly spiced.'),
  m('Vegetable Cutlet', 'Veg Starters', 'Continental', 'VEGAN', 'Plated', 'plate', 'Shallow-fried mixed vegetable patties, a banquet favourite.'),
];

const NONVEG_STARTERS: MenuItem[] = [
  m('Chicken Tikka', 'Non Veg Starters', 'North Indian', 'NON_VEG', 'Live Counter', 'plate', 'Char-grilled marinated chicken chunks from the tandoor.'),
  m('Fish Amritsari', 'Non Veg Starters', 'Punjabi', 'NON_VEG', 'Plated', 'plate', 'Crisp batter-fried fish, an Amritsari street-food classic.'),
  m('Chicken 65', 'Non Veg Starters', 'South Indian', 'NON_VEG', 'Plated', 'plate', 'Spicy deep-fried chicken bites in South Indian style seasoning.'),
  m('Mutton Seekh Kabab', 'Non Veg Starters', 'Mughlai', 'NON_VEG', 'Live Counter', 'plate', 'Skewered minced mutton kababs grilled in the tandoor.'),
  m('Chicken Malai Tikka', 'Non Veg Starters', 'Mughlai', 'NON_VEG', 'Live Counter', 'plate', 'Creamy cheese-marinated chicken, mildly spiced and grilled.'),
  m('Fish Tikka', 'Non Veg Starters', 'North Indian', 'NON_VEG', 'Live Counter', 'plate', 'Marinated fish chunks grilled in the tandoor.'),
  m('Chilli Chicken', 'Non Veg Starters', 'Chinese', 'NON_VEG', 'Live Counter', 'plate', 'Crisp chicken tossed with capsicum and onion in spicy sauce.', 'Contains Soy'),
  m('Tandoori Chicken', 'Non Veg Starters', 'North Indian', 'NON_VEG', 'Live Counter', 'plate', 'Whole spiced chicken leg roasted in the tandoor, a signature dish.'),
  m('Chicken Lollipop', 'Non Veg Starters', 'Chinese', 'NON_VEG', 'Live Counter', 'plate', 'Frenched chicken wings, deep fried and tossed in spicy sauce.'),
  m('Prawns Koliwada', 'Non Veg Starters', 'Continental', 'NON_VEG', 'Plated', 'plate', 'Crisp fried prawns in a spiced batter, a coastal favourite.', 'Contains Shellfish'),
  m('Chicken Reshmi Kabab', 'Non Veg Starters', 'Mughlai', 'NON_VEG', 'Live Counter', 'plate', 'Silky smooth minced chicken kababs, mildly spiced.'),
  m('Mutton Galouti Kabab', 'Non Veg Starters', 'Mughlai', 'NON_VEG', 'Plated', 'plate', 'Melt-in-the-mouth minced mutton kababs from the Lucknowi tradition.'),
  m('Fish Fingers', 'Non Veg Starters', 'Continental', 'NON_VEG', 'Plated', 'plate', 'Crumb-fried fish fingers served with tartar sauce.'),
  m('Chicken Manchurian', 'Non Veg Starters', 'Chinese', 'NON_VEG', 'Live Counter', 'plate', 'Fried chicken tossed in a tangy Indo-Chinese sauce.', 'Contains Soy'),
  m('Amritsari Chicken Tikka', 'Non Veg Starters', 'Punjabi', 'NON_VEG', 'Live Counter', 'plate', 'Deep red spiced chicken tikka, Amritsari style.'),
];

const MAIN_VEG: MenuItem[] = [
  m('Dal Makhani', 'Main Course Veg', 'North Indian', 'VEG', 'Buffet', 'kg', 'Slow-cooked black lentils finished with butter and cream.'),
  m('Shahi Paneer', 'Main Course Veg', 'Mughlai', 'VEG', 'Buffet', 'kg', 'Cottage cheese in a rich, mildly sweet cashew-tomato gravy.', 'Contains Tree Nuts'),
  m('Paneer Butter Masala', 'Main Course Veg', 'North Indian', 'VEG', 'Buffet', 'kg', 'Cottage cheese in a buttery tomato gravy, a banquet favourite.'),
  m('Kadai Paneer', 'Main Course Veg', 'North Indian', 'VEG', 'Buffet', 'kg', 'Paneer and bell peppers tossed in a coarsely ground spice masala.'),
  m('Malai Kofta', 'Main Course Veg', 'Mughlai', 'VEG', 'Buffet', 'kg', 'Fried vegetable-paneer dumplings in a rich cashew-cream gravy.', 'Contains Tree Nuts'),
  m('Chana Masala', 'Main Course Veg', 'North Indian', 'VEGAN', 'Buffet', 'kg', 'Chickpeas simmered in a tangy onion-tomato masala.'),
  m('Mix Veg Curry', 'Main Course Veg', 'North Indian', 'VEGAN', 'Buffet', 'kg', 'Seasonal vegetables simmered in a light spiced gravy.'),
  m('Palak Paneer', 'Main Course Veg', 'North Indian', 'VEG', 'Buffet', 'kg', 'Cottage cheese cubes in a pureed spinach gravy.'),
  m('Paneer Lababdar', 'Main Course Veg', 'North Indian', 'VEG', 'Buffet', 'kg', 'Rich tomato-based paneer preparation finished with cream.'),
  m('Baingan Bharta', 'Main Course Veg', 'North Indian', 'VEGAN', 'Buffet', 'kg', 'Smoky roasted and mashed eggplant cooked with onion and tomato.'),
  m('Aloo Gobi', 'Main Course Veg', 'North Indian', 'VEGAN', 'Buffet', 'kg', 'Dry-style potato and cauliflower preparation with turmeric and cumin.'),
  m('Veg Kolhapuri', 'Main Course Veg', 'Continental', 'VEGAN', 'Buffet', 'kg', 'Mixed vegetables in a spicy Kolhapuri-style masala.'),
  m('Dum Aloo', 'Main Course Veg', 'North Indian', 'VEG', 'Buffet', 'kg', 'Baby potatoes slow-cooked in a spiced yogurt-based gravy.'),
  m('Paneer Do Pyaza', 'Main Course Veg', 'North Indian', 'VEG', 'Buffet', 'kg', 'Paneer cooked with a generous quantity of onions in a light masala.'),
  m('Veg Jalfrezi', 'Main Course Veg', 'Continental', 'VEGAN', 'Buffet', 'kg', 'Julienned vegetables stir-cooked in a tangy tomato-based sauce.'),
];

const MAIN_NONVEG: MenuItem[] = [
  m('Butter Chicken', 'Main Course Non Veg', 'North Indian', 'NON_VEG', 'Buffet', 'kg', 'Tandoori chicken simmered in a buttery tomato gravy, the house signature.'),
  m('Mutton Rogan Josh', 'Main Course Non Veg', 'North Indian', 'NON_VEG', 'Buffet', 'kg', 'Slow-cooked mutton curry in a Kashmiri red chilli gravy.'),
  m('Chicken Curry', 'Main Course Non Veg', 'North Indian', 'NON_VEG', 'Buffet', 'kg', 'Home-style chicken curry cooked with onion-tomato masala.'),
  m('Mutton Curry', 'Main Course Non Veg', 'North Indian', 'NON_VEG', 'Buffet', 'kg', 'Traditional slow-cooked mutton curry with warm spices.'),
  m('Kadai Chicken', 'Main Course Non Veg', 'North Indian', 'NON_VEG', 'Buffet', 'kg', 'Chicken and bell peppers tossed in a coarsely ground spice masala.'),
  m('Fish Curry', 'Main Course Non Veg', 'South Indian', 'NON_VEG', 'Buffet', 'kg', 'Tangy coconut-based fish curry in the coastal tradition.'),
  m('Chicken Chettinad', 'Main Course Non Veg', 'South Indian', 'NON_VEG', 'Buffet', 'kg', 'Fiery Chettinad-style chicken curry with roasted spice blend.'),
  m('Egg Curry', 'Main Course Non Veg', 'North Indian', 'EGG', 'Buffet', 'kg', 'Boiled eggs simmered in a spiced onion-tomato gravy.'),
  m('Chicken Korma', 'Main Course Non Veg', 'Mughlai', 'NON_VEG', 'Buffet', 'kg', 'Mild chicken curry in a rich nut-yogurt based gravy.', 'Contains Tree Nuts, Contains Dairy'),
  m('Mutton Handi', 'Main Course Non Veg', 'North Indian', 'NON_VEG', 'Buffet', 'kg', 'Slow-cooked mutton finished in a sealed handi for deeper flavour.'),
  m('Chicken Do Pyaza', 'Main Course Non Veg', 'North Indian', 'NON_VEG', 'Buffet', 'kg', 'Chicken cooked with a generous quantity of onions in a light masala.'),
  m('Fish Moilee', 'Main Course Non Veg', 'South Indian', 'NON_VEG', 'Buffet', 'kg', 'Kerala-style fish curry in a light coconut-milk gravy.'),
  m('Chicken Kolhapuri', 'Main Course Non Veg', 'Continental', 'NON_VEG', 'Buffet', 'kg', 'Chicken in a spicy Kolhapuri-style masala.'),
  m('Prawn Masala', 'Main Course Non Veg', 'South Indian', 'NON_VEG', 'Buffet', 'kg', 'Prawns cooked in a coastal-style spiced masala.', 'Contains Shellfish'),
  m('Chicken Xacuti', 'Main Course Non Veg', 'Continental', 'NON_VEG', 'Buffet', 'kg', 'Goan-style chicken curry with roasted coconut and spices.'),
];

const RICE: MenuItem[] = [
  m('Veg Biryani', 'Rice', 'Mughlai', 'VEG', 'Buffet', 'kg', 'Layered basmati rice and vegetables cooked in the dum style.'),
  m('Chicken Biryani', 'Rice', 'Mughlai', 'NON_VEG', 'Buffet', 'kg', 'Layered basmati rice and marinated chicken cooked in the dum style.'),
  m('Mutton Biryani', 'Rice', 'Mughlai', 'NON_VEG', 'Buffet', 'kg', 'Layered basmati rice and marinated mutton cooked in the dum style.'),
  m('Jeera Rice', 'Rice', 'North Indian', 'VEGAN', 'Buffet', 'kg', 'Basmati rice tempered with roasted cumin.'),
  m('Steam Rice', 'Rice', 'Global', 'VEGAN', 'Buffet', 'kg', 'Plain steamed rice served as a base accompaniment.'),
  m('Veg Pulao', 'Rice', 'North Indian', 'VEGAN', 'Buffet', 'kg', 'Fragrant basmati rice cooked with mixed vegetables and whole spices.'),
  m('Hyderabadi Biryani', 'Rice', 'South Indian', 'NON_VEG', 'Buffet', 'kg', 'Signature Hyderabadi-style dum biryani with marinated meat.'),
  m('Curd Rice', 'Rice', 'South Indian', 'VEG', 'Buffet', 'kg', 'Comforting rice tempered with curd, mustard, and curry leaves.'),
  m('Lemon Rice', 'Rice', 'South Indian', 'VEGAN', 'Buffet', 'kg', 'Tangy rice tempered with mustard seeds and peanuts.'),
  m('Kashmiri Pulao', 'Rice', 'North Indian', 'VEG', 'Buffet', 'kg', 'Mildly sweet rice preparation with dry fruits and saffron.', 'Contains Tree Nuts'),
  m('Tawa Pulao', 'Rice', 'North Indian', 'VEGAN', 'Live Counter', 'kg', 'Street-style spiced rice tossed on a griddle with vegetables.'),
];

const BREAD: MenuItem[] = [
  m('Butter Naan', 'Bread', 'North Indian', 'VEG', 'Live Counter', 'piece', 'Soft leavened tandoori bread finished with butter.'),
  m('Garlic Naan', 'Bread', 'North Indian', 'VEG', 'Live Counter', 'piece', 'Tandoori naan topped with fresh garlic and coriander.'),
  m('Tandoori Roti', 'Bread', 'North Indian', 'VEGAN', 'Live Counter', 'piece', 'Whole wheat bread baked fresh in the tandoor.'),
  m('Missi Roti', 'Bread', 'Punjabi', 'VEGAN', 'Live Counter', 'piece', 'Spiced gram-flour flatbread baked in the tandoor.'),
  m('Laccha Paratha', 'Bread', 'North Indian', 'VEG', 'Live Counter', 'piece', 'Multi-layered flaky flatbread, pan-roasted with ghee.'),
  m('Kulcha', 'Bread', 'Punjabi', 'VEG', 'Live Counter', 'piece', 'Soft leavened bread, plain or stuffed, baked in the tandoor.'),
  m('Roomali Roti', 'Bread', 'Mughlai', 'VEGAN', 'Live Counter', 'piece', 'Paper-thin handkerchief bread cooked on an inverted griddle.'),
  m('Stuffed Kulcha', 'Bread', 'Punjabi', 'VEG', 'Live Counter', 'piece', 'Tandoori bread stuffed with spiced potato or paneer filling.'),
  m('Plain Naan', 'Bread', 'North Indian', 'VEGAN', 'Live Counter', 'piece', 'Classic soft leavened tandoori bread.'),
  m('Aloo Paratha', 'Bread', 'Punjabi', 'VEG', 'Live Counter', 'piece', 'Whole wheat flatbread stuffed with spiced mashed potato.'),
  m('Cheese Naan', 'Bread', 'North Indian', 'VEG', 'Live Counter', 'piece', 'Tandoori naan stuffed with melted cheese.'),
];

const DESSERTS: MenuItem[] = [
  m('Gulab Jamun', 'Desserts', 'North Indian', 'VEG', 'Buffet', 'piece', 'Soft milk-solid dumplings soaked in rose-cardamom sugar syrup.'),
  m('Rasmalai', 'Desserts', 'North Indian', 'VEG', 'Buffet', 'piece', 'Soft cottage cheese discs soaked in saffron-flavoured sweetened milk.'),
  m('Kulfi', 'Desserts', 'North Indian', 'VEG', 'Live Counter', 'piece', 'Traditional Indian frozen dessert, dense and creamy.'),
  m('Jalebi', 'Desserts', 'North Indian', 'VEG', 'Live Counter', 'piece', 'Crisp fermented batter spirals soaked in sugar syrup, served warm.'),
  m('Ice Cream', 'Desserts', 'Continental', 'VEG', 'Live Counter', 'scoop', 'Assorted flavoured ice cream scoops served fresh at the counter.'),
  m('Moong Dal Halwa', 'Desserts', 'North Indian', 'VEG', 'Buffet', 'kg', 'Rich lentil halwa slow-cooked in ghee, a festive classic.'),
  m('Gajar Ka Halwa', 'Desserts', 'North Indian', 'VEG', 'Buffet', 'kg', 'Grated carrot halwa slow-cooked in milk and ghee.'),
  m('Rasgulla', 'Desserts', 'North Indian', 'VEG', 'Buffet', 'piece', 'Spongy cottage cheese balls in light sugar syrup.'),
  m('Kheer', 'Desserts', 'North Indian', 'VEG', 'Buffet', 'bowl', 'Traditional rice pudding simmered with milk and cardamom.'),
  m('Shahi Tukda', 'Desserts', 'Mughlai', 'VEG', 'Plated', 'piece', 'Fried bread slices soaked in rabri and garnished with nuts.', 'Contains Tree Nuts'),
  m('Motichoor Ladoo', 'Desserts', 'North Indian', 'VEG', 'Buffet', 'piece', 'Fine gram-flour pearls bound in sugar syrup, a festive favourite.'),
  m('Rabri', 'Desserts', 'North Indian', 'VEG', 'Buffet', 'bowl', 'Sweetened, thickened milk reduced slowly and flavoured with cardamom.'),
  m('Fruit Custard', 'Desserts', 'Continental', 'VEG', 'Buffet', 'bowl', 'Chilled custard with mixed seasonal fruits.'),
  m('Chocolate Brownie', 'Desserts', 'Continental', 'VEG', 'Plated', 'piece', 'Rich baked chocolate brownie, served warm or with ice cream.'),
  m('Phirni', 'Desserts', 'North Indian', 'VEG', 'Buffet', 'bowl', 'Ground rice pudding set in earthen bowls, flavoured with saffron.'),
];

const LIVE_COUNTERS: MenuItem[] = [
  m('Chaat Counter', 'Live Counters', 'North Indian', 'VEG', 'Live Counter', 'plate', 'Assorted street-style chaat prepared fresh — pani puri, bhel, and sev puri.'),
  m('Dosa Counter', 'Live Counters', 'South Indian', 'VEG', 'Live Counter', 'piece', 'Fresh dosas made to order with sambhar and chutneys.'),
  m('Pasta Counter', 'Live Counters', 'Italian', 'VEG', 'Live Counter', 'plate', 'Fresh pasta tossed to order in a choice of sauces.'),
  m('Pani Puri Counter', 'Live Counters', 'North Indian', 'VEGAN', 'Live Counter', 'plate', 'Crisp puris filled with spiced tangy water, served fresh.'),
  m('Chinese Wok Counter', 'Live Counters', 'Chinese', 'VEG', 'Live Counter', 'plate', 'Noodles and rice stir-fried live to order.'),
  m('Kulfi Counter', 'Live Counters', 'North Indian', 'VEG', 'Live Counter', 'piece', 'Traditional kulfi sliced and served fresh at the counter.'),
  m('Momo Counter', 'Live Counters', 'Pan-Asian', 'VEG', 'Live Counter', 'plate', 'Steamed or fried dumplings served with spicy chutney.'),
  m('Tikka Counter', 'Live Counters', 'North Indian', 'NON_VEG', 'Live Counter', 'plate', 'Assorted tandoori tikkas grilled fresh to order.'),
  m('Salad Bar', 'Live Counters', 'Global', 'VEG', 'Live Counter', 'plate', 'Build-your-own salad station with fresh greens and toppings.'),
  m('Sundae Counter', 'Live Counters', 'Continental', 'VEG', 'Live Counter', 'bowl', 'Custom-built ice cream sundaes with a choice of toppings.'),
];

const BEVERAGES: MenuItem[] = [
  m('Masala Tea', 'Beverages', 'North Indian', 'VEG', 'Live Counter', 'cup', 'Spiced Indian tea brewed with milk and aromatic spices.'),
  m('Filter Coffee', 'Beverages', 'South Indian', 'VEG', 'Live Counter', 'cup', 'Traditional South Indian decoction coffee served frothy.'),
  m('Cold Coffee', 'Beverages', 'Continental', 'VEG', 'Live Counter', 'glass', 'Chilled blended coffee topped with ice cream.'),
  m('Fresh Fruit Juice', 'Beverages', 'Global', 'VEGAN', 'Live Counter', 'glass', 'Seasonal fresh fruit juice, prepared to order.'),
  m('Buttermilk', 'Beverages', 'North Indian', 'VEG', 'Buffet', 'glass', 'Chilled spiced buttermilk served as a post-meal digestive.'),
  m('Iced Tea', 'Beverages', 'Continental', 'VEGAN', 'Buffet', 'glass', 'Chilled brewed tea with a citrus note.'),
  m('Mineral Water', 'Beverages', 'Global', 'VEGAN', 'Buffet', 'bottle', 'Bottled drinking water for table and buffet service.'),
  m('Soft Drinks', 'Beverages', 'Global', 'VEG', 'Buffet', 'bottle', 'Assorted branded aerated beverages.'),
  m('Lassi', 'Beverages', 'Punjabi', 'VEG', 'Live Counter', 'glass', 'Thick churned yogurt drink, sweet or salted.'),
  m('Nimbu Pani', 'Beverages', 'North Indian', 'VEGAN', 'Buffet', 'glass', 'Classic Indian lemonade served chilled.'),
];

export const ALL: MenuItem[] = [
  ...WELCOME_DRINKS,
  ...SOUPS,
  ...SALADS,
  ...VEG_STARTERS,
  ...NONVEG_STARTERS,
  ...MAIN_VEG,
  ...MAIN_NONVEG,
  ...RICE,
  ...BREAD,
  ...DESSERTS,
  ...LIVE_COUNTERS,
  ...BEVERAGES,
];

async function main() {
  const pool = getPool();
  const { tenantId, adminId } = await getAdminAndTenant(pool);

  let created = 0;
  let updated = 0;

  for (const item of ALL) {
    const result = await upsertByKey(
      pool,
      'cat_menu_catalog_items',
      { tenant_id: tenantId, name: item.name },
      {
        category: item.category,
        cuisine: item.cuisine,
        dietary_type: item.dietary,
        dietary_notes: item.dietaryNotes || null,
        default_unit: item.unit,
        serving_notes: item.servingStyle,
        description: item.description,
        image_url: img(item.name),
        status: 'ACTIVE',
        updated_at: new Date(),
        updated_by: adminId,
      },
    );
    if (result.created) {
      await pool.query(`UPDATE cat_menu_catalog_items SET created_by = $1 WHERE id = $2`, [adminId, result.id]);
      created++;
    } else {
      updated++;
    }
  }

  console.log(`Menu Catalog: ${created} created, ${updated} updated (of ${ALL.length} total).`);
  await pool.end();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
