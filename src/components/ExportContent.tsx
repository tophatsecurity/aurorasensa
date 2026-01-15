import { Download, FileJson, FileSpreadsheet, FileText, Calendar, Filter, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useComprehensiveStats } from "@/hooks/aurora";

const ExportContent = () => {
  const { data: stats, isLoading } = useComprehensiveStats();

  // Get real sensor types from API
  const sensorTypes = stats?.sensors_summary?.sensor_types || [];
  // Use flat structure first, fallback to nested
  const totalReadings = stats?.global?.total_readings ?? stats?.global?.database?.total_readings ?? 0;

  // Estimate export size based on readings
  const estimatedSize = (totalReadings * 0.0001).toFixed(1); // ~100 bytes per reading

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Export Data</h1>
        <p className="text-muted-foreground">Export sensor data in various formats</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Select Sensors ({sensorTypes.length} available)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : sensorTypes.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {sensorTypes.map((sensor) => (
                    <div key={sensor.device_type} className="flex items-center space-x-2">
                      <Checkbox id={sensor.device_type} defaultChecked />
                      <Label htmlFor={sensor.device_type} className="text-sm cursor-pointer capitalize">
                        {sensor.device_type.replace(/_/g, ' ')}
                        <span className="text-xs text-muted-foreground ml-2">
                          ({sensor.total_readings.toLocaleString()} readings)
                        </span>
                      </Label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No sensors available</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Time Range
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Preset Range</Label>
                  <Select defaultValue="24h">
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">Last Hour</SelectItem>
                      <SelectItem value="6h">Last 6 Hours</SelectItem>
                      <SelectItem value="24h">Last 24 Hours</SelectItem>
                      <SelectItem value="7d">Last 7 Days</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                      <SelectItem value="all">All Data ({stats?.global?.time_ranges?.data_span_days?.toFixed(0) ?? '—'} days)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Data Resolution</Label>
                  <Select defaultValue="1m">
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="raw">Raw (All Data)</SelectItem>
                      <SelectItem value="1m">1 Minute Average</SelectItem>
                      <SelectItem value="5m">5 Minute Average</SelectItem>
                      <SelectItem value="1h">1 Hour Average</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {stats?.global?.time_ranges && (
                <div className="mt-4 p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground">
                  <p>Data available from {new Date(stats.global.time_ranges.earliest_reading).toLocaleDateString()} to {new Date(stats.global.time_ranges.latest_reading).toLocaleDateString()}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Export Format</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start gap-3 h-14">
                <div className="w-10 h-10 rounded bg-green-500/20 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-green-500" />
                </div>
                <div className="text-left">
                  <p className="font-medium">CSV</p>
                  <p className="text-xs text-muted-foreground">Spreadsheet compatible</p>
                </div>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 h-14">
                <div className="w-10 h-10 rounded bg-blue-500/20 flex items-center justify-center">
                  <FileJson className="w-5 h-5 text-blue-500" />
                </div>
                <div className="text-left">
                  <p className="font-medium">JSON</p>
                  <p className="text-xs text-muted-foreground">API compatible</p>
                </div>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 h-14">
                <div className="w-10 h-10 rounded bg-purple-500/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple-500" />
                </div>
                <div className="text-left">
                  <p className="font-medium">InfluxDB</p>
                  <p className="text-xs text-muted-foreground">Line protocol format</p>
                </div>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-4">
              <div className="text-center mb-4">
                <p className="text-sm text-muted-foreground">Estimated Export Size</p>
                <p className="text-2xl font-bold">~{estimatedSize} MB</p>
                <p className="text-xs text-muted-foreground">~{totalReadings.toLocaleString()} records</p>
              </div>
              <Button className="w-full gap-2">
                <Download className="w-4 h-4" />
                Export Data
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ExportContent;