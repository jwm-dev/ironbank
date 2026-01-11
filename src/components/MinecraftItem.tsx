import { useState, useEffect } from 'react';
import { useShopStore } from '../store/shopStore';

interface MinecraftItemProps {
  itemId: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTooltip?: boolean;
  enchanted?: boolean;
}

const SIZE_CLASSES = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

/**
 * Special cases where wiki naming differs from item IDs
 * Only include truly exceptional cases that can't be pattern-matched
 */
const WIKI_NAME_OVERRIDES: Record<string, string> = {
  // Waxed variants - wiki strips "waxed_" prefix
  'waxed_copper_block': 'Block_of_Copper',
  'waxed_exposed_copper': 'Exposed_Copper',
  'waxed_weathered_copper': 'Weathered_Copper',
  'waxed_oxidized_copper': 'Oxidized_Copper',
  'waxed_cut_copper': 'Cut_Copper',
  'waxed_exposed_cut_copper': 'Exposed_Cut_Copper',
  'waxed_weathered_cut_copper': 'Weathered_Cut_Copper',
  'waxed_oxidized_cut_copper': 'Oxidized_Cut_Copper',
  'waxed_cut_copper_stairs': 'Cut_Copper_Stairs',
  'waxed_exposed_cut_copper_stairs': 'Exposed_Cut_Copper_Stairs',
  'waxed_weathered_cut_copper_stairs': 'Weathered_Cut_Copper_Stairs',
  'waxed_oxidized_cut_copper_stairs': 'Oxidized_Cut_Copper_Stairs',
  'waxed_cut_copper_slab': 'Cut_Copper_Slab',
  'waxed_exposed_cut_copper_slab': 'Exposed_Cut_Copper_Slab',
  'waxed_weathered_cut_copper_slab': 'Weathered_Cut_Copper_Slab',
  'waxed_oxidized_cut_copper_slab': 'Oxidized_Cut_Copper_Slab',
  'waxed_copper_grate': 'Copper_Grate',
  'waxed_exposed_copper_grate': 'Exposed_Copper_Grate',
  'waxed_weathered_copper_grate': 'Weathered_Copper_Grate',
  'waxed_oxidized_copper_grate': 'Oxidized_Copper_Grate',
  'waxed_chiseled_copper': 'Chiseled_Copper',
  'waxed_exposed_chiseled_copper': 'Exposed_Chiseled_Copper',
  'waxed_weathered_chiseled_copper': 'Weathered_Chiseled_Copper',
  'waxed_oxidized_chiseled_copper': 'Oxidized_Chiseled_Copper',
  'waxed_copper_bulb': 'Copper_Bulb',
  'waxed_exposed_copper_bulb': 'Exposed_Copper_Bulb',
  'waxed_weathered_copper_bulb': 'Weathered_Copper_Bulb',
  'waxed_oxidized_copper_bulb': 'Oxidized_Copper_Bulb',
  'waxed_copper_door': 'Copper_Door',
  'waxed_exposed_copper_door': 'Exposed_Copper_Door',
  'waxed_weathered_copper_door': 'Weathered_Copper_Door',
  'waxed_oxidized_copper_door': 'Oxidized_Copper_Door',
  'waxed_copper_trapdoor': 'Copper_Trapdoor',
  'waxed_exposed_copper_trapdoor': 'Exposed_Copper_Trapdoor',
  'waxed_weathered_copper_trapdoor': 'Weathered_Copper_Trapdoor',
  'waxed_oxidized_copper_trapdoor': 'Oxidized_Copper_Trapdoor',
  // Lapis uses full name
  'lapis_block': 'Block_of_Lapis_Lazuli',
  'lapis_ore': 'Lapis_Lazuli_Ore',
  'deepslate_lapis_ore': 'Deepslate_Lapis_Lazuli_Ore',
  'lapis_lazuli': 'Lapis_Lazuli',
};

/**
 * Dynamic wiki name generation with pattern detection
 * Handles common Minecraft wiki naming conventions automatically
 */
function generateWikiNames(itemId: string): string[] {
  const names: string[] = [];
  const titleCase = itemId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('_');
  
  // Check for explicit overrides first (highest priority)
  if (WIKI_NAME_OVERRIDES[itemId]) {
    names.push(WIKI_NAME_OVERRIDES[itemId]);
  }
  
  // Pattern: X_block → Block_of_X (e.g., bamboo_block → Block_of_Bamboo, iron_block → Block_of_Iron)
  // Handles: material_block, raw_X_block, etc.
  const blockMatch = itemId.match(/^(.+)_block$/);
  if (blockMatch) {
    const material = blockMatch[1];
    // Convert material to title case
    const materialTitleCase = material.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('_');
    names.push(`Block_of_${materialTitleCase}`);
  }
  
  // Pattern: waxed_X → strip waxed prefix for wiki (handled mostly by overrides, but add fallback)
  if (itemId.startsWith('waxed_')) {
    const unwaxed = itemId.slice(6);
    const unwaxedTitleCase = unwaxed.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('_');
    names.push(unwaxedTitleCase);
  }
  
  // Pattern: stripped_X_log / stripped_X_wood / stripped_X_hyphae
  if (itemId.startsWith('stripped_')) {
    const rest = itemId.slice(9);
    const restTitleCase = rest.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('_');
    names.push(`Stripped_${restTitleCase}`);
  }
  
  // Standard title case (always include as fallback)
  names.push(titleCase);
  
  // Try with JE suffix for items with Java Edition specific textures
  names.push(`${titleCase}_(JE)`);
  
  return [...new Set(names)]; // dedupe
}

/**
 * Generate multiple URL variants to try
 */
function generateTextureUrls(itemId: string): string[] {
  const wikiNames = generateWikiNames(itemId);
  
  const variations: string[] = [];
  
  // Add all wiki name variations as primary sources
  for (const wikiName of wikiNames) {
    variations.push(`https://minecraft.wiki/images/Invicon_${wikiName}.png`);
  }
  
  // Raw GitHub assets as fallbacks (good coverage, reliable CDN)
  variations.push(`https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21/items/${itemId}.png`);
  variations.push(`https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.20.4/items/${itemId}.png`);
  
  // InventivetalentDev assets for textures
  variations.push(`https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.21/assets/minecraft/textures/item/${itemId}.png`);
  variations.push(`https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.21/assets/minecraft/textures/block/${itemId}.png`);
  
  return variations;
}

/**
 * Renders a Minecraft item texture
 * Uses multiple fallback sources for maximum coverage
 */
export function MinecraftItem({ 
  itemId, 
  name, 
  size = 'md', 
  className = '',
  showTooltip = true,
  enchanted = false 
}: MinecraftItemProps) {
  const { customItems } = useShopStore();
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const [hasError, setHasError] = useState(false);
  
  // If this is a custom item ID, look up the base item for texture
  let textureItemId = itemId;
  let displayItemName = name;
  
  if (itemId.startsWith('custom_')) {
    const customItem = customItems.find(c => c.id === itemId);
    if (customItem) {
      textureItemId = customItem.baseItemId;
      displayItemName = name || customItem.name;
    }
  }
  
  const fallbackUrls = generateTextureUrls(textureItemId);
  const imgSrc = fallbackUrls[fallbackIndex] || fallbackUrls[0];

  const displayName = displayItemName || itemId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  // Reset state when itemId or textureItemId changes
  useEffect(() => {
    setFallbackIndex(0);
    setHasError(false);
  }, [itemId, textureItemId]);

  const handleError = () => {
    if (fallbackIndex < fallbackUrls.length - 1) {
      setFallbackIndex(prev => prev + 1);
    } else {
      setHasError(true);
    }
  };

  return (
    <div 
      className={`relative inline-flex items-center justify-center ${className}`}
      title={showTooltip ? displayName : undefined}
    >
      {hasError ? (
        // Fallback placeholder when all URLs fail
        <div className={`${SIZE_CLASSES[size]} bg-dark-300 rounded flex items-center justify-center text-xs text-gray-500 font-mono`}>
          {itemId.charAt(0).toUpperCase()}
        </div>
      ) : (
        <>
          <img
            src={imgSrc}
            alt={displayName}
            className={`minecraft-texture ${SIZE_CLASSES[size]} object-contain ${enchanted ? 'enchanted-item' : ''}`}
            loading="lazy"
            onError={handleError}
          />
          {enchanted && (
            <div 
              className={`absolute inset-0 ${SIZE_CLASSES[size]} enchantment-glint pointer-events-none`}
              style={{
                maskImage: `url(${imgSrc})`,
                maskSize: 'contain',
                maskPosition: 'center',
                maskRepeat: 'no-repeat',
                WebkitMaskImage: `url(${imgSrc})`,
                WebkitMaskSize: 'contain',
                WebkitMaskPosition: 'center',
                WebkitMaskRepeat: 'no-repeat',
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
