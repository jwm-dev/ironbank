import { create } from 'zustand';

interface MapState {
  // Camera state
  camera: { x: number; z: number };
  zoom: number;
  
  // Layer state
  activeLayer: string;
  activeOverlays: Set<string>;
  
  // Point data visibility
  showShops: boolean;
  showPortals: boolean;
  showStations: boolean;
  showSettlements: boolean;
  
  // Selected shop
  selectedShop: string | null;
  
  // Actions
  setCamera: (camera: { x: number; z: number }) => void;
  setZoom: (zoom: number) => void;
  setCameraAndZoom: (camera: { x: number; z: number }, zoom: number) => void;
  setActiveLayer: (layer: string) => void;
  toggleOverlay: (id: string) => void;
  setShowShops: (show: boolean) => void;
  setShowPortals: (show: boolean) => void;
  setShowStations: (show: boolean) => void;
  setShowSettlements: (show: boolean) => void;
  setSelectedShop: (shopId: string | null) => void;
}

export const useMapStore = create<MapState>((set) => ({
  // Initial state - The Mill, Commonwealth
  camera: { x: -3994, z: 64 },
  zoom: -3,
  
  activeLayer: 'terrain',
  activeOverlays: new Set<string>(),
  
  showShops: true,
  showPortals: true,
  showStations: true,
  showSettlements: true,
  
  selectedShop: null,
  
  // Actions
  setCamera: (camera) => set({ camera }),
  setZoom: (zoom) => set({ zoom }),
  setCameraAndZoom: (camera, zoom) => set({ camera, zoom }),
  setActiveLayer: (activeLayer) => set({ activeLayer }),
  toggleOverlay: (id) => set((state) => {
    const next = new Set(state.activeOverlays);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    return { activeOverlays: next };
  }),
  setShowShops: (showShops) => set({ showShops }),
  setShowPortals: (showPortals) => set({ showPortals }),
  setShowStations: (showStations) => set({ showStations }),
  setShowSettlements: (showSettlements) => set({ showSettlements }),
  setSelectedShop: (selectedShop) => set({ selectedShop }),
}));
