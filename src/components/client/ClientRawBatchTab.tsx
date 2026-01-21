import { useState, useMemo } from "react";
import { 
  Database, 
  Clock, 
  FileJson, 
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  Download,
  Search,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import type { BatchInfo, BatchReading } from "@/hooks/aurora/types";

interface ClientRawBatchTabProps {
  batch: BatchInfo | null;
  readings: BatchReading[] | null;
  isLoading?: boolean;
  latestBatchData?: unknown;
}

export function ClientRawBatchTab({ batch, readings, isLoading, latestBatchData }: ClientRawBatchTabProps) {
  const [copied, setCopied] = useState(false);
  const [expandedReadings, setExpandedReadings] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  // Combine all data for export
  const fullExportData = useMemo(() => {
    return {
      batch,
      readings,
      latestBatchData,
      exportedAt: new Date().toISOString(),
    };
  }, [batch, readings, latestBatchData]);

  // Filter readings by search
  const filteredReadings = useMemo(() => {
    if (!readings || !searchQuery.trim()) return readings || [];
    const query = searchQuery.toLowerCase();
    return readings.filter(r => 
      r.device_type?.toLowerCase().includes(query) ||
      r.device_id?.toLowerCase().includes(query) ||
      JSON.stringify(r).toLowerCase().includes(query)
    );
  }, [readings, searchQuery]);

  const handleCopyJson = async () => {
    await navigator.clipboard.writeText(JSON.stringify(fullExportData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    const dataStr = JSON.stringify(fullExportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    link.download = `batch-${batch?.batch_id || 'data'}-${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const toggleReading = (index: number) => {
    setExpandedReadings(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (!filteredReadings) return;
    setExpandedReadings(new Set(filteredReadings.map((_, i) => i)));
  };

  const collapseAll = () => {
    setExpandedReadings(new Set());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading batch data...</span>
      </div>
    );
  }

  if (!batch && !latestBatchData) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No batch data available for this client</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Batch Info Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Latest Batch</h3>
              <p className="text-xs text-muted-foreground font-mono">{batch?.batch_id || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCopyJson}
              className="gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleDownloadJson}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Download JSON
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Timestamp</p>
            <p className="text-sm flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {batch?.timestamp ? new Date(batch.timestamp).toLocaleString() : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Readings</p>
            <Badge variant="secondary">{batch?.reading_count || readings?.length || 0}</Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Device Types</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {batch?.device_types?.slice(0, 3).map(type => (
                <Badge key={type} variant="outline" className="text-xs capitalize">
                  {type.replace(/_/g, ' ')}
                </Badge>
              ))}
              {(batch?.device_types?.length || 0) > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{(batch?.device_types?.length || 0) - 3}
                </Badge>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">File Size</p>
            <p className="text-sm font-mono">
              {batch?.file_size_bytes 
                ? `${(batch.file_size_bytes / 1024).toFixed(1)} KB` 
                : '—'}
            </p>
          </div>
        </div>
      </Card>

      {/* Readings with Search */}
      {(readings && readings.length > 0) || (filteredReadings && filteredReadings.length > 0) ? (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileJson className="w-4 h-4 text-muted-foreground" />
              <h4 className="font-semibold">Batch Readings ({filteredReadings?.length || 0})</h4>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={expandAll}>Expand All</Button>
              <Button variant="ghost" size="sm" onClick={collapseAll}>Collapse All</Button>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search readings by device type, ID, or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {filteredReadings?.map((reading, idx) => (
                <div key={idx} className="border border-border/50 rounded-lg overflow-hidden">
                  <button
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
                    onClick={() => toggleReading(idx)}
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="capitalize">
                        {reading.device_type?.replace(/_/g, ' ') || 'Unknown'}
                      </Badge>
                      <span className="text-sm font-mono text-muted-foreground">
                        {reading.device_id}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(reading.timestamp).toLocaleTimeString()}
                      </span>
                      {expandedReadings.has(idx) ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </button>
                  
                  {expandedReadings.has(idx) && (
                    <div className="px-4 py-3 border-t border-border/50 bg-muted/20">
                      <pre className="text-xs font-mono overflow-auto max-h-[200px] whitespace-pre-wrap">
                        {JSON.stringify(reading, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      ) : null}

      {/* Raw JSON */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileJson className="w-4 h-4 text-muted-foreground" />
            <h4 className="font-semibold">Raw Batch JSON</h4>
          </div>
          <Button variant="outline" size="sm" onClick={handleDownloadJson} className="gap-2">
            <Download className="w-4 h-4" />
            Download
          </Button>
        </div>
        <pre className="text-xs font-mono bg-muted/30 p-4 rounded-lg overflow-auto max-h-[400px] whitespace-pre-wrap">
          {JSON.stringify(fullExportData, null, 2)}
        </pre>
      </Card>
    </div>
  );
}
