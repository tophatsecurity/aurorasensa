import { useMemo, useState } from "react";
import { 
  Cpu, 
  Wifi, 
  Radio, 
  Plane, 
  Navigation, 
  Thermometer, 
  Bluetooth, 
  Monitor,
  Satellite,
  Activity,
  Loader2,
  AlertCircle,
  MapPin,
  Clock,
  Hash,
  Gauge,
  Zap,
  Droplets,
  Wind,
  Eye,
  Signal,
  Battery,
  Settings,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from "recharts";

interface SensorReading {
  device_id: string;
  device_type: string;
  timestamp: string;
  data: Record<string, unknown>;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  accuracy?: number;
}

interface ClientSensorTabProps {
  sensorType: string;
  readings: SensorReading[];
  isLoading?: boolean;
}

// Icon for sensor type
const getSensorIcon = (sensorType: string) => {
  const iconClass = "w-5 h-5";
  switch (sensorType.toLowerCase()) {
    case 'arduino': return <Cpu className={iconClass} />;
    case 'lora': return <Radio className={iconClass} />;
    case 'starlink': return <Satellite className={iconClass} />;
    case 'wifi': return <Wifi className={iconClass} />;
    case 'bluetooth': return <Bluetooth className={iconClass} />;
    case 'adsb': return <Plane className={iconClass} />;
    case 'gps': return <Navigation className={iconClass} />;
    case 'thermal': case 'thermal_probe': return <Thermometer className={iconClass} />;
    case 'system_monitor': case 'system': return <Monitor className={iconClass} />;
    default: return <Cpu className={iconClass} />;
  }
};

// Color for sensor type
const getSensorColor = (sensorType: string) => {
  switch (sensorType.toLowerCase()) {
    case 'arduino': return '#f97316';
    case 'lora': return '#ef4444';
    case 'starlink': return '#8b5cf6';
    case 'wifi': return '#3b82f6';
    case 'bluetooth': return '#6366f1';
    case 'adsb': return '#06b6d4';
    case 'gps': return '#22c55e';
    case 'thermal': case 'thermal_probe': return '#f59e0b';
    case 'system_monitor': case 'system': return '#64748b';
    default: return '#8b5cf6';
  }
};

// Get icon for specific data field
const getFieldIcon = (key: string) => {
  const lowerKey = key.toLowerCase();
  if (lowerKey.includes('temp')) return <Thermometer className="w-3.5 h-3.5" />;
  if (lowerKey.includes('humid')) return <Droplets className="w-3.5 h-3.5" />;
  if (lowerKey.includes('power') || lowerKey.includes('watt') || lowerKey.includes('voltage')) return <Zap className="w-3.5 h-3.5" />;
  if (lowerKey.includes('signal') || lowerKey.includes('rssi') || lowerKey.includes('snr')) return <Signal className="w-3.5 h-3.5" />;
  if (lowerKey.includes('speed') || lowerKey.includes('velocity')) return <Gauge className="w-3.5 h-3.5" />;
  if (lowerKey.includes('wind')) return <Wind className="w-3.5 h-3.5" />;
  if (lowerKey.includes('battery')) return <Battery className="w-3.5 h-3.5" />;
  if (lowerKey.includes('lat') || lowerKey.includes('lng') || lowerKey.includes('lon')) return <MapPin className="w-3.5 h-3.5" />;
  if (lowerKey.includes('time') || lowerKey.includes('date')) return <Clock className="w-3.5 h-3.5" />;
  if (lowerKey.includes('count') || lowerKey.includes('num')) return <Hash className="w-3.5 h-3.5" />;
  return <Settings className="w-3.5 h-3.5" />;
};

// Get unit for value
const getValueUnit = (key: string): string => {
  const lowerKey = key.toLowerCase();
  if (lowerKey.includes('temp')) return '°C';
  if (lowerKey.includes('humid') || lowerKey.includes('percent') || lowerKey.includes('cpu') || lowerKey.includes('memory') || lowerKey.includes('disk')) return '%';
  if (lowerKey.includes('watt') || lowerKey.includes('power')) return 'W';
  if (lowerKey.includes('voltage')) return 'V';
  if (lowerKey.includes('current') && !lowerKey.includes('direction')) return 'A';
  if (lowerKey.includes('signal') || lowerKey.includes('rssi')) return 'dBm';
  if (lowerKey.includes('snr')) return 'dB';
  if (lowerKey.includes('speed') && !lowerKey.includes('wind')) return 'Mbps';
  if (lowerKey.includes('wind_speed')) return 'm/s';
  if (lowerKey.includes('altitude') || lowerKey.includes('alt')) return 'ft';
  if (lowerKey.includes('latency') || lowerKey.includes('ping')) return 'ms';
  if (lowerKey.includes('pressure')) return 'hPa';
  if (lowerKey.includes('distance') || lowerKey.includes('range')) return 'm';
  if (lowerKey.includes('heading') || lowerKey.includes('direction') || lowerKey.includes('bearing')) return '°';
  if (lowerKey.includes('frequency') || lowerKey.includes('freq')) return 'MHz';
  return '';
};

// Format value with appropriate precision and unit
const formatValue = (key: string, value: unknown): { display: string; raw: number | string | null } => {
  if (value === null || value === undefined) return { display: '—', raw: null };
  if (typeof value === 'boolean') return { display: value ? 'Yes' : 'No', raw: value ? 1 : 0 };
  if (typeof value === 'string') {
    // Check if it's a numeric string
    const num = parseFloat(value);
    if (!isNaN(num) && value.trim() !== '') {
      return formatValue(key, num);
    }
    return { display: value, raw: value };
  }
  if (typeof value === 'number') {
    const unit = getValueUnit(key);
    const lowerKey = key.toLowerCase();
    
    // Special formatting for speeds (convert to Mbps if needed)
    if ((lowerKey.includes('speed') || lowerKey.includes('throughput')) && !lowerKey.includes('wind')) {
      const mbps = value > 1000000 ? value / 1000000 : value;
      return { display: `${mbps.toFixed(2)} ${unit}`, raw: mbps };
    }
    
    // Formatting based on precision needs
    let formatted: string;
    if (Number.isInteger(value)) {
      formatted = value.toString();
    } else if (Math.abs(value) < 1) {
      formatted = value.toFixed(4);
    } else if (Math.abs(value) < 100) {
      formatted = value.toFixed(2);
    } else {
      formatted = value.toFixed(1);
    }
    
    return { display: unit ? `${formatted} ${unit}` : formatted, raw: value };
  }
  if (typeof value === 'object') {
    return { display: JSON.stringify(value), raw: null };
  }
  return { display: String(value), raw: null };
};

// Format key for display
const formatLabel = (key: string): string => {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim();
};

// Categorize data fields
const categorizeFields = (data: Record<string, unknown>, sensorType?: string): Record<string, [string, unknown][]> => {
  const isStarlink = sensorType?.toLowerCase().includes('starlink');
  
  // Starlink-specific categories
  if (isStarlink) {
    return categorizeStarlinkFields(data);
  }
  
  const categories: Record<string, [string, unknown][]> = {
    location: [],
    environmental: [],
    network: [],
    power: [],
    system: [],
    other: []
  };
  
  Object.entries(data).forEach(([key, value]) => {
    if (key.includes('_id') || key === 'timestamp') return;
    
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('lat') || lowerKey.includes('lng') || lowerKey.includes('lon') || 
        lowerKey.includes('altitude') || lowerKey.includes('heading') || lowerKey.includes('gps') ||
        lowerKey.includes('accuracy') || lowerKey.includes('bearing')) {
      categories.location.push([key, value]);
    } else if (lowerKey.includes('temp') || lowerKey.includes('humid') || lowerKey.includes('pressure') ||
               lowerKey.includes('wind') || lowerKey.includes('rain') || lowerKey.includes('light') ||
               lowerKey.includes('uv') || lowerKey.includes('air') || lowerKey.includes('weather')) {
      categories.environmental.push([key, value]);
    } else if (lowerKey.includes('signal') || lowerKey.includes('rssi') || lowerKey.includes('snr') ||
               lowerKey.includes('speed') || lowerKey.includes('throughput') || lowerKey.includes('latency') ||
               lowerKey.includes('bandwidth') || lowerKey.includes('packet') || lowerKey.includes('freq') ||
               lowerKey.includes('channel') || lowerKey.includes('ssid') || lowerKey.includes('mac')) {
      categories.network.push([key, value]);
    } else if (lowerKey.includes('power') || lowerKey.includes('watt') || lowerKey.includes('voltage') ||
               lowerKey.includes('current') || lowerKey.includes('battery') || lowerKey.includes('energy')) {
      categories.power.push([key, value]);
    } else if (lowerKey.includes('cpu') || lowerKey.includes('memory') || lowerKey.includes('disk') ||
               lowerKey.includes('load') || lowerKey.includes('process') || lowerKey.includes('uptime')) {
      categories.system.push([key, value]);
    } else {
      categories.other.push([key, value]);
    }
  });
  
  return categories;
};

// Starlink-specific categorization
const categorizeStarlinkFields = (data: Record<string, unknown>): Record<string, [string, unknown][]> => {
  const categories: Record<string, [string, unknown][]> = {
    'Signal Quality': [],
    'Throughput': [],
    'Latency': [],
    'Power': [],
    'Obstruction': [],
    'GPS Location': [],
    'Device Status': [],
    'Network': [],
    'Other': []
  };
  
  // Flatten nested objects like ping_latency, dish_gps
  const flattenedData: Record<string, unknown> = {};
  
  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Flatten nested objects with prefix
      Object.entries(value as Record<string, unknown>).forEach(([nestedKey, nestedValue]) => {
        flattenedData[`${key}_${nestedKey}`] = nestedValue;
      });
    } else {
      flattenedData[key] = value;
    }
  });
  
  Object.entries(flattenedData).forEach(([key, value]) => {
    if (key.includes('_id') || key === 'timestamp' || value === null || value === undefined) return;
    
    const lowerKey = key.toLowerCase();
    
    // Signal Quality
    if (lowerKey.includes('snr') || lowerKey.includes('signal') || lowerKey.includes('noise') ||
        lowerKey.includes('phy_rate') || lowerKey.includes('carrier') || lowerKey.includes('rssi') ||
        lowerKey.includes('currently_obstructed') || lowerKey.includes('wedge_abs') || lowerKey.includes('wedge_fraction')) {
      categories['Signal Quality'].push([key, value]);
    }
    // Throughput
    else if (lowerKey.includes('throughput') || lowerKey.includes('downlink') || lowerKey.includes('uplink') ||
             lowerKey.includes('bps') || lowerKey.includes('bandwidth') || lowerKey.includes('mbps')) {
      categories['Throughput'].push([key, value]);
    }
    // Latency
    else if (lowerKey.includes('latency') || lowerKey.includes('ping') || lowerKey.includes('pop_') ||
             lowerKey.includes('ms') && (lowerKey.includes('round') || lowerKey.includes('trip'))) {
      categories['Latency'].push([key, value]);
    }
    // Power
    else if (lowerKey.includes('power') || lowerKey.includes('watt') || lowerKey.includes('voltage') ||
             lowerKey.includes('current') || lowerKey.includes('energy') || lowerKey.includes('consumption')) {
      categories['Power'].push([key, value]);
    }
    // Obstruction
    else if (lowerKey.includes('obstruct') || lowerKey.includes('blocked') || lowerKey.includes('occlusion') ||
             lowerKey.includes('fraction_obstructed') || lowerKey.includes('outage') || lowerKey.includes('no_sats') ||
             lowerKey.includes('stow') || lowerKey.includes('thermal_shutdown')) {
      categories['Obstruction'].push([key, value]);
    }
    // GPS/Location
    else if (lowerKey.includes('lat') || lowerKey.includes('lng') || lowerKey.includes('lon') ||
             lowerKey.includes('altitude') || lowerKey.includes('heading') || lowerKey.includes('gps') ||
             lowerKey.includes('azimuth') || lowerKey.includes('tilt') || lowerKey.includes('elevation') ||
             lowerKey.includes('direction')) {
      categories['GPS Location'].push([key, value]);
    }
    // Device Status
    else if (lowerKey.includes('uptime') || lowerKey.includes('state') || lowerKey.includes('status') ||
             lowerKey.includes('ready') || lowerKey.includes('alert') || lowerKey.includes('reboot') ||
             lowerKey.includes('software') || lowerKey.includes('hardware') || lowerKey.includes('version') ||
             lowerKey.includes('connected') || lowerKey.includes('seconds_to') || lowerKey.includes('mobility')) {
      categories['Device Status'].push([key, value]);
    }
    // Network
    else if (lowerKey.includes('ip') || lowerKey.includes('router') || lowerKey.includes('ethernet') ||
             lowerKey.includes('pop_rack') || lowerKey.includes('cell') || lowerKey.includes('satellite')) {
      categories['Network'].push([key, value]);
    }
    // Other
    else {
      categories['Other'].push([key, value]);
    }
  });
  
  return categories;
};

const CHART_COLORS = ['#8b5cf6', '#f97316', '#22c55e', '#3b82f6', '#ef4444', '#06b6d4', '#f59e0b', '#ec4899'];

export function ClientSensorTab({ sensorType, readings, isLoading }: ClientSensorTabProps) {
  const [showAllReadings, setShowAllReadings] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const color = getSensorColor(sensorType);
  
  // Get latest reading
  const latestReading = readings[0];
  
  // Get unique device IDs
  const deviceIds = useMemo(() => {
    return [...new Set(readings.map(r => r.device_id))];
  }, [readings]);
  
  // Categorize latest data (with special handling for Starlink)
  const categorizedData = useMemo(() => {
    if (!latestReading?.data) return {};
    return categorizeFields(latestReading.data, sensorType);
  }, [latestReading, sensorType]);
  
  // Extract all numeric keys for charting
  const { chartData, numericKeys, allNumericKeys } = useMemo(() => {
    if (!readings.length) return { chartData: [], numericKeys: [], allNumericKeys: [] };
    
    // Find all numeric keys from readings
    const keySet = new Set<string>();
    readings.forEach(r => {
      Object.entries(r.data || {}).forEach(([k, v]) => {
        if (typeof v === 'number' && !k.includes('timestamp') && !k.includes('_id')) {
          keySet.add(k);
        }
      });
    });
    
    const allKeys = Array.from(keySet);
    const displayKeys = allKeys.slice(0, 8); // Show up to 8 metrics in chart
    
    // Transform readings for chart
    const data = [...readings]
      .reverse()
      .slice(-100) // Last 100 readings
      .map((r) => {
        const entry: Record<string, unknown> = {
          time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          fullTime: new Date(r.timestamp).toLocaleString(),
        };
        displayKeys.forEach((k) => {
          let val = r.data[k];
          // Normalize speed/throughput to Mbps
          if (typeof val === 'number' && (k.includes('speed') || k.includes('throughput'))) {
            val = val > 1000000 ? val / 1000000 : val;
          }
          entry[k] = val;
        });
        return entry;
      });
    
    return { chartData: data, numericKeys: displayKeys, allNumericKeys: allKeys };
  }, [readings]);
  
  // Calculate statistics for numeric fields
  const statistics = useMemo(() => {
    if (!readings.length || !allNumericKeys.length) return {};
    
    const stats: Record<string, { min: number; max: number; avg: number; current: number }> = {};
    
    allNumericKeys.forEach(key => {
      const values = readings
        .map(r => r.data[key])
        .filter((v): v is number => typeof v === 'number');
      
      if (values.length > 0) {
        stats[key] = {
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          current: values[0],
        };
      }
    });
    
    return stats;
  }, [readings, allNumericKeys]);
  
  // Location info from readings
  const locationInfo = useMemo(() => {
    const reading = readings.find(r => r.latitude && r.longitude);
    if (!reading) return null;
    return {
      latitude: reading.latitude,
      longitude: reading.longitude,
      altitude: reading.altitude,
      accuracy: reading.accuracy,
    };
  }, [readings]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading sensor data...</span>
      </div>
    );
  }

  if (!readings.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No readings found for this sensor type</p>
      </div>
    );
  }

  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();
    // Standard categories
    if (cat === 'location' || cat === 'gps location') return <MapPin className="w-4 h-4" />;
    if (cat === 'environmental') return <Thermometer className="w-4 h-4" />;
    if (cat === 'network') return <Signal className="w-4 h-4" />;
    if (cat === 'power') return <Zap className="w-4 h-4" />;
    if (cat === 'system') return <Monitor className="w-4 h-4" />;
    // Starlink-specific categories
    if (cat === 'signal quality') return <Signal className="w-4 h-4" />;
    if (cat === 'throughput') return <Gauge className="w-4 h-4" />;
    if (cat === 'latency') return <Clock className="w-4 h-4" />;
    if (cat === 'obstruction') return <Eye className="w-4 h-4" />;
    if (cat === 'device status') return <Activity className="w-4 h-4" />;
    return <Eye className="w-4 h-4" />;
  };

  const getCategoryColor = (category: string) => {
    const cat = category.toLowerCase();
    // Standard categories
    if (cat === 'location' || cat === 'gps location') return 'text-success';
    if (cat === 'environmental') return 'text-warning';
    if (cat === 'network') return 'text-primary';
    if (cat === 'power') return 'text-chart-3';
    if (cat === 'system') return 'text-muted-foreground';
    // Starlink-specific categories
    if (cat === 'signal quality') return 'text-chart-1';
    if (cat === 'throughput') return 'text-chart-2';
    if (cat === 'latency') return 'text-chart-4';
    if (cat === 'obstruction') return 'text-destructive';
    if (cat === 'device status') return 'text-success';
    return 'text-primary';
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center border"
            style={{ backgroundColor: `${color}15`, borderColor: `${color}30` }}
          >
            <span style={{ color }}>{getSensorIcon(sensorType)}</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold capitalize">{sensorType.replace(/_/g, ' ')} Sensor</h3>
            <p className="text-sm text-muted-foreground">
              {readings.length} readings • {deviceIds.length} device{deviceIds.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-success/20 text-success border-success/30">
            <Activity className="w-3 h-3 mr-1" />
            Active
          </Badge>
          <Badge variant="outline" className="text-muted-foreground">
            <Clock className="w-3 h-3 mr-1" />
            {new Date(latestReading.timestamp).toLocaleString()}
          </Badge>
        </div>
      </div>

      {/* Device Info */}
      {deviceIds.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Hash className="w-4 h-4 text-primary" />
              Device Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {deviceIds.map(id => (
                <Badge key={id} variant="secondary" className="font-mono text-xs">
                  {id}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location Card (if available) */}
      {locationInfo && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-success" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Latitude</p>
                <p className="font-mono text-sm">{locationInfo.latitude?.toFixed(6)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Longitude</p>
                <p className="font-mono text-sm">{locationInfo.longitude?.toFixed(6)}</p>
              </div>
              {locationInfo.altitude && (
                <div>
                  <p className="text-xs text-muted-foreground">Altitude</p>
                  <p className="font-mono text-sm">{locationInfo.altitude.toFixed(1)} ft</p>
                </div>
              )}
              {locationInfo.accuracy && (
                <div>
                  <p className="text-xs text-muted-foreground">Accuracy</p>
                  <p className="font-mono text-sm">{locationInfo.accuracy.toFixed(1)} m</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Values by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Object.entries(categorizedData).map(([category, fields]) => {
          if (fields.length === 0) return null;
          const isExpanded = expandedCategories[category] !== false;
          
          return (
            <Card key={category} className="bg-card/50 border-border/50">
              <Collapsible open={isExpanded} onOpenChange={() => toggleCategory(category)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-2 cursor-pointer hover:bg-muted/20 transition-colors">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className={`flex items-center gap-2 ${getCategoryColor(category)}`}>
                        {getCategoryIcon(category)}
                        <span className="capitalize text-foreground">{category}</span>
                        <Badge variant="outline" className="text-xs font-normal">
                          {fields.length}
                        </Badge>
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-2">
                      {fields.map(([key, value]) => {
                        const { display } = formatValue(key, value);
                        const stat = statistics[key];
                        
                        return (
                          <div 
                            key={key} 
                            className="p-3 rounded-lg bg-muted/30 border border-border/30"
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-muted-foreground">{getFieldIcon(key)}</span>
                              <p className="text-xs text-muted-foreground truncate">{formatLabel(key)}</p>
                            </div>
                            <p className="font-mono text-sm font-medium truncate">{display}</p>
                            {stat && (
                              <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
                                <span>Min: {formatValue(key, stat.min).display}</span>
                                <span>Max: {formatValue(key, stat.max).display}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      {/* Statistics Overview */}
      {Object.keys(statistics).length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Gauge className="w-4 h-4 text-primary" />
              Statistics Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Object.entries(statistics).slice(0, 12).map(([key, stat]) => (
                <div key={key} className="p-2 rounded-lg bg-muted/30 border border-border/30">
                  <p className="text-xs text-muted-foreground truncate mb-1">{formatLabel(key)}</p>
                  <div className="space-y-0.5 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current:</span>
                      <span className="text-foreground">{formatValue(key, stat.current).display}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg:</span>
                      <span className="text-primary">{formatValue(key, stat.avg).display}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Range:</span>
                      <span className="text-success">{formatValue(key, stat.min).display} - {formatValue(key, stat.max).display}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trend Charts */}
      {chartData.length > 1 && numericKeys.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Trend Analysis ({chartData.length} readings)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    {numericKeys.map((key, idx) => (
                      <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS[idx % CHART_COLORS.length]} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={CHART_COLORS[idx % CHART_COLORS.length]} stopOpacity={0}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 10 }} 
                    stroke="hsl(var(--muted-foreground))"
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }} 
                    stroke="hsl(var(--muted-foreground))"
                    width={60}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    labelFormatter={(label, payload) => {
                      if (payload?.[0]?.payload?.fullTime) {
                        return payload[0].payload.fullTime;
                      }
                      return label;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  {numericKeys.map((key, idx) => (
                    <Area
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={formatLabel(key)}
                      stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                      fill={`url(#gradient-${key})`}
                      strokeWidth={2}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Readings Table */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Recent Readings
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowAllReadings(!showAllReadings)}
              className="text-xs"
            >
              {showAllReadings ? 'Show Less' : `Show All (${readings.length})`}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto max-h-[400px]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Timestamp</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Device</th>
                  {Object.keys((latestReading?.data || {}) as Record<string, unknown>)
                    .filter(k => !k.includes('_id'))
                    .slice(0, 6)
                    .map(k => (
                      <th key={k} className="text-left py-2 px-2 font-medium text-muted-foreground">
                        {formatLabel(k)}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {(showAllReadings ? readings : readings.slice(0, 20)).map((reading, idx) => (
                  <tr key={idx} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-2 font-mono whitespace-nowrap">
                      {new Date(reading.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2 px-2">
                      <Badge variant="outline" className="text-xs font-mono">
                        {reading.device_id}
                      </Badge>
                    </td>
                    {Object.entries((reading?.data || {}) as Record<string, unknown>)
                      .filter(([k]) => !k.includes('_id'))
                      .slice(0, 6)
                      .map(([k, v]) => (
                        <td key={k} className="py-2 px-2 font-mono">
                          {formatValue(k, v).display}
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Raw Data Preview */}
      <Collapsible>
        <Card className="bg-card/50 border-border/50">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/20 transition-colors">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  Raw Data (Latest Reading)
                </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <pre className="text-xs font-mono bg-muted/30 p-3 rounded-lg overflow-auto max-h-[300px]">
                {JSON.stringify(latestReading, null, 2)}
              </pre>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
