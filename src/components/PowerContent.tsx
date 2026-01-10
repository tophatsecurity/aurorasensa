import { useState, useMemo } from "react";
import { Zap, Battery, Sun, Plug, RefreshCw, Loader2, Satellite, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Legend } from "recharts";
import { useDashboardTimeseries, useComprehensiveStats, useStarlinkPower, StarlinkPowerDeviceSummary } from "@/hooks/useAuroraApi";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  ContextFilters, 
  TimePeriodOption, 
  timePeriodToHours 
} from "@/components/ui/context-selectors";

// Colors for different Starlink devices
const DEVICE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const PowerContent = () => {
  const queryClient = useQueryClient();
  const [timePeriod, setTimePeriod] = useState<TimePeriodOption>('24h');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  
  const periodHours = timePeriodToHours(timePeriod);
  
  const { data: stats, isLoading: statsLoading } = useComprehensiveStats();
  const { data: timeseries, isLoading: timeseriesLoading } = useDashboardTimeseries(periodHours);
  const { data: starlinkPower, isLoading: starlinkPowerLoading } = useStarlinkPower();

  const isLoading = statsLoading || timeseriesLoading || starlinkPowerLoading;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["aurora", "dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["aurora", "starlink", "power"] });
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

  // Calculate current values from latest data
  const currentPower = powerChartData.length > 0 ? powerChartData[powerChartData.length - 1]?.power : null;
  const hasPowerData = powerChartData.length > 0 || currentPower !== null;
  const hasStarlinkData = starlinkDevicePower.length > 0;

  // Mock voltage/current derived from power (P = V * I, assuming ~12V system)
  const estimatedVoltage = 12.3;
  const estimatedCurrent = currentPower ? (currentPower / estimatedVoltage).toFixed(1) : "—";

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
                <p className="text-2xl font-bold">{estimatedVoltage}V</p>
                <p className="text-sm text-muted-foreground">Voltage</p>
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
                <p className="text-2xl font-bold">{estimatedCurrent}A</p>
                <p className="text-sm text-muted-foreground">Current</p>
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
                  {currentPower !== null ? `${currentPower.toFixed(1)}W` : "—"}
                </p>
                <p className="text-sm text-muted-foreground">Power</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Sun className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">85%</p>
                <p className="text-sm text-muted-foreground">Battery</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
