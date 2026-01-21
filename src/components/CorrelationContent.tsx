import { useMemo, useState, useEffect } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Legend,
  ScatterChart,
  Scatter,
} from "recharts";
import { 
  Activity, 
  Zap, 
  Thermometer, 
  Loader2,
  TrendingUp,
  GitCompare,
  Radio,
  Wifi,
  Cpu,
  RefreshCw,
} from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  TimePeriodSelector,
  ClientSelector,
  DROPDOWN_TRIGGER_STYLES,
  DROPDOWN_CONTENT_STYLES,
  DROPDOWN_ITEM_STYLES,
} from "@/components/ui/context-selectors";
import { Button } from "@/components/ui/button";
import { useClientContext } from "@/contexts/ClientContext";
import { 
  useStarlinkTimeseries,
  useThermalProbeTimeseries,
  useArduinoSensorTimeseries,
  useClientsWithHostnames,
  Client,
} from "@/hooks/aurora";
import { useQueryClient } from "@tanstack/react-query";

interface CorrelationStats {
  avgX: number;
  avgY: number;
  correlation: number;
  dataPoints: number;
}

const calculateCorrelation = (
  data: Array<{ x?: number; y?: number }>
): CorrelationStats => {
  const validPoints = data.filter(d => 
    d.x !== undefined && d.y !== undefined && 
    !isNaN(d.x) && !isNaN(d.y) &&
    isFinite(d.x) && isFinite(d.y)
  );
  
  if (validPoints.length < 2) {
    return { avgX: 0, avgY: 0, correlation: 0, dataPoints: 0 };
  }

  const avgX = validPoints.reduce((sum, d) => sum + (d.x || 0), 0) / validPoints.length;
  const avgY = validPoints.reduce((sum, d) => sum + (d.y || 0), 0) / validPoints.length;

  const n = validPoints.length;
  const sumXY = validPoints.reduce((sum, d) => sum + (d.x || 0) * (d.y || 0), 0);
  const sumX = validPoints.reduce((sum, d) => sum + (d.x || 0), 0);
  const sumY = validPoints.reduce((sum, d) => sum + (d.y || 0), 0);
  const sumX2 = validPoints.reduce((sum, d) => sum + (d.x || 0) ** 2, 0);
  const sumY2 = validPoints.reduce((sum, d) => sum + (d.y || 0) ** 2, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2));
  const correlation = denominator !== 0 ? numerator / denominator : 0;

  return { avgX, avgY, correlation, dataPoints: validPoints.length };
};

const getCorrelationLabel = (r: number) => {
  const abs = Math.abs(r);
  if (abs >= 0.7) return r > 0 ? "Strong Positive" : "Strong Negative";
  if (abs >= 0.4) return r > 0 ? "Moderate Positive" : "Moderate Negative";
  if (abs >= 0.2) return r > 0 ? "Weak Positive" : "Weak Negative";
  return "No Correlation";
};

const getCorrelationColor = (r: number) => {
  const abs = Math.abs(r);
  if (abs >= 0.7) return r > 0 ? "text-emerald-400" : "text-rose-400";
  if (abs >= 0.4) return r > 0 ? "text-cyan-400" : "text-amber-400";
  return "text-muted-foreground";
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  colorClass?: string;
  isLoading?: boolean;
}

const StatCard = ({ icon, label, value, subValue, colorClass = "text-foreground", isLoading }: StatCardProps) => (
  <div className="glass-card rounded-xl p-4 border border-border/50">
    <div className="flex items-center gap-3 mb-2">
      {icon}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className={`text-xl font-bold ${colorClass}`}>
          {isLoading ? '...' : value}
        </p>
        {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
      </div>
    </div>
  </div>
);

interface CorrelationChartProps {
  data: Array<{ time: string; x?: number; y?: number }>;
  xLabel: string;
  yLabel: string;
  xUnit: string;
  yUnit: string;
  xColor: string;
  yColor: string;
  isLoading: boolean;
  hours: number;
}

function CorrelationChart({ 
  data, xLabel, yLabel, xUnit, yUnit, xColor, yColor, isLoading, hours 
}: CorrelationChartProps) {
  return (
    <div className="glass-card rounded-xl border border-border/50">
      <div className="p-4 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <GitCompare className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">{xLabel} vs {yLabel}</h4>
            <p className="text-xs text-muted-foreground">Last {hours} hours</p>
          </div>
        </div>
        <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
          {data.length} samples
        </span>
      </div>
      <div className="p-4">
        {isLoading ? (
          <div className="h-[350px] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <div className="h-[350px] flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        ) : (
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`gradient-${xLabel.replace(/\s+/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={xColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={xColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  yAxisId="x"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}${xUnit}`}
                />
                <YAxis
                  yAxisId="y"
                  orientation="right"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}${yUnit}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'x') return [`${value?.toFixed(1)}${xUnit}`, xLabel];
                    if (name === 'y') return [`${value?.toFixed(1)}${yUnit}`, yLabel];
                    return [value, name];
                  }}
                />
                <Legend formatter={(value) => value === 'x' ? xLabel : yLabel} />
                <Area
                  yAxisId="x"
                  type="monotone"
                  dataKey="x"
                  name="x"
                  stroke={xColor}
                  strokeWidth={2}
                  fill={`url(#gradient-${xLabel.replace(/\s+/g, '-')})`}
                  connectNulls
                />
                <Line
                  yAxisId="y"
                  type="monotone"
                  dataKey="y"
                  name="y"
                  stroke={yColor}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

type TempMeasurement = 'thermal-probe' | 'arduino-dht' | 'arduino-bmp' | 'humidity';

const TEMP_MEASUREMENTS: { value: TempMeasurement; label: string }[] = [
  { value: 'thermal-probe', label: 'Thermal Probe' },
  { value: 'arduino-dht', label: 'Arduino DHT/AHT' },
  { value: 'arduino-bmp', label: 'Arduino BMP' },
  { value: 'humidity', label: 'Humidity' },
];

const CorrelationContent = () => {
  const { 
    selectedClientId: selectedClient, 
    setSelectedClientId: setSelectedClient,
    timePeriod,
    setTimePeriod,
    periodHours: timeRange 
  } = useClientContext();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("power-thermal");
  const [tempMeasurement, setTempMeasurement] = useState<TempMeasurement>('thermal-probe');
  
  // Fetch clients to auto-select first one
  const { data: clients } = useClientsWithHostnames();
  
  // Filter to active clients only
  const activeClients = useMemo(() => 
    clients?.filter((c: Client) => 
      c && c.client_id && !['deleted', 'disabled', 'suspended'].includes(c.state || '')
    ) || []
  , [clients]);
  
  // Auto-select first client if "all" is selected or no client is selected
  useEffect(() => {
    if (activeClients.length > 0 && (selectedClient === 'all' || !selectedClient)) {
      setSelectedClient(activeClients[0].client_id);
    }
  }, [activeClients, selectedClient, setSelectedClient]);
  
  // Pass clientId only if not 'all' - otherwise fetch globally
  const effectiveClientId = selectedClient === 'all' ? undefined : selectedClient;
  
  const { data: starlinkData, isLoading: starlinkLoading, refetch: refetchStarlink } = useStarlinkTimeseries(timeRange, effectiveClientId);
  const { data: thermalData, isLoading: thermalLoading, refetch: refetchThermal } = useThermalProbeTimeseries(timeRange, effectiveClientId);
  const { data: arduinoData, isLoading: arduinoLoading, refetch: refetchArduino } = useArduinoSensorTimeseries(timeRange, effectiveClientId);

  const isLoading = starlinkLoading || thermalLoading || arduinoLoading;

  // Refresh all data
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["aurora"] });
    refetchStarlink();
    refetchThermal();
    refetchArduino();
  };

  // Helper to format timestamp - more granular for better correlation matching
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    // Round to 5-minute intervals for better data pairing
    const minutes = Math.floor(date.getMinutes() / 5) * 5;
    return `${date.getHours().toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Get temperature label and unit based on selected measurement
  const getTempConfig = (measurement: TempMeasurement) => {
    switch (measurement) {
      case 'thermal-probe': return { label: 'Thermal Probe', unit: '°C', color: '#ef4444' };
      case 'arduino-dht': return { label: 'Arduino DHT/AHT', unit: '°C', color: '#22c55e' };
      case 'arduino-bmp': return { label: 'Arduino BMP', unit: '°C', color: '#3b82f6' };
      case 'humidity': return { label: 'Humidity', unit: '%', color: '#06b6d4' };
    }
  };

  // Debug logging for data availability
  useEffect(() => {
    console.log('[Correlation] Data sources:', {
      starlink: starlinkData?.readings?.length || 0,
      thermal: thermalData?.readings?.length || 0,
      arduino: arduinoData?.readings?.length || 0,
      clientId: effectiveClientId,
      timeRange
    });
  }, [starlinkData, thermalData, arduinoData, effectiveClientId, timeRange]);

  // Correlation 1: Starlink Power vs Selected Temperature Measurement
  const powerThermalData = useMemo(() => {
    const dataMap = new Map<string, { time: string; x?: number; y?: number }>();

    // Get Starlink power data from timeseries - extract from various possible locations
    starlinkData?.readings?.forEach((r: any) => {
      const time = formatTime(r.timestamp);
      const existing = dataMap.get(time) || { time };
      // Try multiple power field locations
      const power = r.power_w ?? r.power_watts ?? r.data?.power_w ?? r.data?.starlink?.power_watts;
      if (power !== undefined && !isNaN(power)) {
        existing.x = power;
        dataMap.set(time, existing);
      }
    });

    // Get temperature based on selected measurement
    if (tempMeasurement === 'thermal-probe') {
      thermalData?.readings?.forEach((r: any) => {
        const time = formatTime(r.timestamp);
        const existing = dataMap.get(time) || { time };
        const temp = r.temp_c ?? r.probe_c ?? r.ambient_c ?? r.data?.temperature_c ?? r.data?.temp_c;
        if (temp !== undefined && !isNaN(temp)) {
          existing.y = temp;
          dataMap.set(time, existing);
        }
      });
    } else if (tempMeasurement === 'arduino-dht') {
      arduinoData?.readings?.forEach((r: any) => {
        const time = formatTime(r.timestamp);
        const existing = dataMap.get(time) || { time };
        const temp = r.th_temp_c ?? r.data?.th?.temp_c ?? r.data?.aht_temp_c;
        if (temp !== undefined && !isNaN(temp)) {
          existing.y = temp;
          dataMap.set(time, existing);
        }
      });
    } else if (tempMeasurement === 'arduino-bmp') {
      arduinoData?.readings?.forEach((r: any) => {
        const time = formatTime(r.timestamp);
        const existing = dataMap.get(time) || { time };
        const temp = r.bmp_temp_c ?? r.data?.bmp?.temp_c ?? r.data?.bme280_temp_c;
        if (temp !== undefined && !isNaN(temp)) {
          existing.y = temp;
          dataMap.set(time, existing);
        }
      });
    } else if (tempMeasurement === 'humidity') {
      arduinoData?.readings?.forEach((r: any) => {
        const time = formatTime(r.timestamp);
        const existing = dataMap.get(time) || { time };
        const humidity = r.th_humidity ?? r.data?.th?.hum_pct ?? r.data?.aht_humidity;
        if (humidity !== undefined && !isNaN(humidity)) {
          existing.y = humidity;
          dataMap.set(time, existing);
        }
      });
    }

    return Array.from(dataMap.values())
      .filter(d => d.x !== undefined || d.y !== undefined)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [starlinkData, thermalData, arduinoData, tempMeasurement]);

  // Correlation 2: Starlink Power vs Arduino Temperature
  const powerArduinoData = useMemo(() => {
    const dataMap = new Map<string, { time: string; x?: number; y?: number }>();

    // Get Starlink power data from timeseries
    starlinkData?.readings?.forEach((r: any) => {
      const time = formatTime(r.timestamp);
      const existing = dataMap.get(time) || { time };
      const power = r.power_w ?? r.power_watts ?? r.data?.power_w ?? r.data?.starlink?.power_watts;
      if (power !== undefined && !isNaN(power)) {
        existing.x = power;
        dataMap.set(time, existing);
      }
    });

    // Get Arduino sensor temperature (DHT/AHT or BMP)
    arduinoData?.readings?.forEach((r: any) => {
      const time = formatTime(r.timestamp);
      const existing = dataMap.get(time) || { time };
      const temp = r.th_temp_c ?? r.bmp_temp_c ?? r.data?.th?.temp_c ?? r.data?.bmp?.temp_c ?? r.data?.aht_temp_c ?? r.data?.bme280_temp_c;
      if (temp !== undefined && !isNaN(temp)) {
        existing.y = temp;
        dataMap.set(time, existing);
      }
    });

    return Array.from(dataMap.values())
      .filter(d => d.x !== undefined || d.y !== undefined)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [starlinkData, arduinoData]);

  // Correlation 3: Thermal Probe vs Arduino Sensors
  const thermalArduinoData = useMemo(() => {
    const dataMap = new Map<string, { time: string; x?: number; y?: number }>();

    // Get thermal probe temperature
    thermalData?.readings?.forEach((r: any) => {
      const time = formatTime(r.timestamp);
      const existing = dataMap.get(time) || { time };
      const temp = r.temp_c ?? r.probe_c ?? r.ambient_c ?? r.data?.temperature_c ?? r.data?.temp_c;
      if (temp !== undefined && !isNaN(temp)) {
        existing.x = temp;
        dataMap.set(time, existing);
      }
    });

    // Get Arduino sensor temperature
    arduinoData?.readings?.forEach((r: any) => {
      const time = formatTime(r.timestamp);
      const existing = dataMap.get(time) || { time };
      const temp = r.th_temp_c ?? r.bmp_temp_c ?? r.data?.th?.temp_c ?? r.data?.bmp?.temp_c ?? r.data?.aht_temp_c ?? r.data?.bme280_temp_c;
      if (temp !== undefined && !isNaN(temp)) {
        existing.y = temp;
        dataMap.set(time, existing);
      }
    });

    return Array.from(dataMap.values())
      .filter(d => d.x !== undefined || d.y !== undefined)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [thermalData, arduinoData]);

  // Correlation 4: Latency vs Throughput (inverse relationship expected)
  const latencyThroughputData = useMemo(() => {
    if (!starlinkData?.readings) return [];

    return starlinkData.readings
      .map((r: any) => {
        const latency = r.pop_ping_latency_ms ?? r.data?.pop_ping_latency_ms ?? r.data?.starlink?.pop_ping_latency_ms;
        const throughput = r.downlink_throughput_bps ?? r.data?.downlink_throughput_bps ?? r.data?.starlink?.downlink_throughput_bps;
        return {
          time: formatTime(r.timestamp),
          x: latency !== undefined && !isNaN(latency) ? latency : undefined,
          y: throughput !== undefined && !isNaN(throughput) ? throughput / 1e6 : undefined,
        };
      })
      .filter((d: any) => d.x !== undefined || d.y !== undefined)
      .sort((a: any, b: any) => a.time.localeCompare(b.time));
  }, [starlinkData]);

  // Calculate stats for each pair
  const powerThermalStats = useMemo(() => calculateCorrelation(powerThermalData), [powerThermalData]);
  const powerArduinoStats = useMemo(() => calculateCorrelation(powerArduinoData), [powerArduinoData]);
  const thermalArduinoStats = useMemo(() => calculateCorrelation(thermalArduinoData), [thermalArduinoData]);
  const latencyThroughputStats = useMemo(() => calculateCorrelation(latencyThroughputData), [latencyThroughputData]);

  // Data availability summary for debugging - use exact activeTab keys
  const dataSummary = useMemo(() => ({
    'power-thermal': { total: powerThermalData.length, paired: powerThermalData.filter(d => d.x !== undefined && d.y !== undefined).length },
    'power-arduino': { total: powerArduinoData.length, paired: powerArduinoData.filter(d => d.x !== undefined && d.y !== undefined).length },
    'thermal-arduino': { total: thermalArduinoData.length, paired: thermalArduinoData.filter(d => d.x !== undefined && d.y !== undefined).length },
    'latency-throughput': { total: latencyThroughputData.length, paired: latencyThroughputData.filter(d => d.x !== undefined && d.y !== undefined).length },
  }), [powerThermalData, powerArduinoData, thermalArduinoData, latencyThroughputData]);

  const tempConfig = getTempConfig(tempMeasurement);

  const getCurrentData = () => {
    switch (activeTab) {
      case "power-thermal": return { data: powerThermalData, stats: powerThermalStats, xLabel: "Starlink Power", yLabel: tempConfig.label, xUnit: "W", yUnit: tempConfig.unit, xColor: "hsl(var(--chart-1))", yColor: tempConfig.color };
      case "power-arduino": return { data: powerArduinoData, stats: powerArduinoStats, xLabel: "Starlink Power", yLabel: "Arduino Temp", xUnit: "W", yUnit: "°C", xColor: "hsl(var(--chart-1))", yColor: "hsl(var(--chart-2))" };
      case "thermal-arduino": return { data: thermalArduinoData, stats: thermalArduinoStats, xLabel: "Thermal Probe", yLabel: "Arduino Temp", xUnit: "°C", yUnit: "°C", xColor: "hsl(var(--destructive))", yColor: "hsl(var(--chart-2))" };
      case "latency-throughput": return { data: latencyThroughputData, stats: latencyThroughputStats, xLabel: "Latency", yLabel: "Download", xUnit: "ms", yUnit: "Mbps", xColor: "hsl(var(--chart-4))", yColor: "hsl(var(--chart-3))" };
      default: return { data: powerThermalData, stats: powerThermalStats, xLabel: "Starlink Power", yLabel: tempConfig.label, xUnit: "W", yUnit: tempConfig.unit, xColor: "hsl(var(--chart-1))", yColor: tempConfig.color };
    }
  };

  const current = getCurrentData();

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8 flex-wrap">
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
          <GitCompare className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Correlation Analysis</h1>
          <p className="text-muted-foreground">
            Analyze relationships between sensor metrics
          </p>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {activeTab === 'power-thermal' && (
            <Select value={tempMeasurement} onValueChange={(v) => setTempMeasurement(v as TempMeasurement)}>
              <SelectTrigger className={`w-[160px] ${DROPDOWN_TRIGGER_STYLES}`}>
                <SelectValue placeholder="Temp Measurement" />
              </SelectTrigger>
              <SelectContent className={DROPDOWN_CONTENT_STYLES}>
                {TEMP_MEASUREMENTS.map(m => (
                  <SelectItem key={m.value} value={m.value} className={DROPDOWN_ITEM_STYLES}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <ClientSelector 
            value={selectedClient} 
            onChange={setSelectedClient} 
            showAllOption={false}
          />
          <TimePeriodSelector 
            value={timePeriod} 
            onChange={setTimePeriod} 
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
            className="h-9 w-9"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <span className="px-2 py-1 text-xs rounded bg-primary/20 text-primary border border-primary/30">
            {isLoading ? 'Loading...' : `${dataSummary[activeTab as keyof typeof dataSummary]?.paired || 0} paired`}
          </span>
        </div>
      </div>

      {/* Data availability info */}
      {!isLoading && (
        <div className="mb-4 text-xs text-muted-foreground flex items-center gap-4">
          <span>Data Sources: Starlink ({starlinkData?.readings?.length || 0}), Thermal ({thermalData?.readings?.length || 0}), Arduino ({arduinoData?.readings?.length || 0})</span>
          {selectedClient && selectedClient !== 'all' && (
            <span className="px-2 py-0.5 text-xs rounded border border-border bg-muted">Client: {selectedClient.slice(0, 8)}...</span>
          )}
        </div>
      )}

      {/* Correlation Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div 
          className={`glass-card rounded-xl p-4 border cursor-pointer transition-all ${activeTab === 'power-thermal' ? 'border-primary/50 bg-primary/10' : 'border-border/50 hover:border-border'}`}
          onClick={() => setActiveTab('power-thermal')}
        >
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-chart-1" />
            <Thermometer className="w-4 h-4 text-destructive" />
          </div>
          <p className="text-xs text-muted-foreground">Starlink Power ↔ {tempConfig.label}</p>
          <p className={`text-lg font-bold ${getCorrelationColor(powerThermalStats.correlation)}`}>
            r = {powerThermalStats.correlation.toFixed(3)}
          </p>
          <p className="text-xs text-muted-foreground">{powerThermalStats.dataPoints} paired • {getCorrelationLabel(powerThermalStats.correlation)}</p>
        </div>

        <div 
          className={`glass-card rounded-xl p-4 border cursor-pointer transition-all ${activeTab === 'power-arduino' ? 'border-primary/50 bg-primary/10' : 'border-border/50 hover:border-border'}`}
          onClick={() => setActiveTab('power-arduino')}
        >
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-chart-1" />
            <Cpu className="w-4 h-4 text-chart-2" />
          </div>
          <p className="text-xs text-muted-foreground">Starlink Power ↔ Arduino</p>
          <p className={`text-lg font-bold ${getCorrelationColor(powerArduinoStats.correlation)}`}>
            r = {powerArduinoStats.correlation.toFixed(3)}
          </p>
          <p className="text-xs text-muted-foreground">{powerArduinoStats.dataPoints} paired • {getCorrelationLabel(powerArduinoStats.correlation)}</p>
        </div>

        <div 
          className={`glass-card rounded-xl p-4 border cursor-pointer transition-all ${activeTab === 'thermal-arduino' ? 'border-destructive/50 bg-destructive/10' : 'border-border/50 hover:border-border'}`}
          onClick={() => setActiveTab('thermal-arduino')}
        >
          <div className="flex items-center gap-2 mb-2">
            <Thermometer className="w-4 h-4 text-destructive" />
            <Cpu className="w-4 h-4 text-chart-2" />
          </div>
          <p className="text-xs text-muted-foreground">Thermal ↔ Arduino</p>
          <p className={`text-lg font-bold ${getCorrelationColor(thermalArduinoStats.correlation)}`}>
            r = {thermalArduinoStats.correlation.toFixed(3)}
          </p>
          <p className="text-xs text-muted-foreground">{thermalArduinoStats.dataPoints} paired • {getCorrelationLabel(thermalArduinoStats.correlation)}</p>
        </div>

        <div 
          className={`glass-card rounded-xl p-4 border cursor-pointer transition-all ${activeTab === 'latency-throughput' ? 'border-chart-4/50 bg-chart-4/10' : 'border-border/50 hover:border-border'}`}
          onClick={() => setActiveTab('latency-throughput')}
        >
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-chart-4" />
            <Wifi className="w-4 h-4 text-chart-3" />
          </div>
          <p className="text-xs text-muted-foreground">Latency ↔ Throughput</p>
          <p className={`text-lg font-bold ${getCorrelationColor(latencyThroughputStats.correlation)}`}>
            r = {latencyThroughputStats.correlation.toFixed(3)}
          </p>
          <p className="text-xs text-muted-foreground">{latencyThroughputStats.dataPoints} paired • {getCorrelationLabel(latencyThroughputStats.correlation)}</p>
        </div>
      </div>

      {/* Stats for Selected Pair */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<div className="w-10 h-10 rounded-lg bg-chart-1/20 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-chart-1" /></div>}
          label={`Avg ${current.xLabel}`}
          value={`${current.stats.avgX.toFixed(1)} ${current.xUnit}`}
          colorClass="text-chart-1"
          isLoading={isLoading}
        />
        <StatCard
          icon={<div className="w-10 h-10 rounded-lg bg-chart-3/20 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-chart-3" /></div>}
          label={`Avg ${current.yLabel}`}
          value={`${current.stats.avgY.toFixed(1)} ${current.yUnit}`}
          colorClass="text-chart-3"
          isLoading={isLoading}
        />
        <StatCard
          icon={<div className="w-10 h-10 rounded-lg bg-chart-4/20 flex items-center justify-center"><GitCompare className="w-5 h-5 text-chart-4" /></div>}
          label="Correlation"
          value={current.stats.correlation.toFixed(3)}
          subValue={getCorrelationLabel(current.stats.correlation)}
          colorClass={getCorrelationColor(current.stats.correlation)}
          isLoading={isLoading}
        />
        <StatCard
          icon={<div className="w-10 h-10 rounded-lg bg-chart-2/20 flex items-center justify-center"><Activity className="w-5 h-5 text-chart-2" /></div>}
          label="Data Points"
          value={current.stats.dataPoints.toString()}
          colorClass="text-chart-2"
          isLoading={isLoading}
        />
      </div>

      {/* Main Chart */}
      <CorrelationChart
        data={current.data}
        xLabel={current.xLabel}
        yLabel={current.yLabel}
        xUnit={current.xUnit}
        yUnit={current.yUnit}
        xColor={current.xColor}
        yColor={current.yColor}
        isLoading={isLoading}
        hours={timeRange}
      />

      {/* Scatter Plot */}
      <div className="glass-card rounded-xl border border-border/50 mt-6">
        <div className="p-4 border-b border-border/30 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">Scatter Plot: {current.xLabel} vs {current.yLabel}</h4>
            <p className="text-xs text-muted-foreground">Direct relationship visualization</p>
          </div>
        </div>
        <div className="p-4">
          {isLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : current.data.filter(d => d.x !== undefined && d.y !== undefined).length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No paired data available
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis
                    dataKey="x"
                    type="number"
                    name={current.xLabel}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}${current.xUnit}`}
                    label={{ value: `${current.xLabel} (${current.xUnit})`, position: 'bottom', fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    dataKey="y"
                    type="number"
                    name={current.yLabel}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}${current.yUnit}`}
                    label={{ value: `${current.yLabel} (${current.yUnit})`, angle: -90, position: 'insideLeft', fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === current.xLabel) return [`${value?.toFixed(1)} ${current.xUnit}`, current.xLabel];
                      if (name === current.yLabel) return [`${value?.toFixed(1)} ${current.yUnit}`, current.yLabel];
                      return [value, name];
                    }}
                  />
                  <Scatter
                    name="Correlation"
                    data={current.data.filter(d => d.x !== undefined && d.y !== undefined)}
                    fill={current.xColor}
                    fillOpacity={0.6}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CorrelationContent;
