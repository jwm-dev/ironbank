// ============================================
// Tutorial Store - Manages guided tutorial state
// ============================================

import { create } from 'zustand';

// Tutorial step definitions
export interface TutorialStep {
  id: string;
  phase: 'home' | 'app' | 'shop-detail' | 'shop-edit' | 'items' | 'map' | 'stats' | 'players' | 'add-shop';
  target?: string; // CSS selector or element ID for spotlight
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'corner' | 'top-left';
  action?: 'click' | 'wait' | 'input' | 'navigate';
  actionTarget?: string; // What the user needs to interact with
  nextStep?: string; // ID of next step (for branching)
  isChoice?: boolean; // Whether this step offers a choice
  choiceOptions?: { label: string; action: 'continue' | 'skip' | 'end' }[];
  autoAdvance?: boolean; // Auto-advance after animation
  autoAdvanceDelay?: number; // Delay before auto-advance (ms)
  highlightMultiple?: string[]; // Multiple elements to highlight
  zoomToCoords?: { x: number; z: number; zoom: number }; // For map zooming
  isReveal?: boolean; // Show full UI without overlay for a moment
  isInteractive?: boolean; // Allow interaction with spotlighted element
  spotlightPadding?: { top?: number; right?: number; bottom?: number; left?: number }; // Extra padding for expanded elements
  tooltipCompact?: boolean; // Use minimal compact tooltip style
  navigateTo?: string; // Tab to navigate to before showing this step
  tooltipOffset?: { x?: number; y?: number }; // Fine-tune tooltip position
  includeRelatedSelector?: string; // Additional selector to include in spotlight bounds
  clearSearchOnExit?: boolean; // Clear search input when leaving this step
  blockInteraction?: boolean; // Block actual interaction with element (view only)
  scrollToElement?: boolean; // Scroll element into view when step activates
  restrictClickToTarget?: boolean; // Only allow clicking the target element, block all other clicks
  blockNavigation?: boolean; // Block navigation away from current page during this step
  showDualIndicators?: boolean; // Show dashed lines pointing to elements at top and bottom of page
  highlightMultipleFixed?: string[]; // Multiple elements to highlight with fixed positions (doesn't scroll)
  blockSaving?: boolean; // Block form submission/saving during this step
  hideContinueButton?: boolean; // Hide the Continue button in exploration steps (user advances via other action)
}

// All tutorial steps
export const TUTORIAL_STEPS: TutorialStep[] = [
  // ===== PHASE 1: HOME PAGE INTRODUCTION =====
  {
    id: 'home-intro',
    phase: 'home',
    title: 'Welcome to Ironbank!',
    description: 'This is your Ledger Manager - the home base for organizing shop data from CivMC. Ledgers are portable files that store all your tracked shops, players, and trade information.',
    position: 'center',
  },
  {
    id: 'home-buttons',
    phase: 'home',
    target: '[data-tutorial="header-controls"]',
    title: 'File Controls',
    description: 'Use "Open Folder" to access your ledger files directly, and "Refresh" to reload the list.',
    position: 'left',
  },
  {
    id: 'home-new-ledger',
    phase: 'home',
    target: '[data-tutorial="new-ledger-btn"]',
    title: 'Create New Ledger',
    description: 'Click "New Ledger" to create a fresh ledger file for tracking your shops and trades.',
    position: 'bottom',
  },
  {
    id: 'home-ledger-list',
    phase: 'home',
    target: '[data-tutorial="ledger-list"]',
    title: 'Your Ledgers',
    description: 'Your saved ledgers appear here. Each ledger is a self-contained file you can share, backup, or move between computers.',
    position: 'bottom',
  },
  {
    id: 'home-choice',
    phase: 'home',
    title: 'Ready to Continue?',
    description: 'Would you like to continue the tutorial and explore all features, or jump right in by creating your own ledger?',
    position: 'center',
    isChoice: true,
    choiceOptions: [
      { label: 'Continue Tutorial', action: 'continue' },
      { label: 'Create New Ledger', action: 'end' },
    ],
  },
  {
    id: 'home-click-tutorial',
    phase: 'home',
    target: '[data-tutorial="tutorial-ledger"]',
    title: 'Click the Tutorial Ledger',
    description: 'Click on the Tutorial ledger to open it. This contains example data we\'ll use to explore all the features.',
    position: 'left',
    action: 'click',
    actionTarget: '[data-tutorial="tutorial-ledger"]',
  },

  // ===== PHASE 2: MAIN APP - INITIAL OVERVIEW =====
  {
    id: 'app-intro',
    phase: 'app',
    title: 'Welcome to the Workspace!',
    description: 'This is your main workspace where you\'ll manage all your shop data. Let\'s take a quick tour of the interface and its key features.',
    position: 'center',
  },
  {
    id: 'app-reveal',
    phase: 'app',
    title: 'Take It In',
    description: 'Look around, then continue when ready.',
    position: 'corner',
    isReveal: true,
    tooltipCompact: true,
  },
  {
    id: 'app-search',
    phase: 'app',
    target: '[data-tutorial="global-search"]',
    title: 'Smart Search',
    description: 'Search across all your shops, trades, items, and players. Try typing something!',
    position: 'left',
    isInteractive: true,
    includeRelatedSelector: '[data-tutorial-search-dropdown]',
    clearSearchOnExit: true,
  },
  {
    id: 'app-ledger-controls',
    phase: 'app',
    target: '[data-tutorial="ledger-controls"]',
    title: 'Ledger & File Controls',
    description: 'Save changes, undo edits, or go back to ledger selection. These are view-only during the tutorial.',
    position: 'right',
    isInteractive: true,
    tooltipOffset: { y: -60 }, // Lift tooltip away from bottom edge
    includeRelatedSelector: '[data-tutorial-ledger-popup]',
    blockInteraction: true, // Don't actually allow clicks
  },
  {
    id: 'app-bottom-nav',
    phase: 'app',
    target: '[data-tutorial="bottom-nav"]',
    title: 'Navigation Bar',
    description: 'Switch between Shops, Items, Map, Stats, and Players sections.',
    position: 'top',
    tooltipOffset: { y: 20 }, // Bring tooltip closer to navbar
  },
  {
    id: 'app-shop-list',
    phase: 'app',
    target: '[data-tutorial="shop-list"]',
    title: 'Shop List',
    description: 'Here are all the shops in this ledger. Each card shows the shop name, owner, and trade count. Click on any shop to see its details!',
    position: 'top',
    action: 'click',
    actionTarget: '[data-tutorial="shop-card"]',
    navigateTo: 'shops', // Reset to shops tab first
  },

  // ===== PHASE 3: SHOP DETAIL =====
  {
    id: 'shop-header',
    phase: 'shop-detail',
    target: '[data-tutorial="shop-header"]',
    title: 'Shop Overview',
    description: 'The header shows shop name, description, and active status.',
    position: 'bottom',
    scrollToElement: true,
  },
  {
    id: 'shop-info-section',
    phase: 'shop-detail',
    title: 'Shop Information',
    description: 'Below the header you\'ll find the owner, location, and tags. Scroll down to explore, then continue!',
    isInteractive: true, // Let them scroll
    blockNavigation: true,
  },
  {
    id: 'shop-trades',
    phase: 'shop-detail',
    target: '[data-tutorial="trade-item"]:first-child',
    title: 'Trade Listings',
    description: 'Each trade shows what the shop buys (left) and what it sells (right). Let\'s edit this shop!',
    position: 'right',
    scrollToElement: true,
  },
  {
    id: 'shop-click-edit',
    phase: 'shop-detail',
    target: '[data-tutorial="edit-button"]',
    title: 'Click Edit',
    description: 'Click the Edit button to modify this shop.',
    position: 'left',
    action: 'click',
    actionTarget: '[data-tutorial="edit-button"]',
    scrollToElement: true,
  },

  // ===== PHASE 4: SHOP EDITOR =====
  {
    id: 'edit-intro',
    phase: 'shop-edit',
    title: 'Shop Editor',
    description: 'Explore the shop editor - you can modify details, owner, location, and trades. Navigation and save buttons are disabled during this step. Click Continue when ready!',
    isInteractive: true, // No target = exploration step, uses corner tooltip
    blockNavigation: true,
    blockSaving: true, // Block save buttons until next step
  },
  {
    id: 'edit-save',
    phase: 'shop-edit',
    target: '[data-tutorial="save-button"]',
    title: 'Save Changes',
    description: 'Click either "Save Changes" button (top or bottom) when you\'re ready to apply your edits.',
    position: 'center',
    action: 'click',
    actionTarget: '[data-tutorial="save-button"]',
    showDualIndicators: true,
    highlightMultipleFixed: ['[data-tutorial="save-button"]'],
  },

  // ===== PHASE 5: ITEMS PAGE =====
  {
    id: 'items-nav',
    phase: 'shop-detail',
    target: '[data-tutorial="nav-items"]',
    title: 'Browse Items',
    description: 'Let\'s explore the Items page. Click "Items" in the navigation.',
    position: 'top',
    tooltipOffset: { y: 20 },
    action: 'click',
    actionTarget: '[data-tutorial="nav-items"]',
    restrictClickToTarget: true,
  },
  {
    id: 'items-intro',
    phase: 'items',
    title: 'Items Browser',
    description: 'Browse all Minecraft items organized by category. Click any item to see trade statistics. Explore freely, then continue!',
    isInteractive: true,
    blockNavigation: true,
  },

  // ===== PHASE 6: MAP PAGE =====
  {
    id: 'map-nav',
    phase: 'items',
    target: '[data-tutorial="nav-map"]',
    title: 'Explore the Map',
    description: 'Let\'s see the map view. Click "Map" in the navigation.',
    position: 'top',
    tooltipOffset: { y: 20 },
    action: 'click',
    actionTarget: '[data-tutorial="nav-map"]',
    restrictClickToTarget: true,
  },
  {
    id: 'map-intro',
    phase: 'map',
    title: 'Interactive Map',
    description: 'Full CivMC map with your shop locations as markers. Pan, zoom, and click markers to see shop details!',
    isInteractive: true,
    blockNavigation: true,
    position: 'top-left',
    zoomToCoords: { x: -4010, z: 50, zoom: 2 },
  },

  // ===== PHASE 7: STATS PAGE =====
  {
    id: 'stats-nav',
    phase: 'map',
    target: '[data-tutorial="nav-stats"]',
    title: 'View Statistics',
    description: 'Check out the Stats page. Click "Stats" in the navigation.',
    position: 'top',
    tooltipOffset: { y: 20 },
    action: 'click',
    actionTarget: '[data-tutorial="nav-stats"]',
    restrictClickToTarget: true,
  },
  {
    id: 'stats-intro',
    phase: 'stats',
    title: 'Ledger Analytics',
    description: 'Overview of your ledger: total shops, trades, popular items, and trends. Great for spotting opportunities!',
    isInteractive: true,
    blockNavigation: true,
  },

  // ===== PHASE 8: PLAYERS PAGE =====
  {
    id: 'players-nav',
    phase: 'stats',
    target: '[data-tutorial="nav-players"]',
    title: 'Manage Players',
    description: 'Finally, the Players page. Click "Players" in the navigation.',
    position: 'top',
    tooltipOffset: { y: 20 },
    action: 'click',
    actionTarget: '[data-tutorial="nav-players"]',
    restrictClickToTarget: true,
  },
  {
    id: 'players-intro',
    phase: 'players',
    title: 'Players & Groups',
    description: 'Track players and organize them into groups for shared shop ownership. Try adding your IGN or exploring the Groups tab!',
    isInteractive: true,
    blockNavigation: true,
  },

  // ===== ADD SHOP BUTTON =====
  {
    id: 'add-shop-intro',
    phase: 'players',
    target: '[data-tutorial="add-shop-btn"]',
    title: 'Add New Shops',
    description: 'Click this golden "+" button to add a new shop to your ledger!',
    position: 'top',
    action: 'click',
    actionTarget: '[data-tutorial="add-shop-btn"]',
  },
  {
    id: 'add-shop-create',
    phase: 'add-shop',
    title: 'Create Your Shop',
    description: 'Fill in the shop details - name, location, and trades. When you\'re ready, click "Create Shop" to add it to your ledger!',
    isInteractive: true,
    blockNavigation: true,
    position: 'top-left',
    hideContinueButton: true,
  },
  {
    id: 'created-shop-spotlight',
    phase: 'app',
    target: '[data-tutorial="created-shop"]',
    title: 'Your New Shop!',
    description: 'Here\'s the shop you just created! It\'s now saved in your ledger and ready to track trades.',
    position: 'right',
    navigateTo: '/app',
  },

  // ===== FINALE =====
  {
    id: 'finale',
    phase: 'app',
    target: '[data-tutorial="logo-text"]',
    title: 'Tutorial Complete! 🎉',
    description: 'You\'ve mastered Ironbank! Click the logo anytime to return home.',
    position: 'bottom',
    action: 'click',
    actionTarget: '[data-tutorial="logo"]',
  },
];

interface TutorialStore {
  // State
  isActive: boolean;
  currentStepId: string | null;
  completedSteps: string[];
  phase: TutorialStep['phase'] | null;
  userIGN: string | null; // Store user's IGN during tutorial
  userGroupId: string | null; // Store created group ID
  createdShopId: string | null; // Store ID of shop created during tutorial
  
  // Actions
  startTutorial: () => void;
  endTutorial: () => void;
  goToStep: (stepId: string) => void;
  completeStep: (stepId: string) => void;
  nextStep: () => void;
  getCurrentStep: () => TutorialStep | null;
  setUserIGN: (ign: string) => void;
  setUserGroupId: (id: string) => void;
  setCreatedShopId: (id: string) => void;
  setPhase: (phase: TutorialStep['phase']) => void;
  
  // Helpers
  isStepCompleted: (stepId: string) => boolean;
  getStepById: (stepId: string) => TutorialStep | undefined;
}

export const useTutorialStore = create<TutorialStore>((set, get) => ({
  isActive: false,
  currentStepId: null,
  completedSteps: [],
  phase: null,
  userIGN: null,
  userGroupId: null,
  createdShopId: null,

  startTutorial: () => set({
    isActive: true,
    currentStepId: 'home-intro',
    completedSteps: [],
    phase: 'home',
    userIGN: null,
    userGroupId: null,
    createdShopId: null,
  }),

  endTutorial: () => set({
    isActive: false,
    currentStepId: null,
    completedSteps: [],
    phase: null,
  }),

  goToStep: (stepId) => {
    const step = TUTORIAL_STEPS.find(s => s.id === stepId);
    if (step) {
      set({ currentStepId: stepId, phase: step.phase });
    }
  },

  completeStep: (stepId) => set(state => ({
    completedSteps: [...state.completedSteps, stepId],
  })),

  nextStep: () => {
    const { currentStepId, completedSteps } = get();
    if (!currentStepId) return;

    const currentIndex = TUTORIAL_STEPS.findIndex(s => s.id === currentStepId);
    const currentStep = TUTORIAL_STEPS[currentIndex];
    
    // Mark current as completed
    if (!completedSteps.includes(currentStepId)) {
      set(state => ({ completedSteps: [...state.completedSteps, currentStepId] }));
    }

    // If there's a specific next step, go there
    if (currentStep?.nextStep) {
      const nextStep = TUTORIAL_STEPS.find(s => s.id === currentStep.nextStep);
      if (nextStep) {
        set({ currentStepId: nextStep.id, phase: nextStep.phase });
        return;
      }
    }

    // Otherwise go to next in sequence
    if (currentIndex < TUTORIAL_STEPS.length - 1) {
      const nextStep = TUTORIAL_STEPS[currentIndex + 1];
      set({ currentStepId: nextStep.id, phase: nextStep.phase });
    } else {
      // Tutorial complete
      get().endTutorial();
    }
  },

  getCurrentStep: () => {
    const { currentStepId } = get();
    if (!currentStepId) return null;
    return TUTORIAL_STEPS.find(s => s.id === currentStepId) || null;
  },

  setUserIGN: (ign) => set({ userIGN: ign }),
  setUserGroupId: (id) => set({ userGroupId: id }),
  setCreatedShopId: (id) => set({ createdShopId: id }),
  setPhase: (phase) => set({ phase }),

  isStepCompleted: (stepId) => get().completedSteps.includes(stepId),
  getStepById: (stepId) => TUTORIAL_STEPS.find(s => s.id === stepId),
}));
