import { useState, useMemo } from "react";
import {
  Sun,
  Volume2,
  RefreshCw,
  Loader2,
  Filter,
  Lightbulb,
  Waves,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  AreaChart,
  Area,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { useArduinoSensorTimeseries, useClients } from "@/hooks/useAuroraApi";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

const COLORS = {
  light: "#f59e0b",
  sound: "#8b5cf6",
};

const SoundLightAnalyticsContent = () => {
  const queryClient = useQueryClient();
  const [timeRange, setTimeRange] = useState("24");
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  
  const hours = parseInt(timeRange);
  
  const { data: arduinoData, isLoading } = useArduinoSensorTimeseries(hours);
  const { data: clients } = useClients();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["aurora", "arduino_sensor_kit"] });
  };

  // Get all unique devices
  const allDevices = useMemo(() => {
    const devices = new Set<string>();
    arduinoData?.readings?.forEach(r => r.device_id && devices.add(r.device_id));
    return Array.from(devices).sort();
  }, [arduinoData]);

  const isDeviceSelected = (deviceId: string) => 
    selectedDevices.length === 0 || selectedDevices.includes(deviceId);

  const toggleDevice = (deviceId: string) => {
    setSelectedDevices(prev => 
      prev.includes(deviceId)
        ? prev.filter(d => d !== deviceId)
        : [...prev, deviceId]
    );
  };

  // Process light and sound data
  const chartData = useMemo(() => {
    return (arduinoData?.readings || [])
      .filter(r => {
        if (r.device_id && !isDeviceSelected(r.device_id)) return false;
        return r.light_raw !== undefined || r.sound_raw !== undefined;
      })
      .map(r => ({
        time: format(new Date(r.timestamp), "HH:mm"),
        light: r.light_raw,
        sound: r.sound_raw,
        device: r.device_id,
      }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [arduinoData, selectedDevices]);

  // Calculate stats
  const stats = useMemo(() => {
    const lightValues: number[] = [];
    const soundValues: number[] = [];

    arduinoData?.readings?.forEach(r => {
      if (r.device_id && !isDeviceSelected(r.device_id)) return;
      if (r.light_raw !== undefined) lightValues.push(r.light_raw);
      if (r.sound_raw !== undefined) soundValues.push(r.sound_raw);
    });

    return {
      avgLight: lightValues.length > 0 ? lightValues.reduce((a, b) => a + b, 0) / lightValues.length : null,
      maxLight: lightValues.length > 0 ? Math.max(...lightValues) : null,
      minLight: lightValues.length > 0 ? Math.min(...lightValues) : null,
      avgSound: soundValues.length > 0 ? soundValues.reduce((a, b) => a + b, 0) / soundValues.length : null,
      maxSound: soundValues.length > 0 ? Math.max(...soundValues) : null,
      minSound: soundValues.length > 0 ? Math.min(...soundValues) : null,
      currentLight: lightValues.length > 0 ? lightValues[lightValues.length - 1] : null,
      currentSound: soundValues.length > 0 ? soundValues[soundValues.length - 1] : null,
      totalReadings: lightValues.length + soundValues.length,
    };
  }, [arduinoData, selectedDevices]);

  // Normalize for progress bars (assuming max raw value ~1023 for analog sensors)
  const lightPercent = stats.currentLight !== null ? Math.min(100, (stats.currentLight / 1023) * 100) : 0;
  const soundPercent = stats.currentSound !== null ? Math.min(100, (stats.currentSound / 1023) * 100) : 0;

  // Get light level description
  const getLightLevel = (value: number | null) => {
    if (value === null) return { level: "Unknown", color: "text-muted-foreground" };
    if (value < 100) return { level: "Very Dark", color: "text-blue-400" };
    if (value < 300) return { level: "Dim", color: "text-indigo-400" };
    if (value < 600) return { level: "Normal", color: "text-green-400" };
    if (value < 800) return { level: "Bright", color: "text-amber-400" };
    return { level: "Very Bright", color: "text-yellow-400" };
  };

  const getSoundLevel = (value: number | null) => {
    if (value === null) return { level: "Unknown", color: "text-muted-foreground" };
    if (value < 100) return { level: "Quiet", color: "text-green-400" };
    if (value < 300) return { level: "Moderate", color: "text-blue-400" };
    if (value < 600) return { level: "Loud", color: "text-amber-400" };
    return { level: "Very Loud", color: "text-red-400" };
  };

  const lightLevel = getLightLevel(stats.currentLight);
  const soundLevel = getSoundLevel(stats.currentSound);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Sun className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Sound & Light Analytics</h1>
            <p className="text-muted-foreground">Ambient light and sound level monitoring from Arduino sensors</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Device Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="w-4 h-4" />
                Devices
                {selectedDevices.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {selectedDevices.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="end">
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Filter by Device</span>
                  {selectedDevices.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setSelectedDevices([])}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                {allDevices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No devices found</p>
                ) : (
                  allDevices.map(device => (
                    <div
                      key={device}
                      className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer"
                      onClick={() => toggleDevice(device)}
                    >
                      <Checkbox checked={selectedDevices.includes(device)} />
                      <span className="text-sm truncate">{device}</span>
                    </div>
                  ))
                )}
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

      {/* Current Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Light Status */}
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-400" />
              Ambient Light
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold">
                  {stats.currentLight !== null ? stats.currentLight.toFixed(0) : "—"}
                </p>
                <p className={`text-sm font-medium ${lightLevel.color}`}>{lightLevel.level}</p>
              </div>
              <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Sun className={`w-10 h-10 ${lightPercent > 50 ? 'text-amber-400' : 'text-amber-700'}`} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Light Level</span>
                <span>{lightPercent.toFixed(0)}%</span>
              </div>
              <Progress value={lightPercent} className="h-2" />
            </div>
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
              <div className="text-center">
                <p className="text-lg font-semibold">{stats.minLight?.toFixed(0) ?? "—"}</p>
                <p className="text-xs text-muted-foreground">Min</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">{stats.avgLight?.toFixed(0) ?? "—"}</p>
                <p className="text-xs text-muted-foreground">Avg</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">{stats.maxLight?.toFixed(0) ?? "—"}</p>
                <p className="text-xs text-muted-foreground">Max</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sound Status */}
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-violet-400" />
              Sound Level
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold">
                  {stats.currentSound !== null ? stats.currentSound.toFixed(0) : "—"}
                </p>
                <p className={`text-sm font-medium ${soundLevel.color}`}>{soundLevel.level}</p>
              </div>
              <div className="w-20 h-20 rounded-full bg-violet-500/20 flex items-center justify-center">
                <Waves className="w-10 h-10 text-violet-400" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sound Level</span>
                <span>{soundPercent.toFixed(0)}%</span>
              </div>
              <Progress value={soundPercent} className="h-2" />
            </div>
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
              <div className="text-center">
                <p className="text-lg font-semibold">{stats.minSound?.toFixed(0) ?? "—"}</p>
                <p className="text-xs text-muted-foreground">Min</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">{stats.avgSound?.toFixed(0) ?? "—"}</p>
                <p className="text-xs text-muted-foreground">Avg</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">{stats.maxSound?.toFixed(0) ?? "—"}</p>
                <p className="text-xs text-muted-foreground">Max</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 mb-6">
        {/* Combined Chart */}
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Light & Sound Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Legend />
                    <Line type="monotone" dataKey="light" stroke={COLORS.light} name="Light Level" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="sound" stroke={COLORS.sound} name="Sound Level" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No light or sound data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Individual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Light Chart */}
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sun className="w-5 h-5 text-amber-400" />
              Light Level History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : chartData.filter(d => d.light !== undefined).length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="lightGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.light} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.light} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Area type="monotone" dataKey="light" stroke={COLORS.light} fill="url(#lightGradient)" name="Light" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No light data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sound Chart */}
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-violet-400" />
              Sound Level History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : chartData.filter(d => d.sound !== undefined).length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="soundGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.sound} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.sound} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Area type="monotone" dataKey="sound" stroke={COLORS.sound} fill="url(#soundGradient)" name="Sound" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No sound data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SoundLightAnalyticsContent;
