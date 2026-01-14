import { useState, useMemo } from "react";
import { Code2, Copy, Check, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RawJsonPanelProps {
  readings: unknown[];
  clientId: string;
}

export function RawJsonPanel({ readings, clientId }: RawJsonPanelProps) {
  const [copied, setCopied] = useState(false);

  const latestBatch = useMemo(() => {
    if (!readings || readings.length === 0) return null;
    
    const clientReadings = clientId 
      ? readings.filter((r: any) => r.client_id === clientId)
      : readings;
    
    const sorted = [...clientReadings].sort((a: any, b: any) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    return sorted.slice(0, 50);
  }, [readings, clientId]);

  const jsonString = useMemo(() => {
    return JSON.stringify(latestBatch, null, 2);
  }, [latestBatch]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${clientId}_batch_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!latestBatch || latestBatch.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-8 text-center">
          <Code2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No batch data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-primary" />
            <span>Latest Batch - Raw JSON</span>
            <span className="text-xs font-normal text-muted-foreground">
              ({latestBatch.length} readings)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownload}
              className="h-7 px-2"
            >
              <Download className="w-3 h-3 mr-1" />
              Download
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCopy}
              className="h-7 px-2"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <ScrollArea className="h-[400px] rounded-lg border border-border/50 bg-muted/20">
          <pre className="p-4 text-xs font-mono text-foreground/90 whitespace-pre-wrap break-all">
            {jsonString}
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}