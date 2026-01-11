// ============================================
// Home Page Component
// Browse and manage ledgers from the local filesystem
// ============================================

import { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Trash2, 
  RefreshCw,
  AlertTriangle,
  Calendar,
  HardDrive,
  ExternalLink,
  GraduationCap
} from 'lucide-react';
import { 
  isTauri, 
  listLedgers, 
  readLedger, 
  deleteLedger, 
  openLedgersDirectory,
  getTutorialData,
  formatFileSize,
  formatDate,
  startDrag,
  type LedgerInfo
} from '../lib/tauri';
import { WindowControls } from './WindowControls';
import { IntroAnimation } from './IntroAnimation';
import { TutorialOverlay } from './TutorialOverlay';
import { useShopStore } from '../store/shopStore';
import { useTutorialStore } from '../store/tutorialStore';
import type { Shop, CustomItem, Player, Group } from '../types';

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

interface HomePageProps {
  onLedgerLoaded: () => void;
}

export function HomePage({ onLedgerLoaded }: HomePageProps) {
  const [ledgers, setLedgers] = useState<LedgerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newLedgerName, setNewLedgerName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Only show intro animation once per session
  const [showIntro, setShowIntro] = useState(() => {
    if (sessionStorage.getItem('introPlayed')) {
      return false;
    }
    return true;
  });
  
  const handleIntroComplete = () => {
    sessionStorage.setItem('introPlayed', 'true');
    setShowIntro(false);
  };

  const { loadLedgerData, clearAllData, setLedgerName, setHasUnsavedChanges } = useShopStore();
  const setLedgerPath = useShopStore((state) => state.setLedgerPath);
  
  // Tutorial state
  const { isActive: isTutorialActive, startTutorial, getCurrentStep } = useTutorialStore();
  const tutorialStep = getCurrentStep();

  // Load ledger list on mount
  useEffect(() => {
    refreshLedgers();
  }, []);

  const refreshLedgers = async () => {
    if (!isTauri()) {
      setError('This feature requires the desktop app');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const list = await listLedgers();
      setLedgers(list);
    } catch (err) {
      console.error('Failed to list ledgers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load ledgers');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLedger = async (ledger: LedgerInfo) => {
    // Check if this is the Tutorial ledger
    const isTutorialLedger = ledger.name === 'Tutorial' || ledger.filename === 'tutorial.ledger.json';
    
    // If tutorial is active and waiting for user to click Tutorial ledger
    if (isTutorialActive && tutorialStep?.id === 'home-click-tutorial') {
      if (!isTutorialLedger) {
        // Wrong ledger clicked during tutorial - ignore
        return;
      }
    }
    
    try {
      let content: string;
      
      // For tutorial, always get fresh data from bundled resource
      if (isTutorialLedger && isTutorialActive) {
        content = await getTutorialData();
      } else {
        content = await readLedger(ledger.path);
      }
      
      const data: LedgerData = JSON.parse(content);
      
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

      loadLedgerData(processedData, data.name || ledger.name, ledger.path);
      setHasUnsavedChanges(false);
      onLedgerLoaded();
    } catch (err) {
      console.error('Failed to open ledger:', err);
      setError(err instanceof Error ? err.message : 'Failed to open ledger');
    }
  };

  const handleCreateNew = () => {
    const name = newLedgerName.trim() || 'New Ledger';
    clearAllData();
    setLedgerName(name);
    setLedgerPath(null); // New ledger, no path yet
    setHasUnsavedChanges(true); // Mark as unsaved so user knows to save
    setShowNewDialog(false);
    setNewLedgerName('');
    onLedgerLoaded();
  };

  const handleDeleteLedger = async (ledger: LedgerInfo) => {
    // Prevent deleting the tutorial ledger
    if (ledger.filename === 'tutorial.ledger.json' || ledger.name === 'Tutorial') {
      alert('The Tutorial ledger cannot be deleted.');
      return;
    }
    
    if (deleteConfirm !== ledger.filename) {
      setDeleteConfirm(ledger.filename);
      return;
    }

    setDeleting(true);
    try {
      await deleteLedger(ledger.path); // Use full path, not filename
      setDeleteConfirm(null);
      await refreshLedgers();
    } catch (err) {
      console.error('Failed to delete ledger:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete ledger');
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenDirectory = async () => {
    try {
      await openLedgersDirectory();
    } catch (err) {
      console.error('Failed to open directory:', err);
    }
  };

  return (
    <div className="min-h-screen bg-dark-500 flex flex-col">
      {/* Always-accessible drag zone at top - sits above all overlays but allows clicks through */}
      <div 
        className="fixed top-0 left-0 right-0 h-10 z-[999] select-none pointer-events-none"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />
      
      {/* Intro Animation - only plays once per session */}
      {showIntro && <IntroAnimation onComplete={handleIntroComplete} />}
      
      {/* Tutorial Overlay */}
      {isTutorialActive && <TutorialOverlay />}
      
      {/* Header with notch matching main app */}
      <header 
        className={`sticky top-0 z-50 select-none h-[66px] ${showIntro ? 'opacity-0' : 'opacity-100'}`}
        onMouseDown={(e) => {
          // Only start drag if clicking on the header background (not buttons)
          if ((e.target as HTMLElement).closest('button, a')) return;
          startDrag();
        }}
      >
        {/* Left section - header + notch as one piece using clip-path */}
        <div 
          className="absolute top-0 left-0 w-[190px] h-[66px] bg-dark-400/80 backdrop-blur-xl"
          style={{
            clipPath: 'polygon(0 0, 100% 0, 100% 40px, 190px 40px, 166px 66px, 0 66px)'
          }}
        />
        
        {/* Right section of header bar */}
        <div className="absolute top-0 left-[190px] right-0 h-10 bg-dark-400/80 backdrop-blur-xl" />
        
        {/* Negative space - page color showing through the curve with border */}
        <div className="absolute top-10 left-[166px] w-6 h-[26px] overflow-hidden">
          <div className="absolute inset-0 bg-dark-500" />
          <div 
            className="absolute inset-0 bg-dark-400/80 backdrop-blur-xl rounded-br-[24px]"
            style={{ boxShadow: 'inset -1px -1px 0 0 rgba(255,255,255,0.05)' }}
          />
        </div>
        
        {/* Border: bottom of notch */}
        <div className="absolute top-[66px] left-0 w-[166px] h-px bg-white/5" />
        
        {/* Border: right side of bar */}
        <div className="absolute top-10 left-[190px] right-0 h-px bg-white/5" />

        {/* Logo positioned inside the notch */}
        <div className="absolute left-3 top-6 flex items-center">
          <div className="relative flex items-center gap-2.5 px-2 py-1.5">
            <div className="relative w-7 h-5 rounded-sm overflow-hidden border border-white/20 shadow-sm">
              <img 
                src="/Commonwealth_flag.png" 
                alt="Commonwealth Flag" 
                className="w-full h-full object-cover"
              />
            </div>
            <span 
              className="text-xs tracking-wide text-cw-gold-500"
              style={{ fontFamily: '"Press Start 2P", cursive' }}
            >
              IRONBANK
            </span>
          </div>
        </div>
        
        {/* Header content */}
        <div className="relative h-10 flex items-center px-3">
          {/* Spacer for logo area */}
          <div className="w-44" />
          
          <div 
            className="ml-auto flex items-center gap-2" 
            data-tutorial="header-controls"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <button
              onClick={handleOpenDirectory}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open Folder
            </button>
            <button
              onClick={refreshLedgers}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <div className="w-px h-5 bg-white/10 mx-1" />
            <WindowControls />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`flex-1 h-[calc(100vh-66px)] overflow-y-auto px-6 py-8 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20 transition-opacity duration-500 ${showIntro ? 'opacity-0' : 'opacity-100'}`}>
        <div className="max-w-4xl mx-auto">
          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 font-medium">Error</p>
                <p className="text-red-400/80 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Actions Bar */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Your Ledgers</h2>
            <button
              onClick={() => setShowNewDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cw-gold-500 hover:bg-cw-gold-400 text-dark-500 font-medium rounded-lg transition-colors"
              data-tutorial="new-ledger-btn"
            >
              <Plus className="w-4 h-4" />
              New Ledger
            </button>
          </div>

          {/* Ledger Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-tutorial="ledger-list">
              {[1, 2, 3].map((i) => (
                <div 
                  key={i} 
                  className="h-32 bg-dark-400/50 border border-white/5 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : ledgers.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">No Ledgers Found</h3>
              <p className="text-gray-500 mb-6">Create your first ledger to start tracking shops and trades.</p>
              <button
                onClick={() => setShowNewDialog(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-cw-gold-500 hover:bg-cw-gold-400 text-dark-500 font-medium rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create New Ledger
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-tutorial="ledger-list">
              {ledgers.map((ledger) => {
                const isTutorialLedger = ledger.name === 'Tutorial' || ledger.filename === 'tutorial.ledger.json';
                return (
                <div
                  key={ledger.path}
                  data-tutorial={isTutorialLedger ? 'tutorial-ledger' : undefined}
                  className={`group relative bg-dark-400/50 border rounded-xl p-4 transition-all cursor-pointer ${
                    isTutorialLedger 
                      ? 'border-cw-primary/30 hover:border-cw-primary/60 hover:shadow-lg hover:shadow-cw-primary/10' 
                      : 'border-white/10 hover:border-cw-gold-500/50 hover:shadow-lg hover:shadow-cw-gold-500/5'
                  }`}
                  onClick={() => {
                    // If clicking Tutorial ledger and not in tutorial, start tutorial
                    if (isTutorialLedger && !isTutorialActive) {
                      startTutorial();
                      return;
                    }
                    handleOpenLedger(ledger);
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isTutorialLedger ? 'bg-cw-primary/10' : 'bg-cw-gold-500/10'
                      }`}>
                        {isTutorialLedger ? (
                          <GraduationCap className="w-5 h-5 text-cw-primary" />
                        ) : (
                          <FileText className="w-5 h-5 text-cw-gold-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-white truncate">{ledger.name}</h3>
                        <p className="text-xs text-gray-500 truncate">{ledger.filename}</p>
                      </div>
                    </div>
                    
                    {/* Delete button - hidden for tutorial ledger */}
                    {!isTutorialLedger && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLedger(ledger);
                        }}
                        disabled={deleting}
                        className={`p-1.5 rounded-lg transition-colors ${
                          deleteConfirm === ledger.filename
                            ? 'bg-red-500/20 text-red-400'
                            : 'opacity-0 group-hover:opacity-100 hover:bg-white/5 text-gray-500 hover:text-red-400'
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(ledger.modified)}
                    </span>
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3" />
                      {formatFileSize(ledger.size)}
                    </span>
                  </div>
                  
                  {deleteConfirm === ledger.filename && (
                    <div className="absolute inset-0 bg-dark-400/95 rounded-xl flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-sm text-gray-300 mb-3">Delete this ledger?</p>
                        <div className="flex items-center gap-2 justify-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm(null);
                            }}
                            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLedger(ledger);
                            }}
                            disabled={deleting}
                            className="px-3 py-1.5 text-sm bg-red-500 hover:bg-red-400 text-white rounded-lg transition-colors disabled:opacity-50"
                          >
                            {deleting ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
              })}
            </div>
          )}
        </div>
      </main>

      {/* New Ledger Dialog */}
      {showNewDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-dark-400 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-scaleIn">
            <h2 className="text-lg font-semibold text-white mb-4">Create New Ledger</h2>
            <input
              type="text"
              value={newLedgerName}
              onChange={(e) => setNewLedgerName(e.target.value)}
              placeholder="Ledger name..."
              className="w-full px-4 py-3 bg-dark-300 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cw-gold-500/50 focus:ring-1 focus:ring-cw-gold-500/50"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateNew()}
            />
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNewDialog(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNew}
                className="px-4 py-2 bg-cw-gold-500 hover:bg-cw-gold-400 text-dark-500 font-medium rounded-lg transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
