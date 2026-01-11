import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Maximize2, 
  ArrowRight,
  Navigation,
  User,
  Plus,
  X,
  Home,
  Trash2,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  Train,
  Map as MapIcon,
  Compass
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, ImageOverlay, useMapEvents } from 'react-leaflet';
import L, { CRS, DivIcon, LatLngBoundsExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useShopStore } from '../store/shopStore';
import { useMapStore } from '../store/mapStore';
import { PlayerHead } from './PlayerHead';
import { MinecraftItem } from './MinecraftItem';
import { getItemDisplayName } from '../data/itemLoader';

// Custom styles for dark theme Leaflet popups
const darkPopupStyle = `
  .leaflet-popup-content-wrapper {
    background: rgba(30, 30, 45, 0.95) !important;
    backdrop-filter: blur(12px);
    color: #e5e5e5 !important;
    border: 1px solid rgba(255,255,255,0.1) !important;
    border-radius: 12px !important;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5) !important;
  }
  .leaflet-popup-tip {
    background: rgba(30, 30, 45, 0.95) !important;
    border: 1px solid rgba(255,255,255,0.1) !important;
    box-shadow: none !important;
  }
  .leaflet-popup-close-button {
    color: #9ca3af !important;
    font-size: 18px !important;
    padding: 6px 8px !important;
  }
  .leaflet-popup-close-button:hover {
    color: #ffffff !important;
    background: rgba(255,255,255,0.1) !important;
    border-radius: 4px;
  }
  .leaflet-popup-content {
    margin: 12px 14px !important;
  }
`;

// ============================================
// Types
// ============================================

interface MapMarker {
  id: string;
  name: string;
  description?: string;
  x: number;
  z: number;
  color: string;
  icon?: string;
  isDefault?: boolean;
  source?: 'custom' | 'portal' | 'station' | 'settlement';
}

interface MapLayer {
  id: string;
  name: string;
  url: string;
  description?: string;
}

interface OverlayLayer {
  id: string;
  name: string;
  icon: React.ReactNode;
  description?: string;
}

interface RailLine {
  id: string;
  name?: string;
  color: string;
  lines: [number, number][][];
}

interface OneDestLine {
  id: string;
  color: string;
  line: [number, number][][];
}

// ============================================
// Constants
// ============================================

// Base tile layers
const MAP_LAYERS: MapLayer[] = [
  { id: 'terrain', name: 'Terrain', url: 'https://civmc-map.duckdns.org/tiles/terrain/z{z}/{x},{y}.png', description: 'Current terrain map' },
  { id: 'biome', name: 'Biome', url: 'https://civmc-map.duckdns.org/tiles/biome/z{z}/{x},{y}.png', description: 'Biome classification' },
  { id: 'topo', name: 'Topographic', url: 'https://civmc-map.duckdns.org/tiles/topo/z{z}/{x},{y}.png', description: 'Elevation contours' },
  { id: 'sotw', name: 'Start of World', url: 'https://civmc-map.duckdns.org/tiles/sotw/z{z}/{x},{y}.png', description: 'Original untouched map' },
  { id: 'terrain_sdorr', name: 'Terrain (SDorr)', url: 'https://civmc-map.duckdns.org/tiles/terrain_sdorr/z{z}/{x},{y}.png', description: 'Alternative terrain render' },
];

// Overlay layers (lines, territories)
const OVERLAY_LAYERS: OverlayLayer[] = [
  { id: 'rails', name: 'Rails (VilyanZ)', icon: <Train className="w-3 h-3" />, description: 'Rail network' },
  { id: 'onedest_lines', name: 'OneDest Lines', icon: <Compass className="w-3 h-3" />, description: 'OneDest rail routes' },
  { id: 'territories', name: 'Territorial Map', icon: <MapIcon className="w-3 h-3" />, description: "TheJmqn's claim map" },
];

// Data source URLs
const DATA_SOURCES = {
  portals: 'https://civmc-map.github.io/portals.json',
  stations: 'https://raw.githubusercontent.com/Zalvvv/OneDest/main/OneDestStations.json',
  // Settlements needs CORS proxy - try without first, then with proxy
  settlements: 'https://map.civinfo.net/community/civmc/Settlements.json',
  settlementsCorsProxy: 'https://corsproxy.io/?url=https://map.civinfo.net/community/civmc/Settlements.json',
  rails: 'https://civmc-map.github.io/Rails_(VilyanZ).json',
  oneDestLines: 'https://raw.githubusercontent.com/Zalvvv/OneDest/main/OneDestLines.json',
  territories: 'https://civmc-map.github.io/territories-thejmqn.json',
};

// ============================================
// Utility Functions  
// ============================================

const getYLevelColor = (y: number): string => {
  const normalized = Math.max(0, Math.min(1, (y + 64) / 320));
  if (normalized < 0.25) return `hsl(${270 - normalized * 120}, 70%, 50%)`;
  if (normalized < 0.5) return `hsl(${210 - (normalized - 0.25) * 120}, 70%, 50%)`;
  if (normalized < 0.75) return `hsl(${150 - (normalized - 0.5) * 60}, 70%, 50%)`;
  return `hsl(${90 - (normalized - 0.75) * 60}, 70%, 50%)`;
};

function mcToLatLng(x: number, z: number): [number, number] {
  return [-z, x];
}

function latLngToMC(lat: number, lng: number): { x: number; z: number } {
  return { x: lng, z: -lat };
}

function getMarkerSize(zoom: number, isSelected: boolean, isLandmark: boolean): number {
  const baseSize = isLandmark ? 8 : 6;
  const selectedBonus = isSelected ? 4 : 0;
  const scale = Math.pow(1.3, zoom + 4);
  return Math.max(4, Math.round((baseSize + selectedBonus) * scale));
}

// Deduplicate markers by coordinates (within 50 blocks)
function deduplicateMarkers(markers: MapMarker[]): MapMarker[] {
  const result: MapMarker[] = [];
  const PROXIMITY_THRESHOLD = 50;
  const seenIds = new Set<string>();
  
  for (const marker of markers) {
    // Skip if we've already seen this ID
    if (seenIds.has(marker.id)) continue;
    
    const isDuplicate = result.some(existing => 
      Math.abs(existing.x - marker.x) < PROXIMITY_THRESHOLD &&
      Math.abs(existing.z - marker.z) < PROXIMITY_THRESHOLD
    );
    
    if (!isDuplicate) {
      seenIds.add(marker.id);
      result.push(marker);
    }
  }
  
  return result;
}

// ============================================
// Map Sub-Components
// ============================================

function MapTracker({ onMove, onClearFocus, onMapReady }: { 
  onMove: (x: number, z: number, zoom: number) => void;
  onClearFocus: () => void;
  onMapReady: (map: L.Map) => void;
}) {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      const mc = latLngToMC(center.lat, center.lng);
      onMove(mc.x, mc.z, map.getZoom());
    },
    zoomend: () => {
      const center = map.getCenter();
      const mc = latLngToMC(center.lat, center.lng);
      onMove(mc.x, mc.z, map.getZoom());
    },
    dragstart: () => {
      onClearFocus();
    },
    zoomstart: () => {
      onClearFocus();
    },
  });
  
  // Notify parent of map instance on mount
  useEffect(() => {
    onMapReady(map);
  }, [map, onMapReady]);
  
  return null;
}

// ============================================
// Main Component
// ============================================

export function MapView() {
  const navigate = useNavigate();
  const { shops, customItems } = useShopStore();
  
  // Persisted map state from store
  const {
    camera,
    zoom,
    selectedShop,
    activeLayer,
    activeOverlays,
    showShops,
    showPortals,
    showStations,
    showSettlements,
    setCamera,
    setZoom,
    setActiveLayer,
    toggleOverlay,
    setShowShops,
    setShowPortals,
    setShowStations,
    setShowSettlements,
    setSelectedShop,
  } = useMapStore();
  
  // Unified selection state - can be a shop ID or marker ID
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  
  // Cluster picker state - shows when clicking an area with multiple markers
  // Uses map coordinates (x, z) which are converted to screen position in render
  const [clusterPicker, setClusterPicker] = useState<{
    items: Array<{ id: string; name: string; type: 'shop' | 'marker'; color: string; subtitle?: string }>;
    mapX: number;
    mapZ: number;
  } | null>(null);
  
  // Map container ref for coordinate conversion
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  
  // Imported data (cached in component, reloaded on mount if needed)
  const [importedMarkers, setImportedMarkers] = useState<MapMarker[]>([]);
  const [railLines, setRailLines] = useState<RailLine[]>([]);
  const [oneDestLines, setOneDestLines] = useState<OneDestLine[]>([]);
  const [territoryImageUrl, setTerritoryImageUrl] = useState<string | null>(null);
  const [territoryBounds, setTerritoryBounds] = useState<LatLngBoundsExpression | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const dataLoadedRef = useRef(false);
  
  // Custom markers state (persisted in localStorage)
  const [customMarkers, setCustomMarkers] = useState<MapMarker[]>(() => {
    const saved = localStorage.getItem('civmc-custom-markers');
    if (!saved) return [];
    // Filter out invalid markers
    const parsed = JSON.parse(saved) as MapMarker[];
    return parsed.filter(m => m.name && m.id && !isNaN(m.x) && !isNaN(m.z));
  });
  const [newMarkerMode, setNewMarkerMode] = useState(false);
  const [newMarker, setNewMarker] = useState({ name: '', x: 0, z: 0, color: '#3b82f6', description: '' });
  
  // Save custom markers to localStorage
  useEffect(() => {
    localStorage.setItem('civmc-custom-markers', JSON.stringify(customMarkers));
  }, [customMarkers]);

  // Load external data
  const loadExternalData = useCallback(async () => {
    // Use ref to prevent double-loading in React Strict Mode
    if (dataLoadedRef.current || isLoadingData) return;
    dataLoadedRef.current = true;
    
    setIsLoadingData(true);
    const markers: MapMarker[] = [];
    
    try {
      // Helper to fetch with optional CORS proxy fallback
      const fetchWithFallback = async (url: string, proxyUrl?: string) => {
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return await res.json();
        } catch (e) {
          if (proxyUrl) {
            console.log(`Direct fetch failed for ${url}, trying CORS proxy...`);
            const proxyRes = await fetch(proxyUrl);
            if (!proxyRes.ok) throw new Error(`Proxy HTTP ${proxyRes.status}`);
            return await proxyRes.json();
          }
          throw e;
        }
      };
      
      // Fetch all point data in parallel
      // Note: Some sources may have CORS issues, we catch individually
      const [portalsRes, stationsRes, settlementsRes, railsRes, linesRes, terrRes] = await Promise.all([
        fetch(DATA_SOURCES.portals).then(r => r.json()).catch(e => { console.warn('Portals fetch failed:', e); return null; }),
        fetch(DATA_SOURCES.stations).then(r => r.json()).catch(e => { console.warn('Stations fetch failed:', e); return null; }),
        fetchWithFallback(DATA_SOURCES.settlements, DATA_SOURCES.settlementsCorsProxy).catch(e => { console.warn('Settlements fetch failed:', e); return null; }),
        fetch(DATA_SOURCES.rails).then(r => r.json()).catch(e => { console.warn('Rails fetch failed:', e); return null; }),
        fetch(DATA_SOURCES.oneDestLines).then(r => r.json()).catch(e => { console.warn('OneDest lines fetch failed:', e); return null; }),
        fetch(DATA_SOURCES.territories).then(r => r.json()).catch(e => { console.warn('Territories fetch failed:', e); return null; }),
      ]);
      
      console.log('Fetch results:', { portalsRes: !!portalsRes, stationsRes: !!stationsRes, settlementsRes: !!settlementsRes, railsRes: !!railsRes, linesRes: !!linesRes, terrRes: !!terrRes });
      
      // Process portals
      if (portalsRes?.features) {
        for (const p of portalsRes.features) {
          markers.push({
            id: `portal-${p.id}`,
            name: p.name?.replace(/\n/g, ' ') || 'Unknown Portal',
            description: `Portal - ${p.access || 'unknown'} access`,
            x: p.x,
            z: p.z,
            color: '#9333ea', // Purple for portals
            icon: '🌀',
            source: 'portal',
          });
        }
      }
      
      // Process OneDest stations
      if (stationsRes?.features) {
        for (const s of stationsRes.features) {
          // Skip invalid coordinates
          if (s.x > 15000 || s.z > 15000) continue;
          
          markers.push({
            id: `station-${s.id}`,
            name: s.name || 'Unknown Station',
            description: s.dest ? `OneDest: ${s.dest}` : 'OneDest Station',
            x: s.x,
            z: s.z,
            color: s.color || '#e83b3b',
            icon: '🚂',
            source: 'station',
          });
        }
      }
      
      // Process settlements
      if (settlementsRes?.features) {
        for (const s of settlementsRes.features) {
          markers.push({
            id: `settlement-${s.id}`,
            name: s.Name || 'Unknown Settlement',
            description: s.Nation ? `${s.Nation}${s.Notes ? ' - ' + s.Notes : ''}` : s.Notes,
            x: s.x,
            z: s.z,
            color: '#f59e0b', // Amber for settlements
            icon: '🏘️',
            source: 'settlement',
          });
        }
      }
      
      console.log('Markers collected:', { portals: markers.filter(m => m.source === 'portal').length, stations: markers.filter(m => m.source === 'station').length, settlements: markers.filter(m => m.source === 'settlement').length });
      
      // Filter out blank/invalid markers and deduplicate
      const validMarkers = markers.filter(m => 
        m.name && 
        m.name !== 'Unknown Portal' && 
        m.name !== 'Unknown Station' && 
        m.name !== 'Unknown Settlement' &&
        m.source &&
        !isNaN(m.x) && !isNaN(m.z)
      );
      const deduped = deduplicateMarkers(validMarkers);
      console.log('After filtering and deduplication:', deduped.length);
      setImportedMarkers(deduped);
      
      // Process rails - format: lines: [[[x1, z1], [x2, z2], ...]] (already paired coords)
      if (railsRes?.features) {
        const rails: RailLine[] = [];
        for (const r of railsRes.features) {
          if (!r.data?.lines) continue;
          
          // Each line is already an array of [x, z] coordinate pairs
          const parsedLines: [number, number][][] = r.data.lines.map((line: [number, number][]) =>
            line.map((coord: [number, number]) => [coord[0], coord[1]] as [number, number])
          );
          
          rails.push({
            id: r.id,
            name: r.data.name,
            color: r.data.color || '#c5c5c5',
            lines: parsedLines,
          });
        }
        console.log('Rails processed:', rails.length, 'with total lines:', rails.reduce((a, r) => a + r.lines.length, 0));
        if (rails.length > 0 && rails[0].lines.length > 0) {
          console.log('Sample rail coords:', rails[0].lines[0].slice(0, 3));
        }
        setRailLines(rails);
      }
      
      // Process OneDest lines - format: line: [[[x1, z1], [x2, z2], ...]] (nested coordinate pairs)
      if (linesRes?.features) {
        const lines: OneDestLine[] = [];
        for (const l of linesRes.features) {
          if (!l.line || !Array.isArray(l.line)) continue;
          
          // Each element in line is an array of [x, z] coordinate pairs
          const parsedLines: [number, number][][] = l.line.map((segment: [number, number][]) =>
            segment.map((coord: [number, number]) => [coord[0], coord[1]] as [number, number])
          );
          
          lines.push({
            id: l.id,
            color: l.color || '#ff00f3',
            line: parsedLines,
          });
        }
        console.log('OneDest lines processed:', lines.length, 'with total segments:', lines.reduce((a, l) => a + l.line.length, 0));
        setOneDestLines(lines);
      }
      
      // Process territory overlay
      if (terrRes?.features?.[0]?.map_image) {
        const img = terrRes.features[0].map_image;
        console.log('Territory image:', img.url, 'bounds:', img.bounds);
        setTerritoryImageUrl(img.url);
        // Bounds: [[minX, minZ], [maxX, maxZ]] -> convert to Leaflet lat/lng bounds
        const [[minX, minZ], [maxX, maxZ]] = img.bounds;
        // For CRS.Simple with our mcToLatLng: lat = -z, lng = x
        // So bounds should be [[latSouth, lngWest], [latNorth, lngEast]]
        // latSouth = -maxZ (most positive z becomes most negative lat)
        // latNorth = -minZ
        // lngWest = minX
        // lngEast = maxX
        const bounds: [[number, number], [number, number]] = [
          [-maxZ, minX],
          [-minZ, maxX],
        ];
        console.log('Converted bounds:', bounds);
        setTerritoryBounds(bounds);
      } else {
        console.warn('Territory data not found or malformed:', terrRes);
      }
      
      console.log('Data loading complete');
      setDataLoaded(true);
    } catch (error) {
      console.error('Failed to load external data:', error);
    } finally {
      console.log('Setting isLoadingData to false');
      setIsLoadingData(false);
    }
  }, [dataLoaded, isLoadingData]);

  // Load data on mount
  useEffect(() => {
    loadExternalData();
  }, [loadExternalData]);

  const activeShops = useMemo(() => shops.filter(s => s.isActive), [shops]);
  const selected = selectedShop ? shops.find(s => s.id === selectedShop) : null;
  
  // Convert map coordinates to screen position relative to map container
  const getScreenPosition = useCallback((x: number, z: number): { x: number; y: number } | null => {
    if (!mapInstance || !mapContainerRef.current) return null;
    
    const [lat, lng] = mcToLatLng(x, z);
    const point = mapInstance.latLngToContainerPoint([lat, lng]);
    return { x: point.x, y: point.y };
  }, [mapInstance]);
  
  const currentLayer = MAP_LAYERS.find(l => l.id === activeLayer) || MAP_LAYERS[0];
  
  // Filter visible imported markers by source
  const visibleImportedMarkers = useMemo(() => {
    return importedMarkers.filter(m => {
      if (m.source === 'portal') return showPortals;
      if (m.source === 'station') return showStations;
      if (m.source === 'settlement') return showSettlements;
      // Hide markers with unknown/missing source
      return false;
    });
  }, [importedMarkers, showPortals, showStations, showSettlements]);
  
  // All visible markers (custom + imported) - filter out any invalid markers
  const allVisibleMarkers = useMemo(() => {
    return [...customMarkers, ...visibleImportedMarkers].filter(m => 
      m.name && m.id && !isNaN(m.x) && !isNaN(m.z)
    );
  }, [customMarkers, visibleImportedMarkers]);

  // Get selected marker info for the custom popup
  const selectedMarkerInfo = useMemo(() => {
    if (!selectedMarkerId) return null;
    
    // Check if it's a shop
    const shop = activeShops.find(s => s.id === selectedMarkerId);
    if (shop) {
      return {
        id: shop.id,
        name: shop.name,
        x: shop.location.x,
        z: shop.location.z,
        y: shop.location.y,
        type: 'shop' as const,
        subtitle: `${shop.trades.length} trade${shop.trades.length !== 1 ? 's' : ''}`,
      };
    }
    
    // Check markers
    const marker = allVisibleMarkers.find(m => m.id === selectedMarkerId);
    if (marker) {
      return {
        id: marker.id,
        name: marker.name,
        x: marker.x,
        z: marker.z,
        icon: marker.icon,
        description: marker.description,
        type: 'marker' as const,
        subtitle: marker.source,
      };
    }
    
    return null;
  }, [selectedMarkerId, activeShops, allVisibleMarkers]);

  const handleReset = () => {
    setSelectedShop(null);
    setSelectedMarkerId(null);
    setClusterPicker(null);
    // Reset map view to default position (0, 0) at zoom -3
    if (mapInstance) {
      const defaultCenter = mcToLatLng(0, 0);
      const defaultZoom = -3;
      mapInstance.setView(defaultCenter, defaultZoom);
      setCamera({ x: 0, z: 0 });
      setZoom(defaultZoom);
    }
  };

  // Get cluster radius in blocks based on zoom level
  const getClusterRadius = useCallback((zoomLevel: number) => {
    // At zoom -5, ~80 blocks; at zoom 0, ~5 blocks
    return Math.max(5, 80 * Math.pow(0.6, zoomLevel + 5));
  }, []);

  // Find nearby items (both shops and markers) within cluster radius
  const findNearbyItems = useCallback((x: number, z: number) => {
    const radius = getClusterRadius(zoom);
    const items: Array<{ id: string; name: string; type: 'shop' | 'marker'; color: string; subtitle?: string }> = [];
    
    // Check shops
    for (const shop of activeShops) {
      const dx = shop.location.x - x;
      const dz = shop.location.z - z;
      if (Math.sqrt(dx * dx + dz * dz) <= radius) {
        items.push({
          id: shop.id,
          name: shop.name,
          type: 'shop',
          color: getYLevelColor(shop.location.y),
          subtitle: `${shop.trades.length} trade${shop.trades.length !== 1 ? 's' : ''}`
        });
      }
    }
    
    // Check other markers
    for (const marker of allVisibleMarkers) {
      const dx = marker.x - x;
      const dz = marker.z - z;
      if (Math.sqrt(dx * dx + dz * dz) <= radius) {
        items.push({
          id: marker.id,
          name: marker.name,
          type: 'marker',
          color: marker.color,
          subtitle: marker.source
        });
      }
    }
    
    return items;
  }, [zoom, activeShops, allVisibleMarkers, getClusterRadius]);

  // Handle click on a marker - check for nearby items first
  const handleMarkerClick = useCallback((
    clickedId: string, 
    x: number, 
    z: number, 
    isShop: boolean
  ) => {
    // Close any existing picker
    setClusterPicker(null);
    
    // If clicking the same marker, toggle off
    if (selectedMarkerId === clickedId) {
      setSelectedMarkerId(null);
      if (isShop) setSelectedShop(null);
      return;
    }
    
    // Find nearby items
    const nearby = findNearbyItems(x, z);
    
    // If only one item (the clicked one), select it directly
    if (nearby.length <= 1) {
      setSelectedMarkerId(clickedId);
      if (isShop) {
        setSelectedShop(clickedId);
      } else {
        setSelectedShop(null);
      }
      return;
    }
    
    // Multiple items nearby - show picker at map coordinates
    setSelectedMarkerId(null);
    setSelectedShop(null);
    setClusterPicker({
      items: nearby,
      mapX: x,
      mapZ: z
    });
  }, [selectedMarkerId, setSelectedShop, findNearbyItems]);

  // Handle selection from cluster picker
  const handleClusterSelect = useCallback((item: { id: string; type: 'shop' | 'marker' }) => {
    setClusterPicker(null);
    setSelectedMarkerId(item.id);
    if (item.type === 'shop') {
      setSelectedShop(item.id);
    } else {
      setSelectedShop(null);
    }
  }, [setSelectedShop]);
  
  // Handle popup close - clear selection
  const handlePopupClose = useCallback(() => {
    setSelectedMarkerId(null);
    setSelectedShop(null);
  }, [setSelectedShop]);

  const handleAddMarker = () => {
    if (!newMarker.name.trim()) return;
    
    const marker: MapMarker = {
      id: `custom-${Date.now()}`,
      name: newMarker.name.trim(),
      description: newMarker.description.trim() || undefined,
      x: newMarker.x,
      z: newMarker.z,
      color: newMarker.color,
      source: 'custom',
    };
    
    setCustomMarkers(prev => [...prev, marker]);
    setNewMarker({ name: '', x: 0, z: 0, color: '#3b82f6', description: '' });
    setNewMarkerMode(false);
  };
  
  const handleDeleteMarker = (id: string) => {
    setCustomMarkers(prev => prev.filter(m => m.id !== id));
  };

  // Use stored camera position for initial view
  const [initialLat, initialLng] = mcToLatLng(camera.x, camera.z);

  // Inject dark popup styles
  useEffect(() => {
    const styleId = 'leaflet-dark-popup-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = darkPopupStyle;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div className="flex gap-4 h-full">
      {/* Map container - left side */}
      <div ref={mapContainerRef} className="flex-1 bg-dark-400/50 backdrop-blur border border-white/5 rounded-2xl overflow-hidden relative" data-tutorial="map-container">
        <MapContainer
          center={[initialLat, initialLng]}
          zoom={zoom}
          minZoom={-5}
          maxZoom={0}
          crs={CRS.Simple}
          style={{ height: '100%', width: '100%', background: '#1a1a2e' }}
          zoomControl={false}
        >
          {/* Base tile layer */}
          <TileLayer
            key={currentLayer.id}
            url={currentLayer.url}
            minZoom={-5}
            maxZoom={0}
            tileSize={256}
            noWrap={true}
          />
          
          {/* Territory overlay */}
          {activeOverlays.has('territories') && territoryImageUrl && territoryBounds && (
            <ImageOverlay
              url={territoryImageUrl}
              bounds={territoryBounds}
              opacity={0.6}
            />
          )}
          
          {/* Rail lines overlay */}
          {activeOverlays.has('rails') && railLines.flatMap(rail => 
            rail.lines
              .filter(line => line.length >= 2 && line.every(([x, z]) => !isNaN(x) && !isNaN(z)))
              .map((line, i) => (
                <Polyline
                  key={`rail-${rail.id}-${i}`}
                  positions={line.map(([x, z]) => mcToLatLng(x, z))}
                  pathOptions={{ color: rail.color, weight: 2, opacity: 0.8 }}
                />
              ))
          )}
          
          {/* OneDest lines overlay */}
          {activeOverlays.has('onedest_lines') && oneDestLines.flatMap(line => 
            line.line
              .filter(segment => segment.length >= 2 && segment.every(([x, z]) => !isNaN(x) && !isNaN(z)))
              .map((segment, i) => (
                <Polyline
                  key={`onedest-${line.id}-${i}`}
                  positions={segment.map(([x, z]) => mcToLatLng(x, z))}
                  pathOptions={{ color: line.color, weight: 3, opacity: 0.9 }}
                />
              ))
          )}
          
          <MapTracker 
            onMove={(x, z, zm) => {
              setCamera({ x, z });
              setZoom(zm);
            }}
            onClearFocus={() => {
              setSelectedShop(null);
              setSelectedMarkerId(null);
              setClusterPicker(null);
            }}
            onMapReady={setMapInstance}
          />
          
          {/* Shop markers */}
          {showShops && activeShops.map((shop, index) => {
            const [lat, lng] = mcToLatLng(shop.location.x, shop.location.z);
            const color = getYLevelColor(shop.location.y);
            const isSelected = selectedMarkerId === shop.id;
            const size = getMarkerSize(zoom, isSelected, false);
            const isFirstMarker = index === 0;
            
            const icon = new DivIcon({
              className: '',
              html: `<div style="
                width: ${size}px;
                height: ${size}px;
                background: ${color};
                border: ${Math.max(1, size / 6)}px solid ${isSelected ? '#f1af15' : 'white'};
                border-radius: 50%;
                box-shadow: ${isSelected ? '0 0 8px 2px rgba(241, 175, 21, 0.5)' : '0 1px 3px rgba(0,0,0,0.4)'};
                transform: translate(-50%, -50%);
                cursor: pointer;
                transition: box-shadow 0.2s ease;
                ${isSelected ? 'z-index: 1000;' : ''}
              "${isFirstMarker ? ' data-tutorial="map-marker"' : ''}></div>`,
              iconSize: [0, 0],
              iconAnchor: [0, 0],
            });
            
            return (
              <Marker
                key={shop.id}
                position={[lat, lng]}
                icon={icon}
                eventHandlers={{
                  click: (e) => {
                    e.originalEvent?.stopPropagation();
                    handleMarkerClick(shop.id, shop.location.x, shop.location.z, true);
                  },
                }}
              />
            );
          })}
          
          {/* Imported + Custom markers */}
          {allVisibleMarkers.map((marker) => {
            const [lat, lng] = mcToLatLng(marker.x, marker.z);
            const isSelected = selectedMarkerId === marker.id;
            const size = getMarkerSize(zoom, isSelected, marker.source === 'settlement');
            
            const icon = new DivIcon({
              className: '',
              html: `<div style="
                width: ${size}px;
                height: ${size}px;
                background: ${marker.color};
                border: ${Math.max(1, size / 5)}px solid ${isSelected ? '#f1af15' : 'white'};
                border-radius: 50%;
                box-shadow: ${isSelected ? '0 0 8px 2px rgba(241, 175, 21, 0.5)' : '0 1px 4px rgba(0,0,0,0.5)'};
                transform: translate(-50%, -50%);
                cursor: pointer;
                transition: box-shadow 0.2s ease;
                ${isSelected ? 'z-index: 1000;' : ''}
              "></div>`,
              iconSize: [0, 0],
              iconAnchor: [0, 0],
            });
            
            return (
              <Marker
                key={marker.id}
                position={[lat, lng]}
                icon={icon}
                eventHandlers={{
                  click: (e) => {
                    e.originalEvent?.stopPropagation();
                    handleMarkerClick(marker.id, marker.x, marker.z, false);
                  },
                }}
              />
            );
          })}
        </MapContainer>
        
        {/* Map overlay info */}
        <div className="absolute bottom-4 left-4 flex gap-2">
          <div className="px-3 py-1.5 bg-dark-400/90 backdrop-blur rounded-lg text-xs text-gray-400 border border-white/5">
            {Math.round(camera.x)}, {Math.round(camera.z)} • z{zoom}
          </div>
          {activeOverlays.size > 0 && (
            <div className="px-3 py-1.5 bg-dark-400/90 backdrop-blur rounded-lg text-xs text-cw-blue-400 border border-white/5">
              +{activeOverlays.size} overlay{activeOverlays.size > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Cluster picker popup - positioned using map coordinates */}
        {clusterPicker && (() => {
          const pos = getScreenPosition(clusterPicker.mapX, clusterPicker.mapZ);
          if (!pos) return null;
          
          // Calculate popup position - below the marker, clamped to container
          const containerRect = mapContainerRef.current?.getBoundingClientRect();
          const popupWidth = 208; // w-52 = 13rem = 208px
          const popupHeight = Math.min(clusterPicker.items.length * 36 + 40, 200);
          
          let left = pos.x - popupWidth / 2;
          let top = pos.y + 15;
          
          // Clamp to container bounds
          if (containerRect) {
            left = Math.max(8, Math.min(left, containerRect.width - popupWidth - 8));
            top = Math.max(8, Math.min(top, containerRect.height - popupHeight - 8));
          }
          
          // Determine if popup should be above or below the marker
          const showAbove = containerRect && pos.y + popupHeight + 20 > containerRect.height;
          if (showAbove) {
            top = pos.y - popupHeight - 15;
          }
          
          // Calculate arrow position (always points to the marker)
          const arrowLeft = pos.x - left;
          
          return (
            <>
              {/* Backdrop to close on click outside */}
              <div 
                className="absolute inset-0 z-[1999]"
                onClick={() => setClusterPicker(null)}
              />
              <div 
                className="absolute z-[2000] pointer-events-auto"
                style={{ left: `${left}px`, top: `${top}px` }}
              >
                {/* Arrow pointing to the marker */}
                <div 
                  className={`absolute w-0 h-0 ${showAbove ? '-bottom-2' : '-top-2'}`}
                  style={{
                    left: `${Math.max(12, Math.min(arrowLeft, popupWidth - 12))}px`,
                    transform: 'translateX(-50%)',
                    borderLeft: '8px solid transparent',
                    borderRight: '8px solid transparent',
                    ...(showAbove 
                      ? { borderTop: '8px solid rgba(30, 30, 45, 0.95)' }
                      : { borderBottom: '8px solid rgba(30, 30, 45, 0.95)' }
                    ),
                  }}
                />
                <div className="bg-dark-400/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-2 w-52">
                  <div className="text-[10px] text-gray-500 px-2 py-1 mb-1">
                    {clusterPicker.items.length} items at this location
                  </div>
                  <div className="space-y-0.5 max-h-48 overflow-y-auto">
                    {clusterPicker.items.map(item => (
                      <button
                        key={item.id}
                        onClick={() => handleClusterSelect(item)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-white/10 rounded-lg transition-colors text-left group"
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white/20"
                          style={{ backgroundColor: item.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-white truncate">{item.name}</div>
                          {item.subtitle && (
                            <div className="text-[10px] text-gray-500 capitalize">{item.subtitle}</div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          );
        })()}
        
        {/* Selected marker popup - positioned using map coordinates */}
        {selectedMarkerInfo && !clusterPicker && (() => {
          const pos = getScreenPosition(selectedMarkerInfo.x, selectedMarkerInfo.z);
          if (!pos) return null;
          
          const containerRect = mapContainerRef.current?.getBoundingClientRect();
          const popupWidth = 200;
          const popupHeight = 120; // max-h-[120px]
          
          let left = pos.x - popupWidth / 2;
          let top = pos.y + 15;
          
          if (containerRect) {
            left = Math.max(8, Math.min(left, containerRect.width - popupWidth - 8));
          }
          
          const showAbove = containerRect && pos.y + popupHeight + 20 > containerRect.height;
          if (showAbove) {
            top = pos.y - popupHeight - 15;
          }
          
          const arrowLeft = pos.x - left;
          
          return (
            <div 
              className="absolute z-[1500] pointer-events-auto"
              style={{ left: `${left}px`, top: `${top}px` }}
            >
              {/* Arrow */}
              <div 
                className={`absolute w-0 h-0 ${showAbove ? '-bottom-2' : '-top-2'}`}
                style={{
                  left: `${Math.max(12, Math.min(arrowLeft, popupWidth - 12))}px`,
                  transform: 'translateX(-50%)',
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  ...(showAbove 
                    ? { borderTop: '8px solid rgba(30, 30, 45, 0.95)' }
                    : { borderBottom: '8px solid rgba(30, 30, 45, 0.95)' }
                  ),
                }}
              />
              <div className="bg-dark-400/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-3 w-[200px] max-h-[120px] overflow-y-auto">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">
                      {selectedMarkerInfo.icon && <span>{selectedMarkerInfo.icon} </span>}
                      {selectedMarkerInfo.name}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {selectedMarkerInfo.x}, {selectedMarkerInfo.y ?? selectedMarkerInfo.z}
                      {selectedMarkerInfo.y !== undefined && `, ${selectedMarkerInfo.z}`}
                    </div>
                    {selectedMarkerInfo.description && (
                      <div className="text-[10px] text-gray-500 mt-1">
                        {selectedMarkerInfo.description}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handlePopupClose}
                    className="p-1 hover:bg-white/10 rounded transition-colors flex-shrink-0"
                  >
                    <X className="w-3 h-3 text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Control sidebar - right side */}
      <div className="w-72 flex flex-col gap-3 shrink-0 overflow-y-auto">
        {/* Navigation */}
        <div className="bg-dark-400/50 backdrop-blur border border-white/5 rounded-xl p-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/app')}
              className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
              title="Back to Shops"
            >
              <Home className="w-4 h-4 text-gray-400" />
            </button>
            <button 
              onClick={handleReset}
              className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
              title="Reset View"
            >
              <Maximize2 className="w-4 h-4 text-gray-400" />
            </button>
            <div className="flex-1 text-right">
              <span className="text-xs text-gray-500">{activeShops.length} shops</span>
            </div>
          </div>
        </div>

        {/* Base Layer */}
        <div className="bg-dark-400/50 backdrop-blur border border-white/5 rounded-xl p-3">
          <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Base Layer</h4>
          <div className="grid grid-cols-2 gap-1">
            {MAP_LAYERS.map(layer => (
              <button
                key={layer.id}
                onClick={() => setActiveLayer(layer.id)}
                className={`text-left px-2 py-1.5 rounded-lg transition-colors text-xs ${
                  activeLayer === layer.id 
                    ? 'bg-cw-gold-500/20 text-cw-gold-400' 
                    : 'hover:bg-white/5 text-gray-400'
                }`}
              >
                {layer.name}
              </button>
            ))}
          </div>
        </div>

        {/* Overlays */}
        <div className="bg-dark-400/50 backdrop-blur border border-white/5 rounded-xl p-3">
          <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Overlays</h4>
          <div className="space-y-1">
            {OVERLAY_LAYERS.map(layer => (
              <button
                key={layer.id}
                onClick={() => toggleOverlay(layer.id)}
                className={`w-full text-left px-2 py-1.5 rounded-lg transition-colors flex items-center gap-2 text-xs ${
                  activeOverlays.has(layer.id)
                    ? 'bg-cw-blue-500/20 text-cw-blue-400' 
                    : 'hover:bg-white/5 text-gray-400'
                }`}
              >
                {layer.icon}
                <span className="flex-1">{layer.name}</span>
                {activeOverlays.has(layer.id) ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 opacity-40" />}
              </button>
            ))}
          </div>
        </div>

        {/* Point Data */}
        <div className="bg-dark-400/50 backdrop-blur border border-white/5 rounded-xl p-3">
          <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
            Points {isLoadingData && <RefreshCw className="w-3 h-3 inline animate-spin ml-1" />}
          </h4>
          <div className="space-y-1">
            <button
              onClick={() => setShowShops(!showShops)}
              className={`w-full text-left px-2 py-1.5 rounded-lg transition-colors flex items-center gap-2 text-xs ${
                showShops ? 'bg-cw-gold-500/20 text-cw-gold-400' : 'hover:bg-white/5 text-gray-400'
              }`}
            >
              <span>🏪</span>
              <span className="flex-1">Shops</span>
              <span className="text-[10px] opacity-60">{activeShops.length}</span>
            </button>
            <button
              onClick={() => setShowPortals(!showPortals)}
              className={`w-full text-left px-2 py-1.5 rounded-lg transition-colors flex items-center gap-2 text-xs ${
                showPortals ? 'bg-purple-500/20 text-purple-400' : 'hover:bg-white/5 text-gray-400'
              }`}
            >
              <span>🌀</span>
              <span className="flex-1">Portals</span>
              <span className="text-[10px] opacity-60">{importedMarkers.filter(m => m.source === 'portal').length}</span>
            </button>
            <button
              onClick={() => setShowStations(!showStations)}
              className={`w-full text-left px-2 py-1.5 rounded-lg transition-colors flex items-center gap-2 text-xs ${
                showStations ? 'bg-red-500/20 text-red-400' : 'hover:bg-white/5 text-gray-400'
              }`}
            >
              <span>🚂</span>
              <span className="flex-1">OneDest Stations</span>
              <span className="text-[10px] opacity-60">{importedMarkers.filter(m => m.source === 'station').length}</span>
            </button>
            <button
              onClick={() => setShowSettlements(!showSettlements)}
              className={`w-full text-left px-2 py-1.5 rounded-lg transition-colors flex items-center gap-2 text-xs ${
                showSettlements ? 'bg-amber-500/20 text-amber-400' : 'hover:bg-white/5 text-gray-400'
              }`}
            >
              <span>🏘️</span>
              <span className="flex-1">Settlements</span>
              <span className="text-[10px] opacity-60">{importedMarkers.filter(m => m.source === 'settlement').length}</span>
            </button>
          </div>
        </div>

        {/* My Markers */}
        <div className="bg-dark-400/50 backdrop-blur border border-white/5 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">My Markers</h4>
            <button
              onClick={() => setNewMarkerMode(!newMarkerMode)}
              className={`p-1 rounded transition-colors ${newMarkerMode ? 'bg-red-500/20 text-red-400' : 'hover:bg-white/10 text-gray-400'}`}
            >
              {newMarkerMode ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            </button>
          </div>
          
          {/* Add marker form */}
          {newMarkerMode && (
            <div className="mb-2 p-2 bg-dark-300/50 rounded-lg space-y-2">
              <input
                type="text"
                placeholder="Name"
                value={newMarker.name}
                onChange={e => setNewMarker(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-dark-300 text-white text-xs rounded px-2 py-1.5 border border-white/10"
              />
              <div className="flex gap-1">
                <input
                  type="number"
                  placeholder="X"
                  value={newMarker.x}
                  onChange={e => setNewMarker(prev => ({ ...prev, x: parseInt(e.target.value) || 0 }))}
                  className="flex-1 bg-dark-300 text-white text-xs rounded px-2 py-1.5 border border-white/10 w-0"
                />
                <input
                  type="number"
                  placeholder="Z"
                  value={newMarker.z}
                  onChange={e => setNewMarker(prev => ({ ...prev, z: parseInt(e.target.value) || 0 }))}
                  className="flex-1 bg-dark-300 text-white text-xs rounded px-2 py-1.5 border border-white/10 w-0"
                />
                <input
                  type="color"
                  value={newMarker.color}
                  onChange={e => setNewMarker(prev => ({ ...prev, color: e.target.value }))}
                  className="w-8 h-7 rounded border border-white/10 cursor-pointer"
                />
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setNewMarker(prev => ({ ...prev, x: Math.round(camera.x), z: Math.round(camera.z) }))}
                  className="flex-1 text-[10px] text-cw-blue-400 hover:bg-cw-blue-500/10 rounded py-1"
                >
                  Use current pos
                </button>
                <button
                  onClick={handleAddMarker}
                  disabled={!newMarker.name.trim()}
                  className="px-2 py-1 bg-cw-gold-500/20 text-cw-gold-400 rounded text-xs disabled:opacity-50"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
          
          {/* Marker list */}
          <div className="space-y-0.5 max-h-32 overflow-y-auto">
            {customMarkers.length === 0 ? (
              <p className="text-gray-500 text-[10px] text-center py-2">No markers yet</p>
            ) : (
              customMarkers.map(marker => (
                <div
                  key={marker.id}
                  className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/5 group"
                >
                  <div 
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: marker.color }}
                  />
                  <button
                    onClick={() => handleClusterSelect({ id: marker.id, type: 'marker' })}
                    className="flex-1 text-left text-xs text-gray-300 truncate"
                  >
                    {marker.name}
                  </button>
                  <button
                    onClick={() => handleDeleteMarker(marker.id)}
                    className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded transition-all"
                  >
                    <Trash2 className="w-2.5 h-2.5 text-red-400" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Selected shop panel */}
        {selected && (
          <div className="bg-dark-400/50 backdrop-blur border border-cw-gold-500/30 rounded-xl p-3" data-tutorial="map-popup">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm font-semibold text-white leading-tight">{selected.name}</h3>
              <button 
                onClick={() => setSelectedShop(null)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <X className="w-3 h-3 text-gray-400" />
              </button>
            </div>
            
            {selected.description && (
              <p className="text-xs text-gray-400 mb-2">{selected.description}</p>
            )}

            <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
              <Navigation className="w-3 h-3 text-cw-gold-400" />
              {selected.location.x}, {selected.location.y}, {selected.location.z}
            </div>
            
            {selected.owner && (
              <div className="flex items-center gap-2 text-xs mb-3">
                <User className="w-3 h-3 text-cw-blue-400" />
                {selected.owner.player && (
                  <PlayerHead ign={selected.owner.player.ign} size="sm" />
                )}
                {selected.owner.group && (
                  <span className="text-gray-300">{selected.owner.group.name}</span>
                )}
              </div>
            )}

            {selected.trades && selected.trades.length > 0 && (
              <div className="mb-3">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                  Trades ({selected.trades.filter(t => t.isActive).length})
                </div>
                <div className="space-y-1 max-h-28 overflow-y-auto">
                  {selected.trades.filter(t => t.isActive).slice(0, 5).map((trade) => {
                    const outputQty = typeof trade.output.quantity === 'number' 
                      ? trade.output.quantity 
                      : trade.output.quantity?.amount ?? 1;
                    const inputQty = typeof trade.input.quantity === 'number'
                      ? trade.input.quantity
                      : trade.input.quantity?.amount ?? 1;
                      
                    return (
                      <div key={trade.id} className="flex items-center gap-1.5 p-1.5 bg-dark-300/50 rounded">
                        <MinecraftItem itemId={trade.output.itemId} size="sm" />
                        <span className="text-[10px] text-gray-400">×{outputQty}</span>
                        <ArrowRight className="w-2.5 h-2.5 text-gray-500" />
                        <span className="text-[10px] text-cw-gold-400">{inputQty} {getItemDisplayName(trade.input.itemId, customItems).slice(0, 12)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button 
              onClick={() => navigate(`/app/shop/${selected.id}`, { state: { from: 'map' } })}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-cw-gold-500/20 hover:bg-cw-gold-500/30 text-cw-gold-400 rounded-lg transition-colors text-xs"
              data-tutorial="view-details-btn"
            >
              View Details <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
