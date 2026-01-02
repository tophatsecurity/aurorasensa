import { Zap, Battery, Sun, Plug } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

const powerData = [
  { time: "00:00", voltage: 12.4, current: 1.2, power: 14.88 },
  { time: "04:00", voltage: 12.1, current: 0.8, power: 9.68 },
  { time: "08:00", voltage: 12.6, current: 2.1, power: 26.46 },
  { time: "12:00", voltage: 13.2, current: 3.5, power: 46.2 },
  { time: "16:00", voltage: 13.0, current: 2.8, power: 36.4 },
  { time: "20:00", voltage: 12.5, current: 1.5, power: 18.75 },
  { time: "Now", voltage: 12.3, current: 1.3, power: 15.99 },
];

const PowerContent = () => {
  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Power Management</h1>
        <p className="text-muted-foreground">Monitor power consumption and battery status</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">12.3V</p>
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
                <p className="text-2xl font-bold">1.3A</p>
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
                <p className="text-2xl font-bold">16W</p>
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
            <CardTitle className="text-lg">Voltage Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={powerData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[11, 14]} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Line type="monotone" dataKey="voltage" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Power Consumption</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={powerData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Area type="monotone" dataKey="power" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2) / 0.3)" />
                </AreaChart>
              </ResponsiveContainer>
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
