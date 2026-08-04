import { getPool, getAdminAndTenant } from "./lib/demo-db";

// Official Demo Dataset — Recipe Variants.
// Recipe Variants for ~50 important Menu Catalog Items, 1-4 Variants each,
// exactly one Default Variant per item. Real culinary ingredients drawn
// from the Ingredient Master demo set — no placeholder ingredients.
// Idempotent: upserts Variants on (catalog_item_id, variant_name); fully
// reconciles each Variant's Ingredients/Steps/Equipment on every run.

interface Ing { name: string; qty?: number; unit?: string; notes?: string }
interface Equip { name: string; notes?: string }
interface ExtraVariant {
  name: string;
  summary: string;
  yieldQty?: number;
  yieldUnit?: string;
  yieldNotes?: string;
  extraIngredients?: Ing[];
  excludeIngredients?: string[];
  extraSteps?: string[];
  replaceSteps?: string[];
  extraEquipment?: Equip[];
  quality?: string;
}
interface DishSpec {
  itemName: string;
  summary: string;
  yieldQty: number;
  yieldUnit: string;
  yieldNotes?: string;
  ingredients: Ing[];
  steps: string[];
  equipment: Equip[];
  quality: string;
  extraVariants?: ExtraVariant[];
}

export const DISHES: DishSpec[] = [
  // ---- Flagship dishes (spec-named variant sets) ----
  {
    itemName: 'Paneer Tikka',
    summary: 'Classic tandoori paneer starter, marinated in a spiced yogurt mix and grilled to order.',
    yieldQty: 25, yieldUnit: 'portions', yieldNotes: '4 pieces per portion',
    ingredients: [
      { name: 'Paneer', qty: 2, unit: 'kg', notes: 'Cut into 1.5 inch cubes' },
      { name: 'Curd', qty: 500, unit: 'g', notes: 'Hung for 30 minutes' },
      { name: 'Ginger', qty: 50, unit: 'g', notes: 'Paste' },
      { name: 'Garlic', qty: 50, unit: 'g', notes: 'Paste' },
      { name: 'Red Chilli Powder', qty: 30, unit: 'g' },
      { name: 'Garam Masala', qty: 15, unit: 'g' },
      { name: 'Cooking Oil', qty: 100, unit: 'ml', notes: 'For basting' },
      { name: 'Capsicum', qty: 300, unit: 'g', notes: 'Cut into squares' },
      { name: 'Onion', qty: 300, unit: 'g', notes: 'Cut into squares' },
    ],
    steps: [
      'Whisk curd with ginger-garlic paste, red chilli powder, and garam masala to make the marinade.',
      'Marinate paneer, capsicum, and onion in the mixture for at least 2 hours, refrigerated.',
      'Skewer the marinated paneer alternating with capsicum and onion.',
      'Grill in the tandoor at high heat, basting with oil, until lightly charred on all sides.',
      'Rest briefly, then serve hot with mint chutney and lemon wedges.',
    ],
    equipment: [{ name: 'Tandoor', notes: 'Charcoal or gas-fired' }, { name: 'Skewers', notes: 'Metal, long' }, { name: 'Mixing Bowl' }],
    quality: 'Paneer should be lightly charred at the edges but soft inside; no rubbery texture. Marinade must fully coat each piece.',
    extraVariants: [
      {
        name: 'Premium Banquet',
        summary: 'Elevated version with a saffron-tinted cream marinade, plated individually for premium banquets.',
        yieldNotes: '4 pieces per portion, individually plated',
        extraIngredients: [{ name: 'Fresh Cream', qty: 150, unit: 'g', notes: 'Folded into marinade' }, { name: 'Saffron', qty: 1, unit: 'g', notes: 'Soaked in warm milk' }],
        extraSteps: ['Fold the saffron-milk infusion and fresh cream into the marinade before adding the paneer.'],
        quality: 'Colour should be a rich saffron-orange, not artificially red. Plate individually with garnish.',
      },
      {
        name: 'Outdoor Catering',
        summary: 'Adapted for high-volume outdoor grilling stations with simplified batch handling.',
        yieldQty: 100, yieldUnit: 'portions', yieldNotes: 'Batch-scaled for large outdoor events',
        extraEquipment: [{ name: 'Portable Grill Station', notes: 'Multiple units for parallel grilling' }],
        quality: 'Batch-marinate the night before and hold refrigerated until grilling to manage high-volume service without quality loss.',
      },
    ],
  },
  {
    itemName: 'Dal Makhani',
    summary: 'Slow-cooked black lentils finished with butter and cream — the house signature dal.',
    yieldQty: 10, yieldUnit: 'kg', yieldNotes: 'Serves approximately 65 guests as a buffet dish',
    ingredients: [
      { name: 'Butter', qty: 500, unit: 'g' },
      { name: 'Fresh Cream', qty: 500, unit: 'g' },
      { name: 'Onion', qty: 1, unit: 'kg', notes: 'Finely chopped' },
      { name: 'Tomato', qty: 2, unit: 'kg', notes: 'Pureed' },
      { name: 'Ginger', qty: 100, unit: 'g', notes: 'Paste' },
      { name: 'Garlic', qty: 100, unit: 'g', notes: 'Paste' },
      { name: 'Red Chilli Powder', qty: 40, unit: 'g' },
      { name: 'Garam Masala', qty: 20, unit: 'g' },
      { name: 'Cooking Oil', qty: 150, unit: 'ml' },
    ],
    steps: [
      'Soak whole black lentils overnight, then pressure-cook until fully soft.',
      'Saute onions in oil until golden, then add ginger-garlic paste and cook through.',
      'Add tomato puree and spices, cooking until the oil separates from the masala.',
      'Add the cooked lentils and simmer on low heat for at least 45 minutes, stirring occasionally.',
      'Finish with butter and cream, simmering a further 15 minutes for the signature richness.',
    ],
    equipment: [{ name: 'Pressure Cooker', notes: 'Large capacity, for the lentils' }, { name: 'Heavy-Bottom Handi', notes: 'For slow simmering' }],
    quality: 'Lentils must be fully soft with a creamy, not watery, consistency. Colour should be deep brown, not orange.',
    extraVariants: [
      {
        name: 'Premium',
        summary: 'Extra slow-simmered version finished with a higher cream ratio and a smoked butter tempering for wedding-grade richness.',
        yieldNotes: 'Serves approximately 65 guests, premium richness',
        extraIngredients: [{ name: 'Fresh Cream', qty: 300, unit: 'g', notes: 'Additional, for premium finish' }, { name: 'Ghee', qty: 100, unit: 'g', notes: 'For smoked tempering' }],
        extraSteps: ['Finish with a smoked ghee tempering (dhungar method) just before service for a distinct aroma.'],
        quality: 'Aroma should carry a light smokiness from the tempering step; texture noticeably richer than the Standard variant.',
      },
    ],
  },
  {
    itemName: 'Butter Chicken',
    summary: 'Tandoori chicken simmered in a buttery tomato gravy — the house signature main course.',
    yieldQty: 10, yieldUnit: 'kg', yieldNotes: 'Serves approximately 50 guests as a buffet dish',
    ingredients: [
      { name: 'Chicken', qty: 5, unit: 'kg', notes: 'Boneless, tandoori-grilled' },
      { name: 'Butter', qty: 600, unit: 'g' },
      { name: 'Fresh Cream', qty: 600, unit: 'g' },
      { name: 'Tomato', qty: 3, unit: 'kg', notes: 'Pureed' },
      { name: 'Ginger', qty: 100, unit: 'g', notes: 'Paste' },
      { name: 'Garlic', qty: 100, unit: 'g', notes: 'Paste' },
      { name: 'Cashew', qty: 200, unit: 'g', notes: 'Ground into paste' },
      { name: 'Red Chilli Powder', qty: 40, unit: 'g' },
      { name: 'Garam Masala', qty: 25, unit: 'g' },
    ],
    steps: [
      'Marinate and tandoori-grill the chicken until lightly charred (see Chicken Tikka method).',
      'Prepare the tomato-butter base by cooking tomato puree with ginger-garlic paste and spices.',
      'Blend in the cashew paste for body, then simmer until the gravy thickens.',
      'Add the grilled chicken to the gravy and simmer for 15-20 minutes to absorb the flavour.',
      'Finish with butter and cream, adjusting seasoning before service.',
    ],
    equipment: [{ name: 'Tandoor', notes: 'For grilling the chicken' }, { name: 'Heavy-Bottom Handi' }, { name: 'Hand Blender', notes: 'For a smooth gravy finish' }],
    quality: 'Gravy should be smooth and glossy with visible butter sheen; chicken pieces must remain moist, not dry from double-cooking.',
    extraVariants: [
      {
        name: 'Wedding Premium',
        summary: 'Richer version with extra cream and a nut garnish, portioned for individual wedding plating stations.',
        yieldNotes: 'Serves approximately 50 guests, plated presentation',
        extraIngredients: [{ name: 'Fresh Cream', qty: 300, unit: 'g', notes: 'Additional, for premium finish' }, { name: 'Almonds', qty: 100, unit: 'g', notes: 'Slivered, for garnish' }],
        extraSteps: ['Garnish each serving with slivered almonds and a light cream drizzle at the live station.'],
        quality: 'Presentation-grade finish expected — consistent cream swirl and garnish on every portion at a live plating station.',
      },
    ],
  },

  // ---- Two-variant dishes (Standard + Premium) ----
  {
    itemName: 'Chicken Tikka',
    summary: 'Char-grilled marinated chicken chunks from the tandoor, a banquet staple starter.',
    yieldQty: 25, yieldUnit: 'portions', yieldNotes: '4 pieces per portion',
    ingredients: [
      { name: 'Chicken', qty: 2.5, unit: 'kg', notes: 'Boneless, cut into chunks' },
      { name: 'Curd', qty: 600, unit: 'g' },
      { name: 'Ginger', qty: 60, unit: 'g', notes: 'Paste' },
      { name: 'Garlic', qty: 60, unit: 'g', notes: 'Paste' },
      { name: 'Red Chilli Powder', qty: 35, unit: 'g' },
      { name: 'Garam Masala', qty: 20, unit: 'g' },
      { name: 'Lemon', qty: 4, unit: 'piece', notes: 'Juiced' },
      { name: 'Cooking Oil', qty: 100, unit: 'ml', notes: 'For basting' },
    ],
    steps: [
      'Marinate chicken chunks in curd, ginger-garlic paste, spices, and lemon juice for at least 4 hours.',
      'Skewer the marinated chicken.',
      'Grill in the tandoor, basting with oil, until cooked through with a lightly charred exterior.',
      'Rest briefly before serving with mint chutney and onion rings.',
    ],
    equipment: [{ name: 'Tandoor' }, { name: 'Skewers', notes: 'Metal, long' }],
    quality: 'Chicken must be fully cooked through but remain juicy; char should be visible but not burnt.',
    extraVariants: [
      {
        name: 'Premium Banquet',
        summary: 'Richer malai-style marinade with cream and cheese, plated individually.',
        extraIngredients: [{ name: 'Fresh Cream', qty: 200, unit: 'g' }, { name: 'Cheese', qty: 100, unit: 'g', notes: 'Grated into marinade' }],
        quality: 'Marinade should coat evenly with a visible creamy finish; individual plating expected.',
      },
    ],
  },
  {
    itemName: 'Shahi Paneer',
    summary: 'Cottage cheese in a rich, mildly sweet cashew-tomato gravy.',
    yieldQty: 10, yieldUnit: 'kg', yieldNotes: 'Serves approximately 60 guests as a buffet dish',
    ingredients: [
      { name: 'Paneer', qty: 3, unit: 'kg', notes: 'Cut into cubes' },
      { name: 'Cashew', qty: 400, unit: 'g', notes: 'Ground into paste' },
      { name: 'Tomato', qty: 2, unit: 'kg', notes: 'Pureed' },
      { name: 'Fresh Cream', qty: 500, unit: 'g' },
      { name: 'Onion', qty: 1, unit: 'kg', notes: 'Pureed' },
      { name: 'Ginger', qty: 60, unit: 'g', notes: 'Paste' },
      { name: 'Garlic', qty: 60, unit: 'g', notes: 'Paste' },
      { name: 'Cardamom', qty: 10, unit: 'g' },
    ],
    steps: [
      'Saute onion puree until golden, add ginger-garlic paste and cook through.',
      'Add tomato puree and cook until the raw smell disappears.',
      'Blend in the cashew paste and simmer until the gravy thickens and turns glossy.',
      'Add paneer cubes and simmer gently for 10 minutes without breaking the pieces.',
      'Finish with cream and a pinch of ground cardamom.',
    ],
    equipment: [{ name: 'Heavy-Bottom Handi' }, { name: 'Hand Blender' }],
    quality: 'Gravy should be smooth, mildly sweet, and rich; paneer pieces must hold their shape.',
    extraVariants: [
      {
        name: 'Premium',
        summary: 'Finished with a saffron-cream swirl and silver leaf garnish for premium presentation.',
        extraIngredients: [{ name: 'Saffron', qty: 1, unit: 'g', notes: 'Soaked in warm milk' }],
        extraSteps: ['Swirl the saffron-milk infusion on top just before service for a premium finish.'],
        quality: 'Visible saffron swirl on top; presentation-grade plating expected.',
      },
    ],
  },
  {
    itemName: 'Paneer Butter Masala',
    summary: 'Cottage cheese in a buttery tomato gravy, a banquet favourite.',
    yieldQty: 10, yieldUnit: 'kg', yieldNotes: 'Serves approximately 60 guests as a buffet dish',
    ingredients: [
      { name: 'Paneer', qty: 3, unit: 'kg', notes: 'Cut into cubes' },
      { name: 'Butter', qty: 500, unit: 'g' },
      { name: 'Fresh Cream', qty: 500, unit: 'g' },
      { name: 'Tomato', qty: 2.5, unit: 'kg', notes: 'Pureed' },
      { name: 'Cashew', qty: 200, unit: 'g', notes: 'Ground into paste' },
      { name: 'Ginger', qty: 60, unit: 'g', notes: 'Paste' },
      { name: 'Garlic', qty: 60, unit: 'g', notes: 'Paste' },
      { name: 'Garam Masala', qty: 20, unit: 'g' },
    ],
    steps: [
      'Prepare the tomato-butter base by cooking tomato puree with ginger-garlic paste and butter.',
      'Blend in the cashew paste and simmer until glossy.',
      'Add paneer cubes and simmer gently for 10 minutes.',
      'Finish with cream and a final knob of butter before service.',
    ],
    equipment: [{ name: 'Heavy-Bottom Handi' }, { name: 'Hand Blender' }],
    quality: 'Gravy should have a visible butter sheen and smooth consistency; paneer must remain soft.',
    extraVariants: [
      {
        name: 'Premium',
        summary: 'Extra butter and cream finish with a garnish of fresh cream drizzle, for premium plated service.',
        extraIngredients: [{ name: 'Fresh Cream', qty: 200, unit: 'g', notes: 'For garnish drizzle' }],
        quality: 'Each portion should carry a visible cream drizzle garnish at plating.',
      },
      {
        name: 'Jain',
        summary: 'Garlic-free version tempered with asafoetida (hing), prepared for guests observing Jain dietary requirements.',
        yieldNotes: 'Serves approximately 60 guests as a buffet dish, prepared on dedicated Jain-compliant equipment',
        excludeIngredients: ['Garlic'],
        extraIngredients: [{ name: 'Asafoetida (Hing)', qty: 5, unit: 'g', notes: 'Replaces garlic in the aromatics base' }],
        replaceSteps: [
          'Temper hing (asafoetida) and ginger paste in butter as the aromatics base — no garlic.',
          'Add tomato puree and cook until the oil separates.',
          'Blend in the cashew paste and simmer until glossy.',
          'Add paneer cubes and simmer gently for 10 minutes.',
          'Finish with cream and a final knob of butter before service.',
          'Prepare in a pan reserved for Jain dishes to avoid any cross-contact with onion or garlic.',
        ],
        quality: 'Must contain no trace of garlic or onion; flavour balance relies on the hing tempering rather than the usual aromatics base.',
      },
    ],
  },
  {
    itemName: 'Kadai Paneer',
    summary: 'Paneer and bell peppers tossed in a coarsely ground spice masala.',
    yieldQty: 10, yieldUnit: 'kg', yieldNotes: 'Serves approximately 60 guests as a buffet dish',
    ingredients: [
      { name: 'Paneer', qty: 3, unit: 'kg', notes: 'Cut into cubes' },
      { name: 'Capsicum', qty: 1, unit: 'kg', notes: 'Cut into squares' },
      { name: 'Onion', qty: 1, unit: 'kg', notes: 'Cut into squares' },
      { name: 'Tomato', qty: 1.5, unit: 'kg', notes: 'Chopped' },
      { name: 'Coriander Seeds', qty: 60, unit: 'g', notes: 'Coarsely pounded' },
      { name: 'Red Chilli Powder', qty: 30, unit: 'g' },
      { name: 'Ginger', qty: 50, unit: 'g', notes: 'Julienned' },
    ],
    steps: [
      'Dry roast and coarsely pound coriander seeds to make the signature Kadai masala.',
      'Saute onion and capsicum until slightly charred at the edges, then set aside.',
      'Cook tomatoes with the Kadai masala until the oil separates.',
      'Add paneer and the sauteed vegetables back in, tossing to coat evenly.',
      'Finish with julienned ginger before service.',
    ],
    equipment: [{ name: 'Kadai', notes: 'Traditional wide wok for the signature texture' }],
    quality: 'Vegetables should retain a slight crunch; masala should be coarse, not smooth.',
    extraVariants: [
      {
        name: 'Premium',
        summary: 'Finished with extra ginger julienne and a touch of cream for a milder premium profile.',
        extraIngredients: [{ name: 'Fresh Cream', qty: 150, unit: 'g' }],
        quality: 'Slightly milder heat profile with a light creamy finish, while retaining the coarse Kadai texture.',
      },
    ],
  },
  {
    itemName: 'Malai Kofta',
    summary: 'Fried vegetable-paneer dumplings in a rich cashew-cream gravy.',
    yieldQty: 8, yieldUnit: 'kg', yieldNotes: 'Serves approximately 50 guests as a buffet dish',
    ingredients: [
      { name: 'Paneer', qty: 1.5, unit: 'kg', notes: 'Grated, for the koftas' },
      { name: 'Potato', qty: 1.5, unit: 'kg', notes: 'Boiled and mashed' },
      { name: 'Cashew', qty: 300, unit: 'g', notes: 'Ground into paste, for gravy' },
      { name: 'Fresh Cream', qty: 500, unit: 'g' },
      { name: 'Tomato', qty: 1.5, unit: 'kg', notes: 'Pureed' },
      { name: 'Maida', qty: 200, unit: 'g', notes: 'For binding the koftas' },
      { name: 'Cooking Oil', qty: 1, unit: 'liter', notes: 'For deep frying' },
    ],
    steps: [
      'Mix grated paneer, mashed potato, and maida to form a dough; shape into koftas.',
      'Deep fry the koftas until golden brown; drain and set aside.',
      'Prepare a rich cashew-tomato gravy, simmering until smooth and glossy.',
      'Finish the gravy with cream.',
      'Pour the gravy over the koftas just before service to keep them from softening too early.',
    ],
    equipment: [{ name: 'Deep Fryer' }, { name: 'Hand Blender' }],
    quality: 'Koftas must hold their shape without breaking apart; gravy should be silky, not grainy.',
    extraVariants: [
      {
        name: 'Premium',
        summary: 'Koftas enriched with dry fruit stuffing and a saffron-cream gravy for premium events.',
        extraIngredients: [{ name: 'Raisins', qty: 100, unit: 'g', notes: 'Stuffed into koftas' }, { name: 'Saffron', qty: 1, unit: 'g' }],
        extraSteps: ['Stuff each kofta with a few raisins and cashew pieces before frying for a surprise centre.'],
        quality: 'Each kofta should reveal a dry-fruit centre when cut; gravy should carry a visible saffron hue.',
      },
    ],
  },
  {
    itemName: 'Mutton Rogan Josh',
    summary: 'Slow-cooked mutton curry in a Kashmiri red chilli gravy.',
    yieldQty: 10, yieldUnit: 'kg', yieldNotes: 'Serves approximately 50 guests as a buffet dish',
    ingredients: [
      { name: 'Mutton', qty: 5, unit: 'kg', notes: 'Bone-in curry cut' },
      { name: 'Curd', qty: 600, unit: 'g' },
      { name: 'Onion', qty: 1.5, unit: 'kg', notes: 'Sliced' },
      { name: 'Ginger', qty: 100, unit: 'g', notes: 'Paste' },
      { name: 'Garlic', qty: 100, unit: 'g', notes: 'Paste' },
      { name: 'Red Chilli Powder', qty: 80, unit: 'g', notes: 'Kashmiri variety for colour' },
      { name: 'Cinnamon', qty: 15, unit: 'g' },
      { name: 'Cloves', qty: 10, unit: 'g' },
      { name: 'Cooking Oil', qty: 300, unit: 'ml' },
    ],
    steps: [
      'Marinate mutton in curd and half the spices for at least 2 hours.',
      'Brown sliced onions in oil until deep golden, then set aside a portion for garnish.',
      'Add ginger-garlic paste and whole spices, cooking until aromatic.',
      'Add the marinated mutton and sear on high heat, then reduce and slow-cook until tender, adding water as needed.',
      'Finish with Kashmiri chilli powder for the signature deep red colour.',
    ],
    equipment: [{ name: 'Heavy-Bottom Handi' }, { name: 'Pressure Cooker', notes: 'Optional, to speed up tenderising' }],
    quality: 'Mutton must be fork-tender; gravy should carry the signature deep red colour without excessive heat.',
    extraVariants: [
      {
        name: 'Premium',
        summary: 'Extra slow-braised version finished with fried onion garnish for a richer, wedding-grade presentation.',
        extraIngredients: [{ name: 'Onion', qty: 300, unit: 'g', notes: 'Extra, fried crisp for garnish' }],
        extraSteps: ['Garnish generously with crisp fried onions just before service.'],
        quality: 'Mutton should be noticeably more tender than the Standard variant from extended slow braising.',
      },
    ],
  },
  {
    itemName: 'Chicken Chettinad',
    summary: 'Fiery Chettinad-style chicken curry with a roasted spice blend.',
    yieldQty: 10, yieldUnit: 'kg', yieldNotes: 'Serves approximately 55 guests as a buffet dish',
    ingredients: [
      { name: 'Chicken', qty: 5, unit: 'kg', notes: 'Curry cut' },
      { name: 'Coconut', qty: 2, unit: 'piece', notes: 'Grated' },
      { name: 'Coriander Seeds', qty: 80, unit: 'g' },
      { name: 'Black Pepper', qty: 30, unit: 'g' },
      { name: 'Fennel Seeds', qty: 20, unit: 'g' },
      { name: 'Onion', qty: 1, unit: 'kg', notes: 'Chopped' },
      { name: 'Tomato', qty: 1, unit: 'kg', notes: 'Chopped' },
      { name: 'Cooking Oil', qty: 250, unit: 'ml' },
    ],
    steps: [
      'Dry roast grated coconut, coriander seeds, black pepper, and fennel; grind into a Chettinad masala paste.',
      'Saute onions until golden, add the ground masala paste and cook until fragrant.',
      'Add tomatoes and cook until the oil separates.',
      'Add chicken and cook covered until tender, adjusting liquid to reach a thick gravy consistency.',
    ],
    equipment: [{ name: 'Stone Grinder or Mixer', notes: 'For the roasted masala paste' }, { name: 'Heavy-Bottom Handi' }],
    quality: 'Masala must be freshly roasted and ground for authentic aroma; gravy should be thick, not watery.',
    extraVariants: [
      {
        name: 'Premium',
        summary: 'Finished with a curry leaf and coconut oil tempering for an authentic premium finish.',
        extraIngredients: [{ name: 'Cooking Oil', qty: 50, unit: 'ml', notes: 'Coconut oil for tempering' }],
        extraSteps: ['Finish with a curry leaf tempering in coconut oil just before service.'],
        quality: 'Distinct coconut-oil aroma should be present at service, not just in the base masala.',
      },
    ],
  },
  {
    itemName: 'Chicken Korma',
    summary: 'Mild chicken curry in a rich nut-yogurt based gravy.',
    yieldQty: 10, yieldUnit: 'kg', yieldNotes: 'Serves approximately 55 guests as a buffet dish',
    ingredients: [
      { name: 'Chicken', qty: 5, unit: 'kg', notes: 'Curry cut' },
      { name: 'Curd', qty: 800, unit: 'g' },
      { name: 'Cashew', qty: 300, unit: 'g', notes: 'Ground into paste' },
      { name: 'Almonds', qty: 150, unit: 'g', notes: 'Ground into paste' },
      { name: 'Onion', qty: 1, unit: 'kg', notes: 'Fried and ground into paste' },
      { name: 'Cardamom', qty: 15, unit: 'g' },
      { name: 'Cinnamon', qty: 10, unit: 'g' },
    ],
    steps: [
      'Fry onions until deep golden, then grind into a smooth paste.',
      'Whisk curd with cashew and almond paste until smooth.',
      'Cook the onion paste with whole spices until fragrant, then add chicken and sear lightly.',
      'Add the curd-nut mixture gradually on low heat, stirring continuously to prevent curdling.',
      'Simmer until the chicken is tender and the gravy is rich and creamy.',
    ],
    equipment: [{ name: 'Heavy-Bottom Handi' }, { name: 'Mixer/Grinder', notes: 'For nut and onion pastes' }],
    quality: 'Gravy must be smooth with no curdling; flavour should be mild and rich, not spicy.',
    extraVariants: [
      {
        name: 'Premium',
        summary: 'Finished with a pistachio garnish and extra saffron for premium wedding presentation.',
        extraIngredients: [{ name: 'Pistachios', qty: 100, unit: 'g', notes: 'Slivered, for garnish' }, { name: 'Saffron', qty: 1, unit: 'g' }],
        quality: 'Visible pistachio garnish and saffron hue expected on every portion.',
      },
    ],
  },
  {
    itemName: 'Veg Biryani',
    summary: 'Layered basmati rice and vegetables cooked in the dum style.',
    yieldQty: 12, yieldUnit: 'kg', yieldNotes: 'Serves approximately 60 guests as a buffet dish',
    ingredients: [
      { name: 'Basmati Rice', qty: 5, unit: 'kg' },
      { name: 'Mix Veg Curry', qty: 3, unit: 'kg', notes: 'Pre-cooked vegetable masala base' },
      { name: 'Curd', qty: 500, unit: 'g' },
      { name: 'Mint', qty: 100, unit: 'g' },
      { name: 'Coriander', qty: 100, unit: 'g' },
      { name: 'Cardamom', qty: 10, unit: 'g' },
      { name: 'Cinnamon', qty: 10, unit: 'g' },
      { name: 'Ghee', qty: 200, unit: 'g' },
    ],
    steps: [
      'Par-cook basmati rice with whole spices until 70% done; drain and set aside.',
      'Layer the vegetable masala base with the par-cooked rice in a heavy-bottomed pot, alternating layers.',
      'Top with fried onions, mint, coriander, and a drizzle of ghee.',
      'Seal the pot and cook on dum (low heat) for 20-25 minutes to finish cooking through steam.',
      'Gently fluff and mix just before service to avoid breaking the rice grains.',
    ],
    equipment: [{ name: 'Heavy-Bottom Handi', notes: 'For dum cooking' }, { name: 'Dough', notes: 'For sealing the lid (optional)' }],
    quality: 'Rice grains must be separate and fully cooked, not mushy or undercooked at the centre.',
    extraVariants: [
      {
        name: 'Premium',
        summary: 'Enriched with saffron milk and a dry-fruit garnish for premium event presentation.',
        extraIngredients: [{ name: 'Saffron', qty: 1, unit: 'g', notes: 'Soaked in warm milk' }, { name: 'Cashew', qty: 100, unit: 'g', notes: 'Fried, for garnish' }],
        extraSteps: ['Drizzle saffron milk over the top layer before sealing for dum.'],
        quality: 'Visible saffron-coloured rice strands throughout; garnished generously at plating.',
      },
    ],
  },
  {
    itemName: 'Chicken Biryani',
    summary: 'Layered basmati rice and marinated chicken cooked in the dum style.',
    yieldQty: 15, yieldUnit: 'kg', yieldNotes: 'Serves approximately 60 guests as a buffet dish',
    ingredients: [
      { name: 'Basmati Rice', qty: 6, unit: 'kg' },
      { name: 'Chicken', qty: 5, unit: 'kg', notes: 'Bone-in curry cut, marinated' },
      { name: 'Curd', qty: 800, unit: 'g' },
      { name: 'Onion', qty: 1.5, unit: 'kg', notes: 'Fried, for layering' },
      { name: 'Mint', qty: 150, unit: 'g' },
      { name: 'Coriander', qty: 150, unit: 'g' },
      { name: 'Ghee', qty: 300, unit: 'g' },
      { name: 'Saffron', qty: 1, unit: 'g' },
    ],
    steps: [
      'Marinate chicken in curd and spices for at least 4 hours.',
      'Par-cook the marinated chicken partially, or cook raw-layered depending on house method.',
      'Par-cook basmati rice with whole spices until 70% done.',
      'Layer chicken and rice alternately in a heavy pot, topping with fried onions, herbs, and saffron milk.',
      'Seal and cook on dum for 25-30 minutes, then rest for 10 minutes before opening.',
    ],
    equipment: [{ name: 'Heavy-Bottom Handi', notes: 'For dum cooking' }],
    quality: 'Chicken must be fully cooked and tender; rice grains separate with visible saffron streaks.',
    extraVariants: [
      {
        name: 'Premium',
        summary: 'Prepared with premium cuts and an extra dum resting time for deeper flavour infusion.',
        extraIngredients: [{ name: 'Fresh Cream', qty: 100, unit: 'g', notes: 'Added to marinade for richness' }],
        quality: 'Noticeably deeper spice infusion from the extended dum rest; premium boneless-leg cuts preferred.',
      },
    ],
  },
  {
    itemName: 'Mutton Biryani',
    summary: 'Layered basmati rice and marinated mutton cooked in the dum style.',
    yieldQty: 15, yieldUnit: 'kg', yieldNotes: 'Serves approximately 55 guests as a buffet dish',
    ingredients: [
      { name: 'Basmati Rice', qty: 6, unit: 'kg' },
      { name: 'Mutton', qty: 5, unit: 'kg', notes: 'Bone-in curry cut, marinated' },
      { name: 'Curd', qty: 800, unit: 'g' },
      { name: 'Onion', qty: 1.5, unit: 'kg', notes: 'Fried, for layering' },
      { name: 'Mint', qty: 150, unit: 'g' },
      { name: 'Coriander', qty: 150, unit: 'g' },
      { name: 'Ghee', qty: 300, unit: 'g' },
      { name: 'Saffron', qty: 1, unit: 'g' },
    ],
    steps: [
      'Marinate mutton in curd and spices for at least 6 hours for adequate tenderising.',
      'Par-cook the mutton until nearly tender before layering (mutton requires longer cooking than chicken).',
      'Par-cook basmati rice with whole spices until 70% done.',
      'Layer mutton and rice alternately, topping with fried onions, herbs, and saffron milk.',
      'Seal and cook on dum for 35-40 minutes to fully tenderise the mutton.',
    ],
    equipment: [{ name: 'Heavy-Bottom Handi', notes: 'For dum cooking' }, { name: 'Pressure Cooker', notes: 'For pre-tenderising the mutton' }],
    quality: 'Mutton must be fully tender, not chewy; rice grains separate with visible saffron streaks.',
    extraVariants: [
      {
        name: 'Premium',
        summary: 'Prepared with premium leg-cut mutton and a longer dum rest for a richer wedding-grade biryani.',
        extraIngredients: [{ name: 'Fresh Cream', qty: 100, unit: 'g', notes: 'Added to marinade for richness' }],
        quality: 'Leg-cut mutton pieces only; noticeably more tender and aromatic than the Standard variant.',
      },
    ],
  },
  {
    itemName: 'Rasmalai',
    summary: 'Soft cottage cheese discs soaked in saffron-flavoured sweetened milk.',
    yieldQty: 100, yieldUnit: 'pieces', yieldNotes: '2 pieces per portion for 50 guests',
    ingredients: [
      { name: 'Paneer', qty: 2, unit: 'kg', notes: 'Fresh, kneaded smooth for the discs' },
      { name: 'Milk', qty: 8, unit: 'liter', notes: 'Reduced for the rabri base' },
      { name: 'Sugar', qty: 1, unit: 'kg' },
      { name: 'Cardamom', qty: 10, unit: 'g' },
      { name: 'Saffron', qty: 1, unit: 'g' },
      { name: 'Pistachios', qty: 100, unit: 'g', notes: 'Slivered, for garnish' },
    ],
    steps: [
      'Knead fresh paneer until smooth, then shape into small flattened discs.',
      'Poach the discs in a light sugar syrup until they double in size and turn spongy.',
      'Separately reduce milk with sugar and cardamom until thickened into a rabri.',
      'Soak the poached discs in the chilled rabri, infused with saffron.',
      'Garnish with slivered pistachios before service.',
    ],
    equipment: [{ name: 'Heavy-Bottom Pot', notes: 'For reducing the milk' }, { name: 'Wide Poaching Pan' }],
    quality: 'Discs must be soft and spongy, not dense or rubbery; rabri should be thick, not runny.',
    extraVariants: [
      {
        name: 'Premium',
        summary: 'Individually plated with extra saffron and edible silver leaf for premium dessert stations.',
        extraIngredients: [{ name: 'Saffron', qty: 1, unit: 'g', notes: 'Additional, for a deeper hue' }],
        quality: 'Individually plated, generously garnished — presentation-grade for premium dessert counters.',
      },
    ],
  },

  // ---- One-variant dishes (Standard only, always Default) ----
  { itemName: 'Hara Bhara Kabab', summary: 'Spinach and green pea patties, shallow fried and lightly spiced.', yieldQty: 25, yieldUnit: 'portions', yieldNotes: '3 pieces per portion',
    ingredients: [{ name: 'Spinach', qty: 1, unit: 'kg', notes: 'Blanched and chopped' }, { name: 'Green Peas', qty: 500, unit: 'g', notes: 'Boiled' }, { name: 'Potato', qty: 500, unit: 'g', notes: 'Boiled and mashed' }, { name: 'Green Chilli', qty: 30, unit: 'g', notes: 'Finely chopped' }, { name: 'Besan', qty: 100, unit: 'g', notes: 'For binding' }, { name: 'Cooking Oil', qty: 300, unit: 'ml', notes: 'For shallow frying' }],
    steps: ['Blend spinach and peas coarsely with green chilli.', 'Mix with mashed potato and besan to form a firm dough.', 'Shape into patties.', 'Shallow fry on a griddle until golden and crisp on both sides.'],
    equipment: [{ name: 'Griddle (Tawa)' }, { name: 'Mixing Bowl' }],
    quality: 'Patties must hold together without crumbling; colour should stay vibrant green, not dull brown.' },
  { itemName: 'Veg Seekh Kabab', summary: 'Skewered minced vegetable kababs grilled in the tandoor.', yieldQty: 25, yieldUnit: 'portions', yieldNotes: '3 pieces per portion',
    ingredients: [{ name: 'Mushroom', qty: 500, unit: 'g', notes: 'Finely chopped' }, { name: 'Potato', qty: 800, unit: 'g', notes: 'Boiled and mashed' }, { name: 'Green Peas', qty: 300, unit: 'g', notes: 'Boiled and mashed' }, { name: 'Besan', qty: 150, unit: 'g', notes: 'Roasted, for binding' }, { name: 'Garam Masala', qty: 15, unit: 'g' }, { name: 'Cooking Oil', qty: 150, unit: 'ml', notes: 'For basting' }],
    steps: ['Combine chopped mushroom, mashed potato, and peas with roasted besan and spices.', 'Shape the mixture around skewers into cylindrical kababs.', 'Grill in the tandoor, basting with oil, until golden and firm.'],
    equipment: [{ name: 'Tandoor' }, { name: 'Skewers', notes: 'Flat metal, for shaping' }],
    quality: 'Kababs must hold their shape on the skewer without falling apart during grilling.' },
  { itemName: 'Fish Amritsari', summary: 'Crisp batter-fried fish, an Amritsari street-food classic.', yieldQty: 25, yieldUnit: 'portions', yieldNotes: '3 pieces per portion',
    ingredients: [{ name: 'Fish', qty: 3, unit: 'kg', notes: 'Boneless fillets, cut into strips' }, { name: 'Besan', qty: 500, unit: 'g', notes: 'For the batter' }, { name: 'Ginger', qty: 50, unit: 'g', notes: 'Paste' }, { name: 'Garlic', qty: 50, unit: 'g', notes: 'Paste' }, { name: 'Carom Seeds (Ajwain)', qty: 15, unit: 'g' }, { name: 'Cooking Oil', qty: 1, unit: 'liter', notes: 'For deep frying' }],
    steps: ['Marinate fish strips with ginger-garlic paste, carom seeds, and salt.', 'Prepare a thick besan batter and coat each fish strip.', 'Deep fry until golden and crisp on the outside.', 'Serve hot with mint chutney and lemon wedges.'],
    equipment: [{ name: 'Deep Fryer' }],
    quality: 'Batter coating must stay crisp, not soggy; fish inside should be moist and fully cooked.' },
  { itemName: 'Chicken 65', summary: 'Spicy deep-fried chicken bites in South Indian style seasoning.', yieldQty: 25, yieldUnit: 'portions', yieldNotes: '5 pieces per portion',
    ingredients: [{ name: 'Chicken', qty: 3, unit: 'kg', notes: 'Boneless, cut into bite-size pieces' }, { name: 'Curd', qty: 300, unit: 'g' }, { name: 'Red Chilli Powder', qty: 40, unit: 'g' }, { name: 'Ginger', qty: 50, unit: 'g', notes: 'Paste' }, { name: 'Garlic', qty: 50, unit: 'g', notes: 'Paste' }, { name: 'Curry Leaves', qty: 30, unit: 'g' }, { name: 'Cooking Oil', qty: 1, unit: 'liter', notes: 'For deep frying' }],
    steps: ['Marinate chicken in curd, chilli powder, and ginger-garlic paste for at least 1 hour.', 'Deep fry the marinated chicken until crisp and cooked through.', 'Temper curry leaves and green chilli in a little oil, then toss the fried chicken through.'],
    equipment: [{ name: 'Deep Fryer' }, { name: 'Wok', notes: 'For the final tempering toss' }],
    quality: 'Chicken must be spicy, crisp on the outside, and juicy inside; not oily on the plate.' },
  { itemName: 'Mutton Seekh Kabab', summary: 'Skewered minced mutton kababs grilled in the tandoor.', yieldQty: 25, yieldUnit: 'portions', yieldNotes: '3 pieces per portion',
    ingredients: [{ name: 'Mutton', qty: 3, unit: 'kg', notes: 'Minced (keema)' }, { name: 'Onion', qty: 300, unit: 'g', notes: 'Finely chopped' }, { name: 'Ginger', qty: 60, unit: 'g', notes: 'Paste' }, { name: 'Garlic', qty: 60, unit: 'g', notes: 'Paste' }, { name: 'Garam Masala', qty: 20, unit: 'g' }, { name: 'Cooking Oil', qty: 150, unit: 'ml', notes: 'For basting' }],
    steps: ['Mix minced mutton with onion, ginger-garlic paste, and spices; rest for 30 minutes.', 'Shape the mixture around flat skewers.', 'Grill in the tandoor, basting with oil, until cooked through and lightly charred.'],
    equipment: [{ name: 'Tandoor' }, { name: 'Skewers', notes: 'Flat metal' }],
    quality: 'Kababs should be firm enough to hold on the skewer, juicy inside, with a lightly charred crust.' },
  { itemName: 'Palak Paneer', summary: 'Cottage cheese cubes in a pureed spinach gravy.', yieldQty: 10, yieldUnit: 'kg', yieldNotes: 'Serves approximately 60 guests as a buffet dish',
    ingredients: [{ name: 'Paneer', qty: 3, unit: 'kg', notes: 'Cut into cubes' }, { name: 'Spinach', qty: 3, unit: 'kg', notes: 'Blanched and pureed' }, { name: 'Onion', qty: 800, unit: 'g', notes: 'Chopped' }, { name: 'Tomato', qty: 500, unit: 'g', notes: 'Chopped' }, { name: 'Garlic', qty: 50, unit: 'g', notes: 'Paste' }, { name: 'Fresh Cream', qty: 300, unit: 'g' }],
    steps: ['Blanch spinach briefly in boiling water, then puree until smooth.', 'Saute onion, garlic, and tomato until soft.', 'Add the spinach puree and simmer for 10 minutes.', 'Add paneer cubes and simmer gently, finishing with a swirl of cream.'],
    equipment: [{ name: 'Heavy-Bottom Handi' }, { name: 'Hand Blender' }],
    quality: 'Gravy colour must stay vibrant green, not dull or browned from overcooking.' },
  { itemName: 'Chicken Curry', summary: 'Home-style chicken curry cooked with onion-tomato masala.', yieldQty: 10, yieldUnit: 'kg', yieldNotes: 'Serves approximately 55 guests as a buffet dish',
    ingredients: [{ name: 'Chicken', qty: 5, unit: 'kg', notes: 'Curry cut, bone-in' }, { name: 'Onion', qty: 1.5, unit: 'kg', notes: 'Chopped' }, { name: 'Tomato', qty: 1.5, unit: 'kg', notes: 'Chopped' }, { name: 'Ginger', qty: 80, unit: 'g', notes: 'Paste' }, { name: 'Garlic', qty: 80, unit: 'g', notes: 'Paste' }, { name: 'Red Chilli Powder', qty: 50, unit: 'g' }, { name: 'Turmeric', qty: 20, unit: 'g' }, { name: 'Cooking Oil', qty: 250, unit: 'ml' }],
    steps: ['Saute onions until golden, add ginger-garlic paste and cook through.', 'Add tomatoes and spices, cooking until oil separates.', 'Add chicken and sear briefly, then add water and simmer covered until fully cooked.'],
    equipment: [{ name: 'Heavy-Bottom Handi' }],
    quality: 'Chicken must be fully cooked and tender; gravy consistency medium, neither watery nor too thick.' },
  { itemName: 'Jeera Rice', summary: 'Basmati rice tempered with roasted cumin.', yieldQty: 10, yieldUnit: 'kg', yieldNotes: 'Serves approximately 65 guests as a buffet accompaniment',
    ingredients: [{ name: 'Basmati Rice', qty: 5, unit: 'kg' }, { name: 'Cumin Seeds', qty: 60, unit: 'g' }, { name: 'Ghee', qty: 200, unit: 'g' }, { name: 'Bay Leaf', qty: 10, unit: 'g' }],
    steps: ['Wash and soak basmati rice for 20 minutes.', 'Temper cumin seeds and bay leaf in ghee until fragrant.', 'Add the soaked rice and water, cooking until fully done and grains separate.'],
    equipment: [{ name: 'Heavy-Bottom Pot' }],
    quality: 'Grains must be separate and fluffy, with a clear cumin aroma throughout.' },
  { itemName: 'Butter Naan', summary: 'Soft leavened tandoori bread finished with butter.', yieldQty: 100, yieldUnit: 'pieces',
    ingredients: [{ name: 'Maida', qty: 5, unit: 'kg' }, { name: 'Curd', qty: 500, unit: 'g' }, { name: 'Butter', qty: 500, unit: 'g' }, { name: 'Sugar', qty: 50, unit: 'g' }],
    steps: ['Prepare a soft leavened dough with maida, curd, and a touch of sugar; rest for at least 2 hours.', 'Portion and roll into naan shape.', 'Stick to the tandoor wall and bake until puffed and lightly charred.', 'Finish with a brush of butter before service.'],
    equipment: [{ name: 'Tandoor' }],
    quality: 'Naan should be soft and pillowy with light charring, not dry or overly crisp.' },
  { itemName: 'Missi Roti', summary: 'Spiced gram-flour flatbread baked in the tandoor.', yieldQty: 100, yieldUnit: 'pieces',
    ingredients: [{ name: 'Besan', qty: 2, unit: 'kg' }, { name: 'Wheat Flour', qty: 3, unit: 'kg' }, { name: 'Carom Seeds (Ajwain)', qty: 20, unit: 'g' }, { name: 'Coriander', qty: 100, unit: 'g', notes: 'Chopped' }, { name: 'Green Chilli', qty: 40, unit: 'g', notes: 'Finely chopped' }, { name: 'Cooking Oil', qty: 150, unit: 'ml' }],
    steps: ['Knead a firm dough combining besan and wheat flour with carom seeds, chopped coriander, and green chilli.', 'Rest the dough for 20 minutes.', 'Roll into thick rounds and stick to the tandoor wall to bake until puffed with light char spots.'],
    equipment: [{ name: 'Tandoor' }],
    quality: 'Must stay soft with a distinct nutty besan flavour and visible flecks of coriander and green chilli; not dry or overly thick.' },
  { itemName: 'Garlic Naan', summary: 'Tandoori naan topped with fresh garlic and coriander.', yieldQty: 100, yieldUnit: 'pieces',
    ingredients: [{ name: 'Maida', qty: 5, unit: 'kg' }, { name: 'Curd', qty: 500, unit: 'g' }, { name: 'Garlic', qty: 300, unit: 'g', notes: 'Finely chopped' }, { name: 'Coriander', qty: 100, unit: 'g', notes: 'Chopped' }, { name: 'Butter', qty: 400, unit: 'g' }],
    steps: ['Prepare a soft leavened dough with maida and curd; rest for at least 2 hours.', 'Roll into naan shape and press chopped garlic and coriander onto the surface.', 'Stick to the tandoor wall and bake until puffed and golden.', 'Finish with a brush of butter.'],
    equipment: [{ name: 'Tandoor' }],
    quality: 'Garlic topping must be visible and aromatic without burning during the bake.' },
  { itemName: 'Tandoori Roti', summary: 'Whole wheat bread baked fresh in the tandoor.', yieldQty: 100, yieldUnit: 'pieces',
    ingredients: [{ name: 'Wheat Flour', qty: 5, unit: 'kg' }, { name: 'Cooking Oil', qty: 100, unit: 'ml' }],
    steps: ['Knead a firm whole wheat dough and rest for 30 minutes.', 'Roll into thin rounds.', 'Stick to the tandoor wall and bake until puffed with light char spots.'],
    equipment: [{ name: 'Tandoor' }],
    quality: 'Roti should puff up fully during baking and stay soft, not hard or leathery.' },
  { itemName: 'Laccha Paratha', summary: 'Multi-layered flaky flatbread, pan-roasted with ghee.', yieldQty: 100, yieldUnit: 'pieces',
    ingredients: [{ name: 'Wheat Flour', qty: 5, unit: 'kg' }, { name: 'Ghee', qty: 500, unit: 'g' }, { name: 'Cooking Oil', qty: 200, unit: 'ml' }],
    steps: ['Knead a soft dough with wheat flour.', 'Roll, layer with ghee, and fold repeatedly to create the signature layers.', 'Roll out again and pan-roast on a griddle with ghee until golden and crisp-layered.'],
    equipment: [{ name: 'Griddle (Tawa)' }],
    quality: 'Layers must be clearly visible and separate when torn, with a crisp golden exterior.' },
  { itemName: 'Gulab Jamun', summary: 'Soft milk-solid dumplings soaked in rose-cardamom sugar syrup.', yieldQty: 150, yieldUnit: 'pieces',
    ingredients: [{ name: 'Khoya', qty: 2, unit: 'kg' }, { name: 'Maida', qty: 300, unit: 'g', notes: 'For binding' }, { name: 'Sugar', qty: 3, unit: 'kg', notes: 'For the syrup' }, { name: 'Cardamom', qty: 15, unit: 'g' }, { name: 'Cooking Oil', qty: 2, unit: 'liter', notes: 'For deep frying' }],
    steps: ['Knead khoya with a little maida into a smooth, crack-free dough.', 'Shape into small smooth balls.', 'Deep fry on low-medium heat until evenly deep brown.', 'Soak the fried balls in warm cardamom-flavoured sugar syrup for at least 1 hour before serving.'],
    equipment: [{ name: 'Deep Fryer' }, { name: 'Wide Syrup Tray' }],
    quality: 'Balls must be crack-free, evenly browned, and fully soaked through — soft, not doughy, at the centre.' },
  { itemName: 'Kulfi', summary: 'Traditional Indian frozen dessert, dense and creamy.', yieldQty: 100, yieldUnit: 'pieces',
    ingredients: [{ name: 'Milk', qty: 10, unit: 'liter', notes: 'Reduced to a third of the original volume' }, { name: 'Sugar', qty: 1, unit: 'kg' }, { name: 'Cardamom', qty: 15, unit: 'g' }, { name: 'Pistachios', qty: 150, unit: 'g', notes: 'Chopped' }],
    steps: ['Slow-reduce milk in a heavy-bottomed pot, stirring frequently to avoid scorching.', 'Add sugar and cardamom once reduced to roughly a third of the original volume.', 'Pour into kulfi moulds with chopped pistachios and freeze for at least 6 hours.', 'Unmould and slice just before service.'],
    equipment: [{ name: 'Heavy-Bottom Pot' }, { name: 'Kulfi Moulds' }],
    quality: 'Texture should be dense and creamy, not icy; milk must be reduced fully to avoid a thin, watery kulfi.' },
  { itemName: 'Jalebi', summary: 'Crisp fermented batter spirals soaked in sugar syrup, served warm.', yieldQty: 150, yieldUnit: 'pieces',
    ingredients: [{ name: 'Maida', qty: 2, unit: 'kg' }, { name: 'Curd', qty: 300, unit: 'g', notes: 'For fermentation' }, { name: 'Sugar', qty: 3, unit: 'kg', notes: 'For syrup' }, { name: 'Cooking Oil', qty: 2, unit: 'liter', notes: 'For deep frying' }],
    steps: ['Prepare a fermented maida batter with curd, resting for at least 8 hours.', 'Pipe the batter into hot oil in spiral shapes and fry until crisp.', 'Soak the fried spirals in warm sugar syrup briefly before serving.'],
    equipment: [{ name: 'Deep Fryer' }, { name: 'Piping Cloth/Bottle', notes: 'For shaping the spirals' }],
    quality: 'Jalebi must be crisp on the outside with syrup soaked through, served warm — not soggy or cold.' },
  { itemName: 'Gajar Ka Halwa', summary: 'Grated carrot halwa slow-cooked in milk and ghee.', yieldQty: 8, yieldUnit: 'kg', yieldNotes: 'Serves approximately 50 guests',
    ingredients: [{ name: 'Carrot', qty: 5, unit: 'kg', notes: 'Grated' }, { name: 'Milk', qty: 4, unit: 'liter' }, { name: 'Sugar', qty: 1, unit: 'kg' }, { name: 'Ghee', qty: 400, unit: 'g' }, { name: 'Cashew', qty: 100, unit: 'g', notes: 'For garnish' }],
    steps: ['Slow-cook grated carrot in milk until the milk is fully absorbed.', 'Add sugar and continue cooking until the mixture thickens.', 'Finish with ghee and roasted cashew garnish.'],
    equipment: [{ name: 'Heavy-Bottom Pot' }],
    quality: 'Halwa should be moist but not watery; colour should stay a natural orange, not dull brown.' },
  { itemName: 'Tomato Soup', summary: 'Classic cream of tomato soup finished with a swirl of fresh cream.', yieldQty: 10, yieldUnit: 'liter', yieldNotes: 'Approximately 50 bowl portions',
    ingredients: [{ name: 'Tomato', qty: 4, unit: 'kg' }, { name: 'Onion', qty: 500, unit: 'g' }, { name: 'Fresh Cream', qty: 300, unit: 'g' }, { name: 'Butter', qty: 100, unit: 'g' }, { name: 'Black Pepper', qty: 15, unit: 'g' }],
    steps: ['Saute onion in butter, then add chopped tomatoes and cook until soft.', 'Blend until smooth and pass through a sieve for a silky texture.', 'Simmer with seasoning and finish with a cream swirl before service.'],
    equipment: [{ name: 'Hand Blender' }, { name: 'Sieve' }],
    quality: 'Soup should be smooth with no lumps, well-seasoned, and served hot.' },
  { itemName: 'Sweet Corn Soup', summary: 'Comforting corn soup, available in vegetable or chicken preparation.', yieldQty: 10, yieldUnit: 'liter', yieldNotes: 'Approximately 50 bowl portions',
    ingredients: [{ name: 'Sweet Corn', qty: 2, unit: 'kg' }, { name: 'Cooking Oil', qty: 50, unit: 'ml' }, { name: 'Maida', qty: 100, unit: 'g', notes: 'For thickening' }, { name: 'Salt', qty: 30, unit: 'g' }],
    steps: ['Simmer sweet corn kernels in water or stock until soft.', 'Whisk in a maida-water slurry to lightly thicken the soup.', 'Season and simmer for a further 5 minutes before service.'],
    equipment: [{ name: 'Heavy-Bottom Pot' }],
    quality: 'Soup should have a light, non-gluey thickness with corn kernels evenly distributed.' },
  { itemName: 'Hot & Sour Soup', summary: 'Spicy and tangy Indo-Chinese soup with julienned vegetables.', yieldQty: 10, yieldUnit: 'liter', yieldNotes: 'Approximately 50 bowl portions',
    ingredients: [{ name: 'Cabbage', qty: 1, unit: 'kg', notes: 'Julienned' }, { name: 'Carrot', qty: 1, unit: 'kg', notes: 'Julienned' }, { name: 'Capsicum', qty: 500, unit: 'g', notes: 'Julienned' }, { name: 'Vinegar', qty: 100, unit: 'ml' }, { name: 'Soy Sauce', qty: 100, unit: 'ml' }, { name: 'Maida', qty: 100, unit: 'g', notes: 'For thickening' }],
    steps: ['Simmer julienned vegetables in stock until just tender, retaining crunch.', 'Season with vinegar, soy sauce, and chilli for the signature hot-sour balance.', 'Thicken lightly with a maida-water slurry before service.'],
    equipment: [{ name: 'Heavy-Bottom Pot' }],
    quality: 'Vegetables should retain a slight crunch; the hot-sour balance must be distinct, not one-dimensional.' },
  { itemName: 'Green Salad', summary: 'Fresh seasonal cucumber, tomato, and onion salad.', yieldQty: 8, yieldUnit: 'kg', yieldNotes: 'Serves approximately 60 guests as a buffet side',
    ingredients: [{ name: 'Cucumber', qty: 3, unit: 'kg' }, { name: 'Tomato', qty: 2, unit: 'kg' }, { name: 'Onion', qty: 1.5, unit: 'kg' }, { name: 'Lemon', qty: 5, unit: 'piece' }],
    steps: ['Wash and cut all vegetables into uniform bite-size pieces just before service.', 'Toss with lemon juice and a light seasoning of salt and pepper.'],
    equipment: [{ name: 'Mixing Bowl' }],
    quality: 'Vegetables must be cut fresh close to service time to avoid wilting or water release.' },
  { itemName: 'Kachumber Salad', summary: 'Finely diced Indian-style salad dressed with lemon and chaat masala.', yieldQty: 8, yieldUnit: 'kg', yieldNotes: 'Serves approximately 60 guests as a buffet side',
    ingredients: [{ name: 'Cucumber', qty: 2.5, unit: 'kg', notes: 'Finely diced' }, { name: 'Tomato', qty: 2, unit: 'kg', notes: 'Finely diced' }, { name: 'Onion', qty: 1.5, unit: 'kg', notes: 'Finely diced' }, { name: 'Lemon', qty: 5, unit: 'piece' }, { name: 'Coriander', qty: 100, unit: 'g', notes: 'Chopped' }],
    steps: ['Dice all vegetables finely and uniformly.', 'Toss with lemon juice, chopped coriander, and chaat masala just before service.'],
    equipment: [{ name: 'Mixing Bowl' }],
    quality: 'Dice size must be small and uniform; salad should be dressed just before service to stay crisp.' },
  { itemName: 'Fresh Lime Soda', summary: 'Chilled lime juice topped with soda, served sweet, salted, or mixed on request.', yieldQty: 100, yieldUnit: 'glasses',
    ingredients: [{ name: 'Lemon', qty: 8, unit: 'kg', notes: 'Juiced' }, { name: 'Sugar', qty: 3, unit: 'kg' }, { name: 'Salt', qty: 200, unit: 'g' }],
    steps: ['Prepare fresh lime juice and a sugar syrup base in advance.', 'For each glass, combine lime juice, sugar syrup or salt to order, and top with chilled soda.', 'Serve immediately over ice.'],
    equipment: [{ name: 'Live Counter Station' }],
    quality: 'Must be mixed fresh per glass; soda should be added last to retain fizz at the point of service.' },
  { itemName: 'Masala Chaas', summary: 'Spiced buttermilk tempered with cumin and curry leaves.', yieldQty: 100, yieldUnit: 'glasses',
    ingredients: [{ name: 'Curd', qty: 15, unit: 'kg', notes: 'Whisked with water' }, { name: 'Cumin Seeds', qty: 50, unit: 'g', notes: 'Roasted and ground' }, { name: 'Curry Leaves', qty: 30, unit: 'g' }, { name: 'Green Chilli', qty: 50, unit: 'g', notes: 'Finely chopped' }],
    steps: ['Whisk curd with chilled water until smooth and frothy.', 'Season with roasted cumin powder, chopped green chilli, and salt.', 'Temper with curry leaves and serve chilled.'],
    equipment: [{ name: 'Live Counter Station' }],
    quality: 'Must be served well chilled and freshly whisked, not separated or watery.' },
  { itemName: 'Veg Manchurian', summary: 'Fried vegetable dumplings tossed in a tangy Indo-Chinese sauce.', yieldQty: 25, yieldUnit: 'portions',
    ingredients: [{ name: 'Cabbage', qty: 1.5, unit: 'kg', notes: 'Finely chopped' }, { name: 'Carrot', qty: 500, unit: 'g', notes: 'Finely chopped' }, { name: 'Maida', qty: 400, unit: 'g', notes: 'For binding the dumplings' }, { name: 'Manchurian Sauce', qty: 2, unit: 'kg', notes: 'House-made base sauce' }, { name: 'Cooking Oil', qty: 1, unit: 'liter', notes: 'For deep frying' }],
    steps: ['Mix chopped vegetables with maida and seasoning to form a dough.', 'Shape into small balls and deep fry until golden and crisp.', 'Toss the fried dumplings in heated Manchurian sauce just before service.'],
    equipment: [{ name: 'Deep Fryer' }, { name: 'Wok' }],
    quality: 'Dumplings should stay crisp under the sauce, not turn soggy; tossed fresh close to service.' },
  { itemName: 'Chilli Paneer', summary: 'Crisp paneer tossed with capsicum and onion in a spicy sauce.', yieldQty: 25, yieldUnit: 'portions',
    ingredients: [{ name: 'Paneer', qty: 2, unit: 'kg', notes: 'Cut into batons, batter fried' }, { name: 'Capsicum', qty: 800, unit: 'g', notes: 'Cut into squares' }, { name: 'Onion', qty: 800, unit: 'g', notes: 'Cut into squares' }, { name: 'Soy Sauce', qty: 100, unit: 'ml' }, { name: 'Cooking Oil', qty: 500, unit: 'ml', notes: 'For frying' }],
    steps: ['Batter and deep fry paneer batons until crisp and golden.', 'Stir-fry capsicum and onion briefly on high heat to retain crunch.', 'Toss the fried paneer with the vegetables and sauce in a hot wok just before service.'],
    equipment: [{ name: 'Deep Fryer' }, { name: 'Wok' }],
    quality: 'Paneer must stay crisp under the sauce; vegetables should retain a slight crunch.' },
  { itemName: 'Chicken Manchurian', summary: 'Fried chicken tossed in a tangy Indo-Chinese sauce.', yieldQty: 25, yieldUnit: 'portions',
    ingredients: [{ name: 'Chicken', qty: 3, unit: 'kg', notes: 'Boneless, batter fried' }, { name: 'Manchurian Sauce', qty: 2, unit: 'kg', notes: 'House-made base sauce' }, { name: 'Capsicum', qty: 500, unit: 'g', notes: 'Cut into squares' }, { name: 'Cooking Oil', qty: 1, unit: 'liter', notes: 'For deep frying' }],
    steps: ['Batter and deep fry chicken pieces until golden and cooked through.', 'Heat the Manchurian sauce with capsicum in a wok.', 'Toss the fried chicken into the hot sauce just before service.'],
    equipment: [{ name: 'Deep Fryer' }, { name: 'Wok' }],
    quality: 'Chicken must remain crisp under the sauce and fully cooked through; sauce should coat evenly.' },
  { itemName: 'Chilli Chicken', summary: 'Crisp chicken tossed with capsicum and onion in spicy sauce.', yieldQty: 25, yieldUnit: 'portions',
    ingredients: [{ name: 'Chicken', qty: 3, unit: 'kg', notes: 'Boneless, batter fried' }, { name: 'Capsicum', qty: 800, unit: 'g', notes: 'Cut into squares' }, { name: 'Onion', qty: 800, unit: 'g', notes: 'Cut into squares' }, { name: 'Soy Sauce', qty: 100, unit: 'ml' }, { name: 'Green Chilli', qty: 80, unit: 'g', notes: 'Slit' }],
    steps: ['Batter and deep fry chicken until crisp and cooked through.', 'Stir-fry capsicum, onion, and green chilli on high heat.', 'Toss the fried chicken with the vegetables and sauce just before service.'],
    equipment: [{ name: 'Deep Fryer' }, { name: 'Wok' }],
    quality: 'Chicken must stay crisp under the sauce; heat level should be distinctly spicy.' },
  { itemName: 'Chicken Lollipop', summary: 'Frenched chicken wings, deep fried and tossed in spicy sauce.', yieldQty: 25, yieldUnit: 'portions', yieldNotes: '3 pieces per portion',
    ingredients: [{ name: 'Chicken', qty: 3, unit: 'kg', notes: 'Wings, frenched (lollipop cut)' }, { name: 'Red Chilli Powder', qty: 40, unit: 'g' }, { name: 'Ginger', qty: 50, unit: 'g', notes: 'Paste' }, { name: 'Garlic', qty: 50, unit: 'g', notes: 'Paste' }, { name: 'Cooking Oil', qty: 1, unit: 'liter', notes: 'For deep frying' }],
    steps: ['Marinate the frenched wings in spices and ginger-garlic paste for at least 1 hour.', 'Deep fry until fully cooked and crisp.', 'Toss in a light spicy glaze before service.'],
    equipment: [{ name: 'Deep Fryer' }],
    quality: 'Meat must be fully cooked through to the bone; exterior should be crisp, not soggy.' },
  { itemName: 'Prawns Koliwada', summary: 'Crisp fried prawns in a spiced batter, a coastal favourite.', yieldQty: 25, yieldUnit: 'portions', yieldNotes: '4 pieces per portion',
    ingredients: [{ name: 'Prawns', qty: 3, unit: 'kg', notes: 'Cleaned and deveined' }, { name: 'Besan', qty: 400, unit: 'g', notes: 'For the batter' }, { name: 'Red Chilli Powder', qty: 30, unit: 'g' }, { name: 'Ginger', qty: 40, unit: 'g', notes: 'Paste' }, { name: 'Garlic', qty: 40, unit: 'g', notes: 'Paste' }, { name: 'Cooking Oil', qty: 1, unit: 'liter', notes: 'For deep frying' }],
    steps: ['Marinate cleaned prawns in ginger-garlic paste and spices.', 'Coat in a seasoned besan batter.', 'Deep fry until golden and crisp, taking care not to overcook the prawns.'],
    equipment: [{ name: 'Deep Fryer' }],
    quality: 'Prawns must be just-cooked and tender, not rubbery from overfrying.' },
  { itemName: 'Chicken Malai Tikka', summary: 'Creamy cheese-marinated chicken, mildly spiced and grilled.', yieldQty: 25, yieldUnit: 'portions', yieldNotes: '4 pieces per portion',
    ingredients: [{ name: 'Chicken', qty: 2.5, unit: 'kg', notes: 'Boneless, cut into chunks' }, { name: 'Fresh Cream', qty: 400, unit: 'g' }, { name: 'Cheese', qty: 200, unit: 'g', notes: 'Grated' }, { name: 'Ginger', qty: 50, unit: 'g', notes: 'Paste' }, { name: 'Garlic', qty: 50, unit: 'g', notes: 'Paste' }, { name: 'Cardamom', qty: 10, unit: 'g' }],
    steps: ['Marinate chicken in cream, grated cheese, ginger-garlic paste, and cardamom for at least 4 hours.', 'Skewer and grill in the tandoor until cooked through with a light golden colour.'],
    equipment: [{ name: 'Tandoor' }, { name: 'Skewers' }],
    quality: 'Marinade should be mild and creamy, not spicy; chicken must stay moist under the grill.' },
  { itemName: 'Mutton Galouti Kabab', summary: 'Melt-in-the-mouth minced mutton kababs from the Lucknowi tradition.', yieldQty: 25, yieldUnit: 'portions', yieldNotes: '2 pieces per portion',
    ingredients: [{ name: 'Mutton', qty: 2, unit: 'kg', notes: 'Finely minced, tenderised' }, { name: 'Curd', qty: 200, unit: 'g' }, { name: 'Ginger', qty: 40, unit: 'g', notes: 'Paste' }, { name: 'Garlic', qty: 40, unit: 'g', notes: 'Paste' }, { name: 'Garam Masala', qty: 20, unit: 'g' }, { name: 'Ghee', qty: 150, unit: 'g', notes: 'For shallow frying' }],
    steps: ['Combine finely minced mutton with curd, spices, and ginger-garlic paste; rest for at least 2 hours.', 'Shape into small flat patties.', 'Shallow fry in ghee on a griddle until browned on both sides.'],
    equipment: [{ name: 'Griddle (Tawa)' }],
    quality: 'Texture must be extremely tender, almost melting — mince should be worked fine with no coarse bits.' },
  { itemName: 'Fish Curry', summary: 'Tangy coconut-based fish curry in the coastal tradition.', yieldQty: 10, yieldUnit: 'kg', yieldNotes: 'Serves approximately 50 guests as a buffet dish',
    ingredients: [{ name: 'Fish', qty: 4, unit: 'kg', notes: 'Curry cut steaks' }, { name: 'Coconut', qty: 2, unit: 'piece', notes: 'Ground into paste' }, { name: 'Onion', qty: 800, unit: 'g', notes: 'Chopped' }, { name: 'Tomato', qty: 800, unit: 'g', notes: 'Chopped' }, { name: 'Turmeric', qty: 20, unit: 'g' }, { name: 'Red Chilli Powder', qty: 40, unit: 'g' }],
    steps: ['Saute onions until soft, add tomatoes and cook until pulpy.', 'Add the ground coconut paste and spices, simmering until the gravy thickens.', 'Gently add fish steaks and simmer until just cooked through, without breaking the pieces.'],
    equipment: [{ name: 'Heavy-Bottom Handi' }],
    quality: 'Fish must be just-cooked and intact, not falling apart; gravy should carry a distinct coconut flavour.' },
  { itemName: 'Egg Curry', summary: 'Boiled eggs simmered in a spiced onion-tomato gravy.', yieldQty: 8, yieldUnit: 'kg', yieldNotes: 'Serves approximately 50 guests as a buffet dish',
    ingredients: [{ name: 'Eggs', qty: 150, unit: 'piece', notes: 'Boiled and halved' }, { name: 'Onion', qty: 1, unit: 'kg', notes: 'Chopped' }, { name: 'Tomato', qty: 1, unit: 'kg', notes: 'Chopped' }, { name: 'Ginger', qty: 50, unit: 'g', notes: 'Paste' }, { name: 'Garlic', qty: 50, unit: 'g', notes: 'Paste' }, { name: 'Red Chilli Powder', qty: 30, unit: 'g' }],
    steps: ['Saute onions until golden, add ginger-garlic paste and cook through.', 'Add tomatoes and spices, cooking until the oil separates.', 'Add boiled eggs and simmer gently in the gravy for 10 minutes.'],
    equipment: [{ name: 'Heavy-Bottom Handi' }],
    quality: 'Egg yolks should stay intact and gravy well-seasoned, medium consistency.' },
  { itemName: 'Aloo Gobi', summary: 'Dry-style potato and cauliflower preparation with turmeric and cumin.', yieldQty: 8, yieldUnit: 'kg', yieldNotes: 'Serves approximately 55 guests as a buffet dish',
    ingredients: [{ name: 'Potato', qty: 3, unit: 'kg', notes: 'Cut into cubes' }, { name: 'Cauliflower', qty: 3, unit: 'kg', notes: 'Cut into florets' }, { name: 'Cumin Seeds', qty: 30, unit: 'g' }, { name: 'Turmeric', qty: 20, unit: 'g' }, { name: 'Coriander', qty: 50, unit: 'g', notes: 'For garnish' }],
    steps: ['Temper cumin seeds in oil, then add potato and cauliflower.', 'Add turmeric and salt, cover and cook on low heat until just tender.', 'Finish with fresh coriander garnish.'],
    equipment: [{ name: 'Wok or Kadai' }],
    quality: 'Vegetables should be cooked through but retain a slight bite; dish should be dry, not gravied.' },
  { itemName: 'Baingan Bharta', summary: 'Smoky roasted and mashed eggplant cooked with onion and tomato.', yieldQty: 8, yieldUnit: 'kg', yieldNotes: 'Serves approximately 50 guests as a buffet dish',
    ingredients: [{ name: 'Brinjal', qty: 5, unit: 'kg', notes: 'Whole, for open-flame roasting' }, { name: 'Onion', qty: 1, unit: 'kg', notes: 'Chopped' }, { name: 'Tomato', qty: 1, unit: 'kg', notes: 'Chopped' }, { name: 'Green Chilli', qty: 50, unit: 'g', notes: 'Chopped' }, { name: 'Cooking Oil', qty: 200, unit: 'ml' }],
    steps: ['Roast whole brinjals over an open flame until the skin is charred and flesh is soft.', 'Peel and mash the roasted flesh.', 'Saute onion, tomato, and green chilli, then fold in the mashed brinjal and cook through.'],
    equipment: [{ name: 'Open Flame Roasting Station' }],
    quality: 'Smoky flavour must be distinct from the open-flame roasting; texture should be coarsely mashed, not pureed.' },

  // ---- DD-001A additions: full cooking recipes for Menu Template gaps ----
  { itemName: 'Chana Masala', summary: 'Chickpeas simmered in a tangy onion-tomato masala with anardana and dried mango powder.', yieldQty: 8, yieldUnit: 'kg', yieldNotes: 'Serves approximately 55 guests as a buffet dish',
    ingredients: [{ name: 'Chickpeas', qty: 3, unit: 'kg', notes: 'Soaked overnight and boiled until soft' }, { name: 'Onion', qty: 1, unit: 'kg', notes: 'Chopped' }, { name: 'Tomato', qty: 1.5, unit: 'kg', notes: 'Pureed' }, { name: 'Ginger', qty: 50, unit: 'g', notes: 'Paste' }, { name: 'Garlic', qty: 50, unit: 'g', notes: 'Paste' }, { name: 'Red Chilli Powder', qty: 30, unit: 'g' }, { name: 'Garam Masala', qty: 25, unit: 'g', notes: 'Extra, for the chana masala finish' }, { name: 'Cooking Oil', qty: 150, unit: 'ml' }],
    steps: ['Soak chickpeas overnight, then pressure-cook until fully soft.', 'Saute onion until golden, add ginger-garlic paste and cook through.', 'Add tomato puree and spices, cooking until the oil separates.', 'Add the boiled chickpeas with a little cooking liquid and simmer for 15-20 minutes to absorb the masala.', 'Finish with a dusting of extra garam masala before service.'],
    equipment: [{ name: 'Pressure Cooker' }, { name: 'Heavy-Bottom Handi' }],
    quality: 'Chickpeas must be fully soft but intact, not mushy; masala should coat each chickpea, not sit as a separate watery gravy.' },
  { itemName: 'Mix Veg Curry', summary: 'Seasonal vegetables simmered together in a light onion-tomato spiced gravy.', yieldQty: 8, yieldUnit: 'kg', yieldNotes: 'Serves approximately 55 guests as a buffet dish',
    ingredients: [{ name: 'Potato', qty: 1.5, unit: 'kg', notes: 'Cut into cubes' }, { name: 'Carrot', qty: 1, unit: 'kg', notes: 'Cut into cubes' }, { name: 'Cauliflower', qty: 1.5, unit: 'kg', notes: 'Cut into florets' }, { name: 'French Beans', qty: 500, unit: 'g', notes: 'Cut into pieces' }, { name: 'Green Peas', qty: 500, unit: 'g' }, { name: 'Onion', qty: 800, unit: 'g', notes: 'Chopped' }, { name: 'Tomato', qty: 800, unit: 'g', notes: 'Pureed' }, { name: 'Ginger', qty: 40, unit: 'g', notes: 'Paste' }, { name: 'Garlic', qty: 40, unit: 'g', notes: 'Paste' }, { name: 'Red Chilli Powder', qty: 25, unit: 'g' }, { name: 'Turmeric', qty: 15, unit: 'g' }],
    steps: ['Saute onion until golden, add ginger-garlic paste and cook through.', 'Add tomato puree, turmeric, and red chilli powder, cooking until the oil separates.', 'Add the mixed vegetables in order of cooking time — potato and carrot first, then cauliflower and beans, then peas last.', 'Cover and simmer until all vegetables are just tender.'],
    equipment: [{ name: 'Heavy-Bottom Handi' }],
    quality: 'Each vegetable should remain distinctly identifiable and cooked through without turning mushy or breaking apart.' },
  { itemName: 'Veg Pulao', summary: 'Fragrant basmati rice cooked with mixed vegetables and whole spices.', yieldQty: 10, yieldUnit: 'kg', yieldNotes: 'Serves approximately 60 guests as a buffet dish',
    ingredients: [{ name: 'Basmati Rice', qty: 5, unit: 'kg' }, { name: 'Carrot', qty: 500, unit: 'g', notes: 'Diced' }, { name: 'French Beans', qty: 400, unit: 'g', notes: 'Diced' }, { name: 'Green Peas', qty: 400, unit: 'g' }, { name: 'Onion', qty: 400, unit: 'g', notes: 'Sliced' }, { name: 'Cardamom', qty: 10, unit: 'g' }, { name: 'Cinnamon', qty: 10, unit: 'g' }, { name: 'Cloves', qty: 8, unit: 'g' }, { name: 'Ghee', qty: 250, unit: 'g' }],
    steps: ['Wash and soak basmati rice for 20 minutes.', 'Temper whole spices in ghee, then saute sliced onion until translucent.', 'Add the diced vegetables and saute briefly.', 'Add the soaked rice and water, cooking on low heat until the rice is fully done and grains are separate.'],
    equipment: [{ name: 'Heavy-Bottom Pot' }],
    quality: 'Rice grains must stay separate and fluffy; vegetables should be tender but not overcooked into the rice.' },
  { itemName: 'Kashmiri Pulao', summary: 'Mildly sweet basmati rice preparation with dry fruits and saffron.', yieldQty: 8, yieldUnit: 'kg', yieldNotes: 'Serves approximately 50 guests as a buffet dish',
    ingredients: [{ name: 'Basmati Rice', qty: 4, unit: 'kg' }, { name: 'Cashew', qty: 150, unit: 'g', notes: 'Fried, for garnish' }, { name: 'Raisins', qty: 100, unit: 'g', notes: 'Fried, for garnish' }, { name: 'Pistachios', qty: 100, unit: 'g', notes: 'Slivered' }, { name: 'Sugar', qty: 300, unit: 'g' }, { name: 'Ghee', qty: 250, unit: 'g' }, { name: 'Cardamom', qty: 10, unit: 'g' }, { name: 'Saffron', qty: 1, unit: 'g', notes: 'Soaked in warm milk' }],
    steps: ['Wash and soak basmati rice for 20 minutes, then par-boil with cardamom until nearly done.', 'Prepare a light sugar syrup and fold gently through the rice.', 'Fry cashew and raisins in ghee until golden.', 'Layer the rice with the saffron milk and fried dry fruits, then finish on dum for 10 minutes.'],
    equipment: [{ name: 'Heavy-Bottom Handi' }],
    quality: 'Rice should carry a mild natural sweetness with visible saffron colour; dry fruits must be generously distributed, not concentrated only on top.' },
  { itemName: 'Curd Rice', summary: 'Comforting rice tempered with curd, mustard, and curry leaves.', yieldQty: 8, yieldUnit: 'kg', yieldNotes: 'Serves approximately 55 guests as a buffet dish',
    ingredients: [{ name: 'Rice', qty: 3, unit: 'kg' }, { name: 'Curd', qty: 3, unit: 'kg' }, { name: 'Milk', qty: 1, unit: 'liter' }, { name: 'Mustard Seeds', qty: 20, unit: 'g' }, { name: 'Curry Leaves', qty: 20, unit: 'g' }, { name: 'Green Chilli', qty: 30, unit: 'g', notes: 'Finely chopped' }, { name: 'Ginger', qty: 20, unit: 'g', notes: 'Finely chopped' }, { name: 'Cooking Oil', qty: 80, unit: 'ml' }],
    steps: ['Cook rice until soft, slightly overcooked compared to standard steamed rice, then mash lightly.', 'Mix in curd and milk while the rice is still warm for even absorption.', 'Temper mustard seeds, curry leaves, green chilli, and ginger in hot oil.', 'Pour the tempering over the curd rice and mix through; chill before service.'],
    equipment: [{ name: 'Heavy-Bottom Pot' }],
    quality: 'Texture should be soft and creamy, not dry or lumpy; must be well chilled before buffet service.' },
  { itemName: 'Lemon Rice', summary: 'Tangy rice tempered with mustard seeds and roasted cashew.', yieldQty: 8, yieldUnit: 'kg', yieldNotes: 'Serves approximately 55 guests as a buffet dish',
    ingredients: [{ name: 'Rice', qty: 4, unit: 'kg' }, { name: 'Lemon', qty: 15, unit: 'piece', notes: 'Juiced' }, { name: 'Mustard Seeds', qty: 20, unit: 'g' }, { name: 'Curry Leaves', qty: 20, unit: 'g' }, { name: 'Green Chilli', qty: 40, unit: 'g', notes: 'Slit' }, { name: 'Cashew', qty: 150, unit: 'g', notes: 'Fried, for crunch' }, { name: 'Turmeric', qty: 10, unit: 'g' }, { name: 'Cooking Oil', qty: 100, unit: 'ml' }],
    steps: ['Cook rice until grains are separate, then spread out to cool slightly.', 'Temper mustard seeds, curry leaves, green chilli, and cashew in hot oil until the cashew turns golden.', 'Add turmeric to the tempering, then fold through the rice.', 'Finish with fresh lemon juice just before service to preserve the tang.'],
    equipment: [{ name: 'Wok or Kadai' }],
    quality: 'Lemon flavour must be added close to service to stay bright; rice grains should remain separate, not sticky.' },
  { itemName: 'Steam Rice', summary: 'Plain steamed rice served as a base accompaniment.', yieldQty: 8, yieldUnit: 'kg', yieldNotes: 'Serves approximately 60 guests as a buffet accompaniment',
    ingredients: [{ name: 'Rice', qty: 4, unit: 'kg' }, { name: 'Salt', qty: 30, unit: 'g' }],
    steps: ['Wash rice thoroughly until the water runs clear.', 'Cook in salted water at the correct ratio until fully done and grains are separate.', 'Fluff gently with a fork before transferring to the buffet chafing dish.'],
    equipment: [{ name: 'Heavy-Bottom Pot' }],
    quality: 'Grains must be fully cooked and separate, not sticky or underdone at the centre.' },
  { itemName: 'Fish Moilee', summary: 'Kerala-style fish curry in a light coconut-milk gravy.', yieldQty: 8, yieldUnit: 'kg', yieldNotes: 'Serves approximately 45 guests as a buffet dish',
    ingredients: [{ name: 'Fish', qty: 4, unit: 'kg', notes: 'Curry cut steaks' }, { name: 'Coconut', qty: 3, unit: 'piece', notes: 'Ground and extracted for milk' }, { name: 'Onion', qty: 800, unit: 'g', notes: 'Sliced' }, { name: 'Ginger', qty: 50, unit: 'g', notes: 'Julienned' }, { name: 'Green Chilli', qty: 60, unit: 'g', notes: 'Slit' }, { name: 'Curry Leaves', qty: 20, unit: 'g' }, { name: 'Turmeric', qty: 20, unit: 'g' }, { name: 'Cooking Oil', qty: 150, unit: 'ml', notes: 'Coconut oil preferred' }],
    steps: ['Extract thick and thin coconut milk separately from the ground coconut.', 'Saute sliced onion, ginger, green chilli, and curry leaves in oil until soft, without browning.', 'Add turmeric and the thin coconut milk, simmering gently.', 'Add fish steaks and cook through, then finish with the thick coconut milk without letting it boil hard.'],
    equipment: [{ name: 'Heavy-Bottom Handi' }],
    quality: 'Gravy should stay pale and light, never boiled hard after the thick milk is added or it will split.' },
  { itemName: 'Veg Kolhapuri', summary: 'Mixed vegetables in a spicy Kolhapuri-style roasted coconut masala.', yieldQty: 8, yieldUnit: 'kg', yieldNotes: 'Serves approximately 55 guests as a buffet dish',
    ingredients: [{ name: 'Potato', qty: 1, unit: 'kg', notes: 'Cubed' }, { name: 'Cauliflower', qty: 1, unit: 'kg', notes: 'Florets' }, { name: 'Green Peas', qty: 500, unit: 'g' }, { name: 'Capsicum', qty: 500, unit: 'g', notes: 'Cubed' }, { name: 'Coconut', qty: 1, unit: 'piece', notes: 'Roasted and ground' }, { name: 'Coriander Seeds', qty: 40, unit: 'g' }, { name: 'Red Chilli Powder', qty: 40, unit: 'g' }, { name: 'Onion', qty: 500, unit: 'g', notes: 'Chopped' }, { name: 'Tomato', qty: 500, unit: 'g', notes: 'Chopped' }],
    steps: ['Dry roast coconut and coriander seeds, then grind into the Kolhapuri masala paste.', 'Saute onion until golden, add the ground masala paste and cook until fragrant.', 'Add tomatoes and cook until the oil separates.', 'Add the mixed vegetables, cover, and cook until tender in the spiced masala.'],
    equipment: [{ name: 'Stone Grinder or Mixer' }, { name: 'Heavy-Bottom Handi' }],
    quality: 'Masala should be fiery red and coarsely textured from the roasted coconut; vegetables must hold their shape.' },
  { itemName: 'Tandoori Chicken', summary: 'Whole spiced chicken leg roasted in the tandoor, a signature dish.', yieldQty: 25, yieldUnit: 'portions', yieldNotes: 'One leg piece per portion',
    ingredients: [{ name: 'Chicken', qty: 6, unit: 'kg', notes: 'Whole leg pieces, skin removed and scored' }, { name: 'Curd', qty: 1, unit: 'kg' }, { name: 'Ginger', qty: 80, unit: 'g', notes: 'Paste' }, { name: 'Garlic', qty: 80, unit: 'g', notes: 'Paste' }, { name: 'Red Chilli Powder', qty: 50, unit: 'g', notes: 'Kashmiri variety for colour' }, { name: 'Garam Masala', qty: 25, unit: 'g' }, { name: 'Lemon', qty: 6, unit: 'piece', notes: 'Juiced' }, { name: 'Cooking Oil', qty: 150, unit: 'ml', notes: 'For basting' }],
    steps: ['Score the chicken legs deeply to allow marinade penetration.', 'Marinate first in lemon juice and salt, then in the curd-spice mixture for at least 6 hours.', 'Skewer and grill in the tandoor, basting with oil, until fully cooked with a charred exterior.', 'Rest briefly before serving with sliced onion rings and lemon wedges.'],
    equipment: [{ name: 'Tandoor' }, { name: 'Skewers', notes: 'Long, for whole leg pieces' }],
    quality: 'Chicken must be cooked through to the bone with juices running clear, while staying moist; colour should be deep red, not artificially bright.' },
  { itemName: 'Amritsari Chicken Tikka', summary: 'Deep red spiced chicken tikka, Amritsari style.', yieldQty: 25, yieldUnit: 'portions', yieldNotes: '4 pieces per portion',
    ingredients: [{ name: 'Chicken', qty: 2.5, unit: 'kg', notes: 'Boneless, cut into chunks' }, { name: 'Curd', qty: 500, unit: 'g' }, { name: 'Ginger', qty: 50, unit: 'g', notes: 'Paste' }, { name: 'Garlic', qty: 50, unit: 'g', notes: 'Paste' }, { name: 'Red Chilli Powder', qty: 50, unit: 'g', notes: 'Kashmiri variety, generous for the signature deep red colour' }, { name: 'Carom Seeds (Ajwain)', qty: 15, unit: 'g' }, { name: 'Lemon', qty: 4, unit: 'piece', notes: 'Juiced' }, { name: 'Cooking Oil', qty: 100, unit: 'ml', notes: 'For basting' }],
    steps: ['Marinate chicken chunks in curd, ginger-garlic paste, carom seeds, and a generous quantity of Kashmiri chilli powder for at least 4 hours.', 'Skewer and grill in the tandoor, basting with oil, until charred and cooked through.', 'Serve hot with mint chutney and onion rings.'],
    equipment: [{ name: 'Tandoor' }, { name: 'Skewers' }],
    quality: 'Colour must be deep red from the Kashmiri chilli, not an artificial dye; carom seed aroma should be distinct.' },
  { itemName: 'Chicken Reshmi Kabab', summary: 'Silky smooth minced chicken kababs, mildly spiced.', yieldQty: 25, yieldUnit: 'portions', yieldNotes: '3 pieces per portion',
    ingredients: [{ name: 'Chicken', qty: 2.5, unit: 'kg', notes: 'Finely minced' }, { name: 'Fresh Cream', qty: 300, unit: 'g' }, { name: 'Cheese', qty: 150, unit: 'g', notes: 'Grated' }, { name: 'Cashew', qty: 100, unit: 'g', notes: 'Ground into paste' }, { name: 'Ginger', qty: 40, unit: 'g', notes: 'Paste' }, { name: 'Garlic', qty: 40, unit: 'g', notes: 'Paste' }, { name: 'Cardamom', qty: 10, unit: 'g' }],
    steps: ['Combine finely minced chicken with cream, grated cheese, cashew paste, and ginger-garlic paste; rest for at least 3 hours.', 'Shape the mixture around flat skewers, keeping the surface smooth.', 'Grill gently in the tandoor, basting with butter, until cooked through without charring.'],
    equipment: [{ name: 'Tandoor' }, { name: 'Skewers', notes: 'Flat metal' }],
    quality: 'Texture must be silky smooth with no coarse mince visible; colour should stay pale, not charred.' },
  { itemName: 'Fish Tikka', summary: 'Marinated fish chunks grilled in the tandoor.', yieldQty: 25, yieldUnit: 'portions', yieldNotes: '4 pieces per portion',
    ingredients: [{ name: 'Fish', qty: 3, unit: 'kg', notes: 'Boneless, cut into chunks' }, { name: 'Curd', qty: 500, unit: 'g' }, { name: 'Ginger', qty: 40, unit: 'g', notes: 'Paste' }, { name: 'Garlic', qty: 40, unit: 'g', notes: 'Paste' }, { name: 'Red Chilli Powder', qty: 30, unit: 'g' }, { name: 'Carom Seeds (Ajwain)', qty: 10, unit: 'g' }, { name: 'Lemon', qty: 4, unit: 'piece', notes: 'Juiced' }, { name: 'Cooking Oil', qty: 80, unit: 'ml', notes: 'For basting' }],
    steps: ['Marinate fish chunks gently in curd, ginger-garlic paste, spices, and lemon juice for 1-2 hours (fish needs less time than meat).', 'Skewer carefully to avoid breaking the pieces.', 'Grill in the tandoor, basting with oil, until just cooked through.'],
    equipment: [{ name: 'Tandoor' }, { name: 'Skewers' }],
    quality: 'Fish must remain intact on the skewer and stay moist; overcooking will dry it out quickly.' },
  { itemName: 'Paneer 65', summary: 'Spicy deep-fried paneer tossed in South Indian style seasoning.', yieldQty: 25, yieldUnit: 'portions', yieldNotes: '5 pieces per portion',
    ingredients: [{ name: 'Paneer', qty: 2.5, unit: 'kg', notes: 'Cut into bite-size cubes' }, { name: 'Curd', qty: 300, unit: 'g' }, { name: 'Red Chilli Powder', qty: 40, unit: 'g' }, { name: 'Ginger', qty: 40, unit: 'g', notes: 'Paste' }, { name: 'Garlic', qty: 40, unit: 'g', notes: 'Paste' }, { name: 'Curry Leaves', qty: 30, unit: 'g' }, { name: 'Besan', qty: 200, unit: 'g', notes: 'For the crisp coating' }, { name: 'Cooking Oil', qty: 1, unit: 'liter', notes: 'For deep frying' }],
    steps: ['Marinate paneer cubes in curd, chilli powder, and ginger-garlic paste for 30 minutes.', 'Coat lightly in besan and deep fry until crisp and golden.', 'Temper curry leaves and green chilli in a little oil, then toss the fried paneer through.'],
    equipment: [{ name: 'Deep Fryer' }, { name: 'Wok', notes: 'For the final tempering toss' }],
    quality: 'Paneer must stay crisp on the outside and soft inside; not oily on the plate.' },
  { itemName: 'Paneer Malai Tikka', summary: 'Creamy cheese-marinated cottage cheese, mildly spiced.', yieldQty: 25, yieldUnit: 'portions', yieldNotes: '4 pieces per portion',
    ingredients: [{ name: 'Paneer', qty: 2.5, unit: 'kg', notes: 'Cut into cubes' }, { name: 'Fresh Cream', qty: 400, unit: 'g' }, { name: 'Cheese', qty: 200, unit: 'g', notes: 'Grated' }, { name: 'Ginger', qty: 40, unit: 'g', notes: 'Paste' }, { name: 'Garlic', qty: 40, unit: 'g', notes: 'Paste' }, { name: 'Cardamom', qty: 10, unit: 'g' }],
    steps: ['Marinate paneer cubes in cream, grated cheese, ginger-garlic paste, and cardamom for at least 2 hours.', 'Skewer and grill in the tandoor until lightly golden, taking care not to dry out the paneer.'],
    equipment: [{ name: 'Tandoor' }, { name: 'Skewers' }],
    quality: 'Marinade should be mild and creamy, not spicy; paneer must stay soft, not rubbery from overgrilling.' },
  { itemName: 'Paneer Lababdar', summary: 'Rich tomato-based paneer preparation finished with cream.', yieldQty: 10, yieldUnit: 'kg', yieldNotes: 'Serves approximately 60 guests as a buffet dish',
    ingredients: [{ name: 'Paneer', qty: 3, unit: 'kg', notes: 'Cut into cubes' }, { name: 'Butter', qty: 400, unit: 'g' }, { name: 'Fresh Cream', qty: 500, unit: 'g' }, { name: 'Tomato', qty: 2.5, unit: 'kg', notes: 'Pureed' }, { name: 'Cashew', qty: 200, unit: 'g', notes: 'Ground into paste' }, { name: 'Ginger', qty: 60, unit: 'g', notes: 'Paste' }, { name: 'Garlic', qty: 60, unit: 'g', notes: 'Paste' }, { name: 'Kasuri Methi', qty: 20, unit: 'g' }],
    steps: ['Prepare a tomato-butter base by cooking tomato puree with ginger-garlic paste and butter.', 'Blend in the cashew paste and simmer until thick and glossy.', 'Add paneer cubes and simmer gently for 10 minutes.', 'Crush and add kasuri methi, finishing with cream just before service.'],
    equipment: [{ name: 'Heavy-Bottom Handi' }, { name: 'Hand Blender' }],
    quality: 'Gravy should be smooth, deep orange-red, with a distinct crushed kasuri methi aroma.' },
  { itemName: 'Dahi Kabab', summary: 'Hung curd patties, shallow fried with a crisp coating.', yieldQty: 25, yieldUnit: 'portions', yieldNotes: '3 pieces per portion',
    ingredients: [{ name: 'Curd', qty: 3, unit: 'kg', notes: 'Hung overnight to remove all whey' }, { name: 'Potato', qty: 500, unit: 'g', notes: 'Boiled and mashed, for binding' }, { name: 'Green Chilli', qty: 30, unit: 'g', notes: 'Finely chopped' }, { name: 'Besan', qty: 150, unit: 'g', notes: 'Roasted, for the coating' }, { name: 'Cooking Oil', qty: 300, unit: 'ml', notes: 'For shallow frying' }],
    steps: ['Hang curd overnight in a muslin cloth until all whey drains and it is thick like cream cheese.', 'Mix the hung curd with mashed potato, green chilli, and salt to form a firm mixture.', 'Shape into flat patties and coat in roasted besan.', 'Shallow fry on a griddle until golden and crisp on both sides.'],
    equipment: [{ name: 'Griddle (Tawa)' }],
    quality: 'Curd must be hung long enough to hold its shape when fried; centre should stay soft and creamy.' },
  { itemName: 'Crispy Corn', summary: 'Golden fried corn kernels tossed in a peppery seasoning.', yieldQty: 25, yieldUnit: 'portions',
    ingredients: [{ name: 'Sweet Corn', qty: 2.5, unit: 'kg' }, { name: 'Maida', qty: 400, unit: 'g', notes: 'For the light batter coating' }, { name: 'Black Pepper', qty: 30, unit: 'g', notes: 'Freshly crushed' }, { name: 'Green Chilli', qty: 40, unit: 'g', notes: 'Finely chopped' }, { name: 'Cooking Oil', qty: 1, unit: 'liter', notes: 'For deep frying' }],
    steps: ['Pat sweet corn kernels dry, then dust lightly in seasoned maida.', 'Deep fry in small batches until golden and crisp.', 'Toss the fried corn with crushed black pepper and chopped green chilli while still hot.'],
    equipment: [{ name: 'Deep Fryer' }, { name: 'Wok', notes: 'For the final toss' }],
    quality: 'Corn must stay crisp with a light, non-greasy coating; pepper seasoning should be sharp and freshly crushed.' },
  { itemName: 'Cheese Corn Balls', summary: 'Deep-fried balls of cheese and sweet corn.', yieldQty: 25, yieldUnit: 'portions', yieldNotes: '3 pieces per portion',
    ingredients: [{ name: 'Cheese', qty: 1, unit: 'kg', notes: 'Grated' }, { name: 'Sweet Corn', qty: 1, unit: 'kg', notes: 'Boiled and lightly crushed' }, { name: 'Potato', qty: 500, unit: 'g', notes: 'Boiled and mashed, for binding' }, { name: 'Maida', qty: 300, unit: 'g', notes: 'For the crumb coating' }, { name: 'Cooking Oil', qty: 1, unit: 'liter', notes: 'For deep frying' }],
    steps: ['Mix grated cheese, crushed corn, and mashed potato into a firm dough.', 'Shape into small balls and chill for 20 minutes to firm up.', 'Coat in a light maida batter and deep fry until golden.'],
    equipment: [{ name: 'Deep Fryer' }],
    quality: 'Cheese centre should be molten on cutting when served hot; balls must hold their shape without bursting while frying.' },
  { itemName: 'Spring Rolls', summary: 'Crisp fried rolls filled with julienned vegetables.', yieldQty: 25, yieldUnit: 'portions', yieldNotes: '2 pieces per portion',
    ingredients: [{ name: 'Cabbage', qty: 1.5, unit: 'kg', notes: 'Julienned' }, { name: 'Carrot', qty: 600, unit: 'g', notes: 'Julienned' }, { name: 'Capsicum', qty: 400, unit: 'g', notes: 'Julienned' }, { name: 'Maida', qty: 1, unit: 'kg', notes: 'For the wrapper dough' }, { name: 'Soy Sauce', qty: 60, unit: 'ml' }, { name: 'Cooking Oil', qty: 1, unit: 'liter', notes: 'For deep frying' }],
    steps: ['Prepare thin spring roll wrappers from a maida batter cooked on a flat griddle.', 'Stir-fry the julienned vegetables on high heat with soy sauce, keeping them crunchy; cool completely before filling.', 'Roll the filling tightly in the wrappers and seal the edges with a maida-water paste.', 'Deep fry until golden and crisp just before service.'],
    equipment: [{ name: 'Griddle (Tawa)', notes: 'For the wrappers' }, { name: 'Deep Fryer' }],
    quality: 'Wrapper must stay crisp and shatter cleanly when bitten; filling should retain crunch, not turn soggy.' },
  { itemName: 'Caesar Salad', summary: 'Romaine lettuce with Caesar dressing, croutons, and parmesan.', yieldQty: 6, yieldUnit: 'kg', yieldNotes: 'Serves approximately 50 guests as a buffet side',
    ingredients: [{ name: 'Lettuce', qty: 3, unit: 'kg', notes: 'Romaine, torn into pieces' }, { name: 'Bakery Bread', qty: 1, unit: 'loaf', notes: 'Cubed and toasted for croutons' }, { name: 'Cheese', qty: 300, unit: 'g', notes: 'Shaved, parmesan-style' }, { name: 'Eggs', qty: 6, unit: 'piece', notes: 'For the dressing' }, { name: 'Garlic', qty: 20, unit: 'g', notes: 'Paste, for the dressing' }, { name: 'Lemon', qty: 4, unit: 'piece', notes: 'Juiced' }],
    steps: ['Whisk eggs, garlic paste, and lemon juice into a smooth Caesar dressing.', 'Cube and toast bread cubes with a little oil until golden for the croutons.', 'Toss torn lettuce with the dressing just before service.', 'Top with croutons and shaved cheese.'],
    equipment: [{ name: 'Mixing Bowl' }],
    quality: 'Lettuce must be dressed only just before service to stay crisp; dressing should coat lightly, not drown the leaves.' },
  { itemName: 'Rasam', summary: 'Tangy South Indian tamarind and pepper broth, served as a soup course.', yieldQty: 10, yieldUnit: 'liter', yieldNotes: 'Approximately 50 bowl portions',
    ingredients: [{ name: 'Toor Dal', qty: 500, unit: 'g', notes: 'Boiled soft for the base' }, { name: 'Tamarind', qty: 200, unit: 'g', notes: 'Soaked and extracted' }, { name: 'Tomato', qty: 1, unit: 'kg', notes: 'Chopped' }, { name: 'Black Pepper', qty: 20, unit: 'g', notes: 'Coarsely crushed' }, { name: 'Cumin Seeds', qty: 20, unit: 'g' }, { name: 'Curry Leaves', qty: 20, unit: 'g' }, { name: 'Garlic', qty: 30, unit: 'g', notes: 'Crushed' }],
    steps: ['Boil toor dal until fully soft, then mash coarsely.', 'Simmer tamarind extract with chopped tomato, crushed pepper, and cumin until the raw tamarind smell disappears.', 'Add the mashed dal and enough water to reach a thin, brothy consistency.', 'Temper with curry leaves and crushed garlic in ghee, then pour over the rasam just before service.'],
    equipment: [{ name: 'Heavy-Bottom Pot' }],
    quality: 'Rasam should be thin and brothy, not thick like dal; the tangy-peppery balance must be pronounced, served piping hot.' },
  { itemName: 'Cream of Mushroom Soup', summary: 'Velvety mushroom soup finished with cream and herbs.', yieldQty: 10, yieldUnit: 'liter', yieldNotes: 'Approximately 50 bowl portions',
    ingredients: [{ name: 'Mushroom', qty: 2, unit: 'kg', notes: 'Sliced' }, { name: 'Butter', qty: 200, unit: 'g' }, { name: 'Maida', qty: 150, unit: 'g', notes: 'For thickening' }, { name: 'Milk', qty: 3, unit: 'liter' }, { name: 'Fresh Cream', qty: 400, unit: 'g' }, { name: 'Black Pepper', qty: 15, unit: 'g' }],
    steps: ['Saute sliced mushrooms in butter until softened and lightly browned.', 'Stir in maida to form a roux, cooking briefly to remove the raw flour taste.', 'Gradually whisk in milk to avoid lumps, then simmer until thickened.', 'Blend partially for texture, season, and finish with cream before service.'],
    equipment: [{ name: 'Heavy-Bottom Pot' }, { name: 'Hand Blender' }],
    quality: 'Soup should be velvety with visible mushroom pieces, not fully smooth; consistency must coat the back of a spoon.' },
  { itemName: 'Kheer', summary: 'Traditional rice pudding simmered with milk and cardamom.', yieldQty: 8, yieldUnit: 'kg', yieldNotes: 'Serves approximately 55 guests as a buffet dessert',
    ingredients: [{ name: 'Rice', qty: 1, unit: 'kg', notes: 'Washed and soaked' }, { name: 'Milk', qty: 10, unit: 'liter' }, { name: 'Sugar', qty: 1.5, unit: 'kg' }, { name: 'Cardamom', qty: 15, unit: 'g' }, { name: 'Almonds', qty: 100, unit: 'g', notes: 'Slivered, for garnish' }],
    steps: ['Simmer soaked rice in milk on low heat, stirring frequently to prevent scorching, until the rice is fully soft and the milk has reduced and thickened.', 'Add sugar and cardamom, continuing to simmer until the desired consistency is reached.', 'Garnish with slivered almonds and chill before service.'],
    equipment: [{ name: 'Heavy-Bottom Pot' }],
    quality: 'Consistency should be creamy and slightly thick, not watery; rice grains should be soft but not disintegrated.' },
  { itemName: 'Rabri', summary: 'Sweetened, thickened milk reduced slowly and flavoured with cardamom.', yieldQty: 6, yieldUnit: 'kg', yieldNotes: 'Serves approximately 50 guests as a buffet dessert',
    ingredients: [{ name: 'Milk', qty: 12, unit: 'liter', notes: 'Reduced to roughly a quarter of the original volume' }, { name: 'Sugar', qty: 1, unit: 'kg' }, { name: 'Cardamom', qty: 15, unit: 'g' }, { name: 'Saffron', qty: 1, unit: 'g' }, { name: 'Pistachios', qty: 100, unit: 'g', notes: 'Slivered, for garnish' }],
    steps: ['Slow-reduce milk in a wide, heavy-bottomed pot, continuously scraping the cream layer (malai) back into the pot as it forms on the sides.', 'Once reduced to roughly a quarter of the original volume, add sugar, cardamom, and saffron.', 'Chill thoroughly and garnish with slivered pistachios before service.'],
    equipment: [{ name: 'Heavy-Bottom Pot', notes: 'Wide-mouthed, for maximum surface area during reduction' }],
    quality: 'Texture must be thick and slightly grainy from the milk solids, with visible saffron streaks; never thin or milk-like.' },
  { itemName: 'Motichoor Ladoo', summary: 'Fine gram-flour pearls bound in sugar syrup, a festive favourite.', yieldQty: 150, yieldUnit: 'pieces',
    ingredients: [{ name: 'Besan', qty: 2, unit: 'kg' }, { name: 'Sugar', qty: 2, unit: 'kg', notes: 'For the syrup' }, { name: 'Ghee', qty: 500, unit: 'g' }, { name: 'Cooking Oil', qty: 1.5, unit: 'liter', notes: 'For deep frying' }, { name: 'Cardamom', qty: 15, unit: 'g' }, { name: 'Saffron', qty: 1, unit: 'g' }],
    steps: ['Prepare a thin besan batter and pass through a perforated ladle directly into hot oil to form tiny pearls (boondi).', 'Fry the boondi lightly without over-browning, then drain.', 'Soak the boondi briefly in warm sugar syrup flavoured with cardamom and saffron until well absorbed.', 'While still warm, bind the soaked boondi into round ladoos with a little ghee.'],
    equipment: [{ name: 'Deep Fryer' }, { name: 'Perforated Ladle', notes: 'For shaping the boondi' }],
    quality: 'Boondi pearls must be uniformly tiny and fully soaked, not dry or hard; ladoos should hold together without crumbling.' },
  { itemName: 'Shahi Tukda', summary: 'Fried bread slices soaked in rabri and garnished with nuts.', yieldQty: 25, yieldUnit: 'portions', yieldNotes: '2 pieces per portion',
    ingredients: [{ name: 'Bakery Bread', qty: 3, unit: 'loaf' }, { name: 'Ghee', qty: 400, unit: 'g', notes: 'For shallow frying' }, { name: 'Milk', qty: 6, unit: 'liter', notes: 'Reduced for the rabri' }, { name: 'Sugar', qty: 600, unit: 'g' }, { name: 'Cardamom', qty: 10, unit: 'g' }, { name: 'Pistachios', qty: 100, unit: 'g', notes: 'Slivered, for garnish' }, { name: 'Saffron', qty: 1, unit: 'g' }],
    steps: ['Cut bread slices into triangles and shallow fry in ghee until golden and crisp.', 'Prepare a rabri by reducing milk with sugar and cardamom until thick.', 'Dip the fried bread briefly in light sugar syrup, then top generously with the warm rabri.', 'Garnish with slivered pistachios and a few saffron strands before service.'],
    equipment: [{ name: 'Griddle (Tawa)' }, { name: 'Heavy-Bottom Pot', notes: 'For the rabri' }],
    quality: 'Bread must stay crisp at the base even after soaking briefly; rabri should be thick and generously applied, not runny.' },
  { itemName: 'Fruit Custard', summary: 'Chilled custard with mixed seasonal fruits.', yieldQty: 8, yieldUnit: 'kg', yieldNotes: 'Serves approximately 55 guests as a buffet dessert',
    ingredients: [{ name: 'Milk', qty: 6, unit: 'liter' }, { name: 'Custard Powder', qty: 300, unit: 'g' }, { name: 'Sugar', qty: 800, unit: 'g' }, { name: 'Seasonal Fruits', qty: 2, unit: 'kg', notes: 'Diced' }],
    steps: ['Whisk custard powder with a little cold milk to a smooth paste.', 'Bring the remaining milk to a boil with sugar, then stir in the custard paste and cook until thickened.', 'Cool completely and chill for at least 2 hours.', 'Fold in diced seasonal fruits just before service to keep them fresh.'],
    equipment: [{ name: 'Heavy-Bottom Pot' }],
    quality: 'Custard must be fully chilled and fruits folded in close to service to avoid sogginess or discolouration.' },
  { itemName: 'Chocolate Brownie', summary: 'Rich baked chocolate brownie, served warm or with ice cream.', yieldQty: 60, yieldUnit: 'pieces',
    ingredients: [{ name: 'Maida', qty: 1.5, unit: 'kg' }, { name: 'Cocoa Powder', qty: 500, unit: 'g' }, { name: 'Baking Powder', qty: 30, unit: 'g' }, { name: 'Butter', qty: 1, unit: 'kg' }, { name: 'Sugar', qty: 1.5, unit: 'kg' }, { name: 'Eggs', qty: 24, unit: 'piece' }, { name: 'Cashew', qty: 200, unit: 'g', notes: 'Chopped, for texture' }],
    steps: ['Melt butter and whisk with sugar and eggs until smooth.', 'Sift together maida, cocoa powder, and baking powder, then fold into the wet mixture without overmixing.', 'Fold in chopped cashew and pour into greased baking trays.', 'Bake until just set with a slightly fudgy centre; do not overbake.', 'Cool, portion into squares, and serve warm or with ice cream.'],
    equipment: [{ name: 'Oven' }, { name: 'Baking Tray' }],
    quality: 'Centre must stay fudgy and moist, not dry or cake-like; top should have a light crackled crust.' },
  { itemName: 'Ice Cream', summary: 'Assorted flavoured ice cream scoops served fresh at the counter.', yieldQty: 300, yieldUnit: 'scoops',
    ingredients: [{ name: 'Ice Cream Cups', qty: 300, unit: 'cup', notes: 'Assorted flavours, kept frozen until service' }],
    steps: ['Hold ice cream cups in a deep freezer until immediately before service.', 'Scoop fresh at the live counter into serving cups or cones per guest request.', 'Offer a choice of at least three flavours with simple toppings on request.'],
    equipment: [{ name: 'Live Counter Station' }, { name: 'Ice Cream Scoop' }],
    quality: 'Must be served at the correct scoopable temperature — not too hard to scoop, not melting on the counter.' },

  // ---- DD-001A additions: Live Counter assembly recipes ----
  { itemName: 'Chaat Counter', summary: 'Assorted street-style chaat prepared fresh — pani puri, bhel, and sev puri, assembled to order.', yieldQty: 1, yieldUnit: 'station', yieldNotes: 'Stocked to serve approximately 150 guests',
    ingredients: [{ name: 'Puri', qty: 1500, unit: 'piece' }, { name: 'Potato', qty: 4, unit: 'kg', notes: 'Boiled and diced, for the filling' }, { name: 'Green Peas', qty: 2, unit: 'kg', notes: 'Boiled, for the filling' }, { name: 'Poha', qty: 3, unit: 'kg', notes: 'For bhel' }, { name: 'Tamarind Chutney', qty: 3, unit: 'kg' }, { name: 'Green Chutney', qty: 3, unit: 'kg' }, { name: 'Curd', qty: 3, unit: 'kg', notes: 'Whisked, for sev puri' }, { name: 'Onion', qty: 2, unit: 'kg', notes: 'Finely chopped' }, { name: 'Besan', qty: 1, unit: 'kg', notes: 'Fried into sev' }],
    steps: ['Prepare the potato-pea filling, tamarind water, and sev in advance of service.', 'Set up the counter with puris, fillings, chutneys, whisked curd, and toppings in separate stations.', 'Assemble each chaat to order — filling the puri, or layering bhel and sev puri — immediately before handing to the guest.', 'Replenish chutneys and fried sev through service to keep them fresh and crisp.'],
    equipment: [{ name: 'Live Counter Station' }, { name: 'Mixing Bowl', notes: 'Multiple, for each component' }],
    quality: 'Puris must stay crisp until the moment of filling; nothing should be pre-assembled and left to go soggy.' },
  { itemName: 'Dosa Counter', summary: 'Fresh dosas made to order with sambhar and chutneys.', yieldQty: 1, yieldUnit: 'station', yieldNotes: 'Stocked to serve approximately 150 guests',
    ingredients: [{ name: 'Rice', qty: 6, unit: 'kg', notes: 'Soaked and ground for the batter' }, { name: 'Urad Dal', qty: 2, unit: 'kg', notes: 'Soaked, ground, and fermented with the rice overnight' }, { name: 'Toor Dal', qty: 1.5, unit: 'kg', notes: 'For the sambhar' }, { name: 'Tomato', qty: 1.5, unit: 'kg', notes: 'For the sambhar' }, { name: 'Coconut', qty: 3, unit: 'piece', notes: 'Ground, for chutney' }, { name: 'Mustard Seeds', qty: 20, unit: 'g' }, { name: 'Curry Leaves', qty: 20, unit: 'g' }, { name: 'Cooking Oil', qty: 300, unit: 'ml' }, { name: 'Ghee', qty: 200, unit: 'g' }],
    steps: ['Ferment the rice-urad dal batter overnight; prepare sambhar and coconut chutney ahead of service.', 'Spread each dosa fresh to order on a hot griddle, finishing with a drizzle of ghee.', 'Serve immediately with hot sambhar and coconut chutney.'],
    equipment: [{ name: 'Live Counter Station' }, { name: 'Griddle (Tawa)', notes: 'Dosa-specific, flat and wide' }],
    quality: 'Batter must be properly fermented for a light, slightly sour dosa; each dosa spread and served fresh, never pre-made and held.' },
  { itemName: 'Pasta Counter', summary: 'Fresh pasta tossed to order in a choice of sauces.', yieldQty: 1, yieldUnit: 'station', yieldNotes: 'Stocked to serve approximately 120 guests',
    ingredients: [{ name: 'Pasta', qty: 6, unit: 'kg' }, { name: 'White Sauce', qty: 3, unit: 'kg' }, { name: 'Pizza Sauce', qty: 3, unit: 'kg', notes: 'As the red sauce option' }, { name: 'Capsicum', qty: 1, unit: 'kg', notes: 'Diced' }, { name: 'Mushroom', qty: 1, unit: 'kg', notes: 'Sliced' }, { name: 'Cheese', qty: 1, unit: 'kg', notes: 'Grated' }, { name: 'Garlic', qty: 100, unit: 'g', notes: 'Chopped' }, { name: 'Cooking Oil', qty: 200, unit: 'ml' }],
    steps: ['Par-boil pasta in advance and toss lightly in oil to prevent sticking.', 'Hold white and red sauces warm at the counter along with diced vegetables.', 'Toss pasta to order in a hot pan with the guest\'s choice of sauce and vegetables, finishing with grated cheese.'],
    equipment: [{ name: 'Live Counter Station' }, { name: 'Wok', notes: 'For tossing to order' }],
    quality: 'Pasta must be tossed fresh per order, not pre-mixed with sauce and held, to avoid a gluey texture.' },
  { itemName: 'Chinese Wok Counter', summary: 'Noodles and rice stir-fried live to order.', yieldQty: 1, yieldUnit: 'station', yieldNotes: 'Stocked to serve approximately 150 guests',
    ingredients: [{ name: 'Noodles', qty: 5, unit: 'kg' }, { name: 'Rice', qty: 4, unit: 'kg', notes: 'Pre-cooked, for fried rice' }, { name: 'Cabbage', qty: 1.5, unit: 'kg', notes: 'Julienned' }, { name: 'Carrot', qty: 1, unit: 'kg', notes: 'Julienned' }, { name: 'Capsicum', qty: 1, unit: 'kg', notes: 'Julienned' }, { name: 'Soy Sauce', qty: 200, unit: 'ml' }, { name: 'Schezwan Sauce', qty: 1, unit: 'kg' }, { name: 'Cooking Oil', qty: 400, unit: 'ml' }],
    steps: ['Par-boil noodles and pre-cook rice in advance, then cool and hold at the counter.', 'Stir-fry the guest\'s choice of noodles or rice on high heat with julienned vegetables and sauce, tossed fresh to order.', 'Serve immediately while piping hot from the wok.'],
    equipment: [{ name: 'Live Counter Station' }, { name: 'Wok' }],
    quality: 'High-heat wok toss is essential for the smoky "wok hei" flavour; vegetables must retain crunch, not steam soft.' },
  { itemName: 'Momo Counter', summary: 'Steamed or fried dumplings served with spicy chutney.', yieldQty: 1, yieldUnit: 'station', yieldNotes: 'Stocked to serve approximately 120 guests',
    ingredients: [{ name: 'Maida', qty: 3, unit: 'kg', notes: 'For the dumpling wrappers' }, { name: 'Cabbage', qty: 2, unit: 'kg', notes: 'Finely chopped, for veg filling' }, { name: 'Chicken', qty: 2, unit: 'kg', notes: 'Minced, for non-veg filling' }, { name: 'Onion', qty: 1, unit: 'kg', notes: 'Finely chopped' }, { name: 'Ginger', qty: 50, unit: 'g', notes: 'Paste' }, { name: 'Garlic', qty: 50, unit: 'g', notes: 'Paste' }, { name: 'Schezwan Sauce', qty: 1.5, unit: 'kg', notes: 'Served alongside as the spicy dipping chutney' }, { name: 'Cooking Oil', qty: 500, unit: 'ml', notes: 'For the fried option' }],
    steps: ['Prepare separate veg (cabbage) and non-veg (minced chicken) fillings, seasoned with ginger-garlic and onion.', 'Roll thin maida wrappers and pleat each dumpling by hand around the filling.', 'Steam to order, or shallow fry the steamed momos for the crisp variant.', 'Serve hot with Schezwan chutney.'],
    equipment: [{ name: 'Live Counter Station' }, { name: 'Steamer Basket' }],
    quality: 'Wrapper must stay thin and slightly translucent when steamed, not doughy; filling should be juicy, not dry.' },
  { itemName: 'Tikka Counter', summary: 'Assorted tandoori tikkas grilled fresh to order.', yieldQty: 1, yieldUnit: 'station', yieldNotes: 'Stocked to serve approximately 150 guests',
    ingredients: [{ name: 'Chicken', qty: 4, unit: 'kg', notes: 'Boneless, cut into chunks' }, { name: 'Paneer', qty: 2, unit: 'kg', notes: 'Cut into cubes, veg option' }, { name: 'Curd', qty: 1.5, unit: 'kg' }, { name: 'Ginger', qty: 80, unit: 'g', notes: 'Paste' }, { name: 'Garlic', qty: 80, unit: 'g', notes: 'Paste' }, { name: 'Garam Masala', qty: 30, unit: 'g' }, { name: 'Lemon', qty: 6, unit: 'piece' }, { name: 'Cooking Oil', qty: 200, unit: 'ml', notes: 'For basting' }],
    steps: ['Marinate chicken and paneer separately in the standard tandoori curd-spice marinade ahead of service.', 'Skewer each item as ordered and grill fresh in the tandoor at the live counter.', 'Serve immediately with mint chutney, onion rings, and lemon wedges.'],
    equipment: [{ name: 'Live Counter Station' }, { name: 'Tandoor' }, { name: 'Skewers' }],
    quality: 'Every skewer grilled to order in view of guests, never pre-grilled and reheated; must stay moist and lightly charred.' },
  { itemName: 'Sundae Counter', summary: 'Custom-built ice cream sundaes with a choice of toppings.', yieldQty: 1, yieldUnit: 'station', yieldNotes: 'Stocked to serve approximately 120 guests',
    ingredients: [{ name: 'Ice Cream Cups', qty: 250, unit: 'cup' }, { name: 'Cocoa Powder', qty: 300, unit: 'g', notes: 'For house-made chocolate sauce' }, { name: 'Milk', qty: 2, unit: 'liter', notes: 'For the chocolate sauce' }, { name: 'Sugar', qty: 500, unit: 'g', notes: 'For the chocolate sauce' }, { name: 'Cashew', qty: 200, unit: 'g', notes: 'Chopped, topping' }, { name: 'Pistachios', qty: 150, unit: 'g', notes: 'Chopped, topping' }, { name: 'Cookies', qty: 2, unit: 'pack', notes: 'Crushed, topping' }],
    steps: ['Reduce milk, sugar, and cocoa powder into a glossy chocolate sauce ahead of service, held warm at the counter.', 'Scoop ice cream to order into a sundae glass.', 'Let the guest choose toppings — chocolate sauce, chopped nuts, crushed cookies — assembled fresh at the counter.'],
    equipment: [{ name: 'Live Counter Station' }, { name: 'Ice Cream Scoop' }],
    quality: 'Ice cream must not be left out melting between orders; toppings assembled only after scooping, immediately before handing to the guest.' },

  // ---- DD-001A additions: Beverage recipes ----
  { itemName: 'Jaljeera', summary: 'Tangy cumin-mint cooler, a classic North Indian welcome drink.', yieldQty: 100, yieldUnit: 'glasses',
    ingredients: [{ name: 'Mint', qty: 500, unit: 'g' }, { name: 'Coriander', qty: 300, unit: 'g' }, { name: 'Cumin Seeds', qty: 150, unit: 'g', notes: 'Roasted and ground' }, { name: 'Tamarind', qty: 500, unit: 'g', notes: 'Soaked and extracted' }, { name: 'Lemon', qty: 3, unit: 'kg', notes: 'Juiced' }, { name: 'Salt', qty: 200, unit: 'g' }],
    steps: ['Blend mint, coriander, roasted cumin, and tamarind extract into a concentrated base, then strain.', 'Dilute the base with chilled water and lemon juice, adjusting salt to taste.', 'Serve well chilled over ice, garnished with a mint sprig.'],
    equipment: [{ name: 'Live Counter Station' }],
    quality: 'Must be strained smooth with no fibrous bits; flavour should be sharply tangy and well chilled.' },
  { itemName: 'Rose Sherbet', summary: 'Chilled rose-flavoured sherbet, a traditional wedding welcome drink.', yieldQty: 100, yieldUnit: 'glasses',
    ingredients: [{ name: 'Rose Syrup', qty: 3, unit: 'liter' }, { name: 'Milk', qty: 5, unit: 'liter' }, { name: 'Sugar', qty: 500, unit: 'g' }],
    steps: ['Chill milk thoroughly in advance.', 'For each glass, combine chilled milk with rose syrup and a touch of sugar syrup to taste.', 'Serve immediately over ice, garnished with a few rose petals if available.'],
    equipment: [{ name: 'Live Counter Station' }],
    quality: 'Colour should be a soft, natural pink; must be served well chilled and mixed close to service to avoid separation.' },
  { itemName: 'Virgin Mojito', summary: 'Muddled mint and lime cooler topped with soda, served over crushed ice.', yieldQty: 100, yieldUnit: 'glasses',
    ingredients: [{ name: 'Mint', qty: 600, unit: 'g' }, { name: 'Lemon', qty: 3, unit: 'kg', notes: 'Juiced' }, { name: 'Sugar', qty: 1.5, unit: 'kg', notes: 'As sugar syrup' }],
    steps: ['Muddle fresh mint leaves gently with sugar syrup and lemon juice at the base of each glass to release the mint oils without shredding the leaves.', 'Fill with crushed ice and top with chilled soda.', 'Stir briefly and serve immediately with a mint sprig garnish.'],
    equipment: [{ name: 'Live Counter Station' }, { name: 'Muddler' }],
    quality: 'Mint must be muddled, not blended, to avoid a bitter or grassy taste; soda added last to preserve fizz.' },
  { itemName: 'Welcome Mocktail', summary: 'Signature layered fruit mocktail crafted for the guest welcome moment.', yieldQty: 100, yieldUnit: 'glasses',
    ingredients: [{ name: 'Rose Syrup', qty: 2, unit: 'liter' }, { name: 'Lemon', qty: 2, unit: 'kg', notes: 'Juiced' }, { name: 'Mint', qty: 300, unit: 'g' }, { name: 'Sugar', qty: 800, unit: 'g', notes: 'As sugar syrup' }],
    steps: ['Prepare the rose syrup layer and a separate mint-lemon syrup layer in advance.', 'Pour the denser rose syrup first into each glass, then gently layer the lighter mint-lemon mixture on top using the back of a spoon.', 'Top with chilled soda just before handing to the guest to preserve the layered look.'],
    equipment: [{ name: 'Live Counter Station' }],
    quality: 'Layers must remain visually distinct when served; assembled only at the moment of service, not held pre-mixed.' },
  { itemName: 'Cranberry Fizz', summary: 'Cranberry juice topped with soda and a citrus twist.', yieldQty: 100, yieldUnit: 'glasses',
    ingredients: [{ name: 'Juice Packs', qty: 25, unit: 'pack', notes: 'Cranberry flavour' }, { name: 'Lemon', qty: 1, unit: 'kg', notes: 'For garnish twist' }],
    steps: ['Chill the cranberry juice thoroughly.', 'Pour over ice and top with chilled soda.', 'Finish with a lemon twist garnish.'],
    equipment: [{ name: 'Live Counter Station' }],
    quality: 'Must be built fresh per glass with soda added last to keep the fizz at service.' },
  { itemName: 'Coconut Water', summary: 'Fresh tender coconut water, served chilled straight from the shell.', yieldQty: 100, yieldUnit: 'glasses',
    ingredients: [{ name: 'Coconut', qty: 100, unit: 'piece', notes: 'Tender coconuts, chilled' }],
    steps: ['Chill whole tender coconuts in advance.', 'Cut open to order at the live counter and serve straight from the shell with a straw.'],
    equipment: [{ name: 'Live Counter Station' }, { name: 'Coconut Cutting Tool' }],
    quality: 'Coconuts must be properly chilled and cut fresh to order — never pre-cut and held, which causes rapid spoilage.' },
  { itemName: 'Kokum Sherbet', summary: 'Tangy kokum-based cooler popular across Western and Southern India.', yieldQty: 100, yieldUnit: 'glasses',
    ingredients: [{ name: 'Kokum', qty: 1, unit: 'kg', notes: 'Soaked and extracted' }, { name: 'Sugar', qty: 1, unit: 'kg' }, { name: 'Cumin Seeds', qty: 30, unit: 'g', notes: 'Roasted and ground' }],
    steps: ['Soak dried kokum in warm water, then extract and strain the deep-pink liquid.', 'Prepare a sugar syrup and combine with the kokum extract and roasted cumin powder.', 'Dilute with chilled water and serve over ice.'],
    equipment: [{ name: 'Live Counter Station' }],
    quality: 'Colour must be a natural deep pink from the kokum, not artificially tinted; served well chilled.' },
  { itemName: 'Aam Panna', summary: 'Raw mango cooler, tangy and refreshing for summer events.', yieldQty: 100, yieldUnit: 'glasses',
    ingredients: [{ name: 'Raw Mango', qty: 4, unit: 'kg' }, { name: 'Sugar', qty: 1, unit: 'kg' }, { name: 'Mint', qty: 200, unit: 'g' }, { name: 'Cumin Seeds', qty: 30, unit: 'g', notes: 'Roasted and ground' }, { name: 'Black Pepper', qty: 10, unit: 'g' }],
    steps: ['Boil raw mangoes until soft, then scoop out and puree the pulp.', 'Blend the pulp with sugar, mint, roasted cumin, and black pepper into a concentrated base.', 'Dilute with chilled water to taste and serve over ice.'],
    equipment: [{ name: 'Live Counter Station' }, { name: 'Hand Blender' }],
    quality: 'Base must be smooth with no fibrous mango skin; flavour should be distinctly tangy-sweet, well chilled.' },
  { itemName: 'Pineapple Punch', summary: 'Sweet pineapple-based fruit punch served over ice.', yieldQty: 100, yieldUnit: 'glasses',
    ingredients: [{ name: 'Juice Packs', qty: 25, unit: 'pack', notes: 'Pineapple flavour' }, { name: 'Lemon', qty: 1, unit: 'kg', notes: 'Juiced, for balance' }, { name: 'Mint', qty: 150, unit: 'g', notes: 'Garnish' }],
    steps: ['Chill pineapple juice thoroughly and combine with a splash of fresh lemon juice to balance the sweetness.', 'Serve over ice, garnished with a mint sprig.'],
    equipment: [{ name: 'Live Counter Station' }],
    quality: 'Must be served well chilled; lemon balance should cut the sweetness without overpowering the pineapple flavour.' },
  { itemName: 'Thandai', summary: 'Chilled milk-based drink infused with nuts and festive spices.', yieldQty: 100, yieldUnit: 'glasses',
    ingredients: [{ name: 'Milk', qty: 10, unit: 'liter' }, { name: 'Almonds', qty: 300, unit: 'g', notes: 'Ground into paste' }, { name: 'Sugar', qty: 1, unit: 'kg' }, { name: 'Fennel Seeds', qty: 50, unit: 'g' }, { name: 'Cardamom', qty: 20, unit: 'g' }, { name: 'Black Pepper', qty: 10, unit: 'g' }, { name: 'Saffron', qty: 1, unit: 'g' }],
    steps: ['Grind almonds, fennel seeds, cardamom, and black pepper into a fine paste with a little milk.', 'Steep the paste in the remaining milk with sugar and saffron for at least 2 hours, refrigerated.', 'Strain and serve chilled, garnished with slivered almonds.'],
    equipment: [{ name: 'Mixer/Grinder' }, { name: 'Sieve' }],
    quality: 'Must be well strained with no gritty texture; the spice blend should be aromatic, not overpowering.' },
  { itemName: 'Lassi', summary: 'Thick churned yogurt drink, sweet or salted.', yieldQty: 100, yieldUnit: 'glasses',
    ingredients: [{ name: 'Curd', qty: 12, unit: 'kg' }, { name: 'Sugar', qty: 1.5, unit: 'kg', notes: 'For the sweet variant' }, { name: 'Salt', qty: 150, unit: 'g', notes: 'For the salted variant' }, { name: 'Cardamom', qty: 10, unit: 'g' }],
    steps: ['Whisk fresh curd with chilled water until smooth and slightly frothy.', 'Divide the base and sweeten one portion with sugar and cardamom, and salt the other portion, per guest preference.', 'Serve chilled in tall glasses.'],
    equipment: [{ name: 'Live Counter Station' }],
    quality: 'Must be thick enough to coat the glass, not watery; served freshly churned and well chilled.' },
  { itemName: 'Masala Tea', summary: 'Spiced Indian tea brewed with milk and aromatic spices.', yieldQty: 100, yieldUnit: 'cups',
    ingredients: [{ name: 'Tea Leaves', qty: 400, unit: 'g' }, { name: 'Milk', qty: 8, unit: 'liter' }, { name: 'Sugar', qty: 1, unit: 'kg' }, { name: 'Ginger', qty: 100, unit: 'g', notes: 'Crushed' }, { name: 'Cardamom', qty: 20, unit: 'g', notes: 'Crushed' }],
    steps: ['Boil water with crushed ginger and cardamom to release the spice aroma.', 'Add tea leaves and simmer briefly, then add milk and bring back to a boil.', 'Add sugar, simmer until well brewed, then strain and serve hot.'],
    equipment: [{ name: 'Live Counter Station' }, { name: 'Heavy-Bottom Pot' }],
    quality: 'Colour should be a rich reddish-brown; must be served piping hot, freshly brewed in small batches through service.' },
  { itemName: 'Filter Coffee', summary: 'Traditional South Indian decoction coffee served frothy.', yieldQty: 100, yieldUnit: 'cups',
    ingredients: [{ name: 'Coffee Powder', qty: 500, unit: 'g' }, { name: 'Milk', qty: 8, unit: 'liter' }, { name: 'Sugar', qty: 800, unit: 'g' }],
    steps: ['Brew a strong decoction from the coffee powder using a traditional filter, over several hours.', 'Heat milk until frothy.', 'Combine decoction, hot milk, and sugar to taste, then pour repeatedly between two vessels (the "meter" pour) to build froth.', 'Serve hot in a tumbler and dabara set.'],
    equipment: [{ name: 'Live Counter Station' }, { name: 'South Indian Coffee Filter' }],
    quality: 'Decoction must be strong and freshly brewed; a good froth on top is essential to authentic presentation.' },
];

async function upsertVariant(
  pool: any,
  tenantId: string,
  adminId: string,
  catalogItemId: string,
  variantName: string,
  isDefault: boolean,
  displayOrder: number,
  summary: string,
  yieldQty: number | undefined,
  yieldUnit: string | undefined,
  yieldNotes: string | undefined,
  quality: string,
  ingredients: Ing[],
  steps: string[],
  equipment: Equip[],
  ingredientIdByName: Map<string, string>,
) {
  const existing = await pool.query(
    `SELECT id FROM cat_menu_catalog_recipe_variants WHERE catalog_item_id = $1 AND variant_name = $2`,
    [catalogItemId, variantName],
  );

  let variantId: string;
  if (existing.rows.length > 0) {
    variantId = existing.rows[0].id;
    await pool.query(
      `UPDATE cat_menu_catalog_recipe_variants SET
         is_default = $1, recipe_summary = $2, yield_quantity = $3, yield_unit = $4, yield_notes = $5,
         quality_notes = $6, display_order = $7, updated_at = NOW(), updated_by = $8
       WHERE id = $9`,
      [isDefault, summary, yieldQty ?? null, yieldUnit ?? null, yieldNotes ?? null, quality, displayOrder, adminId, variantId],
    );
  } else {
    const inserted = await pool.query(
      `INSERT INTO cat_menu_catalog_recipe_variants (
         id, tenant_id, catalog_item_id, variant_name, is_default, recipe_summary,
         yield_quantity, yield_unit, yield_notes, quality_notes, display_order,
         created_at, created_by, updated_at, updated_by
       ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11, NOW(), $11)
       RETURNING id`,
      [tenantId, catalogItemId, variantName, isDefault, summary, yieldQty ?? null, yieldUnit ?? null, yieldNotes ?? null, quality, displayOrder, adminId],
    );
    variantId = inserted.rows[0].id;
  }

  // Reconcile Ingredients, Steps, Equipment: delete-all-then-reinsert for
  // this Variant — simplest correct approach for a seed script re-run.
  await pool.query(`DELETE FROM cat_menu_catalog_recipe_ingredients WHERE variant_id = $1`, [variantId]);
  await pool.query(`DELETE FROM cat_menu_catalog_recipe_steps WHERE variant_id = $1`, [variantId]);
  await pool.query(`DELETE FROM cat_menu_catalog_recipe_equipment WHERE variant_id = $1`, [variantId]);

  for (let idx = 0; idx < ingredients.length; idx++) {
    const ing = ingredients[idx];
    const ingredientId = ingredientIdByName.get(ing.name);
    if (!ingredientId) {
      throw new Error(`Ingredient "${ing.name}" not found in Ingredient Master. Run seed-demo-ingredient-master.ts first.`);
    }
    await pool.query(
      `INSERT INTO cat_menu_catalog_recipe_ingredients (id, tenant_id, catalog_item_id, variant_id, ingredient_id, quantity, recipe_unit, preparation_instruction, display_order, created_at, created_by, updated_at, updated_by)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, NOW(), $9)`,
      [tenantId, catalogItemId, variantId, ingredientId, ing.qty ?? null, ing.unit ?? null, ing.notes ?? null, idx, adminId],
    );
  }
  for (let idx = 0; idx < steps.length; idx++) {
    await pool.query(
      `INSERT INTO cat_menu_catalog_recipe_steps (id, tenant_id, catalog_item_id, variant_id, instruction, display_order, created_at, created_by, updated_at, updated_by)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), $6, NOW(), $6)`,
      [tenantId, catalogItemId, variantId, steps[idx], idx, adminId],
    );
  }
  for (let idx = 0; idx < equipment.length; idx++) {
    const eq = equipment[idx];
    await pool.query(
      `INSERT INTO cat_menu_catalog_recipe_equipment (id, tenant_id, catalog_item_id, variant_id, equipment_name, notes, display_order, created_at, created_by, updated_at, updated_by)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), $7, NOW(), $7)`,
      [tenantId, catalogItemId, variantId, eq.name, eq.notes ?? null, idx, adminId],
    );
  }
}

async function main() {
  const pool = getPool();
  const { tenantId, adminId } = await getAdminAndTenant(pool);

  const masterRows = await pool.query(`SELECT id, name FROM cat_ingredient_master_items WHERE tenant_id = $1`, [tenantId]);
  const ingredientIdByName = new Map<string, string>(masterRows.rows.map((r: any) => [r.name, r.id]));

  let dishesProcessed = 0;
  let variantsProcessed = 0;
  let skippedMissingCatalogItem = 0;

  for (const dish of DISHES) {
    const itemRes = await pool.query(
      `SELECT id FROM cat_menu_catalog_items WHERE tenant_id = $1 AND name = $2 LIMIT 1`,
      [tenantId, dish.itemName],
    );
    if (itemRes.rows.length === 0) {
      console.warn(`Skipping "${dish.itemName}" — no matching Menu Catalog item found. Run seed-demo-menu-catalog.ts first.`);
      skippedMissingCatalogItem++;
      continue;
    }
    const catalogItemId = itemRes.rows[0].id;

    // Standard variant — always Default unless the dish spec says otherwise.
    await upsertVariant(
      pool, tenantId, adminId, catalogItemId, 'Standard', true, 0,
      dish.summary, dish.yieldQty, dish.yieldUnit, dish.yieldNotes, dish.quality,
      dish.ingredients, dish.steps, dish.equipment, ingredientIdByName,
    );
    variantsProcessed++;

    // Additional variants — never Default; they inherit and extend the
    // Standard variant's ingredients/steps/equipment.
    const extras = dish.extraVariants || [];
    for (let idx = 0; idx < extras.length; idx++) {
      const ev = extras[idx];
      const baseIngredients = ev.excludeIngredients
        ? dish.ingredients.filter((ing) => !ev.excludeIngredients!.includes(ing.name))
        : dish.ingredients;
      await upsertVariant(
        pool, tenantId, adminId, catalogItemId, ev.name, false, idx + 1,
        ev.summary,
        ev.yieldQty ?? dish.yieldQty, ev.yieldUnit ?? dish.yieldUnit, ev.yieldNotes ?? dish.yieldNotes,
        ev.quality || dish.quality,
        [...baseIngredients, ...(ev.extraIngredients || [])],
        ev.replaceSteps ?? [...dish.steps, ...(ev.extraSteps || [])],
        [...dish.equipment, ...(ev.extraEquipment || [])],
        ingredientIdByName,
      );
      variantsProcessed++;
    }

    dishesProcessed++;
  }

  console.log(`Recipe Variants: ${dishesProcessed} Menu Catalog items processed, ${variantsProcessed} Variants written (${skippedMissingCatalogItem} dishes skipped — Menu Catalog item not found).`);
  await pool.end();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
