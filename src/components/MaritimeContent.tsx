import { useState, useMemo } from "react";
import {
  Ship,
  Radio,
  AlertTriangle,
  Anchor,
  Navigation,
  Activity,
  RefreshCw,
  Signal,
  MapPin,
  Clock,
  Waves,
  Thermometer,
  Wind,
  Droplets,
  AlertCircle,
  CheckCircle,
  Search,
  LayoutGrid,
  Table2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  useAisVessels,
  useAisStats,
  useAprsStations,
  useAprsStats,
  useAprsWeatherStations,
  useEpirbBeacons,
  useEpirbStats,
  useEpirbActiveAlerts,
  AisVessel,
  AprsStation,
  EpirbBeacon,
} from "@/hooks/aurora/maritime";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  color: 'cyan' | 'green' | 'orange' | 'red' | 'purple' | 'blue';
  trend?: { value: string; positive: boolean };
  isLoading?: boolean;
}

const StatCard = ({ title, value, subtitle, icon: Icon, color, trend, isLoading }: StatCardProps) => {
  const colorStyles = {
    cyan: { gradient: 'from-cyan-500/20', text: 'text-cyan-400', glow: 'shadow-[0_0_30px_hsl(187_100%_55%/0.2)]' },
    green: { gradient: 'from-green-500/20', text: 'text-green-400', glow: 'shadow-[0_0_30px_hsl(142_76%_36%/0.2)]' },
    orange: { gradient: 'from-orange-500/20', text: 'text-orange-400', glow: 'shadow-[0_0_30px_hsl(25_95%_53%/0.2)]' },
    red: { gradient: 'from-red-500/20', text: 'text-red-400', glow: 'shadow-[0_0_30px_hsl(0_84%_60%/0.2)]' },
    purple: { gradient: 'from-purple-500/20', text: 'text-purple-400', glow: 'shadow-[0_0_30px_hsl(271_91%_65%/0.2)]' },
    blue: { gradient: 'from-blue-500/20', text: 'text-blue-400', glow: 'shadow-[0_0_30px_hsl(217_91%_60%/0.2)]' },
  };

  const styles = colorStyles[color];

  return (
    <div className={`glass-card rounded-xl p-6 hover:scale-[1.02] transition-all duration-300 ${styles.glow}`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${styles.gradient} to-transparent flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${styles.text}`} />
        </div>
        {trend && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            trend.positive ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
          }`}>
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      <h3 className="text-sm font-medium text-muted-foreground mb-1">{title}</h3>
      <p className={`text-3xl font-bold ${styles.text} mb-1`}>
        {isLoading ? "..." : value}
      </p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
};

// AIS Section
const AisSection = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("table");
  const { data: vessels, isLoading: vesselsLoading } = useAisVessels();
  const { data: stats, isLoading: statsLoading } = useAisStats();

  const filteredVessels = useMemo(() => {
    if (!vessels) return [];
    if (!searchTerm.trim()) return vessels;
    const search = searchTerm.toLowerCase();
    return vessels.filter(v =>
      v.mmsi?.toLowerCase().includes(search) ||
      v.name?.toLowerCase().includes(search) ||
      v.callsign?.toLowerCase().includes(search) ||
      v.destination?.toLowerCase().includes(search)
    );
  }, [vessels, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Vessels"
          value={stats?.total_vessels ?? 0}
          subtitle="All tracked vessels"
          icon={Ship}
          color="cyan"
          isLoading={statsLoading}
        />
        <StatCard
          title="Active Vessels"
          value={stats?.active_vessels ?? 0}
          subtitle="Currently transmitting"
          icon={Activity}
          color="green"
          isLoading={statsLoading}
        />
        <StatCard
          title="Last Hour"
          value={stats?.vessels_last_hour ?? 0}
          subtitle="Vessels seen"
          icon={Clock}
          color="blue"
          isLoading={statsLoading}
        />
        <StatCard
          title="Avg Speed"
          value={stats?.avg_speed?.toFixed(1) ?? "—"}
          subtitle="Knots"
          icon={Navigation}
          color="purple"
          isLoading={statsLoading}
        />
      </div>

      {/* Search & View Toggle */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search vessels by MMSI, name, callsign..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-1">
          <Button
            variant={viewMode === "table" ? "default" : "ghost"}
            size="icon"
            onClick={() => setViewMode("table")}
          >
            <Table2 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "cards" ? "default" : "ghost"}
            size="icon"
            onClick={() => setViewMode("cards")}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Vessels List */}
      {vesselsLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : viewMode === "table" ? (
        <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>MMSI</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Speed</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Last Seen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVessels.slice(0, 50).map((vessel) => (
                <TableRow key={vessel.mmsi}>
                  <TableCell className="font-mono text-sm">{vessel.mmsi}</TableCell>
                  <TableCell className="font-medium">{vessel.name || "Unknown"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {vessel.ship_type_name || `Type ${vessel.ship_type}`}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {vessel.lat?.toFixed(4)}, {vessel.lon?.toFixed(4)}
                  </TableCell>
                  <TableCell>{vessel.speed?.toFixed(1) ?? "—"} kn</TableCell>
                  <TableCell>{vessel.course?.toFixed(0) ?? "—"}°</TableCell>
                  <TableCell className="max-w-[150px] truncate">{vessel.destination || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {vessel.last_seen ? formatDistanceToNow(new Date(vessel.last_seen), { addSuffix: true }) : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {filteredVessels.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No vessels found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVessels.slice(0, 30).map((vessel) => (
            <div key={vessel.mmsi} className="glass-card rounded-xl p-4 border border-border/50">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Ship className="w-5 h-5 text-cyan-400" />
                  <span className="font-medium">{vessel.name || "Unknown Vessel"}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {vessel.nav_status_name || "Unknown"}
                </Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">MMSI</span>
                  <span className="font-mono">{vessel.mmsi}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Position</span>
                  <span className="font-mono text-xs">{vessel.lat?.toFixed(4)}, {vessel.lon?.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Speed/Course</span>
                  <span>{vessel.speed?.toFixed(1) ?? "—"} kn / {vessel.course?.toFixed(0) ?? "—"}°</span>
                </div>
                {vessel.destination && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Destination</span>
                    <span className="truncate max-w-[120px]">{vessel.destination}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// APRS Section
const AprsSection = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("table");
  const { data: stations, isLoading: stationsLoading } = useAprsStations();
  const { data: stats, isLoading: statsLoading } = useAprsStats();
  const { data: weatherStations } = useAprsWeatherStations();

  const filteredStations = useMemo(() => {
    if (!stations) return [];
    if (!searchTerm.trim()) return stations;
    const search = searchTerm.toLowerCase();
    return stations.filter(s =>
      s.callsign?.toLowerCase().includes(search) ||
      s.comment?.toLowerCase().includes(search)
    );
  }, [stations, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Stations"
          value={stats?.total_stations ?? 0}
          subtitle="All tracked stations"
          icon={Radio}
          color="orange"
          isLoading={statsLoading}
        />
        <StatCard
          title="Active Stations"
          value={stats?.active_stations ?? 0}
          subtitle="Currently transmitting"
          icon={Activity}
          color="green"
          isLoading={statsLoading}
        />
        <StatCard
          title="Digipeaters"
          value={stats?.digipeaters ?? 0}
          subtitle="Network infrastructure"
          icon={Signal}
          color="purple"
          isLoading={statsLoading}
        />
        <StatCard
          title="Weather Stations"
          value={stats?.weather_stations ?? weatherStations?.length ?? 0}
          subtitle="Reporting weather"
          icon={Thermometer}
          color="blue"
          isLoading={statsLoading}
        />
      </div>

      {/* Packets Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-medium">Packets Last Hour</span>
          </div>
          <p className="text-2xl font-bold text-orange-400">
            {statsLoading ? "..." : (stats?.packets_last_hour ?? 0).toLocaleString()}
          </p>
        </div>
        <div className="glass-card rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-medium">Packets Last 24h</span>
          </div>
          <p className="text-2xl font-bold text-orange-400">
            {statsLoading ? "..." : (stats?.packets_last_24h ?? 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Search & View Toggle */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search stations by callsign..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-1">
          <Button
            variant={viewMode === "table" ? "default" : "ghost"}
            size="icon"
            onClick={() => setViewMode("table")}
          >
            <Table2 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "cards" ? "default" : "ghost"}
            size="icon"
            onClick={() => setViewMode("cards")}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stations List */}
      {stationsLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : viewMode === "table" ? (
        <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Callsign</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Altitude</TableHead>
                <TableHead>Speed</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead>Last Seen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStations.slice(0, 50).map((station, idx) => (
                <TableRow key={`${station.callsign}-${idx}`}>
                  <TableCell className="font-mono font-medium">
                    {station.callsign}{station.ssid ? `-${station.ssid}` : ""}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {station.lat?.toFixed(4)}, {station.lon?.toFixed(4)}
                  </TableCell>
                  <TableCell>{station.altitude ? `${station.altitude.toFixed(0)} m` : "—"}</TableCell>
                  <TableCell>{station.speed?.toFixed(1) ?? "—"} km/h</TableCell>
                  <TableCell>{station.course?.toFixed(0) ?? "—"}°</TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                    {station.comment || "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {station.last_seen ? formatDistanceToNow(new Date(station.last_seen), { addSuffix: true }) : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {filteredStations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No stations found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStations.slice(0, 30).map((station, idx) => (
            <div key={`${station.callsign}-${idx}`} className="glass-card rounded-xl p-4 border border-border/50">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Radio className="w-5 h-5 text-orange-400" />
                  <span className="font-mono font-medium">
                    {station.callsign}{station.ssid ? `-${station.ssid}` : ""}
                  </span>
                </div>
                {station.weather && (
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    WX
                  </Badge>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Position</span>
                  <span className="font-mono text-xs">{station.lat?.toFixed(4)}, {station.lon?.toFixed(4)}</span>
                </div>
                {station.altitude && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Altitude</span>
                    <span>{station.altitude.toFixed(0)} m</span>
                  </div>
                )}
                {station.weather && (
                  <div className="pt-2 border-t border-border/50 space-y-1">
                    {station.weather.temperature && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Thermometer className="w-3 h-3" /> Temp
                        </span>
                        <span>{station.weather.temperature.toFixed(1)}°C</span>
                      </div>
                    )}
                    {station.weather.humidity && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Droplets className="w-3 h-3" /> Humidity
                        </span>
                        <span>{station.weather.humidity.toFixed(0)}%</span>
                      </div>
                    )}
                    {station.weather.wind_speed && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Wind className="w-3 h-3" /> Wind
                        </span>
                        <span>{station.weather.wind_speed.toFixed(1)} km/h</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// EPIRB Section
const EpirbSection = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: beacons, isLoading: beaconsLoading } = useEpirbBeacons();
  const { data: stats, isLoading: statsLoading } = useEpirbStats();
  const { data: activeAlerts } = useEpirbActiveAlerts();

  const filteredBeacons = useMemo(() => {
    if (!beacons) return [];
    if (!searchTerm.trim()) return beacons;
    const search = searchTerm.toLowerCase();
    return beacons.filter(b =>
      b.beacon_id?.toLowerCase().includes(search) ||
      b.hex_id?.toLowerCase().includes(search) ||
      b.owner_info?.name?.toLowerCase().includes(search) ||
      b.owner_info?.vessel_name?.toLowerCase().includes(search)
    );
  }, [beacons, searchTerm]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">ACTIVE ALERT</Badge>;
      case 'test':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">TEST</Badge>;
      case 'resolved':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">RESOLVED</Badge>;
      default:
        return <Badge variant="outline">UNKNOWN</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Active Alerts Banner */}
      {(stats?.active_alerts ?? 0) > 0 && (
        <div className="glass-card rounded-xl p-4 border border-red-500/50 bg-red-500/10">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400 animate-pulse" />
            <div>
              <h3 className="font-semibold text-red-400">Active EPIRB Alerts</h3>
              <p className="text-sm text-muted-foreground">
                {stats?.active_alerts} beacon{stats?.active_alerts !== 1 ? 's' : ''} currently transmitting distress signals
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Beacons"
          value={stats?.total_beacons ?? 0}
          subtitle="Registered beacons"
          icon={Anchor}
          color="red"
          isLoading={statsLoading}
        />
        <StatCard
          title="Active Alerts"
          value={stats?.active_alerts ?? 0}
          subtitle="Distress signals"
          icon={AlertTriangle}
          color="red"
          isLoading={statsLoading}
        />
        <StatCard
          title="Test Alerts"
          value={stats?.test_alerts ?? 0}
          subtitle="Test transmissions"
          icon={Activity}
          color="orange"
          isLoading={statsLoading}
        />
        <StatCard
          title="Resolved (24h)"
          value={stats?.resolved_last_24h ?? 0}
          subtitle="Cases closed"
          icon={CheckCircle}
          color="green"
          isLoading={statsLoading}
        />
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search beacons by ID, vessel name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Beacons List */}
      {beaconsLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Beacon ID</TableHead>
                <TableHead>Hex ID</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Vessel/Owner</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Signal</TableHead>
                <TableHead>Activation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBeacons.slice(0, 50).map((beacon) => (
                <TableRow key={beacon.beacon_id} className={beacon.status === 'active' ? 'bg-red-500/5' : ''}>
                  <TableCell>{getStatusBadge(beacon.status)}</TableCell>
                  <TableCell className="font-mono text-sm">{beacon.beacon_id}</TableCell>
                  <TableCell className="font-mono text-xs">{beacon.hex_id}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {beacon.lat?.toFixed(4)}, {beacon.lon?.toFixed(4)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{beacon.owner_info?.vessel_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{beacon.owner_info?.name}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {beacon.beacon_type || beacon.protocol || "Unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {beacon.signal_strength ? `${beacon.signal_strength} dBm` : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {beacon.activation_time ? formatDistanceToNow(new Date(beacon.activation_time), { addSuffix: true }) : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {filteredBeacons.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No beacons found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

// Main Maritime Content
const MaritimeContent = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("ais");

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["aurora", "ais"] });
    queryClient.invalidateQueries({ queryKey: ["aurora", "aprs"] });
    queryClient.invalidateQueries({ queryKey: ["aurora", "epirb"] });
  };

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
            <Waves className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Maritime & RF Tracking</h1>
            <p className="text-muted-foreground">AIS vessels, APRS stations, and EPIRB beacons</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleRefresh}>
          <RefreshCw className="w-4 h-4" />
          Refresh All
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="ais" className="gap-2">
            <Ship className="w-4 h-4" />
            AIS Vessels
          </TabsTrigger>
          <TabsTrigger value="aprs" className="gap-2">
            <Radio className="w-4 h-4" />
            APRS Stations
          </TabsTrigger>
          <TabsTrigger value="epirb" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            EPIRB Beacons
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ais">
          <AisSection />
        </TabsContent>
        <TabsContent value="aprs">
          <AprsSection />
        </TabsContent>
        <TabsContent value="epirb">
          <EpirbSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MaritimeContent;
