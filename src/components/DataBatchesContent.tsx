import { Database, Download, RefreshCw, Clock, CheckCircle, Activity, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useComprehensiveStats } from "@/hooks/aurora";
import { useQueryClient } from "@tanstack/react-query";
import { usePagination } from "@/hooks/usePagination";
import { TablePagination } from "@/components/TablePagination";

const DataBatchesContent = () => {
  const { data: stats, isLoading, error } = useComprehensiveStats();
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["aurora", "stats", "comprehensive"] });
  };

  const global = stats?.global;
  const totalBatches = global?.database?.total_batches ?? 0;
  const totalReadings = global?.database?.total_readings ?? 0;
  const batchesLast24h = global?.activity?.last_24_hours?.batches_24h ?? 0;
  const readingsLast24h = global?.activity?.last_24_hours?.readings_24h ?? 0;
  const avgReadingsPerHour = global?.activity?.avg_readings_per_hour ?? 0;

  // Derive device batch activity from devices_summary
  const devices = stats?.devices_summary?.devices || [];

  const {
    currentPage,
    totalPages,
    itemsPerPage,
    startIndex,
    endIndex,
    setCurrentPage,
    setItemsPerPage,
    paginateData,
  } = usePagination<typeof devices[number]>({
    totalItems: devices.length,
    itemsPerPage: 10,
  });

  const paginatedDevices = paginateData(devices);

  if (isLoading) {
    return (
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="glass-card rounded-xl p-8 text-center border border-border/50">
          <p className="text-destructive mb-4">Failed to load batch data</p>
          <Button variant="outline" onClick={handleRefresh}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Data Batches</h1>
          <p className="text-muted-foreground">Sensor data collection and batch statistics</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{totalBatches.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Total Batches</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-success">{batchesLast24h.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Batches (24h)</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{totalReadings.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Total Readings</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-cyan-400">{avgReadingsPerHour.toFixed(0)}</p>
            <p className="text-sm text-muted-foreground">Avg/Hour</p>
          </CardContent>
        </Card>
      </div>

      {/* Device Data Activity */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50 mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Device Data Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Total Readings</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>First Seen</TableHead>
                <TableHead>Last Seen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedDevices.map((device) => (
                <TableRow key={device.device_id}>
                  <TableCell className="font-mono text-sm">{device.device_id}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {device.device_type.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>{device.total_readings.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge className={
                      device.status === 'online' 
                        ? 'bg-success/20 text-success border-success/30' 
                        : 'bg-muted text-muted-foreground'
                    }>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {device.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(device.first_seen).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(device.last_seen).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {devices.length > 0 && (
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={devices.length}
              itemsPerPage={itemsPerPage}
              startIndex={startIndex}
              endIndex={endIndex}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          )}
        </CardContent>
      </Card>

      {/* Data Time Range */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Data Time Range
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center p-4 rounded-lg bg-muted/30">
              <p className="text-2xl font-bold text-primary">
                {global?.time_ranges?.data_span_days?.toFixed(1) ?? '—'}
              </p>
              <p className="text-sm text-muted-foreground">Days of Data</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/30">
              <p className="text-sm font-mono text-foreground">
                {global?.time_ranges?.earliest_reading 
                  ? new Date(global.time_ranges.earliest_reading).toLocaleString() 
                  : '—'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Earliest Reading</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/30">
              <p className="text-sm font-mono text-foreground">
                {global?.time_ranges?.latest_reading 
                  ? new Date(global.time_ranges.latest_reading).toLocaleString() 
                  : '—'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Latest Reading</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataBatchesContent;