import { useMemo } from "react";
import { Server, Database, Radio, Loader2, Users, Cpu } from "lucide-react";
import StatCardWithChart from "../StatCardWithChart";
import {
  useComprehensiveStats,
  useStatsOverview,
  useStatsByClient,
  useStatsBySensor,
  useDeviceTree,
  useClients,
  useClientsByState,
  type Client,
} from "@/hooks/aurora";

interface DashboardStatsHeaderProps {
  periodHours?: number;
}

const DashboardStatsHeader = ({ periodHours = 24 }: DashboardStatsHeaderProps) => {
  const { data: stats, isLoading: statsLoading } = useComprehensiveStats();
  const { data: statsOverview, isLoading: overviewLoading } = useStatsOverview();
  const { data: clientStats, isLoading: clientStatsLoading } = useStatsByClient({ hours: periodHours });
  const { data: sensorStats, isLoading: sensorStatsLoading } = useStatsBySensor({ hours: periodHours });
  const { data: deviceTree, isLoading: deviceTreeLoading } = useDeviceTree();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: clientsByState } = useClientsByState();

  const global = stats?.global;
  const devicesSummary = stats?.devices_summary;
  const sensorsSummary = stats?.sensors_summary;

  // Aggregate clients from clientsByState
  const allClientsFromState = useMemo(() => {
    if (!clientsByState?.clients_by_state) return [];
    const { pending = [], registered = [], adopted = [], disabled = [], suspended = [] } = clientsByState.clients_by_state;
    return [...pending, ...registered, ...adopted, ...disabled, ...suspended];
  }, [clientsByState]);

  // Active clients (not deleted/disabled/suspended)
  const activeClients = useMemo(() => {
    if (allClientsFromState.length > 0) {
      return allClientsFromState.filter((c: Client) => 
        !['deleted', 'disabled', 'suspended'].includes(c.state || '')
      );
    }
    return (clients || []).filter((c: Client) => 
      !['deleted', 'disabled', 'suspended'].includes(c.state || '')
    );
  }, [allClientsFromState, clients]);

  // Total readings - use statsOverview, fallback to comprehensive stats
  const totalReadings = statsOverview?.total_readings ?? global?.total_readings ?? global?.database?.total_readings ?? 0;
  
  // Client count - prefer new grouped stats
  const totalClients = clientStats?.total ?? 
    global?.total_clients ?? 
    global?.database?.total_clients ?? 
    activeClients.length;

  // Sensor types count - prefer new grouped stats
  const sensorTypesFromStats = global?.sensor_types_count ?? (global?.device_breakdown?.length ?? 0);
  const totalSensorTypes = sensorStats?.total ?? 
    (sensorTypesFromStats > 0 ? sensorTypesFromStats : (sensorsSummary?.total_sensor_types ?? 0));

  // Total devices
  const devicesFromTree = Array.isArray(deviceTree) ? deviceTree.length : 0;
  const totalDevices = global?.total_devices ?? 
    (devicesFromTree > 0 ? devicesFromTree : (devicesSummary?.total_devices ?? 0));

  // Period-specific readings
  const activeDevices1h = global?.activity?.last_1_hour?.active_devices_1h ?? 0;
  const readings1h = global?.activity?.last_1_hour?.readings_1h ?? 0;

  // Prepare chart data for clients
  const clientChartDevices = useMemo(() => {
    const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
    
    // Prefer new useStatsByClient data
    if (clientStats?.clients && clientStats.clients.length > 0) {
      return clientStats.clients.slice(0, 6).map((c, idx) => ({
        device_id: c.client_id,
        device_type: 'client',
        color: colors[idx % colors.length],
        reading_count: c.reading_count,
        status: 'active',
      }));
    }
    
    // Fallback to active clients
    return activeClients.slice(0, 6).map((c, idx) => ({
      device_id: `${c.client_id}_${idx}`,
      device_type: 'client',
      color: colors[idx % colors.length],
      reading_count: (c.batches_received ?? 0) * 50,
      status: c.status || 'active',
    }));
  }, [clientStats?.clients, activeClients]);

  // Prepare chart data for sensors
  const sensorChartDevices = useMemo(() => {
    const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
    
    // Prefer new useStatsBySensor data
    if (sensorStats?.sensors && sensorStats.sensors.length > 0) {
      return sensorStats.sensors.slice(0, 6).map((s, idx) => ({
        device_id: s.sensor_type,
        device_type: s.sensor_type,
        color: colors[idx % colors.length],
        reading_count: s.reading_count,
        status: 'active',
      }));
    }
    
    // Fallback to comprehensive stats sensor types
    return (sensorsSummary?.sensor_types || []).slice(0, 6).map((s, idx) => ({
      device_id: s.device_type,
      device_type: s.device_type,
      color: colors[idx % colors.length],
      reading_count: s.total_readings,
      status: s.active_last_hour ? 'active' : 'inactive',
    }));
  }, [sensorStats?.sensors, sensorsSummary?.sensor_types]);

  // Prepare chart data for devices
  const deviceChartDevices = useMemo(() => {
    const colors = ['#8b5cf6', '#06b6d4', '#ef4444', '#84cc16', '#f59e0b', '#ec4899'];
    return (devicesSummary?.devices || []).slice(0, 6).map((d, idx) => ({
      device_id: d.device_id,
      device_type: d.device_type,
      color: colors[idx % colors.length],
      reading_count: d.total_readings,
      status: d.status,
    }));
  }, [devicesSummary?.devices]);

  const isLoading = statsLoading || overviewLoading || clientStatsLoading || sensorStatsLoading;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <StatCardWithChart
        title="CONNECTED CLIENTS"
        value={clientsLoading ? "..." : totalClients.toString()}
        subtitle={`${activeDevices1h} devices active in last hour`}
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
  );
};

export default DashboardStatsHeader;
