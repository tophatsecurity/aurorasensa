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
  Brush,
  ReferenceArea,
} from "recharts";
import { 
  Activity, 
  Zap, 
  Thermometer, 
  Loader2,
  TrendingUp,
  GitCompare,
  Wifi,
  Cpu,
  RefreshCw,
  AlertCircle,
  Flame,
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
  useCorrelationStarlinkData,
  useCorrelationThermalData,
  useCorrelationArduinoData,
  useRefreshCorrelationData,
  calculateCorrelation,
  CORRELATION_PAIRS,
  useClientsWithHostnames,
  formatTimeBucketDisplay,
  type CorrelationPairType,
  type CorrelationStats,
  type Client,
} from "@/hooks/aurora";

// =============================================
// HELPER FUNCTIONS
// =============================================

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

// =============================================
// STAT CARD COMPONENT
// =============================================

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  colorClass?: string;
  isLoading?: boolean;
}

function StatCard({ icon, label, value, subValue, colorClass = "text-foreground", isLoading }: StatCardProps) {
  return (
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
}

// =============================================
// CORRELATION CHART COMPONENT
// =============================================

interface CorrelationChartProps {
  data: Array<{ time: string; x?: number; y?: number; heater_on?: boolean }>;
  xLabel: string;
  yLabel: string;
  xUnit: string;
  yUnit: string;
  xColor: string;
  yColor: string;
  isLoading: boolean;
  hours: number;
  heaterRegions?: Array<{ start: string; end: string }>;
  showHeaterOverlay?: boolean;
}

function CorrelationChart({ 
  data, xLabel, yLabel, xUnit, yUnit, xColor, yColor, isLoading, hours, heaterRegions = [], showHeaterOverlay = false 
}: CorrelationChartProps) {
  const gradientId = `gradient-${xLabel.replace(/\s+/g, '-')}`;
  
  // Count heater active periods
  const heaterActiveCount = heaterRegions.length;
  
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
        <div className="flex items-center gap-2">
          {showHeaterOverlay && heaterActiveCount > 0 && (
            <span className="text-xs px-2 py-1 rounded bg-destructive/20 text-destructive flex items-center gap-1">
              <Flame className="w-3 h-3" />
              {heaterActiveCount} heater events
            </span>
          )}
          <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
            {data.length} samples
          </span>
        </div>
      </div>
      <div className="p-4">
        {isLoading ? (
          <div className="h-[350px] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <div className="h-[350px] flex flex-col items-center justify-center text-muted-foreground gap-2">
            <AlertCircle className="w-8 h-8" />
            <p>No data available</p>
          </div>
        ) : (
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 40 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
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
                  tickFormatter={(value) => formatTimeBucketDisplay(value)}
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
                    if (name === xLabel) return [`${value?.toFixed(1)}${xUnit}`, xLabel];
                    if (name === yLabel) return [`${value?.toFixed(1)}${yUnit}`, yLabel];
                    return [value, name];
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '10px' }}
                  payload={[
                    { value: xLabel, type: 'square', color: xColor },
                    { value: yLabel, type: 'line', color: yColor },
                    ...(showHeaterOverlay && heaterActiveCount > 0 ? [{ value: 'Dish Heater Active', type: 'rect' as const, color: 'hsl(var(--destructive))' }] : []),
                  ]}
                />
                <Area
                  yAxisId="x"
                  type="monotone"
                  dataKey="x"
                  name={xLabel}
                  stroke={xColor}
                  strokeWidth={3}
                  fill={`url(#${gradientId})`}
                  connectNulls
                />
                <Line
                  yAxisId="y"
                  type="monotone"
                  dataKey="y"
                  name={yLabel}
                  stroke={yColor}
                  strokeWidth={3}
                  dot={false}
                  connectNulls
                />
                {/* Heater active regions overlay */}
                {showHeaterOverlay && heaterRegions.map((region, idx) => (
                  <ReferenceArea
                    key={`heater-${idx}`}
                    x1={region.start}
                    x2={region.end}
                    fill="hsl(var(--destructive))"
                    fillOpacity={0.15}
                    stroke="hsl(var(--destructive))"
                    strokeOpacity={0.3}
                    strokeWidth={1}
                  />
                ))}
                <Brush 
                  dataKey="time" 
                  height={25} 
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--muted))"
                  tickFormatter={(value) => {
                    if (typeof value === 'string' && value.includes(' ')) {
                      return value.split(' ')[1];
                    }
                    return value;
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================
// SCATTER PLOT COMPONENT
// =============================================

interface ScatterPlotProps {
  data: Array<{ x?: number; y?: number }>;
  xLabel: string;
  yLabel: string;
  xUnit: string;
  yUnit: string;
  xColor: string;
  isLoading: boolean;
}

function ScatterPlot({ data, xLabel, yLabel, xUnit, yUnit, xColor, isLoading }: ScatterPlotProps) {
  const pairedData = data.filter(d => d.x !== undefined && d.y !== undefined);
  
  return (
    <div className="glass-card rounded-xl border border-border/50 mt-6">
      <div className="p-4 border-b border-border/30 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h4 className="font-semibold text-sm">Scatter Plot: {xLabel} vs {yLabel}</h4>
          <p className="text-xs text-muted-foreground">Direct relationship visualization ({pairedData.length} paired points)</p>
        </div>
      </div>
      <div className="p-4">
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : pairedData.length === 0 ? (
          <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground gap-2">
            <AlertCircle className="w-8 h-8" />
            <p>No paired data available</p>
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis
                  dataKey="x"
                  type="number"
                  name={xLabel}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}${xUnit}`}
                  label={{ value: `${xLabel} (${xUnit})`, position: 'bottom', fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  dataKey="y"
                  type="number"
                  name={yLabel}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}${yUnit}`}
                  label={{ value: `${yLabel} (${yUnit})`, angle: -90, position: 'insideLeft', fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === xLabel) return [`${value?.toFixed(1)} ${xUnit}`, xLabel];
                    if (name === yLabel) return [`${value?.toFixed(1)} ${yUnit}`, yLabel];
                    return [value, name];
                  }}
                />
                <Scatter
                  name="Correlation"
                  data={pairedData}
                  fill={xColor}
                  fillOpacity={0.6}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================
// CORRELATION PAIR CARD COMPONENT
// =============================================

interface CorrelationPairCardProps {
  id: CorrelationPairType;
  label: string;
  stats: CorrelationStats;
  isActive: boolean;
  onClick: () => void;
  xIcon: React.ReactNode;
  yIcon: React.ReactNode;
}

function CorrelationPairCard({ id, label, stats, isActive, onClick, xIcon, yIcon }: CorrelationPairCardProps) {
  const borderClass = isActive 
    ? id === 'thermal-arduino' ? 'border-destructive/50 bg-destructive/10' 
    : id === 'latency-throughput' ? 'border-chart-4/50 bg-chart-4/10'
    : 'border-primary/50 bg-primary/10'
    : 'border-border/50 hover:border-border';
    
  return (
    <div 
      className={`glass-card rounded-xl p-4 border cursor-pointer transition-all ${borderClass}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-2">
        {xIcon}
        {yIcon}
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${getCorrelationColor(stats.correlation)}`}>
        r = {stats.correlation.toFixed(3)}
      </p>
      <p className="text-xs text-muted-foreground">
        {stats.pairedPoints} paired • {getCorrelationLabel(stats.correlation)}
      </p>
    </div>
  );
}

// =============================================
// TEMPERATURE SOURCE SELECTOR
// =============================================

type TempMeasurement = 'thermal-probe' | 'arduino-dht' | 'arduino-bmp' | 'humidity';

const TEMP_MEASUREMENTS: { value: TempMeasurement; label: string }[] = [
  { value: 'thermal-probe', label: 'Thermal Probe' },
  { value: 'arduino-dht', label: 'Arduino DHT/AHT' },
  { value: 'arduino-bmp', label: 'Arduino BMP' },
  { value: 'humidity', label: 'Humidity' },
];

// =============================================
// MAIN COMPONENT
// =============================================

export default function CorrelationContent() {
  const { 
    selectedClientId: selectedClient, 
    setSelectedClientId: setSelectedClient,
    timePeriod,
    setTimePeriod,
    periodHours: timeRange 
  } = useClientContext();
  
  const [activeTab, setActiveTab] = useState<CorrelationPairType>("power-thermal");
  const [tempMeasurement, setTempMeasurement] = useState<TempMeasurement>('thermal-probe');
  
  // Fetch clients for auto-selection
  const { data: clients } = useClientsWithHostnames();
  const refreshCorrelation = useRefreshCorrelationData();
  
  // Filter to active clients only
  const activeClients = useMemo(() => 
    clients?.filter((c: Client) => 
      c && c.client_id && !['deleted', 'disabled', 'suspended'].includes(c.state || '')
    ) || []
  , [clients]);
  
  // Auto-select first client if "all" is selected
  useEffect(() => {
    if (activeClients.length > 0 && (selectedClient === 'all' || !selectedClient)) {
      setSelectedClient(activeClients[0].client_id);
    }
  }, [activeClients, selectedClient, setSelectedClient]);
  
  const effectiveClientId = selectedClient === 'all' ? undefined : selectedClient;
  
  // Fetch correlation data using new dedicated hooks
  const { data: starlinkData, isLoading: starlinkLoading } = useCorrelationStarlinkData(timeRange, effectiveClientId);
  const { data: thermalData, isLoading: thermalLoading } = useCorrelationThermalData(timeRange, effectiveClientId);
  const { data: arduinoData, isLoading: arduinoLoading } = useCorrelationArduinoData(timeRange, effectiveClientId);

  const isLoading = starlinkLoading || thermalLoading || arduinoLoading;

  // Debug logging
  useEffect(() => {
    console.log('[Correlation] Data loaded:', {
      starlink: starlinkData?.count || 0,
      thermal: thermalData?.count || 0,
      arduino: arduinoData?.count || 0,
      clientId: effectiveClientId,
      timeRange,
      sampleStarlink: starlinkData?.readings?.[0],
      sampleThermal: thermalData?.readings?.[0],
      sampleArduino: arduinoData?.readings?.[0],
    });
  }, [starlinkData, thermalData, arduinoData, effectiveClientId, timeRange]);

  // Build correlation datasets
  const powerThermalData = useMemo(() => {
    const dataMap = new Map<string, { time: string; x?: number; y?: number; heater_on?: boolean }>();

    // Starlink power
    starlinkData?.readings?.forEach(r => {
      if (r.time && r.power_w !== undefined) {
        const existing = dataMap.get(r.time) || { time: r.time };
        existing.x = r.power_w;
        existing.heater_on = r.heater_on;
        dataMap.set(r.time, existing);
      }
    });

    // Temperature based on selection
    if (tempMeasurement === 'thermal-probe') {
      thermalData?.readings?.forEach(r => {
        if (r.time && r.temp_c !== undefined) {
          const existing = dataMap.get(r.time) || { time: r.time };
          existing.y = r.temp_c;
          dataMap.set(r.time, existing);
        }
      });
    } else if (tempMeasurement === 'arduino-dht') {
      arduinoData?.readings?.forEach(r => {
        if (r.time && r.th_temp_c !== undefined) {
          const existing = dataMap.get(r.time) || { time: r.time };
          existing.y = r.th_temp_c;
          dataMap.set(r.time, existing);
        }
      });
    } else if (tempMeasurement === 'arduino-bmp') {
      arduinoData?.readings?.forEach(r => {
        if (r.time && r.bmp_temp_c !== undefined) {
          const existing = dataMap.get(r.time) || { time: r.time };
          existing.y = r.bmp_temp_c;
          dataMap.set(r.time, existing);
        }
      });
    } else if (tempMeasurement === 'humidity') {
      arduinoData?.readings?.forEach(r => {
        if (r.time && r.th_humidity !== undefined) {
          const existing = dataMap.get(r.time) || { time: r.time };
          existing.y = r.th_humidity;
          dataMap.set(r.time, existing);
        }
      });
    }

    return Array.from(dataMap.values())
      .filter(d => d.x !== undefined || d.y !== undefined)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [starlinkData, thermalData, arduinoData, tempMeasurement]);

  // Calculate heater active regions from sorted data
  const heaterRegions = useMemo(() => {
    const regions: Array<{ start: string; end: string }> = [];
    let currentRegion: { start: string; end: string } | null = null;

    // Use powerThermalData since it has heater_on from starlink
    powerThermalData.forEach((point, idx) => {
      if (point.heater_on) {
        if (!currentRegion) {
          currentRegion = { start: point.time, end: point.time };
        } else {
          currentRegion.end = point.time;
        }
      } else {
        if (currentRegion) {
          regions.push(currentRegion);
          currentRegion = null;
        }
      }
    });
    
    // Close any open region at the end
    if (currentRegion) {
      regions.push(currentRegion);
    }

    return regions;
  }, [powerThermalData]);

  const powerArduinoData = useMemo(() => {
    const dataMap = new Map<string, { time: string; x?: number; y?: number; heater_on?: boolean }>();

    starlinkData?.readings?.forEach(r => {
      if (r.time && r.power_w !== undefined) {
        const existing = dataMap.get(r.time) || { time: r.time };
        existing.x = r.power_w;
        existing.heater_on = r.heater_on;
        dataMap.set(r.time, existing);
      }
    });

    arduinoData?.readings?.forEach(r => {
      if (r.time) {
        const temp = r.th_temp_c ?? r.bmp_temp_c;
        if (temp !== undefined) {
          const existing = dataMap.get(r.time) || { time: r.time };
          existing.y = temp;
          dataMap.set(r.time, existing);
        }
      }
    });

    return Array.from(dataMap.values())
      .filter(d => d.x !== undefined || d.y !== undefined)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [starlinkData, arduinoData]);

  // Calculate heater regions for power-arduino chart
  const powerArduinoHeaterRegions = useMemo(() => {
    const regions: Array<{ start: string; end: string }> = [];
    let currentRegion: { start: string; end: string } | null = null;

    powerArduinoData.forEach((point) => {
      if (point.heater_on) {
        if (!currentRegion) {
          currentRegion = { start: point.time, end: point.time };
        } else {
          currentRegion.end = point.time;
        }
      } else {
        if (currentRegion) {
          regions.push(currentRegion);
          currentRegion = null;
        }
      }
    });
    
    if (currentRegion) {
      regions.push(currentRegion);
    }

    return regions;
  }, [powerArduinoData]);

  const thermalArduinoData = useMemo(() => {
    const dataMap = new Map<string, { time: string; x?: number; y?: number }>();

    thermalData?.readings?.forEach(r => {
      if (r.time && r.temp_c !== undefined) {
        const existing = dataMap.get(r.time) || { time: r.time };
        existing.x = r.temp_c;
        dataMap.set(r.time, existing);
      }
    });

    arduinoData?.readings?.forEach(r => {
      if (r.time) {
        const temp = r.th_temp_c ?? r.bmp_temp_c;
        if (temp !== undefined) {
          const existing = dataMap.get(r.time) || { time: r.time };
          existing.y = temp;
          dataMap.set(r.time, existing);
        }
      }
    });

    return Array.from(dataMap.values())
      .filter(d => d.x !== undefined || d.y !== undefined)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [thermalData, arduinoData]);

  const latencyThroughputData = useMemo(() => {
    if (!starlinkData?.readings) return [];

    return starlinkData.readings
      .filter(r => r.time)
      .map(r => ({
        time: r.time,
        x: r.pop_ping_latency_ms,
        y: r.downlink_throughput_bps !== undefined ? r.downlink_throughput_bps / 1e6 : undefined,
      }))
      .filter(d => d.x !== undefined || d.y !== undefined)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [starlinkData]);

  // Calculate stats
  const powerThermalStats = useMemo(() => calculateCorrelation(powerThermalData), [powerThermalData]);
  const powerArduinoStats = useMemo(() => calculateCorrelation(powerArduinoData), [powerArduinoData]);
  const thermalArduinoStats = useMemo(() => calculateCorrelation(thermalArduinoData), [thermalArduinoData]);
  const latencyThroughputStats = useMemo(() => calculateCorrelation(latencyThroughputData), [latencyThroughputData]);

  // Get current pair config and data
  const getCurrentData = () => {
    // Distinct color palette for each measurement type
    const MEASUREMENT_COLORS = {
      starlinkPower: '#06b6d4',      // Cyan - Starlink Power
      thermalProbe: '#ef4444',        // Red - Thermal Probe
      arduinoDht: '#22c55e',          // Green - Arduino DHT/AHT
      arduinoBmp: '#f59e0b',          // Amber - Arduino BMP
      humidity: '#8b5cf6',            // Purple - Humidity
      latency: '#ec4899',             // Pink - Latency
      download: '#3b82f6',            // Blue - Download
    };

    const tempConfig = {
      'thermal-probe': { label: 'Thermal Probe', unit: '°C', color: MEASUREMENT_COLORS.thermalProbe },
      'arduino-dht': { label: 'Arduino DHT/AHT', unit: '°C', color: MEASUREMENT_COLORS.arduinoDht },
      'arduino-bmp': { label: 'Arduino BMP', unit: '°C', color: MEASUREMENT_COLORS.arduinoBmp },
      'humidity': { label: 'Humidity', unit: '%', color: MEASUREMENT_COLORS.humidity },
    }[tempMeasurement];

    switch (activeTab) {
      case "power-thermal": 
        return { 
          data: powerThermalData, 
          stats: powerThermalStats, 
          xLabel: "Starlink Power", 
          yLabel: tempConfig.label, 
          xUnit: "W", 
          yUnit: tempConfig.unit, 
          xColor: MEASUREMENT_COLORS.starlinkPower, 
          yColor: tempConfig.color,
          heaterRegions: heaterRegions,
          showHeater: true,
        };
      case "power-arduino": 
        return { 
          data: powerArduinoData, 
          stats: powerArduinoStats, 
          xLabel: "Starlink Power", 
          yLabel: "Arduino Temp", 
          xUnit: "W", 
          yUnit: "°C", 
          xColor: MEASUREMENT_COLORS.starlinkPower, 
          yColor: MEASUREMENT_COLORS.arduinoDht,
          heaterRegions: powerArduinoHeaterRegions,
          showHeater: true,
        };
      case "thermal-arduino": 
        return { 
          data: thermalArduinoData, 
          stats: thermalArduinoStats, 
          xLabel: "Thermal Probe", 
          yLabel: "Arduino Temp", 
          xUnit: "°C", 
          yUnit: "°C", 
          xColor: MEASUREMENT_COLORS.thermalProbe, 
          yColor: MEASUREMENT_COLORS.arduinoDht,
          heaterRegions: [],
          showHeater: false,
        };
      case "latency-throughput": 
        return { 
          data: latencyThroughputData, 
          stats: latencyThroughputStats, 
          xLabel: "Latency", 
          yLabel: "Download", 
          xUnit: "ms", 
          yUnit: "Mbps", 
          xColor: MEASUREMENT_COLORS.latency, 
          yColor: MEASUREMENT_COLORS.download,
          heaterRegions: [],
          showHeater: false,
        };
      default: 
        return { 
          data: powerThermalData, 
          stats: powerThermalStats, 
          xLabel: "Starlink Power", 
          yLabel: tempConfig.label, 
          xUnit: "W", 
          yUnit: tempConfig.unit, 
          xColor: MEASUREMENT_COLORS.starlinkPower, 
          yColor: tempConfig.color,
          heaterRegions: heaterRegions,
          showHeater: true,
        };
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

        <div className="ml-auto flex items-center gap-3 flex-wrap">
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
            onClick={refreshCorrelation}
            disabled={isLoading}
            className="h-9 w-9"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <span className="px-2 py-1 text-xs rounded bg-primary/20 text-primary border border-primary/30">
            {isLoading ? 'Loading...' : `${current.stats.pairedPoints} paired`}
          </span>
        </div>
      </div>

      {/* Data availability info */}
      {!isLoading && (
        <div className="mb-4 text-xs text-muted-foreground flex items-center gap-4 flex-wrap">
          <span>
            Data Sources: Starlink ({starlinkData?.count || 0}), Thermal ({thermalData?.count || 0}), Arduino ({arduinoData?.count || 0})
          </span>
          {effectiveClientId && (
            <span className="px-2 py-0.5 text-xs rounded border border-border bg-muted">
              Client: {effectiveClientId.slice(0, 8)}...
            </span>
          )}
        </div>
      )}

      {/* Correlation Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <CorrelationPairCard
          id="power-thermal"
          label={`Starlink Power ↔ ${TEMP_MEASUREMENTS.find(m => m.value === tempMeasurement)?.label || 'Temp'}`}
          stats={powerThermalStats}
          isActive={activeTab === 'power-thermal'}
          onClick={() => setActiveTab('power-thermal')}
          xIcon={<Zap className="w-4 h-4 text-chart-1" />}
          yIcon={<Thermometer className="w-4 h-4 text-destructive" />}
        />
        <CorrelationPairCard
          id="power-arduino"
          label="Starlink Power ↔ Arduino"
          stats={powerArduinoStats}
          isActive={activeTab === 'power-arduino'}
          onClick={() => setActiveTab('power-arduino')}
          xIcon={<Zap className="w-4 h-4 text-chart-1" />}
          yIcon={<Cpu className="w-4 h-4 text-chart-2" />}
        />
        <CorrelationPairCard
          id="thermal-arduino"
          label="Thermal ↔ Arduino"
          stats={thermalArduinoStats}
          isActive={activeTab === 'thermal-arduino'}
          onClick={() => setActiveTab('thermal-arduino')}
          xIcon={<Thermometer className="w-4 h-4 text-destructive" />}
          yIcon={<Cpu className="w-4 h-4 text-chart-2" />}
        />
        <CorrelationPairCard
          id="latency-throughput"
          label="Latency ↔ Throughput"
          stats={latencyThroughputStats}
          isActive={activeTab === 'latency-throughput'}
          onClick={() => setActiveTab('latency-throughput')}
          xIcon={<Activity className="w-4 h-4 text-chart-4" />}
          yIcon={<Wifi className="w-4 h-4 text-chart-3" />}
        />
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
          value={current.stats.pairedPoints.toString()}
          subValue={`${current.stats.xCount}x / ${current.stats.yCount}y`}
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
        heaterRegions={current.heaterRegions}
        showHeaterOverlay={current.showHeater}
      />

      {/* Scatter Plot */}
      <ScatterPlot
        data={current.data}
        xLabel={current.xLabel}
        yLabel={current.yLabel}
        xUnit={current.xUnit}
        yUnit={current.yUnit}
        xColor={current.xColor}
        isLoading={isLoading}
      />
    </div>
  );
}
