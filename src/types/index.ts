// ============================================
// CivMC Shopside Tracker - Type Definitions
// ============================================

// Minecraft Item Types
export type ItemCategory =
  | 'building_blocks'
  | 'colored_blocks'
  | 'natural_blocks'
  | 'functional_blocks'
  | 'redstone'
  | 'tools'
  | 'combat'
  | 'food'
  | 'ingredients'
  | 'spawn_eggs'
  | 'operator_utilities';

export interface MinecraftItem {
  id: string;
  name: string;
  displayName: string;
  category: ItemCategory;
  stackSize: number;
  textureUrl: string;
  // Optional enchantments for enchanted item variants
  enchantments?: AppliedEnchantment[];
  // If this is an enchanted variant, link back to the base item
  baseItemId?: string;
}

// Enchantment Types
export type EnchantmentCategory =
  | 'head_armor'
  | 'weapon'
  | 'equippable'
  | 'armor'
  | 'mace'
  | 'trident'
  | 'foot_armor'
  | 'mining'
  | 'fire_aspect'
  | 'bow'
  | 'mining_loot'
  | 'sword'
  | 'fishing'
  | 'durability'
  | 'crossbow'
  | 'sharp_weapon'
  | 'leg_armor'
  | 'vanishing';

export interface EnchantmentCost {
  a: number;
  b: number;
}

export interface Enchantment {
  id: number;
  name: string;
  displayName: string;
  maxLevel: number;
  minCost: EnchantmentCost;
  maxCost: EnchantmentCost;
  treasureOnly: boolean;
  curse: boolean;
  exclude: string[]; // Names of mutually exclusive enchantments
  category: EnchantmentCategory;
  weight: number;
  tradeable: boolean;
  discoverable: boolean;
}

// Applied enchantment on an item (with a specific level)
export interface AppliedEnchantment {
  enchantmentId: string; // The enchantment's name (e.g., "sharpness")
  level: number; // The level (1-maxLevel)
}

// Custom/Server Items - user-defined items that use existing textures
// Useful for mod items, custom server items, renamed items, etc.
export interface CustomItem {
  id: string; // Unique ID for this custom item (auto-generated)
  name: string; // User-provided name (e.g., "XP Bottle", "Vote Key")
  baseItemId: string; // The Minecraft item ID whose texture to use
  description?: string; // Optional description
  createdAt: Date;
}

// Quantity Units (CivMC jargon)
// Note: ci/cs are based on item's actual stack size, which varies by item
export type QuantityUnit =
  | 'item'      // Single item
  | 'stack'     // 1 stack (varies by item: 64 for most, 16 for ender pearls, etc.)
  | 'ci'        // Compacted item = 1 stack worth (based on item's stack size)
  | 'cs'        // Compacted stack = 64 compacted items = 64 stacks worth
  | 'sc'        // Single chest = 27 stacks
  | 'dc'        // Double chest = 54 stacks
  | 'i'         // Iron ingots (currency shorthand)
  | 'd';        // Diamonds (currency shorthand)

export interface Quantity {
  amount: number;
  unit: QuantityUnit;
}

// Location Types
export interface Coordinates {
  x: number;
  y: number;
  z: number;
}

// Owner Types
export type OwnerType = 'individual' | 'group';

export interface Player {
  ign: string; // In-game name
  uuid?: string;
  notes?: string;
}

export interface Group {
  id: string;
  name: string;
  members: Player[];
  leader?: Player;
  notes?: string;
}

export interface ShopOwner {
  type: OwnerType;
  player?: Player;
  group?: Group;
}

// Trade/Exchange Types
export interface TradeItem {
  itemId: string;
  quantity: Quantity;
  // Optional enchantments for enchanted items (tools, armor, weapons)
  // When present, this item is treated as an enchanted item with specific enchants
  enchantments?: AppliedEnchantment[];
  // Optional custom display name (like "God Sword" or "Super Pick")
  customName?: string;
}

export interface Trade {
  id: string;
  input: TradeItem;   // What customer gives
  output: TradeItem;  // What customer receives
  notes?: string;
  lastUpdated: Date;
  isActive: boolean;
}

// Shop Types
export interface Shop {
  id: string;
  name: string;
  description?: string;
  owner: ShopOwner;
  location: Coordinates;
  trades: Trade[];
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

// UI State Types
export interface FilterState {
  searchQuery: string;
  categories: ItemCategory[];
  ownerType?: OwnerType;
  hasStock?: boolean;
  priceRange?: { min: number; max: number };
}

export interface SortState {
  field: 'name' | 'price' | 'date' | 'distance';
  direction: 'asc' | 'desc';
}

// Helper function to convert quantities
export function convertToBaseItems(quantity: Quantity, stackSize: number = 64): number {
  const { amount, unit } = quantity;
  switch (unit) {
    case 'item':
      return amount;
    case 'stack':
      return amount * stackSize;
    case 'ci':
      return amount * stackSize; // Compacted = 1 stack
    case 'cs':
      return amount * stackSize * 64; // Compacted stack = 64 stacks
    case 'sc':
      return amount * 27 * stackSize; // Single chest = 27 stacks
    case 'dc':
      return amount * 54 * stackSize; // Double chest = 54 stacks
    default:
      return amount;
  }
}

export function formatQuantity(quantity: Quantity): string {
  const { amount, unit } = quantity;
  switch (unit) {
    case 'item':
      return `${amount}`;
    case 'stack':
      return `${amount} stack${amount !== 1 ? 's' : ''}`;
    case 'ci':
      return `${amount}ci`;
    case 'cs':
      return `${amount}cs`;
    case 'sc':
      return `${amount}sc`;
    case 'dc':
      return `${amount}dc`;
    default:
      return `${amount}`;
  }
}
