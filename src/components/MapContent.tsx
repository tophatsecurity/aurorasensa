import { useState, useCallback, useEffect, useRef } from "react";
import { ZoomIn, ZoomOut, Maximize2, Play, Pause, Route, X } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Types and utilities
import { FilterType, MAP_CONFIG, AdsbMarker } from "@/types/map";
import { mapIcons, IconType, createAircraftIcon, getAircraftType, getAircraftColor } from "@/utils/mapIcons";
import { formatDateTime } from "@/utils/dateUtils";

// Custom hooks
import { useMapData, AircraftTrailData } from "@/hooks/useMapData";
import { useGpsHistory } from "@/hooks/useGpsHistory";
import { useAdsbHistory, AircraftTrail } from "@/hooks/useAdsbHistory";

// Map components (non-leaflet)
import { MapLegend } from "@/components/map/MapLegend";
import { MapStatistics } from "@/components/map/MapStatistics";
import { MapLoadingOverlay } from "@/components/map/MapLoadingOverlay";
import { MapHeader } from "@/components/map/MapHeader";
import { MapFilters } from "@/components/map/MapFilters";
import { GpsHistorySettings } from "@/components/map/GpsHistorySettings";
import { TimeframeSelector, TimeframeOption, timeframeToMinutes } from "@/components/map/TimeframeSelector";
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
  const adsbTrailsRef = useRef<Map<string, L.Polyline>>(new Map());
  const [filter, setFilter] = useState<FilterType>('all');
  const [isLiveTracking, setIsLiveTracking] = useState(true);
  const [hasInitialFit, setHasInitialFit] = useState(false);
  const [showTrails, setShowTrails] = useState(true);
  const [showAdsbTrails, setShowAdsbTrails] = useState(true);
  const [timeframe, setTimeframe] = useState<TimeframeOption>("1h");
  const [sensorRetentionMinutes, setSensorRetentionMinutes] = useState(60);
  const [clientRetentionMinutes, setClientRetentionMinutes] = useState(60);
  
  const {
    sensorMarkers,
    clientMarkers,
    adsbMarkers,
    adsbTrails,
    allPositions,
    stats,
    isLoading,
    timeAgo,
    handleRefresh,
    adsbIsHistorical,
    adsbSource,
  } = useMapData({ adsbHistoryMinutes: timeframeToMinutes(timeframe) });

  // GPS history tracking
  const { trails, clearHistory } = useGpsHistory(
    sensorMarkers,
    clientMarkers,
    { sensorRetentionMinutes, clientRetentionMinutes }
  );

  // ADS-B aircraft history trails
  const {
    activeTrails: adsbActiveTrails,
    isLoading: adsbHistoryLoading,
    toggleAircraftTrail,
    addTrailFromData,
    clearTrail: clearAdsbTrail,
    clearAllTrails: clearAllAdsbTrails,
    historyData,
  } = useAdsbHistory();

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
      adsbTrailsRef.current.clear();
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

    // Update/add ADS-B aircraft markers
    if (filter === 'all' || filter === 'adsb') {
      adsbMarkers.forEach((aircraft: AdsbMarker) => {
        const markerId = `adsb-${aircraft.id}`;
        existingMarkerIds.add(markerId);
        
        // Format heading with compass direction
        const getHeadingDirection = (track?: number) => {
          if (track === undefined) return '';
          const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
          const index = Math.round(track / 45) % 8;
          return directions[index];
        };
        
        const isHistorical = aircraft.status === 'historical';
        const statusColor = aircraft.status === 'active' ? 'text-green-500' : 
                           aircraft.status === 'historical' ? 'text-blue-500' : 'text-yellow-500';
        const statusLabel = aircraft.status === 'active' ? 'Live' :
                           aircraft.status === 'historical' ? 'Historical' : 'Stale';
        
        const hasActiveTrail = adsbActiveTrails.has(aircraft.hex);
        const trailButtonClass = hasActiveTrail 
          ? 'bg-cyan-500 hover:bg-cyan-600 text-white' 
          : 'bg-gray-600 hover:bg-gray-500 text-white';
        const trailButtonText = hasActiveTrail ? 'Hide Trail' : 'Show Trail';
        
        const popupContent = `
          <div class="p-3 min-w-[260px] max-w-[320px]">
            <div class="font-bold mb-2 flex items-center gap-2 text-base border-b pb-2">
              ✈️ ${aircraft.name}
              <span class="text-xs font-normal text-gray-500">(${aircraft.hex})</span>
              ${isHistorical ? '<span class="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">Historical</span>' : ''}
              ${aircraft.military ? '<span class="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">MIL</span>' : ''}
              ${aircraft.emergency ? '<span class="text-xs bg-red-600/30 text-red-500 px-1.5 py-0.5 rounded font-bold animate-pulse">⚠ ' + aircraft.emergency + '</span>' : ''}
            </div>
            <div class="text-sm space-y-1">
              ${aircraft.registration ? `
              <div class="flex justify-between">
                <span class="text-gray-500">Registration:</span>
                <span class="font-medium">${aircraft.registration}${aircraft.country ? ' (' + aircraft.country + ')' : ''}</span>
              </div>
              ` : ''}
              ${aircraft.operator ? `
              <div class="flex justify-between">
                <span class="text-gray-500">Operator:</span>
                <span class="font-medium">${aircraft.operator}</span>
              </div>
              ` : ''}
              ${aircraft.aircraftType ? `
              <div class="flex justify-between">
                <span class="text-gray-500">Type:</span>
                <span class="font-medium">${aircraft.aircraftType}${aircraft.category ? ' (' + aircraft.category + ')' : ''}</span>
              </div>
              ` : aircraft.category ? `
              <div class="flex justify-between">
                <span class="text-gray-500">Category:</span>
                <span class="font-medium">${aircraft.category}</span>
              </div>
              ` : ''}
              <div class="flex justify-between pt-1 border-t mt-1">
                <span class="text-gray-500">Altitude:</span>
                <span class="font-medium">${aircraft.value.toLocaleString()} ${aircraft.unit}${aircraft.altGeom && aircraft.altGeom !== aircraft.value ? ' (geo: ' + aircraft.altGeom.toLocaleString() + ')' : ''}</span>
              </div>
              ${aircraft.baroRate !== undefined ? `
              <div class="flex justify-between">
                <span class="text-gray-500">Climb Rate:</span>
                <span class="font-medium ${aircraft.baroRate > 0 ? 'text-green-400' : aircraft.baroRate < 0 ? 'text-orange-400' : ''}">${aircraft.baroRate > 0 ? '+' : ''}${aircraft.baroRate.toLocaleString()} ft/min</span>
              </div>
              ` : ''}
              ${aircraft.speed !== undefined ? `
              <div class="flex justify-between">
                <span class="text-gray-500">Ground Speed:</span>
                <span class="font-medium">${Math.round(aircraft.speed)} kts${aircraft.ias ? ' (IAS: ' + Math.round(aircraft.ias) + ')' : aircraft.tas ? ' (TAS: ' + Math.round(aircraft.tas) + ')' : ''}</span>
              </div>
              ` : ''}
              ${aircraft.track !== undefined ? `
              <div class="flex justify-between">
                <span class="text-gray-500">Heading:</span>
                <span class="font-medium">${Math.round(aircraft.track)}° ${getHeadingDirection(aircraft.track)}</span>
              </div>
              ` : ''}
              ${aircraft.squawk ? `
              <div class="flex justify-between">
                <span class="text-gray-500">Squawk:</span>
                <span class="font-medium ${aircraft.squawk === '7500' || aircraft.squawk === '7600' || aircraft.squawk === '7700' ? 'text-red-500 font-bold' : ''}">${aircraft.squawk}${aircraft.squawk === '7500' ? ' (Hijack)' : aircraft.squawk === '7600' ? ' (Radio Fail)' : aircraft.squawk === '7700' ? ' (Emergency)' : ''}</span>
              </div>
              ` : ''}
              ${aircraft.rssi !== undefined ? `
              <div class="flex justify-between">
                <span class="text-gray-500">Signal:</span>
                <span class="font-medium">${aircraft.rssi.toFixed(1)} dBFS${aircraft.messages ? ' (' + aircraft.messages.toLocaleString() + ' msgs)' : ''}</span>
              </div>
              ` : aircraft.messages ? `
              <div class="flex justify-between">
                <span class="text-gray-500">Messages:</span>
                <span class="font-medium">${aircraft.messages.toLocaleString()}</span>
              </div>
              ` : ''}
              <div class="flex justify-between pt-1 border-t mt-1">
                <span class="text-gray-500">Position:</span>
                <span class="font-medium text-xs">${aircraft.location.lat.toFixed(4)}, ${aircraft.location.lng.toFixed(4)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Status:</span>
                <span class="font-medium ${statusColor}">${statusLabel}</span>
              </div>
              <div class="pt-2 border-t mt-2">
                <button 
                  class="w-full px-3 py-1.5 rounded text-xs font-medium transition-colors ${trailButtonClass}"
                  data-icao="${aircraft.hex}"
                  data-action="toggle-trail"
                >
                  📍 ${trailButtonText}
                </button>
              </div>
            </div>
          </div>
        `;

        // Create dynamic aircraft icon based on type and heading
        const aircraftType = getAircraftType(aircraft.category);
        const aircraftColor = getAircraftColor(aircraft);
        const heading = aircraft.track ?? 0;
        const aircraftIcon = createAircraftIcon(aircraftType, heading, aircraftColor);

        const existingMarker = markersRef.current.get(markerId);
        
        if (existingMarker) {
          // Update icon with new heading
          existingMarker.setIcon(aircraftIcon);
          animateMarker(existingMarker, aircraft.location.lat, aircraft.location.lng);
          existingMarker.setPopupContent(popupContent);
        } else {
          const marker = L.marker([aircraft.location.lat, aircraft.location.lng], { 
            icon: aircraftIcon,
            opacity: 0 
          })
            .bindPopup(popupContent)
            .addTo(mapRef.current!);
          
          // Add click handler for trail toggle button in popup
          marker.on('popupopen', () => {
            const popup = marker.getPopup();
            if (popup) {
              const container = popup.getElement();
              const trailButton = container?.querySelector('[data-action="toggle-trail"]');
              if (trailButton) {
                trailButton.addEventListener('click', () => {
                  const icao = trailButton.getAttribute('data-icao');
                  if (icao) {
                    toggleAircraftTrail(icao);
                  }
                });
              }
            }
          });
          
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
  }, [sensorMarkers, clientMarkers, adsbMarkers, filter, allPositions, hasInitialFit]);

  // Update trail polylines (sensor/client only)
  useEffect(() => {
    if (!mapRef.current) return;

    const trailColors = {
      sensor: '#22c55e',   // green
      client: '#3b82f6',   // blue
    };

    // Remove sensor/client trails if disabled
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

  // Add trail when ADS-B history data is loaded (manual toggle)
  useEffect(() => {
    if (historyData) {
      addTrailFromData();
    }
  }, [historyData, addTrailFromData]);

  // Render ADS-B aircraft trails automatically from historical data
  useEffect(() => {
    if (!mapRef.current) return;
    
    // Clear all ADS-B trails if disabled or filtered out
    if (!showAdsbTrails || (filter !== 'all' && filter !== 'adsb')) {
      adsbTrailsRef.current.forEach(polyline => polyline.remove());
      adsbTrailsRef.current.clear();
      return;
    }

    // Combine auto trails from adsbTrails with manually selected adsbActiveTrails
    const allTrailIds = new Set<string>();
    
    // Add automatic trails from historical data
    adsbTrails.forEach(trail => allTrailIds.add(trail.icao));
    
    // Add manually selected trails
    adsbActiveTrails.forEach((_, icao) => allTrailIds.add(icao));

    // Remove trails that are no longer needed
    adsbTrailsRef.current.forEach((polyline, id) => {
      // Skip shadow trails in cleanup check
      const baseId = id.endsWith('-shadow') ? id.replace('-shadow', '') : id;
      if (!allTrailIds.has(baseId)) {
        polyline.remove();
        adsbTrailsRef.current.delete(id);
      }
    });

    // Render automatic trails from adsbTrails
    adsbTrails.forEach(trail => {
      if (trail.coordinates.length < 2) return;

      const icao = trail.icao;
      const existing = adsbTrailsRef.current.get(icao);

      if (existing) {
        existing.setLatLngs(trail.coordinates);
      } else {
        // Create shadow line first
        const shadowLine = L.polyline(trail.coordinates, {
          color: '#006064',
          weight: 5,
          opacity: 0.3,
        }).addTo(mapRef.current!);

        // Create main trail line
        const polyline = L.polyline(trail.coordinates, {
          color: '#00bcd4',
          weight: 3,
          opacity: 0.8,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(mapRef.current!);

        polyline.bringToFront();

        const tooltipContent = `✈️ ${trail.flight || trail.icao} - ${trail.coordinates.length} positions`;
        polyline.bindTooltip(tooltipContent, { permanent: false, direction: 'top' });

        adsbTrailsRef.current.set(icao, polyline);
        adsbTrailsRef.current.set(`${icao}-shadow`, shadowLine);
      }
    });

    // Render manually selected trails from adsbActiveTrails (overrides)
    adsbActiveTrails.forEach((trail, icao) => {
      if (trail.coordinates.length < 2) return;

      const existing = adsbTrailsRef.current.get(icao);

      if (existing) {
        existing.setLatLngs(trail.coordinates);
      } else {
        const shadowLine = L.polyline(trail.coordinates, {
          color: '#006064',
          weight: 5,
          opacity: 0.3,
        }).addTo(mapRef.current!);

        const polyline = L.polyline(trail.coordinates, {
          color: '#00bcd4',
          weight: 3,
          opacity: 0.8,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(mapRef.current!);

        polyline.bringToFront();

        const tooltipContent = `✈️ ${trail.flight || trail.icao} - ${trail.coordinates.length} positions`;
        polyline.bindTooltip(tooltipContent, { permanent: false, direction: 'top' });

        adsbTrailsRef.current.set(icao, polyline);
        adsbTrailsRef.current.set(`${icao}-shadow`, shadowLine);
      }
    });
  }, [adsbTrails, adsbActiveTrails, showAdsbTrails, filter]);

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
          <div className="flex items-center gap-3">
            <TimeframeSelector 
              value={timeframe}
              onChange={(value) => {
                setTimeframe(value);
                const minutes = timeframeToMinutes(value);
                setSensorRetentionMinutes(minutes);
                setClientRetentionMinutes(minutes);
              }}
            />
            <GpsHistorySettings
              sensorRetentionMinutes={sensorRetentionMinutes}
              clientRetentionMinutes={clientRetentionMinutes}
              onSensorRetentionChange={setSensorRetentionMinutes}
              onClientRetentionChange={setClientRetentionMinutes}
              showTrails={showTrails}
              onShowTrailsChange={setShowTrails}
              showAdsbTrails={showAdsbTrails}
              onShowAdsbTrailsChange={setShowAdsbTrails}
              trailCount={trails.length}
              adsbTrailCount={adsbTrails.length + adsbActiveTrails.size}
              onClearHistory={clearHistory}
              onClearAdsbTrails={clearAllAdsbTrails}
            />
          </div>
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

        {/* ADS-B Trail indicator */}
        {adsbActiveTrails.size > 0 && (
          <div className="absolute top-4 right-4 z-[1000] flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card/90 backdrop-blur border border-border/50">
            <Route className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-medium">{adsbActiveTrails.size} Flight Trail{adsbActiveTrails.size > 1 ? 's' : ''}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 p-0 hover:bg-destructive/20"
              onClick={clearAllAdsbTrails}
              title="Clear all flight trails"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}

        {/* Loading indicator for trail fetch */}
        {adsbHistoryLoading && (
          <div className="absolute top-14 right-4 z-[1000] flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card/90 backdrop-blur border border-border/50">
            <div className="w-3 h-3 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
            <span className="text-xs">Loading trail...</span>
          </div>
        )}

        <MapLegend />
        <MapStatistics stats={stats} adsbIsHistorical={adsbIsHistorical} />
        <MapLoadingOverlay isLoading={isLoading} />
      </div>
    </div>
  );
};

export default MapContent;
