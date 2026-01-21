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
  Globe,
  Compass,
  Factory,
  Router,
  Volume2,
  Sun,
  Ruler,
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

// OUI lookup for manufacturer (simplified subset)
const OUI_MANUFACTURERS: Record<string, string> = {
  '00:1A:2B': 'Apple Inc.',
  '00:25:00': 'Apple Inc.',
  '00:1E:C2': 'Apple Inc.',
  'F8:E0:79': 'Motorola',
  '00:50:56': 'VMware',
  '00:0C:29': 'VMware',
  '00:1C:42': 'Parallels',
  '00:23:32': 'Apple Inc.',
  'DC:A6:32': 'Raspberry Pi',
  'B8:27:EB': 'Raspberry Pi',
  'E4:5F:01': 'Raspberry Pi',
  '28:CD:C1': 'Raspberry Pi',
  '00:17:88': 'Philips Lighting',
  '00:1D:C9': 'GainSpan',
  '00:80:E1': 'STMicroelectronics',
  '30:AE:A4': 'Espressif',
  'A4:CF:12': 'Espressif',
  '24:6F:28': 'Espressif',
  'CC:50:E3': 'Espressif',
  '60:01:94': 'Espressif',
  '00:15:5D': 'Microsoft',
  '00:03:FF': 'Microsoft',
  '00:1F:5B': 'Apple Inc.',
  '68:A8:6D': 'Apple Inc.',
  '14:7D:DA': 'Samsung',
  '00:21:19': 'Samsung',
  '00:E0:4C': 'Realtek',
  '48:5D:60': 'Azurewave',
  'F0:D5:BF': 'Sonos',
  '00:0E:58': 'Sonos',
  '5C:AA:FD': 'Sonos',
  '00:1F:E2': 'Hon Hai (Foxconn)',
  '9C:B6:D0': 'Rivet Networks',
  'AC:67:B2': 'Espressif',
};

// Get manufacturer from MAC address
const getManufacturer = (mac: string): string => {
  if (!mac) return 'Unknown';
  const prefix = mac.toUpperCase().substring(0, 8);
  return OUI_MANUFACTURERS[prefix] || 'Unknown';
};

// Estimate distance from RSSI (using free space path loss formula)
const estimateDistance = (rssi: number, txPower: number = -59): string => {
  if (!rssi || rssi >= 0) return 'N/A';
  const n = 2.5; // Path loss exponent (typical for indoor)
  const distance = Math.pow(10, (txPower - rssi) / (10 * n));
  if (distance < 1) return `${(distance * 100).toFixed(0)} cm`;
  if (distance < 10) return `${distance.toFixed(1)} m`;
  return `${distance.toFixed(0)} m`;
};

// Get signal quality label
const getSignalQuality = (rssi: number): { label: string; color: string } => {
  if (rssi >= -50) return { label: 'Excellent', color: 'text-success' };
  if (rssi >= -60) return { label: 'Good', color: 'text-emerald-400' };
  if (rssi >= -70) return { label: 'Fair', color: 'text-warning' };
  if (rssi >= -80) return { label: 'Weak', color: 'text-orange-400' };
  return { label: 'Very Weak', color: 'text-destructive' };
};

// Format speed for ADS-B
const formatSpeed = (speed: number | undefined): string => {
  if (!speed && speed !== 0) return '—';
  return `${speed.toFixed(0)} kts`;
};

// Format altitude for ADS-B  
const formatAltitude = (alt: number | undefined): string => {
  if (!alt && alt !== 0) return '—';
  return `${alt.toLocaleString()} ft`;
};

// WiFi Scanner View Component
const WifiScannerView = ({ readings }: { readings: SensorReading[] }) => {
  const networks = useMemo(() => {
    const networkMap = new Map<string, {
      bssid: string;
      ssid: string;
      rssi: number;
      channel?: number;
      security?: string;
      frequency?: number;
      manufacturer: string;
      lastSeen: string;
      distance: string;
    }>();
    
    readings.forEach(r => {
      const data = r.data || {};
      // Handle networks array or individual readings
      const networksData = data.networks || data.scan_results || [data];
      const items = Array.isArray(networksData) ? networksData : [networksData];
      
      items.forEach((n: Record<string, unknown>) => {
        const bssid = (n.bssid || n.mac_address || n.mac || '') as string;
        if (!bssid) return;
        
        const rssi = Number(n.rssi || n.signal_strength || n.signal || -100);
        const existing = networkMap.get(bssid);
        
        if (!existing || rssi > existing.rssi) {
          networkMap.set(bssid, {
            bssid,
            ssid: (n.ssid || n.name || 'Hidden') as string,
            rssi,
            channel: n.channel as number | undefined,
            security: (n.security || n.encryption || n.auth || '') as string,
            frequency: n.frequency as number | undefined,
            manufacturer: getManufacturer(bssid),
            lastSeen: r.timestamp,
            distance: estimateDistance(rssi),
          });
        }
      });
    });
    
    return Array.from(networkMap.values())
      .sort((a, b) => b.rssi - a.rssi);
  }, [readings]);

  if (networks.length === 0) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="py-8 text-center">
          <Wifi className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">No WiFi networks detected</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Wifi className="w-4 h-4 text-blue-400" />
          Detected WiFi Networks ({networks.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">SSID</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">BSSID</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Manufacturer</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Signal</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Quality</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Est. Distance</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Channel</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Security</th>
              </tr>
            </thead>
            <tbody>
              {networks.map((network, idx) => {
                const signalInfo = getSignalQuality(network.rssi);
                return (
                  <tr key={idx} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-2 font-medium">
                      {network.ssid === 'Hidden' ? (
                        <span className="text-muted-foreground italic">Hidden Network</span>
                      ) : network.ssid}
                    </td>
                    <td className="py-2 px-2 font-mono text-muted-foreground">{network.bssid}</td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-1">
                        <Factory className="w-3 h-3 text-muted-foreground" />
                        <span className="truncate max-w-[100px]">{network.manufacturer}</span>
                      </div>
                    </td>
                    <td className="py-2 px-2 font-mono">
                      <div className="flex items-center gap-1">
                        <Signal className="w-3 h-3 text-primary" />
                        {network.rssi} dBm
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <Badge variant="outline" className={signalInfo.color}>
                        {signalInfo.label}
                      </Badge>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-1">
                        <Ruler className="w-3 h-3 text-muted-foreground" />
                        {network.distance}
                      </div>
                    </td>
                    <td className="py-2 px-2">{network.channel || '—'}</td>
                    <td className="py-2 px-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {network.security || 'Open'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

// Bluetooth Scanner View Component
const BluetoothScannerView = ({ readings }: { readings: SensorReading[] }) => {
  const devices = useMemo(() => {
    const deviceMap = new Map<string, {
      mac: string;
      name: string;
      rssi: number;
      manufacturer: string;
      deviceType?: string;
      uuids: string[];
      lastSeen: string;
      distance: string;
      isBLE: boolean;
      appearance?: string;
      txPower?: number;
    }>();
    
    readings.forEach(r => {
      const data = r.data || {};
      // Handle devices array or individual readings
      const devicesData = data.devices || data.scan_results || data.ble_devices || [data];
      const items = Array.isArray(devicesData) ? devicesData : [devicesData];
      
      items.forEach((d: Record<string, unknown>) => {
        const mac = (d.mac_address || d.mac || d.address || '') as string;
        if (!mac) return;
        
        const rssi = Number(d.rssi || d.signal_strength || -100);
        const existing = deviceMap.get(mac);
        
        const uuidsRaw = d.uuids || d.service_uuids || d.services || [];
        const uuids = Array.isArray(uuidsRaw) ? uuidsRaw.map(String) : [];
        
        if (!existing || rssi > existing.rssi) {
          deviceMap.set(mac, {
            mac,
            name: (d.name || d.device_name || 'Unknown') as string,
            rssi,
            manufacturer: (d.manufacturer || d.manufacturer_data || getManufacturer(mac)) as string,
            deviceType: (d.device_type || d.type || d.class) as string | undefined,
            uuids,
            lastSeen: r.timestamp,
            distance: estimateDistance(rssi, d.tx_power as number),
            isBLE: Boolean(d.is_ble || d.ble || uuids.length > 0 || d.advertisement),
            appearance: d.appearance as string | undefined,
            txPower: d.tx_power as number | undefined,
          });
        }
      });
    });
    
    return Array.from(deviceMap.values())
      .sort((a, b) => b.rssi - a.rssi);
  }, [readings]);

  if (devices.length === 0) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="py-8 text-center">
          <Bluetooth className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">No Bluetooth devices detected</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bluetooth className="w-4 h-4 text-indigo-400" />
          Detected Bluetooth Devices ({devices.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Name</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">MAC Address</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Type</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Manufacturer</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Signal</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Distance</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Service UUIDs</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device, idx) => {
                const signalInfo = getSignalQuality(device.rssi);
                return (
                  <tr key={idx} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        {device.name === 'Unknown' ? (
                          <span className="text-muted-foreground italic">Unknown Device</span>
                        ) : (
                          <span className="font-medium">{device.name}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2 font-mono text-muted-foreground">{device.mac}</td>
                    <td className="py-2 px-2">
                      <Badge variant={device.isBLE ? "default" : "secondary"} className="text-[10px]">
                        {device.isBLE ? 'BLE' : 'Classic'}
                      </Badge>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-1 max-w-[120px]">
                        <Factory className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{device.manufacturer}</span>
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{device.rssi} dBm</span>
                        <Badge variant="outline" className={`${signalInfo.color} text-[10px]`}>
                          {signalInfo.label}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-1">
                        <Ruler className="w-3 h-3 text-muted-foreground" />
                        {device.distance}
                      </div>
                    </td>
                    <td className="py-2 px-2 max-w-[150px]">
                      {device.uuids.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {device.uuids.slice(0, 2).map((uuid, i) => (
                            <Badge key={i} variant="outline" className="text-[9px] font-mono truncate max-w-[100px]">
                              {uuid.length > 8 ? `${uuid.substring(0, 8)}...` : uuid}
                            </Badge>
                          ))}
                          {device.uuids.length > 2 && (
                            <Badge variant="outline" className="text-[9px]">
                              +{device.uuids.length - 2}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

// ADS-B Receiver View Component
const AdsbReceiverView = ({ readings }: { readings: SensorReading[] }) => {
  const aircraft = useMemo(() => {
    const aircraftMap = new Map<string, {
      icao: string;
      callsign: string;
      altitude: number | undefined;
      speed: number | undefined;
      heading: number | undefined;
      latitude: number | undefined;
      longitude: number | undefined;
      verticalRate?: number;
      squawk?: string;
      category?: string;
      lastSeen: string;
      messageCount: number;
    }>();
    
    readings.forEach(r => {
      const data = r.data || {};
      // Handle aircraft array or individual readings
      const aircraftData = data.aircraft || data.planes || data.contacts || [data];
      const items = Array.isArray(aircraftData) ? aircraftData : [aircraftData];
      
      items.forEach((a: Record<string, unknown>) => {
        const icao = (a.icao || a.hex || a.icao24 || a.mode_s || '') as string;
        if (!icao) return;
        
        const existing = aircraftMap.get(icao);
        const messageCount = (existing?.messageCount || 0) + 1;
        
        aircraftMap.set(icao, {
          icao: icao.toUpperCase(),
          callsign: (a.callsign || a.flight || a.ident || '—').toString().trim() || '—',
          altitude: (a.altitude ?? a.alt_baro ?? a.alt) as number | undefined,
          speed: (a.speed ?? a.gs ?? a.ground_speed) as number | undefined,
          heading: (a.heading ?? a.track ?? a.true_heading) as number | undefined,
          latitude: (a.lat ?? a.latitude) as number | undefined,
          longitude: (a.lon ?? a.longitude ?? a.lng) as number | undefined,
          verticalRate: (a.vertical_rate ?? a.vert_rate ?? a.baro_rate) as number | undefined,
          squawk: (a.squawk) as string | undefined,
          category: (a.category ?? a.cat) as string | undefined,
          lastSeen: r.timestamp,
          messageCount,
        });
      });
    });
    
    return Array.from(aircraftMap.values())
      .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
  }, [readings]);

  if (aircraft.length === 0) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="py-8 text-center">
          <Plane className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">No aircraft detected</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Plane className="w-4 h-4 text-cyan-400" />
          Tracked Aircraft ({aircraft.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">ICAO</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Callsign</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Altitude</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Speed</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Heading</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Position</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">V/S</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Squawk</th>
              </tr>
            </thead>
            <tbody>
              {aircraft.map((plane, idx) => (
                <tr key={idx} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-2 px-2 font-mono font-medium text-cyan-400">{plane.icao}</td>
                  <td className="py-2 px-2 font-mono">
                    {plane.callsign !== '—' ? (
                      <Badge variant="outline">{plane.callsign}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-muted-foreground" />
                      {formatAltitude(plane.altitude)}
                    </div>
                  </td>
                  <td className="py-2 px-2 font-mono">{formatSpeed(plane.speed)}</td>
                  <td className="py-2 px-2">
                    {plane.heading ? (
                      <div className="flex items-center gap-1">
                        <Compass className="w-3 h-3 text-muted-foreground" />
                        {plane.heading.toFixed(0)}°
                      </div>
                    ) : '—'}
                  </td>
                  <td className="py-2 px-2 font-mono text-[10px]">
                    {plane.latitude && plane.longitude ? (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-success" />
                        {plane.latitude.toFixed(4)}, {plane.longitude.toFixed(4)}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No position</span>
                    )}
                  </td>
                  <td className="py-2 px-2 font-mono">
                    {plane.verticalRate ? (
                      <span className={plane.verticalRate > 0 ? 'text-success' : 'text-destructive'}>
                        {plane.verticalRate > 0 ? '+' : ''}{plane.verticalRate} fpm
                      </span>
                    ) : '—'}
                  </td>
                  <td className="py-2 px-2">
                    {plane.squawk ? (
                      <Badge 
                        variant="outline" 
                        className={
                          plane.squawk === '7700' ? 'text-destructive border-destructive' :
                          plane.squawk === '7600' ? 'text-warning border-warning' :
                          plane.squawk === '7500' ? 'text-destructive border-destructive' :
                          ''
                        }
                      >
                        {plane.squawk}
                      </Badge>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

// Arduino Sensor View Component (prettier display)
const ArduinoSensorView = ({ readings, latestReading }: { readings: SensorReading[]; latestReading: SensorReading }) => {
  const sensorData = useMemo(() => {
    const data = latestReading?.data || {};
    return {
      temperature: data.temperature ?? data.temp_c ?? data.temp,
      humidity: data.humidity ?? data.hum,
      pressure: data.pressure ?? data.bmp_pressure,
      bmpTemp: data.bmp_temp ?? data.bmp_temperature,
      light: data.light ?? data.lux ?? data.ambient_light,
      sound: data.sound ?? data.sound_level ?? data.noise,
      potentiometer: data.potentiometer ?? data.pot ?? data.analog,
      accelX: data.accel_x ?? data.ax ?? data.accelerometer_x,
      accelY: data.accel_y ?? data.ay ?? data.accelerometer_y,
      accelZ: data.accel_z ?? data.az ?? data.accelerometer_z,
    };
  }, [latestReading]);

  const categories = [
    {
      title: 'Environmental',
      icon: <Thermometer className="w-4 h-4" />,
      color: 'text-amber-400',
      metrics: [
        { label: 'Temperature', value: sensorData.temperature, unit: '°C', icon: <Thermometer className="w-4 h-4" /> },
        { label: 'Humidity', value: sensorData.humidity, unit: '%', icon: <Droplets className="w-4 h-4" /> },
        { label: 'Pressure', value: sensorData.pressure, unit: 'hPa', icon: <Gauge className="w-4 h-4" /> },
        { label: 'BMP Temp', value: sensorData.bmpTemp, unit: '°C', icon: <Thermometer className="w-4 h-4" /> },
      ].filter(m => m.value !== undefined),
    },
    {
      title: 'Light & Sound',
      icon: <Sun className="w-4 h-4" />,
      color: 'text-yellow-400',
      metrics: [
        { label: 'Light Level', value: sensorData.light, unit: '', icon: <Sun className="w-4 h-4" /> },
        { label: 'Sound Level', value: sensorData.sound, unit: '', icon: <Volume2 className="w-4 h-4" /> },
        { label: 'Potentiometer', value: sensorData.potentiometer, unit: '', icon: <Settings className="w-4 h-4" /> },
      ].filter(m => m.value !== undefined),
    },
    {
      title: 'Accelerometer',
      icon: <Activity className="w-4 h-4" />,
      color: 'text-blue-400',
      metrics: [
        { label: 'X-Axis', value: sensorData.accelX, unit: 'g', icon: <Activity className="w-4 h-4" /> },
        { label: 'Y-Axis', value: sensorData.accelY, unit: 'g', icon: <Activity className="w-4 h-4" /> },
        { label: 'Z-Axis', value: sensorData.accelZ, unit: 'g', icon: <Activity className="w-4 h-4" /> },
      ].filter(m => m.value !== undefined),
    },
  ].filter(cat => cat.metrics.length > 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {categories.map((cat) => (
        <Card key={cat.title} className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm flex items-center gap-2 ${cat.color}`}>
              {cat.icon}
              {cat.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cat.metrics.map((metric) => (
              <div key={metric.label} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 text-muted-foreground">
                  {metric.icon}
                  <span className="text-sm">{metric.label}</span>
                </div>
                <span className="font-mono font-medium">
                  {typeof metric.value === 'number' ? metric.value.toFixed(2) : String(metric.value)} {metric.unit}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Thermal Probe View Component (prettier display)
const ThermalProbeView = ({ readings, latestReading }: { readings: SensorReading[]; latestReading: SensorReading }) => {
  const thermalData = useMemo(() => {
    const data = latestReading?.data || {};
    const probe = data.probe as Record<string, unknown> || data.readings as Record<string, unknown> || data;
    
    return {
      probeTemp: probe.probe_temp_c ?? probe.temperature_c ?? probe.temp_c ?? data.probe_temp_c ?? data.temperature,
      ambientTemp: probe.ambient_temp_c ?? data.ambient_temp_c ?? data.ambient,
      objectTemp: probe.object_temp_c ?? data.object_temp ?? data.object_temperature,
      humidity: data.humidity ?? probe.humidity,
    };
  }, [latestReading]);

  const cToF = (c: number | undefined) => c !== undefined ? (c * 9/5 + 32).toFixed(1) : undefined;

  const metrics = [
    { label: 'Probe Temperature', value: thermalData.probeTemp, icon: <Thermometer className="w-5 h-5" />, color: 'from-red-500 to-orange-500' },
    { label: 'Ambient Temperature', value: thermalData.ambientTemp, icon: <Wind className="w-5 h-5" />, color: 'from-blue-500 to-cyan-500' },
    { label: 'Object Temperature', value: thermalData.objectTemp, icon: <Eye className="w-5 h-5" />, color: 'from-purple-500 to-pink-500' },
  ].filter(m => m.value !== undefined);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.label} className="bg-card/50 border-border/50 overflow-hidden">
          <div className={`h-1 bg-gradient-to-r ${metric.color}`} />
          <CardContent className="pt-4">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg bg-gradient-to-br ${metric.color} bg-opacity-20`}>
                {metric.icon}
              </div>
              <span className="text-sm text-muted-foreground">{metric.label}</span>
            </div>
            <div className="text-3xl font-bold">
              {typeof metric.value === 'number' ? metric.value.toFixed(1) : String(metric.value)}°C
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {typeof metric.value === 'number' ? cToF(metric.value) : '—'}°F
            </div>
          </CardContent>
        </Card>
      ))}
      {thermalData.humidity !== undefined && (
        <Card className="bg-card/50 border-border/50 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />
          <CardContent className="pt-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-teal-500/20 to-emerald-500/20">
                <Droplets className="w-5 h-5" />
              </div>
              <span className="text-sm text-muted-foreground">Humidity</span>
            </div>
            <div className="text-3xl font-bold">
              {typeof thermalData.humidity === 'number' ? thermalData.humidity.toFixed(1) : String(thermalData.humidity)}%
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

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

      {/* Specialized Sensor Views */}
      {sensorType.toLowerCase().includes('wifi') && (
        <WifiScannerView readings={readings} />
      )}
      
      {sensorType.toLowerCase().includes('bluetooth') && (
        <BluetoothScannerView readings={readings} />
      )}
      
      {sensorType.toLowerCase().includes('adsb') && (
        <AdsbReceiverView readings={readings} />
      )}
      
      {sensorType.toLowerCase().includes('arduino') && (
        <ArduinoSensorView readings={readings} latestReading={latestReading} />
      )}
      
      {sensorType.toLowerCase().includes('thermal') && (
        <ThermalProbeView readings={readings} latestReading={latestReading} />
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
