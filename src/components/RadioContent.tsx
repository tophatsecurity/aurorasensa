import { useState, useMemo } from "react";
import {
  Radio,
  Wifi,
  Bluetooth,
  Activity,
  Signal,
  Clock,
  Smartphone,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Laptop,
  MonitorSmartphone,
  List,
  LayoutGrid,
  Table2,
  Search,
  X,
  Plane,
  Navigation
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Legend
} from "recharts";
import { useClients, useLatestReadings, useSensorTypeStats, useAllSensorStats, useWifiScannerTimeseries, useBluetoothScannerTimeseries, useLoraDetectorTimeseries, useAdsbAircraftWithHistory, useLoraDevices, useLoraGlobalStats, useRecentLoraDetections } from "@/hooks/useAuroraApi";
import { formatDistanceToNow } from "date-fns";

// Helper function to format signal strength
const formatSignalStrength = (rssi: number | null | undefined): string => {
  if (rssi === null || rssi === undefined) return "N/A";
  if (rssi >= -50) return "Excellent";
  if (rssi >= -60) return "Good";
  if (rssi >= -70) return "Fair";
  if (rssi >= -80) return "Weak";
  return "Poor";
};

const getSignalColor = (rssi: number | null | undefined): string => {
  if (rssi === null || rssi === undefined) return "text-muted-foreground";
  if (rssi >= -50) return "text-success";
  if (rssi >= -60) return "text-aurora-green";
  if (rssi >= -70) return "text-yellow-400";
  if (rssi >= -80) return "text-orange-400";
  return "text-destructive";
};

// Device type icons
const getDeviceIcon = (deviceType: string) => {
  const type = deviceType?.toLowerCase() || "";
  if (type.includes("phone") || type.includes("mobile")) return Smartphone;
  if (type.includes("laptop") || type.includes("computer")) return Laptop;
  return MonitorSmartphone;
};

// StatCard component for radio stats
const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  color: 'cyan' | 'purple' | 'green' | 'blue';
  trend?: { value: string; positive: boolean };
}) => {
  const colorStyles = {
    cyan: {
      gradient: 'from-aurora-cyan/20 to-transparent',
      text: 'text-aurora-cyan',
      glow: 'shadow-[0_0_30px_hsl(187_100%_55%/0.2)]',
    },
    purple: {
      gradient: 'from-aurora-purple/20 to-transparent',
      text: 'text-aurora-purple',
      glow: 'shadow-[0_0_30px_hsl(280_100%_70%/0.2)]',
    },
    green: {
      gradient: 'from-aurora-green/20 to-transparent',
      text: 'text-aurora-green',
      glow: 'shadow-[0_0_30px_hsl(160_84%_50%/0.2)]',
    },
    blue: {
      gradient: 'from-aurora-blue/20 to-transparent',
      text: 'text-aurora-blue',
      glow: 'shadow-[0_0_30px_hsl(217_91%_60%/0.2)]',
    },
  };

  const styles = colorStyles[color];

  return (
    <div className={`glass-card rounded-xl p-6 hover:scale-[1.02] transition-all duration-300 ${styles.glow}`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${styles.gradient} flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${styles.text}`} />
        </div>
        {trend && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            trend.positive 
              ? 'bg-success/20 text-success' 
              : 'bg-destructive/20 text-destructive'
          }`}>
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      <h3 className="text-sm font-medium text-muted-foreground mb-1">{title}</h3>
      <p className={`text-3xl font-bold ${styles.text} mb-1`}>{value}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
};

const RadioContent = () => {
  const [mainView, setMainView] = useState<"dashboard" | "tabular">("dashboard");
  const [tabularTab, setTabularTab] = useState<"wifi" | "bluetooth" | "adsb" | "lora">("wifi");
  const [timeRange, setTimeRange] = useState("24h");
  const [selectedDevice, setSelectedDevice] = useState<string>("all");
  const [expandedSections, setExpandedSections] = useState<string[]>(["wifi", "bluetooth"]);
  const [wifiViewMode, setWifiViewMode] = useState<"cards" | "table">("table");
  const [bluetoothViewMode, setBluetoothViewMode] = useState<"cards" | "table">("table");
  const [adsbViewMode, setAdsbViewMode] = useState<"cards" | "table">("table");
  const [loraViewMode, setLoraViewMode] = useState<"cards" | "table">("table");
  const [wifiSearch, setWifiSearch] = useState("");
  const [bluetoothSearch, setBluetoothSearch] = useState("");
  const [adsbSearch, setAdsbSearch] = useState("");
  const [loraSearch, setLoraSearch] = useState("");
  
  // Convert timeRange to hours for API calls
  const hoursForTimeRange = useMemo(() => {
    switch (timeRange) {
      case "1h": return 1;
      case "6h": return 6;
      case "24h": return 24;
      case "7d": return 168;
      default: return 24;
    }
  }, [timeRange]);
  
  // Fetch data - using correct sensor type names from API
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: latestReadings, isLoading: readingsLoading, refetch: refetchReadings } = useLatestReadings();
  const { data: allSensorStats, isLoading: statsLoading } = useAllSensorStats();
  const { data: wifiStats } = useSensorTypeStats("wifi_scanner");
  const { data: bluetoothStats } = useSensorTypeStats("bluetooth_scanner");
  
  // Fetch timeseries data
  const { data: wifiTimeseries, isLoading: wifiTimeseriesLoading } = useWifiScannerTimeseries(hoursForTimeRange);
  const { data: bluetoothTimeseries, isLoading: bluetoothTimeseriesLoading } = useBluetoothScannerTimeseries(hoursForTimeRange);
  const { data: loraTimeseries, isLoading: loraTimeseriesLoading } = useLoraDetectorTimeseries(hoursForTimeRange);
  
  // Fetch LoRa devices and stats from dedicated API endpoints
  const { data: loraDevices, isLoading: loraDevicesLoading } = useLoraDevices();
  const { data: loraGlobalStats, isLoading: loraGlobalStatsLoading } = useLoraGlobalStats();
  const { data: recentLoraDetections, isLoading: recentLoraDetectionsLoading } = useRecentLoraDetections();
  
  // Fetch ADSB data
  const { aircraft: adsbAircraft, isLoading: adsbLoading } = useAdsbAircraftWithHistory(hoursForTimeRange * 60);

  // Get unique devices from readings - fixed to match actual device_type values
  const availableDevices = useMemo(() => {
    const deviceSet = new Set<string>();
    
    latestReadings?.forEach(reading => {
      const deviceType = reading.device_type?.toLowerCase() || '';
      if (deviceType === 'wifi_scanner' || 
          deviceType === 'bluetooth_scanner' ||
          deviceType.includes('wifi') ||
          deviceType.includes('bluetooth') ||
          deviceType.includes('ble')) {
        deviceSet.add(reading.device_id);
      }
    });
    
    return Array.from(deviceSet).sort();
  }, [latestReadings]);

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  // Process WiFi readings from latest readings (filtered by device) - fixed matching
  const wifiReadings = useMemo(() => {
    if (!latestReadings) return [];
    return latestReadings.filter(r => {
      const deviceType = r.device_type?.toLowerCase() || '';
      const isWifi = deviceType === 'wifi_scanner' || deviceType.includes('wifi');
      const matchesDevice = selectedDevice === "all" || r.device_id === selectedDevice;
      return isWifi && matchesDevice;
    });
  }, [latestReadings, selectedDevice]);

  // Process Bluetooth/BLE readings from latest readings (filtered by device) - fixed matching
  const bluetoothReadings = useMemo(() => {
    if (!latestReadings) return [];
    return latestReadings.filter(r => {
      const deviceType = r.device_type?.toLowerCase() || '';
      const isBluetooth = deviceType === 'bluetooth_scanner' || 
                          deviceType.includes('bluetooth') ||
                          deviceType.includes('ble');
      const matchesDevice = selectedDevice === "all" || r.device_id === selectedDevice;
      return isBluetooth && matchesDevice;
    });
  }, [latestReadings, selectedDevice]);

  // Extract WiFi networks from readings
  const wifiNetworks = useMemo(() => {
    const networks: Array<{
      ssid: string;
      bssid: string;
      rssi: number;
      channel?: number;
      security?: string;
      lastSeen: string;
      deviceId: string;
    }> = [];

    wifiReadings.forEach(reading => {
      const data = reading.data as Record<string, unknown>;
      // Handle different data structures
      if (data.networks && Array.isArray(data.networks)) {
        (data.networks as Array<Record<string, unknown>>).forEach(network => {
          networks.push({
            ssid: String(network.ssid || 'Unknown'),
            bssid: String(network.bssid || network.mac || ''),
            rssi: Number(network.rssi || network.signal_strength || -100),
            channel: network.channel as number | undefined,
            security: String(network.security || network.encryption || 'Unknown'),
            lastSeen: reading.timestamp,
            deviceId: reading.device_id,
          });
        });
      } else if (data.ssid) {
        networks.push({
          ssid: String(data.ssid),
          bssid: String(data.bssid || data.mac || ''),
          rssi: Number(data.rssi || data.signal_strength || -100),
          channel: data.channel as number | undefined,
          security: String(data.security || data.encryption || 'Unknown'),
          lastSeen: reading.timestamp,
          deviceId: reading.device_id,
        });
      }
    });

    // Deduplicate by BSSID, keeping the most recent
    const networkMap = new Map<string, typeof networks[0]>();
    networks.forEach(network => {
      const key = network.bssid || network.ssid;
      const existing = networkMap.get(key);
      if (!existing || new Date(network.lastSeen) > new Date(existing.lastSeen)) {
        networkMap.set(key, network);
      }
    });

    return Array.from(networkMap.values()).sort((a, b) => b.rssi - a.rssi);
  }, [wifiReadings]);

  // Extract BLE devices from readings
  const bleDevices = useMemo(() => {
    const devices: Array<{
      name: string;
      mac: string;
      rssi: number;
      type?: string;
      lastSeen: string;
      deviceId: string;
      manufacturer?: string;
      services?: string[];
    }> = [];

    bluetoothReadings.forEach(reading => {
      const data = reading.data as Record<string, unknown>;
      // Handle different data structures
      if (data.devices && Array.isArray(data.devices)) {
        (data.devices as Array<Record<string, unknown>>).forEach(device => {
          devices.push({
            name: String(device.name || device.local_name || 'Unknown Device'),
            mac: String(device.mac || device.address || ''),
            rssi: Number(device.rssi || device.signal_strength || -100),
            type: device.type as string | undefined,
            lastSeen: reading.timestamp,
            deviceId: reading.device_id,
            manufacturer: device.manufacturer as string | undefined,
            services: device.services as string[] | undefined,
          });
        });
      } else if (data.mac || data.address) {
        devices.push({
          name: String(data.name || data.local_name || 'Unknown Device'),
          mac: String(data.mac || data.address || ''),
          rssi: Number(data.rssi || data.signal_strength || -100),
          type: data.type as string | undefined,
          lastSeen: reading.timestamp,
          deviceId: reading.device_id,
          manufacturer: data.manufacturer as string | undefined,
          services: data.services as string[] | undefined,
        });
      }
    });

    // Deduplicate by MAC, keeping the most recent
    const deviceMap = new Map<string, typeof devices[0]>();
    devices.forEach(device => {
      const key = device.mac || device.name;
      const existing = deviceMap.get(key);
      if (!existing || new Date(device.lastSeen) > new Date(existing.lastSeen)) {
        deviceMap.set(key, device);
      }
    });

    return Array.from(deviceMap.values()).sort((a, b) => b.rssi - a.rssi);
  }, [bluetoothReadings]);

  // Filtered WiFi networks based on search
  const filteredWifiNetworks = useMemo(() => {
    if (!wifiSearch.trim()) return wifiNetworks;
    const searchLower = wifiSearch.toLowerCase().trim();
    return wifiNetworks.filter(network =>
      (network.ssid?.toLowerCase().includes(searchLower)) ||
      (network.bssid?.toLowerCase().includes(searchLower)) ||
      (network.deviceId?.toLowerCase().includes(searchLower)) ||
      (network.security?.toLowerCase().includes(searchLower))
    );
  }, [wifiNetworks, wifiSearch]);

  // Filtered BLE devices based on search
  const filteredBleDevices = useMemo(() => {
    if (!bluetoothSearch.trim()) return bleDevices;
    const searchLower = bluetoothSearch.toLowerCase().trim();
    return bleDevices.filter(device =>
      (device.name?.toLowerCase().includes(searchLower)) ||
      (device.mac?.toLowerCase().includes(searchLower)) ||
      (device.deviceId?.toLowerCase().includes(searchLower)) ||
      (device.manufacturer?.toLowerCase().includes(searchLower))
    );
  }, [bleDevices, bluetoothSearch]);

  // Process LoRa readings from latest readings AND timeseries
  const loraReadings = useMemo(() => {
    const readings: Array<{device_id: string; device_type: string; timestamp: string; data: Record<string, unknown>}> = [];
    
    // Add from latest readings
    if (latestReadings) {
      latestReadings.forEach(r => {
        const deviceType = r.device_type?.toLowerCase() || '';
        const isLora = deviceType === 'lora_detector' || deviceType.includes('lora');
        const matchesDevice = selectedDevice === "all" || r.device_id === selectedDevice;
        if (isLora && matchesDevice) {
          readings.push({
            device_id: r.device_id,
            device_type: r.device_type,
            timestamp: r.timestamp,
            data: r.data as Record<string, unknown>
          });
        }
      });
    }
    
    // Add from timeseries (these are historical readings)
    if (loraTimeseries?.readings) {
      loraTimeseries.readings.forEach(r => {
        const matchesDevice = selectedDevice === "all" || r.device_id === selectedDevice;
        if (matchesDevice) {
          readings.push({
            device_id: r.device_id || 'unknown',
            device_type: 'lora_detector',
            timestamp: r.timestamp,
            data: {
              frequency: r.frequency,
              rssi: r.rssi,
              snr: r.snr,
              bandwidth: r.bandwidth,
              spreading_factor: r.spreading_factor,
              payload: r.payload,
              packet_count: r.packet_count,
              packets_detected: r.packets_detected,
            }
          });
        }
      });
    }
    
    return readings;
  }, [latestReadings, loraTimeseries, selectedDevice]);

  // Extract LoRa packets from readings
  const loraPackets = useMemo(() => {
    const packets: Array<{
      deviceId: string;
      frequency?: number;
      rssi: number;
      snr?: number;
      bandwidth?: number;
      spreadingFactor?: number;
      payload?: string;
      packetsDetected?: number;
      lastSeen: string;
    }> = [];

    // Dedupe by timestamp to avoid duplicates between latest and timeseries
    const seenTimestamps = new Set<string>();
    
    loraReadings.forEach(reading => {
      const key = `${reading.device_id}-${reading.timestamp}`;
      if (seenTimestamps.has(key)) return;
      seenTimestamps.add(key);
      
      const data = reading.data;
      packets.push({
        deviceId: reading.device_id,
        frequency: data.frequency as number | undefined,
        rssi: Number(data.rssi || data.signal_strength || -100),
        snr: data.snr as number | undefined,
        bandwidth: data.bandwidth as number | undefined,
        spreadingFactor: data.spreading_factor as number | undefined,
        payload: data.payload as string | undefined,
        packetsDetected: data.packets_detected as number | undefined,
        lastSeen: reading.timestamp,
      });
    });

    return packets.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
  }, [loraReadings]);

  // Filtered ADSB aircraft based on search
  const filteredAdsbAircraft = useMemo(() => {
    const aircraft = adsbAircraft || [];
    if (!adsbSearch.trim()) return aircraft;
    const searchLower = adsbSearch.toLowerCase().trim();
    return aircraft.filter(ac =>
      (ac.hex?.toLowerCase().includes(searchLower)) ||
      (ac.flight?.toLowerCase().includes(searchLower)) ||
      (ac.registration?.toLowerCase().includes(searchLower)) ||
      (ac.operator?.toLowerCase().includes(searchLower)) ||
      (ac.type?.toLowerCase().includes(searchLower))
    );
  }, [adsbAircraft, adsbSearch]);

  // Filtered LoRa packets based on search
  const filteredLoraPackets = useMemo(() => {
    if (!loraSearch.trim()) return loraPackets;
    const searchLower = loraSearch.toLowerCase().trim();
    return loraPackets.filter(packet =>
      (packet.deviceId?.toLowerCase().includes(searchLower)) ||
      (packet.payload?.toLowerCase().includes(searchLower))
    );
  }, [loraPackets, loraSearch]);

  // Calculate overall stats
  const overallStats = useMemo(() => {
    const wifiCount = wifiStats?.device_count || wifiReadings.length;
    const bleCount = bluetoothStats?.device_count || bluetoothReadings.length;
    const totalNetworks = wifiNetworks.length;
    const totalBleDevices = bleDevices.length;

    return {
      wifiScanners: wifiCount,
      bleScanners: bleCount,
      wifiNetworks: totalNetworks,
      bleDevicesDetected: totalBleDevices,
      avgWifiRssi: wifiNetworks.length > 0 
        ? Math.round(wifiNetworks.reduce((sum, n) => sum + n.rssi, 0) / wifiNetworks.length)
        : null,
      avgBleRssi: bleDevices.length > 0
        ? Math.round(bleDevices.reduce((sum, d) => sum + d.rssi, 0) / bleDevices.length)
        : null,
    };
  }, [wifiStats, bluetoothStats, wifiReadings, bluetoothReadings, wifiNetworks, bleDevices]);

  // Process timeseries data for charts using real API data
  const chartData = useMemo(() => {
    const wifiData = wifiTimeseries?.readings || [];
    const bleData = bluetoothTimeseries?.readings || [];
    
    // Group readings by hour buckets
    const buckets: Record<string, { wifiCount: number; bleCount: number; wifiRssiSum: number; wifiRssiCount: number; bleRssiSum: number; bleRssiCount: number }> = {};
    
    // Get the time interval based on timeRange
    const intervalMs = timeRange === "1h" ? 5 * 60 * 1000 : // 5 min intervals
                       timeRange === "6h" ? 30 * 60 * 1000 : // 30 min intervals
                       timeRange === "24h" ? 60 * 60 * 1000 : // 1 hour intervals
                       4 * 60 * 60 * 1000; // 4 hour intervals for 7d
    
    // Process WiFi readings
    wifiData.forEach(reading => {
      const timestamp = new Date(reading.timestamp).getTime();
      const bucketKey = Math.floor(timestamp / intervalMs) * intervalMs;
      if (!buckets[bucketKey]) {
        buckets[bucketKey] = { wifiCount: 0, bleCount: 0, wifiRssiSum: 0, wifiRssiCount: 0, bleRssiSum: 0, bleRssiCount: 0 };
      }
      buckets[bucketKey].wifiCount++;
      if (reading.rssi != null) {
        buckets[bucketKey].wifiRssiSum += reading.rssi;
        buckets[bucketKey].wifiRssiCount++;
      }
    });
    
    // Process Bluetooth readings
    bleData.forEach(reading => {
      const timestamp = new Date(reading.timestamp).getTime();
      const bucketKey = Math.floor(timestamp / intervalMs) * intervalMs;
      if (!buckets[bucketKey]) {
        buckets[bucketKey] = { wifiCount: 0, bleCount: 0, wifiRssiSum: 0, wifiRssiCount: 0, bleRssiSum: 0, bleRssiCount: 0 };
      }
      buckets[bucketKey].bleCount++;
      if (reading.rssi != null) {
        buckets[bucketKey].bleRssiSum += reading.rssi;
        buckets[bucketKey].bleRssiCount++;
      }
    });
    
    // Convert buckets to chart data array
    const sortedKeys = Object.keys(buckets).map(Number).sort((a, b) => a - b);
    
    // If no real data, show empty state
    if (sortedKeys.length === 0) {
      // Return placeholder data for empty state
      const now = new Date();
      const numBuckets = timeRange === "1h" ? 12 : timeRange === "6h" ? 12 : timeRange === "24h" ? 24 : 42;
      return Array.from({ length: numBuckets }, (_, i) => {
        const time = new Date(now.getTime() - (numBuckets - 1 - i) * intervalMs);
        return {
          time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          wifiNetworks: 0,
          bleDevices: 0,
          avgWifiRssi: null,
          avgBleRssi: null,
        };
      });
    }
    
    return sortedKeys.map(key => {
      const bucket = buckets[key];
      const time = new Date(key);
      const formatOptions: Intl.DateTimeFormatOptions = timeRange === "7d" 
        ? { month: 'short', day: 'numeric', hour: '2-digit' }
        : { hour: '2-digit', minute: '2-digit' };
      
      return {
        time: time.toLocaleString([], formatOptions),
        wifiNetworks: bucket.wifiCount,
        bleDevices: bucket.bleCount,
        avgWifiRssi: bucket.wifiRssiCount > 0 ? Math.round(bucket.wifiRssiSum / bucket.wifiRssiCount) : null,
        avgBleRssi: bucket.bleRssiCount > 0 ? Math.round(bucket.bleRssiSum / bucket.bleRssiCount) : null,
      };
    });
  }, [wifiTimeseries, bluetoothTimeseries, timeRange]);

  const isLoading = clientsLoading || readingsLoading || statsLoading;
  const isTimeseriesLoading = wifiTimeseriesLoading || bluetoothTimeseriesLoading;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-aurora-purple to-aurora-cyan flex items-center justify-center">
            <Radio className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Radio Analytics</h1>
            <p className="text-sm text-muted-foreground">BLE/Bluetooth and WiFi Monitoring</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={selectedDevice} onValueChange={setSelectedDevice}>
            <SelectTrigger className="w-44 bg-background">
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent className="bg-background border border-border z-50">
              <SelectItem value="all">All Clients</SelectItem>
              {availableDevices.map(device => (
                <SelectItem key={device} value={device}>
                  {device}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32 bg-background">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent className="bg-background border border-border z-50">
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="6h">Last 6 Hours</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetchReadings()}>
            <RefreshCw className={`w-4 h-4 mr-2 ${readingsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {isLoading ? (
              <>
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-36 rounded-xl" />
                ))}
              </>
            ) : (
              <>
                <StatCard
                  title="WiFi Networks"
                  value={overallStats.wifiNetworks}
                  subtitle="Detected access points"
                  icon={Wifi}
                  color="cyan"
                />
                <StatCard
                  title="BLE Devices"
                  value={overallStats.bleDevicesDetected}
                  subtitle="Bluetooth devices found"
                  icon={Bluetooth}
                  color="purple"
                />
                <StatCard
                  title="Avg WiFi Signal"
                  value={overallStats.avgWifiRssi !== null ? `${overallStats.avgWifiRssi} dBm` : 'N/A'}
                  subtitle={formatSignalStrength(overallStats.avgWifiRssi)}
                  icon={Signal}
                  color="green"
                />
                <StatCard
                  title="Avg BLE Signal"
                  value={overallStats.avgBleRssi !== null ? `${overallStats.avgBleRssi} dBm` : 'N/A'}
                  subtitle={formatSignalStrength(overallStats.avgBleRssi)}
                  icon={Activity}
                  color="blue"
                />
              </>
            )}
          </div>

          {/* Main View Toggle */}
          <Tabs value={mainView} onValueChange={(v) => setMainView(v as "dashboard" | "tabular")}>
            <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
              <TabsTrigger value="dashboard" className="gap-2">
                <LayoutGrid className="w-4 h-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="tabular" className="gap-2">
                <Table2 className="w-4 h-4" />
                Tabular View
              </TabsTrigger>
            </TabsList>

            {/* Dashboard View */}
            <TabsContent value="dashboard" className="space-y-6">
              {/* Activity Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-aurora-cyan" />
                    Radio Activity Over Time
                    {isTimeseriesLoading && <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isTimeseriesLoading ? (
                    <Skeleton className="h-80 w-full" />
                  ) : (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="wifiGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(187, 100%, 55%)" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(187, 100%, 55%)" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="bleGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(280, 100%, 70%)" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(280, 100%, 70%)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Legend />
                          <Area 
                            type="monotone" 
                            dataKey="wifiNetworks" 
                            stroke="hsl(187, 100%, 55%)" 
                            fill="url(#wifiGradient)"
                            name="WiFi Readings"
                          />
                          <Area 
                            type="monotone" 
                            dataKey="bleDevices" 
                            stroke="hsl(280, 100%, 70%)" 
                            fill="url(#bleGradient)"
                            name="BLE Readings"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Signal Strength Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Signal className="w-5 h-5 text-aurora-green" />
                    Signal Strength Over Time (dBm)
                    {isTimeseriesLoading && <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isTimeseriesLoading ? (
                    <Skeleton className="h-64 w-full" />
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis 
                            stroke="hsl(var(--muted-foreground))" 
                            fontSize={12}
                            domain={[-100, -30]}
                            tickFormatter={(value) => `${value}`}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                            formatter={(value: number | null) => value != null ? `${value} dBm` : 'N/A'}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="avgWifiRssi" 
                            stroke="hsl(187, 100%, 55%)" 
                            strokeWidth={2}
                            dot={false}
                            name="WiFi RSSI"
                            connectNulls
                          />
                          <Line 
                            type="monotone" 
                            dataKey="avgBleRssi" 
                            stroke="hsl(280, 100%, 70%)" 
                            strokeWidth={2}
                            dot={false}
                            name="BLE RSSI"
                            connectNulls
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick View Sections */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* WiFi Quick View */}
                <Collapsible 
                  open={expandedSections.includes("wifi")} 
                  onOpenChange={() => toggleSection("wifi")}
                >
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <CardTitle className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Wifi className="w-5 h-5 text-aurora-cyan" />
                            WiFi Networks ({wifiNetworks.length})
                          </span>
                          {expandedSections.includes("wifi") ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </CardTitle>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent>
                        {wifiNetworks.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Wifi className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No WiFi networks detected</p>
                            <p className="text-sm">WiFi scanners may be offline</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {wifiNetworks.slice(0, 5).map((network, index) => (
                              <div 
                                key={`${network.bssid}-${index}`}
                                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                              >
                                <div className="flex items-center gap-3">
                                  <Wifi className={`w-4 h-4 ${getSignalColor(network.rssi)}`} />
                                  <div>
                                    <p className="font-medium">{network.ssid || 'Hidden Network'}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {network.bssid} • Ch {network.channel || 'N/A'}
                                    </p>
                                    <p className="text-xs text-aurora-cyan">
                                      Sensor: {network.deviceId}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className={`font-medium ${getSignalColor(network.rssi)}`}>
                                    {network.rssi} dBm
                                  </p>
                                  <Badge variant="outline" className="text-xs">
                                    {network.security}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                            {wifiNetworks.length > 5 && (
                              <Button 
                                variant="ghost" 
                                className="w-full" 
                                onClick={() => { setMainView("tabular"); setTabularTab("wifi"); }}
                              >
                                View all {wifiNetworks.length} networks
                              </Button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

                {/* Bluetooth Quick View */}
                <Collapsible 
                  open={expandedSections.includes("bluetooth")} 
                  onOpenChange={() => toggleSection("bluetooth")}
                >
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <CardTitle className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Bluetooth className="w-5 h-5 text-aurora-purple" />
                            BLE Devices ({bleDevices.length})
                          </span>
                          {expandedSections.includes("bluetooth") ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </CardTitle>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent>
                        {bleDevices.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Bluetooth className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No BLE devices detected</p>
                            <p className="text-sm">Bluetooth scanners may be offline</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {bleDevices.slice(0, 5).map((device, index) => {
                              const DeviceIcon = getDeviceIcon(device.type || '');
                              return (
                                <div 
                                  key={`${device.mac}-${index}`}
                                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                                >
                                  <div className="flex items-center gap-3">
                                    <DeviceIcon className={`w-4 h-4 ${getSignalColor(device.rssi)}`} />
                                    <div>
                                      <p className="font-medium">{device.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {device.mac}
                                      </p>
                                      <p className="text-xs text-aurora-purple">
                                        Sensor: {device.deviceId}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className={`font-medium ${getSignalColor(device.rssi)}`}>
                                      {device.rssi} dBm
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatDistanceToNow(new Date(device.lastSeen), { addSuffix: true })}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                            {bleDevices.length > 5 && (
                              <Button 
                                variant="ghost" 
                                className="w-full" 
                                onClick={() => { setMainView("tabular"); setTabularTab("bluetooth"); }}
                              >
                                View all {bleDevices.length} devices
                              </Button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              </div>

              {/* Signal Distribution Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* WiFi Signal Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Signal className="w-5 h-5 text-aurora-cyan" />
                      WiFi Signal Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { range: 'Excellent', count: wifiNetworks.filter(n => n.rssi >= -50).length },
                          { range: 'Good', count: wifiNetworks.filter(n => n.rssi >= -60 && n.rssi < -50).length },
                          { range: 'Fair', count: wifiNetworks.filter(n => n.rssi >= -70 && n.rssi < -60).length },
                          { range: 'Weak', count: wifiNetworks.filter(n => n.rssi >= -80 && n.rssi < -70).length },
                          { range: 'Poor', count: wifiNetworks.filter(n => n.rssi < -80).length },
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="range" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Bar dataKey="count" fill="hsl(187, 100%, 55%)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* BLE Signal Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Signal className="w-5 h-5 text-aurora-purple" />
                      BLE Signal Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { range: 'Excellent', count: bleDevices.filter(d => d.rssi >= -50).length },
                          { range: 'Good', count: bleDevices.filter(d => d.rssi >= -60 && d.rssi < -50).length },
                          { range: 'Fair', count: bleDevices.filter(d => d.rssi >= -70 && d.rssi < -60).length },
                          { range: 'Weak', count: bleDevices.filter(d => d.rssi >= -80 && d.rssi < -70).length },
                          { range: 'Poor', count: bleDevices.filter(d => d.rssi < -80).length },
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="range" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Bar dataKey="count" fill="hsl(280, 100%, 70%)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tabular View */}
            <TabsContent value="tabular" className="space-y-6">
              <Tabs value={tabularTab} onValueChange={(v) => setTabularTab(v as "wifi" | "bluetooth" | "adsb" | "lora")}>
                <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
                  <TabsTrigger value="wifi" className="gap-2">
                    <Wifi className="w-4 h-4" />
                    WiFi ({wifiNetworks.length})
                  </TabsTrigger>
                  <TabsTrigger value="bluetooth" className="gap-2">
                    <Bluetooth className="w-4 h-4" />
                    Bluetooth ({bleDevices.length})
                  </TabsTrigger>
                  <TabsTrigger value="adsb" className="gap-2">
                    <Plane className="w-4 h-4" />
                    ADS-B ({adsbAircraft?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="lora" className="gap-2">
                    <Radio className="w-4 h-4" />
                    LoRa ({loraPackets.length})
                  </TabsTrigger>
                </TabsList>

                {/* WiFi Tab */}
                <TabsContent value="wifi" className="space-y-6">
                  <Card>
                    <CardHeader className="space-y-4">
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Wifi className="w-5 h-5 text-aurora-cyan" />
                          All WiFi Networks ({filteredWifiNetworks.length}{wifiSearch && ` of ${wifiNetworks.length}`})
                        </span>
                        <div className="flex items-center gap-1 border rounded-lg p-1">
                          <Button
                            variant={wifiViewMode === "cards" ? "secondary" : "ghost"}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setWifiViewMode("cards")}
                          >
                            <LayoutGrid className="w-4 h-4" />
                          </Button>
                          <Button
                            variant={wifiViewMode === "table" ? "secondary" : "ghost"}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setWifiViewMode("table")}
                          >
                            <Table2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardTitle>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by SSID, BSSID, or device..."
                          value={wifiSearch}
                          onChange={(e) => setWifiSearch(e.target.value)}
                          className="pl-10 pr-10 bg-background"
                        />
                        {wifiSearch && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                            onClick={() => setWifiSearch("")}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {wifiNetworks.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <Wifi className="w-16 h-16 mx-auto mb-4 opacity-50" />
                          <h3 className="text-lg font-medium mb-2">No WiFi Networks Detected</h3>
                          <p>WiFi scanning devices may be offline or not configured.</p>
                        </div>
                      ) : filteredWifiNetworks.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No networks match "{wifiSearch}"</p>
                          <Button variant="ghost" size="sm" onClick={() => setWifiSearch("")} className="mt-2">
                            Clear search
                          </Button>
                        </div>
                      ) : wifiViewMode === "table" ? (
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>SSID</TableHead>
                                <TableHead>BSSID</TableHead>
                                <TableHead>Channel</TableHead>
                                <TableHead>Security</TableHead>
                                <TableHead>Signal</TableHead>
                                <TableHead>Quality</TableHead>
                                <TableHead>Device</TableHead>
                                <TableHead>Last Seen</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredWifiNetworks.map((network, index) => (
                                <TableRow key={`${network.bssid}-${index}`}>
                                  <TableCell className="font-medium">
                                    {network.ssid || 'Hidden Network'}
                                  </TableCell>
                                  <TableCell className="font-mono text-xs">
                                    {network.bssid}
                                  </TableCell>
                                  <TableCell>{network.channel || 'N/A'}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-xs">
                                      {network.security}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <span className={`font-medium ${getSignalColor(network.rssi)}`}>
                                      {network.rssi} dBm
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <Badge 
                                      variant="secondary" 
                                      className={`text-xs ${
                                        network.rssi >= -50 ? 'bg-success/20 text-success' :
                                        network.rssi >= -70 ? 'bg-yellow-500/20 text-yellow-600' :
                                        'bg-destructive/20 text-destructive'
                                      }`}
                                    >
                                      {formatSignalStrength(network.rssi)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="secondary" className="text-xs bg-aurora-cyan/20 text-aurora-cyan">
                                      {network.deviceId}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(network.lastSeen), { addSuffix: true })}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {filteredWifiNetworks.map((network, index) => (
                            <div 
                              key={`${network.bssid}-${index}`}
                              className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                <div className="relative">
                                  <Wifi className={`w-8 h-8 ${getSignalColor(network.rssi)}`} />
                                  {network.rssi >= -60 && (
                                    <CheckCircle2 className="w-3 h-3 text-success absolute -bottom-1 -right-1" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-semibold text-lg">{network.ssid || 'Hidden Network'}</p>
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                      <span>{network.bssid}</span>
                                      <span>•</span>
                                      <span>Channel {network.channel || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge variant="secondary" className="text-xs bg-aurora-cyan/20 text-aurora-cyan border-aurora-cyan/30">
                                        Device: {network.deviceId}
                                      </Badge>
                                      <Badge variant="outline" className="text-xs">
                                        wifi_scanner
                                      </Badge>
                                    </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-2 mb-1">
                                  <Signal className={`w-4 h-4 ${getSignalColor(network.rssi)}`} />
                                  <span className={`font-bold text-lg ${getSignalColor(network.rssi)}`}>
                                    {network.rssi} dBm
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{network.security}</Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {formatSignalStrength(network.rssi)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Bluetooth Tab */}
                <TabsContent value="bluetooth" className="space-y-6">
                  <Card>
                    <CardHeader className="space-y-4">
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Bluetooth className="w-5 h-5 text-aurora-purple" />
                          All BLE Devices ({filteredBleDevices.length}{bluetoothSearch && ` of ${bleDevices.length}`})
                        </span>
                        <div className="flex items-center gap-1 border rounded-lg p-1">
                          <Button
                            variant={bluetoothViewMode === "cards" ? "secondary" : "ghost"}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setBluetoothViewMode("cards")}
                          >
                            <LayoutGrid className="w-4 h-4" />
                          </Button>
                          <Button
                            variant={bluetoothViewMode === "table" ? "secondary" : "ghost"}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setBluetoothViewMode("table")}
                          >
                            <Table2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardTitle>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by name, MAC address, or device..."
                          value={bluetoothSearch}
                          onChange={(e) => setBluetoothSearch(e.target.value)}
                          className="pl-10 pr-10 bg-background"
                        />
                        {bluetoothSearch && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                            onClick={() => setBluetoothSearch("")}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {bleDevices.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <Bluetooth className="w-16 h-16 mx-auto mb-4 opacity-50" />
                          <h3 className="text-lg font-medium mb-2">No BLE Devices Detected</h3>
                          <p>Bluetooth scanning devices may be offline or not configured.</p>
                        </div>
                      ) : filteredBleDevices.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No devices match "{bluetoothSearch}"</p>
                          <Button variant="ghost" size="sm" onClick={() => setBluetoothSearch("")} className="mt-2">
                            Clear search
                          </Button>
                        </div>
                      ) : bluetoothViewMode === "table" ? (
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>MAC Address</TableHead>
                                <TableHead>Manufacturer</TableHead>
                                <TableHead>Signal</TableHead>
                                <TableHead>Quality</TableHead>
                                <TableHead>Device</TableHead>
                                <TableHead>Last Seen</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredBleDevices.map((device, index) => (
                                <TableRow key={`${device.mac}-${index}`}>
                                  <TableCell className="font-medium">
                                    {device.name}
                                  </TableCell>
                                  <TableCell className="font-mono text-xs">
                                    {device.mac}
                                  </TableCell>
                                  <TableCell>
                                    {device.manufacturer || 'Unknown'}
                                  </TableCell>
                                  <TableCell>
                                    <span className={`font-medium ${getSignalColor(device.rssi)}`}>
                                      {device.rssi} dBm
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <Badge 
                                      variant="secondary" 
                                      className={`text-xs ${
                                        device.rssi >= -50 ? 'bg-success/20 text-success' :
                                        device.rssi >= -70 ? 'bg-yellow-500/20 text-yellow-600' :
                                        'bg-destructive/20 text-destructive'
                                      }`}
                                    >
                                      {formatSignalStrength(device.rssi)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="secondary" className="text-xs bg-aurora-purple/20 text-aurora-purple">
                                      {device.deviceId}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(device.lastSeen), { addSuffix: true })}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {filteredBleDevices.map((device, index) => {
                            const DeviceIcon = getDeviceIcon(device.type || '');
                            return (
                              <div 
                                key={`${device.mac}-${index}`}
                                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-lg bg-aurora-purple/20 flex items-center justify-center">
                                    <DeviceIcon className={`w-6 h-6 ${getSignalColor(device.rssi)}`} />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-lg">{device.name}</p>
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                      <span>{device.mac}</span>
                                      {device.manufacturer && (
                                        <>
                                          <span>•</span>
                                          <span>{device.manufacturer}</span>
                                        </>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge variant="secondary" className="text-xs bg-aurora-purple/20 text-aurora-purple border-aurora-purple/30">
                                        Device: {device.deviceId}
                                      </Badge>
                                      <Badge variant="outline" className="text-xs">
                                        bluetooth_scanner
                                      </Badge>
                                    </div>
                                    {device.services && device.services.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {device.services.slice(0, 3).map((service, i) => (
                                          <Badge key={i} variant="secondary" className="text-xs">
                                            {service}
                                          </Badge>
                                        ))}
                                        {device.services.length > 3 && (
                                          <Badge variant="secondary" className="text-xs">
                                            +{device.services.length - 3} more
                                          </Badge>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Signal className={`w-4 h-4 ${getSignalColor(device.rssi)}`} />
                                    <span className={`font-bold text-lg ${getSignalColor(device.rssi)}`}>
                                      {device.rssi} dBm
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 justify-end">
                                    <Clock className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">
                                      {formatDistanceToNow(new Date(device.lastSeen), { addSuffix: true })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ADS-B Tab */}
                <TabsContent value="adsb" className="space-y-6">
                  <Card>
                    <CardHeader className="space-y-4">
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Plane className="w-5 h-5 text-cyan-400" />
                          All Aircraft ({filteredAdsbAircraft.length}{adsbSearch && ` of ${adsbAircraft?.length || 0}`})
                        </span>
                        <div className="flex items-center gap-1 border rounded-lg p-1">
                          <Button
                            variant={adsbViewMode === "cards" ? "secondary" : "ghost"}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setAdsbViewMode("cards")}
                          >
                            <LayoutGrid className="w-4 h-4" />
                          </Button>
                          <Button
                            variant={adsbViewMode === "table" ? "secondary" : "ghost"}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setAdsbViewMode("table")}
                          >
                            <Table2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardTitle>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by hex, flight, registration, operator..."
                          value={adsbSearch}
                          onChange={(e) => setAdsbSearch(e.target.value)}
                          className="pl-10 pr-10 bg-background"
                        />
                        {adsbSearch && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                            onClick={() => setAdsbSearch("")}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {!adsbAircraft || adsbAircraft.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <Plane className="w-16 h-16 mx-auto mb-4 opacity-50" />
                          <h3 className="text-lg font-medium mb-2">No Aircraft Detected</h3>
                          <p>ADS-B receivers may be offline or no aircraft in range.</p>
                        </div>
                      ) : filteredAdsbAircraft.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No aircraft match "{adsbSearch}"</p>
                          <Button variant="ghost" size="sm" onClick={() => setAdsbSearch("")} className="mt-2">
                            Clear search
                          </Button>
                        </div>
                      ) : adsbViewMode === "table" ? (
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Hex</TableHead>
                                <TableHead>Flight</TableHead>
                                <TableHead>Registration</TableHead>
                                <TableHead>Altitude</TableHead>
                                <TableHead>Speed</TableHead>
                                <TableHead>Squawk</TableHead>
                                <TableHead>Operator</TableHead>
                                <TableHead>Last Seen</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredAdsbAircraft.map((aircraft, index) => (
                                <TableRow key={`${aircraft.hex}-${index}`}>
                                  <TableCell className="font-mono text-xs font-medium">
                                    {aircraft.hex}
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {aircraft.flight?.trim() || 'N/A'}
                                  </TableCell>
                                  <TableCell>
                                    {aircraft.registration || 'N/A'}
                                  </TableCell>
                                  <TableCell>
                                    {aircraft.alt_baro ? `${aircraft.alt_baro.toLocaleString()} ft` : 'N/A'}
                                  </TableCell>
                                  <TableCell>
                                    {aircraft.gs ? `${Math.round(aircraft.gs)} kts` : 'N/A'}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-xs">
                                      {aircraft.squawk || 'N/A'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    {aircraft.operator || aircraft.operator_icao || 'N/A'}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {aircraft.seen != null ? `${aircraft.seen}s ago` : 'N/A'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {filteredAdsbAircraft.map((aircraft, index) => (
                            <div 
                              key={`${aircraft.hex}-${index}`}
                              className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                                  <Plane className="w-6 h-6 text-cyan-400" />
                                </div>
                                <div>
                                  <p className="font-semibold text-lg">{aircraft.flight?.trim() || aircraft.hex}</p>
                                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                    <span className="font-mono">{aircraft.hex}</span>
                                    {aircraft.registration && (
                                      <>
                                        <span>•</span>
                                        <span>{aircraft.registration}</span>
                                      </>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    {aircraft.squawk && (
                                      <Badge variant="secondary" className="text-xs bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                                        Squawk: {aircraft.squawk}
                                      </Badge>
                                    )}
                                    {aircraft.category && (
                                      <Badge variant="outline" className="text-xs">
                                        {aircraft.category}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-2 mb-1">
                                  <Navigation className="w-4 h-4 text-cyan-400" />
                                  <span className="font-bold text-lg text-cyan-400">
                                    {aircraft.alt_baro ? `${aircraft.alt_baro.toLocaleString()} ft` : 'N/A'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 justify-end text-muted-foreground">
                                  <span className="text-xs">
                                    {aircraft.gs ? `${Math.round(aircraft.gs)} kts` : ''}
                                    {aircraft.track ? ` @ ${Math.round(aircraft.track)}°` : ''}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* LoRa Tab */}
                <TabsContent value="lora" className="space-y-6">
                  <Card>
                    <CardHeader className="space-y-4">
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Radio className="w-5 h-5 text-red-400" />
                          All LoRa Packets ({filteredLoraPackets.length}{loraSearch && ` of ${loraPackets.length}`})
                        </span>
                        <div className="flex items-center gap-1 border rounded-lg p-1">
                          <Button
                            variant={loraViewMode === "cards" ? "secondary" : "ghost"}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setLoraViewMode("cards")}
                          >
                            <LayoutGrid className="w-4 h-4" />
                          </Button>
                          <Button
                            variant={loraViewMode === "table" ? "secondary" : "ghost"}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setLoraViewMode("table")}
                          >
                            <Table2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardTitle>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by device ID or payload..."
                          value={loraSearch}
                          onChange={(e) => setLoraSearch(e.target.value)}
                          className="pl-10 pr-10 bg-background"
                        />
                        {loraSearch && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                            onClick={() => setLoraSearch("")}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {loraPackets.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <Radio className="w-16 h-16 mx-auto mb-4 opacity-50" />
                          <h3 className="text-lg font-medium mb-2">No LoRa Packets Detected</h3>
                          <p>LoRa receivers may be offline or no packets received.</p>
                        </div>
                      ) : filteredLoraPackets.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No packets match "{loraSearch}"</p>
                          <Button variant="ghost" size="sm" onClick={() => setLoraSearch("")} className="mt-2">
                            Clear search
                          </Button>
                        </div>
                      ) : loraViewMode === "table" ? (
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Device ID</TableHead>
                                <TableHead>Frequency</TableHead>
                                <TableHead>RSSI</TableHead>
                                <TableHead>SNR</TableHead>
                                <TableHead>Bandwidth</TableHead>
                                <TableHead>SF</TableHead>
                                <TableHead>Payload</TableHead>
                                <TableHead>Last Seen</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredLoraPackets.map((packet, index) => (
                                <TableRow key={`${packet.deviceId}-${index}`}>
                                  <TableCell className="font-mono text-xs font-medium">
                                    {packet.deviceId}
                                  </TableCell>
                                  <TableCell>
                                    {packet.frequency ? `${(packet.frequency / 1000000).toFixed(3)} MHz` : 'N/A'}
                                  </TableCell>
                                  <TableCell>
                                    <span className={`font-medium ${getSignalColor(packet.rssi)}`}>
                                      {packet.rssi} dBm
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    {packet.snr != null ? `${packet.snr} dB` : 'N/A'}
                                  </TableCell>
                                  <TableCell>
                                    {packet.bandwidth ? `${packet.bandwidth / 1000} kHz` : 'N/A'}
                                  </TableCell>
                                  <TableCell>
                                    {packet.spreadingFactor || 'N/A'}
                                  </TableCell>
                                  <TableCell className="font-mono text-xs max-w-32 truncate">
                                    {packet.payload || 'N/A'}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(packet.lastSeen), { addSuffix: true })}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {filteredLoraPackets.map((packet, index) => (
                            <div 
                              key={`${packet.deviceId}-${index}`}
                              className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center">
                                  <Radio className="w-6 h-6 text-red-400" />
                                </div>
                                <div>
                                  <p className="font-semibold text-lg font-mono">{packet.deviceId}</p>
                                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                    {packet.frequency && (
                                      <span>{(packet.frequency / 1000000).toFixed(3)} MHz</span>
                                    )}
                                    {packet.spreadingFactor && (
                                      <>
                                        <span>•</span>
                                        <span>SF{packet.spreadingFactor}</span>
                                      </>
                                    )}
                                    {packet.bandwidth && (
                                      <>
                                        <span>•</span>
                                        <span>{packet.bandwidth / 1000} kHz</span>
                                      </>
                                    )}
                                  </div>
                                  {packet.payload && (
                                    <div className="mt-1">
                                      <Badge variant="secondary" className="text-xs font-mono max-w-48 truncate">
                                        {packet.payload}
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-2 mb-1">
                                  <Signal className={`w-4 h-4 ${getSignalColor(packet.rssi)}`} />
                                  <span className={`font-bold text-lg ${getSignalColor(packet.rssi)}`}>
                                    {packet.rssi} dBm
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 justify-end">
                                  <Clock className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(packet.lastSeen), { addSuffix: true })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
};

export default RadioContent;
