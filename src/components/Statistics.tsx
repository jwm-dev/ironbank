import { useMemo, useState } from 'react';
import { 
  TrendingUp, 
  Package, 
  ArrowRightLeft, 
  Users, 
  MapPin,
  BarChart3,
  Gem,
  Activity,
  Layers,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Tag
} from 'lucide-react';
import { useShopStore } from '../store/shopStore';
import { MinecraftItem } from './MinecraftItem';
import { convertToBaseItems } from '../types';
import { PlayerHead } from './PlayerHead';

type TimeRange = '7d' | '30d' | 'all';

export function Statistics() {
  const { shops, players, groups } = useShopStore();
  const [timeRange, setTimeRange] = useState<TimeRange>('all');

  const stats = useMemo(() => {
    const activeShops = shops.filter(s => s.isActive);
    const allTrades = shops.flatMap(s => s.trades);
    const activeTrades = allTrades.filter(t => t.isActive);

    // Count items being traded - separate buy/sell
    const itemStats: Record<string, { 
      bought: number; 
      sold: number;
      avgBuyPrice?: number;
      avgSellPrice?: number;
      shopCount: number;
    }> = {};

    activeTrades.forEach(trade => {
      const inputId = trade.input.itemId;
      const outputId = trade.output.itemId;
      
      if (!itemStats[inputId]) itemStats[inputId] = { bought: 0, sold: 0, shopCount: 0 };
      if (!itemStats[outputId]) itemStats[outputId] = { bought: 0, sold: 0, shopCount: 0 };
      
      itemStats[inputId].bought += convertToBaseItems(trade.input.quantity);
      itemStats[outputId].sold += convertToBaseItems(trade.output.quantity);
    });

    // Count unique shops per item
    activeShops.forEach(shop => {
      const itemsInShop = new Set<string>();
      shop.trades.filter(t => t.isActive).forEach(trade => {
        itemsInShop.add(trade.input.itemId);
        itemsInShop.add(trade.output.itemId);
      });
      itemsInShop.forEach(itemId => {
        if (itemStats[itemId]) itemStats[itemId].shopCount++;
      });
    });

    // Most traded items (by total volume)
    const topItems = Object.entries(itemStats)
      .map(([id, counts]) => ({ 
        id, 
        total: counts.bought + counts.sold, 
        bought: counts.bought,
        sold: counts.sold,
        shopCount: counts.shopCount,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Items with most shops offering them
    const mostAvailable = Object.entries(itemStats)
      .filter(([_, data]) => data.shopCount > 0)
      .map(([id, data]) => ({ id, shopCount: data.shopCount }))
      .sort((a, b) => b.shopCount - a.shopCount)
      .slice(0, 8);

    // Diamond economy analysis
    const diamondTrades = activeTrades.filter(t => 
      t.input.itemId === 'diamond' || t.output.itemId === 'diamond'
    );
    const diamondBuying = diamondTrades.filter(t => t.input.itemId === 'diamond');
    const diamondSelling = diamondTrades.filter(t => t.output.itemId === 'diamond');

    // Iron economy analysis
    const ironTrades = activeTrades.filter(t => 
      t.input.itemId === 'iron_ingot' || t.output.itemId === 'iron_ingot'
    );

    // Shops by owner (with more detail)
    const ownerStats: Record<string, { shops: number; trades: number; isGroup: boolean }> = {};
    activeShops.forEach(shop => {
      const isGroup = shop.owner.type === 'group';
      const key = isGroup 
        ? shop.owner.group?.name || 'Unknown'
        : shop.owner.player?.ign || 'Unknown';
      if (!ownerStats[key]) ownerStats[key] = { shops: 0, trades: 0, isGroup };
      ownerStats[key].shops++;
      ownerStats[key].trades += shop.trades.filter(t => t.isActive).length;
    });
    const topOwners = Object.entries(ownerStats)
      .sort((a, b) => b[1].trades - a[1].trades)
      .slice(0, 5);

    // Trade categories
    const tradeCategories = {
      tools: activeTrades.filter(t => 
        ['diamond_pickaxe', 'iron_pickaxe', 'diamond_axe', 'iron_axe', 'diamond_shovel', 'diamond_hoe', 'diamond_sword'].includes(t.input.itemId) ||
        ['diamond_pickaxe', 'iron_pickaxe', 'diamond_axe', 'iron_axe', 'diamond_shovel', 'diamond_hoe', 'diamond_sword'].includes(t.output.itemId)
      ).length,
      armor: activeTrades.filter(t => 
        t.input.itemId.includes('helmet') || t.input.itemId.includes('chestplate') || 
        t.input.itemId.includes('leggings') || t.input.itemId.includes('boots') ||
        t.output.itemId.includes('helmet') || t.output.itemId.includes('chestplate') ||
        t.output.itemId.includes('leggings') || t.output.itemId.includes('boots')
      ).length,
      food: activeTrades.filter(t => 
        ['bread', 'cooked_beef', 'cooked_porkchop', 'golden_apple', 'golden_carrot', 'baked_potato', 'cooked_chicken', 'cooked_mutton', 'cooked_salmon', 'cooked_cod'].includes(t.input.itemId) ||
        ['bread', 'cooked_beef', 'cooked_porkchop', 'golden_apple', 'golden_carrot', 'baked_potato', 'cooked_chicken', 'cooked_mutton', 'cooked_salmon', 'cooked_cod'].includes(t.output.itemId)
      ).length,
      resources: activeTrades.filter(t => 
        ['diamond', 'iron_ingot', 'gold_ingot', 'emerald', 'coal', 'redstone', 'lapis_lazuli', 'copper_ingot', 'netherite_ingot'].includes(t.input.itemId) ||
        ['diamond', 'iron_ingot', 'gold_ingot', 'emerald', 'coal', 'redstone', 'lapis_lazuli', 'copper_ingot', 'netherite_ingot'].includes(t.output.itemId)
      ).length,
    };

    // Recent activity (shops updated in last X days)
    const now = new Date();
    const recentlyUpdated = activeShops.filter(shop => {
      const updated = new Date(shop.updatedAt);
      const daysDiff = (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7;
    }).length;

    return {
      totalShops: shops.length,
      activeShops: activeShops.length,
      inactiveShops: shops.length - activeShops.length,
      totalTrades: allTrades.length,
      activeTrades: activeTrades.length,
      totalPlayers: players.length,
      totalGroups: groups.length,
      topItems,
      mostAvailable,
      diamondTrades: diamondTrades.length,
      diamondBuying: diamondBuying.length,
      diamondSelling: diamondSelling.length,
      ironTrades: ironTrades.length,
      topOwners,
      tradeCategories,
      recentlyUpdated,
    };
  }, [shops, players, groups]);

  return (
    <div className="space-y-6" data-tutorial="statistics-page">
      {/* Time range selector */}
      <div className="flex items-center justify-end" data-tutorial="stats-time-range">
        <div className="flex items-center gap-2 bg-dark-200 rounded-xl p-1">
          {(['7d', '30d', 'all'] as TimeRange[]).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                timeRange === range
                  ? 'bg-[#2489c7]/20 text-[#2489c7]'
                  : 'text-gray-500 hover:text-[#f1af15]'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-tutorial="stats-metrics">
        <MetricCard 
          icon={MapPin}
          label="Active Shops"
          value={stats.activeShops}
          change={stats.recentlyUpdated > 0 ? `${stats.recentlyUpdated} updated this week` : undefined}
          positive={true}
          color="blue"
        />
        <MetricCard 
          icon={ArrowRightLeft}
          label="Active Trades"
          value={stats.activeTrades}
          subtext={`across ${stats.activeShops} shops`}
          color="gold"
        />
        <MetricCard 
          icon={Users}
          label="Merchants"
          value={stats.totalPlayers + stats.totalGroups}
          subtext={`${stats.totalPlayers} players, ${stats.totalGroups} groups`}
          color="green"
        />
        <MetricCard 
          icon={Gem}
          label="Diamond Trades"
          value={stats.diamondTrades}
          subtext={`${stats.diamondBuying} buying, ${stats.diamondSelling} selling`}
          color="cyan"
        />
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Traded Items */}
        <div className="bg-dark-200 border border-dark-50 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-dark-50 flex items-center justify-between">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#f1af15]" />
              Most Traded Items
            </h2>
            <span className="text-xs text-gray-500">by trade volume</span>
          </div>
          <div className="p-4">
            {stats.topItems.length === 0 ? (
              <EmptyState message="No trade data yet" />
            ) : (
              <div className="space-y-2">
                {stats.topItems.map((item, index) => (
                  <div 
                    key={item.id} 
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-dark-100 transition-colors group"
                  >
                    <span className="text-sm text-gray-600 w-5 font-medium">{index + 1}</span>
                    <div className="w-9 h-9 bg-dark-300 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <MinecraftItem itemId={item.id} size="md" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white truncate capitalize font-medium">
                        {item.id.replace(/_/g, ' ')}
                      </p>
                      <div className="flex gap-3 text-xs">
                        <span className="text-green-400 flex items-center gap-0.5">
                          <ArrowUpRight className="w-3 h-3" />
                          {item.sold.toLocaleString()}
                        </span>
                        <span className="text-red-400 flex items-center gap-0.5">
                          <ArrowDownRight className="w-3 h-3" />
                          {item.bought.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-white">{item.total.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{item.shopCount} shop{item.shopCount !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top Merchants */}
        <div className="bg-dark-200 border border-dark-50 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-dark-50">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-[#2489c7]" />
              Top Merchants
            </h2>
          </div>
          <div className="p-4">
            {stats.topOwners.length === 0 ? (
              <EmptyState message="No shop data yet" />
            ) : (
              <div className="space-y-2">
                {stats.topOwners.map(([name, data], index) => (
                  <div 
                    key={name} 
                    className="flex items-center gap-3 p-3 rounded-xl bg-dark-300/50 hover:bg-dark-100 transition-colors"
                  >
                    <span className="text-sm text-gray-600 w-5 font-medium">{index + 1}</span>
                    <div className="relative">
                      {data.isGroup ? (
                        <div className="w-10 h-10 bg-dark-400 rounded-xl flex items-center justify-center">
                          <Users className="w-5 h-5 text-cw-blue-400" />
                        </div>
                      ) : (
                        <PlayerHead ign={name} size="lg" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{name}</p>
                      <p className="text-xs text-gray-500">
                        {data.isGroup ? 'Group' : 'Player'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-white">{data.shops} shop{data.shops !== 1 ? 's' : ''}</p>
                      <p className="text-xs text-gray-500">{data.trades} trade{data.trades !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trade Categories */}
      <div className="bg-dark-200 border border-dark-50 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-dark-50">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-cw-gold-400" />
            Trade Categories
          </h2>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <CategoryCard 
              icon={Package}
              label="Resources"
              count={stats.tradeCategories.resources}
              total={stats.activeTrades}
              color="amber"
            />
            <CategoryCard 
              icon={ShoppingCart}
              label="Tools"
              count={stats.tradeCategories.tools}
              total={stats.activeTrades}
              color="blue"
            />
            <CategoryCard 
              icon={Activity}
              label="Armor"
              count={stats.tradeCategories.armor}
              total={stats.activeTrades}
              color="purple"
            />
            <CategoryCard 
              icon={Tag}
              label="Food"
              count={stats.tradeCategories.food}
              total={stats.activeTrades}
              color="green"
            />
          </div>
        </div>
      </div>

      {/* Item Availability */}
      <div className="bg-dark-200 border border-dark-50 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-dark-50">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cw-gold-400" />
            Most Available Items
          </h2>
          <p className="text-xs text-gray-500 mt-1">Items offered at the most shops</p>
        </div>
        <div className="p-4">
          {stats.mostAvailable.length === 0 ? (
            <EmptyState message="No availability data yet" />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {stats.mostAvailable.map((item) => (
                <div 
                  key={item.id}
                  className="flex flex-col items-center gap-2 p-3 bg-dark-300/50 rounded-xl hover:bg-dark-100 transition-colors group cursor-default"
                >
                  <div className="w-10 h-10 bg-dark-400 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <MinecraftItem itemId={item.id} size="lg" />
                  </div>
                  <p className="text-xs text-gray-400 text-center truncate w-full capitalize">
                    {item.id.replace(/_/g, ' ')}
                  </p>
                  <span className="text-xs font-medium text-cw-gold-400">
                    {item.shopCount} shop{item.shopCount !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  icon: any;
  label: string;
  value: number;
  subtext?: string;
  change?: string;
  positive?: boolean;
  color: 'blue' | 'gold' | 'green' | 'cyan';
}

function MetricCard({ icon: Icon, label, value, subtext, change, positive, color }: MetricCardProps) {
  const colors = {
    blue: 'bg-[#2489c7]/10 text-[#2489c7] border-[#2489c7]/20',
    gold: 'bg-[#f1af15]/10 text-[#f1af15] border-[#f1af15]/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  };

  const iconColors = {
    blue: 'bg-[#2489c7]/20 text-[#2489c7]',
    gold: 'bg-[#f1af15]/20 text-[#f1af15]',
    green: 'bg-green-500/20 text-green-400',
    cyan: 'bg-cyan-500/20 text-cyan-400',
  };

  return (
    <div className={`bg-dark-200 border rounded-2xl p-4 transition-all duration-200 hover:shadow-lg ${colors[color].split(' ')[2]}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconColors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-sm text-gray-400">{label}</p>
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value.toLocaleString()}</p>
      {change ? (
        <p className={`text-xs flex items-center gap-1 ${positive ? 'text-green-400' : 'text-red-400'}`}>
          <Clock className="w-3 h-3" />
          {change}
        </p>
      ) : subtext ? (
        <p className="text-xs text-gray-500">{subtext}</p>
      ) : null}
    </div>
  );
}

interface CategoryCardProps {
  icon: any;
  label: string;
  count: number;
  total: number;
  color: 'amber' | 'blue' | 'purple' | 'green';
}

function CategoryCard({ icon: Icon, label, count, total, color }: CategoryCardProps) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  
  const colors = {
    amber: 'from-amber-500/20 to-amber-600/10 text-amber-400',
    blue: 'from-blue-500/20 to-blue-600/10 text-blue-400',
    purple: 'from-purple-500/20 to-purple-600/10 text-purple-400',
    green: 'from-green-500/20 to-green-600/10 text-green-400',
  };

  const barColors = {
    amber: 'bg-amber-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    green: 'bg-green-500',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color].split(' ')[0]} ${colors[color].split(' ')[1]} rounded-xl p-4 border border-white/5`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-4 h-4 ${colors[color].split(' ')[2]}`} />
        <span className="text-sm font-medium text-white">{label}</span>
      </div>
      <div className="flex items-end justify-between mb-2">
        <span className="text-2xl font-bold text-white">{count}</span>
        <span className="text-xs text-gray-500">{percentage}%</span>
      </div>
      <div className="h-1.5 bg-dark-400 rounded-full overflow-hidden">
        <div 
          className={`h-full ${barColors[color]} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-8">
      <BarChart3 className="w-10 h-10 text-gray-600 mx-auto mb-2" />
      <p className="text-gray-500">{message}</p>
    </div>
  );
}
