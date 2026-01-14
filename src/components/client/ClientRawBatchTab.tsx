import { useState } from "react";
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
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { BatchInfo, BatchReading } from "@/hooks/aurora/types";

interface ClientRawBatchTabProps {
  batch: BatchInfo | null;
  readings: BatchReading[] | null;
  isLoading?: boolean;
}

export function ClientRawBatchTab({ batch, readings, isLoading }: ClientRawBatchTabProps) {
  const [copied, setCopied] = useState(false);
  const [expandedReadings, setExpandedReadings] = useState<Set<number>>(new Set());

  const handleCopyJson = async () => {
    const data = {
      batch,
      readings,
    };
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading batch data...</span>
      </div>
    );
  }

  if (!batch) {
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
              <p className="text-xs text-muted-foreground font-mono">{batch.batch_id}</p>
            </div>
          </div>
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
                Copy JSON
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Timestamp</p>
            <p className="text-sm flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(batch.timestamp).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Readings</p>
            <Badge variant="secondary">{batch.reading_count}</Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Device Types</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {batch.device_types?.slice(0, 3).map(type => (
                <Badge key={type} variant="outline" className="text-xs capitalize">
                  {type.replace(/_/g, ' ')}
                </Badge>
              ))}
              {(batch.device_types?.length || 0) > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{(batch.device_types?.length || 0) - 3}
                </Badge>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">File Size</p>
            <p className="text-sm font-mono">
              {batch.file_size_bytes 
                ? `${(batch.file_size_bytes / 1024).toFixed(1)} KB` 
                : '—'}
            </p>
          </div>
        </div>
      </Card>

      {/* Readings */}
      {readings && readings.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <FileJson className="w-4 h-4 text-muted-foreground" />
            <h4 className="font-semibold">Batch Readings ({readings.length})</h4>
          </div>
          
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {readings.map((reading, idx) => (
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
      )}

      {/* Raw JSON */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <FileJson className="w-4 h-4 text-muted-foreground" />
          <h4 className="font-semibold">Raw Batch JSON</h4>
        </div>
        <pre className="text-xs font-mono bg-muted/30 p-4 rounded-lg overflow-auto max-h-[300px] whitespace-pre-wrap">
          {JSON.stringify(batch, null, 2)}
        </pre>
      </Card>
    </div>
  );
}
