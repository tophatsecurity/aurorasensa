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
  MonitorSmartphone
} from "lucide-react";
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
import { useClients, useLatestReadings, useSensorTypeStats, useAllSensorStats, useWifiScannerTimeseries, useBluetoothScannerTimeseries } from "@/hooks/useAuroraApi";
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
  const [activeTab, setActiveTab] = useState("overview");
  const [timeRange, setTimeRange] = useState("24h");
  const [expandedSections, setExpandedSections] = useState<string[]>(["wifi", "bluetooth"]);
  
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

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  // Process WiFi readings from latest readings
  const wifiReadings = useMemo(() => {
    if (!latestReadings) return [];
    return latestReadings.filter(r =>
      r.device_type?.toLowerCase().includes('wifi') ||
      r.device_id?.toLowerCase().includes('wifi')
    );
  }, [latestReadings]);

  // Process Bluetooth/BLE readings from latest readings
  const bluetoothReadings = useMemo(() => {
    if (!latestReadings) return [];
    return latestReadings.filter(r =>
      r.device_type?.toLowerCase().includes('bluetooth') ||
      r.device_type?.toLowerCase().includes('ble') ||
      r.device_id?.toLowerCase().includes('bluetooth') ||
      r.device_id?.toLowerCase().includes('ble')
    );
  }, [latestReadings]);

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
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
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

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="wifi">WiFi</TabsTrigger>
              <TabsTrigger value="bluetooth">Bluetooth/BLE</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
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
                                onClick={() => setActiveTab("wifi")}
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
                                onClick={() => setActiveTab("bluetooth")}
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
            </TabsContent>

            {/* WiFi Tab */}
            <TabsContent value="wifi" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wifi className="w-5 h-5 text-aurora-cyan" />
                    All WiFi Networks ({wifiNetworks.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {wifiNetworks.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Wifi className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">No WiFi Networks Detected</h3>
                      <p>WiFi scanning devices may be offline or not configured.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {wifiNetworks.map((network, index) => (
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

              {/* WiFi Signal Distribution Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Signal className="w-5 h-5 text-aurora-cyan" />
                    Signal Strength Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { range: 'Excellent (>-50)', count: wifiNetworks.filter(n => n.rssi >= -50).length },
                        { range: 'Good (-60 to -50)', count: wifiNetworks.filter(n => n.rssi >= -60 && n.rssi < -50).length },
                        { range: 'Fair (-70 to -60)', count: wifiNetworks.filter(n => n.rssi >= -70 && n.rssi < -60).length },
                        { range: 'Weak (-80 to -70)', count: wifiNetworks.filter(n => n.rssi >= -80 && n.rssi < -70).length },
                        { range: 'Poor (<-80)', count: wifiNetworks.filter(n => n.rssi < -80).length },
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
            </TabsContent>

            {/* Bluetooth/BLE Tab */}
            <TabsContent value="bluetooth" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bluetooth className="w-5 h-5 text-aurora-purple" />
                    All BLE Devices ({bleDevices.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {bleDevices.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Bluetooth className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">No BLE Devices Detected</h3>
                      <p>Bluetooth scanning devices may be offline or not configured.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {bleDevices.map((device, index) => {
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

              {/* BLE Signal Distribution Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Signal className="w-5 h-5 text-aurora-purple" />
                    BLE Signal Strength Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { range: 'Excellent (>-50)', count: bleDevices.filter(d => d.rssi >= -50).length },
                        { range: 'Good (-60 to -50)', count: bleDevices.filter(d => d.rssi >= -60 && d.rssi < -50).length },
                        { range: 'Fair (-70 to -60)', count: bleDevices.filter(d => d.rssi >= -70 && d.rssi < -60).length },
                        { range: 'Weak (-80 to -70)', count: bleDevices.filter(d => d.rssi >= -80 && d.rssi < -70).length },
                        { range: 'Poor (<-80)', count: bleDevices.filter(d => d.rssi < -80).length },
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
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
};

export default RadioContent;
