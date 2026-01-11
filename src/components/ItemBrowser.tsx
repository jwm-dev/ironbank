import { useState, useEffect, useMemo } from 'react';
import { X, Sparkles, Package, Plus } from 'lucide-react';
import { loadItems, getEnchantedItemsFromShops, customItemsToMinecraftItems, type MinecraftItem as MCItem } from '../data/itemLoader';
import { MinecraftItem } from './MinecraftItem';
import { CustomItemManager } from './CustomItemManager';
import { useShopStore } from '../store/shopStore';

// Category IDs MUST match the ItemCategory type from itemLoader
const CATEGORIES = [
  { id: 'all', name: 'All' },
  { id: 'enchanted', name: 'Enchanted' },
  { id: 'custom', name: 'Custom' },
  { id: 'tools', name: 'Tools' },
  { id: 'combat', name: 'Combat' },
  { id: 'food', name: 'Food' },
  { id: 'building_blocks', name: 'Building' },
  { id: 'colored_blocks', name: 'Colored' },
  { id: 'natural_blocks', name: 'Nature' },
  { id: 'functional_blocks', name: 'Functional' },
  { id: 'redstone', name: 'Redstone' },
  { id: 'ingredients', name: 'Ingredients' },
  { id: 'spawn_eggs', name: 'Spawn Eggs' },
  { id: 'operator_utilities', name: 'Other' },
];

export function ItemBrowser() {
  const [baseItems, setBaseItems] = useState<MCItem[]>([]);
  const [enchantedItems, setEnchantedItems] = useState<MCItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedItem, setSelectedItem] = useState<MCItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCustomItemManager, setShowCustomItemManager] = useState(false);
  
  const { shops, filter, customItems } = useShopStore();
  const searchQuery = filter.searchQuery;

  // Convert custom items to MCItem format
  const customMCItems = useMemo(() => {
    return customItemsToMinecraftItems(customItems);
  }, [customItems]);

  // Load base items
  useEffect(() => {
    loadItems().then(items => {
      setBaseItems(items);
      setLoading(false);
    });
  }, []);

  // Extract enchanted items from shops whenever shops change
  useEffect(() => {
    getEnchantedItemsFromShops(shops).then(items => {
      setEnchantedItems(items);
    });
  }, [shops]);

  // Combine base items with enchanted items and custom items
  const allItems = useMemo(() => {
    return [...baseItems, ...enchantedItems, ...customMCItems];
  }, [baseItems, enchantedItems, customMCItems]);

  const filteredItems = useMemo(() => {
    let items = allItems;
    
    // Special "enchanted" category shows only enchanted items
    if (selectedCategory === 'enchanted') {
      items = enchantedItems;
    } else if (selectedCategory === 'custom') {
      items = customMCItems;
    } else if (selectedCategory !== 'all') {
      items = items.filter(item => item.category === selectedCategory);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => 
        item.id.includes(query) || 
        item.displayName.toLowerCase().includes(query)
      );
    }
    
    return items;
  }, [allItems, enchantedItems, customMCItems, selectedCategory, searchQuery]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { 
      all: allItems.length,
      enchanted: enchantedItems.length,
      custom: customMCItems.length,
    };
    baseItems.forEach(item => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return counts;
  }, [allItems, baseItems, enchantedItems]);

  // Find all trades involving the selected item
  const itemTrades = useMemo(() => {
    if (!selectedItem) return [];
    
    const trades: Array<{
      shopName: string;
      ownerName: string;
      input: { itemId: string; quantity: number };
      output: { itemId: string; quantity: number };
      role: 'giving' | 'receiving';
    }> = [];

    // Helper to check if trade item matches selected item
    const itemMatches = (tradeItemId: string, tradeEnchantments: Array<{enchantmentId: string; level: number}> | undefined) => {
      if (selectedItem.enchantments && selectedItem.enchantments.length > 0) {
        // For enchanted items, match base item AND enchantments
        if (tradeItemId !== selectedItem.baseItemId) return false;
        if (!tradeEnchantments || tradeEnchantments.length !== selectedItem.enchantments.length) return false;
        
        // Sort both arrays and compare
        const sortedTrade = [...tradeEnchantments].sort((a, b) => a.enchantmentId.localeCompare(b.enchantmentId));
        const sortedSelected = [...selectedItem.enchantments].sort((a, b) => a.enchantmentId.localeCompare(b.enchantmentId));
        
        return sortedTrade.every((e, i) => 
          e.enchantmentId === sortedSelected[i].enchantmentId && e.level === sortedSelected[i].level
        );
      } else {
        // For regular items, just match the ID and ensure no enchantments
        return tradeItemId === selectedItem.id && (!tradeEnchantments || tradeEnchantments.length === 0);
      }
    };
    
    shops.forEach(shop => {
      const ownerName = shop.owner.type === 'individual' 
        ? shop.owner.player?.ign || 'Unknown'
        : shop.owner.group?.name || 'Unknown';
        
      shop.trades.filter(t => t.isActive).forEach(trade => {
        // Check if this item is being given (input) or received (output)
        if (itemMatches(trade.input.itemId, trade.input.enchantments)) {
          trades.push({ 
            shopName: shop.name, 
            ownerName,
            input: { itemId: trade.input.itemId, quantity: trade.input.quantity.amount },
            output: { itemId: trade.output.itemId, quantity: trade.output.quantity.amount },
            role: 'giving'
          });
        }
        if (itemMatches(trade.output.itemId, trade.output.enchantments)) {
          trades.push({ 
            shopName: shop.name, 
            ownerName,
            input: { itemId: trade.input.itemId, quantity: trade.input.quantity.amount },
            output: { itemId: trade.output.itemId, quantity: trade.output.quantity.amount },
            role: 'receiving'
          });
        }
      });
    });
    
    return trades;
  }, [selectedItem, shops]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#2489c7]/30 border-t-[#2489c7] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Category Pills with Custom Item Button */}
      <div className="flex flex-wrap items-center gap-2 mb-8" data-tutorial="item-categories">
        {CATEGORIES.map(cat => {
          const isCustom = cat.id === 'custom';
          const isIngredients = cat.id === 'ingredients';
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-[#2489c7] text-white shadow-lg shadow-[#2489c7]/20'
                  : 'bg-dark-300/50 text-gray-400 hover:bg-dark-300 hover:text-[#f1af15]'
              } ${isCustom ? 'ring-1 ring-cw-gold-500/30' : ''}`}
              data-tutorial={isIngredients ? 'category-ingredients' : undefined}
            >
              {isCustom && <Package className="w-3.5 h-3.5" />}
              {cat.name}
              <span className="opacity-60">{categoryCounts[cat.id] || 0}</span>
            </button>
          );
        })}
        
        {/* Add Custom Item Button */}
        <button
          onClick={() => setShowCustomItemManager(true)}
          className="px-4 py-2 rounded-full text-sm font-medium transition-all bg-cw-gold-500/20 text-cw-gold-400 hover:bg-cw-gold-500/30 flex items-center gap-1.5"
          title="Create custom/server items"
          data-tutorial="custom-items-tab"
        >
          <Plus className="w-4 h-4" />
          Add Custom
        </button>
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">No items found</p>
          <p className="text-gray-600 text-sm mt-1">
            {selectedCategory === 'custom' 
              ? 'Create custom items using the button above'
              : 'Try a different search or category'
            }
          </p>
          {selectedCategory === 'custom' && (
            <button
              onClick={() => setShowCustomItemManager(true)}
              className="mt-4 px-4 py-2 bg-cw-gold-500 hover:bg-cw-gold-400 text-black font-medium rounded-lg transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Custom Item
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-16 gap-1" data-tutorial="items-grid">
          {filteredItems.map((item, index) => {
            const isEnchanted = !!(item.enchantments && item.enchantments.length > 0);
            const isCustom = item.id.startsWith('custom_');
            const isDiamond = item.id === 'diamond';
            return (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`aspect-square bg-dark-300/30 hover:bg-[#2489c7]/15 border border-transparent hover:border-[#2489c7]/40 rounded-lg flex items-center justify-center transition-all hover:scale-105 group relative overflow-hidden ${
                  isEnchanted ? 'ring-1 ring-purple-500/30' : ''
                } ${isCustom ? 'ring-1 ring-cw-gold-500/30' : ''}`}
                title={item.displayName}
                data-tutorial={isDiamond ? 'item-diamond' : (index === 0 ? 'first-item' : undefined)}
              >
                <MinecraftItem 
                  itemId={item.baseItemId || item.id} 
                  size="md" 
                  enchanted={isEnchanted}
                />
                {isEnchanted && (
                  <Sparkles className="absolute top-0 right-0 w-3 h-3 text-purple-400 opacity-70" />
                )}
                {isCustom && (
                  <Package className="absolute top-0 right-0 w-3 h-3 text-cw-gold-400 opacity-70" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetailModal 
          item={selectedItem} 
          trades={itemTrades}
          onClose={() => setSelectedItem(null)} 
        />
      )}

      {/* Custom Item Manager Modal */}
      <CustomItemManager
        isOpen={showCustomItemManager}
        onClose={() => setShowCustomItemManager(false)}
      />
    </div>
  );
}

interface ItemDetailModalProps {
  item: MCItem;
  trades: Array<{
    shopName: string;
    ownerName: string;
    input: { itemId: string; quantity: number };
    output: { itemId: string; quantity: number };
    role: 'giving' | 'receiving';
  }>;
  onClose: () => void;
}

function ItemDetailModal({ item, trades, onClose }: ItemDetailModalProps) {
  // Trades where you give this item
  const givingTrades = trades.filter(t => t.role === 'giving');
  // Trades where you receive this item  
  const receivingTrades = trades.filter(t => t.role === 'receiving');

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
      data-tutorial="item-detail-overlay"
    >
      <div 
        className="bg-dark-400 border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
        data-tutorial="item-detail"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-dark-300 rounded-2xl flex items-center justify-center">
              <MinecraftItem itemId={item.id} size="xl" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-white">{item.displayName}</h2>
              <p className="text-sm text-gray-500">{item.id}</p>
              <span className="inline-block mt-1 px-2 py-0.5 bg-dark-200 rounded text-xs text-gray-400 capitalize">
                {item.category.replace(/_/g, ' ')}
              </span>
            </div>
            <button 
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              data-tutorial="item-close"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="p-6 border-b border-white/5">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{trades.length}</div>
              <div className="text-xs text-gray-500">Total Listings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-400">{givingTrades.length}</div>
              <div className="text-xs text-gray-500">Shops Buying</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{receivingTrades.length}</div>
              <div className="text-xs text-gray-500">Shops Selling</div>
            </div>
          </div>
        </div>

        {/* Trades List */}
        <div className="max-h-64 overflow-y-auto">
          {trades.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">No shops are trading this item</p>
              <p className="text-gray-600 text-sm mt-1">Add a shop trade to see it here</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {trades.map((t, i) => (
                <div key={i} className="px-6 py-4 flex items-center gap-4 hover:bg-white/5 transition-colors">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    t.role === 'giving' 
                      ? 'bg-amber-500/20 text-amber-400' 
                      : 'bg-green-500/20 text-green-400'
                  }`}>
                    {t.role === 'giving' ? 'BUYING' : 'SELLING'}
                  </span>
                  <div className="flex-1">
                    <p className="text-white font-medium">{t.shopName}</p>
                    <p className="text-xs text-gray-500">by {t.ownerName}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400">{t.input.quantity}×</span>
                    <MinecraftItem itemId={t.input.itemId} size="sm" />
                    <span className="text-gray-600">→</span>
                    <span className="text-gray-400">{t.output.quantity}×</span>
                    <MinecraftItem itemId={t.output.itemId} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
