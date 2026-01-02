import { useState, useCallback, useEffect, useRef } from "react";
import { ZoomIn, ZoomOut, Maximize2, RefreshCw } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Types and utilities
import { FilterType, MAP_CONFIG } from "@/types/map";
import { mapIcons, IconType } from "@/utils/mapIcons";

// Custom hook for map data
import { useMapData } from "@/hooks/useMapData";

// Map components (non-leaflet)
import { MapLegend } from "@/components/map/MapLegend";
import { MapStatistics } from "@/components/map/MapStatistics";
import { MapLoadingOverlay } from "@/components/map/MapLoadingOverlay";
import { MapHeader } from "@/components/map/MapHeader";
import { MapFilters } from "@/components/map/MapFilters";
import { Button } from "@/components/ui/button";

const MapContent = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  
  const {
    aircraftMarkers,
    sensorMarkers,
    allPositions,
    stats,
    isLoading,
    timeAgo,
    handleRefresh,
  } = useMapData();

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: MAP_CONFIG.defaultCenter,
      zoom: MAP_CONFIG.defaultZoom,
      zoomControl: false,
    });

    L.tileLayer(MAP_CONFIG.tileUrl, {
      attribution: MAP_CONFIG.attribution,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Force resize after mount
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  // Update markers when data or filter changes
  useEffect(() => {
    if (!markersLayerRef.current) return;

    // Clear existing markers
    markersLayerRef.current.clearLayers();

    const showAircraft = filter === 'all' || filter === 'adsb';

    // Add aircraft markers
    if (showAircraft) {
      aircraftMarkers.forEach((ac) => {
        const popupContent = `
          <div class="p-2 min-w-[200px]">
            <div class="font-bold text-lg mb-2">${ac.flight?.trim() || ac.hex}</div>
            <div class="text-sm space-y-1">
              <div><span class="text-gray-500">Hex:</span> ${ac.hex}</div>
              <div><span class="text-gray-500">Altitude:</span> ${ac.alt_baro?.toLocaleString() || '—'} ft</div>
              <div><span class="text-gray-500">Speed:</span> ${ac.gs?.toFixed(0) || '—'} kts</div>
              <div><span class="text-gray-500">Track:</span> ${ac.track?.toFixed(0) || '—'}°</div>
            </div>
          </div>
        `;
        L.marker([ac.lat, ac.lon], { icon: mapIcons.adsb })
          .bindPopup(popupContent)
          .addTo(markersLayerRef.current!);
      });
    }

    // Add sensor markers based on filter
    sensorMarkers.forEach((sensor) => {
      const sensorType = sensor.type.toLowerCase();
      if (filter !== 'all' && sensorType !== filter) return;

      const icon = mapIcons[sensorType as IconType] || mapIcons.gps;
      const statusClass = sensor.status === 'active' ? 'text-green-500' : 'text-yellow-500';
      
      const popupContent = `
        <div class="p-2 min-w-[180px]">
          <div class="font-bold mb-2">${sensor.name}</div>
          <div class="text-sm space-y-1">
            <div><span class="text-gray-500">Type:</span> ${sensor.type}</div>
            <div><span class="text-gray-500">Value:</span> ${sensor.value} ${sensor.unit}</div>
            <div><span class="text-gray-500">Status:</span> <span class="${statusClass}">${sensor.status}</span></div>
          </div>
        </div>
      `;
      L.marker([sensor.location.lat, sensor.location.lng], { icon })
        .bindPopup(popupContent)
        .addTo(markersLayerRef.current!);
    });

    // Fit bounds if we have positions
    if (allPositions.length > 0 && mapRef.current) {
      const bounds = L.latLngBounds(allPositions);
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [aircraftMarkers, sensorMarkers, filter, allPositions]);

  const handleFilterChange = useCallback((newFilter: FilterType) => {
    setFilter(newFilter);
  }, []);

  const handleZoomIn = useCallback(() => {
    mapRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    mapRef.current?.zoomOut();
  }, []);

  const handleRecenter = useCallback(() => {
    mapRef.current?.setView(MAP_CONFIG.defaultCenter, MAP_CONFIG.defaultZoom);
  }, []);

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-border/50 shrink-0">
        <MapHeader 
          stats={stats}
          timeAgo={timeAgo}
          isLoading={isLoading}
          onRefresh={handleRefresh}
        />
        <MapFilters 
          filter={filter}
          stats={stats}
          onFilterChange={handleFilterChange}
        />
      </div>

      {/* Map Container */}
      <div className="flex-1 relative min-h-0">
        <div 
          ref={mapContainerRef} 
          className="absolute inset-0"
          style={{ background: MAP_CONFIG.backgroundColor }}
        />

        {/* Map Controls */}
        <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
          <Button 
            variant="outline" 
            size="icon"
            className="bg-card/90 backdrop-blur border-border/50 hover:bg-card"
            onClick={handleZoomIn}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            className="bg-card/90 backdrop-blur border-border/50 hover:bg-card"
            onClick={handleZoomOut}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            className="bg-card/90 backdrop-blur border-border/50 hover:bg-card"
            onClick={handleRecenter}
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>

        <MapLegend />
        <MapStatistics stats={stats} />
        <MapLoadingOverlay isLoading={isLoading} />
      </div>
    </div>
  );
};

export default MapContent;