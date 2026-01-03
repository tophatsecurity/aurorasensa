import { Settings2, Clock, Trash2, Navigation, Radio, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface GpsHistorySettingsProps {
  sensorRetentionMinutes: number;
  clientRetentionMinutes: number;
  onSensorRetentionChange: (minutes: number) => void;
  onClientRetentionChange: (minutes: number) => void;
  showTrails: boolean;
  onShowTrailsChange: (show: boolean) => void;
  showAdsbTrails: boolean;
  onShowAdsbTrailsChange: (show: boolean) => void;
  trailCount: number;
  adsbTrailCount: number;
  onClearHistory: () => void;
  onClearAdsbTrails: () => void;
}

export function GpsHistorySettings({
  sensorRetentionMinutes,
  clientRetentionMinutes,
  onSensorRetentionChange,
  onClientRetentionChange,
  showTrails,
  onShowTrailsChange,
  showAdsbTrails,
  onShowAdsbTrailsChange,
  trailCount,
  adsbTrailCount,
  onClearHistory,
  onClearAdsbTrails,
}: GpsHistorySettingsProps) {
  const presetOptions = [
    { label: "15m", value: 15 },
    { label: "30m", value: 30 },
    { label: "1h", value: 60 },
    { label: "2h", value: 120 },
    { label: "4h", value: 240 },
  ];

  const anyTrailsOn = showTrails || showAdsbTrails;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-card/90 backdrop-blur border-border/50 hover:bg-card gap-2"
        >
          <Clock className="w-4 h-4" />
          <span className="text-xs">Trails: {anyTrailsOn ? "On" : "Off"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Trail Settings</h4>

          {/* Sensor/Client Trails Toggle */}
          <div className="space-y-2 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">Sensor/Client Trails</span>
              </div>
              <Switch
                id="show-trails"
                checked={showTrails}
                onCheckedChange={onShowTrailsChange}
              />
            </div>

            {showTrails && (
              <>
                {/* Sensor Retention */}
                <div className="space-y-2 mt-3">
                  <Label className="text-xs text-muted-foreground">
                    Sensor Trail Retention
                  </Label>
                  <div className="flex gap-1">
                    {presetOptions.map(opt => (
                      <Button
                        key={`sensor-${opt.value}`}
                        variant={sensorRetentionMinutes === opt.value ? "default" : "outline"}
                        size="sm"
                        className="flex-1 text-xs px-2"
                        onClick={() => onSensorRetentionChange(opt.value)}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Client Retention */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Client Trail Retention
                  </Label>
                  <div className="flex gap-1">
                    {presetOptions.map(opt => (
                      <Button
                        key={`client-${opt.value}`}
                        variant={clientRetentionMinutes === opt.value ? "default" : "outline"}
                        size="sm"
                        className="flex-1 text-xs px-2"
                        onClick={() => onClientRetentionChange(opt.value)}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <span className="text-xs text-muted-foreground">
                    {trailCount} active
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 h-7 text-xs"
                    onClick={onClearHistory}
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* ADS-B Trails Toggle */}
          <div className="space-y-2 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plane className="w-4 h-4 text-cyan-500" />
                <span className="text-sm font-medium">Aircraft Trails</span>
              </div>
              <Switch
                id="show-adsb-trails"
                checked={showAdsbTrails}
                onCheckedChange={onShowAdsbTrailsChange}
              />
            </div>

            {showAdsbTrails && adsbTrailCount > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <span className="text-xs text-muted-foreground">
                  {adsbTrailCount} flight trails
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 h-7 text-xs"
                  onClick={onClearAdsbTrails}
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </Button>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
