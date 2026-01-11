import { BrowserRouter as Router, Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Store, Package, Map, BarChart3, Users, Plus } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { ShopList } from './components/ShopList';
import { ShopDetail } from './components/ShopDetail';
import { ItemBrowser } from './components/ItemBrowser';
import { MapView } from './components/MapView';
import { Statistics } from './components/Statistics';
import { ShopEditor } from './components/ShopEditor';
import { PlayerManager } from './components/PlayerManager';
import { GlobalSearch } from './components/GlobalSearch';
import { LedgerManager } from './components/LedgerManager';
import { HomePage } from './components/HomePage';
import { WindowControls } from './components/WindowControls';
import { TutorialOverlay } from './components/TutorialOverlay';
import { isTauri, startDrag } from './lib/tauri';
import { useShopStore } from './store/shopStore';
import { useTutorialStore } from './store/tutorialStore';

const NAV_ITEMS = [
  { to: '/app', icon: Store, label: 'Shops', tutorialId: 'nav-shops' },
  { to: '/app/items', icon: Package, label: 'Items', tutorialId: 'nav-items' },
  { to: '/app/map', icon: Map, label: 'Map', tutorialId: 'nav-map' },
  { to: '/app/stats', icon: BarChart3, label: 'Stats', tutorialId: 'nav-stats' },
  { to: '/app/players', icon: Users, label: 'Players', tutorialId: 'nav-players' },
];

// Unsaved changes confirmation dialog
function UnsavedChangesDialog({ 
  isOpen, 
  onSave, 
  onDiscard, 
  onCancel 
}: { 
  isOpen: boolean; 
  onSave: () => void; 
  onDiscard: () => void; 
  onCancel: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-dark-400 border border-white/10 rounded-2xl p-6 shadow-2xl max-w-md w-full mx-4">
        <h3 className="text-xl font-bold text-white mb-2">Unsaved Changes</h3>
        <p className="text-gray-400 mb-6">
          You have unsaved changes in your ledger. Would you like to save before leaving?
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onDiscard}
            className="px-4 py-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            Discard
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 bg-cw-gold-500 hover:bg-cw-gold-400 text-dark-500 font-medium rounded-lg transition-colors"
          >
            Save & Exit
          </button>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const hasUnsavedChanges = useShopStore((state) => state.hasUnsavedChanges);
  const setHasUnsavedChanges = useShopStore((state) => state.setHasUnsavedChanges);
  const ledgerPath = useShopStore((state) => state.ledgerPath);
  const ledgerName = useShopStore((state) => state.ledgerName);
  
  // Tutorial state
  const { isActive: isTutorialActive, setPhase } = useTutorialStore();
  
  // Check if current ledger is tutorial ledger (skip unsaved dialog for it)
  const isTutorialLedger = ledgerName === 'Tutorial' || ledgerPath?.includes('tutorial.ledger.json');
  
  // Update tutorial phase based on current route
  useEffect(() => {
    if (!isTutorialActive) return;
    
    const path = location.pathname;
    if (path === '/app') {
      setPhase('app');
    } else if (path.includes('/app/shop/') && path.includes('/edit')) {
      setPhase('shop-edit');
    } else if (path.includes('/app/shop/new')) {
      setPhase('add-shop');
    } else if (path.includes('/app/shop/')) {
      setPhase('shop-detail');
    } else if (path === '/app/items') {
      setPhase('items');
    } else if (path === '/app/map') {
      setPhase('map');
    } else if (path === '/app/stats') {
      setPhase('stats');
    } else if (path === '/app/players') {
      setPhase('players');
    }
  }, [location.pathname, isTutorialActive, setPhase]);

  // Navigate with unsaved changes check (skip for tutorial ledger)
  const navigateWithCheck = useCallback((path: string) => {
    if (hasUnsavedChanges && isTauri() && !isTutorialLedger) {
      setPendingNavigation(path);
      setShowUnsavedDialog(true);
    } else {
      navigate(path);
    }
  }, [hasUnsavedChanges, navigate, isTutorialLedger]);

  const handleLogoClick = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 400);
    
    // In Tauri, logo click goes to home page
    if (isTauri()) {
      navigateWithCheck('/');
    }
  };

  const handleGoHome = () => {
    navigateWithCheck('/');
  };

  const handleSaveAndExit = async () => {
    // Trigger save through LedgerManager (we'll dispatch an event)
    const saveEvent = new CustomEvent('ledger-save-requested');
    window.dispatchEvent(saveEvent);
    
    // Wait a bit for save to complete, then navigate
    setTimeout(() => {
      setShowUnsavedDialog(false);
      setHasUnsavedChanges(false);
      if (pendingNavigation) {
        navigate(pendingNavigation);
        setPendingNavigation(null);
      }
    }, 500);
  };

  const handleDiscardChanges = () => {
    setShowUnsavedDialog(false);
    setHasUnsavedChanges(false);
    if (pendingNavigation) {
      navigate(pendingNavigation);
      setPendingNavigation(null);
    }
  };

  const handleCancelNavigation = () => {
    setShowUnsavedDialog(false);
    setPendingNavigation(null);
  };

  const handleLedgerLoaded = () => {
    navigate('/app');
  };

  // Check if we're on the home page
  const isHomePage = location.pathname === '/';

  // In Tauri mode, show HomePage at root
  if (isHomePage && isTauri()) {
    return <HomePage onLedgerLoaded={handleLedgerLoaded} />;
  }

  // For browser mode, redirect root to /app
  if (isHomePage && !isTauri()) {
    navigate('/app');
    return null;
  }

  return (
    <div className="min-h-screen bg-dark-500 flex flex-col">
      {/* Always-accessible drag zone at top - sits above all overlays but allows clicks through */}
      <div 
        className="fixed top-0 left-0 right-0 h-10 z-[999] select-none pointer-events-none"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />
      
      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        isOpen={showUnsavedDialog}
        onSave={handleSaveAndExit}
        onDiscard={handleDiscardChanges}
        onCancel={handleCancelNavigation}
      />

      {/* Title Bar with curved logo notch */}
      <header 
        className="sticky top-0 z-50 select-none h-[66px]"
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest('button, a, input')) return;
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
        
        {/* Header content */}
        <div className="relative h-10 flex items-center px-3">
          {/* Spacer for logo area */}
          <div className="w-44" />

          {/* Center: Ledger name (if in Tauri) */}
          {isTauri() && ledgerPath && (
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 text-sm text-gray-400">
              <span className="truncate max-w-[200px]">{ledgerName}</span>
              {hasUnsavedChanges && (
                <span className="w-2 h-2 rounded-full bg-cw-gold-500" title="Unsaved changes" />
              )}
            </div>
          )}

          {/* Right: Search and Window Controls */}
          <div 
            className="ml-auto flex items-center gap-1"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <div data-tutorial="global-search">
              <GlobalSearch />
            </div>
            <div className="w-px h-5 bg-white/10 mx-1" />
            <WindowControls />
          </div>
        </div>

        {/* Logo positioned inside the notch */}
        <button 
          className="absolute left-3 top-6 flex items-center group cursor-pointer z-10 focus:outline-none" 
          onClick={handleLogoClick}
          title={isTauri() ? 'Go to Home' : 'Ironbank'}
          data-tutorial="logo"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <div 
            className={`relative flex items-center gap-2.5 px-2 py-1.5 transition-all duration-200 ${isAnimating ? 'scale-95' : ''}`}
            data-tutorial="logo-text"
          >
            <div className="relative w-7 h-5 rounded-sm overflow-hidden border border-white/20 shadow-sm group-hover:border-white/30 transition-colors">
              <img 
                src="/Commonwealth_flag.png" 
                alt="" 
                className="w-full h-full object-cover"
              />
            </div>
            <span 
              className="text-xs tracking-wide text-cw-gold-500 group-hover:text-cw-gold-400 transition-colors"
              style={{ fontFamily: '"Press Start 2P", cursive' }}
            >
              IRONBANK
            </span>
          </div>
        </button>
      </header>
      
      {/* Main Content - height calculated for 66px header */}
      <main className="h-[calc(100vh-66px)] overflow-y-auto overflow-x-hidden pb-24 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20">
        <Routes>
          {/* Map route - full width, uses remaining height after header and bottom nav */}
          <Route path="/app/map" element={
            <div className="px-6 py-4 h-[calc(100vh-166px)]">
              <MapView />
            </div>
          } />
          
          {/* Other routes - constrained width container */}
          <Route path="/app" element={
            <div className="max-w-6xl mx-auto px-6 py-4"><ShopList /></div>
          } />
          <Route path="/app/shop/new" element={
            <div className="max-w-6xl mx-auto px-6 py-4"><ShopEditor /></div>
          } />
          <Route path="/app/shop/:id/edit" element={
            <div className="max-w-6xl mx-auto px-6 py-4"><ShopEditor /></div>
          } />
          <Route path="/app/shop/:id" element={
            <div className="max-w-6xl mx-auto px-6 py-4"><ShopDetail /></div>
          } />
          <Route path="/app/items" element={
            <div className="max-w-6xl mx-auto px-6 pt-8 pb-4"><ItemBrowser /></div>
          } />
          <Route path="/app/stats" element={
            <div className="max-w-6xl mx-auto px-6 py-4"><Statistics /></div>
          } />
          <Route path="/app/players" element={
            <div className="max-w-4xl mx-auto px-6 pt-8 pb-4"><PlayerManager /></div>
          } />
        </Routes>
      </main>

      {/* Floating Bottom Navigation */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40" data-tutorial="bottom-nav">
        <nav className="flex items-center gap-0.5 bg-dark-400/95 backdrop-blur-xl border border-white/10 rounded-2xl p-1 shadow-2xl shadow-black/50">
          {/* Nav Items */}
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/app'}
              data-tutorial={item.tutorialId}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#2489c7] text-white shadow-lg shadow-[#2489c7]/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{item.label}</span>
            </NavLink>
          ))}

          <div className="w-px h-5 bg-white/10 mx-0.5" />

          {/* Add Shop */}
          <NavLink
            to="/app/shop/new"
            data-tutorial="add-shop-btn"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-cw-gold-500 hover:bg-cw-gold-400 text-dark-500 transition-colors shadow-lg shadow-cw-gold-500/20"
            title="Add Shop"
          >
            <Plus className="w-4 h-4" />
          </NavLink>
        </nav>
      </div>

      {/* Floating Ledger Controls - bottom right */}
      <div className="fixed bottom-4 right-4 z-40" data-tutorial="ledger-controls">
        <div className="flex items-center gap-1 bg-dark-400/95 backdrop-blur-xl border border-white/10 rounded-2xl p-1 shadow-2xl shadow-black/50">
          <LedgerManager onGoHome={handleGoHome} />
        </div>
      </div>
      
      {/* Tutorial Overlay */}
      {isTutorialActive && <TutorialOverlay />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </Router>
  );
}

export default App;
