import { Settings2, Clock, Trash2 } from "lucide-react";
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
  retentionMinutes: number;
  onRetentionChange: (minutes: number) => void;
  showTrails: boolean;
  onShowTrailsChange: (show: boolean) => void;
  trailCount: number;
  onClearHistory: () => void;
}

export function GpsHistorySettings({
  retentionMinutes,
  onRetentionChange,
  showTrails,
  onShowTrailsChange,
  trailCount,
  onClearHistory,
}: GpsHistorySettingsProps) {
  const presetOptions = [
    { label: "15m", value: 15 },
    { label: "30m", value: 30 },
    { label: "1h", value: 60 },
    { label: "2h", value: 120 },
    { label: "4h", value: 240 },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-card/90 backdrop-blur border-border/50 hover:bg-card gap-2"
        >
          <Clock className="w-4 h-4" />
          <span className="text-xs">Trails: {showTrails ? `${retentionMinutes}m` : "Off"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">GPS History Trails</h4>
            <div className="flex items-center gap-2">
              <Label htmlFor="show-trails" className="text-xs text-muted-foreground">
                Show
              </Label>
              <Switch
                id="show-trails"
                checked={showTrails}
                onCheckedChange={onShowTrailsChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Retention Period
            </Label>
            <div className="flex gap-1">
              {presetOptions.map(opt => (
                <Button
                  key={opt.value}
                  variant={retentionMinutes === opt.value ? "default" : "outline"}
                  size="sm"
                  className="flex-1 text-xs px-2"
                  onClick={() => onRetentionChange(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-retention" className="text-xs text-muted-foreground">
              Custom (minutes)
            </Label>
            <Input
              id="custom-retention"
              type="number"
              min={1}
              max={1440}
              value={retentionMinutes}
              onChange={(e) => onRetentionChange(Math.max(1, Math.min(1440, parseInt(e.target.value) || 60)))}
              className="h-8"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <span className="text-xs text-muted-foreground">
              {trailCount} active trails
            </span>
            <Button
              variant="destructive"
              size="sm"
              className="gap-1"
              onClick={onClearHistory}
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
