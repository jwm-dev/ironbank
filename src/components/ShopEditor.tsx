import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  ArrowRightLeft,
  MapPin,
  User,
  Users as UsersIcon,
  Package
} from 'lucide-react';
import { useShopStore } from '../store/shopStore';
import { useTutorialStore, TUTORIAL_STEPS } from '../store/tutorialStore';
import { MinecraftItem } from './MinecraftItem';
import { EnchantmentSelector } from './EnchantmentSelector';
import { CustomItemManager } from './CustomItemManager';
import { searchItemsWithCustom, getItemDisplayName, type MinecraftItem as MCItem } from '../data/itemLoader';
import { canBeEnchanted } from '../data/enchantmentLoader';
import type { Shop, Trade, QuantityUnit } from '../types';
import { v4 as uuidv4 } from 'uuid';

const QUANTITY_UNITS: { value: QuantityUnit; label: string; description: string }[] = [
  { value: 'item', label: 'Items', description: 'Individual items' },
  { value: 'stack', label: 'Stacks', description: 'Stack (based on item stack size)' },
  { value: 'ci', label: 'ci', description: 'Compacted item (= 1 stack)' },
  { value: 'cs', label: 'cs', description: 'Compacted stack (= 64 stacks)' },
  { value: 'sc', label: 'sc', description: 'Single chest (27 stacks)' },
  { value: 'dc', label: 'dc', description: 'Double chest (54 stacks)' },
];

export function ShopEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getShop, addShop, updateShop, players, groups, addPlayer } = useShopStore();
  const { isActive: isTutorialActive, currentStepId, nextStep, setCreatedShopId } = useTutorialStore();
  
  // Get current tutorial step to check for blocking
  const currentStep = TUTORIAL_STEPS.find(s => s.id === currentStepId);
  const blockSaving = isTutorialActive && currentStep?.blockSaving;
  const isAddShopStep = currentStepId === 'add-shop-create';
  // Block navigation (back/cancel) during edit-intro or add-shop-create steps
  const blockNavButtons = blockSaving || isAddShopStep;
  
  // If no id param (on /shop/new) or id is literally 'new', it's a new shop
  const isNew = !id || id === 'new';
  const existingShop = isNew ? null : getShop(id);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ownerType, setOwnerType] = useState<'individual' | 'group'>('individual');
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [location, setLocation] = useState({ x: -3994, y: 64, z: 64 });
  // String versions for controlled inputs (allows typing "-" before number)
  const [locationStrings, setLocationStrings] = useState({ x: '-3994', y: '64', z: '64' });
  const [isActive, setIsActive] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [trades, setTrades] = useState<Trade[]>([]);

  // Handle coordinate input - allow typing partial values like "-" or "-12"
  const handleCoordinateChange = (axis: 'x' | 'y' | 'z', value: string) => {
    // Update the string immediately for responsive typing
    setLocationStrings(prev => ({ ...prev, [axis]: value }));
    
    // Only update the actual location if it's a valid number
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed)) {
      setLocation(prev => ({ ...prev, [axis]: parsed }));
    }
  };

  // On blur, sync the string to the actual value (in case user left it as "-" or empty)
  const handleCoordinateBlur = (axis: 'x' | 'y' | 'z') => {
    setLocationStrings(prev => ({ ...prev, [axis]: String(location[axis]) }));
  };

  // Load existing shop data
  useEffect(() => {
    if (existingShop) {
      setName(existingShop.name);
      setDescription(existingShop.description || '');
      setOwnerType(existingShop.owner.type);
      if (existingShop.owner.type === 'individual' && existingShop.owner.player) {
        setSelectedPlayer(existingShop.owner.player.ign);
      }
      if (existingShop.owner.type === 'group' && existingShop.owner.group) {
        setSelectedGroup(existingShop.owner.group.id);
      }
      setLocation(existingShop.location);
      setLocationStrings({
        x: String(existingShop.location.x),
        y: String(existingShop.location.y),
        z: String(existingShop.location.z)
      });
      setIsActive(existingShop.isActive);
      setTags(existingShop.tags || []);
      setTrades(existingShop.trades);
    }
  }, [existingShop]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleSubmit called!');
    
    // Block saving during tutorial exploration step
    if (blockSaving) {
      console.log('Saving blocked by tutorial step');
      return;
    }
    
    console.log('Form state:', { name, ownerType, selectedPlayer, newPlayerName, selectedGroup, location, isActive });
    
    // Validate
    if (!name.trim()) {
      console.log('Validation failed: no name');
      alert('Please enter a shop name');
      return;
    }

    // Find or create owner
    let owner: Shop['owner'];
    if (ownerType === 'individual') {
      const playerName = selectedPlayer || newPlayerName;
      console.log('Owner type: individual, playerName:', playerName);
      if (!playerName) {
        console.log('Validation failed: no player name');
        alert('Please select or enter a player name');
        return;
      }
      let player = players.find(p => p.ign.toLowerCase() === playerName.toLowerCase());
      if (!player) {
        player = { ign: playerName };
        addPlayer(player);
      }
      owner = { type: 'individual', player };
    } else {
      console.log('Owner type: group, selectedGroup:', selectedGroup);
      console.log('Available groups:', groups.map(g => ({ id: g.id, name: g.name })));
      const group = groups.find(g => g.id === selectedGroup);
      console.log('Found group:', group);
      if (!group) {
        console.log('Validation failed: group not found');
        alert('Please select a group');
        return;
      }
      owner = { type: 'group', group };
    }

    console.log('Owner created:', owner);

    const shopData = {
      name: name.trim(),
      description: description.trim() || undefined,
      owner,
      location,
      isActive,
      tags: tags.length > 0 ? tags : undefined,
      trades,
    };

    console.log('shopData created:', shopData);
    console.log('isNew:', isNew);

    if (isNew) {
      console.log('Calling addShop...');
      // addShop generates its own ID and returns it
      const newShopId = addShop(shopData);
      console.log('Created shop with ID:', newShopId, 'shopData:', shopData);
      if (!newShopId) {
        console.error('addShop did not return an ID!');
        alert('Error creating shop - no ID returned');
        return;
      }
      
      // Advance tutorial if on add-shop-create step
      if (isAddShopStep) {
        setCreatedShopId(newShopId);
        nextStep();
        // Don't navigate - let the tutorial step's navigateTo handle it
        return;
      }
      
      navigate(`/app/shop/${newShopId}`);
    } else {
      updateShop(id!, shopData);
      navigate(`/app/shop/${id}`);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const addTrade = () => {
    const newTrade: Trade = {
      id: uuidv4(),
      input: {
        itemId: 'diamond',
        quantity: { amount: 1, unit: 'd' },
      },
      output: {
        itemId: 'iron_ingot',
        quantity: { amount: 8, unit: 'item' },
      },
      isActive: true,
      lastUpdated: new Date(),
    };
    setTrades([...trades, newTrade]);
  };

  const updateTrade = (tradeId: string, updates: Partial<Trade>) => {
    setTrades(trades.map(t => t.id === tradeId ? { ...t, ...updates } : t));
  };

  const removeTrade = (tradeId: string) => {
    setTrades(trades.filter(t => t.id !== tradeId));
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back button */}
      {blockNavButtons ? (
        <span className="inline-flex items-center gap-2 text-gray-600 cursor-not-allowed mb-6">
          <ArrowLeft className="w-4 h-4" />
          {isNew ? 'Back to Shops' : 'Back to Shop'}
        </span>
      ) : (
        <Link 
          to={isNew ? '/app' : `/app/shop/${id}`}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {isNew ? 'Back to Shops' : 'Back to Shop'}
        </Link>
      )}

      <form onSubmit={handleSubmit}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">
            {isNew ? 'Add New Shop' : 'Edit Shop'}
          </h1>
          <button 
            type="submit" 
            className={`btn btn-primary ${blockSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
            data-tutorial={isNew ? 'create-shop-btn' : 'save-button'}
            onClick={() => console.log('Submit button clicked!')}
          >
            <Save className="w-4 h-4" />
            {isNew ? 'Create Shop' : 'Save Changes'}
          </button>
        </div>

        {/* Basic info */}
        <div className="bg-dark-200 border border-dark-50 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Shop Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 bg-dark-300 border border-dark-50 rounded-lg text-white focus:outline-none focus:border-cw-gold-500"
                placeholder="e.g., Bowilla's General Store"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 bg-dark-300 border border-dark-50 rounded-lg text-white focus:outline-none focus:border-cw-gold-500 resize-none"
                rows={3}
                placeholder="Brief description of the shop..."
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded border-dark-50 bg-dark-300 text-cw-gold-500 focus:ring-cw-gold-500"
                />
                <span className="text-gray-300">Shop is active</span>
              </label>
            </div>
          </div>
        </div>

        {/* Owner */}
        <div className="bg-dark-200 border border-dark-50 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Owner</h2>
          
          <div className="flex gap-4 mb-4">
            <button
              type="button"
              onClick={() => setOwnerType('individual')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                ownerType === 'individual'
                  ? 'bg-cw-gold-500/20 border-cw-gold-500 text-cw-gold-400'
                  : 'bg-dark-300 border-dark-50 text-gray-400 hover:border-gray-600'
              }`}
            >
              <User className="w-5 h-5" />
              Individual
            </button>
            <button
              type="button"
              onClick={() => setOwnerType('group')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                ownerType === 'group'
                  ? 'bg-cw-gold-500/20 border-cw-gold-500 text-cw-gold-400'
                  : 'bg-dark-300 border-dark-50 text-gray-400 hover:border-gray-600'
              }`}
            >
              <UsersIcon className="w-5 h-5" />
              Group
            </button>
          </div>

          {ownerType === 'individual' ? (
            <div className="space-y-3">
              <label className="block text-sm text-gray-400">Select existing player or enter new</label>
              <select
                value={selectedPlayer}
                onChange={(e) => {
                  setSelectedPlayer(e.target.value);
                  setNewPlayerName('');
                }}
                className="w-full px-4 py-2 bg-dark-300 border border-dark-50 rounded-lg text-white focus:outline-none focus:border-cw-gold-500"
              >
                <option value="">-- Select player --</option>
                {players.map(p => (
                  <option key={p.ign} value={p.ign}>{p.ign}</option>
                ))}
              </select>
              <div className="text-center text-gray-500 text-sm">or</div>
              <input
                type="text"
                value={newPlayerName}
                onChange={(e) => {
                  setNewPlayerName(e.target.value);
                  setSelectedPlayer('');
                }}
                className="w-full px-4 py-2 bg-dark-300 border border-dark-50 rounded-lg text-white focus:outline-none focus:border-cw-gold-500"
                placeholder="Enter new player IGN..."
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Select group</label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full px-4 py-2 bg-dark-300 border border-dark-50 rounded-lg text-white focus:outline-none focus:border-cw-gold-500"
              >
                <option value="">-- Select group --</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              {groups.length === 0 && (
                <p className="text-sm text-gray-500 mt-2">No groups available. Create one first.</p>
              )}
            </div>
          )}
        </div>

        {/* Location */}
        <div className="bg-dark-200 border border-dark-50 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-cw-blue-400" />
            Location
          </h2>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">X</label>
              <input
                type="text"
                inputMode="numeric"
                value={locationStrings.x}
                onChange={(e) => handleCoordinateChange('x', e.target.value)}
                onBlur={() => handleCoordinateBlur('x')}
                className="w-full px-4 py-2 bg-dark-300 border border-dark-50 rounded-lg text-white focus:outline-none focus:border-cw-gold-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Y</label>
              <input
                type="text"
                inputMode="numeric"
                value={locationStrings.y}
                onChange={(e) => handleCoordinateChange('y', e.target.value)}
                onBlur={() => handleCoordinateBlur('y')}
                className="w-full px-4 py-2 bg-dark-300 border border-dark-50 rounded-lg text-white focus:outline-none focus:border-cw-gold-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Z</label>
              <input
                type="text"
                inputMode="numeric"
                value={locationStrings.z}
                onChange={(e) => handleCoordinateChange('z', e.target.value)}
                onBlur={() => handleCoordinateBlur('z')}
                className="w-full px-4 py-2 bg-dark-300 border border-dark-50 rounded-lg text-white focus:outline-none focus:border-cw-gold-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="bg-dark-200 border border-dark-50 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Tags</h2>
          
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              className="flex-1 px-4 py-2 bg-dark-300 border border-dark-50 rounded-lg text-white focus:outline-none focus:border-cw-gold-500"
              placeholder="Add a tag..."
            />
            <button type="button" onClick={addTag} className="btn btn-ghost">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <span 
                  key={tag} 
                  className="px-3 py-1 bg-cw-blue-500/20 text-cw-blue-300 rounded-full text-sm flex items-center gap-2"
                >
                  {tag}
                  <button 
                    type="button" 
                    onClick={() => removeTag(tag)}
                    className="hover:text-white"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Trades */}
        <div className="bg-dark-200 border border-dark-50 rounded-xl p-6 mb-6" data-tutorial="add-trade-section">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-cw-gold-400" />
              Trades
              {trades.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-cw-gold-500/20 text-cw-gold-400 rounded-full">
                  {trades.length}
                </span>
              )}
            </h2>
            <div className="flex items-center gap-2">
              <button 
                type="button" 
                onClick={addTrade} 
                className="btn btn-primary text-sm py-2"
                data-tutorial="add-trade-btn"
              >
                <Plus className="w-4 h-4" />
                Add Trade
              </button>
            </div>
          </div>

          {trades.length === 0 ? (
            <div className="text-center py-12 text-gray-500 border border-dashed border-dark-50 rounded-xl">
              <ArrowRightLeft className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="mb-2">No trades yet</p>
              <button
                type="button"
                onClick={addTrade}
                className="text-cw-gold-400 hover:text-cw-gold-300 transition-colors"
              >
                Add your first trade →
              </button>
            </div>
          ) : (
            <div className="space-y-4" data-tutorial="trade-list">
              {trades.map((trade, index) => (
                <TradeEditor 
                  key={trade.id} 
                  trade={trade}
                  index={index + 1}
                  onUpdate={(updates) => updateTrade(trade.id, updates)}
                  onRemove={() => removeTrade(trade.id)}
                />
              ))}
              <button
                type="button"
                onClick={addTrade}
                className="w-full py-3 border border-dashed border-dark-50 rounded-xl text-gray-500 hover:text-cw-gold-400 hover:border-cw-gold-500/30 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add another trade
              </button>
            </div>
          )}
        </div>

        {/* Submit button (mobile) */}
        <div className="flex justify-end gap-4">
          {blockNavButtons ? (
            <span className="btn btn-ghost opacity-50 cursor-not-allowed">
              Cancel
            </span>
          ) : (
            <Link to={isNew ? '/app' : `/app/shop/${id}`} className="btn btn-ghost">
              Cancel
            </Link>
          )}
          <button 
            type="submit" 
            className={`btn btn-primary ${blockSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
            data-tutorial={isNew ? 'create-shop-btn-bottom' : 'save-button'}
          >
            <Save className="w-4 h-4" />
            {isNew ? 'Create Shop' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

interface TradeEditorProps {
  trade: Trade;
  index: number;
  onUpdate: (updates: Partial<Trade>) => void;
  onRemove: () => void;
}

function TradeEditor({ trade, index, onUpdate, onRemove }: TradeEditorProps) {
  const { customItems } = useShopStore();
  const [inputSearch, setInputSearch] = useState('');
  const [outputSearch, setOutputSearch] = useState('');
  const [inputResults, setInputResults] = useState<MCItem[]>([]);
  const [outputResults, setOutputResults] = useState<MCItem[]>([]);
  const [showInputDropdown, setShowInputDropdown] = useState(false);
  const [showOutputDropdown, setShowOutputDropdown] = useState(false);
  const [showCustomItemCreator, setShowCustomItemCreator] = useState<'input' | 'output' | null>(null);

  useEffect(() => {
    if (inputSearch.length >= 2) {
      searchItemsWithCustom(inputSearch, customItems).then(setInputResults);
    } else {
      setInputResults([]);
    }
  }, [inputSearch, customItems]);

  useEffect(() => {
    if (outputSearch.length >= 2) {
      searchItemsWithCustom(outputSearch, customItems).then(setOutputResults);
    } else {
      setOutputResults([]);
    }
  }, [outputSearch, customItems]);

  const handleCustomItemCreated = (itemId: string, side: 'input' | 'output') => {
    if (side === 'input') {
      onUpdate({ input: { ...trade.input, itemId } });
      setInputSearch('');
    } else {
      onUpdate({ output: { ...trade.output, itemId } });
      setOutputSearch('');
    }
    setShowCustomItemCreator(null);
  };

  return (
    <div className="bg-dark-300 rounded-xl p-4 border border-dark-50 hover:border-gray-700 transition-all duration-200 animate-scaleIn">
      {/* Trade header */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-dark-50">
        <span className="text-xs font-medium text-gray-500">Trade #{index}</span>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={trade.isActive}
              onChange={(e) => onUpdate({ isActive: e.target.checked })}
              className="w-4 h-4 rounded border-dark-50 bg-dark-200 text-cw-gold-500"
            />
            <span className={trade.isActive ? 'text-green-400' : 'text-gray-500'}>
              {trade.isActive ? 'Active' : 'Inactive'}
            </span>
          </label>
          <button 
            type="button"
            onClick={onRemove}
            className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-start gap-4">
        {/* Input (cost) */}
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-2">Pay (cost)</label>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-dark-200 rounded-lg flex items-center justify-center shrink-0 relative">
              <MinecraftItem itemId={trade.input.itemId} size="md" />
              {trade.input.itemId.startsWith('custom_') && (
                <Package className="absolute -top-1 -right-1 w-3 h-3 text-cw-gold-400" />
              )}
            </div>
            <div className="relative flex-1">
              <input
                type="text"
                value={inputSearch}
                onChange={(e) => setInputSearch(e.target.value)}
                onFocus={() => setShowInputDropdown(true)}
                onBlur={() => setTimeout(() => setShowInputDropdown(false), 200)}
                placeholder={getItemDisplayName(trade.input.itemId, customItems)}
                className="w-full px-3 py-1.5 bg-dark-200 border border-dark-50 rounded text-sm text-white focus:outline-none focus:border-cw-gold-500"
              />
              {showInputDropdown && (
                <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-dark-400 border border-dark-50 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {inputResults.slice(0, 10).map(item => {
                    const isCustom = item.id.startsWith('custom_');
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onUpdate({ input: { ...trade.input, itemId: item.id } });
                          setInputSearch('');
                          setShowInputDropdown(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-dark-100 text-left"
                      >
                        <MinecraftItem itemId={item.baseItemId || item.id} size="sm" />
                        <span className="text-sm text-white flex-1">{item.displayName}</span>
                        {isCustom && <Package className="w-3 h-3 text-cw-gold-400" />}
                      </button>
                    );
                  })}
                  {/* Quick create custom item option */}
                  <button
                    type="button"
                    onClick={() => setShowCustomItemCreator('input')}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-cw-gold-500/10 text-left border-t border-dark-50"
                  >
                    <Plus className="w-4 h-4 text-cw-gold-400" />
                    <span className="text-sm text-cw-gold-400">Create custom item...</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              value={trade.input.quantity.amount}
              onChange={(e) => onUpdate({ 
                input: { ...trade.input, quantity: { ...trade.input.quantity, amount: parseFloat(e.target.value) || 0 } }
              })}
              className="w-20 px-2 py-1 bg-dark-200 border border-dark-50 rounded text-sm text-white focus:outline-none focus:border-cw-gold-500"
              min="0"
              step="1"
            />
            <select
              value={trade.input.quantity.unit}
              onChange={(e) => onUpdate({
                input: { ...trade.input, quantity: { ...trade.input.quantity, unit: e.target.value as QuantityUnit } }
              })}
              className="flex-1 px-2 py-1 bg-dark-200 border border-dark-50 rounded text-sm text-white focus:outline-none focus:border-cw-gold-500"
            >
              {QUANTITY_UNITS.map(u => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </div>
          {/* Enchantments for input item */}
          {canBeEnchanted(trade.input.itemId) && (
            <EnchantmentSelector
              itemId={trade.input.itemId}
              enchantments={trade.input.enchantments || []}
              onChange={(enchantments) => onUpdate({
                input: { ...trade.input, enchantments }
              })}
            />
          )}
        </div>

        {/* Arrow */}
        <div className="pt-8">
          <ArrowRightLeft className="w-5 h-5 text-gray-500" />
        </div>

        {/* Output (receive) */}
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-2">Receive</label>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-dark-200 rounded-lg flex items-center justify-center shrink-0 relative">
              <MinecraftItem itemId={trade.output.itemId} size="md" />
              {trade.output.itemId.startsWith('custom_') && (
                <Package className="absolute -top-1 -right-1 w-3 h-3 text-cw-gold-400" />
              )}
            </div>
            <div className="relative flex-1">
              <input
                type="text"
                value={outputSearch}
                onChange={(e) => setOutputSearch(e.target.value)}
                onFocus={() => setShowOutputDropdown(true)}
                onBlur={() => setTimeout(() => setShowOutputDropdown(false), 200)}
                placeholder={getItemDisplayName(trade.output.itemId, customItems)}
                className="w-full px-3 py-1.5 bg-dark-200 border border-dark-50 rounded text-sm text-white focus:outline-none focus:border-cw-gold-500"
              />
              {showOutputDropdown && (
                <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-dark-400 border border-dark-50 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {outputResults.slice(0, 10).map(item => {
                    const isCustom = item.id.startsWith('custom_');
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onUpdate({ output: { ...trade.output, itemId: item.id } });
                          setOutputSearch('');
                          setShowOutputDropdown(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-dark-100 text-left transition-colors"
                      >
                        <MinecraftItem itemId={item.baseItemId || item.id} size="sm" />
                        <span className="text-sm text-white flex-1">{item.displayName}</span>
                        {isCustom && <Package className="w-3 h-3 text-cw-gold-400" />}
                      </button>
                    );
                  })}
                  {/* Quick create custom item option */}
                  <button
                    type="button"
                    onClick={() => setShowCustomItemCreator('output')}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-cw-gold-500/10 text-left border-t border-dark-50"
                  >
                    <Plus className="w-4 h-4 text-cw-gold-400" />
                    <span className="text-sm text-cw-gold-400">Create custom item...</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              value={trade.output.quantity.amount}
              onChange={(e) => onUpdate({
                output: { ...trade.output, quantity: { ...trade.output.quantity, amount: parseFloat(e.target.value) || 0 } }
              })}
              className="w-20 px-3 py-2 bg-dark-200 border border-dark-50 rounded-lg text-sm text-white focus:outline-none focus:border-cw-gold-500 transition-colors"
              min="0"
              step="1"
            />
            <select
              value={trade.output.quantity.unit}
              onChange={(e) => onUpdate({
                output: { ...trade.output, quantity: { ...trade.output.quantity, unit: e.target.value as QuantityUnit } }
              })}
              className="flex-1 px-3 py-2 bg-dark-200 border border-dark-50 rounded-lg text-sm text-white focus:outline-none focus:border-cw-gold-500 transition-colors cursor-pointer"
            >
              {QUANTITY_UNITS.map(u => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </div>
          {/* Enchantments for output item */}
          {canBeEnchanted(trade.output.itemId) && (
            <EnchantmentSelector
              itemId={trade.output.itemId}
              enchantments={trade.output.enchantments || []}
              onChange={(enchantments) => onUpdate({
                output: { ...trade.output, enchantments }
              })}
            />
          )}
        </div>
      </div>

      {/* Custom Item Creator Modal */}
      {showCustomItemCreator && (
        <CustomItemManager
          isOpen={true}
          onClose={() => setShowCustomItemCreator(null)}
          onItemCreated={(id) => handleCustomItemCreated(id, showCustomItemCreator)}
          quickCreate
        />
      )}
    </div>
  );
}
