import { useState, useMemo } from "react";
import { Zap, Battery, Sun, Plug, RefreshCw, Loader2, Satellite, Cpu, Usb, Server, HardDrive, Wifi, Radio, Monitor, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Legend, PieChart, Pie, Cell } from "recharts";
import { useDashboardTimeseries, useComprehensiveStats, useStarlinkPower, useAllSensorStats, useSensorStatsHistory, useDeviceStatsHistory, useSensorTypeStats, StarlinkPowerDeviceSummary } from "@/hooks/useAuroraApi";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  ContextFilters, 
  TimePeriodOption, 
  timePeriodToHours 
} from "@/components/ui/context-selectors";

// Colors for different devices
const DEVICE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

// Device type icons and labels
const DEVICE_TYPE_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>, label: string, color: string }> = {
  starlink: { icon: Satellite, label: "Starlink", color: "hsl(var(--chart-1))" },
  system_monitor: { icon: Cpu, label: "System/CPU", color: "hsl(var(--chart-2))" },
  usb_device: { icon: Usb, label: "USB Devices", color: "hsl(var(--chart-3))" },
  wifi_scanner: { icon: Wifi, label: "WiFi Scanner", color: "hsl(var(--chart-4))" },
  bluetooth_scanner: { icon: Radio, label: "Bluetooth", color: "hsl(var(--chart-5))" },
  lora_detector: { icon: Radio, label: "LoRa", color: "hsl(210 100% 60%)" },
  adsb_receiver: { icon: Monitor, label: "ADS-B", color: "hsl(280 100% 60%)" },
  thermal_probe: { icon: Activity, label: "Thermal Probe", color: "hsl(0 100% 60%)" },
  aht_sensor: { icon: Activity, label: "AHT Sensor", color: "hsl(120 100% 40%)" },
  bmt_sensor: { icon: Activity, label: "BMT Sensor", color: "hsl(45 100% 50%)" },
};

// Estimated power consumption by device type (in watts)
const DEVICE_POWER_ESTIMATES: Record<string, { idle: number, active: number }> = {
  starlink: { idle: 40, active: 100 },
  system_monitor: { idle: 5, active: 65 },
  usb_device: { idle: 0.5, active: 2.5 },
  wifi_scanner: { idle: 1, active: 3 },
  bluetooth_scanner: { idle: 0.5, active: 1.5 },
  lora_detector: { idle: 0.1, active: 0.5 },
  adsb_receiver: { idle: 2, active: 5 },
  thermal_probe: { idle: 0.05, active: 0.1 },
  aht_sensor: { idle: 0.01, active: 0.02 },
  bmt_sensor: { idle: 0.01, active: 0.02 },
};

const PowerContent = () => {
  const queryClient = useQueryClient();
  const [timePeriod, setTimePeriod] = useState<TimePeriodOption>('24h');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  
  const periodHours = timePeriodToHours(timePeriod);
  
  const { data: stats, isLoading: statsLoading } = useComprehensiveStats();
  const { data: timeseries, isLoading: timeseriesLoading } = useDashboardTimeseries(periodHours);
  const { data: starlinkPower, isLoading: starlinkPowerLoading } = useStarlinkPower();
  const { data: allSensorStats, isLoading: sensorStatsLoading } = useAllSensorStats();
  const { data: sensorHistory, isLoading: sensorHistoryLoading } = useSensorStatsHistory(periodHours);
  const { data: deviceHistory, isLoading: deviceHistoryLoading } = useDeviceStatsHistory(periodHours);
  const { data: systemMonitorStats } = useSensorTypeStats("system_monitor");

  const isLoading = statsLoading || timeseriesLoading || starlinkPowerLoading || sensorStatsLoading || sensorHistoryLoading || deviceHistoryLoading;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["aurora", "dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["aurora", "starlink", "power"] });
    queryClient.invalidateQueries({ queryKey: ["aurora", "stats", "sensors"] });
    queryClient.invalidateQueries({ queryKey: ["aurora", "stats", "history"] });
  };

  // Transform power timeseries data for charts
  const powerChartData = timeseries?.power?.map((point) => ({
    time: format(new Date(point.timestamp), "HH:mm"),
    power: point.value,
  })) || [];

  // Process Starlink power data per device
  const starlinkDevicePower = useMemo(() => {
    return starlinkPower?.device_summaries || [];
  }, [starlinkPower]);

  // Process Starlink power timeseries per device
  const starlinkPowerTimeseries = useMemo(() => {
    if (!starlinkPower?.power_data?.length) return [];
    
    // Group by timestamp and create data points with each device's power
    const timeMap = new Map<string, Record<string, string | number>>();
    
    starlinkPower.power_data.forEach(point => {
      const time = format(new Date(point.timestamp), "HH:mm");
      if (!timeMap.has(time)) {
        timeMap.set(time, { time });
      }
      const entry = timeMap.get(time)!;
      entry[point.device_id] = point.power_watts;
    });
    
    return Array.from(timeMap.values()).sort((a, b) => 
      String(a.time).localeCompare(String(b.time))
    );
  }, [starlinkPower]);

  // Total Starlink power
  const totalStarlinkPower = useMemo(() => {
    return starlinkDevicePower.reduce((sum, device) => sum + (device.overall?.avg_watts || 0), 0);
  }, [starlinkDevicePower]);

  // Calculate device type power breakdown
  const devicePowerBreakdown = useMemo(() => {
    const sensorTypes = allSensorStats?.sensor_types || [];
    const breakdown: Array<{
      device_type: string;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      color: string;
      device_count: number;
      estimated_power: number;
      real_power?: number;
      readings: number;
      active: boolean;
    }> = [];

    sensorTypes.forEach(sensor => {
      const config = DEVICE_TYPE_CONFIG[sensor.device_type] || {
        icon: Server,
        label: sensor.device_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        color: "hsl(var(--muted-foreground))"
      };
      
      const powerEstimate = DEVICE_POWER_ESTIMATES[sensor.device_type] || { idle: 1, active: 2 };
      const isActive = sensor.readings_last_hour ? sensor.readings_last_hour > 0 : false;
      
      // Use real power data for Starlink if available
      let realPower: number | undefined;
      if (sensor.device_type === 'starlink' && totalStarlinkPower > 0) {
        realPower = totalStarlinkPower;
      }
      
      // Check for power_w in numeric_field_stats_24h
      const powerStats = sensor.numeric_field_stats_24h?.power_w || sensor.numeric_field_stats_24h?.power_watts;
      if (powerStats?.avg) {
        realPower = powerStats.avg * (sensor.device_count || 1);
      }
      
      const estimatedPower = realPower ?? (isActive ? powerEstimate.active : powerEstimate.idle) * (sensor.device_count || 1);
      
      breakdown.push({
        device_type: sensor.device_type,
        label: config.label,
        icon: config.icon,
        color: config.color,
        device_count: sensor.device_count || 1,
        estimated_power: estimatedPower,
        real_power: realPower,
        readings: sensor.total_readings || sensor.count || 0,
        active: isActive,
      });
    });

    // Sort by power consumption
    return breakdown.sort((a, b) => b.estimated_power - a.estimated_power);
  }, [allSensorStats, totalStarlinkPower]);

  // Total estimated power across all devices
  const totalEstimatedPower = useMemo(() => {
    return devicePowerBreakdown.reduce((sum, d) => sum + d.estimated_power, 0);
  }, [devicePowerBreakdown]);

  // Process sensor history for power trends by device type
  const sensorPowerHistory = useMemo(() => {
    if (!sensorHistory?.length) return [];
    
    // Group by timestamp
    const timeMap = new Map<string, Record<string, string | number>>();
    
    sensorHistory.forEach(point => {
      const time = format(new Date(point.timestamp), "MMM dd HH:mm");
      if (!timeMap.has(time)) {
        timeMap.set(time, { time });
      }
      const entry = timeMap.get(time)!;
      
      // Get power estimate for this device type
      const powerEstimate = DEVICE_POWER_ESTIMATES[point.sensor_type] || { idle: 1, active: 2 };
      const isActive = point.reading_count > 0;
      const estimatedPower = (isActive ? powerEstimate.active : powerEstimate.idle) * (point.device_count || 1);
      
      entry[point.sensor_type] = estimatedPower;
    });
    
    return Array.from(timeMap.values()).sort((a, b) => 
      String(a.time).localeCompare(String(b.time))
    );
  }, [sensorHistory]);

  // Get unique device types from history for chart lines
  const historyDeviceTypes = useMemo(() => {
    if (!sensorHistory?.length) return [];
    const types = new Set(sensorHistory.map(p => p.sensor_type));
    return Array.from(types);
  }, [sensorHistory]);

  // Process device history for individual device power trends
  const devicePowerHistory = useMemo(() => {
    if (!deviceHistory?.length) return [];
    
    // Group by timestamp
    const timeMap = new Map<string, Record<string, string | number>>();
    
    deviceHistory.forEach(point => {
      const time = format(new Date(point.timestamp), "MMM dd HH:mm");
      if (!timeMap.has(time)) {
        timeMap.set(time, { time });
      }
      const entry = timeMap.get(time)!;
      
      // Get power estimate for this device type
      const powerEstimate = DEVICE_POWER_ESTIMATES[point.device_type] || { idle: 1, active: 2 };
      const isActive = point.reading_count > 0;
      const estimatedPower = isActive ? powerEstimate.active : powerEstimate.idle;
      
      // Use device_id as key, truncate for display
      const deviceKey = point.device_id.length > 12 ? point.device_id.slice(0, 12) + '...' : point.device_id;
      entry[deviceKey] = estimatedPower;
    });
    
    return Array.from(timeMap.values()).sort((a, b) => 
      String(a.time).localeCompare(String(b.time))
    );
  }, [deviceHistory]);

  // Get unique devices from history for chart lines
  const historyDevices = useMemo(() => {
    if (!deviceHistory?.length) return [];
    const devices = new Map<string, { id: string, type: string, displayId: string }>();
    deviceHistory.forEach(p => {
      if (!devices.has(p.device_id)) {
        const displayId = p.device_id.length > 12 ? p.device_id.slice(0, 12) + '...' : p.device_id;
        devices.set(p.device_id, { id: p.device_id, type: p.device_type, displayId });
      }
    });
    return Array.from(devices.values());
  }, [deviceHistory]);

  // Calculate current values from latest data
  const currentPower = powerChartData.length > 0 ? powerChartData[powerChartData.length - 1]?.power : null;
  const hasPowerData = powerChartData.length > 0 || currentPower !== null;
  const hasStarlinkData = starlinkDevicePower.length > 0;
  const hasDeviceData = devicePowerBreakdown.length > 0;
  const hasSensorHistory = sensorPowerHistory.length > 0;
  const hasDeviceHistory = devicePowerHistory.length > 0;

  // Try to get real voltage from system_monitor sensors, otherwise estimate
  const sysVoltageStats = systemMonitorStats?.numeric_field_stats_24h?.voltage;
  const realVoltage = sysVoltageStats?.avg;
  const hasRealVoltage = realVoltage !== undefined && realVoltage !== null;
  const displayVoltage = hasRealVoltage ? realVoltage.toFixed(1) : "12.3";
  const voltageLabel = hasRealVoltage ? "System Voltage" : "Est. Voltage";
  
  const displayPower = totalEstimatedPower > 0 ? totalEstimatedPower : currentPower;
  
  // Calculate current from power (P = V * I)
  const voltageForCalc = hasRealVoltage ? realVoltage : 12.3;
  const calculatedCurrent = displayPower ? (displayPower / voltageForCalc).toFixed(1) : "—";
  const currentLabel = hasRealVoltage ? "Calculated" : "Est. Current";

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Power Management</h1>
          <p className="text-muted-foreground">Monitor power consumption and battery status</p>
        </div>
        <div className="flex items-center gap-3">
          <ContextFilters
            timePeriod={timePeriod}
            onTimePeriodChange={setTimePeriod}
            clientId={selectedClient}
            onClientChange={setSelectedClient}
            showClientFilter={true}
          />
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{displayVoltage}V</p>
                <p className="text-sm text-muted-foreground">{voltageLabel}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Plug className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{calculatedCurrent}A</p>
                <p className="text-sm text-muted-foreground">{currentLabel}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Battery className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {displayPower !== null ? `${displayPower.toFixed(1)}W` : "—"}
                </p>
                <p className="text-sm text-muted-foreground">Total Power</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Server className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{devicePowerBreakdown.length}</p>
                <p className="text-sm text-muted-foreground">Device Types</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Device Power Breakdown Section */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50 mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Power by Device Type</CardTitle>
            </div>
            {hasDeviceData && (
              <div className="text-sm text-muted-foreground">
                Total: <span className="font-semibold text-foreground">{totalEstimatedPower.toFixed(1)}W</span> across {devicePowerBreakdown.length} device types
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : hasDeviceData ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Device Power Cards Grid */}
              <div className="space-y-3">
                {devicePowerBreakdown.map((device, index) => {
                  const IconComponent = device.icon;
                  const percentage = totalEstimatedPower > 0 ? (device.estimated_power / totalEstimatedPower) * 100 : 0;
                  
                    return (
                    <div key={device.device_type} className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `color-mix(in srgb, ${device.color} 20%, transparent)` }}
                      >
                        <IconComponent className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm truncate">{device.label}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${device.active ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                              {device.active ? 'Active' : 'Idle'}
                            </span>
                            <span className="text-sm font-semibold">{device.estimated_power.toFixed(1)}W</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={percentage} className="h-1.5 flex-1" />
                          <span className="text-xs text-muted-foreground w-12 text-right">{percentage.toFixed(1)}%</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{device.device_count} device{device.device_count !== 1 ? 's' : ''}</span>
                          <span>{device.readings.toLocaleString()} readings</span>
                          {device.real_power !== undefined && (
                            <span className="text-green-500">Real data</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Power Distribution Pie Chart */}
              <div>
                <h4 className="text-sm font-medium mb-3">Power Distribution</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={devicePowerBreakdown.map(d => ({
                          name: d.label,
                          value: d.estimated_power,
                          color: d.color,
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {devicePowerBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          background: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number) => [`${value.toFixed(1)}W`, 'Power']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-32 flex flex-col items-center justify-center text-muted-foreground">
              <Server className="w-12 h-12 mb-3 opacity-50" />
              <p>No device data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Power History by Device Type */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50 mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Power Trends by Device Type</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-80 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : hasSensorHistory ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sensorPowerHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="time" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={11}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    label={{ value: 'Power (W)', angle: -90, position: 'insideLeft', style: { fill: 'hsl(var(--muted-foreground))' } }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number, name: string) => [
                      `${Number(value).toFixed(2)}W`, 
                      DEVICE_TYPE_CONFIG[name]?.label || name.replace(/_/g, ' ')
                    ]}
                  />
                  <Legend 
                    formatter={(value: string) => DEVICE_TYPE_CONFIG[value]?.label || value.replace(/_/g, ' ')}
                    wrapperStyle={{ paddingTop: '10px' }}
                  />
                  {historyDeviceTypes.map((type, index) => {
                    const config = DEVICE_TYPE_CONFIG[type];
                    const color = config?.color || DEVICE_COLORS[index % DEVICE_COLORS.length];
                    return (
                      <Area
                        key={type}
                        type="monotone"
                        dataKey={type}
                        stackId="1"
                        stroke={color}
                        fill={color}
                        fillOpacity={0.6}
                        name={type}
                      />
                    );
                  })}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-32 flex flex-col items-center justify-center text-muted-foreground">
              <Activity className="w-12 h-12 mb-3 opacity-50" />
              <p>No sensor history data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Power History by Individual Device */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50 mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Power Trends by Device</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-80 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : hasDeviceHistory ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={devicePowerHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="time" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={11}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    label={{ value: 'Power (W)', angle: -90, position: 'insideLeft', style: { fill: 'hsl(var(--muted-foreground))' } }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number, name: string) => [`${Number(value).toFixed(2)}W`, name]}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  {historyDevices.slice(0, 10).map((device, index) => {
                    const config = DEVICE_TYPE_CONFIG[device.type];
                    const baseColor = config?.color || DEVICE_COLORS[index % DEVICE_COLORS.length];
                    return (
                      <Line
                        key={device.id}
                        type="monotone"
                        dataKey={device.displayId}
                        stroke={baseColor}
                        strokeWidth={2}
                        dot={false}
                        name={device.displayId}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-32 flex flex-col items-center justify-center text-muted-foreground">
              <Server className="w-12 h-12 mb-3 opacity-50" />
              <p>No device history data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Power Over Time (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : hasPowerData && powerChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={powerChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Line type="monotone" dataKey="power" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Power (W)" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No power data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Power Consumption</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : hasPowerData && powerChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={powerChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Area type="monotone" dataKey="power" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2) / 0.3)" name="Power (W)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No power data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Starlink Device Power Section */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50 mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Satellite className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Starlink Power by Device</CardTitle>
            </div>
            {hasStarlinkData && (
              <div className="text-sm text-muted-foreground">
                Total: <span className="font-semibold text-foreground">{totalStarlinkPower.toFixed(1)}W</span> across {starlinkDevicePower.length} device{starlinkDevicePower.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : hasStarlinkData ? (
            <div className="space-y-6">
              {/* Device Power Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {starlinkDevicePower.map((device, index) => {
                  const color = DEVICE_COLORS[index % DEVICE_COLORS.length];
                  const powerDiff = device.overall.avg_watts - device.overall.min_watts;
                  const powerRange = device.overall.max_watts - device.overall.min_watts;
                  const efficiency = powerRange > 0 ? ((device.overall.avg_watts - device.overall.min_watts) / powerRange) * 100 : 50;
                  
                  return (
                    <Card key={device.device_id} className="bg-background/50 border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: color }}
                            />
                            <span className="font-medium text-sm truncate max-w-[150px]" title={device.device_id}>
                              {device.device_id}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            {device.overall.samples} samples
                          </div>
                        </div>
                        
                        <div className="flex items-baseline gap-2 mb-3">
                          <span className="text-3xl font-bold">{device.overall.avg_watts.toFixed(1)}</span>
                          <span className="text-lg text-muted-foreground">W</span>
                          <span className="text-xs text-muted-foreground ml-auto">avg</span>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Min</span>
                            <span className="font-medium">{device.overall.min_watts.toFixed(1)}W</span>
                          </div>
                          <Progress 
                            value={efficiency} 
                            className="h-1.5" 
                          />
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Max</span>
                            <span className="font-medium">{device.overall.max_watts.toFixed(1)}W</span>
                          </div>
                        </div>
                        
                        {device.when_connected && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">When Connected</span>
                              <span className="font-medium text-green-500">{device.when_connected.avg_watts.toFixed(1)}W</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              {/* Power Timeline Chart */}
              {starlinkPowerTimeseries.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">Power Over Time by Device</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={starlinkPowerTimeseries}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} unit="W" />
                        <Tooltip 
                          contentStyle={{ 
                            background: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }} 
                          formatter={(value: number) => [`${value.toFixed(1)}W`, '']}
                        />
                        <Legend />
                        {starlinkDevicePower.map((device, index) => (
                          <Line
                            key={device.device_id}
                            type="monotone"
                            dataKey={device.device_id}
                            stroke={DEVICE_COLORS[index % DEVICE_COLORS.length]}
                            strokeWidth={2}
                            dot={false}
                            name={device.device_id}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Power Comparison Bar Chart */}
              <div>
                <h4 className="text-sm font-medium mb-3">Power Comparison</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={starlinkDevicePower.map((d, i) => ({
                        name: d.device_id.length > 12 ? d.device_id.slice(0, 12) + '...' : d.device_id,
                        avg: d.overall.avg_watts,
                        min: d.overall.min_watts,
                        max: d.overall.max_watts,
                        fill: DEVICE_COLORS[i % DEVICE_COLORS.length]
                      }))}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} unit="W" />
                      <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={100} />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number, name: string) => [`${value.toFixed(1)}W`, name]}
                      />
                      <Legend />
                      <Bar dataKey="min" fill="hsl(var(--chart-3))" name="Min" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="avg" fill="hsl(var(--chart-1))" name="Average" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="max" fill="hsl(var(--chart-2))" name="Max" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
              <Satellite className="w-12 h-12 mb-3 opacity-50" />
              <p>No Starlink power data available</p>
              <p className="text-sm mt-1">Starlink devices will appear here when connected</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Battery Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm">Main Battery</span>
              <span className="text-sm font-medium">85%</span>
            </div>
            <Progress value={85} className="h-3" />
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm">Backup Battery</span>
              <span className="text-sm font-medium">100%</span>
            </div>
            <Progress value={100} className="h-3" />
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
            <div>
              <p className="text-sm text-muted-foreground">Est. Runtime</p>
              <p className="text-lg font-semibold">18h 32m</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Charge Cycles</p>
              <p className="text-lg font-semibold">127</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Health</p>
              <p className="text-lg font-semibold text-green-500">Good</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PowerContent;
