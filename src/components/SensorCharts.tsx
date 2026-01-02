import { useState, useEffect } from "react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { Thermometer, Droplets, Signal, Zap } from "lucide-react";

interface ChartData {
  time: string;
  value: number;
}

interface SensorChartProps {
  title: string;
  icon: React.ReactNode;
  color: string;
  unit: string;
  initialValue?: number;
}

// Simulate realtime data updates
function useRealtimeData(initialValue: number = 50, variance: number = 5) {
  const [data, setData] = useState<ChartData[]>(() => {
    const now = new Date();
    return Array.from({ length: 20 }, (_, i) => ({
      time: new Date(now.getTime() - (19 - i) * 3000).toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      }),
      value: initialValue + (Math.random() - 0.5) * variance * 2,
    }));
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setData((prev) => {
        const newData = [...prev.slice(1)];
        const lastValue = prev[prev.length - 1].value;
        const change = (Math.random() - 0.5) * variance;
        const newValue = Math.max(0, Math.min(100, lastValue + change));
        
        newData.push({
          time: new Date().toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
          }),
          value: Number(newValue.toFixed(1)),
        });
        
        return newData;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [variance]);

  return data;
}

const SensorChart = ({ title, icon, color, unit, initialValue = 50 }: SensorChartProps) => {
  const data = useRealtimeData(initialValue, 5);
  const currentValue = data[data.length - 1]?.value.toFixed(1) || '—';

  return (
    <div className="glass-card rounded-xl p-5 border border-border/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center`} style={{ backgroundColor: `${color}20` }}>
            {icon}
          </div>
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {title}
            </h4>
            <p className="text-2xl font-bold" style={{ color }}>
              {currentValue}{unit}
            </p>
          </div>
        </div>
      </div>
      
      <div className="h-[150px] mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
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
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#gradient-${title})`}
              dot={false}
              animationDuration={300}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const SensorCharts = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <SensorChart
        title="Temperature"
        icon={<Thermometer className="w-5 h-5" style={{ color: '#ef4444' }} />}
        color="#ef4444"
        unit="°C"
        initialValue={23}
      />
      <SensorChart
        title="Humidity"
        icon={<Droplets className="w-5 h-5" style={{ color: '#3b82f6' }} />}
        color="#3b82f6"
        unit="%"
        initialValue={65}
      />
      <SensorChart
        title="Signal Strength"
        icon={<Signal className="w-5 h-5" style={{ color: '#a855f7' }} />}
        color="#a855f7"
        unit=" dBm"
        initialValue={-45}
      />
      <SensorChart
        title="Power"
        icon={<Zap className="w-5 h-5" style={{ color: '#f97316' }} />}
        color="#f97316"
        unit="W"
        initialValue={150}
      />
    </div>
  );
};

export default SensorCharts;
