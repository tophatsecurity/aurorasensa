import { memo } from "react";
import { Clock, Server } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClients, Client } from "@/hooks/useAuroraApi";
import { useClientContextOptional } from "@/contexts/ClientContext";

// ============================================
// TIME PERIOD SELECTOR
// ============================================

export type TimePeriodOption = "1h" | "6h" | "24h" | "weekly";

interface TimePeriodSelectorProps {
  value?: TimePeriodOption;
  onChange?: (value: TimePeriodOption) => void;
  className?: string;
}

const TIME_PERIOD_OPTIONS: { value: TimePeriodOption; label: string; hours: number }[] = [
  { value: "1h", label: "1h", hours: 1 },
  { value: "6h", label: "6h", hours: 6 },
  { value: "24h", label: "24hr", hours: 24 },
  { value: "weekly", label: "Weekly", hours: 168 },
];

export const timePeriodToHours = (period: TimePeriodOption): number => {
  return TIME_PERIOD_OPTIONS.find(opt => opt.value === period)?.hours ?? 24;
};

export const timePeriodLabel = (period: TimePeriodOption): string => {
  if (period === "weekly") return "7d";
  return period;
};

export const TimePeriodSelector = memo(function TimePeriodSelector({
  value,
  onChange,
  className = "",
}: TimePeriodSelectorProps) {
  // Use context if available, otherwise use props
  const context = useClientContextOptional();
  const effectiveValue = value ?? context?.timePeriod ?? "1h";
  const effectiveOnChange = onChange ?? context?.setTimePeriod;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Clock className="w-4 h-4 text-muted-foreground" />
      <Select value={effectiveValue} onValueChange={effectiveOnChange}>
        <SelectTrigger className="w-[100px] h-8 bg-card/90 backdrop-blur border-border/50 text-xs">
          <SelectValue placeholder="Time" />
        </SelectTrigger>
        <SelectContent className="bg-card border-border z-[2000]">
          {TIME_PERIOD_OPTIONS.map((option) => (
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

// ============================================
// CLIENT SELECTOR
// ============================================

interface ClientSelectorProps {
  value?: string; // client_id or "all"
  onChange?: (value: string) => void;
  className?: string;
  showAllOption?: boolean;
}

export const ClientSelector = memo(function ClientSelector({
  value,
  onChange,
  className = "",
  showAllOption = true,
}: ClientSelectorProps) {
  const { data: clients, isLoading } = useClients();
  
  // Use context if available, otherwise use props
  const context = useClientContextOptional();
  const effectiveValue = value ?? context?.selectedClientId ?? "all";
  const effectiveOnChange = onChange ?? context?.setSelectedClientId;
  
  // Filter out deleted/disabled clients
  const activeClients = clients?.filter((c: Client) => 
    !['deleted', 'disabled', 'suspended'].includes(c.state || '')
  ) || [];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Server className="w-4 h-4 text-muted-foreground" />
      <Select value={effectiveValue} onValueChange={effectiveOnChange} disabled={isLoading}>
        <SelectTrigger className="w-[160px] h-8 bg-card/90 backdrop-blur border-border/50 text-xs">
          <SelectValue placeholder={isLoading ? "Loading..." : "Select Client"} />
        </SelectTrigger>
        <SelectContent className="bg-card border-border z-[2000]">
          {showAllOption && (
            <SelectItem value="all" className="text-xs">
              All Clients
            </SelectItem>
          )}
          {activeClients.map((client: Client) => (
            <SelectItem 
              key={client.client_id} 
              value={client.client_id}
              className="text-xs"
            >
              {client.hostname || client.client_id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
});

// ============================================
// COMBINED CONTEXT FILTERS
// ============================================

interface ContextFiltersProps {
  timePeriod?: TimePeriodOption;
  onTimePeriodChange?: (value: TimePeriodOption) => void;
  clientId?: string;
  onClientChange?: (value: string) => void;
  showClientFilter?: boolean;
  className?: string;
}

export const ContextFilters = memo(function ContextFilters({
  timePeriod,
  onTimePeriodChange,
  clientId,
  onClientChange,
  showClientFilter = true,
  className = "",
}: ContextFiltersProps) {
  // Use context if available, otherwise use props
  const context = useClientContextOptional();
  const effectiveTimePeriod = timePeriod ?? context?.timePeriod ?? "1h";
  const effectiveOnTimePeriodChange = onTimePeriodChange ?? context?.setTimePeriod;
  const effectiveClientId = clientId ?? context?.selectedClientId ?? "all";
  const effectiveOnClientChange = onClientChange ?? context?.setSelectedClientId;

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {showClientFilter && (
        <ClientSelector value={effectiveClientId} onChange={effectiveOnClientChange} />
      )}
      <TimePeriodSelector value={effectiveTimePeriod} onChange={effectiveOnTimePeriodChange} />
    </div>
  );
});
