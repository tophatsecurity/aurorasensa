import { useMemo } from "react";
import { Server, Database, Radio, Globe, Cpu } from "lucide-react";
import StatCardWithChart from "../StatCardWithChart";
import { Badge } from "@/components/ui/badge";
import {
  useComprehensiveStats,
  useStatsOverview,
  useStatsByClient,
  useStatsBySensor,
  useDeviceTree,
  useClients,
  useClientsByState,
  useGlobalStats,
  type Client,
  type ClientGroupedStats,
  type SensorGroupedStats,
} from "@/hooks/aurora";

interface DashboardStatsHeaderProps {
  periodHours?: number;
  clientId?: string | null;
}

const DashboardStatsHeader = ({ periodHours = 24, clientId }: DashboardStatsHeaderProps) => {
  // Pass clientId to API calls for filtering
  const effectiveClientId = clientId === "all" ? undefined : clientId;
  
  const { data: stats, isLoading: statsLoading } = useComprehensiveStats(effectiveClientId);
  const { data: globalStats, isLoading: globalStatsLoading } = useGlobalStats(effectiveClientId);
  const { data: statsOverview, isLoading: overviewLoading } = useStatsOverview();
  const { data: clientStats, isLoading: clientStatsLoading } = useStatsByClient({ 
    hours: periodHours,
    clientId: effectiveClientId 
  });
  const { data: sensorStats, isLoading: sensorStatsLoading } = useStatsBySensor({ 
    hours: periodHours,
    clientId: effectiveClientId 
  });
  const { data: deviceTree, isLoading: deviceTreeLoading } = useDeviceTree();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: clientsByState } = useClientsByState();

  const global = stats?.global;
  const devicesSummary = stats?.devices_summary;
  const sensorsSummary = stats?.sensors_summary;

  // Aggregate clients from clientsByState - this has the rich client data
  const allClientsFromState = useMemo(() => {
    if (!clientsByState?.clients_by_state) return [];
    const { pending = [], registered = [], adopted = [], disabled = [], suspended = [] } = clientsByState.clients_by_state;
    return [...pending, ...registered, ...adopted, ...disabled, ...suspended];
  }, [clientsByState]);

  // Active clients (not deleted/disabled/suspended) - these have real hostname, IP, sensors data
  const activeClients = useMemo(() => {
    if (allClientsFromState.length > 0) {
      return allClientsFromState.filter((c: Client) => 
        !['deleted', 'disabled', 'suspended'].includes(c.state ?? '')
      );
    }
    return (clients ?? []).filter((c: Client) => 
      !['deleted', 'disabled', 'suspended'].includes(c.state ?? '')
    );
  }, [allClientsFromState, clients]);

  // Total readings - prefer globalStats (properly unwrapped from API data wrapper)
  const totalReadings = 
    globalStats?.total_readings ??
    statsOverview?.total_readings ?? 
    global?.total_readings ?? 
    0;
  
  
  // Client count - prioritize clientsByState data which is most reliable
  const clientsFromStates = allClientsFromState.length;
  const clientCountFromStats = 
    clientsFromStates > 0 ? clientsFromStates :
    globalStats?.total_clients ??
    clientStats?.total ?? 
    global?.total_clients ?? 
    activeClients.length;
  const totalClients = clientCountFromStats > 0 ? clientCountFromStats : (clients?.length || 1);

  // Sensor types count - prefer globalStats
  const sensorTypesFromStats = 
    globalStats?.sensor_types_count ?? 
    global?.sensor_types_count ?? 
    globalStats?.device_breakdown?.length ??
    global?.device_breakdown?.length ?? 
    0;
  const totalSensorTypes = 
    sensorTypesFromStats > 0 ? sensorTypesFromStats :
    (sensorStats?.total ?? sensorsSummary?.total_sensor_types ?? 0);

  // Total devices - prefer globalStats
  const devicesFromTree = Array.isArray(deviceTree) ? deviceTree.length : 0;
  const totalDevices = 
    globalStats?.total_devices ??
    global?.total_devices ?? 
    (devicesFromTree > 0 ? devicesFromTree : (devicesSummary?.total_devices ?? 0));

  // Period-specific readings - from globalStats activity if available
  const activeDevices1h = global?.activity?.last_1_hour?.active_devices_1h ?? 0;
  const readings1h = global?.activity?.last_1_hour?.readings_1h ?? 0;

  // Prepare chart data for clients - USE REAL CLIENT DATA from clientsByState
  const clientChartDevices = useMemo(() => {
    const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
    
    // Priority 1: Use real client data from clientsByState (has hostname, IP, sensors)
    if (activeClients.length > 0) {
      return activeClients.slice(0, 6).map((c: Client, idx: number) => {
        // Count sensors from the client's sensor array
        const sensorCount = Array.isArray(c.sensors) ? c.sensors.length : 0;
        
        return {
          device_id: c.hostname || c.client_id || `client_${idx}`,
          device_type: 'client',
          color: colors[idx % colors.length],
          reading_count: (c.batches_received ?? sensorCount * 100) || 1,
          status: c.state === 'adopted' ? 'active' : (c.state || 'active'),
          // Additional real data
          hostname: c.hostname,
          ip_address: c.ip_address,
          mac_address: c.mac_address,
          sensors: c.sensors,
        };
      });
    }
    
    // Priority 2: Use useStatsByClient data if available
    if (clientStats?.clients && clientStats.clients.length > 0) {
      return clientStats.clients.slice(0, 6).map((c: ClientGroupedStats, idx: number) => ({
        device_id: c.hostname || c.client_id,
        device_type: 'client',
        color: colors[idx % colors.length],
        reading_count: c.reading_count,
        status: 'active',
      }));
    }
    
    return [];
  }, [activeClients, clientStats?.clients]);

  // Prepare chart data for sensors - use real sensor data
  const sensorChartDevices = useMemo(() => {
    const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
    
    // Priority 1: Extract sensors from real client data
    if (activeClients.length > 0) {
      const sensorCounts: Record<string, number> = {};
      activeClients.forEach((client: Client) => {
        if (Array.isArray(client.sensors)) {
          client.sensors.forEach((sensor: string) => {
            // Extract sensor type from sensor name (e.g., "adsb_rtlsdr_1" -> "adsb_rtlsdr")
            const sensorType = sensor.replace(/_\d+$/, '');
            sensorCounts[sensorType] = (sensorCounts[sensorType] || 0) + 1;
          });
        }
      });
      
      const sensorTypes = Object.entries(sensorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);
      
      if (sensorTypes.length > 0) {
        return sensorTypes.map(([sensorType, count], idx) => ({
          device_id: sensorType,
          device_type: sensorType,
          color: colors[idx % colors.length],
          reading_count: count * 100, // Approximate readings
          status: 'active',
        }));
      }
    }
    
    // Priority 2: Use useStatsBySensor data
    if (sensorStats?.sensors && sensorStats.sensors.length > 0) {
      return sensorStats.sensors.slice(0, 6).map((s: SensorGroupedStats, idx: number) => ({
        device_id: s.sensor_type,
        device_type: s.sensor_type,
        color: colors[idx % colors.length],
        reading_count: s.reading_count,
        status: 'active',
      }));
    }
    
    // Priority 3: Fallback to comprehensive stats
    return (sensorsSummary?.sensor_types ?? []).slice(0, 6).map((s, idx: number) => ({
      device_id: s.device_type,
      device_type: s.device_type,
      color: colors[idx % colors.length],
      reading_count: s.total_readings,
      status: s.active_last_hour ? 'active' : 'inactive',
    }));
  }, [activeClients, sensorStats?.sensors, sensorsSummary?.sensor_types]);

  // Prepare chart data for devices
  const deviceChartDevices = useMemo(() => {
    const colors = ['#8b5cf6', '#06b6d4', '#ef4444', '#84cc16', '#f59e0b', '#ec4899'];
    return (devicesSummary?.devices ?? []).slice(0, 6).map((d, idx: number) => ({
      device_id: d.device_id,
      device_type: d.device_type,
      color: colors[idx % colors.length],
      reading_count: d.total_readings,
      status: d.status,
    }));
  }, [devicesSummary?.devices]);

  const isLoading = statsLoading || globalStatsLoading || overviewLoading || clientStatsLoading || sensorStatsLoading;

  // Get the primary client for display (first adopted client)
  const primaryClient = activeClients[0];

  return (
    <div className="space-y-4 mb-8">
      {/* Main Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCardWithChart
          title="CONNECTED CLIENTS"
          value={clientsLoading ? "..." : totalClients.toString()}
          subtitle={primaryClient 
            ? `${primaryClient.hostname || primaryClient.client_id?.slice(0, 16) || 'Client'} connected`
            : `${activeDevices1h} devices active in last hour`
          }
          icon={Server}
          iconBgColor="bg-green-500/20"
          isLoading={clientsLoading || clientStatsLoading}
          devices={clientChartDevices}
        />
        <StatCardWithChart
          title="TOTAL READINGS"
          value={isLoading ? "..." : totalReadings.toLocaleString()}
          subtitle={`${readings1h.toLocaleString()} last hour`}
          icon={Database}
          iconBgColor="bg-blue-500/20"
          isLoading={isLoading}
          devices={sensorChartDevices}
        />
        <StatCardWithChart
          title="SENSOR TYPES"
          value={isLoading ? "..." : totalSensorTypes.toString()}
          subtitle={`${totalDevices} unique devices`}
          icon={Radio}
          iconBgColor="bg-purple-500/20"
          isLoading={isLoading || deviceTreeLoading}
          devices={deviceChartDevices}
        />
      </div>

      {/* Connected Clients Details - Real Client Info */}
      {activeClients.length > 0 && (
        <div className="glass-card rounded-lg p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <Server className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">Connected Clients</span>
            <Badge variant="outline" className="ml-auto text-xs">
              {activeClients.length} active
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeClients.slice(0, 6).map((client: Client, idx: number) => (
              <div 
                key={client.client_id || idx} 
                className="p-3 rounded-lg bg-background/50 border border-border/30 hover:border-green-500/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="font-medium text-sm truncate" title={client.hostname || client.client_id}>
                        {client.hostname || client.client_id?.slice(0, 16) || `Client ${idx + 1}`}
                      </span>
                    </div>
                    {client.ip_address && (
                      <div className="flex items-center gap-1 mt-1">
                        <Globe className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{client.ip_address}</span>
                      </div>
                    )}
                  </div>
                  <Badge 
                    variant={client.state === 'adopted' ? 'default' : 'secondary'}
                    className="text-[10px] px-1.5 py-0.5"
                  >
                    {client.state || 'active'}
                  </Badge>
                </div>
                
                {/* Sensors */}
                {Array.isArray(client.sensors) && client.sensors.length > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center gap-1 mb-1">
                      <Cpu className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">
                        {client.sensors.length} sensors
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {client.sensors.slice(0, 4).map((sensor: string, sIdx: number) => {
                        // Clean up sensor name for display
                        const displayName = sensor.replace(/_\d+$/, '').replace(/_/g, ' ');
                        return (
                          <Badge 
                            key={sIdx} 
                            variant="outline" 
                            className="text-[9px] px-1 py-0 capitalize"
                          >
                            {displayName}
                          </Badge>
                        );
                      })}
                      {client.sensors.length > 4 && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0">
                          +{client.sensors.length - 4}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                
                {/* MAC Address */}
                {client.mac_address && (
                  <div className="mt-2 pt-2 border-t border-border/30">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      MAC: {client.mac_address}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardStatsHeader;
