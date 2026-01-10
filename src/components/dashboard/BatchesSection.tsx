import { memo, useMemo } from "react";
import { Database, Package, Clock, Server, Loader2, HardDrive } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { 
  useBatchesList,
  useLatestBatch,
  useDiskUsageInfo,
} from "@/hooks/useAuroraApi";
import { formatLastSeen, formatDateTime } from "@/utils/dateUtils";
import { Progress } from "@/components/ui/progress";

interface BatchesSectionProps {
  limit?: number;
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const BatchesSection = memo(function BatchesSection({ limit = 10 }: BatchesSectionProps) {
  const { data: batchesData, isLoading: batchesLoading } = useBatchesList(limit);
  const { data: latestBatch } = useLatestBatch();
  const { data: diskUsage } = useDiskUsageInfo();

  const batches = batchesData?.batches ?? [];
  const totalBatches = batchesData?.count ?? 0;

  const batchStats = useMemo(() => {
    if (!batches.length) return { totalReadings: 0, avgReadings: 0, totalSize: 0 };
    const totalReadings = batches.reduce((acc, b) => acc + (b.reading_count ?? 0), 0);
    const totalSize = batches.reduce((acc, b) => acc + (b.file_size_bytes ?? 0), 0);
    return {
      totalReadings,
      avgReadings: Math.round(totalReadings / batches.length),
      totalSize,
    };
  }, [batches]);

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Package className="w-5 h-5 text-purple-500" />
        Data Batches
      </h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="glass-card rounded-lg p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Package className="w-4 h-4 text-purple-400" />
            </div>
            <span className="text-xs text-muted-foreground">Total Batches</span>
          </div>
          <div className="text-2xl font-bold text-purple-400">
            {batchesLoading ? "..." : totalBatches.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Data packages
          </div>
        </div>

        <div className="glass-card rounded-lg p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Database className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-xs text-muted-foreground">Total Readings</span>
          </div>
          <div className="text-2xl font-bold text-blue-400">
            {batchStats.totalReadings.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            In recent batches
          </div>
        </div>

        <div className="glass-card rounded-lg p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Clock className="w-4 h-4 text-green-400" />
            </div>
            <span className="text-xs text-muted-foreground">Avg/Batch</span>
          </div>
          <div className="text-2xl font-bold text-green-400">
            {batchStats.avgReadings}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Readings per batch
          </div>
        </div>

        <div className="glass-card rounded-lg p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <HardDrive className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-xs text-muted-foreground">Total Size</span>
          </div>
          <div className="text-2xl font-bold text-amber-400">
            {formatBytes(batchStats.totalSize)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Batch data size
          </div>
        </div>
      </div>

      {/* Disk Usage */}
      {diskUsage && (
        <div className="glass-card rounded-xl p-4 border border-border/50 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-muted-foreground" />
              Disk Usage
            </h3>
            <span className="text-sm text-muted-foreground">
              {formatBytes(diskUsage.used_bytes)} / {formatBytes(diskUsage.total_bytes)}
            </span>
          </div>
          <Progress value={diskUsage.usage_percent} className="h-2" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{diskUsage.usage_percent.toFixed(1)}% used</span>
            <span>{formatBytes(diskUsage.free_bytes)} free</span>
          </div>
        </div>
      )}

      {/* Batches List */}
      {batchesLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : batches.length > 0 ? (
        <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">Batch ID</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Client</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Readings</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Size</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Sensors</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Time</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <tr key={batch.batch_id} className="border-b border-border/30 hover:bg-muted/20">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-purple-400" />
                        <span className="font-mono text-xs">{batch.batch_id.slice(0, 8)}...</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="text-sm">{batch.client_id.slice(0, 12)}...</span>
                    </td>
                    <td className="p-3 text-right font-medium">
                      {batch.reading_count?.toLocaleString() ?? "—"}
                    </td>
                    <td className="p-3 text-right text-muted-foreground">
                      {batch.file_size_bytes ? formatBytes(batch.file_size_bytes) : "—"}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {(batch.sensors || batch.device_types || []).slice(0, 3).map((s, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {s}
                          </Badge>
                        ))}
                        {(batch.sensors?.length ?? batch.device_types?.length ?? 0) > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{(batch.sensors?.length ?? batch.device_types?.length ?? 0) - 3}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right text-xs text-muted-foreground">
                      {formatLastSeen(batch.timestamp)}
                    </td>
                    <td className="p-3 text-center">
                      <Badge 
                        variant="outline" 
                        className={batch.processed !== false ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}
                      >
                        {batch.processed !== false ? 'Processed' : 'Pending'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-xl p-8 text-center border border-border/50">
          <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">No data batches available</p>
        </div>
      )}
    </div>
  );
});

export default BatchesSection;
