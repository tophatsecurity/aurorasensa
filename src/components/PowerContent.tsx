import { useState } from "react";
import { Zap, Battery, Sun, Plug, RefreshCw, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { useDashboardTimeseries, useComprehensiveStats } from "@/hooks/useAuroraApi";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  ContextFilters, 
  TimePeriodOption, 
  timePeriodToHours 
} from "@/components/ui/context-selectors";

const PowerContent = () => {
  const queryClient = useQueryClient();
  const [timePeriod, setTimePeriod] = useState<TimePeriodOption>('24h');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  
  const periodHours = timePeriodToHours(timePeriod);
  
  const { data: stats, isLoading: statsLoading } = useComprehensiveStats();
  const { data: timeseries, isLoading: timeseriesLoading } = useDashboardTimeseries(periodHours);

  const isLoading = statsLoading || timeseriesLoading;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["aurora", "dashboard"] });
  };

  // Transform power timeseries data for charts
  const powerChartData = timeseries?.power?.map((point) => ({
    time: format(new Date(point.timestamp), "HH:mm"),
    power: point.value,
  })) || [];

  // Calculate current values from latest data
  const currentPower = powerChartData.length > 0 ? powerChartData[powerChartData.length - 1]?.power : null;
  const hasPowerData = powerChartData.length > 0 || currentPower !== null;
  const totalReadings = stats?.global?.database?.total_readings ?? 0;

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
