import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, Wifi, Radio, Battery, Activity } from "lucide-react";
import {
  usePowerSummary,
  usePowerCurrent,
  useBluetoothStats,
  useWifiStats,
  useBatteryStats,
  useGlobalStats,
} from "@/hooks/aurora";

interface ConnectivityStatsSectionProps {
  periodHours?: number;
  clientId?: string | null;
}

const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return '--';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
};

const formatWatts = (watts: number | null | undefined): string => {
  if (watts === null || watts === undefined) return '--';
  return `${watts.toFixed(1)}W`;
};

const ConnectivityStatsSection = ({ periodHours = 24, clientId }: ConnectivityStatsSectionProps) => {
  const effectiveClientId = clientId === "all" ? undefined : clientId;

  // Fetch power, wifi, bluetooth stats
  const { data: powerSummary, isLoading: powerLoading } = usePowerSummary(effectiveClientId);
  const { data: powerCurrent, isLoading: powerCurrentLoading } = usePowerCurrent(effectiveClientId);
  const { data: wifiStats, isLoading: wifiLoading } = useWifiStats(effectiveClientId);
  const { data: bluetoothStats, isLoading: btLoading } = useBluetoothStats(effectiveClientId);
  const { data: batteryStats, isLoading: batteryLoading } = useBatteryStats(effectiveClientId);
  
  // Fallback data sources
  const { data: globalStats } = useGlobalStats();

  const isLoading = powerLoading && wifiLoading && btLoading;

  // Process power data with fallback from global stats
  const powerMetrics = useMemo(() => {
    const currentPower = powerCurrent?.[0]?.power_watts ?? powerSummary?.total_power_watts ?? null;
    const avgPower = powerSummary?.avg_power_watts ?? null;
    const maxPower = powerSummary?.max_power_watts ?? null;
    const minPower = powerSummary?.min_power_watts ?? null;
    
    // Fallback device count from global stats
    let deviceCount = powerSummary?.total_devices ?? 0;
    if (deviceCount === 0 && globalStats?.device_breakdown) {
      // Count power-related devices from breakdown
      const powerDevices = globalStats.device_breakdown.filter(d => 
        d.device_type?.toLowerCase().includes('power') ||
        d.device_type?.toLowerCase().includes('starlink')
      );
      deviceCount = powerDevices.length;
    }
    
    return { currentPower, avgPower, maxPower, minPower, deviceCount };
  }, [powerCurrent, powerSummary, globalStats?.device_breakdown]);

  // Process battery data
  const batteryMetrics = useMemo(() => {
    if (!batteryStats || batteryStats.length === 0) return null;
    
    const avgCharge = batteryStats.reduce((sum, b) => sum + (b.charge_percent || 0), 0) / batteryStats.length;
    const chargingCount = batteryStats.filter(b => b.status === 'charging').length;
    const dischargingCount = batteryStats.filter(b => b.status === 'discharging').length;
    
    return { avgCharge, chargingCount, dischargingCount, total: batteryStats.length };
  }, [batteryStats]);

  // WiFi metrics with fallback from global stats
  const wifiMetrics = useMemo(() => {
    // If we have real wifi stats, use them
    if (wifiStats && (wifiStats.total_scanners > 0 || wifiStats.total_networks_discovered > 0)) {
      return {
        totalNetworks: wifiStats.total_networks_discovered ?? 0,
        uniqueNetworks: wifiStats.unique_networks_24h ?? 0,
        scanCount: wifiStats.scan_count_24h ?? 0,
        activeScanners: wifiStats.active_scanners ?? 0,
        avgNetworksPerScan: wifiStats.avg_networks_per_scan ?? 0,
      };
    }
    
    // Fallback: check global stats for wifi_scanner devices
    const wifiScannerDevice = globalStats?.device_breakdown?.find(d => 
      d.device_type?.toLowerCase().includes('wifi_scanner')
    );
    
    return {
      totalNetworks: 0,
      uniqueNetworks: 0,
      scanCount: wifiScannerDevice?.count || 0,
      activeScanners: wifiScannerDevice ? 1 : 0,
      avgNetworksPerScan: 0,
    };
  }, [wifiStats, globalStats?.device_breakdown]);

  // Bluetooth metrics with fallback from global stats
  const btMetrics = useMemo(() => {
    // If we have real bluetooth stats, use them
    if (bluetoothStats && (bluetoothStats.total_scanners > 0 || bluetoothStats.total_devices_discovered > 0)) {
      return {
        totalDevices: bluetoothStats.total_devices_discovered ?? 0,
        uniqueDevices: bluetoothStats.unique_devices_24h ?? 0,
        scanCount: bluetoothStats.scan_count_24h ?? 0,
        activeScanners: bluetoothStats.active_scanners ?? 0,
        avgDevicesPerScan: bluetoothStats.avg_devices_per_scan ?? 0,
      };
    }
    
    // Fallback: check global stats for bluetooth_scanner devices
    const btScannerDevice = globalStats?.device_breakdown?.find(d => 
      d.device_type?.toLowerCase().includes('bluetooth_scanner')
    );
    
    return {
      totalDevices: 0,
      uniqueDevices: 0,
      scanCount: btScannerDevice?.count || 0,
      activeScanners: btScannerDevice ? 1 : 0,
      avgDevicesPerScan: 0,
    };
  }, [bluetoothStats, globalStats?.device_breakdown]);

  if (isLoading) {
    return (
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Power & Connectivity Status
        </h2>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary" />
        Power & Connectivity Status
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Power Status Card */}
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              Power
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Current</span>
                <span className="font-bold text-lg text-yellow-500">
                  {formatWatts(powerMetrics.currentPower)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Average</span>
                <span>{formatWatts(powerMetrics.avgPower)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Range</span>
                <span>
                  {formatWatts(powerMetrics.minPower)} - {formatWatts(powerMetrics.maxPower)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-border/50">
                <span className="text-muted-foreground">Devices</span>
                <Badge variant="outline">{powerMetrics.deviceCount}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Battery Status Card */}
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Battery className="w-4 h-4 text-green-500" />
              Battery
            </CardTitle>
          </CardHeader>
          <CardContent>
            {batteryMetrics ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg Charge</span>
                  <span className="font-bold text-lg text-green-500">
                    {batteryMetrics.avgCharge.toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Charging</span>
                  <Badge variant="outline" className="text-green-500 border-green-500/50">
                    {batteryMetrics.chargingCount}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Discharging</span>
                  <Badge variant="outline" className="text-orange-500 border-orange-500/50">
                    {batteryMetrics.dischargingCount}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-sm pt-2 border-t border-border/50">
                  <span className="text-muted-foreground">Total</span>
                  <Badge variant="outline">{batteryMetrics.total}</Badge>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No battery data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* WiFi Status Card */}
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wifi className="w-4 h-4 text-blue-500" />
              WiFi Scanning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Networks (24h)</span>
                <span className="font-bold text-lg text-blue-500">
                  {formatNumber(wifiMetrics.uniqueNetworks)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Total Discovered</span>
                <span>{formatNumber(wifiMetrics.totalNetworks)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Scans (24h)</span>
                <span>{formatNumber(wifiMetrics.scanCount)}</span>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-border/50">
                <span className="text-muted-foreground">Active Scanners</span>
                <Badge variant="outline" className="text-blue-500 border-blue-500/50">
                  {wifiMetrics.activeScanners}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bluetooth Status Card */}
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Radio className="w-4 h-4 text-purple-500" />
              Bluetooth Scanning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Devices (24h)</span>
                <span className="font-bold text-lg text-purple-500">
                  {formatNumber(btMetrics.uniqueDevices)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Total Discovered</span>
                <span>{formatNumber(btMetrics.totalDevices)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Scans (24h)</span>
                <span>{formatNumber(btMetrics.scanCount)}</span>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-border/50">
                <span className="text-muted-foreground">Active Scanners</span>
                <Badge variant="outline" className="text-purple-500 border-purple-500/50">
                  {btMetrics.activeScanners}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConnectivityStatsSection;
