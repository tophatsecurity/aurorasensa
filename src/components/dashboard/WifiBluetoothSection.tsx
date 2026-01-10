import { memo, useMemo } from "react";
import { Wifi, Bluetooth, Signal, Shield, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { 
  useWifiScannerTimeseries,
  useBluetoothScannerTimeseries,
} from "@/hooks/useAuroraApi";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

interface WifiBluetoothSectionProps {
  hours?: number;
}

export const WifiBluetoothSection = memo(function WifiBluetoothSection({ hours = 24 }: WifiBluetoothSectionProps) {
  const { data: wifiData, isLoading: wifiLoading } = useWifiScannerTimeseries(hours);
  const { data: btData, isLoading: btLoading } = useBluetoothScannerTimeseries(hours);

  // Aggregate WiFi networks by SSID
  const wifiNetworks = useMemo(() => {
    if (!wifiData?.readings) return [];
    const ssidMap = new Map<string, { ssid: string; rssi: number; count: number; security?: string }>();
    
    wifiData.readings.forEach(r => {
      const ssid = r.ssid || 'Hidden';
      const existing = ssidMap.get(ssid);
      if (existing) {
        existing.count++;
        existing.rssi = Math.max(existing.rssi, r.rssi ?? r.signal_strength ?? -100);
      } else {
        ssidMap.set(ssid, {
          ssid,
          rssi: r.rssi ?? r.signal_strength ?? -100,
          count: 1,
          security: r.security,
        });
      }
    });
    
    return Array.from(ssidMap.values())
      .sort((a, b) => b.rssi - a.rssi)
      .slice(0, 10);
  }, [wifiData?.readings]);

  // Aggregate Bluetooth devices
  const btDevices = useMemo(() => {
    if (!btData?.readings) return [];
    const deviceMap = new Map<string, { name: string; mac: string; rssi: number; count: number }>();
    
    btData.readings.forEach(r => {
      const mac = r.mac_address || 'unknown';
      const existing = deviceMap.get(mac);
      if (existing) {
        existing.count++;
        existing.rssi = Math.max(existing.rssi, r.rssi ?? r.signal_strength ?? -100);
      } else {
        deviceMap.set(mac, {
          name: r.name || 'Unknown Device',
          mac,
          rssi: r.rssi ?? r.signal_strength ?? -100,
          count: 1,
        });
      }
    });
    
    return Array.from(deviceMap.values())
      .sort((a, b) => b.rssi - a.rssi)
      .slice(0, 10);
  }, [btData?.readings]);

  const getSignalColor = (rssi: number) => {
    if (rssi >= -50) return "#22c55e";
    if (rssi >= -70) return "#eab308";
    if (rssi >= -85) return "#f97316";
    return "#ef4444";
  };

  const totalWifiNetworks = wifiNetworks.length;
  const totalBtDevices = btDevices.length;

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Wifi className="w-5 h-5 text-blue-500" />
        WiFi & Bluetooth Scanner
      </h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="glass-card rounded-lg p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Wifi className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-xs text-muted-foreground">WiFi Networks</span>
          </div>
          <div className="text-2xl font-bold text-blue-400">
            {wifiLoading ? "..." : totalWifiNetworks}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Unique SSIDs
          </div>
        </div>

        <div className="glass-card rounded-lg p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <Bluetooth className="w-4 h-4 text-violet-400" />
            </div>
            <span className="text-xs text-muted-foreground">BT Devices</span>
          </div>
          <div className="text-2xl font-bold text-violet-400">
            {btLoading ? "..." : totalBtDevices}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Discovered
          </div>
        </div>

        <div className="glass-card rounded-lg p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Signal className="w-4 h-4 text-green-400" />
            </div>
            <span className="text-xs text-muted-foreground">WiFi Scans</span>
          </div>
          <div className="text-2xl font-bold text-green-400">
            {wifiData?.count?.toLocaleString() ?? "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Total readings
          </div>
        </div>

        <div className="glass-card rounded-lg p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Signal className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-xs text-muted-foreground">BT Scans</span>
          </div>
          <div className="text-2xl font-bold text-amber-400">
            {btData?.count?.toLocaleString() ?? "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Total readings
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* WiFi Networks Chart */}
        <div className="glass-card rounded-xl p-4 border border-border/50">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Wifi className="w-4 h-4 text-blue-400" />
            WiFi Network Signal Strength
          </h3>
          {wifiLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : wifiNetworks.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={wifiNetworks} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    type="number" 
                    domain={[-100, -30]}
                    tick={{ fontSize: 10 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis 
                    type="category" 
                    dataKey="ssid" 
                    width={100}
                    tick={{ fontSize: 10 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value} dBm`, 'Signal']}
                  />
                  <Bar dataKey="rssi" name="RSSI">
                    {wifiNetworks.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getSignalColor(entry.rssi)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              No WiFi networks detected
            </div>
          )}
        </div>

        {/* Bluetooth Devices */}
        <div className="glass-card rounded-xl p-4 border border-border/50">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Bluetooth className="w-4 h-4 text-violet-400" />
            Bluetooth Devices
          </h3>
          {btLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : btDevices.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {btDevices.map((device, i) => (
                <div key={device.mac} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Bluetooth className="w-4 h-4 text-violet-400" />
                    <div>
                      <div className="text-sm font-medium truncate max-w-[150px]">{device.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{device.mac}</div>
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    style={{ backgroundColor: `${getSignalColor(device.rssi)}20`, borderColor: getSignalColor(device.rssi) }}
                  >
                    {device.rssi} dBm
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              No Bluetooth devices detected
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default WifiBluetoothSection;
