import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Search, Package, Sparkles } from 'lucide-react';
import { useShopStore } from '../store/shopStore';
import { MinecraftItem } from './MinecraftItem';
import { searchItems, type MinecraftItem as MCItem } from '../data/itemLoader';

interface CustomItemManagerProps {
  isOpen: boolean;
  onClose: () => void;
  /** If provided, will call this when an item is created (for inline creation in TradeEditor) */
  onItemCreated?: (itemId: string) => void;
  /** If true, shows a simplified "quick create" mode */
  quickCreate?: boolean;
}

export function CustomItemManager({ 
  isOpen, 
  onClose, 
  onItemCreated,
  quickCreate = false 
}: CustomItemManagerProps) {
  const { customItems, addCustomItem, deleteCustomItem, updateCustomItem } = useShopStore();
  
  // Form state for creating new item
  const [newItemName, setNewItemName] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [selectedBaseItem, setSelectedBaseItem] = useState<string>('diamond');
  const [baseItemSearch, setBaseItemSearch] = useState('');
  const [baseItemResults, setBaseItemResults] = useState<MCItem[]>([]);
  const [showBaseItemDropdown, setShowBaseItemDropdown] = useState(false);
  
  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Search for base items
  useEffect(() => {
    if (baseItemSearch.length >= 2) {
      searchItems(baseItemSearch).then(setBaseItemResults);
    } else {
      setBaseItemResults([]);
    }
  }, [baseItemSearch]);

  const handleCreate = () => {
    if (!newItemName.trim()) return;
    
    const id = addCustomItem({
      name: newItemName.trim(),
      baseItemId: selectedBaseItem,
      description: newItemDescription.trim() || undefined,
    });
    
    // Reset form
    setNewItemName('');
    setNewItemDescription('');
    setSelectedBaseItem('diamond');
    setBaseItemSearch('');
    
    // Callback for inline creation
    if (onItemCreated) {
      onItemCreated(id);
      onClose();
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this custom item? It will be removed from any trades using it.')) {
      deleteCustomItem(id);
    }
  };

  const startEdit = (item: typeof customItems[0]) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditDescription(item.description || '');
  };

  const saveEdit = () => {
    if (editingId && editName.trim()) {
      updateCustomItem(editingId, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });
      setEditingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className={`bg-dark-400 border border-white/10 rounded-2xl overflow-hidden shadow-2xl ${
          quickCreate ? 'w-full max-w-md' : 'w-full max-w-2xl'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cw-gold-500/20 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-cw-gold-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {quickCreate ? 'Create Custom Item' : 'Custom Items'}
              </h2>
              <p className="text-xs text-gray-500">
                {quickCreate ? 'Add a server/mod item' : 'Manage custom & server items'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {/* Create New Item Form */}
          <div className="bg-dark-300 rounded-xl p-4 mb-4">
            <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-cw-gold-400" />
              New Custom Item
            </h3>
            
            <div className="space-y-3">
              {/* Item Name */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Item Name *</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g., XP Bottle, Vote Key, Stamina Potion..."
                  className="w-full px-3 py-2 bg-dark-200 border border-dark-50 rounded-lg text-white text-sm focus:outline-none focus:border-cw-gold-500"
                />
              </div>

              {/* Base Item (for texture) */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Texture (from Minecraft item)</label>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-dark-200 rounded-lg flex items-center justify-center shrink-0">
                    <MinecraftItem itemId={selectedBaseItem} size="md" />
                  </div>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={baseItemSearch}
                      onChange={(e) => setBaseItemSearch(e.target.value)}
                      onFocus={() => setShowBaseItemDropdown(true)}
                      onBlur={() => setTimeout(() => setShowBaseItemDropdown(false), 200)}
                      placeholder={selectedBaseItem.replace(/_/g, ' ')}
                      className="w-full px-3 py-2 bg-dark-200 border border-dark-50 rounded-lg text-white text-sm focus:outline-none focus:border-cw-gold-500"
                    />
                    {showBaseItemDropdown && baseItemResults.length > 0 && (
                      <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-dark-400 border border-dark-50 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                        {baseItemResults.slice(0, 10).map(item => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setSelectedBaseItem(item.id);
                              setBaseItemSearch('');
                              setShowBaseItemDropdown(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-dark-100 text-left transition-colors"
                          >
                            <MinecraftItem itemId={item.id} size="sm" />
                            <span className="text-sm text-white">{item.displayName}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Description (optional) */}
              {!quickCreate && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Description (optional)</label>
                  <input
                    type="text"
                    value={newItemDescription}
                    onChange={(e) => setNewItemDescription(e.target.value)}
                    placeholder="e.g., Obtained from voting, Server exclusive..."
                    className="w-full px-3 py-2 bg-dark-200 border border-dark-50 rounded-lg text-white text-sm focus:outline-none focus:border-cw-gold-500"
                  />
                </div>
              )}

              <button
                onClick={handleCreate}
                disabled={!newItemName.trim()}
                className="w-full py-2 bg-cw-gold-500 hover:bg-cw-gold-400 disabled:bg-dark-100 disabled:text-gray-500 text-black font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Item
              </button>
            </div>
          </div>

          {/* Existing Custom Items List */}
          {!quickCreate && customItems.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Your Custom Items ({customItems.length})
              </h3>
              <div className="space-y-2">
                {customItems.map(item => (
                  <div 
                    key={item.id}
                    className="bg-dark-300 rounded-lg p-3 flex items-center gap-3 group hover:bg-dark-200 transition-colors"
                  >
                    <div className="w-10 h-10 bg-dark-200 rounded-lg flex items-center justify-center shrink-0">
                      <MinecraftItem itemId={item.baseItemId} size="md" />
                    </div>
                    
                    {editingId === item.id ? (
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-2 py-1 bg-dark-400 border border-dark-50 rounded text-sm text-white focus:outline-none focus:border-cw-gold-500"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={saveEdit}
                            className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1 bg-dark-100 hover:bg-dark-50 text-gray-400 text-xs rounded transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{item.name}</p>
                          <p className="text-xs text-gray-500 truncate">
                            Texture: {item.baseItemId.replace(/_/g, ' ')}
                            {item.description && ` • ${item.description}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEdit(item)}
                            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Search className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!quickCreate && customItems.length === 0 && (
            <div className="text-center py-8">
              <Package className="w-12 h-12 mx-auto text-gray-600 mb-3" />
              <p className="text-gray-500">No custom items yet</p>
              <p className="text-xs text-gray-600 mt-1">
                Create items for mods, server exclusives, or renamed items
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
