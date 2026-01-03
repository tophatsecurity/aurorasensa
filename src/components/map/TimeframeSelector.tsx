import { memo } from "react";
import { Clock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type TimeframeOption = "5m" | "15m" | "30m" | "1h" | "2h" | "4h" | "24h";

interface TimeframeSelectorProps {
  value: TimeframeOption;
  onChange: (value: TimeframeOption) => void;
}

const TIMEFRAME_OPTIONS: { value: TimeframeOption; label: string; minutes: number }[] = [
  { value: "5m", label: "5 minutes", minutes: 5 },
  { value: "15m", label: "15 minutes", minutes: 15 },
  { value: "30m", label: "30 minutes", minutes: 30 },
  { value: "1h", label: "1 hour", minutes: 60 },
  { value: "2h", label: "2 hours", minutes: 120 },
  { value: "4h", label: "4 hours", minutes: 240 },
  { value: "24h", label: "24 hours", minutes: 1440 },
];

export const timeframeToMinutes = (timeframe: TimeframeOption): number => {
  return TIMEFRAME_OPTIONS.find(opt => opt.value === timeframe)?.minutes ?? 60;
};

export const TimeframeSelector = memo(function TimeframeSelector({
  value,
  onChange,
}: TimeframeSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <Clock className="w-4 h-4 text-muted-foreground" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[120px] h-8 bg-card/90 backdrop-blur border-border/50 text-xs">
          <SelectValue placeholder="Timeframe" />
        </SelectTrigger>
        <SelectContent className="bg-card border-border z-[2000]">
          {TIMEFRAME_OPTIONS.map((option) => (
            <SelectItem 
              key={option.value} 
              value={option.value}
              className="text-xs"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
});
