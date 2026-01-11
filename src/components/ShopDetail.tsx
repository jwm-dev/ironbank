import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit2, 
  Trash2, 
  MapPin, 
  Clock, 
  ArrowRightLeft,
  Copy,
  Tag,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  ChevronDown
} from 'lucide-react';
import { useShopStore } from '../store/shopStore';
import { PlayerBadge, PlayerGroup } from './PlayerHead';
import { MinecraftItem } from './MinecraftItem';
import { EnchantmentSelector } from './EnchantmentSelector';
import { formatQuantity } from '../types';
import { getItemDisplayName } from '../data/itemLoader';

type SortField = 'date' | 'input' | 'output' | 'inputQty' | 'outputQty';
type SortDirection = 'asc' | 'desc';
type StatusFilter = 'all' | 'active' | 'inactive';

export function ShopDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { getShop, deleteShop, customItems } = useShopStore();
  
  // Check if navigated from map
  const cameFromMap = location.state?.from === 'map';
  
  // Trade filtering and sorting state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showFilters, setShowFilters] = useState(false);
  
  const shop = getShop(id || '');

  if (!shop) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-300">Shop not found</h2>
        <p className="text-gray-500 mt-2">This shop may have been deleted or doesn't exist.</p>
        <Link to="/app" className="btn btn-primary mt-4 inline-flex">
          Back to Shops
        </Link>
      </div>
    );
  }

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this shop?')) {
      deleteShop(shop.id);
      navigate('/app');
    }
  };

  const copyCoords = () => {
    navigator.clipboard.writeText(`${shop.location.x} ${shop.location.y} ${shop.location.z}`);
  };

  const ownerMembers = shop.owner.type === 'group' 
    ? shop.owner.group?.members.map(m => m.ign) || []
    : [];

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter and sort trades
  const filteredAndSortedTrades = useMemo(() => {
    let trades = [...shop.trades];
    
    // Filter by status
    if (statusFilter === 'active') {
      trades = trades.filter(t => t.isActive);
    } else if (statusFilter === 'inactive') {
      trades = trades.filter(t => !t.isActive);
    }
    
    // Filter by search query (matches input or output item names)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().replace(/\s+/g, '_');
      trades = trades.filter(t => 
        t.input.itemId.toLowerCase().includes(query) ||
        t.output.itemId.toLowerCase().includes(query) ||
        t.input.customName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.output.customName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Sort trades
    trades.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'date':
          comparison = new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
          break;
        case 'input':
          comparison = a.input.itemId.localeCompare(b.input.itemId);
          break;
        case 'output':
          comparison = a.output.itemId.localeCompare(b.output.itemId);
          break;
        case 'inputQty':
          comparison = a.input.quantity.amount - b.input.quantity.amount;
          break;
        case 'outputQty':
          comparison = a.output.quantity.amount - b.output.quantity.amount;
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return trades;
  }, [shop.trades, statusFilter, searchQuery, sortField, sortDirection]);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back button */}
      <Link 
        to={cameFromMap ? "/app/map" : "/app"}
        data-tutorial="back-button"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-[#f1af15] transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        {cameFromMap ? 'Back to Map' : 'Back to Shops'}
      </Link>

      {/* Shop header */}
      <div className="bg-dark-200 border border-dark-50 rounded-lg p-6 mb-6 gradient-border" data-tutorial="shop-header">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{shop.name}</h1>
              {!shop.isActive && (
                <span className="px-2 py-1 bg-red-500/20 text-red-400 text-sm rounded">Inactive</span>
              )}
            </div>
            {shop.description && (
              <p className="text-gray-400 mt-2">{shop.description}</p>
            )}
          </div>
          
          <div className="flex items-center gap-2" data-tutorial="shop-actions">
            <Link 
              to={`/app/shop/${shop.id}/edit`}
              className="btn btn-ghost"
              data-tutorial="edit-button"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </Link>
            <button 
              onClick={handleDelete}
              className="btn btn-ghost text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tags */}
        {shop.tags && shop.tags.length > 0 && (
          <div className="flex items-center gap-2 mt-4" data-tutorial="shop-tags">
            <Tag className="w-4 h-4 text-gray-500" />
            {shop.tags.map(tag => (
              <span key={tag} className="px-2 py-1 bg-[#2489c7]/20 text-[#2489c7] text-xs rounded">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Owner card */}
        <div className="bg-dark-200 border border-dark-50 rounded-lg p-4" data-tutorial="shop-owner">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Owner</h3>
          {shop.owner.type === 'individual' && shop.owner.player ? (
            <div className="flex items-center gap-3">
              <PlayerBadge ign={shop.owner.player.ign} size="lg" />
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-semibold text-white">{shop.owner.group?.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Members:</span>
                <PlayerGroup players={ownerMembers} maxDisplay={6} size="sm" />
              </div>
            </div>
          )}
        </div>

        {/* Location card */}
        <div className="bg-dark-200 border border-dark-50 rounded-lg p-4" data-tutorial="shop-location">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Location</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#2489c7]/20 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-[#2489c7]" />
              </div>
              <div>
                <p className="font-mono text-white">
                  {shop.location.x}, {shop.location.y}, {shop.location.z}
                </p>
                <p className="text-xs text-gray-500">Shopside, The Commonwealth</p>
              </div>
            </div>
            <button 
              onClick={copyCoords}
              className="p-2 hover:bg-dark-100 rounded-lg transition-colors"
              title="Copy coordinates"
            >
              <Copy className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Trades section */}
      <div className="bg-dark-200 border border-dark-50 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-dark-50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-[#f1af15]" />
              Trades ({shop.trades.length})
            </h2>
            
            {shop.trades.length > 0 && (
              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input pl-9 pr-3 py-1.5 text-sm w-48"
                  />
                </div>
                
                {/* Filter toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`btn btn-ghost p-2 ${showFilters ? 'bg-[#2489c7]/20 text-[#2489c7]' : ''}`}
                >
                  <Filter className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          
          {/* Expanded filters */}
          {showFilters && shop.trades.length > 0 && (
            <div className="mt-4 pt-4 border-t border-dark-50 flex flex-wrap gap-4">
              {/* Status filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Status:</span>
                <div className="flex rounded-lg overflow-hidden border border-dark-50">
                  {(['all', 'active', 'inactive'] as StatusFilter[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1 text-sm capitalize transition-colors ${
                        statusFilter === status 
                          ? 'bg-[#2489c7] text-white' 
                          : 'bg-dark-300 text-gray-400 hover:bg-dark-100'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Sort options */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Sort by:</span>
                <div className="relative">
                  <select
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value as SortField)}
                    className="input py-1 pr-8 text-sm appearance-none cursor-pointer"
                  >
                    <option value="date">Last Updated</option>
                    <option value="input">Input Item</option>
                    <option value="output">Output Item</option>
                    <option value="inputQty">Input Quantity</option>
                    <option value="outputQty">Output Quantity</option>
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
                <button
                  onClick={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')}
                  className="btn btn-ghost p-2"
                  title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                >
                  {sortDirection === 'asc' ? (
                    <SortAsc className="w-4 h-4" />
                  ) : (
                    <SortDesc className="w-4 h-4" />
                  )}
                </button>
              </div>
              
              {/* Results count */}
              {(searchQuery || statusFilter !== 'all') && (
                <div className="text-sm text-gray-500 ml-auto">
                  Showing {filteredAndSortedTrades.length} of {shop.trades.length} trades
                </div>
              )}
            </div>
          )}
        </div>
        
        {shop.trades.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No trades listed for this shop
          </div>
        ) : filteredAndSortedTrades.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No trades match your filters
          </div>
        ) : (
          <div className="divide-y divide-dark-50" data-tutorial="shop-trades">
            {filteredAndSortedTrades.map(trade => (
              <div 
                key={trade.id} 
                data-tutorial="trade-item"
                className={`p-4 flex items-center gap-4 ${!trade.isActive ? 'opacity-50' : ''}`}
              >
                {/* Input (what you pay) */}
                <div className="flex-1 flex items-center gap-3">
                  <div className="w-12 h-12 bg-dark-300 rounded-lg flex items-center justify-center">
                    <MinecraftItem itemId={trade.input.itemId} size="lg" />
                  </div>
                  <div>
                    <p className="font-medium text-white capitalize">
                      {getItemDisplayName(trade.input.itemId, customItems)}
                    </p>
                    <p className="text-sm text-[#f1af15]">
                      {formatQuantity(trade.input.quantity)}
                    </p>
                    {trade.input.enchantments && trade.input.enchantments.length > 0 && (
                      <EnchantmentSelector
                        itemId={trade.input.itemId}
                        enchantments={trade.input.enchantments}
                        onChange={() => {}}
                        compact
                      />
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-center w-8">
                  <ArrowRightLeft className="w-5 h-5 text-gray-500" />
                </div>

                {/* Output (what you get) */}
                <div className="flex-1 flex items-center gap-3">
                  <div className="w-12 h-12 bg-dark-300 rounded-lg flex items-center justify-center">
                    <MinecraftItem itemId={trade.output.itemId} size="lg" />
                  </div>
                  <div>
                    <p className="font-medium text-white capitalize">
                      {getItemDisplayName(trade.output.itemId, customItems)}
                    </p>
                    <p className="text-sm text-green-400">
                      {formatQuantity(trade.output.quantity)}
                    </p>
                    {trade.output.enchantments && trade.output.enchantments.length > 0 && (
                      <EnchantmentSelector
                        itemId={trade.output.itemId}
                        enchantments={trade.output.enchantments}
                        onChange={() => {}}
                        compact
                      />
                    )}
                  </div>
                </div>

                {/* Status & date */}
                <div className="text-right">
                  {!trade.isActive && (
                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
                      Inactive
                    </span>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Updated {new Date(trade.lastUpdated).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="mt-6 flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span>Created {formatDate(shop.createdAt)}</span>
        </div>
        <div>
          Last updated {formatDate(shop.updatedAt)}
        </div>
      </div>
    </div>
  );
}
