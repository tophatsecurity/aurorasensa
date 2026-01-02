import { Database, Download, Trash2, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const batches = [
  { id: "BATCH-001", created: "2026-01-02 18:30", records: 15420, size: "2.4 MB", status: "complete", sensors: 8 },
  { id: "BATCH-002", created: "2026-01-02 12:00", records: 14890, size: "2.1 MB", status: "complete", sensors: 8 },
  { id: "BATCH-003", created: "2026-01-02 06:00", records: 13200, size: "1.9 MB", status: "complete", sensors: 7 },
  { id: "BATCH-004", created: "2026-01-01 18:30", records: 16100, size: "2.6 MB", status: "complete", sensors: 8 },
  { id: "BATCH-005", created: "2026-01-01 12:00", records: 15800, size: "2.5 MB", status: "failed", sensors: 8 },
  { id: "BATCH-006", created: "2026-01-01 06:00", records: 0, size: "—", status: "pending", sensors: 8 },
];

const DataBatchesContent = () => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "complete":
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Complete</Badge>;
      case "failed":
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Data Batches</h1>
          <p className="text-muted-foreground">Manage and download sensor data batches</p>
        </div>
        <Button className="gap-2">
          <Database className="w-4 h-4" />
          Create Batch
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{batches.length}</p>
            <p className="text-sm text-muted-foreground">Total Batches</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-500">{batches.filter(b => b.status === 'complete').length}</p>
            <p className="text-sm text-muted-foreground">Complete</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{batches.reduce((a, b) => a + b.records, 0).toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Total Records</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">11.5 MB</p>
            <p className="text-sm text-muted-foreground">Total Size</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Recent Batches</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch ID</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Records</TableHead>
                <TableHead>Sensors</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-mono text-sm">{batch.id}</TableCell>
                  <TableCell>{batch.created}</TableCell>
                  <TableCell>{batch.records.toLocaleString()}</TableCell>
                  <TableCell>{batch.sensors}</TableCell>
                  <TableCell>{batch.size}</TableCell>
                  <TableCell>{getStatusBadge(batch.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled={batch.status !== 'complete'}>
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataBatchesContent;
