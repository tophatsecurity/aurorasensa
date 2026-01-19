import { useMemo } from "react";
import { Server, Database, Radio } from "lucide-react";
import StatCardWithChart from "../StatCardWithChart";
import {
  useComprehensiveStats,
  useStatsOverview,
  useStatsBySensor,
  useDeviceTree,
  useClients,
  useClientsByState,
  useGlobalStats,
  useDashboardTimeseries,
  useDashboardClientStats,
  useDashboardSensorStats,
  type Client,
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
  
  // NEW: Use the dedicated dashboard client stats hook (uses /api/stats/by-client)
  const { data: dashboardClientStats, isLoading: dashboardClientStatsLoading } = useDashboardClientStats(
    effectiveClientId, 
    periodHours
  );
  
  // NEW: Use the dedicated dashboard sensor stats hook (uses /api/dashboard/sensor-stats)
  const { data: dashboardSensorStats, isLoading: dashboardSensorStatsLoading } = useDashboardSensorStats(
    effectiveClientId
  );
  
  const { data: sensorStats, isLoading: sensorStatsLoading } = useStatsBySensor({ 
    hours: periodHours,
    clientId: effectiveClientId 
  });
  const { data: deviceTree, isLoading: deviceTreeLoading } = useDeviceTree();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: clientsByState } = useClientsByState();
  
  // Fetch real timeseries data for sparkline charts
  const { data: timeseries, isLoading: timeseriesLoading } = useDashboardTimeseries(periodHours, effectiveClientId);

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

  // Total readings - prefer dashboardSensorStats (from /api/dashboard/sensor-stats), then globalStats
  const totalReadings = 
    dashboardSensorStats?.readings_last_24h ??
    globalStats?.total_readings ??
    statsOverview?.total_readings ?? 
    global?.total_readings ?? 
    0;
  
  // Client count - prioritize dashboardClientStats (from /api/stats/by-client)
  const clientsFromDashboard = dashboardClientStats?.clients?.length ?? 0;
  const clientsFromStates = allClientsFromState.length;
  const clientCountFromStats = 
    clientsFromDashboard > 0 ? clientsFromDashboard :
    clientsFromStates > 0 ? clientsFromStates :
    globalStats?.total_clients ??
    global?.total_clients ?? 
    activeClients.length;
  const totalClients = clientCountFromStats > 0 ? clientCountFromStats : (clients?.length || 1);

  // Total readings from all clients (from by-client endpoint)
  const totalReadingsFromClients = useMemo(() => {
    if (dashboardClientStats?.clients && dashboardClientStats.clients.length > 0) {
      return dashboardClientStats.clients.reduce((sum, c) => sum + (c.reading_count || 0), 0);
    }
    return 0;
  }, [dashboardClientStats?.clients]);

  // Use the more accurate reading count
  const displayReadings = totalReadingsFromClients > 0 ? totalReadingsFromClients : totalReadings;

  // Sensor types count - prefer dashboardSensorStats, then globalStats
  const sensorTypesFromDashboard = dashboardSensorStats?.total_sensors ?? 0;
  const sensorTypesFromStats = 
    sensorTypesFromDashboard > 0 ? sensorTypesFromDashboard :
    globalStats?.sensor_types_count ?? 
    global?.sensor_types_count ?? 
    globalStats?.device_breakdown?.length ??
    global?.device_breakdown?.length ?? 
    0;
  const totalSensorTypes = 
    sensorTypesFromStats > 0 ? sensorTypesFromStats :
    (sensorStats?.total ?? sensorsSummary?.total_sensor_types ?? 0);

  // Total devices - prefer dashboardSensorStats, then globalStats
  const devicesFromDashboard = dashboardSensorStats?.total_devices ?? 0;
  const devicesFromTree = Array.isArray(deviceTree) ? deviceTree.length : 0;
  const totalDevices = 
    devicesFromDashboard > 0 ? devicesFromDashboard :
    globalStats?.total_devices ??
    global?.total_devices ?? 
    (devicesFromTree > 0 ? devicesFromTree : (devicesSummary?.total_devices ?? 0));

  // Period-specific readings - from globalStats activity if available
  const activeDevices1h = global?.activity?.last_1_hour?.active_devices_1h ?? 0;
  const readings1h = global?.activity?.last_1_hour?.readings_1h ?? 0;

  // Prepare chart data for clients - prioritize dashboardClientStats
  const clientChartDevices = useMemo(() => {
    const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
    
    // Priority 1: Use dashboardClientStats (from /api/stats/by-client - most accurate)
    if (dashboardClientStats?.clients && dashboardClientStats.clients.length > 0) {
      return dashboardClientStats.clients.slice(0, 6).map((c, idx) => ({
        device_id: c.client_id,
        device_type: 'client',
        color: colors[idx % colors.length],
        reading_count: c.reading_count || 0,
        status: 'active',
      }));
    }
    
    // Priority 2: Use real client data from clientsByState (has hostname, IP, sensors)
    if (activeClients.length > 0) {
      return activeClients.slice(0, 6).map((c: Client, idx: number) => {
        const sensorCount = Array.isArray(c.sensors) ? c.sensors.length : 0;
        
        return {
          device_id: c.hostname || c.client_id || `client_${idx}`,
          device_type: 'client',
          color: colors[idx % colors.length],
          reading_count: (c.batches_received ?? sensorCount * 100) || 1,
          status: c.state === 'adopted' ? 'active' : (c.state || 'active'),
        };
      });
    }
    
    return [];
  }, [dashboardClientStats?.clients, activeClients]);

  // Prepare chart data for sensors - use dashboardSensorStats first
  const sensorChartDevices = useMemo(() => {
    const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
    
    // Priority 1: Use dashboardSensorStats.sensorItems (from /api/dashboard/sensor-stats)
    const sensorItems = (dashboardSensorStats as { sensorItems?: Array<{ sensor_type: string; reading_count: number }> })?.sensorItems;
    if (sensorItems && sensorItems.length > 0) {
      return sensorItems.slice(0, 6).map((s, idx) => ({
        device_id: s.sensor_type,
        device_type: s.sensor_type,
        color: colors[idx % colors.length],
        reading_count: s.reading_count || 0,
        status: 'active',
      }));
    }
    
    // Priority 2: Extract sensors from real client data
    if (activeClients.length > 0) {
      const sensorCounts: Record<string, number> = {};
      activeClients.forEach((client: Client) => {
        if (Array.isArray(client.sensors)) {
          client.sensors.forEach((sensor: string) => {
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
          reading_count: count * 100,
          status: 'active',
        }));
      }
    }
    
    // Priority 3: Use useStatsBySensor data
    if (sensorStats?.sensors && sensorStats.sensors.length > 0) {
      return sensorStats.sensors.slice(0, 6).map((s: SensorGroupedStats, idx: number) => ({
        device_id: s.sensor_type,
        device_type: s.sensor_type,
        color: colors[idx % colors.length],
        reading_count: s.reading_count,
        status: 'active',
      }));
    }
    
    // Priority 4: Fallback to comprehensive stats
    return (sensorsSummary?.sensor_types ?? []).slice(0, 6).map((s, idx: number) => ({
      device_id: s.device_type,
      device_type: s.device_type,
      color: colors[idx % colors.length],
      reading_count: s.total_readings,
      status: s.active_last_hour ? 'active' : 'inactive',
    }));
  }, [dashboardSensorStats, activeClients, sensorStats?.sensors, sensorsSummary?.sensor_types]);

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

  // Convert timeseries data for sparklines
  const clientTimeseries = useMemo(() => {
    return (timeseries?.temperature || []).map(t => ({
      timestamp: t.timestamp,
      value: t.value,
    }));
  }, [timeseries?.temperature]);

  const readingsTimeseries = useMemo(() => {
    const combined: { timestamp: string; value: number }[] = [];
    const allSeries = [
      timeseries?.temperature || [],
      timeseries?.humidity || [],
      timeseries?.power || [],
      timeseries?.signal || [],
    ];
    
    const byTime: Record<string, number> = {};
    allSeries.forEach(series => {
      series.forEach(point => {
        byTime[point.timestamp] = (byTime[point.timestamp] || 0) + 1;
      });
    });
    
    Object.entries(byTime)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([timestamp, count]) => {
        combined.push({ timestamp, value: count });
      });
    
    return combined;
  }, [timeseries]);

  const sensorTimeseries = useMemo(() => {
    return (timeseries?.power || timeseries?.humidity || []).map(t => ({
      timestamp: t.timestamp,
      value: t.value,
    }));
  }, [timeseries?.power, timeseries?.humidity]);

  const isLoading = statsLoading || globalStatsLoading || overviewLoading || dashboardClientStatsLoading || dashboardSensorStatsLoading || sensorStatsLoading;

  // Get the primary client for display (first from dashboard stats, or first active client)
  const primaryClientId = dashboardClientStats?.clients?.[0]?.client_id;
  const primaryClient = primaryClientId 
    ? activeClients.find((c: Client) => c.client_id === primaryClientId) || activeClients[0]
    : activeClients[0];

  // Format client display name
  const getClientDisplayName = (client: Client | undefined) => {
    if (!client) return null;
    if (client.hostname && client.hostname !== 'unknown') return client.hostname;
    if (client.client_id) return client.client_id.slice(0, 16);
    return 'Client';
  };

  return (
    <div className="mb-8">
      {/* Main Stats Row with Real Timeseries Data */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCardWithChart
          title="CONNECTED CLIENTS"
          value={clientsLoading || dashboardClientStatsLoading ? "..." : totalClients.toString()}
          subtitle={primaryClient 
            ? `${getClientDisplayName(primaryClient)} connected`
            : `${activeDevices1h} devices active in last hour`
          }
          icon={Server}
          iconBgColor="bg-green-500/20"
          isLoading={clientsLoading || dashboardClientStatsLoading || timeseriesLoading}
          devices={clientChartDevices}
          timeseries={clientTimeseries}
        />
        <StatCardWithChart
          title="TOTAL READINGS"
          value={isLoading ? "..." : displayReadings.toLocaleString()}
          subtitle={`${readings1h.toLocaleString()} last hour`}
          icon={Database}
          iconBgColor="bg-blue-500/20"
          isLoading={isLoading || timeseriesLoading}
          devices={sensorChartDevices}
          timeseries={readingsTimeseries}
        />
        <StatCardWithChart
          title="SENSOR TYPES"
          value={isLoading ? "..." : totalSensorTypes.toString()}
          subtitle={`${totalDevices} unique devices`}
          icon={Radio}
          iconBgColor="bg-purple-500/20"
          isLoading={isLoading || deviceTreeLoading || timeseriesLoading}
          devices={deviceChartDevices}
          timeseries={sensorTimeseries}
        />
      </div>
    </div>
  );
};

export default DashboardStatsHeader;
