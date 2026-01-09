import { memo, useCallback } from "react";
import { RefreshCw, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export type AutoRefreshInterval = 'manual' | '1m' | '5m' | '10m' | '30m' | '1h' | '6h' | '24h';

interface AutoRefreshOption {
  value: AutoRefreshInterval;
  label: string;
  ms: number | null;
}

export const AUTO_REFRESH_OPTIONS: AutoRefreshOption[] = [
  { value: 'manual', label: 'Manual', ms: null },
  { value: '1m', label: '1 minute', ms: 60_000 },
  { value: '5m', label: '5 minutes', ms: 300_000 },
  { value: '10m', label: '10 minutes', ms: 600_000 },
  { value: '30m', label: '30 minutes', ms: 1_800_000 },
  { value: '1h', label: '1 hour', ms: 3_600_000 },
  { value: '6h', label: '6 hours', ms: 21_600_000 },
  { value: '24h', label: '24 hours', ms: 86_400_000 },
];

export const getRefreshIntervalMs = (interval: AutoRefreshInterval): number | null => {
  const option = AUTO_REFRESH_OPTIONS.find(opt => opt.value === interval);
  return option?.ms ?? null;
};

export const getRefreshLabel = (interval: AutoRefreshInterval): string => {
  const option = AUTO_REFRESH_OPTIONS.find(opt => opt.value === interval);
  return option?.label ?? 'Manual';
};

interface AutoRefreshSelectorProps {
  value: AutoRefreshInterval;
  onChange: (value: AutoRefreshInterval) => void;
  isRefreshing?: boolean;
  onManualRefresh?: () => void;
}

export const AutoRefreshSelector = memo(function AutoRefreshSelector({
  value,
  onChange,
  isRefreshing,
  onManualRefresh,
}: AutoRefreshSelectorProps) {
  const handleSelect = useCallback((newValue: AutoRefreshInterval) => {
    onChange(newValue);
  }, [onChange]);

  const isAutoRefresh = value !== 'manual';

  return (
    <div className="flex items-center gap-1">
      {value === 'manual' && onManualRefresh && (
        <Button
          variant="outline"
          size="icon"
          className="bg-card/90 backdrop-blur border-border/50 hover:bg-card h-9 w-9"
          onClick={onManualRefresh}
          disabled={isRefreshing}
          title="Refresh now"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={isAutoRefresh ? "default" : "outline"}
            size="sm"
            className={`gap-1.5 ${
              isAutoRefresh 
                ? "bg-primary hover:bg-primary/90" 
                : "bg-card/90 backdrop-blur border-border/50 hover:bg-card"
            }`}
          >
            {isAutoRefresh && (
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            )}
            <span className="text-xs font-medium">
              {isAutoRefresh ? getRefreshLabel(value) : 'Auto Refresh'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-40 bg-card border-border z-[1100]"
        >
          {AUTO_REFRESH_OPTIONS.map((option, index) => (
            <div key={option.value}>
              {index === 1 && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={() => handleSelect(option.value)}
                className={`cursor-pointer ${value === option.value ? 'bg-primary/20 text-primary' : ''}`}
              >
                <div className="flex items-center justify-between w-full">
                  <span>{option.label}</span>
                  {value === option.value && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </div>
              </DropdownMenuItem>
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});
