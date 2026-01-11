// ============================================
// Zustand Store for Shopside Tracker
// ============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Shop, Trade, Player, Group, FilterState, SortState, CustomItem } from '../types';

// Generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 15);

interface ShopStore {
  // Data
  shops: Shop[];
  players: Player[];
  groups: Group[];
  customItems: CustomItem[];
  
  // UI State
  selectedShopId: string | null;
  filter: FilterState;
  sort: SortState;
  viewMode: 'list' | 'grid' | 'map';
  
  // Ledger State
  ledgerName: string;
  ledgerPath: string | null;
  hasUnsavedChanges: boolean;
  
  // Shop CRUD
  addShop: (shop: Omit<Shop, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateShop: (id: string, updates: Partial<Shop>) => void;
  deleteShop: (id: string) => void;
  getShop: (id: string) => Shop | undefined;
  
  // Trade management
  addTrade: (shopId: string, trade: Omit<Trade, 'id' | 'lastUpdated'>) => void;
  updateTrade: (shopId: string, tradeId: string, updates: Partial<Trade>) => void;
  deleteTrade: (shopId: string, tradeId: string) => void;
  
  // Player/Group management
  addPlayer: (player: Player) => void;
  updatePlayer: (ign: string, updates: Partial<Player>) => void;
  deletePlayer: (ign: string) => void;
  addGroup: (group: Omit<Group, 'id'>) => string;
  updateGroup: (id: string, updates: Partial<Group>) => void;
  deleteGroup: (id: string) => void;
  
  // Custom Items management
  addCustomItem: (item: Omit<CustomItem, 'id' | 'createdAt'>) => string;
  updateCustomItem: (id: string, updates: Partial<CustomItem>) => void;
  deleteCustomItem: (id: string) => void;
  getCustomItem: (id: string) => CustomItem | undefined;
  
  // UI Actions
  setSelectedShop: (id: string | null) => void;
  setFilter: (filter: Partial<FilterState>) => void;
  setSort: (sort: Partial<SortState>) => void;
  setViewMode: (mode: 'list' | 'grid' | 'map') => void;
  
  // Bulk operations
  importShops: (shops: Shop[]) => void;
  exportShops: () => Shop[];
  clearAllData: () => void;
  
  // Ledger operations
  setLedgerName: (name: string) => void;
  setLedgerPath: (path: string | null) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  loadLedgerData: (data: { shops: Shop[]; players: Player[]; groups: Group[]; customItems: CustomItem[] }, name?: string, path?: string | null) => void;
}

// Initial demo data
const createDemoData = (): Pick<ShopStore, 'shops' | 'players' | 'groups' | 'customItems'> => {
  const demoPlayers: Player[] = [
    { ign: 'reffelruz' },
    { ign: 'jwm-dev', notes: 'IGN: jwmgregory\nAKA: fadedsoul' },
    { ign: 'MAGICMARS345' },
    { ign: 'PergySkeel' },
    { ign: 'PoolPartyColin' },
    { ign: 'fadedsoul' },
    { ign: 'DrPlushy' },
  ];

  const demoGroups: Group[] = [
    {
      id: 'qm19y7d4wj',
      name: 'Crown Corporation',
      notes: 'State-owned CW company.',
      members: [
        { ign: 'reffelruz' },
        { ign: 'PergySkeel' },
        { ign: 'PoolPartyColin' },
      ],
      leader: { ign: 'reffelruz' },
    },
    {
      id: 'xs1ddulmd8',
      name: 'jwmCo',
      members: [
        { ign: 'jwm-dev', notes: 'IGN: jwmgregory\nAKA: fadedsoul' },
        { ign: 'fadedsoul' },
        { ign: 'DrPlushy' },
      ],
      leader: { ign: 'jwm-dev', notes: 'IGN: jwmgregory\nAKA: fadedsoul' },
    },
  ];

  const demoCustomItems: CustomItem[] = [
    {
      id: 'custom_vk366gqmmws',
      name: 'Fossil',
      baseItemId: 'prismarine_shard',
      createdAt: new Date('2026-01-09T17:03:47.692Z'),
    },
  ];

  const demoShops: Shop[] = [
    {
      id: '087wg3i4zpta',
      name: 'Slamm! Ore Exchange',
      description: 'State-run CW ore exchange for Shopside.',
      owner: { type: 'group', group: demoGroups[0] },
      location: { x: -3998, y: 0, z: 53 },
      trades: [
        {
          id: 'aac289db-c886-4b5a-9b29-e60c80dc758c',
          input: { itemId: 'lapis_ore', quantity: { amount: 64, unit: 'd' } },
          output: { itemId: 'lapis_lazuli', quantity: { amount: 72, unit: 'item' } },
          isActive: true,
          lastUpdated: new Date('2026-01-09T16:10:15.838Z'),
        },
        {
          id: '567f5092-8a45-4762-bdf3-c9d2bd5d322d',
          input: { itemId: 'coal_ore', quantity: { amount: 64, unit: 'd' } },
          output: { itemId: 'coal', quantity: { amount: 72, unit: 'item' } },
          isActive: true,
          lastUpdated: new Date('2026-01-09T16:10:54.059Z'),
        },
        {
          id: '88a022ee-3d96-4054-95d8-209ca48942f1',
          input: { itemId: 'iron_ore', quantity: { amount: 64, unit: 'd' } },
          output: { itemId: 'iron_ingot', quantity: { amount: 72, unit: 'item' } },
          isActive: true,
          lastUpdated: new Date('2026-01-09T16:11:11.699Z'),
        },
        {
          id: '9100dc9d-9ae3-4180-92f8-c53247830c37',
          input: { itemId: 'copper_ore', quantity: { amount: 64, unit: 'd' } },
          output: { itemId: 'copper_ingot', quantity: { amount: 72, unit: 'item' } },
          isActive: true,
          lastUpdated: new Date('2026-01-09T16:11:25.500Z'),
        },
        {
          id: 'b51b8388-43ce-4539-9e8f-e4f55b3d1911',
          input: { itemId: 'iron_ingot', quantity: { amount: 10, unit: 'd' } },
          output: { itemId: 'diamond', quantity: { amount: 1, unit: 'item' } },
          isActive: true,
          lastUpdated: new Date('2026-01-09T16:11:53.829Z'),
        },
        {
          id: '60004473-262b-4b76-9a21-5c2e14860850',
          input: { itemId: 'diamond', quantity: { amount: 1, unit: 'd' } },
          output: { itemId: 'emerald', quantity: { amount: 3, unit: 'item' } },
          isActive: true,
          lastUpdated: new Date('2026-01-09T16:12:19.832Z'),
        },
        {
          id: '54ba013d-2e10-4153-9151-d8c0371c7dec',
          input: { itemId: 'gold_block', quantity: { amount: 5, unit: 'd' } },
          output: { itemId: 'diamond', quantity: { amount: 1, unit: 'item' } },
          isActive: true,
          lastUpdated: new Date('2026-01-09T16:12:33.889Z'),
        },
        {
          id: 'dab48efb-9bd9-4df7-9247-b39e0390e3db',
          input: { itemId: 'iron_block', quantity: { amount: 8, unit: 'd' } },
          output: { itemId: 'diamond_block', quantity: { amount: 1, unit: 'item' } },
          isActive: true,
          lastUpdated: new Date('2026-01-09T16:13:05.081Z'),
        },
        {
          id: 'b4c72c00-508c-4aec-b4f6-82aab59ae142',
          input: { itemId: 'raw_gold', quantity: { amount: 5, unit: 'd' } },
          output: { itemId: 'gold_ingot', quantity: { amount: 5, unit: 'item' } },
          isActive: true,
          lastUpdated: new Date('2026-01-09T16:14:07.821Z'),
        },
      ],
      tags: ['ore', 'exchange', 'currency', 'diamond', 'iron', 'money'],
      createdAt: new Date('2026-01-09T16:13:16.334Z'),
      updatedAt: new Date('2026-01-09T16:14:21.833Z'),
      isActive: true,
    },
    {
      id: '0ik2e54zbgg',
      name: "Pergy's Golden Rail Grill",
      description: 'Food, leather, and consumables outlet.',
      owner: { type: 'individual', player: { ign: 'PergySkeel' } },
      location: { x: -4024, y: -7, z: 65 },
      trades: [
        {
          id: '06a25f27-4750-4480-aab4-6d2d0917af4c',
          input: { itemId: 'iron_ingot', quantity: { amount: 12, unit: 'd' } },
          output: { itemId: 'apple', quantity: { amount: 64, unit: 'item' } },
          isActive: true,
          lastUpdated: new Date('2026-01-09T16:18:20.391Z'),
        },
        {
          id: 'b3cab2c2-3acf-4960-8725-e013b926874e',
          input: { itemId: 'diamond', quantity: { amount: 1, unit: 'd' } },
          output: { itemId: 'leather', quantity: { amount: 64, unit: 'item' } },
          isActive: true,
          lastUpdated: new Date('2026-01-09T16:18:30.284Z'),
        },
        {
          id: '908242d5-908e-4afd-81d3-1af288ebbed9',
          input: { itemId: 'iron_ingot', quantity: { amount: 8, unit: 'd' } },
          output: { itemId: 'cooked_cod', quantity: { amount: 64, unit: 'item' } },
          isActive: true,
          lastUpdated: new Date('2026-01-09T16:18:42.696Z'),
        },
        {
          id: '8ede56e8-318d-4335-b2d3-11651c92dc1d',
          input: { itemId: 'iron_ingot', quantity: { amount: 8, unit: 'd' } },
          output: { itemId: 'cooked_salmon', quantity: { amount: 64, unit: 'item' } },
          isActive: true,
          lastUpdated: new Date('2026-01-09T16:19:09.173Z'),
        },
        {
          id: '28f57934-3c65-4009-91e0-18f6c79f93a9',
          input: { itemId: 'iron_ingot', quantity: { amount: 8, unit: 'd' } },
          output: { itemId: 'cooked_rabbit', quantity: { amount: 64, unit: 'item' } },
          isActive: true,
          lastUpdated: new Date('2026-01-09T16:19:26.714Z'),
        },
        {
          id: 'b2d7fa3a-7a63-4722-bca4-128097578b14',
          input: { itemId: 'diamond', quantity: { amount: 1, unit: 'd' } },
          output: { itemId: 'cooked_porkchop', quantity: { amount: 64, unit: 'item' } },
          isActive: true,
          lastUpdated: new Date('2026-01-09T16:19:43.906Z'),
        },
        {
          id: '4e8b9d0f-25b0-47a3-956d-291dcae2509d',
          input: { itemId: 'iron_ingot', quantity: { amount: 10, unit: 'd' } },
          output: { itemId: 'cooked_mutton', quantity: { amount: 64, unit: 'item' } },
          isActive: true,
          lastUpdated: new Date('2026-01-09T16:20:16.223Z'),
        },
        {
          id: '116cf049-9888-4754-b13e-df34788fdb0b',
          input: { itemId: 'diamond', quantity: { amount: 1, unit: 'd' } },
          output: { itemId: 'cooked_beef', quantity: { amount: 64, unit: 'item' } },
          isActive: true,
          lastUpdated: new Date('2026-01-09T16:20:49.659Z'),
        },
        {
          id: '9100f3d8-7644-494e-8516-5ab8160cd7d7',
          input: { itemId: 'diamond', quantity: { amount: 1, unit: 'd' } },
          output: { itemId: 'cooked_chicken', quantity: { amount: 64, unit: 'item' } },
          isActive: true,
          lastUpdated: new Date('2026-01-09T16:20:54.062Z'),
        },
        {
          id: '1dd977cf-b630-4545-b6de-74f1c0f1f795',
          input: { itemId: 'iron_ingot', quantity: { amount: 8, unit: 'd' } },
          output: { itemId: 'honey_bottle', quantity: { amount: 8, unit: 'item' } },
          isActive: true,
          lastUpdated: new Date('2026-01-09T16:21:07.631Z'),
        },
        {
          id: 'ae371749-17a1-4ca8-b8bf-6b7a6dc5d1ab',
          input: { itemId: 'iron_ingot', quantity: { amount: 12, unit: 'd' } },
          output: { itemId: 'honey_block', quantity: { amount: 32, unit: 'item' } },
          isActive: true,
          lastUpdated: new Date('2026-01-09T16:21:19.457Z'),
        },
        {
          id: '8d4267a6-d59e-4b5f-89dc-17a378fda35b',
          input: { itemId: 'diamond', quantity: { amount: 1, unit: 'd' } },
          output: { itemId: 'honeycomb', quantity: { amount: 64, unit: 'item' } },
          isActive: true,
          lastUpdated: new Date('2026-01-09T16:21:48.282Z'),
        },
      ],
      tags: ['food', 'leather', 'honey'],
      createdAt: new Date('2026-01-09T16:22:02.780Z'),
      updatedAt: new Date('2026-01-09T16:22:02.780Z'),
      isActive: true,
    },
    {
      id: 'ig9rkwq2b9p',
      name: 'Yellowstone Fossil Exchange',
      owner: { type: 'individual', player: { ign: 'PergySkeel' } },
      location: { x: -4024, y: -7, z: 92 },
      trades: [
        {
          id: 'dc87c973-014a-4ba4-be38-c792099aa4c0',
          input: { itemId: 'custom_vk366gqmmws', quantity: { amount: 64, unit: 'd' } },
          output: { itemId: 'diamond', quantity: { amount: 7, unit: 'item' } },
          isActive: true,
          lastUpdated: new Date('2026-01-09T17:03:27.097Z'),
        },
      ],
      tags: ['fossil', 'exchange'],
      createdAt: new Date('2026-01-09T17:02:52.128Z'),
      updatedAt: new Date('2026-01-09T17:04:23.175Z'),
      isActive: true,
    },
    {
      id: 'i0o2b2eun4l',
      name: 'Crown Armaments',
      owner: { type: 'group', group: demoGroups[0] },
      location: { x: -4018, y: -1, z: 59 },
      trades: [
        {
          id: '9172347c-12c3-4771-9cbe-3d7311c6afe4',
          input: { itemId: 'diamond', quantity: { amount: 14, unit: 'd' } },
          output: { 
            itemId: 'diamond_axe', 
            quantity: { amount: 1, unit: 'item' },
            enchantments: [
              { enchantmentId: 'unbreaking', level: 3 },
              { enchantmentId: 'efficiency', level: 5 },
            ],
          },
          isActive: true,
          lastUpdated: new Date('2026-01-09T17:05:40.598Z'),
        },
      ],
      tags: ['tools', 'armor', 'swords', 'diamond', 'enchanted', 'enchants'],
      createdAt: new Date('2026-01-09T17:06:22.239Z'),
      updatedAt: new Date('2026-01-09T17:06:22.239Z'),
      isActive: true,
    },
  ];

  return { shops: demoShops, players: demoPlayers, groups: demoGroups, customItems: demoCustomItems };
};

// Empty initial state for Tauri (users load from ledger files)
const createEmptyData = (): Pick<ShopStore, 'shops' | 'players' | 'groups' | 'customItems'> => ({
  shops: [],
  players: [],
  groups: [],
  customItems: [],
});

// Check if running in Tauri
const isTauriEnv = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export const useShopStore = create<ShopStore>()(
  persist(
    (set, get) => ({
      // Initial state - empty for Tauri (load from ledgers), demo data for browser
      ...(isTauriEnv ? createEmptyData() : createDemoData()),
      selectedShopId: null,
      filter: {
        searchQuery: '',
        categories: [],
      },
      sort: {
        field: 'name',
        direction: 'asc',
      },
      viewMode: 'list',
      
      // Ledger state
      ledgerName: 'Commonwealth Ledger',
      ledgerPath: null,
      hasUnsavedChanges: false,

      // Shop CRUD
      addShop: (shopData) => {
        const id = generateId();
        console.log('Store addShop - generated ID:', id);
        const now = new Date();
        const shop: Shop = {
          ...shopData,
          id,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ shops: [...state.shops, shop], hasUnsavedChanges: true }));
        console.log('Store addShop - returning ID:', id);
        return id;
      },

      updateShop: (id, updates) => {
        set((state) => ({
          shops: state.shops.map((shop) =>
            shop.id === id
              ? { ...shop, ...updates, updatedAt: new Date() }
              : shop
          ),
          hasUnsavedChanges: true,
        }));
      },

      deleteShop: (id) => {
        set((state) => ({
          shops: state.shops.filter((shop) => shop.id !== id),
          selectedShopId: state.selectedShopId === id ? null : state.selectedShopId,
          hasUnsavedChanges: true,
        }));
      },

      getShop: (id) => {
        return get().shops.find((shop) => shop.id === id);
      },

      // Trade management
      addTrade: (shopId, tradeData) => {
        const trade: Trade = {
          ...tradeData,
          id: generateId(),
          lastUpdated: new Date(),
        };
        set((state) => ({
          shops: state.shops.map((shop) =>
            shop.id === shopId
              ? { ...shop, trades: [...shop.trades, trade], updatedAt: new Date() }
              : shop
          ),
          hasUnsavedChanges: true,
        }));
      },

      updateTrade: (shopId, tradeId, updates) => {
        set((state) => ({
          shops: state.shops.map((shop) =>
            shop.id === shopId
              ? {
                  ...shop,
                  trades: shop.trades.map((trade) =>
                    trade.id === tradeId
                      ? { ...trade, ...updates, lastUpdated: new Date() }
                      : trade
                  ),
                  updatedAt: new Date(),
                }
              : shop
          ),
          hasUnsavedChanges: true,
        }));
      },

      deleteTrade: (shopId, tradeId) => {
        set((state) => ({
          shops: state.shops.map((shop) =>
            shop.id === shopId
              ? {
                  ...shop,
                  trades: shop.trades.filter((trade) => trade.id !== tradeId),
                  updatedAt: new Date(),
                }
              : shop
          ),
          hasUnsavedChanges: true,
        }));
      },

      // Player management
      addPlayer: (player) => {
        set((state) => {
          if (state.players.some((p) => p.ign === player.ign)) {
            return state; // Already exists
          }
          return { players: [...state.players, player], hasUnsavedChanges: true };
        });
      },

      updatePlayer: (ign, updates) => {
        set((state) => ({
          players: state.players.map((player) =>
            player.ign === ign ? { ...player, ...updates } : player
          ),
          hasUnsavedChanges: true,
        }));
      },

      deletePlayer: (ign) => {
        set((state) => ({
          players: state.players.filter((player) => player.ign !== ign),
          hasUnsavedChanges: true,
        }));
      },

      // Group management
      addGroup: (groupData) => {
        const id = generateId();
        const group: Group = { ...groupData, id };
        set((state) => ({ groups: [...state.groups, group], hasUnsavedChanges: true }));
        return id;
      },

      updateGroup: (id, updates) => {
        set((state) => ({
          groups: state.groups.map((group) =>
            group.id === id ? { ...group, ...updates } : group
          ),
          hasUnsavedChanges: true,
        }));
      },

      deleteGroup: (id) => {
        set((state) => ({
          groups: state.groups.filter((group) => group.id !== id),
          hasUnsavedChanges: true,
        }));
      },

      // Custom Items management
      addCustomItem: (itemData) => {
        const id = `custom_${generateId()}`;
        const item: CustomItem = {
          ...itemData,
          id,
          createdAt: new Date(),
        };
        set((state) => ({ customItems: [...state.customItems, item], hasUnsavedChanges: true }));
        return id;
      },

      updateCustomItem: (id, updates) => {
        set((state) => ({
          customItems: state.customItems.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
          hasUnsavedChanges: true,
        }));
      },

      deleteCustomItem: (id) => {
        set((state) => ({
          customItems: state.customItems.filter((item) => item.id !== id),
          hasUnsavedChanges: true,
        }));
      },

      getCustomItem: (id) => {
        return get().customItems.find((item) => item.id === id);
      },

      // UI Actions
      setSelectedShop: (id) => {
        set({ selectedShopId: id });
      },

      setFilter: (filter) => {
        set((state) => ({ filter: { ...state.filter, ...filter } }));
      },

      setSort: (sort) => {
        set((state) => ({ sort: { ...state.sort, ...sort } }));
      },

      setViewMode: (mode) => {
        set({ viewMode: mode });
      },

      // Bulk operations
      importShops: (shops) => {
        set((state) => ({
          shops: [...state.shops, ...shops],
        }));
      },

      exportShops: () => {
        return get().shops;
      },

      clearAllData: () => {
        set({
          shops: [],
          players: [],
          groups: [],
          customItems: [],
          selectedShopId: null,
          hasUnsavedChanges: false,
        });
      },
      
      // Ledger operations
      setLedgerName: (name) => {
        set({ ledgerName: name });
      },
      
      setLedgerPath: (path) => {
        set({ ledgerPath: path });
      },
      
      setHasUnsavedChanges: (hasChanges) => {
        set({ hasUnsavedChanges: hasChanges });
      },
      
      loadLedgerData: (data, name, path) => {
        set({
          shops: data.shops,
          players: data.players,
          groups: data.groups,
          customItems: data.customItems,
          selectedShopId: null,
          ...(name !== undefined && { ledgerName: name }),
          ...(path !== undefined && { ledgerPath: path }),
          hasUnsavedChanges: false,
        });
      },
    }),
    {
      name: 'shopside-tracker-storage',
      partialize: (state) => ({
        shops: state.shops,
        players: state.players,
        groups: state.groups,
        customItems: state.customItems,
        // Persist UI state for better context awareness
        selectedShopId: state.selectedShopId,
        filter: state.filter,
        sort: state.sort,
        viewMode: state.viewMode,
        // Persist ledger state
        ledgerName: state.ledgerName,
        ledgerPath: state.ledgerPath,
      }),
    }
  )
);

// Selector hooks for optimized re-renders
export const useShops = () => useShopStore((state) => state.shops);
export const useSelectedShop = () => {
  const selectedId = useShopStore((state) => state.selectedShopId);
  const shops = useShopStore((state) => state.shops);
  return shops.find((shop) => shop.id === selectedId);
};
export const useFilter = () => useShopStore((state) => state.filter);
export const useSort = () => useShopStore((state) => state.sort);
export const useViewMode = () => useShopStore((state) => state.viewMode);
