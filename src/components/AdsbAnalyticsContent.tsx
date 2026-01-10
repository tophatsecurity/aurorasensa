import { useState, useMemo } from "react";
import {
  Plane,
  AlertTriangle,
  MapPin,
  Activity,
  Radio,
  RefreshCw,
  Loader2,
  Eye,
  ArrowUp,
  ArrowDown,
  Radar,
  Signal,
  Navigation,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import {
  useAdsbAircraftWithHistory,
  useAdsbStats,
  useAdsbCoverage,
  useAdsbEmergencies,
  useAdsbDevices,
} from "@/hooks/useAuroraApi";
import { useAdsbSSE } from "@/hooks/useSSE";
import { useQueryClient } from "@tanstack/react-query";
import { SSEConnectionStatus } from "./SSEConnectionStatus";
import { formatDistanceToNow } from "date-fns";

const AdsbAnalyticsContent = () => {
  const queryClient = useQueryClient();
  const [timeRange, setTimeRange] = useState("60");
  const [sseEnabled, setSseEnabled] = useState(true);
  
  const minutes = parseInt(timeRange);
  
  // Fetch ADS-B data
  const { aircraft, isLoading: aircraftLoading, isHistorical } = useAdsbAircraftWithHistory(minutes);
  const { data: adsbStats, isLoading: statsLoading } = useAdsbStats();
  const { data: adsbCoverage, isLoading: coverageLoading } = useAdsbCoverage();
  const { data: emergencies, isLoading: emergenciesLoading } = useAdsbEmergencies();
  const { data: devices, isLoading: devicesLoading } = useAdsbDevices();
  
  // Real-time SSE for ADS-B
  const adsbSSE = useAdsbSSE(sseEnabled);
  
  const isLoading = aircraftLoading || statsLoading || coverageLoading;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["aurora", "adsb"] });
  };

  // Process aircraft data
  const activeAircraft = useMemo(() => {
    if (!aircraft) return [];
    return aircraft.filter(a => (a.seen || 0) < 60);
  }, [aircraft]);

  const militaryAircraft = useMemo(() => {
    if (!aircraft) return [];
    return aircraft.filter(a => a.military);
  }, [aircraft]);

  const lowAltitudeAircraft = useMemo(() => {
    if (!aircraft) return [];
    return aircraft.filter(a => a.alt_baro && a.alt_baro < 5000);
  }, [aircraft]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!aircraft?.length) return null;
    
    const alts = aircraft.filter(a => a.alt_baro).map(a => a.alt_baro!);
    const speeds = aircraft.filter(a => a.gs).map(a => a.gs!);
    const rssis = aircraft.filter(a => a.rssi).map(a => a.rssi!);
    
    return {
      totalAircraft: aircraft.length,
      activeCount: activeAircraft.length,
      avgAltitude: alts.length ? Math.round(alts.reduce((a, b) => a + b, 0) / alts.length) : null,
      maxAltitude: alts.length ? Math.max(...alts) : null,
      avgSpeed: speeds.length ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length) : null,
      avgRssi: rssis.length ? (rssis.reduce((a, b) => a + b, 0) / rssis.length).toFixed(1) : null,
      emergencyCount: emergencies?.length || 0,
      militaryCount: militaryAircraft.length,
    };
  }, [aircraft, activeAircraft, emergencies, militaryAircraft]);

  // Altitude distribution data
  const altitudeDistribution = useMemo(() => {
    if (!aircraft?.length) return [];
    
    const ranges = [
      { label: "0-5k", min: 0, max: 5000 },
      { label: "5k-10k", min: 5000, max: 10000 },
      { label: "10k-20k", min: 10000, max: 20000 },
      { label: "20k-30k", min: 20000, max: 30000 },
      { label: "30k-40k", min: 30000, max: 40000 },
      { label: "40k+", min: 40000, max: Infinity },
    ];
    
    return ranges.map(range => ({
      range: range.label,
      count: aircraft.filter(a => 
        a.alt_baro && a.alt_baro >= range.min && a.alt_baro < range.max
      ).length,
    }));
  }, [aircraft]);

  // Position scatter data for map-like visualization
  const positionData = useMemo(() => {
    if (!aircraft?.length) return [];
    return aircraft
      .filter(a => a.lat && a.lon)
      .map(a => ({
        lat: a.lat,
        lon: a.lon,
        alt: a.alt_baro || 0,
        flight: a.flight || a.hex,
        seen: a.seen || 0,
      }));
  }, [aircraft]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border/50">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Plane className="w-7 h-7 text-primary" />
            ADS-B Aircraft Tracking
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time aircraft tracking via HackRF/RTL-SDR receivers
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SSEConnectionStatus
            isConnected={adsbSSE.isConnected}
            isConnecting={adsbSSE.isConnecting}
            error={adsbSSE.error}
            reconnectCount={adsbSSE.reconnectCount}
            onReconnect={adsbSSE.reconnect}
            label="Live ADS-B"
          />
          <div className="flex items-center gap-2">
            <Switch
              id="adsb-sse-toggle"
              checked={sseEnabled}
              onCheckedChange={setSseEnabled}
            />
            <Label htmlFor="adsb-sse-toggle" className="text-sm text-muted-foreground">
              Real-time
            </Label>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">Last 15 min</SelectItem>
              <SelectItem value="30">Last 30 min</SelectItem>
              <SelectItem value="60">Last Hour</SelectItem>
              <SelectItem value="180">Last 3 Hours</SelectItem>
              <SelectItem value="360">Last 6 Hours</SelectItem>
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
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Aircraft</p>
                  <p className="text-2xl font-bold text-primary">
                    {stats?.totalAircraft || 0}
                  </p>
                </div>
                <Plane className="w-6 h-6 text-primary/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Active Now</p>
                  <p className="text-2xl font-bold text-success">
                    {stats?.activeCount || 0}
                  </p>
                </div>
                <Activity className="w-6 h-6 text-success/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Avg Altitude</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {stats?.avgAltitude ? `${(stats.avgAltitude / 1000).toFixed(1)}k` : "—"}
                  </p>
                </div>
                <ArrowUp className="w-6 h-6 text-blue-400/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Avg Speed</p>
                  <p className="text-2xl font-bold text-orange-400">
                    {stats?.avgSpeed ? `${stats.avgSpeed}kt` : "—"}
                  </p>
                </div>
                <Navigation className="w-6 h-6 text-orange-400/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Military</p>
                  <p className="text-2xl font-bold text-purple-400">
                    {stats?.militaryCount || 0}
                  </p>
                </div>
                <Radar className="w-6 h-6 text-purple-400/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-destructive/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Emergencies</p>
                  <p className="text-2xl font-bold text-destructive">
                    {stats?.emergencyCount || 0}
                  </p>
                </div>
                <AlertTriangle className="w-6 h-6 text-destructive/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Altitude Distribution */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowUp className="w-4 h-4 text-primary" />
                Altitude Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={altitudeDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="range" tick={{ fill: "#888", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#888", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(0,0,0,0.8)",
                        border: "1px solid rgba(255,255,255,0.2)",
                        borderRadius: "8px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#3b82f6"
                      fill="url(#altGradient)"
                    />
                    <defs>
                      <linearGradient id="altGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Coverage Stats */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Radar className="w-4 h-4 text-primary" />
                Receiver Coverage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-background/50">
                  <p className="text-xs text-muted-foreground">Max Range</p>
                  <p className="text-xl font-bold text-primary">
                    {adsbCoverage?.max_range_km?.toFixed(1) || "—"} km
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-background/50">
                  <p className="text-xs text-muted-foreground">Unique Aircraft</p>
                  <p className="text-xl font-bold text-success">
                    {adsbCoverage?.unique_aircraft || "—"}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-background/50">
                  <p className="text-xs text-muted-foreground">Total Positions</p>
                  <p className="text-xl font-bold text-blue-400">
                    {adsbCoverage?.total_positions?.toLocaleString() || "—"}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-background/50">
                  <p className="text-xs text-muted-foreground">Coverage Area</p>
                  <p className="text-xl font-bold text-orange-400">
                    {adsbCoverage?.coverage_area_km2?.toLocaleString() || "—"} km²
                  </p>
                </div>
              </div>

              {/* Receiver Stats */}
              <div className="mt-4 p-4 rounded-lg bg-background/30">
                <p className="text-sm font-medium mb-2">Receiver Statistics</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Messages:</span>
                    <span className="ml-2 font-medium">{adsbStats?.messages_decoded?.toLocaleString() || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tracked:</span>
                    <span className="ml-2 font-medium">{adsbStats?.aircraft_tracked_total || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Uptime:</span>
                    <span className="ml-2 font-medium">
                      {adsbStats?.uptime_seconds 
                        ? `${Math.floor(adsbStats.uptime_seconds / 3600)}h`
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Emergency Alerts */}
        {emergencies && emergencies.length > 0 && (
          <Card className="glass-card border-destructive/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-4 h-4" />
                Emergency Aircraft
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {emergencies.map((em, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <div className="flex items-center gap-3">
                      <Plane className="w-5 h-5 text-destructive" />
                      <div>
                        <p className="font-medium text-destructive">
                          {em.flight || em.hex}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Squawk: {em.squawk} • {em.emergency_type}
                        </p>
                      </div>
                    </div>
                    <Badge variant="destructive">
                      {em.alt_baro ? `${(em.alt_baro / 1000).toFixed(1)}k ft` : "Unknown Alt"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Aircraft Table */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                Aircraft ({activeAircraft.length})
              </span>
              {isHistorical && (
                <Badge variant="secondary" className="text-xs">
                  Historical Data
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Flight</TableHead>
                    <TableHead>ICAO</TableHead>
                    <TableHead>Altitude</TableHead>
                    <TableHead>Speed</TableHead>
                    <TableHead>Track</TableHead>
                    <TableHead>RSSI</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Last Seen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeAircraft.slice(0, 50).map((a) => (
                    <TableRow key={a.hex} className="hover:bg-white/5">
                      <TableCell className="font-mono font-medium">
                        {a.flight?.trim() || "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {a.hex}
                      </TableCell>
                      <TableCell>
                        {a.alt_baro ? `${a.alt_baro.toLocaleString()} ft` : "—"}
                      </TableCell>
                      <TableCell>
                        {a.gs ? `${Math.round(a.gs)} kt` : "—"}
                      </TableCell>
                      <TableCell>
                        {a.track ? `${Math.round(a.track)}°` : "—"}
                      </TableCell>
                      <TableCell className={a.rssi && a.rssi > -10 ? "text-success" : ""}>
                        {a.rssi ? `${a.rssi.toFixed(1)} dB` : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {a.category || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {a.seen !== undefined ? `${a.seen}s ago` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Receiver Devices */}
        {devices && devices.length > 0 && (
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Radio className="w-4 h-4 text-primary" />
                ADS-B Receivers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {devices.map((device) => (
                  <div key={device.device_id} className="p-4 rounded-lg bg-background/50 border border-border/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium truncate">{device.device_id}</span>
                      <Badge variant={device.enabled ? "default" : "secondary"}>
                        {device.enabled ? "Active" : "Disabled"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Type: {device.sdr_type || device.device_type}</p>
                      <p>Frequency: {device.frequency ? `${(device.frequency / 1e6).toFixed(1)} MHz` : "—"}</p>
                      <p>Gain: {device.gain !== undefined ? `${device.gain} dB` : "Auto"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdsbAnalyticsContent;
