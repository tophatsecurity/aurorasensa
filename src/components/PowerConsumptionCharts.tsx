import { useMemo, useState } from "react";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine,
  ReferenceDot,
  ReferenceArea
} from "recharts";
import { Zap, Loader2, TrendingUp, TrendingDown, Settings2, AlertTriangle, Bell, BellOff } from "lucide-react";
import { useDashboardTimeseries, useStarlinkTimeseries } from "@/hooks/useAuroraApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ChartData {
  time: string;
  value: number;
  isPeak?: boolean;
  isAboveWarning?: boolean;
  isAboveCritical?: boolean;
}

interface ThresholdConfig {
  warningThreshold: number;
  criticalThreshold: number;
  alertsEnabled: boolean;
}

interface PowerConsumptionChartsProps {
  hours?: number;
}

const PowerConsumptionCharts = ({ hours = 24 }: PowerConsumptionChartsProps) => {
  const { data: timeseries, isLoading: dashboardLoading } = useDashboardTimeseries(hours);
  const { data: starlinkTimeseries, isLoading: starlinkLoading } = useStarlinkTimeseries(hours);
  
  const isLoading = dashboardLoading || starlinkLoading;
  
  const [thresholdConfig, setThresholdConfig] = useState<ThresholdConfig>({
    warningThreshold: 100,
    criticalThreshold: 150,
    alertsEnabled: true,
  });

  const formatData = (
    dashboardPower: { timestamp: string; value: number }[] | undefined,
    starlinkReadings: Array<{ timestamp: string; power_w?: number }> | undefined
  ): ChartData[] => {
    // Try dashboard power data first - check for actual valid values
    const validDashboardPower = dashboardPower?.filter(p => p.value !== null && p.value !== undefined && !isNaN(p.value));
    
    if (validDashboardPower && validDashboardPower.length > 0) {
      const data = validDashboardPower.map(p => ({
        time: new Date(p.timestamp).toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit'
        }),
        value: Number(p.value.toFixed(2)),
        isPeak: false,
        isAboveWarning: p.value >= thresholdConfig.warningThreshold && p.value < thresholdConfig.criticalThreshold,
        isAboveCritical: p.value >= thresholdConfig.criticalThreshold,
      }));
      
      if (data.length > 0) {
        const maxValue = Math.max(...data.map(d => d.value));
        data.forEach(d => {
          if (d.value === maxValue) d.isPeak = true;
        });
      }
      
      return data;
    }
    
    // Fallback to Starlink power data - filter for valid power readings
    const validStarlinkPower = starlinkReadings?.filter(r => 
      r.power_w !== undefined && r.power_w !== null && !isNaN(r.power_w) && r.power_w > 0
    );
    
    if (validStarlinkPower && validStarlinkPower.length > 0) {
      const data = validStarlinkPower.map(r => ({
        time: new Date(r.timestamp).toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit'
        }),
        value: Number((r.power_w ?? 0).toFixed(2)),
        isPeak: false,
        isAboveWarning: (r.power_w ?? 0) >= thresholdConfig.warningThreshold && (r.power_w ?? 0) < thresholdConfig.criticalThreshold,
        isAboveCritical: (r.power_w ?? 0) >= thresholdConfig.criticalThreshold,
      }));
      
      if (data.length > 0) {
        const maxValue = Math.max(...data.map(d => d.value));
        data.forEach(d => {
          if (d.value === maxValue) d.isPeak = true;
        });
      }
      
      return data;
    }
    
    return [];
  };

  const chartData = useMemo(
    () => formatData(timeseries?.power, starlinkTimeseries?.readings), 
    [timeseries?.power, starlinkTimeseries?.readings, thresholdConfig.warningThreshold, thresholdConfig.criticalThreshold]
  );

  

  // Calculate statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) return { 
      current: null, avg: null, min: null, max: null, 
      hourlyAvg: null, trend: 'stable' as const,
      peakTime: null, totalKwh: null,
      warningCount: 0, criticalCount: 0
    };
    
    const values = chartData.map(d => d.value);
    const current = values[values.length - 1];
    const previous = values.length > 1 ? values[values.length - 2] : current;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const max = Math.max(...values);
    const peakIndex = values.indexOf(max);
    
    // Estimate kWh (assuming readings are evenly spaced over 24h)
    const totalKwh = (avg * 24) / 1000;
    
    // Count threshold violations
    const warningCount = chartData.filter(d => d.isAboveWarning).length;
    const criticalCount = chartData.filter(d => d.isAboveCritical).length;
    
    return {
      current,
      avg,
      min: Math.min(...values),
      max,
      hourlyAvg: avg,
      trend: current > previous + 0.5 ? 'up' as const : current < previous - 0.5 ? 'down' as const : 'stable' as const,
      peakTime: chartData[peakIndex]?.time || null,
      totalKwh,
      warningCount,
      criticalCount,
    };
  }, [chartData]);

  // Current status based on thresholds
  const currentStatus = useMemo(() => {
    if (stats.current === null) return 'normal';
    if (stats.current >= thresholdConfig.criticalThreshold) return 'critical';
    if (stats.current >= thresholdConfig.warningThreshold) return 'warning';
    return 'normal';
  }, [stats.current, thresholdConfig]);

  const formatValue = (val: number | null) => {
    if (val === null) return '—';
    return val.toFixed(1);
  };

  const formatKwh = (val: number | null) => {
    if (val === null) return '—';
    return val.toFixed(2);
  };

  const handleThresholdChange = (field: keyof ThresholdConfig, value: number | boolean) => {
    setThresholdConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="glass-card rounded-xl p-5 border border-border/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
            currentStatus === 'critical' ? 'bg-destructive/20' : 
            currentStatus === 'warning' ? 'bg-yellow-500/20' : 
            'bg-orange-500/20'
          }`}>
            <Zap className={`w-5 h-5 ${
              currentStatus === 'critical' ? 'text-destructive' : 
              currentStatus === 'warning' ? 'text-yellow-400' : 
              'text-orange-400'
            }`} />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Power Consumption
            </h4>
            <div className="flex items-center gap-2">
              <p className={`text-2xl font-bold ${
                currentStatus === 'critical' ? 'text-destructive' : 
                currentStatus === 'warning' ? 'text-yellow-400' : 
                'text-orange-400'
              }`}>
                {isLoading ? '...' : `${formatValue(stats.current)}W`}
              </p>
              {!isLoading && stats.trend !== 'stable' && (
                <span className={stats.trend === 'up' ? 'text-destructive' : 'text-success'}>
                  {stats.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                </span>
              )}
              {!isLoading && currentStatus !== 'normal' && thresholdConfig.alertsEnabled && (
                <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  currentStatus === 'critical' ? 'bg-destructive/20 text-destructive' : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  <AlertTriangle className="w-3 h-3" />
                  {currentStatus === 'critical' ? 'CRITICAL' : 'WARNING'}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isLoading && chartData.length > 0 && (
            <div className="text-right text-xs space-y-0.5 mr-2">
              <div className="text-muted-foreground">
                Avg: <span className="font-medium text-orange-400">{formatValue(stats.avg)}W</span>
              </div>
              <div className="text-muted-foreground">
                Est. Daily: <span className="text-cyan-400">{formatKwh(stats.totalKwh)} kWh</span>
              </div>
            </div>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings2 className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Alert Thresholds</h4>
                  <div className="flex items-center gap-2">
                    {thresholdConfig.alertsEnabled ? (
                      <Bell className="w-4 h-4 text-success" />
                    ) : (
                      <BellOff className="w-4 h-4 text-muted-foreground" />
                    )}
                    <Switch
                      checked={thresholdConfig.alertsEnabled}
                      onCheckedChange={(checked) => handleThresholdChange('alertsEnabled', checked)}
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      Warning Threshold (W)
                    </Label>
                    <Input
                      type="number"
                      value={thresholdConfig.warningThreshold}
                      onChange={(e) => handleThresholdChange('warningThreshold', Number(e.target.value))}
                      className="h-8"
                      min={0}
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-destructive" />
                      Critical Threshold (W)
                    </Label>
                    <Input
                      type="number"
                      value={thresholdConfig.criticalThreshold}
                      onChange={(e) => handleThresholdChange('criticalThreshold', Number(e.target.value))}
                      className="h-8"
                      min={0}
                    />
                  </div>
                </div>

                {stats.warningCount > 0 || stats.criticalCount > 0 ? (
                  <div className="pt-2 border-t border-border text-xs space-y-1">
                    <div className="text-muted-foreground">Last 24h violations:</div>
                    {stats.warningCount > 0 && (
                      <div className="flex items-center gap-2 text-yellow-400">
                        <div className="w-2 h-2 rounded-full bg-yellow-500" />
                        {stats.warningCount} warning events
                      </div>
                    )}
                    {stats.criticalCount > 0 && (
                      <div className="flex items-center gap-2 text-destructive">
                        <div className="w-2 h-2 rounded-full bg-destructive" />
                        {stats.criticalCount} critical events
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="pt-2 border-t border-border text-xs text-muted-foreground">
                    No threshold violations in last 24h
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Peak Usage Indicators */}
      {!isLoading && chartData.length > 0 && (
        <div className="flex items-center gap-4 mb-3 text-xs flex-wrap">
          <div className="flex items-center gap-2 px-2 py-1 rounded bg-red-500/10 border border-red-500/20">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-muted-foreground">Peak:</span>
            <span className="font-medium text-red-400">{formatValue(stats.max)}W</span>
            {stats.peakTime && (
              <span className="text-muted-foreground">at {stats.peakTime}</span>
            )}
          </div>
          <div className="flex items-center gap-2 px-2 py-1 rounded bg-green-500/10 border border-green-500/20">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-muted-foreground">Min:</span>
            <span className="font-medium text-green-400">{formatValue(stats.min)}W</span>
          </div>
          {thresholdConfig.alertsEnabled && (stats.warningCount > 0 || stats.criticalCount > 0) && (
            <div className="flex items-center gap-2 px-2 py-1 rounded bg-yellow-500/10 border border-yellow-500/20">
              <AlertTriangle className="w-3 h-3 text-yellow-400" />
              <span className="text-muted-foreground">Alerts:</span>
              <span className="font-medium text-yellow-400">
                {stats.warningCount + stats.criticalCount}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="h-[200px]">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            No power data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradient-power" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                domain={['auto', 'auto']}
                tickFormatter={(v) => `${v}W`}
              />
              
              {/* Critical zone background */}
              {thresholdConfig.alertsEnabled && (
                <ReferenceArea
                  y1={thresholdConfig.criticalThreshold}
                  y2={thresholdConfig.criticalThreshold * 2}
                  fill="hsl(var(--destructive))"
                  fillOpacity={0.05}
                />
              )}
              
              {/* Warning zone background */}
              {thresholdConfig.alertsEnabled && (
                <ReferenceArea
                  y1={thresholdConfig.warningThreshold}
                  y2={thresholdConfig.criticalThreshold}
                  fill="#eab308"
                  fillOpacity={0.05}
                />
              )}
              
              {/* Warning threshold line */}
              {thresholdConfig.alertsEnabled && (
                <ReferenceLine 
                  y={thresholdConfig.warningThreshold} 
                  stroke="#eab308" 
                  strokeDasharray="4 4" 
                  strokeOpacity={0.7}
                  label={{ 
                    value: `Warning: ${thresholdConfig.warningThreshold}W`, 
                    position: 'right',
                    fontSize: 9,
                    fill: '#eab308'
                  }}
                />
              )}
              
              {/* Critical threshold line */}
              {thresholdConfig.alertsEnabled && (
                <ReferenceLine 
                  y={thresholdConfig.criticalThreshold} 
                  stroke="hsl(var(--destructive))" 
                  strokeDasharray="4 4" 
                  strokeOpacity={0.7}
                  label={{ 
                    value: `Critical: ${thresholdConfig.criticalThreshold}W`, 
                    position: 'right',
                    fontSize: 9,
                    fill: 'hsl(var(--destructive))'
                  }}
                />
              )}
              
              {/* Average line */}
              {stats.avg !== null && (
                <ReferenceLine 
                  y={stats.avg} 
                  stroke="#22c55e" 
                  strokeDasharray="4 4" 
                  strokeOpacity={0.7}
                  label={{ 
                    value: `Avg: ${stats.avg.toFixed(1)}W`, 
                    position: 'insideTopLeft',
                    fontSize: 9,
                    fill: '#22c55e'
                  }}
                />
              )}
              
              {/* Peak indicator */}
              {stats.max !== null && stats.peakTime && (
                <ReferenceDot
                  x={stats.peakTime}
                  y={stats.max}
                  r={6}
                  fill="#ef4444"
                  stroke="#fff"
                  strokeWidth={2}
                />
              )}
              
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number) => {
                  const isPeak = value === stats.max;
                  const isCritical = value >= thresholdConfig.criticalThreshold;
                  const isWarning = value >= thresholdConfig.warningThreshold && !isCritical;
                  let suffix = '';
                  if (isPeak) suffix = ' (PEAK)';
                  if (isCritical && thresholdConfig.alertsEnabled) suffix += ' ⚠️ CRITICAL';
                  else if (isWarning && thresholdConfig.alertsEnabled) suffix += ' ⚠️ WARNING';
                  return [
                    `${value.toFixed(2)}W${suffix}`, 
                    'Power'
                  ];
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#f97316"
                strokeWidth={2}
                fill="url(#gradient-power)"
                dot={false}
                animationDuration={300}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Summary stats */}
      {!isLoading && chartData.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border/50 grid grid-cols-3 gap-4 text-xs">
          <div className="text-center">
            <div className="text-muted-foreground">Hourly Avg</div>
            <div className="font-medium text-orange-400">{formatValue(stats.hourlyAvg)}W</div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground">Peak Usage</div>
            <div className="font-medium text-red-400">{formatValue(stats.max)}W</div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground">Est. Daily</div>
            <div className="font-medium text-cyan-400">{formatKwh(stats.totalKwh)} kWh</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PowerConsumptionCharts;