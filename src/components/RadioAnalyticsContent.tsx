import { useState, useMemo } from "react";
import {
  Radio,
  Wifi,
  Bluetooth,
  Signal,
  RefreshCw,
  Loader2,
  TrendingUp,
  Activity,
  Filter,
  Zap,
  Plane,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Legend,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import {
  useWifiScannerTimeseries,
  useBluetoothScannerTimeseries,
  useLoraDetectorTimeseries,
  useLoraGlobalStats,
  useClients,
  useAdsbAircraftWithHistory,
  useAdsbStats,
  useAdsbCoverage,
  LoraGlobalStats,
  AdsbAircraft,
  AdsbStats,
  AdsbCoverage,
} from "@/hooks/useAuroraApi";
import { useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";

const COLORS = {
  wifi: "#06b6d4",
  bluetooth: "#8b5cf6",
  lora: "#f59e0b",
  signal: "#22c55e",
  packets: "#ec4899",
  devices: "#3b82f6",
  adsb: "#ef4444",
};

const SENSOR_TYPES = ["wifi_scanner", "bluetooth_scanner", "lora_detector", "adsb"] as const;
type RadioSensorType = typeof SENSOR_TYPES[number];

const SENSOR_TYPE_LABELS: Record<RadioSensorType, string> = {
  wifi_scanner: "WiFi Scanner",
  bluetooth_scanner: "Bluetooth Scanner",
  lora_detector: "LoRa Detector",
  adsb: "ADS-B Receiver",
};

const RadioAnalyticsContent = () => {
  const queryClient = useQueryClient();
  const [timeRange, setTimeRange] = useState("24");
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedSensorTypes, setSelectedSensorTypes] = useState<RadioSensorType[]>([]);
  const hours = parseInt(timeRange);
  
  // Fetch radio data
  const { data: wifiData, isLoading: wifiLoading } = useWifiScannerTimeseries(hours);
  const { data: bluetoothData, isLoading: bluetoothLoading } = useBluetoothScannerTimeseries(hours);
  const { data: loraData, isLoading: loraLoading } = useLoraDetectorTimeseries(hours);
  const { data: loraStats } = useLoraGlobalStats();
  const { data: clients } = useClients();
  
  // Fetch ADS-B data
  const { aircraft: adsbAircraft, isLoading: adsbLoading, isHistorical: adsbIsHistorical } = useAdsbAircraftWithHistory(hours * 60);
  const { data: adsbStats } = useAdsbStats();
  const { data: adsbCoverage } = useAdsbCoverage();
  
  const isLoading = wifiLoading || bluetoothLoading || loraLoading || adsbLoading;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["aurora"] });
  };

  // Get all unique clients from all radio sources
  const allClients = useMemo(() => {
    const clientIds = new Set<string>();
    
    wifiData?.readings?.forEach((r) => r.client_id && clientIds.add(r.client_id));
    bluetoothData?.readings?.forEach((r) => r.client_id && clientIds.add(r.client_id));
    loraData?.readings?.forEach((r) => r.client_id && clientIds.add(r.client_id));
    
    return Array.from(clientIds).sort();
  }, [wifiData, bluetoothData, loraData]);

  const getClientName = (clientId: string) => {
    const client = clients?.find(c => c.client_id === clientId);
    return client?.hostname || clientId;
  };

  const isClientSelected = (clientId: string) => 
    selectedClients.length === 0 || selectedClients.includes(clientId);

  const toggleClient = (clientId: string) => {
    setSelectedClients(prev => 
      prev.includes(clientId)
        ? prev.filter(c => c !== clientId)
        : [...prev, clientId]
    );
  };

  const isSensorTypeSelected = (type: RadioSensorType) => 
    selectedSensorTypes.length === 0 || selectedSensorTypes.includes(type);

  const toggleSensorType = (type: RadioSensorType) => {
    setSelectedSensorTypes(prev => 
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // Process WiFi signal strength over time
  const wifiChartData = useMemo(() => {
    if (!isSensorTypeSelected("wifi_scanner")) return [];
    const timeMap = new Map<string, { rssi: number[]; networks: number }>();
    
    wifiData?.readings?.forEach((r) => {
      if (r.client_id && !isClientSelected(r.client_id)) return;
      const time = format(new Date(r.timestamp), "HH:mm");
      const existing = timeMap.get(time) || { rssi: [], networks: 0 };
      if (r.rssi !== undefined) existing.rssi.push(r.rssi);
      if (r.networks_count) existing.networks += r.networks_count;
      timeMap.set(time, existing);
    });

    return Array.from(timeMap.entries())
      .map(([time, data]) => ({
        time,
        rssi: data.rssi.length > 0 ? data.rssi.reduce((a, b) => a + b, 0) / data.rssi.length : null,
        networks: data.networks,
      }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [wifiData, selectedClients, selectedSensorTypes]);

  // Process Bluetooth devices over time
  const bluetoothChartData = useMemo(() => {
    if (!isSensorTypeSelected("bluetooth_scanner")) return [];
    const timeMap = new Map<string, { rssi: number[]; devices: number }>();
    
    bluetoothData?.readings?.forEach((r) => {
      if (r.client_id && !isClientSelected(r.client_id)) return;
      const time = format(new Date(r.timestamp), "HH:mm");
      const existing = timeMap.get(time) || { rssi: [], devices: 0 };
      if (r.rssi !== undefined) existing.rssi.push(r.rssi);
      if (r.devices_count) existing.devices += r.devices_count;
      timeMap.set(time, existing);
    });

    return Array.from(timeMap.entries())
      .map(([time, data]) => ({
        time,
        rssi: data.rssi.length > 0 ? data.rssi.reduce((a, b) => a + b, 0) / data.rssi.length : null,
        devices: data.devices,
      }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [bluetoothData, selectedClients, selectedSensorTypes]);

  // Process LoRa packets over time
  const loraChartData = useMemo(() => {
    if (!isSensorTypeSelected("lora_detector")) return [];
    const timeMap = new Map<string, { rssi: number[]; snr: number[]; packets: number }>();
    
    loraData?.readings?.forEach((r) => {
      if (r.client_id && !isClientSelected(r.client_id)) return;
      const time = format(new Date(r.timestamp), "HH:mm");
      const existing = timeMap.get(time) || { rssi: [], snr: [], packets: 0 };
      if (r.rssi !== undefined) existing.rssi.push(r.rssi);
      if (r.snr !== undefined) existing.snr.push(r.snr);
      if (r.packets_detected) existing.packets += r.packets_detected;
      timeMap.set(time, existing);
    });

    return Array.from(timeMap.entries())
      .map(([time, data]) => ({
        time,
        rssi: data.rssi.length > 0 ? data.rssi.reduce((a, b) => a + b, 0) / data.rssi.length : null,
        snr: data.snr.length > 0 ? data.snr.reduce((a, b) => a + b, 0) / data.snr.length : null,
        packets: data.packets,
      }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [loraData, selectedClients, selectedSensorTypes]);

  // Combined signal chart data
  const combinedSignalData = useMemo(() => {
    const timeMap = new Map<string, { wifi: number | null; bluetooth: number | null; lora: number | null }>();
    
    wifiChartData.forEach(d => {
      const existing = timeMap.get(d.time) || { wifi: null, bluetooth: null, lora: null };
      existing.wifi = d.rssi;
      timeMap.set(d.time, existing);
    });
    
    bluetoothChartData.forEach(d => {
      const existing = timeMap.get(d.time) || { wifi: null, bluetooth: null, lora: null };
      existing.bluetooth = d.rssi;
      timeMap.set(d.time, existing);
    });
    
    loraChartData.forEach(d => {
      const existing = timeMap.get(d.time) || { wifi: null, bluetooth: null, lora: null };
      existing.lora = d.rssi;
      timeMap.set(d.time, existing);
    });

    return Array.from(timeMap.entries())
      .map(([time, data]) => ({ time, ...data }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [wifiChartData, bluetoothChartData, loraChartData]);

  // Calculate summary statistics
  const stats = useMemo(() => {
    const wifiReadings = isSensorTypeSelected("wifi_scanner") 
      ? (wifiData?.readings?.filter((r) => !r.client_id || isClientSelected(r.client_id)) || [])
      : [];
    const bluetoothReadings = isSensorTypeSelected("bluetooth_scanner")
      ? (bluetoothData?.readings?.filter((r) => !r.client_id || isClientSelected(r.client_id)) || [])
      : [];
    const loraReadings = isSensorTypeSelected("lora_detector")
      ? (loraData?.readings?.filter((r) => !r.client_id || isClientSelected(r.client_id)) || [])
      : [];

    const wifiRssi = wifiReadings.map((r) => r.rssi).filter((v): v is number => v !== undefined);
    const bluetoothRssi = bluetoothReadings.map((r) => r.rssi).filter((v): v is number => v !== undefined);
    const loraRssi = loraReadings.map((r) => r.rssi).filter((v): v is number => v !== undefined);
    const loraSNR = loraReadings.map((r) => r.snr).filter((v): v is number => v !== undefined);

    // ADS-B stats (only if adsb sensor type is selected)
    const showAdsb = isSensorTypeSelected("adsb");
    const activeAircraft = showAdsb ? (adsbAircraft?.filter(a => (a.seen || 0) < 60) || []) : [];
    const aircraftWithAlt = showAdsb ? (adsbAircraft?.filter(a => a.alt_baro !== undefined) || []) : [];
    const avgAltitude = aircraftWithAlt.length > 0
      ? aircraftWithAlt.reduce((sum, a) => sum + (a.alt_baro || 0), 0) / aircraftWithAlt.length 
      : null;

    return {
      wifiNetworks: wifiReadings.reduce((sum, r) => sum + (r.networks_count || 0), 0),
      bluetoothDevices: bluetoothReadings.reduce((sum, r) => sum + (r.devices_count || 0), 0),
      loraPackets: loraReadings.reduce((sum, r) => sum + (r.packets_detected || 0), 0),
      avgWifiRssi: wifiRssi.length > 0 ? wifiRssi.reduce((a, b) => a + b, 0) / wifiRssi.length : null,
      avgBluetoothRssi: bluetoothRssi.length > 0 ? bluetoothRssi.reduce((a, b) => a + b, 0) / bluetoothRssi.length : null,
      avgLoraRssi: loraRssi.length > 0 ? loraRssi.reduce((a, b) => a + b, 0) / loraRssi.length : null,
      avgLoraSNR: loraSNR.length > 0 ? loraSNR.reduce((a, b) => a + b, 0) / loraSNR.length : null,
      totalReadings: wifiReadings.length + bluetoothReadings.length + loraReadings.length,
      // ADS-B stats
      totalAircraft: showAdsb ? (adsbAircraft?.length || 0) : 0,
      activeAircraft: activeAircraft.length,
      avgAltitude,
    };
  }, [wifiData, bluetoothData, loraData, adsbAircraft, selectedClients, selectedSensorTypes]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Radio Analytics</h1>
          <p className="text-sm text-muted-foreground">
            WiFi, Bluetooth, and LoRa sensor data analysis
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Client Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                Clients
                {selectedClients.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {selectedClients.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="end">
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-sm font-medium">Filter by Client</span>
                  {selectedClients.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedClients([])}
                      className="h-6 px-2 text-xs"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                {allClients.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No clients found</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {allClients.map((clientId) => (
                      <div
                        key={clientId}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-white/5 cursor-pointer"
                        onClick={() => toggleClient(clientId)}
                      >
                        <Checkbox
                          checked={selectedClients.includes(clientId)}
                          className="pointer-events-none"
                        />
                        <span className="text-sm truncate">
                          {getClientName(clientId)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Sensor Type Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                Sensor Types
                {selectedSensorTypes.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {selectedSensorTypes.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="end">
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-sm font-medium">Filter by Sensor Type</span>
                  {selectedSensorTypes.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedSensorTypes([])}
                      className="h-6 px-2 text-xs"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                {SENSOR_TYPES.map((type) => (
                  <div
                    key={type}
                    className="flex items-center gap-2 p-1.5 rounded hover:bg-white/5 cursor-pointer"
                    onClick={() => toggleSensorType(type)}
                  >
                    <Checkbox
                      checked={selectedSensorTypes.includes(type)}
                      className="pointer-events-none"
                    />
                    <span className="text-sm truncate">
                      {SENSOR_TYPE_LABELS[type]}
                    </span>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last Hour</SelectItem>
              <SelectItem value="6">Last 6 Hours</SelectItem>
              <SelectItem value="24">Last 24 Hours</SelectItem>
              <SelectItem value="168">Last 7 Days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">WiFi Networks</p>
                  <p className="text-2xl font-bold text-aurora-cyan">
                    {stats.wifiNetworks}
                  </p>
                  {stats.avgWifiRssi && (
                    <p className="text-xs text-muted-foreground">
                      Avg: {stats.avgWifiRssi.toFixed(1)} dBm
                    </p>
                  )}
                </div>
                <Wifi className="w-8 h-8 text-aurora-cyan opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Bluetooth Devices</p>
                  <p className="text-2xl font-bold text-aurora-purple">
                    {stats.bluetoothDevices}
                  </p>
                  {stats.avgBluetoothRssi && (
                    <p className="text-xs text-muted-foreground">
                      Avg: {stats.avgBluetoothRssi.toFixed(1)} dBm
                    </p>
                  )}
                </div>
                <Bluetooth className="w-8 h-8 text-aurora-purple opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">LoRa Packets</p>
                  <p className="text-2xl font-bold text-aurora-green">
                    {stats.loraPackets}
                  </p>
                  {stats.avgLoraSNR && (
                    <p className="text-xs text-muted-foreground">
                      Avg SNR: {stats.avgLoraSNR.toFixed(1)} dB
                    </p>
                  )}
                </div>
                <Radio className="w-8 h-8 text-aurora-green opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Readings</p>
                  <p className="text-2xl font-bold text-aurora-blue">
                    {stats.totalReadings}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    All radio sensors
                  </p>
                </div>
                <Activity className="w-8 h-8 text-aurora-blue opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Aircraft Tracked</p>
                  <p className="text-2xl font-bold text-destructive">
                    {stats.totalAircraft}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stats.activeAircraft} active now
                  </p>
                </div>
                <Plane className="w-8 h-8 text-destructive opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Combined Signal Strength Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Signal className="w-5 h-5 text-aurora-cyan" />
              Signal Strength Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={combinedSignalData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="time" stroke="#888" fontSize={12} />
                  <YAxis stroke="#888" fontSize={12} domain={[-100, 0]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(0,0,0,0.8)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                    formatter={(value: number) => [`${value?.toFixed(1)} dBm`, ""]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="wifi"
                    stroke={COLORS.wifi}
                    strokeWidth={2}
                    dot={false}
                    name="WiFi"
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="bluetooth"
                    stroke={COLORS.bluetooth}
                    strokeWidth={2}
                    dot={false}
                    name="Bluetooth"
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="lora"
                    stroke={COLORS.lora}
                    strokeWidth={2}
                    dot={false}
                    name="LoRa"
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Individual Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* WiFi Networks Chart */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="w-5 h-5 text-aurora-cyan" />
                WiFi Networks Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={wifiChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="time" stroke="#888" fontSize={12} />
                    <YAxis stroke="#888" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(0,0,0,0.8)",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="networks"
                      stroke={COLORS.wifi}
                      fill={COLORS.wifi}
                      fillOpacity={0.3}
                      name="Networks"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Bluetooth Devices Chart */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bluetooth className="w-5 h-5 text-aurora-purple" />
                Bluetooth Devices Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={bluetoothChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="time" stroke="#888" fontSize={12} />
                    <YAxis stroke="#888" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(0,0,0,0.8)",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="devices"
                      stroke={COLORS.bluetooth}
                      fill={COLORS.bluetooth}
                      fillOpacity={0.3}
                      name="Devices"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* LoRa Packets Chart */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-aurora-green" />
                LoRa Packets Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={loraChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="time" stroke="#888" fontSize={12} />
                    <YAxis stroke="#888" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(0,0,0,0.8)",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}
                    />
                    <Bar
                      dataKey="packets"
                      fill={COLORS.lora}
                      name="Packets"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* LoRa SNR Chart */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-aurora-green" />
                LoRa Signal-to-Noise Ratio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={loraChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="time" stroke="#888" fontSize={12} />
                    <YAxis stroke="#888" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(0,0,0,0.8)",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}
                      formatter={(value: number) => [`${value?.toFixed(1)} dB`, "SNR"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="snr"
                      stroke={COLORS.signal}
                      strokeWidth={2}
                      dot={false}
                      name="SNR"
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* LoRa Stats Card */}
        {loraStats && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-aurora-green" />
                LoRa Global Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-white/5">
                  <p className="text-sm text-muted-foreground">Total Devices</p>
                  <p className="text-xl font-bold">{(loraStats as LoraGlobalStats).total_devices || 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-white/5">
                  <p className="text-sm text-muted-foreground">Total Detections</p>
                  <p className="text-xl font-bold">{(loraStats as LoraGlobalStats).total_detections || 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-white/5">
                  <p className="text-sm text-muted-foreground">Detections (24h)</p>
                  <p className="text-xl font-bold">{(loraStats as LoraGlobalStats).detections_last_24h || 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-white/5">
                  <p className="text-sm text-muted-foreground">Avg SNR</p>
                  <p className="text-xl font-bold">
                    {(loraStats as LoraGlobalStats).avg_snr 
                      ? `${(loraStats as LoraGlobalStats).avg_snr?.toFixed(1)} dB` 
                      : "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ADS-B Aircraft Tracking Section */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="w-5 h-5 text-destructive" />
              ADS-B Aircraft Tracking
              {adsbIsHistorical && (
                <Badge variant="outline" className="ml-2 text-xs">Historical</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* ADS-B Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-lg bg-white/5">
                <p className="text-sm text-muted-foreground">Messages Decoded</p>
                <p className="text-xl font-bold">
                  {(adsbStats as AdsbStats)?.messages_decoded?.toLocaleString() || 0}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-white/5">
                <p className="text-sm text-muted-foreground">Positions Received</p>
                <p className="text-xl font-bold">
                  {(adsbStats as AdsbStats)?.positions_received?.toLocaleString() || 0}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-white/5">
                <p className="text-sm text-muted-foreground">Max Range</p>
                <p className="text-xl font-bold">
                  {(adsbCoverage as AdsbCoverage)?.max_range_km 
                    ? `${(adsbCoverage as AdsbCoverage).max_range_km?.toFixed(1)} km` 
                    : "N/A"}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-white/5">
                <p className="text-sm text-muted-foreground">Avg Altitude</p>
                <p className="text-xl font-bold">
                  {stats.avgAltitude 
                    ? `${Math.round(stats.avgAltitude).toLocaleString()} ft` 
                    : "N/A"}
                </p>
              </div>
            </div>

            {/* Aircraft Table */}
            {adsbAircraft && adsbAircraft.length > 0 ? (
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Flight</TableHead>
                      <TableHead>ICAO</TableHead>
                      <TableHead>Altitude</TableHead>
                      <TableHead>Speed</TableHead>
                      <TableHead>Track</TableHead>
                      <TableHead>Squawk</TableHead>
                      <TableHead>RSSI</TableHead>
                      <TableHead>Last Seen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adsbAircraft.slice(0, 50).map((aircraft) => (
                      <TableRow key={aircraft.hex}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {aircraft.emergency && (
                              <AlertTriangle className="w-4 h-4 text-destructive" />
                            )}
                            {aircraft.flight?.trim() || "—"}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {aircraft.hex.toUpperCase()}
                        </TableCell>
                        <TableCell>
                          {aircraft.alt_baro 
                            ? `${aircraft.alt_baro.toLocaleString()} ft` 
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {aircraft.gs 
                            ? `${Math.round(aircraft.gs)} kts` 
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {aircraft.track 
                            ? `${Math.round(aircraft.track)}°` 
                            : "—"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {aircraft.squawk || "—"}
                        </TableCell>
                        <TableCell>
                          {aircraft.rssi 
                            ? `${aircraft.rssi.toFixed(1)} dB` 
                            : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {aircraft.seen !== undefined
                            ? aircraft.seen < 60 
                              ? `${aircraft.seen}s ago` 
                              : `${Math.floor(aircraft.seen / 60)}m ago`
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No aircraft currently being tracked
              </div>
            )}
          </CardContent>
        </Card>

        {/* Altitude vs Speed Scatter Plot */}
        {adsbAircraft && adsbAircraft.length > 0 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-destructive" />
                Aircraft Altitude vs Speed Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      type="number" 
                      dataKey="gs" 
                      name="Speed" 
                      unit=" kts"
                      stroke="#888" 
                      fontSize={12}
                      label={{ value: 'Speed (knots)', position: 'insideBottom', offset: -5, fill: '#888' }}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="alt_baro" 
                      name="Altitude" 
                      unit=" ft"
                      stroke="#888" 
                      fontSize={12}
                      label={{ value: 'Altitude (ft)', angle: -90, position: 'insideLeft', fill: '#888' }}
                    />
                    <ZAxis range={[50, 200]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(0,0,0,0.8)",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}
                      formatter={(value: number, name: string) => [
                        name === "gs" ? `${value} kts` : `${value?.toLocaleString()} ft`,
                        name === "gs" ? "Speed" : "Altitude"
                      ]}
                      labelFormatter={(_, payload) => {
                        const aircraft = payload?.[0]?.payload as AdsbAircraft;
                        return aircraft?.flight?.trim() || aircraft?.hex?.toUpperCase() || "Unknown";
                      }}
                    />
                    <Scatter
                      data={adsbAircraft.filter(a => a.gs && a.alt_baro)}
                      fill={COLORS.adsb}
                      fillOpacity={0.7}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default RadioAnalyticsContent;
