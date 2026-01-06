import { useState, useMemo } from "react";
import {
  Move,
  RefreshCw,
  Loader2,
  Filter,
  Activity,
  Axis3D,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  RotateCcw,
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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import { useArduinoSensorTimeseries, useClients } from "@/hooks/useAuroraApi";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

const COLORS = {
  x: "#ef4444",
  y: "#22c55e",
  z: "#3b82f6",
  magnitude: "#8b5cf6",
};

const SENSOR_TYPES = ["accel_x", "accel_y", "accel_z", "magnitude"] as const;
type MovementSensorType = typeof SENSOR_TYPES[number];

const SENSOR_TYPE_LABELS: Record<MovementSensorType, string> = {
  accel_x: "X Axis (Lateral)",
  accel_y: "Y Axis (Vertical)",
  accel_z: "Z Axis (Forward)",
  magnitude: "Magnitude",
};

const MovementAnalyticsContent = () => {
  const queryClient = useQueryClient();
  const [timeRange, setTimeRange] = useState("24");
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedSensorTypes, setSelectedSensorTypes] = useState<MovementSensorType[]>([]);
  
  const hours = parseInt(timeRange);
  
  const { data: arduinoData, isLoading } = useArduinoSensorTimeseries(hours);
  const { data: clients } = useClients();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["aurora", "arduino_sensor_kit"] });
  };

  // Get all unique clients with accelerometer data
  const allClients = useMemo(() => {
    const clientIds = new Set<string>();
    arduinoData?.readings?.forEach(r => {
      if (r.client_id && (r.accel_x !== undefined || r.accel_y !== undefined || r.accel_z !== undefined)) {
        clientIds.add(r.client_id);
      }
    });
    return Array.from(clientIds).sort();
  }, [arduinoData]);

  // Map client_id to client name for display
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

  const isSensorTypeSelected = (type: MovementSensorType) => 
    selectedSensorTypes.length === 0 || selectedSensorTypes.includes(type);

  const toggleSensorType = (type: MovementSensorType) => {
    setSelectedSensorTypes(prev => 
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // Process accelerometer data
  const accelData = useMemo(() => {
    const showX = isSensorTypeSelected("accel_x");
    const showY = isSensorTypeSelected("accel_y");
    const showZ = isSensorTypeSelected("accel_z");
    const showMagnitude = isSensorTypeSelected("magnitude");
    
    return (arduinoData?.readings || [])
      .filter(r => {
        if (r.client_id && !isClientSelected(r.client_id)) return false;
        return r.accel_x !== undefined || r.accel_y !== undefined || r.accel_z !== undefined;
      })
      .map(r => {
        const x = r.accel_x ?? 0;
        const y = r.accel_y ?? 0;
        const z = r.accel_z ?? 0;
        const magnitude = Math.sqrt(x * x + y * y + z * z);
        
        return {
          time: format(new Date(r.timestamp), "HH:mm:ss"),
          x: showX ? x : undefined,
          y: showY ? y : undefined,
          z: showZ ? z : undefined,
          magnitude: showMagnitude ? magnitude : undefined,
          client: r.client_id,
        };
      })
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [arduinoData, selectedClients, selectedSensorTypes]);

  // Calculate stats
  const stats = useMemo(() => {
    const showX = isSensorTypeSelected("accel_x");
    const showY = isSensorTypeSelected("accel_y");
    const showZ = isSensorTypeSelected("accel_z");
    const showMagnitude = isSensorTypeSelected("magnitude");
    
    const xValues: number[] = [];
    const yValues: number[] = [];
    const zValues: number[] = [];
    const magnitudes: number[] = [];

    (arduinoData?.readings || [])
      .filter(r => {
        if (r.client_id && !isClientSelected(r.client_id)) return false;
        return r.accel_x !== undefined || r.accel_y !== undefined || r.accel_z !== undefined;
      })
      .forEach(r => {
        const x = r.accel_x ?? 0;
        const y = r.accel_y ?? 0;
        const z = r.accel_z ?? 0;
        const magnitude = Math.sqrt(x * x + y * y + z * z);
        
        if (showX) xValues.push(x);
        if (showY) yValues.push(y);
        if (showZ) zValues.push(z);
        if (showMagnitude) magnitudes.push(magnitude);
      });

    return {
      currentX: xValues.length > 0 ? xValues[xValues.length - 1] : null,
      currentY: yValues.length > 0 ? yValues[yValues.length - 1] : null,
      currentZ: zValues.length > 0 ? zValues[zValues.length - 1] : null,
      currentMagnitude: magnitudes.length > 0 ? magnitudes[magnitudes.length - 1] : null,
      avgX: xValues.length > 0 ? xValues.reduce((a, b) => a + b, 0) / xValues.length : null,
      avgY: yValues.length > 0 ? yValues.reduce((a, b) => a + b, 0) / yValues.length : null,
      avgZ: zValues.length > 0 ? zValues.reduce((a, b) => a + b, 0) / zValues.length : null,
      avgMagnitude: magnitudes.length > 0 ? magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length : null,
      maxMagnitude: magnitudes.length > 0 ? Math.max(...magnitudes) : null,
      minMagnitude: magnitudes.length > 0 ? Math.min(...magnitudes) : null,
      totalReadings: Math.max(xValues.length, yValues.length, zValues.length, magnitudes.length),
    };
  }, [arduinoData, selectedClients, selectedSensorTypes]);

  // Detect motion state
  const getMotionState = (magnitude: number | null) => {
    if (magnitude === null) return { state: "Unknown", color: "text-muted-foreground", description: "No data" };
    // Assuming gravity ~9.8 m/s², deviation indicates motion
    const gravityDeviation = Math.abs(magnitude - 9.8);
    if (gravityDeviation < 0.5) return { state: "Stationary", color: "text-green-400", description: "Device at rest" };
    if (gravityDeviation < 2) return { state: "Light Motion", color: "text-blue-400", description: "Minor movement" };
    if (gravityDeviation < 5) return { state: "Moderate Motion", color: "text-amber-400", description: "Active movement" };
    return { state: "High Motion", color: "text-red-400", description: "Significant movement" };
  };

  const motionState = getMotionState(stats.currentMagnitude);

  // 3D scatter data for XY and XZ planes
  const scatterXY = useMemo(() => 
    (arduinoData?.readings || [])
      .filter(r => !r.client_id || isClientSelected(r.client_id))
      .filter(r => r.accel_x !== undefined && r.accel_y !== undefined)
      .map(r => ({ 
        x: r.accel_x ?? 0, 
        y: r.accel_y ?? 0, 
        z: Math.sqrt((r.accel_x ?? 0) ** 2 + (r.accel_y ?? 0) ** 2 + (r.accel_z ?? 0) ** 2) 
      })), 
    [arduinoData, selectedClients]
  );
  
  const scatterXZ = useMemo(() => 
    (arduinoData?.readings || [])
      .filter(r => !r.client_id || isClientSelected(r.client_id))
      .filter(r => r.accel_x !== undefined && r.accel_z !== undefined)
      .map(r => ({ 
        x: r.accel_x ?? 0, 
        y: r.accel_z ?? 0, 
        z: Math.sqrt((r.accel_x ?? 0) ** 2 + (r.accel_y ?? 0) ** 2 + (r.accel_z ?? 0) ** 2) 
      })), 
    [arduinoData, selectedClients]
  );

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <Move className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Movement Analytics</h1>
            <p className="text-muted-foreground">Accelerometer data from Arduino sensors (X, Y, Z axes)</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Client Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
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
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Filter by Client</span>
                  {selectedClients.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setSelectedClients([])}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                {allClients.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No clients with accelerometer data</p>
                ) : (
                  allClients.map(clientId => (
                    <div
                      key={clientId}
                      className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer"
                      onClick={() => toggleClient(clientId)}
                    >
                      <Checkbox checked={selectedClients.includes(clientId)} />
                      <span className="text-sm truncate">{getClientName(clientId)}</span>
                    </div>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Sensor Type Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="w-4 h-4" />
                Axes
                {selectedSensorTypes.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {selectedSensorTypes.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="end">
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Filter by Axis</span>
                  {selectedSensorTypes.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setSelectedSensorTypes([])}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                {SENSOR_TYPES.map(type => (
                  <div
                    key={type}
                    className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer"
                    onClick={() => toggleSensorType(type)}
                  >
                    <Checkbox checked={selectedSensorTypes.includes(type)} />
                    <span className="text-sm truncate">{SENSOR_TYPE_LABELS[type]}</span>
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
              <SelectItem value="1">1 Hour</SelectItem>
              <SelectItem value="6">6 Hours</SelectItem>
              <SelectItem value="24">24 Hours</SelectItem>
              <SelectItem value="168">7 Days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Current Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* Motion State */}
        <Card className="glass-card border-border/50 col-span-1 md:col-span-2 lg:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <p className={`text-xl font-bold ${motionState.color}`}>{motionState.state}</p>
                <p className="text-xs text-muted-foreground">{motionState.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* X Axis */}
        <Card className="glass-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <ArrowRight className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.currentX !== null ? `${stats.currentX.toFixed(2)}` : "—"}
                </p>
                <p className="text-sm text-muted-foreground">X (m/s²)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Y Axis */}
        <Card className="glass-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <ArrowUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.currentY !== null ? `${stats.currentY.toFixed(2)}` : "—"}
                </p>
                <p className="text-sm text-muted-foreground">Y (m/s²)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Z Axis */}
        <Card className="glass-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <ArrowDown className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.currentZ !== null ? `${stats.currentZ.toFixed(2)}` : "—"}
                </p>
                <p className="text-sm text-muted-foreground">Z (m/s²)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Magnitude */}
        <Card className="glass-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <Axis3D className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.currentMagnitude !== null ? `${stats.currentMagnitude.toFixed(2)}` : "—"}
                </p>
                <p className="text-sm text-muted-foreground">Magnitude</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart - All Axes */}
      <Card className="glass-card border-border/50 mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Axis3D className="w-5 h-5 text-primary" />
            Acceleration Over Time (All Axes)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : accelData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={accelData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Legend />
                  <Line type="monotone" dataKey="x" stroke={COLORS.x} name="X Axis" dot={false} strokeWidth={1.5} />
                  <Line type="monotone" dataKey="y" stroke={COLORS.y} name="Y Axis" dot={false} strokeWidth={1.5} />
                  <Line type="monotone" dataKey="z" stroke={COLORS.z} name="Z Axis" dot={false} strokeWidth={1.5} />
                  <Line type="monotone" dataKey="magnitude" stroke={COLORS.magnitude} name="Magnitude" dot={false} strokeWidth={2} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No accelerometer data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Individual Axis Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* X Axis */}
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-red-400" />
              X Axis (Lateral)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : accelData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={accelData}>
                    <defs>
                      <linearGradient id="xGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.x} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.x} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={10} hide />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Area type="monotone" dataKey="x" stroke={COLORS.x} fill="url(#xGradient)" name="X" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No data
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Y Axis */}
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowUp className="w-5 h-5 text-green-400" />
              Y Axis (Vertical)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : accelData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={accelData}>
                    <defs>
                      <linearGradient id="yGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.y} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.y} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={10} hide />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Area type="monotone" dataKey="y" stroke={COLORS.y} fill="url(#yGradient)" name="Y" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No data
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Z Axis */}
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowDown className="w-5 h-5 text-blue-400" />
              Z Axis (Forward)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : accelData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={accelData}>
                    <defs>
                      <linearGradient id="zGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.z} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.z} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={10} hide />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Area type="monotone" dataKey="z" stroke={COLORS.z} fill="url(#zGradient)" name="Z" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No data
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistics Summary */}
      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Accelerometer Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/20">
              <p className="text-lg font-semibold">{stats.avgX?.toFixed(2) ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Avg X (m/s²)</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/20">
              <p className="text-lg font-semibold">{stats.avgY?.toFixed(2) ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Avg Y (m/s²)</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/20">
              <p className="text-lg font-semibold">{stats.avgZ?.toFixed(2) ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Avg Z (m/s²)</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/20">
              <p className="text-lg font-semibold">{stats.avgMagnitude?.toFixed(2) ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Avg Magnitude</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/20">
              <p className="text-lg font-semibold">{stats.maxMagnitude?.toFixed(2) ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Max Magnitude</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/20">
              <p className="text-lg font-semibold">{stats.totalReadings}</p>
              <p className="text-xs text-muted-foreground">Total Readings</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MovementAnalyticsContent;
