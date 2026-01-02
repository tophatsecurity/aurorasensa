import { Activity, Cpu, HardDrive, Wifi, Clock, Thermometer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const cpuData = [
  { time: "5m", value: 45 },
  { time: "4m", value: 52 },
  { time: "3m", value: 48 },
  { time: "2m", value: 61 },
  { time: "1m", value: 55 },
  { time: "Now", value: 42 },
];

const memoryData = [
  { time: "5m", value: 68 },
  { time: "4m", value: 72 },
  { time: "3m", value: 70 },
  { time: "2m", value: 75 },
  { time: "1m", value: 71 },
  { time: "Now", value: 69 },
];

const PerformanceContent = () => {
  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">System Performance</h1>
        <p className="text-muted-foreground">Monitor system resources and performance metrics</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">CPU</span>
              </div>
              <span className="text-lg font-bold">42%</span>
            </div>
            <Progress value={42} className="h-2" />
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">Memory</span>
              </div>
              <span className="text-lg font-bold">69%</span>
            </div>
            <Progress value={69} className="h-2" />
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium">Disk</span>
              </div>
              <span className="text-lg font-bold">34%</span>
            </div>
            <Progress value={34} className="h-2" />
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">Network</span>
              </div>
              <span className="text-lg font-bold">12 Mb/s</span>
            </div>
            <Progress value={24} className="h-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">CPU Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cpuData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Memory Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={memoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hostname</span>
                <span className="font-mono text-sm">aurora-pi-01</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">OS</span>
                <span className="font-mono text-sm">Raspbian 12</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kernel</span>
                <span className="font-mono text-sm">6.1.0-rpi7</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Uptime</span>
                <span className="font-mono text-sm">14d 6h 32m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Load Avg</span>
                <span className="font-mono text-sm">0.42, 0.38, 0.35</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Processes</span>
                <span className="font-mono text-sm">142</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><Thermometer className="w-3 h-3" /> CPU Temp</span>
                <span className="font-mono text-sm text-green-500">48.2°C</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">RAM</span>
                <span className="font-mono text-sm">2.8 / 4.0 GB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Disk</span>
                <span className="font-mono text-sm">10.2 / 32 GB</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceContent;
