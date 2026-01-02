import { FileText, Plus, Trash2, Edit, Power, Bell, Thermometer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

const mockRules = [
  { id: 1, name: "High Temperature Alert", condition: "Temperature > 35°C", action: "Send notification", sensor: "BME280", enabled: true, triggers: 12 },
  { id: 2, name: "Low Humidity Warning", condition: "Humidity < 30%", action: "Log to database", sensor: "BME280", enabled: true, triggers: 5 },
  { id: 3, name: "Aircraft Proximity", condition: "Distance < 10km", action: "Sound alarm", sensor: "ADS-B", enabled: false, triggers: 0 },
  { id: 4, name: "Power Outage", condition: "Voltage < 11V", action: "Send SMS", sensor: "INA219", enabled: true, triggers: 2 },
  { id: 5, name: "GPS Signal Lost", condition: "Fix = false for 5min", action: "Email alert", sensor: "GPS", enabled: true, triggers: 1 },
];

const RulesContent = () => {
  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Automation Rules</h1>
          <p className="text-muted-foreground">Configure automated actions based on sensor conditions</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Create Rule
        </Button>
      </div>

      <div className="grid gap-4">
        {mockRules.map((rule) => (
          <Card key={rule.id} className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${rule.enabled ? 'bg-primary/20' : 'bg-muted'}`}>
                    <FileText className={`w-5 h-5 ${rule.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{rule.name}</h3>
                    <p className="text-sm text-muted-foreground">{rule.condition}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <Badge variant="outline" className="mb-1">{rule.sensor}</Badge>
                    <p className="text-xs text-muted-foreground">{rule.triggers} triggers</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{rule.action}</span>
                  </div>
                  <Switch checked={rule.enabled} />
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6 bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Rule Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/30">
              <p className="text-2xl font-bold text-primary">{mockRules.length}</p>
              <p className="text-sm text-muted-foreground">Total Rules</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/30">
              <p className="text-2xl font-bold text-green-500">{mockRules.filter(r => r.enabled).length}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/30">
              <p className="text-2xl font-bold text-yellow-500">{mockRules.reduce((a, r) => a + r.triggers, 0)}</p>
              <p className="text-sm text-muted-foreground">Total Triggers</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/30">
              <p className="text-2xl font-bold text-muted-foreground">{mockRules.filter(r => !r.enabled).length}</p>
              <p className="text-sm text-muted-foreground">Disabled</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RulesContent;
