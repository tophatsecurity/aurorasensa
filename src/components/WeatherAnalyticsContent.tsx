import { useState, useMemo } from "react";
import {
  Thermometer,
  Droplets,
  Wind,
  Cloud,
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  Filter,
  Check,
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
  AreaChart,
  Area,
  Legend,
} from "recharts";
import {
  useThermalProbeTimeseries,
  useAhtSensorTimeseries,
  useArduinoSensorTimeseries,
  useBmtSensorTimeseries,
  useClients,
} from "@/hooks/useAuroraApi";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

const COLORS = {
  aht: "#22c55e",
  bmt: "#3b82f6", 
  thermal: "#f59e0b",
  arduino_th: "#8b5cf6",
  arduino_bmp: "#ec4899",
  humidity: "#06b6d4",
};

const WeatherAnalyticsContent = () => {
  const queryClient = useQueryClient();
  const [timeRange, setTimeRange] = useState("24");
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  
  const hours = parseInt(timeRange);
  
  // Fetch data from all weather-related sensors
  const { data: thermalData, isLoading: thermalLoading } = useThermalProbeTimeseries(hours);
  const { data: ahtData, isLoading: ahtLoading } = useAhtSensorTimeseries(hours);
  const { data: arduinoData, isLoading: arduinoLoading } = useArduinoSensorTimeseries(hours);
  const { data: bmtData, isLoading: bmtLoading } = useBmtSensorTimeseries(hours);
  const { data: clients } = useClients();
  
  const isLoading = thermalLoading || ahtLoading || arduinoLoading || bmtLoading;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["aurora"] });
  };

  // Get all unique clients from all sources
  const allClients = useMemo(() => {
    const clientIds = new Set<string>();
    
    thermalData?.readings?.forEach(r => r.client_id && clientIds.add(r.client_id));
    ahtData?.readings?.forEach(r => r.client_id && clientIds.add(r.client_id));
    arduinoData?.readings?.forEach(r => r.client_id && clientIds.add(r.client_id));
    bmtData?.readings?.forEach(r => r.client_id && clientIds.add(r.client_id));
    
    return Array.from(clientIds).sort();
  }, [thermalData, ahtData, arduinoData, bmtData]);

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

  // Combine temperature data from all sources
  const temperatureChartData = useMemo(() => {
    const timeMap = new Map<string, Record<string, number | null>>();

    // Process AHT sensor data
    ahtData?.readings?.forEach(r => {
      if (r.client_id && !isClientSelected(r.client_id)) return;
      const temp = r.aht_temp_c ?? r.temp_c;
      if (temp !== undefined) {
        const time = format(new Date(r.timestamp), "HH:mm");
        const existing = timeMap.get(time) || {};
        existing.aht = temp;
        timeMap.set(time, existing);
      }
    });

    // Process BMT sensor data
    bmtData?.readings?.forEach(r => {
      if (r.client_id && !isClientSelected(r.client_id)) return;
      const temp = r.bme280_temp_c ?? r.temp_c;
      if (temp !== undefined) {
        const time = format(new Date(r.timestamp), "HH:mm");
        const existing = timeMap.get(time) || {};
        existing.bmt = temp;
        timeMap.set(time, existing);
      }
    });

    // Process Thermal Probe data
    thermalData?.readings?.forEach(r => {
      if (r.client_id && !isClientSelected(r.client_id)) return;
      const temp = r.temp_c ?? r.probe_c ?? r.ambient_c;
      if (temp !== undefined) {
        const time = format(new Date(r.timestamp), "HH:mm");
        const existing = timeMap.get(time) || {};
        existing.thermal = temp;
        timeMap.set(time, existing);
      }
    });

    // Process Arduino TH data
    arduinoData?.readings?.forEach(r => {
      if (r.client_id && !isClientSelected(r.client_id)) return;
      if (r.th_temp_c !== undefined) {
        const time = format(new Date(r.timestamp), "HH:mm");
        const existing = timeMap.get(time) || {};
        existing.arduino_th = r.th_temp_c;
        timeMap.set(time, existing);
      }
      if (r.bmp_temp_c !== undefined) {
        const time = format(new Date(r.timestamp), "HH:mm");
        const existing = timeMap.get(time) || {};
        existing.arduino_bmp = r.bmp_temp_c;
        timeMap.set(time, existing);
      }
    });

    return Array.from(timeMap.entries())
      .map(([time, values]) => ({ time, ...values }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [thermalData, ahtData, arduinoData, bmtData, selectedClients]);

  // Combine humidity data
  const humidityChartData = useMemo(() => {
    const timeMap = new Map<string, Record<string, number | null>>();

    ahtData?.readings?.forEach(r => {
      if (r.client_id && !isClientSelected(r.client_id)) return;
      const humidity = r.aht_humidity ?? r.humidity;
      if (humidity !== undefined) {
        const time = format(new Date(r.timestamp), "HH:mm");
        const existing = timeMap.get(time) || {};
        existing.aht = humidity;
        timeMap.set(time, existing);
      }
    });

    arduinoData?.readings?.forEach(r => {
      if (r.client_id && !isClientSelected(r.client_id)) return;
      if (r.th_humidity !== undefined) {
        const time = format(new Date(r.timestamp), "HH:mm");
        const existing = timeMap.get(time) || {};
        existing.arduino = r.th_humidity;
        timeMap.set(time, existing);
      }
    });

    return Array.from(timeMap.entries())
      .map(([time, values]) => ({ time, ...values }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [ahtData, arduinoData, selectedClients]);

  // Pressure data from Arduino BMP sensor
  const pressureChartData = useMemo(() => {
    return (arduinoData?.readings || [])
      .filter(r => {
        if (r.client_id && !isClientSelected(r.client_id)) return false;
        return r.bmp_pressure_hpa !== undefined;
      })
      .map(r => ({
        time: format(new Date(r.timestamp), "HH:mm"),
        pressure: r.bmp_pressure_hpa,
      }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [arduinoData, selectedClients]);

  // Calculate stats
  const stats = useMemo(() => {
    const temps: number[] = [];
    const humidities: number[] = [];
    const pressures: number[] = [];

    ahtData?.readings?.forEach(r => {
      if (r.client_id && !isClientSelected(r.client_id)) return;
      const temp = r.aht_temp_c ?? r.temp_c;
      if (temp !== undefined) temps.push(temp);
      const hum = r.aht_humidity ?? r.humidity;
      if (hum !== undefined) humidities.push(hum);
    });

    thermalData?.readings?.forEach(r => {
      if (r.client_id && !isClientSelected(r.client_id)) return;
      const temp = r.temp_c ?? r.probe_c ?? r.ambient_c;
      if (temp !== undefined) temps.push(temp);
    });

    arduinoData?.readings?.forEach(r => {
      if (r.client_id && !isClientSelected(r.client_id)) return;
      if (r.th_temp_c !== undefined) temps.push(r.th_temp_c);
      if (r.bmp_temp_c !== undefined) temps.push(r.bmp_temp_c);
      if (r.th_humidity !== undefined) humidities.push(r.th_humidity);
      if (r.bmp_pressure_hpa !== undefined) pressures.push(r.bmp_pressure_hpa);
    });

    return {
      avgTemp: temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : null,
      minTemp: temps.length > 0 ? Math.min(...temps) : null,
      maxTemp: temps.length > 0 ? Math.max(...temps) : null,
      avgHumidity: humidities.length > 0 ? humidities.reduce((a, b) => a + b, 0) / humidities.length : null,
      avgPressure: pressures.length > 0 ? pressures.reduce((a, b) => a + b, 0) / pressures.length : null,
      totalReadings: temps.length + humidities.length + pressures.length,
    };
  }, [ahtData, thermalData, arduinoData, selectedClients]);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Thermometer className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Weather Analytics</h1>
            <p className="text-muted-foreground">Temperature, humidity, and pressure data from all sensors</p>
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
                  <p className="text-sm text-muted-foreground">No clients found</p>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card className="glass-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Thermometer className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.avgTemp !== null ? `${stats.avgTemp.toFixed(1)}°C` : "—"}
                </p>
                <p className="text-sm text-muted-foreground">Avg Temperature</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.maxTemp !== null ? `${stats.maxTemp.toFixed(1)}°C` : "—"}
                </p>
                <p className="text-sm text-muted-foreground">Max Temperature</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.minTemp !== null ? `${stats.minTemp.toFixed(1)}°C` : "—"}
                </p>
                <p className="text-sm text-muted-foreground">Min Temperature</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <Droplets className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.avgHumidity !== null ? `${stats.avgHumidity.toFixed(1)}%` : "—"}
                </p>
                <p className="text-sm text-muted-foreground">Avg Humidity</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <Wind className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.avgPressure !== null ? `${stats.avgPressure.toFixed(0)}` : "—"}
                </p>
                <p className="text-sm text-muted-foreground">Avg Pressure (hPa)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Temperature Chart */}
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Thermometer className="w-5 h-5 text-amber-400" />
              All Temperature Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : temperatureChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={temperatureChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Legend />
                    <Line type="monotone" dataKey="aht" stroke={COLORS.aht} name="AHT Sensor" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="bmt" stroke={COLORS.bmt} name="BMT Sensor" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="thermal" stroke={COLORS.thermal} name="Thermal Probe" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="arduino_th" stroke={COLORS.arduino_th} name="Arduino TH" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="arduino_bmp" stroke={COLORS.arduino_bmp} name="Arduino BMP" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No temperature data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Humidity Chart */}
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Droplets className="w-5 h-5 text-cyan-400" />
              Humidity Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : humidityChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={humidityChartData}>
                    <defs>
                      <linearGradient id="humidityGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.humidity} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.humidity} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} domain={[0, 100]} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Legend />
                    <Area type="monotone" dataKey="aht" stroke={COLORS.aht} fill="url(#humidityGradient)" name="AHT Humidity" />
                    <Area type="monotone" dataKey="arduino" stroke={COLORS.arduino_th} fill="none" name="Arduino Humidity" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No humidity data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pressure Chart */}
      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wind className="w-5 h-5 text-violet-400" />
            Barometric Pressure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : pressureChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={pressureChartData}>
                  <defs>
                    <linearGradient id="pressureGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Area type="monotone" dataKey="pressure" stroke="#8b5cf6" fill="url(#pressureGradient)" name="Pressure (hPa)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No pressure data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeatherAnalyticsContent;
