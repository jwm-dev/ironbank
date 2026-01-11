// ============================================
// Ledger Manager Component
// Save/Load/Import ledger files for data persistence
// ============================================

import { useState, useRef, useEffect } from 'react';
import { 
  FilePlus, 
  FolderOpen,
  ChevronDown,
  Save,
  AlertTriangle,
  Check,
  Merge,
  FileText,
  Circle,
  Home
} from 'lucide-react';
import { useShopStore } from '../store/shopStore';
import { useTutorialStore } from '../store/tutorialStore';
import { isTauri, saveLedger, generateFilename } from '../lib/tauri';
import type { Shop, Player, Group, CustomItem } from '../types';

// Ledger file format
interface LedgerData {
  version: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  data: {
    shops: Shop[];
    players: Player[];
    groups: Group[];
    customItems: CustomItem[];
  };
}

// Collision types for merge operations
interface MergeCollision {
  type: 'shop' | 'player' | 'group' | 'customItem';
  existing: Shop | Player | Group | CustomItem;
  incoming: Shop | Player | Group | CustomItem;
  resolution: 'keep' | 'replace' | 'skip';
}

interface MergePreview {
  newShops: Shop[];
  newPlayers: Player[];
  newGroups: Group[];
  newCustomItems: CustomItem[];
  collisions: MergeCollision[];
}

interface LedgerManagerProps {
  onGoHome?: () => void;
}

export function LedgerManager({ onGoHome }: LedgerManagerProps) {
  const {
    shops,
    players,
    groups,
    customItems,
    ledgerName,
    ledgerPath,
    hasUnsavedChanges,
    setLedgerName,
    setLedgerPath,
    setHasUnsavedChanges,
    loadLedgerData,
    clearAllData,
  } = useShopStore();

  const { isActive: isTutorialActive } = useTutorialStore();
  // Block ledger actions during entire tutorial
  const blockLedgerActions = isTutorialActive;

  const [isOpen, setIsOpen] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [newLedgerName, setNewLedgerName] = useState('');
  const [mergePreview, setMergePreview] = useState<MergePreview | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen for external save requests (from unsaved changes dialog)
  useEffect(() => {
    const handleSaveRequest = () => {
      handleSave();
    };
    window.addEventListener('ledger-save-requested', handleSaveRequest);
    return () => window.removeEventListener('ledger-save-requested', handleSaveRequest);
  }, [shops, players, groups, customItems, ledgerName, ledgerPath]);

  // Generate ledger file
  const generateLedgerData = (name: string): LedgerData => {
    const now = new Date().toISOString();
    return {
      version: '1.0',
      name,
      createdAt: now,
      updatedAt: now,
      data: {
        shops,
        players,
        groups,
        customItems,
      },
    };
  };

  // Save current ledger to file
  const handleSave = async () => {
    const data = generateLedgerData(ledgerName);
    const content = JSON.stringify(data, null, 2);
    
    if (isTauri()) {
      // Use native filesystem
      try {
        // Use existing filename if we have a path, otherwise generate new one
        const filename = ledgerPath 
          ? ledgerPath.split(/[\\/]/).pop() || generateFilename(ledgerName)
          : generateFilename(ledgerName);
        
        const savedPath = await saveLedger(filename, content);
        setLedgerPath(savedPath);
        setHasUnsavedChanges(false);
        setIsOpen(false);
      } catch (error) {
        console.error('Failed to save ledger:', error);
        alert('Failed to save ledger: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    } else {
      // Browser fallback: download file
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${ledgerName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ledger.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setHasUnsavedChanges(false);
      setIsOpen(false);
    }
  };

  // Open existing ledger file (browser only - in Tauri use HomePage)
  const handleOpen = () => {
    if (isTauri() && onGoHome) {
      // In Tauri, go to home page to select ledger
      onGoHome();
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileOpen = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data: LedgerData = JSON.parse(text);
      
      // Validate ledger format
      if (!data.version || !data.data) {
        throw new Error('Invalid ledger file format');
      }

      // Convert date strings back to Date objects
      const processedData = {
        shops: (data.data.shops || []).map(shop => ({
          ...shop,
          createdAt: new Date(shop.createdAt),
          updatedAt: new Date(shop.updatedAt),
          trades: shop.trades.map(trade => ({
            ...trade,
            lastUpdated: new Date(trade.lastUpdated),
          })),
        })),
        players: data.data.players || [],
        groups: data.data.groups || [],
        customItems: (data.data.customItems || []).map(item => ({
          ...item,
          createdAt: new Date(item.createdAt),
        })),
      };

      loadLedgerData(processedData);
      setLedgerName(data.name || 'Imported Ledger');
      setHasUnsavedChanges(false);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to open ledger:', error);
      alert('Failed to open ledger file. Please ensure it is a valid ledger JSON file.');
    }

    // Reset input
    event.target.value = '';
  };

  // Create new empty ledger
  const handleNewLedger = () => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Create new ledger anyway?')) {
        return;
      }
    }
    setShowNewDialog(true);
    setNewLedgerName('');
    setIsOpen(false);
  };

  const confirmNewLedger = () => {
    const name = newLedgerName.trim() || 'New Ledger';
    clearAllData();
    setLedgerName(name);
    setLedgerPath(null); // New ledger, no path yet
    setHasUnsavedChanges(true); // Mark as needing save
    setShowNewDialog(false);
  };

  // Import and merge ledger
  const handleImport = () => {
    importInputRef.current?.click();
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data: LedgerData = JSON.parse(text);
      
      if (!data.version || !data.data) {
        throw new Error('Invalid ledger file format');
      }

      // Process dates
      const incomingShops = (data.data.shops || []).map(shop => ({
        ...shop,
        createdAt: new Date(shop.createdAt),
        updatedAt: new Date(shop.updatedAt),
        trades: shop.trades.map(trade => ({
          ...trade,
          lastUpdated: new Date(trade.lastUpdated),
        })),
      }));
      const incomingPlayers = data.data.players || [];
      const incomingGroups = data.data.groups || [];
      const incomingCustomItems = (data.data.customItems || []).map(item => ({
        ...item,
        createdAt: new Date(item.createdAt),
      }));

      // Detect collisions and prepare merge preview
      const collisions: MergeCollision[] = [];
      const newShops: Shop[] = [];
      const newPlayers: Player[] = [];
      const newGroups: Group[] = [];
      const newCustomItems: CustomItem[] = [];

      // Check shops by ID
      for (const incoming of incomingShops) {
        const existing = shops.find(s => s.id === incoming.id);
        if (existing) {
          collisions.push({
            type: 'shop',
            existing,
            incoming,
            resolution: 'skip',
          });
        } else {
          newShops.push(incoming);
        }
      }

      // Check players by IGN
      for (const incoming of incomingPlayers) {
        const existing = players.find(p => p.ign.toLowerCase() === incoming.ign.toLowerCase());
        if (existing) {
          collisions.push({
            type: 'player',
            existing,
            incoming,
            resolution: 'skip',
          });
        } else {
          newPlayers.push(incoming);
        }
      }

      // Check groups by ID
      for (const incoming of incomingGroups) {
        const existing = groups.find(g => g.id === incoming.id);
        if (existing) {
          collisions.push({
            type: 'group',
            existing,
            incoming,
            resolution: 'skip',
          });
        } else {
          newGroups.push(incoming);
        }
      }

      // Check custom items by ID
      for (const incoming of incomingCustomItems) {
        const existing = customItems.find(c => c.id === incoming.id);
        if (existing) {
          collisions.push({
            type: 'customItem',
            existing,
            incoming,
            resolution: 'skip',
          });
        } else {
          newCustomItems.push(incoming);
        }
      }

      setMergePreview({ newShops, newPlayers, newGroups, newCustomItems, collisions });
      setShowImportDialog(true);
      setImportError(null);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to import ledger:', error);
      setImportError('Failed to parse ledger file. Please ensure it is a valid ledger JSON file.');
      setShowImportDialog(true);
      setIsOpen(false);
    }

    event.target.value = '';
  };

  const updateCollisionResolution = (index: number, resolution: 'keep' | 'replace' | 'skip') => {
    if (!mergePreview) return;
    const updated = { ...mergePreview };
    updated.collisions[index].resolution = resolution;
    setMergePreview(updated);
  };

  const confirmImport = () => {
    if (!mergePreview) return;
    
    // Start with new items (no conflicts)
    const finalShops = [...shops, ...mergePreview.newShops];
    const finalPlayers = [...players, ...mergePreview.newPlayers];
    const finalGroups = [...groups, ...mergePreview.newGroups];
    const finalCustomItems = [...customItems, ...mergePreview.newCustomItems];

    // Apply collision resolutions
    for (const collision of mergePreview.collisions) {
      if (collision.resolution === 'replace') {
        if (collision.type === 'shop') {
          const idx = finalShops.findIndex(s => s.id === (collision.existing as Shop).id);
          if (idx !== -1) finalShops[idx] = collision.incoming as Shop;
        } else if (collision.type === 'player') {
          const idx = finalPlayers.findIndex(p => p.ign === (collision.existing as Player).ign);
          if (idx !== -1) finalPlayers[idx] = collision.incoming as Player;
        } else if (collision.type === 'group') {
          const idx = finalGroups.findIndex(g => g.id === (collision.existing as Group).id);
          if (idx !== -1) finalGroups[idx] = collision.incoming as Group;
        } else if (collision.type === 'customItem') {
          const idx = finalCustomItems.findIndex(c => c.id === (collision.existing as CustomItem).id);
          if (idx !== -1) finalCustomItems[idx] = collision.incoming as CustomItem;
        }
      }
      // 'keep' and 'skip' both mean keep existing, do nothing
    }

    loadLedgerData({
      shops: finalShops,
      players: finalPlayers,
      groups: finalGroups,
      customItems: finalCustomItems,
    });
    setHasUnsavedChanges(true);
    setShowImportDialog(false);
    setMergePreview(null);
  };

  const getCollisionName = (collision: MergeCollision): { existing: string; incoming: string } => {
    switch (collision.type) {
      case 'shop':
        return {
          existing: (collision.existing as Shop).name,
          incoming: (collision.incoming as Shop).name,
        };
      case 'player':
        return {
          existing: (collision.existing as Player).ign,
          incoming: (collision.incoming as Player).ign,
        };
      case 'group':
        return {
          existing: (collision.existing as Group).name,
          incoming: (collision.incoming as Group).name,
        };
      case 'customItem':
        return {
          existing: (collision.existing as CustomItem).name,
          incoming: (collision.incoming as CustomItem).name,
        };
    }
  };

  return (
    <>
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.ledger.json"
        onChange={handleFileOpen}
        className="hidden"
      />
      <input
        ref={importInputRef}
        type="file"
        accept=".json,.ledger.json"
        onChange={handleFileImport}
        className="hidden"
      />

      {/* Ledger button with dropdown */}
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-300/50 border border-white/10 hover:border-white/20 hover:bg-dark-300 transition-all text-sm"
        >
          <FileText className="w-4 h-4 text-gray-400" />
          <span className="text-gray-200 max-w-[120px] truncate">{ledgerName}</span>
          {hasUnsavedChanges && (
            <Circle className="w-2 h-2 fill-cw-gold-500 text-cw-gold-500" />
          )}
          <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div 
            data-tutorial-ledger-popup
            className="absolute bottom-full right-0 mb-1 w-56 bg-dark-400 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden animate-scaleIn"
          >
            <div className="p-2 border-b border-white/5">
              <div className="text-xs text-gray-500 px-2 py-1">Current Ledger</div>
              <div className="px-2 py-1 text-sm text-white font-medium truncate">{ledgerName}</div>
              {hasUnsavedChanges && (
                <div className="px-2 py-1 text-xs text-cw-gold-500 flex items-center gap-1">
                  <Circle className="w-2 h-2 fill-current" />
                  Unsaved changes
                </div>
              )}
            </div>
            
            <div className="p-1">
              <button
                onClick={blockLedgerActions ? undefined : handleSave}
                disabled={blockLedgerActions}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                  blockLedgerActions 
                    ? 'text-gray-500 cursor-not-allowed' 
                    : 'text-gray-200 hover:bg-white/5'
                }`}
              >
                <Save className="w-4 h-4 text-gray-400" />
                Save Ledger
                <span className="ml-auto text-xs text-gray-500">⌘S</span>
              </button>
              
              <button
                onClick={blockLedgerActions ? undefined : handleOpen}
                disabled={blockLedgerActions}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                  blockLedgerActions 
                    ? 'text-gray-500 cursor-not-allowed' 
                    : 'text-gray-200 hover:bg-white/5'
                }`}
              >
                <FolderOpen className="w-4 h-4 text-gray-400" />
                {isTauri() ? 'Browse Ledgers...' : 'Open Ledger...'}
              </button>
              
              <button
                onClick={blockLedgerActions ? undefined : handleNewLedger}
                disabled={blockLedgerActions}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                  blockLedgerActions 
                    ? 'text-gray-500 cursor-not-allowed' 
                    : 'text-gray-200 hover:bg-white/5'
                }`}
              >
                <FilePlus className="w-4 h-4 text-gray-400" />
                New Ledger
              </button>
              
              <div className="my-1 border-t border-white/5" />
              
              {!isTauri() && (
                <button
                  onClick={blockLedgerActions ? undefined : handleImport}
                  disabled={blockLedgerActions}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                    blockLedgerActions 
                      ? 'text-gray-500 cursor-not-allowed' 
                      : 'text-gray-200 hover:bg-white/5'
                  }`}
                >
                  <Merge className="w-4 h-4 text-gray-400" />
                  Import & Merge...
                </button>
              )}
              
              {isTauri() && onGoHome && (
                <button
                  onClick={blockLedgerActions ? undefined : () => {
                    setIsOpen(false);
                    onGoHome();
                  }}
                  disabled={blockLedgerActions}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                    blockLedgerActions 
                      ? 'text-gray-500 cursor-not-allowed' 
                      : 'text-gray-200 hover:bg-white/5'
                  }`}
                >
                  <Home className="w-4 h-4 text-gray-400" />
                  Go to Home
                </button>
              )}
            </div>
            
            <div className="p-2 border-t border-white/5 bg-dark-500/50">
              <div className="text-[10px] text-gray-500 px-2">
                {shops.length} shops · {players.length} players · {groups.length} groups
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Ledger Dialog */}
      {showNewDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-400 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md animate-scaleIn">
            <div className="p-4 border-b border-white/5">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <FilePlus className="w-5 h-5 text-cw-gold-500" />
                Create New Ledger
              </h3>
            </div>
            <div className="p-4">
              <label className="block text-sm text-gray-400 mb-2">Ledger Name</label>
              <input
                type="text"
                value={newLedgerName}
                onChange={(e) => setNewLedgerName(e.target.value)}
                placeholder="My Ledger"
                className="w-full bg-dark-300 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-cw-gold-500 focus:ring-1 focus:ring-cw-gold-500/20"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2">
                This will clear all current data and create a fresh ledger.
              </p>
            </div>
            <div className="p-4 border-t border-white/5 flex justify-end gap-2">
              <button
                onClick={() => setShowNewDialog(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmNewLedger}
                className="px-4 py-2 text-sm bg-cw-gold-500 text-dark-900 rounded-lg hover:bg-cw-gold-400 transition-colors font-medium"
              >
                Create Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import/Merge Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-400 border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-scaleIn">
            <div className="p-4 border-b border-white/5">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Merge className="w-5 h-5 text-cw-gold-500" />
                Import & Merge Ledger
              </h3>
            </div>
            
            {importError ? (
              <div className="p-4">
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-400 font-medium">Import Failed</p>
                    <p className="text-sm text-red-400/70 mt-1">{importError}</p>
                  </div>
                </div>
              </div>
            ) : mergePreview && (
              <div className="flex-1 overflow-auto p-4 space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-dark-300/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-emerald-400">{mergePreview.newShops.length}</div>
                    <div className="text-xs text-gray-400">New Shops</div>
                  </div>
                  <div className="bg-dark-300/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-emerald-400">{mergePreview.newPlayers.length}</div>
                    <div className="text-xs text-gray-400">New Players</div>
                  </div>
                  <div className="bg-dark-300/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-emerald-400">{mergePreview.newGroups.length}</div>
                    <div className="text-xs text-gray-400">New Groups</div>
                  </div>
                  <div className="bg-dark-300/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-emerald-400">{mergePreview.newCustomItems.length}</div>
                    <div className="text-xs text-gray-400">New Items</div>
                  </div>
                </div>

                {/* Collisions */}
                {mergePreview.collisions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-amber-400 flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-4 h-4" />
                      {mergePreview.collisions.length} Conflict{mergePreview.collisions.length > 1 ? 's' : ''} Detected
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-auto">
                      {mergePreview.collisions.map((collision, idx) => {
                        const names = getCollisionName(collision);
                        return (
                          <div key={idx} className="bg-dark-300/50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider bg-dark-500 text-gray-400 rounded">
                                  {collision.type}
                                </span>
                                <span className="text-sm text-white">{names.existing}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <button
                                onClick={() => updateCollisionResolution(idx, 'keep')}
                                className={`px-3 py-1.5 rounded-lg transition-colors ${
                                  collision.resolution === 'keep' || collision.resolution === 'skip'
                                    ? 'bg-cw-blue-500/20 text-cw-blue-400 border border-cw-blue-500/30'
                                    : 'bg-dark-500 text-gray-400 hover:bg-dark-400'
                                }`}
                              >
                                Keep Existing
                              </button>
                              <button
                                onClick={() => updateCollisionResolution(idx, 'replace')}
                                className={`px-3 py-1.5 rounded-lg transition-colors ${
                                  collision.resolution === 'replace'
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    : 'bg-dark-500 text-gray-400 hover:bg-dark-400'
                                }`}
                              >
                                Replace with Incoming
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {mergePreview.collisions.length === 0 && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 flex items-center gap-3">
                    <Check className="w-5 h-5 text-emerald-400" />
                    <p className="text-emerald-400">No conflicts detected. All items will be added.</p>
                  </div>
                )}
              </div>
            )}
            
            <div className="p-4 border-t border-white/5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowImportDialog(false);
                  setMergePreview(null);
                  setImportError(null);
                }}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              {!importError && mergePreview && (
                <button
                  onClick={confirmImport}
                  className="px-4 py-2 text-sm bg-cw-gold-500 text-dark-900 rounded-lg hover:bg-cw-gold-400 transition-colors font-medium flex items-center gap-2"
                >
                  <Merge className="w-4 h-4" />
                  Merge {mergePreview.newShops.length + mergePreview.newPlayers.length + mergePreview.newGroups.length + mergePreview.newCustomItems.length + mergePreview.collisions.filter(c => c.resolution === 'replace').length} Items
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
