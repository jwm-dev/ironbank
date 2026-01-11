// ============================================
// Minecraft Enchantment Data Loader
// Processes enchantments.json at runtime
// ============================================

import type { Enchantment, EnchantmentCategory, AppliedEnchantment } from '../types';

// Re-export the types for convenience
export type { Enchantment, EnchantmentCategory, AppliedEnchantment };

// Raw data type from JSON file
interface RawEnchantment {
  id: number;
  name: string;
  displayName: string;
  maxLevel: number;
  minCost: { a: number; b: number };
  maxCost: { a: number; b: number };
  treasureOnly: boolean;
  curse: boolean;
  exclude: string[];
  category: string;
  weight: number;
  tradeable: boolean;
  discoverable: boolean;
}

// Singleton to cache loaded enchantments
let cachedEnchantments: Enchantment[] | null = null;
let cachedEnchantmentsMap: Map<string, Enchantment> | null = null;

// Load enchantments from JSON
export async function loadEnchantments(): Promise<Enchantment[]> {
  if (cachedEnchantments) {
    return cachedEnchantments;
  }

  try {
    const enchantmentsData = await import('../../assets/enchantments.json');
    const rawEnchantments: RawEnchantment[] = enchantmentsData.default || enchantmentsData;

    cachedEnchantments = rawEnchantments.map(enchant => ({
      id: enchant.id,
      name: enchant.name,
      displayName: enchant.displayName,
      maxLevel: enchant.maxLevel,
      minCost: enchant.minCost,
      maxCost: enchant.maxCost,
      treasureOnly: enchant.treasureOnly,
      curse: enchant.curse,
      exclude: enchant.exclude,
      category: enchant.category as EnchantmentCategory,
      weight: enchant.weight,
      tradeable: enchant.tradeable,
      discoverable: enchant.discoverable,
    }));

    return cachedEnchantments;
  } catch (error) {
    console.error('Failed to load enchantments:', error);
    return [];
  }
}

// Get enchantments map for quick lookup by name
export async function getEnchantmentsMap(): Promise<Map<string, Enchantment>> {
  if (cachedEnchantmentsMap) {
    return cachedEnchantmentsMap;
  }

  const enchantments = await loadEnchantments();
  cachedEnchantmentsMap = new Map(enchantments.map(e => [e.name, e]));
  return cachedEnchantmentsMap;
}

// Get enchantment by name
export async function getEnchantment(name: string): Promise<Enchantment | undefined> {
  const map = await getEnchantmentsMap();
  return map.get(name);
}

// Get enchantments by category
export async function getEnchantmentsByCategory(category: EnchantmentCategory): Promise<Enchantment[]> {
  const enchantments = await loadEnchantments();
  return enchantments.filter(e => e.category === category);
}

// Get tradeable enchantments only (for villager trades, etc.)
export async function getTradeableEnchantments(): Promise<Enchantment[]> {
  const enchantments = await loadEnchantments();
  return enchantments.filter(e => e.tradeable && !e.curse);
}

// Get non-curse enchantments
export async function getNonCurseEnchantments(): Promise<Enchantment[]> {
  const enchantments = await loadEnchantments();
  return enchantments.filter(e => !e.curse);
}

// Search enchantments by name
export async function searchEnchantments(query: string): Promise<Enchantment[]> {
  const enchantments = await loadEnchantments();
  const lowerQuery = query.toLowerCase();
  return enchantments.filter(e =>
    e.name.toLowerCase().includes(lowerQuery) ||
    e.displayName.toLowerCase().includes(lowerQuery)
  );
}

// Roman numeral conversion for enchantment levels
const ROMAN_NUMERALS: Record<number, string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
  6: 'VI',
  7: 'VII',
  8: 'VIII',
  9: 'IX',
  10: 'X',
};

export function toRomanNumeral(level: number): string {
  return ROMAN_NUMERALS[level] || level.toString();
}

// Format an applied enchantment for display (e.g., "Sharpness V")
export function formatAppliedEnchantment(enchantment: Enchantment, level: number): string {
  if (enchantment.maxLevel === 1) {
    return enchantment.displayName;
  }
  return `${enchantment.displayName} ${toRomanNumeral(level)}`;
}

// Format a list of applied enchantments for display
export async function formatEnchantmentList(appliedEnchantments: AppliedEnchantment[]): Promise<string> {
  if (!appliedEnchantments || appliedEnchantments.length === 0) {
    return '';
  }

  const map = await getEnchantmentsMap();
  const formatted = appliedEnchantments
    .map(ae => {
      const enchant = map.get(ae.enchantmentId);
      if (!enchant) return null;
      return formatAppliedEnchantment(enchant, ae.level);
    })
    .filter(Boolean);

  return formatted.join(', ');
}

// Get enchantments that can be applied to a specific item type
// This maps Minecraft item patterns to enchantment categories
const ITEM_TO_ENCHANT_CATEGORIES: [RegExp, EnchantmentCategory[]][] = [
  // Swords
  [/^(wooden|stone|iron|golden|diamond|netherite)_sword$/, ['weapon', 'sword', 'sharp_weapon', 'fire_aspect', 'durability', 'vanishing']],
  
  // Axes (can have some sword enchants)
  [/^(wooden|stone|iron|golden|diamond|netherite)_axe$/, ['weapon', 'mining', 'mining_loot', 'sharp_weapon', 'durability', 'vanishing']],
  
  // Pickaxes, Shovels, Hoes
  [/^(wooden|stone|iron|golden|diamond|netherite)_(pickaxe|shovel|hoe)$/, ['mining', 'mining_loot', 'durability', 'vanishing']],
  
  // Helmets
  [/^(leather|chainmail|iron|golden|diamond|netherite)_helmet$/, ['head_armor', 'armor', 'equippable', 'durability', 'vanishing']],
  [/^turtle_helmet$/, ['head_armor', 'armor', 'equippable', 'durability', 'vanishing']],
  
  // Chestplates
  [/^(leather|chainmail|iron|golden|diamond|netherite)_chestplate$/, ['armor', 'equippable', 'durability', 'vanishing']],
  [/^elytra$/, ['durability', 'equippable', 'vanishing']],
  
  // Leggings
  [/^(leather|chainmail|iron|golden|diamond|netherite)_leggings$/, ['leg_armor', 'armor', 'equippable', 'durability', 'vanishing']],
  
  // Boots
  [/^(leather|chainmail|iron|golden|diamond|netherite)_boots$/, ['foot_armor', 'armor', 'equippable', 'durability', 'vanishing']],
  
  // Bows
  [/^bow$/, ['bow', 'durability', 'vanishing']],
  
  // Crossbows
  [/^crossbow$/, ['crossbow', 'durability', 'vanishing']],
  
  // Tridents
  [/^trident$/, ['trident', 'durability', 'vanishing']],
  
  // Maces
  [/^mace$/, ['mace', 'weapon', 'durability', 'vanishing']],
  
  // Fishing rods
  [/^fishing_rod$/, ['fishing', 'durability', 'vanishing']],
  
  // Shears
  [/^shears$/, ['durability', 'vanishing']],
  
  // Flint and steel
  [/^flint_and_steel$/, ['durability', 'vanishing']],
  
  // Shield
  [/^shield$/, ['durability', 'vanishing']],
  
  // Carrot on a stick, warped fungus on a stick
  [/^(carrot_on_a_stick|warped_fungus_on_a_stick)$/, ['durability', 'vanishing']],
  
  // Brush
  [/^brush$/, ['durability', 'vanishing']],
];

// Get valid enchantments for an item
export async function getValidEnchantmentsForItem(itemId: string): Promise<Enchantment[]> {
  const enchantments = await loadEnchantments();
  
  // Find matching categories for this item
  let validCategories: EnchantmentCategory[] = [];
  for (const [pattern, categories] of ITEM_TO_ENCHANT_CATEGORIES) {
    if (pattern.test(itemId)) {
      validCategories = categories;
      break;
    }
  }
  
  if (validCategories.length === 0) {
    return []; // Item cannot be enchanted
  }
  
  // Filter enchantments by valid categories
  return enchantments.filter(e => validCategories.includes(e.category));
}

// Check if an item can be enchanted
export function canBeEnchanted(itemId: string): boolean {
  for (const [pattern] of ITEM_TO_ENCHANT_CATEGORIES) {
    if (pattern.test(itemId)) {
      return true;
    }
  }
  return false;
}

// Validate that applied enchantments don't conflict with each other
export async function validateEnchantmentCombination(appliedEnchantments: AppliedEnchantment[]): Promise<{
  valid: boolean;
  conflicts: Array<{ enchant1: string; enchant2: string }>;
}> {
  const map = await getEnchantmentsMap();
  const conflicts: Array<{ enchant1: string; enchant2: string }> = [];
  
  for (let i = 0; i < appliedEnchantments.length; i++) {
    const enchant1 = map.get(appliedEnchantments[i].enchantmentId);
    if (!enchant1) continue;
    
    for (let j = i + 1; j < appliedEnchantments.length; j++) {
      const enchant2 = map.get(appliedEnchantments[j].enchantmentId);
      if (!enchant2) continue;
      
      // Check if enchant1 excludes enchant2 or vice versa
      if (enchant1.exclude.includes(enchant2.name) || enchant2.exclude.includes(enchant1.name)) {
        conflicts.push({
          enchant1: enchant1.displayName,
          enchant2: enchant2.displayName,
        });
      }
    }
  }
  
  return {
    valid: conflicts.length === 0,
    conflicts,
  };
}

// Category display names
export const ENCHANTMENT_CATEGORY_NAMES: Record<EnchantmentCategory, string> = {
  head_armor: 'Helmet',
  weapon: 'Weapon',
  equippable: 'Wearable',
  armor: 'Armor',
  mace: 'Mace',
  trident: 'Trident',
  foot_armor: 'Boots',
  mining: 'Tool',
  fire_aspect: 'Fire',
  bow: 'Bow',
  mining_loot: 'Fortune/Silk Touch',
  sword: 'Sword',
  fishing: 'Fishing Rod',
  durability: 'Durability',
  crossbow: 'Crossbow',
  sharp_weapon: 'Damage',
  leg_armor: 'Leggings',
  vanishing: 'Curse',
};
