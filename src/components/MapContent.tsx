import { useState, useCallback, useEffect, useRef } from "react";
import { ZoomIn, ZoomOut, Maximize2, Play, Pause } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Types and utilities
import { FilterType, MAP_CONFIG } from "@/types/map";
import { mapIcons, IconType } from "@/utils/mapIcons";
import { formatDateTime } from "@/utils/dateUtils";

// Custom hooks
import { useMapData } from "@/hooks/useMapData";
import { useGpsHistory } from "@/hooks/useGpsHistory";

// Map components (non-leaflet)
import { MapLegend } from "@/components/map/MapLegend";
import { MapStatistics } from "@/components/map/MapStatistics";
import { MapLoadingOverlay } from "@/components/map/MapLoadingOverlay";
import { MapHeader } from "@/components/map/MapHeader";
import { MapFilters } from "@/components/map/MapFilters";
import { GpsHistorySettings } from "@/components/map/GpsHistorySettings";
import { Button } from "@/components/ui/button";

// Animate marker to new position
const animateMarker = (marker: L.Marker, targetLat: number, targetLng: number, duration: number = 1000) => {
  const startPos = marker.getLatLng();
  const startTime = performance.now();
  
  const animate = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing function (ease-out-cubic)
    const eased = 1 - Math.pow(1 - progress, 3);
    
    const newLat = startPos.lat + (targetLat - startPos.lat) * eased;
    const newLng = startPos.lng + (targetLng - startPos.lng) * eased;
    
    marker.setLatLng([newLat, newLng]);
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };
  
  requestAnimationFrame(animate);
};

const MapContent = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const trailsRef = useRef<Map<string, L.Polyline>>(new Map());
  const [filter, setFilter] = useState<FilterType>('all');
  const [isLiveTracking, setIsLiveTracking] = useState(true);
  const [hasInitialFit, setHasInitialFit] = useState(false);
  const [showTrails, setShowTrails] = useState(true);
  const [sensorRetentionMinutes, setSensorRetentionMinutes] = useState(60);
  const [clientRetentionMinutes, setClientRetentionMinutes] = useState(60);
  
  const {
    sensorMarkers,
    clientMarkers,
    allPositions,
    stats,
    isLoading,
    timeAgo,
    handleRefresh,
  } = useMapData();

  // GPS history tracking
  const { trails, clearHistory } = useGpsHistory(
    sensorMarkers,
    clientMarkers,
    { sensorRetentionMinutes, clientRetentionMinutes }
  );

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

    mapRef.current = map;

    // Force resize after mount
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      trailsRef.current.clear();
    };
  }, []);

  // Update markers with animations
  useEffect(() => {
    if (!mapRef.current) return;

    const existingMarkerIds = new Set<string>();

    // Update/add sensor markers
    sensorMarkers.forEach((sensor) => {
      const sensorType = sensor.type.toLowerCase();
      if (filter !== 'all' && sensorType !== filter) return;

      const markerId = `sensor-${sensor.id}`;
      existingMarkerIds.add(markerId);
      
      const icon = mapIcons[sensorType as IconType] || mapIcons.gps;
      
      const popupContent = `
        <div class="p-2 min-w-[180px]">
          <div class="font-bold mb-2">${sensor.name}</div>
          <div class="text-sm space-y-1">
            <div><span class="text-gray-500">Type:</span> ${sensor.type}</div>
            <div><span class="text-gray-500">Value:</span> ${sensor.value} ${sensor.unit}</div>
            <div><span class="text-gray-500">Status:</span> ${sensor.status}</div>
            <div><span class="text-gray-500">Updated:</span> ${formatDateTime(sensor.lastUpdate)}</div>
          </div>
        </div>
      `;

      const existingMarker = markersRef.current.get(markerId);
      
      if (existingMarker) {
        animateMarker(existingMarker, sensor.location.lat, sensor.location.lng);
        existingMarker.setPopupContent(popupContent);
      } else {
        const marker = L.marker([sensor.location.lat, sensor.location.lng], { 
          icon,
          opacity: 0 
        })
          .bindPopup(popupContent)
          .addTo(mapRef.current!);
        
        let opacity = 0;
        const fadeIn = () => {
          opacity += 0.1;
          marker.setOpacity(Math.min(opacity, 1));
          if (opacity < 1) requestAnimationFrame(fadeIn);
        };
        requestAnimationFrame(fadeIn);
        
        markersRef.current.set(markerId, marker);
      }
    });

    // Update/add client markers
    if (filter === 'all' || filter === 'clients') {
      clientMarkers.forEach((client) => {
        const markerId = `client-${client.client_id}`;
        existingMarkerIds.add(markerId);
        
        const popupContent = `
          <div class="p-2 min-w-[180px]">
            <div class="font-bold mb-2">${client.hostname}</div>
            <div class="text-sm space-y-1">
              <div><span class="text-gray-500">Client ID:</span> ${client.client_id.substring(0, 8)}...</div>
              <div><span class="text-gray-500">Type:</span> Client Device</div>
            </div>
          </div>
        `;

        const existingMarker = markersRef.current.get(markerId);
        
        if (existingMarker) {
          animateMarker(existingMarker, client.location.lat, client.location.lng);
          existingMarker.setPopupContent(popupContent);
        } else {
          const marker = L.marker([client.location.lat, client.location.lng], { 
            icon: mapIcons.client,
            opacity: 0 
          })
            .bindPopup(popupContent)
            .addTo(mapRef.current!);
          
          let opacity = 0;
          const fadeIn = () => {
            opacity += 0.1;
            marker.setOpacity(Math.min(opacity, 1));
            if (opacity < 1) requestAnimationFrame(fadeIn);
          };
          requestAnimationFrame(fadeIn);
          
          markersRef.current.set(markerId, marker);
        }
      });
    }

    // Remove markers that no longer exist with fade-out animation
    markersRef.current.forEach((marker, id) => {
      if (!existingMarkerIds.has(id)) {
        let opacity = 1;
        const fadeOut = () => {
          opacity -= 0.1;
          marker.setOpacity(Math.max(opacity, 0));
          if (opacity > 0) {
            requestAnimationFrame(fadeOut);
          } else {
            marker.remove();
            markersRef.current.delete(id);
          }
        };
        requestAnimationFrame(fadeOut);
      }
    });

    // Initial fit bounds (only once)
    if (!hasInitialFit && allPositions.length > 0 && mapRef.current) {
      const bounds = L.latLngBounds(allPositions);
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      setHasInitialFit(true);
    }
  }, [sensorMarkers, clientMarkers, filter, allPositions, hasInitialFit]);

  // Update trail polylines
  useEffect(() => {
    if (!mapRef.current) return;

    const trailColors = {
      sensor: '#22c55e',   // green
      client: '#3b82f6',   // blue
    };

    // Remove trails that are no longer visible or if trails are disabled
    if (!showTrails) {
      trailsRef.current.forEach(polyline => polyline.remove());
      trailsRef.current.clear();
      return;
    }

    const activeTrailIds = new Set(trails.map(t => t.id));

    // Remove old trails
    trailsRef.current.forEach((polyline, id) => {
      if (!activeTrailIds.has(id)) {
        polyline.remove();
        trailsRef.current.delete(id);
      }
    });

    // Update or add trails
    trails.forEach(trail => {
      // Filter based on current filter
      const shouldShow = filter === 'all' || 
        (filter === 'clients' && trail.type === 'client') ||
        (trail.type === 'sensor');

      if (!shouldShow) {
        const existing = trailsRef.current.get(trail.id);
        if (existing) {
          existing.remove();
          trailsRef.current.delete(trail.id);
        }
        return;
      }

      const existing = trailsRef.current.get(trail.id);
      const color = trailColors[trail.type];

      if (existing) {
        existing.setLatLngs(trail.coordinates);
      } else {
        const polyline = L.polyline(trail.coordinates, {
          color,
          weight: 2,
          opacity: 0.7,
          dashArray: '5, 5',
        }).addTo(mapRef.current!);

        polyline.bindTooltip(trail.name, { permanent: false, direction: 'top' });
        trailsRef.current.set(trail.id, polyline);
      }
    });
  }, [trails, showTrails, filter]);

  // Auto-refresh for live tracking
  useEffect(() => {
    if (!isLiveTracking) return;
    
    const interval = setInterval(() => {
      handleRefresh();
    }, MAP_CONFIG.autoRefreshInterval);
    
    return () => clearInterval(interval);
  }, [isLiveTracking, handleRefresh]);

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
    if (allPositions.length > 0 && mapRef.current) {
      const bounds = L.latLngBounds(allPositions);
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    } else {
      mapRef.current?.setView(MAP_CONFIG.defaultCenter, MAP_CONFIG.defaultZoom);
    }
  }, [allPositions]);

  const toggleLiveTracking = useCallback(() => {
    setIsLiveTracking(prev => !prev);
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
        <div className="flex items-center justify-between gap-4">
          <MapFilters 
            filter={filter}
            stats={stats}
            onFilterChange={handleFilterChange}
          />
          <GpsHistorySettings
            sensorRetentionMinutes={sensorRetentionMinutes}
            clientRetentionMinutes={clientRetentionMinutes}
            onSensorRetentionChange={setSensorRetentionMinutes}
            onClientRetentionChange={setClientRetentionMinutes}
            showTrails={showTrails}
            onShowTrailsChange={setShowTrails}
            trailCount={trails.length}
            onClearHistory={clearHistory}
          />
        </div>
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
          <Button 
            variant={isLiveTracking ? "default" : "outline"}
            size="icon"
            className={isLiveTracking 
              ? "bg-primary hover:bg-primary/90" 
              : "bg-card/90 backdrop-blur border-border/50 hover:bg-card"
            }
            onClick={toggleLiveTracking}
            title={isLiveTracking ? "Pause live tracking" : "Resume live tracking"}
          >
            {isLiveTracking ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
        </div>

        {/* Live indicator */}
        {isLiveTracking && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/90 backdrop-blur border border-border/50">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium">LIVE</span>
          </div>
        )}

        <MapLegend />
        <MapStatistics stats={stats} />
        <MapLoadingOverlay isLoading={isLoading} />
      </div>
    </div>
  );
};

export default MapContent;
