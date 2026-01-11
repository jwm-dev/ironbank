// ============================================
// Minecraft Item Data Loader
// Processes items.json and blocks.json at runtime
// ============================================

import type { MinecraftItem, ItemCategory } from '../types';

// Re-export the types for convenience
export type { MinecraftItem, ItemCategory };

// Raw data types from JSON files
interface RawItem {
  id: number;
  name: string;
  displayName: string;
  stackSize: number;
}

// Category inference rules based on item name patterns
const CATEGORY_RULES: [RegExp, ItemCategory][] = [
  // Tools
  [/^(wooden|stone|iron|golden|diamond|netherite)_(pickaxe|axe|shovel|hoe|sword)$/, 'tools'],
  [/(pickaxe|axe|shovel|hoe|shears|flint_and_steel|fishing_rod|compass|clock|spyglass|brush|bundle)$/, 'tools'],
  
  // Combat
  [/^(wooden|stone|iron|golden|diamond|netherite)_sword$/, 'combat'],
  [/(bow|crossbow|arrow|trident|shield|mace)/, 'combat'],
  [/_(helmet|chestplate|leggings|boots)$/, 'combat'],
  [/^turtle_helmet$/, 'combat'],
  [/^totem_of_undying$/, 'combat'],
  
  // Food
  [/^(apple|golden_apple|enchanted_golden_apple|bread|porkchop|cooked_porkchop|cod|salmon|tropical_fish|pufferfish)$/, 'food'],
  [/^(cooked_cod|cooked_salmon|cake|cookie|melon_slice|dried_kelp|beef|cooked_beef|chicken|cooked_chicken)$/, 'food'],
  [/^(rotten_flesh|spider_eye|carrot|golden_carrot|potato|baked_potato|poisonous_potato|beetroot|beetroot_soup)$/, 'food'],
  [/^(mushroom_stew|rabbit_stew|suspicious_stew|rabbit|cooked_rabbit|mutton|cooked_mutton|sweet_berries|glow_berries|honey_bottle|chorus_fruit)$/, 'food'],
  [/^pumpkin_pie$/, 'food'],
  
  // Redstone
  [/^(redstone|redstone_block|redstone_torch|redstone_lamp|repeater|comparator|target|lever|tripwire_hook)$/, 'redstone'],
  [/^(observer|piston|sticky_piston|slime_block|honey_block|dispenser|dropper|hopper|daylight_detector)$/, 'redstone'],
  [/_button$/, 'redstone'],
  [/_pressure_plate$/, 'redstone'],
  [/^(note_block|jukebox|bell|lightning_rod|sculk_sensor|calibrated_sculk_sensor)$/, 'redstone'],
  [/^(tnt|crafter)$/, 'redstone'],
  
  // Colored blocks (wool, concrete, terracotta, glass, etc.)
  [/^(white|orange|magenta|light_blue|yellow|lime|pink|gray|light_gray|cyan|purple|blue|brown|green|red|black)_/, 'colored_blocks'],
  
  // Natural blocks
  [/^(dirt|grass_block|podzol|mycelium|mud|muddy_mangrove_roots|rooted_dirt|moss_block|clay|gravel|sand|red_sand)$/, 'natural_blocks'],
  [/^(snow|snow_block|powder_snow|ice|packed_ice|blue_ice|soul_sand|soul_soil|netherrack|crimson_nylium|warped_nylium)$/, 'natural_blocks'],
  [/_ore$/, 'natural_blocks'],
  [/^(coal_ore|iron_ore|copper_ore|gold_ore|redstone_ore|emerald_ore|lapis_ore|diamond_ore|nether_gold_ore|nether_quartz_ore|ancient_debris)$/, 'natural_blocks'],
  [/^deepslate_.*_ore$/, 'natural_blocks'],
  [/_log$/, 'natural_blocks'],
  [/_wood$/, 'natural_blocks'],
  [/_leaves$/, 'natural_blocks'],
  [/^(bamboo|cactus|sugar_cane|kelp|seagrass|sea_pickle|lily_pad|vine|glow_lichen|hanging_roots|spore_blossom)$/, 'natural_blocks'],
  [/^(sunflower|lilac|rose_bush|peony|tall_grass|large_fern|fern|dead_bush)$/, 'natural_blocks'],
  [/^(dandelion|poppy|blue_orchid|allium|azure_bluet|red_tulip|orange_tulip|white_tulip|pink_tulip|oxeye_daisy|cornflower|lily_of_the_valley|wither_rose|torchflower|pitcher_plant)$/, 'natural_blocks'],
  [/_fungus$/, 'natural_blocks'],
  [/_mushroom$/, 'natural_blocks'],
  
  // Functional blocks
  [/^(crafting_table|furnace|blast_furnace|smoker|cartography_table|fletching_table|smithing_table|grindstone|stonecutter|loom|composter)$/, 'functional_blocks'],
  [/^(anvil|chipped_anvil|damaged_anvil|enchanting_table|brewing_stand|cauldron|beacon|conduit|lodestone|respawn_anchor|end_portal_frame)$/, 'functional_blocks'],
  [/^(chest|trapped_chest|ender_chest|barrel|shulker_box)$/, 'functional_blocks'],
  [/_shulker_box$/, 'functional_blocks'],
  [/^(bookshelf|chiseled_bookshelf|lectern|bed)$/, 'functional_blocks'],
  [/_bed$/, 'functional_blocks'],
  [/^(campfire|soul_campfire|torch|soul_torch|lantern|soul_lantern|candle|end_rod|sea_lantern|glowstone|shroomlight|ochre_froglight|verdant_froglight|pearlescent_froglight)$/, 'functional_blocks'],
  [/_candle$/, 'functional_blocks'],
  [/^(ladder|scaffolding|chain)$/, 'functional_blocks'],
  [/_sign$/, 'functional_blocks'],
  [/_hanging_sign$/, 'functional_blocks'],
  [/^(flower_pot|armor_stand|item_frame|glow_item_frame|painting)$/, 'functional_blocks'],
  
  // Building blocks
  [/_bricks?$/, 'building_blocks'],
  [/_planks$/, 'building_blocks'],
  [/_slab$/, 'building_blocks'],
  [/_stairs$/, 'building_blocks'],
  [/_wall$/, 'building_blocks'],
  [/_fence$/, 'building_blocks'],
  [/_fence_gate$/, 'building_blocks'],
  [/_door$/, 'building_blocks'],
  [/_trapdoor$/, 'building_blocks'],
  [/^(cobblestone|mossy_cobblestone|stone_bricks|mossy_stone_bricks|cracked_stone_bricks|chiseled_stone_bricks)$/, 'building_blocks'],
  [/^(deepslate_bricks|cracked_deepslate_bricks|deepslate_tiles|cracked_deepslate_tiles|chiseled_deepslate|polished_deepslate)$/, 'building_blocks'],
  [/^(sandstone|chiseled_sandstone|cut_sandstone|smooth_sandstone|red_sandstone|chiseled_red_sandstone|cut_red_sandstone|smooth_red_sandstone)$/, 'building_blocks'],
  [/^(quartz_block|chiseled_quartz_block|quartz_bricks|quartz_pillar|smooth_quartz)$/, 'building_blocks'],
  [/^(prismarine|prismarine_bricks|dark_prismarine)$/, 'building_blocks'],
  [/^(purpur_block|purpur_pillar)$/, 'building_blocks'],
  [/^(end_stone|end_stone_bricks)$/, 'building_blocks'],
  [/^(blackstone|polished_blackstone|polished_blackstone_bricks|cracked_polished_blackstone_bricks|chiseled_polished_blackstone|gilded_blackstone)$/, 'building_blocks'],
  [/^(basalt|polished_basalt|smooth_basalt)$/, 'building_blocks'],
  [/^(obsidian|crying_obsidian)$/, 'building_blocks'],
  [/^(copper_block|exposed_copper|weathered_copper|oxidized_copper|cut_copper|exposed_cut_copper|weathered_cut_copper|oxidized_cut_copper)$/, 'building_blocks'],
  [/^waxed_/, 'building_blocks'],
  [/^(iron_block|gold_block|diamond_block|netherite_block|emerald_block|lapis_block|redstone_block|coal_block|raw_iron_block|raw_gold_block|raw_copper_block|amethyst_block)$/, 'building_blocks'],
  [/^(glass|tinted_glass)$/, 'building_blocks'],
  [/_glass$/, 'building_blocks'],
  [/_glass_pane$/, 'building_blocks'],
  
  // Ingredients / Materials
  [/^(diamond|emerald|lapis_lazuli|coal|charcoal|raw_iron|raw_gold|raw_copper|iron_ingot|gold_ingot|copper_ingot|netherite_ingot|netherite_scrap)$/, 'ingredients'],
  [/^(stick|string|feather|leather|rabbit_hide|phantom_membrane|bone|bone_meal|ink_sac|glow_ink_sac)$/, 'ingredients'],
  [/^(gunpowder|blaze_powder|blaze_rod|magma_cream|slime_ball|ender_pearl|ender_eye|nether_star|ghast_tear|dragon_breath)$/, 'ingredients'],
  [/^(prismarine_shard|prismarine_crystals|nautilus_shell|heart_of_the_sea|shulker_shell|echo_shard|disc_fragment_5)$/, 'ingredients'],
  [/^(paper|book|writable_book|written_book|enchanted_book|name_tag|lead|saddle)$/, 'ingredients'],
  [/^(glass_bottle|potion|splash_potion|lingering_potion|experience_bottle)$/, 'ingredients'],
  [/^(bucket|water_bucket|lava_bucket|powder_snow_bucket|milk_bucket|axolotl_bucket|tadpole_bucket)$/, 'ingredients'],
  [/_bucket$/, 'ingredients'],
  [/_dye$/, 'ingredients'],
  [/^(wheat|wheat_seeds|beetroot_seeds|melon_seeds|pumpkin_seeds|cocoa_beans|nether_wart)$/, 'ingredients'],
  [/^(amethyst_shard|copper_ingot|honeycomb|honey_block|wax)$/, 'ingredients'],
  [/_pottery_sherd$/, 'ingredients'],
  [/_smithing_template$/, 'ingredients'],
  [/_banner_pattern$/, 'ingredients'],
  [/^(trial_key|ominous_trial_key|wind_charge|breeze_rod|heavy_core)$/, 'ingredients'],
  
  // Spawn eggs
  [/_spawn_egg$/, 'spawn_eggs'],
  
  // Operator utilities
  [/^(command_block|chain_command_block|repeating_command_block|structure_block|structure_void|jigsaw|barrier|light|debug_stick|knowledge_book)$/, 'operator_utilities'],
];

// Infer category from item name
function inferCategory(name: string): ItemCategory {
  for (const [pattern, category] of CATEGORY_RULES) {
    if (pattern.test(name)) {
      return category;
    }
  }
  // Default to building blocks for unmatched items
  return 'building_blocks';
}

// Generate texture URL from item name
// Uses the official Minecraft Wiki texture CDN
function getTextureUrl(name: string): string {
  // Convert snake_case to Title_Case for wiki URLs
  const formattedName = name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('_');
  
  // Use the Minecraft Wiki's inventory sprite format
  return `https://minecraft.wiki/images/Invicon_${formattedName}.png`;
}

// Items to exclude (non-obtainable or technical)
const EXCLUDED_ITEMS = new Set([
  'air',
  'cave_air',
  'void_air',
  'moving_piston',
  'piston_head',
  'nether_portal',
  'end_portal',
  'end_gateway',
  'frosted_ice',
  'bubble_column',
  'fire',
  'soul_fire',
  'water',
  'lava',
]);

// Singleton to cache loaded items
let cachedItems: MinecraftItem[] | null = null;
let cachedItemsMap: Map<string, MinecraftItem> | null = null;

// Load items from JSON (to be imported)
export async function loadItems(): Promise<MinecraftItem[]> {
  if (cachedItems) {
    return cachedItems;
  }

  try {
    // Dynamic import of the JSON files
    const itemsData = await import('../../assets/items.json');
    const rawItems: RawItem[] = itemsData.default || itemsData;

    cachedItems = rawItems
      .filter(item => !EXCLUDED_ITEMS.has(item.name))
      .map(item => ({
        id: item.name,
        name: item.name,
        displayName: item.displayName,
        category: inferCategory(item.name),
        stackSize: item.stackSize,
        textureUrl: getTextureUrl(item.name),
      }));

    return cachedItems;
  } catch (error) {
    console.error('Failed to load items:', error);
    return [];
  }
}

// Get items map for quick lookup
export async function getItemsMap(): Promise<Map<string, MinecraftItem>> {
  if (cachedItemsMap) {
    return cachedItemsMap;
  }

  const items = await loadItems();
  cachedItemsMap = new Map(items.map(item => [item.id, item]));
  return cachedItemsMap;
}

// Get item by ID
export async function getItem(id: string): Promise<MinecraftItem | undefined> {
  const map = await getItemsMap();
  return map.get(id);
}

// Get items by category
export async function getItemsByCategory(category: ItemCategory): Promise<MinecraftItem[]> {
  const items = await loadItems();
  return items.filter(item => item.category === category);
}

// Search items by name
export async function searchItems(query: string): Promise<MinecraftItem[]> {
  const items = await loadItems();
  // Normalize query: lowercase and convert spaces to underscores for matching IDs
  const lowerQuery = query.toLowerCase().trim();
  const underscoreQuery = lowerQuery.replace(/\s+/g, '_');
  
  return items.filter(item => {
    const lowerName = item.name.toLowerCase();
    const lowerDisplayName = item.displayName.toLowerCase();
    const lowerId = item.id.toLowerCase();
    
    // Match against display name (user-friendly), name, or id
    // Also try matching with spaces converted to underscores
    return (
      lowerDisplayName.includes(lowerQuery) ||
      lowerName.includes(lowerQuery) ||
      lowerId.includes(lowerQuery) ||
      lowerName.includes(underscoreQuery) ||
      lowerId.includes(underscoreQuery)
    );
  });
}

// Get all categories with item counts
export async function getCategoryCounts(): Promise<Record<ItemCategory, number>> {
  const items = await loadItems();
  const counts: Record<ItemCategory, number> = {
    building_blocks: 0,
    colored_blocks: 0,
    natural_blocks: 0,
    functional_blocks: 0,
    redstone: 0,
    tools: 0,
    combat: 0,
    food: 0,
    ingredients: 0,
    spawn_eggs: 0,
    operator_utilities: 0,
  };

  for (const item of items) {
    counts[item.category]++;
  }

  return counts;
}

// Category display names
export const CATEGORY_NAMES: Record<ItemCategory, string> = {
  building_blocks: 'Building Blocks',
  colored_blocks: 'Colored Blocks',
  natural_blocks: 'Natural Blocks',
  functional_blocks: 'Functional Blocks',
  redstone: 'Redstone',
  tools: 'Tools',
  combat: 'Combat',
  food: 'Food',
  ingredients: 'Ingredients',
  spawn_eggs: 'Spawn Eggs',
  operator_utilities: 'Operator Utilities',
};

// Category icons (using Lucide icon names)
export const CATEGORY_ICONS: Record<ItemCategory, string> = {
  building_blocks: 'Brick',
  colored_blocks: 'Palette',
  natural_blocks: 'TreeDeciduous',
  functional_blocks: 'Settings',
  redstone: 'Zap',
  tools: 'Wrench',
  combat: 'Sword',
  food: 'Apple',
  ingredients: 'FlaskConical',
  spawn_eggs: 'Egg',
  operator_utilities: 'Shield',
};

// Import types needed for enchanted items
import type { Shop, AppliedEnchantment, CustomItem } from '../types';

/**
 * Get display name for an item ID, handling custom items
 * @param itemId The item ID (can be regular Minecraft ID or custom_ prefixed)
 * @param customItems Array of custom items to look up from
 * @returns The display name for the item
 */
export function getItemDisplayName(itemId: string, customItems: CustomItem[]): string {
  // Check if it's a custom item
  if (itemId.startsWith('custom_')) {
    const customItem = customItems.find(c => c.id === itemId);
    if (customItem) {
      return customItem.name;
    }
  }
  // Default: convert snake_case to Title Case
  return itemId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Convert CustomItem objects to MinecraftItem format for display/search
 */
export function customItemsToMinecraftItems(customItems: CustomItem[]): MinecraftItem[] {
  return customItems.map(custom => ({
    id: custom.id,
    name: custom.name.toLowerCase().replace(/\s+/g, '_'),
    displayName: custom.name,
    category: 'operator_utilities' as ItemCategory, // Use a generic category for custom items
    stackSize: 64,
    textureUrl: getTextureUrl(custom.baseItemId),
    baseItemId: custom.baseItemId, // Store the base item for texture rendering
  }));
}

/**
 * Search items including custom items
 */
export async function searchItemsWithCustom(query: string, customItems: CustomItem[]): Promise<MinecraftItem[]> {
  const baseResults = await searchItems(query);
  const customResults = customItemsToMinecraftItems(customItems);
  
  // Filter custom items by query
  const lowerQuery = query.toLowerCase().trim();
  const underscoreQuery = lowerQuery.replace(/\s+/g, '_');
  
  const filteredCustom = customResults.filter(item => {
    const lowerName = item.name.toLowerCase();
    const lowerDisplayName = item.displayName.toLowerCase();
    const lowerId = item.id.toLowerCase();
    
    return (
      lowerDisplayName.includes(lowerQuery) ||
      lowerName.includes(lowerQuery) ||
      lowerId.includes(lowerQuery) ||
      lowerName.includes(underscoreQuery) ||
      lowerId.includes(underscoreQuery)
    );
  });
  
  // Return custom items first, then base results
  return [...filteredCustom, ...baseResults];
}

/**
 * Create a unique ID for an enchanted item based on base item + enchantments
 * Sorts enchantments alphabetically to ensure consistent IDs
 */
function createEnchantedItemId(baseItemId: string, enchantments: AppliedEnchantment[]): string {
  // Sort enchantments by ID for consistent ordering
  const sortedEnchants = [...enchantments].sort((a, b) => 
    a.enchantmentId.localeCompare(b.enchantmentId)
  );
  
  // Create a unique ID string: baseItem_enchant1-level_enchant2-level
  const enchantStr = sortedEnchants
    .map(e => `${e.enchantmentId}-${e.level}`)
    .join('_');
  
  return `${baseItemId}__${enchantStr}`;
}

/**
 * Create a display name for an enchanted item
 */
function createEnchantedDisplayName(baseDisplayName: string, enchantments: AppliedEnchantment[]): string {
  // Convert enchantment ID to readable name and add roman numeral
  const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  
  const enchantNames = enchantments.map(e => {
    const name = e.enchantmentId
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    const level = romanNumerals[e.level - 1] || e.level.toString();
    return `${name} ${level}`;
  });
  
  return `${baseDisplayName} (${enchantNames.join(', ')})`;
}

/**
 * Extract unique enchanted items from all shop trades
 * Returns MinecraftItem objects for each unique item+enchantment combination
 */
export async function getEnchantedItemsFromShops(shops: Shop[]): Promise<MinecraftItem[]> {
  const itemsMap = await getItemsMap();
  const enchantedItemsMap = new Map<string, MinecraftItem>();
  
  for (const shop of shops) {
    for (const trade of shop.trades) {
      // Check input item
      if (trade.input.enchantments && trade.input.enchantments.length > 0) {
        const baseItem = itemsMap.get(trade.input.itemId);
        if (baseItem) {
          const enchantedId = createEnchantedItemId(trade.input.itemId, trade.input.enchantments);
          if (!enchantedItemsMap.has(enchantedId)) {
            enchantedItemsMap.set(enchantedId, {
              id: enchantedId,
              name: baseItem.name,
              displayName: createEnchantedDisplayName(baseItem.displayName, trade.input.enchantments),
              category: baseItem.category,
              stackSize: 1, // Enchanted items don't stack
              textureUrl: baseItem.textureUrl,
              enchantments: [...trade.input.enchantments],
              baseItemId: trade.input.itemId,
            });
          }
        }
      }
      
      // Check output item
      if (trade.output.enchantments && trade.output.enchantments.length > 0) {
        const baseItem = itemsMap.get(trade.output.itemId);
        if (baseItem) {
          const enchantedId = createEnchantedItemId(trade.output.itemId, trade.output.enchantments);
          if (!enchantedItemsMap.has(enchantedId)) {
            enchantedItemsMap.set(enchantedId, {
              id: enchantedId,
              name: baseItem.name,
              displayName: createEnchantedDisplayName(baseItem.displayName, trade.output.enchantments),
              category: baseItem.category,
              stackSize: 1,
              textureUrl: baseItem.textureUrl,
              enchantments: [...trade.output.enchantments],
              baseItemId: trade.output.itemId,
            });
          }
        }
      }
    }
  }
  
  // Return sorted by base item ID then by enchantment count
  return Array.from(enchantedItemsMap.values()).sort((a, b) => {
    const baseCompare = (a.baseItemId || a.id).localeCompare(b.baseItemId || b.id);
    if (baseCompare !== 0) return baseCompare;
    return (a.enchantments?.length || 0) - (b.enchantments?.length || 0);
  });
}
