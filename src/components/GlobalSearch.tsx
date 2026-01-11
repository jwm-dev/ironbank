import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Store, Package, User, Users, X, Sparkles, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useShopStore } from '../store/shopStore';
import { loadItems, getItemDisplayName, type MinecraftItem } from '../data/itemLoader';
import { loadEnchantments, type Enchantment } from '../data/enchantmentLoader';
import { MinecraftItem as MinecraftItemIcon } from './MinecraftItem';
import { PlayerHead } from './PlayerHead';

interface SearchResult {
  id: string;
  type: 'shop' | 'item' | 'player' | 'group' | 'custom_item' | 'enchanted_item';
  title: string;
  subtitle?: string;
  icon?: string;
  url?: string;
  enchantments?: Array<{ enchantmentId: string; level: number }>;
}

export function GlobalSearch() {
  const navigate = useNavigate();
  const { filter, setFilter, shops, players, groups, customItems } = useShopStore();
  const [isOpen, setIsOpen] = useState(false);
  const [allItems, setAllItems] = useState<MinecraftItem[]>([]);
  const [allEnchantments, setAllEnchantments] = useState<Enchantment[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const searchQuery = filter.searchQuery;

  // Load items and enchantments on mount
  useEffect(() => {
    loadItems().then(setAllItems);
    loadEnchantments().then(setAllEnchantments);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper to get enchantment display name
  const getEnchantmentName = (enchId: string): string => {
    const ench = allEnchantments.find(e => e.name === enchId);
    return ench?.displayName || enchId.replace(/_/g, ' ');
  };

  // Search results
  const results = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    
    const query = searchQuery.toLowerCase();
    const results: SearchResult[] = [];
    const seenEnchantedItems = new Set<string>(); // Dedup enchanted items
    
    // Search shops - also search by item display names
    shops.forEach(shop => {
      const matchesTrade = shop.trades.some(t => {
        const inputName = getItemDisplayName(t.input.itemId, customItems).toLowerCase();
        const outputName = getItemDisplayName(t.output.itemId, customItems).toLowerCase();
        return inputName.includes(query) || outputName.includes(query) ||
               t.input.itemId.includes(query) || t.output.itemId.includes(query);
      });
      
      // Check if any trade has enchantments matching the query
      const matchesEnchant = shop.trades.some(t => 
        t.output.enchantments?.some(e => 
          e.enchantmentId.includes(query) || 
          getEnchantmentName(e.enchantmentId).toLowerCase().includes(query)
        )
      );
      
      if (
        shop.name.toLowerCase().includes(query) ||
        shop.description?.toLowerCase().includes(query) ||
        shop.owner.player?.ign.toLowerCase().includes(query) ||
        shop.owner.group?.name.toLowerCase().includes(query) ||
        matchesTrade ||
        matchesEnchant
      ) {
        results.push({
          id: shop.id,
          type: 'shop',
          title: shop.name,
          subtitle: shop.owner.player?.ign || shop.owner.group?.name,
          url: `/app/shop/${shop.id}`,
        });
      }
      
      // Also index enchanted items from trades
      shop.trades.forEach(trade => {
        if (trade.output.enchantments && trade.output.enchantments.length > 0) {
          const itemName = getItemDisplayName(trade.output.itemId, customItems);
          const enchantNames = trade.output.enchantments.map(e => 
            `${getEnchantmentName(e.enchantmentId)} ${e.level}`
          ).join(', ');
          
          // Check if this enchanted item matches
          const matchesItem = itemName.toLowerCase().includes(query) || trade.output.itemId.includes(query);
          const matchesEnchantment = trade.output.enchantments.some(e =>
            e.enchantmentId.includes(query) ||
            getEnchantmentName(e.enchantmentId).toLowerCase().includes(query)
          );
          
          if (matchesItem || matchesEnchantment) {
            const key = `${trade.output.itemId}-${enchantNames}`;
            if (!seenEnchantedItems.has(key)) {
              seenEnchantedItems.add(key);
              results.push({
                id: `enchanted-${trade.id}`,
                type: 'enchanted_item',
                title: itemName,
                subtitle: enchantNames,
                icon: trade.output.itemId,
                url: `/app/shop/${shop.id}`,
                enchantments: trade.output.enchantments,
              });
            }
          }
        }
      });
    });
    
    // Search custom items
    customItems.forEach(item => {
      if (
        item.name.toLowerCase().includes(query) ||
        item.id.includes(query) ||
        item.baseItemId.includes(query)
      ) {
        results.push({
          id: item.id,
          type: 'custom_item',
          title: item.name,
          subtitle: `Based on ${getItemDisplayName(item.baseItemId, [])}`,
          icon: item.baseItemId,
          url: '/app/items',
        });
      }
    });
    
    // Search items
    allItems.forEach(item => {
      if (
        item.id.includes(query) ||
        item.displayName.toLowerCase().includes(query)
      ) {
        results.push({
          id: item.id,
          type: 'item',
          title: item.displayName,
          subtitle: item.category.replace(/_/g, ' '),
          icon: item.id,
          url: '/app/items',
        });
      }
    });
    
    // Search players
    players.forEach(player => {
      if (
        player.ign.toLowerCase().includes(query) ||
        player.notes?.toLowerCase().includes(query)
      ) {
        results.push({
          id: player.ign,
          type: 'player',
          title: player.ign,
          subtitle: player.notes || 'Player',
          url: '/app/players',
        });
      }
    });
    
    // Search groups
    groups.forEach(group => {
      if (
        group.name.toLowerCase().includes(query) ||
        group.notes?.toLowerCase().includes(query) ||
        group.members.some(m => m.ign.toLowerCase().includes(query))
      ) {
        results.push({
          id: group.id,
          type: 'group',
          title: group.name,
          subtitle: `${group.members.length} member${group.members.length !== 1 ? 's' : ''}`,
          url: '/app/players',
        });
      }
    });
    
    // Limit results
    return results.slice(0, 15);
  }, [searchQuery, shops, players, groups, allItems, customItems, allEnchantments]);

  // Group results by type
  const groupedResults = useMemo(() => {
    const grouped: Record<string, SearchResult[]> = {};
    results.forEach(result => {
      if (!grouped[result.type]) grouped[result.type] = [];
      grouped[result.type].push(result);
    });
    return grouped;
  }, [results]);

  const handleSelect = (result: SearchResult) => {
    if (result.url) {
      navigate(result.url);
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    setFilter({ searchQuery: '' });
    inputRef.current?.focus();
  };

  const typeLabels: Record<string, { label: string; icon: any }> = {
    shop: { label: 'Shops', icon: Store },
    item: { label: 'Items', icon: Package },
    custom_item: { label: 'Custom Items', icon: Star },
    enchanted_item: { label: 'Enchanted Items', icon: Sparkles },
    player: { label: 'Players', icon: User },
    group: { label: 'Groups', icon: Users },
  };

  return (
    <div className="relative">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search shops, items, players..."
          value={searchQuery}
          onChange={(e) => setFilter({ searchQuery: e.target.value })}
          onFocus={() => setIsOpen(true)}
          className="w-64 h-9 pl-9 pr-8 bg-dark-300/50 border border-white/5 rounded-full text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#2489c7] focus:ring-1 focus:ring-[#2489c7]/30 focus:w-80 transition-all"
        />
        {searchQuery && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown results */}
      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          data-tutorial-search-dropdown
          className="absolute top-full mt-2 right-0 w-96 bg-dark-400/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
        >
          <div className="max-h-96 overflow-y-auto">
            {Object.entries(groupedResults).map(([type, items]) => (
              <div key={type}>
                {/* Section header */}
                <div className="px-4 py-2 bg-dark-500/50 border-b border-white/5 flex items-center gap-2">
                  {(() => {
                    const TypeIcon = typeLabels[type]?.icon || Package;
                    return <TypeIcon className="w-3.5 h-3.5 text-[#2489c7]" />;
                  })()}
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                    {typeLabels[type]?.label || type}
                  </span>
                  <span className="text-xs text-gray-500">({items.length})</span>
                </div>
                
                {/* Results */}
                {items.map(result => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelect(result)}
                    className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#2489c7]/10 transition-colors text-left"
                  >
                    {/* Icon */}
                    {(result.type === 'item' || result.type === 'custom_item') && result.icon ? (
                      <div className="w-8 h-8 bg-dark-500 rounded-lg flex items-center justify-center">
                        <MinecraftItemIcon itemId={result.icon} size="sm" />
                      </div>
                    ) : result.type === 'enchanted_item' && result.icon ? (
                      <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center relative">
                        <MinecraftItemIcon itemId={result.icon} size="sm" enchanted />
                      </div>
                    ) : result.type === 'player' ? (
                      <PlayerHead ign={result.title} size="sm" />
                    ) : result.type === 'shop' ? (
                      <div className="w-8 h-8 bg-[#f1af15]/20 rounded-lg flex items-center justify-center">
                        <Store className="w-4 h-4 text-[#f1af15]" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-[#2489c7]/20 rounded-lg flex items-center justify-center">
                        <Users className="w-4 h-4 text-[#2489c7]" />
                      </div>
                    )}
                    
                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${result.type === 'enchanted_item' ? 'text-purple-300' : 'text-white'}`}>
                        {result.title}
                      </p>
                      {result.subtitle && (
                        <p className={`text-xs truncate ${result.type === 'enchanted_item' ? 'text-purple-400/70' : 'text-gray-500'}`}>
                          {result.subtitle}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
          
          {/* Footer hint */}
          <div className="px-4 py-2 bg-dark-500/50 border-t border-white/5 text-xs text-gray-500 text-center">
            Search filters all pages • Press Esc to close
          </div>
        </div>
      )}

      {/* No results message */}
      {isOpen && searchQuery.length >= 2 && results.length === 0 && (
        <div
          ref={dropdownRef}
          data-tutorial-search-dropdown
          className="absolute top-full mt-2 right-0 w-80 bg-dark-400/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 p-6 text-center"
        >
          <Search className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-gray-400">No results found</p>
          <p className="text-sm text-gray-500 mt-1">Try a different search term</p>
        </div>
      )}
    </div>
  );
}
