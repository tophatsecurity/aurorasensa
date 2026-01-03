import { memo } from "react";
import { History } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AdsbHistorySelectorProps {
  value: number;
  onChange: (value: number) => void;
}

const TIME_OPTIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
];

export const AdsbHistorySelector = memo(function AdsbHistorySelector({
  value,
  onChange,
}: AdsbHistorySelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <History className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">ADS-B History:</span>
      <Select
        value={value.toString()}
        onValueChange={(val) => onChange(parseInt(val, 10))}
      >
        <SelectTrigger className="w-[110px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TIME_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value.toString()}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
});
