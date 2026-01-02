import { Download, FileJson, FileSpreadsheet, FileText, Calendar, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const sensors = [
  { id: "bme280", name: "BME280 - Temperature/Humidity" },
  { id: "gps", name: "GPS Module" },
  { id: "adsb", name: "ADS-B Receiver" },
  { id: "ina219", name: "INA219 - Power Monitor" },
  { id: "lora", name: "LoRa Transceiver" },
  { id: "starlink", name: "Starlink Terminal" },
];

const ExportContent = () => {
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
                Select Sensors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {sensors.map((sensor) => (
                  <div key={sensor.id} className="flex items-center space-x-2">
                    <Checkbox id={sensor.id} defaultChecked />
                    <Label htmlFor={sensor.id} className="text-sm cursor-pointer">{sensor.name}</Label>
                  </div>
                ))}
              </div>
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
                      <SelectItem value="custom">Custom Range</SelectItem>
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
                <p className="text-2xl font-bold">~4.2 MB</p>
                <p className="text-xs text-muted-foreground">~52,000 records</p>
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
