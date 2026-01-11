import { Link } from 'react-router-dom';
import { MapPin, Store, ChevronRight } from 'lucide-react';
import { useShopStore } from '../store/shopStore';
import { useTutorialStore } from '../store/tutorialStore';
import { PlayerBadge, PlayerGroup } from './PlayerHead';
import { MinecraftItem } from './MinecraftItem';
import type { Shop } from '../types';

export function ShopList() {
  const { shops, filter, deleteShop } = useShopStore();
  const { createdShopId } = useTutorialStore();

  // Filter shops based on search query
  const filteredShops = shops.filter(shop => {
    if (!filter.searchQuery) return true;
    const query = filter.searchQuery.toLowerCase();
    return (
      shop.name.toLowerCase().includes(query) ||
      shop.description?.toLowerCase().includes(query) ||
      shop.owner.player?.ign.toLowerCase().includes(query) ||
      shop.owner.group?.name.toLowerCase().includes(query) ||
      shop.trades.some(t => 
        t.input.itemId.includes(query) || 
        t.output.itemId.includes(query)
      )
    );
  });

  return (
    <div className="max-w-4xl mx-auto">
      {/* Shop count */}
      <p className="text-gray-500 mb-6">
        {filteredShops.length} shop{filteredShops.length !== 1 ? 's' : ''} registered
      </p>

      {/* Shop list */}
      {filteredShops.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-dark-300/50 flex items-center justify-center mx-auto mb-4">
            <Store className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-300 mb-2">No shops yet</h3>
          <p className="text-gray-500 mb-6">Add your first shop to get started</p>
          <Link 
            to="/app/shop/new" 
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#f1af15] text-black font-medium rounded-full hover:bg-[#F5C94E] transition-colors shadow-lg shadow-[#f1af15]/20"
          >
            Add Shop
          </Link>
        </div>
      ) : (
        <div className="space-y-3" data-tutorial="shop-list">
          {filteredShops.map((shop, index) => (
            <ShopCard 
              key={shop.id} 
              shop={shop} 
              onDelete={() => deleteShop(shop.id)} 
              index={index}
              isCreatedShop={shop.id === createdShopId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ShopCardProps {
  shop: Shop;
  onDelete: () => void;
  index: number;
  isCreatedShop?: boolean;
}

function ShopCard({ shop, index, isCreatedShop }: ShopCardProps) {
  return (
    <Link
      to={`/app/shop/${shop.id}`}
      data-tutorial="shop-card"
      data-tutorial-shop-index={index}
      {...(isCreatedShop && { 'data-tutorial': 'created-shop' })}
      className="group flex items-center gap-4 p-4 bg-dark-300/30 hover:bg-[#2489c7]/10 border border-white/5 hover:border-[#2489c7]/30 rounded-2xl transition-all"
    >
      {/* Owner avatar */}
      <div className="w-10 h-10 shrink-0 flex items-center justify-center">
        {shop.owner.type === 'individual' && shop.owner.player ? (
          <PlayerBadge ign={shop.owner.player.ign} size="lg" showName={false} />
        ) : shop.owner.type === 'group' && shop.owner.group?.members && shop.owner.group.members.length > 0 ? (
          <PlayerGroup 
            players={shop.owner.group.members.map(m => m.ign)} 
            maxDisplay={3} 
            size="sm" 
          />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-dark-400 flex items-center justify-center text-gray-500">
            <Store className="w-5 h-5" />
          </div>
        )}
      </div>

      {/* Shop info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-white group-hover:text-[#f1af15] transition-colors truncate">
            {shop.name}
          </h3>
          {!shop.isActive && (
            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">Closed</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
          <span>{shop.owner.player?.ign || shop.owner.group?.name}</span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {shop.location.x}, {shop.location.z}
          </span>
        </div>
      </div>

      {/* Trade preview */}
      <div className="hidden sm:flex items-center gap-1">
        {shop.trades.slice(0, 3).map(trade => (
          <div key={trade.id} className="w-8 h-8 bg-dark-400/50 rounded-lg flex items-center justify-center">
            <MinecraftItem itemId={trade.output.itemId} size="sm" />
          </div>
        ))}
        {shop.trades.length > 3 && (
          <div className="w-8 h-8 bg-dark-400/50 rounded-lg flex items-center justify-center text-xs text-gray-400">
            +{shop.trades.length - 3}
          </div>
        )}
      </div>

      {/* Chevron */}
      <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-gray-400 transition-colors" />
    </Link>
  );
}
