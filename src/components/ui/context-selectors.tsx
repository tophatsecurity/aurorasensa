import { memo } from "react";
import { Clock, Server } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClientsWithHostnames, Client } from "@/hooks/aurora";
import { useClientContextOptional } from "@/contexts/ClientContext";

// ============================================
// CENTRALIZED DROPDOWN STYLING
// ============================================

// Shared styling constants for consistent dropdown appearance
const DROPDOWN_TRIGGER_STYLES = "h-9 bg-card border-border text-sm font-medium shadow-sm hover:bg-accent/50 transition-colors";
const DROPDOWN_CONTENT_STYLES = "bg-card border-border shadow-xl";
const DROPDOWN_ITEM_STYLES = "text-sm cursor-pointer";

// ============================================
// TIME PERIOD SELECTOR
// ============================================

export type TimePeriodOption = "1h" | "6h" | "12h" | "24h" | "weekly";

interface TimePeriodSelectorProps {
  value?: TimePeriodOption;
  onChange?: (value: TimePeriodOption) => void;
  className?: string;
  compact?: boolean;
}

const TIME_PERIOD_OPTIONS: { value: TimePeriodOption; label: string; hours: number }[] = [
  { value: "1h", label: "1 Hour", hours: 1 },
  { value: "6h", label: "6 Hours", hours: 6 },
  { value: "12h", label: "12 Hours", hours: 12 },
  { value: "24h", label: "24 Hours", hours: 24 },
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
  compact = false,
}: TimePeriodSelectorProps) {
  // Use context if available, otherwise use props
  const context = useClientContextOptional();
  const effectiveValue = value ?? context?.timePeriod ?? "1h";
  const effectiveOnChange = onChange ?? context?.setTimePeriod;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {!compact && <Clock className="w-4 h-4 text-muted-foreground" />}
      <Select value={effectiveValue} onValueChange={effectiveOnChange}>
        <SelectTrigger className={`${compact ? 'w-[90px]' : 'w-[120px]'} ${DROPDOWN_TRIGGER_STYLES}`}>
          <SelectValue placeholder="Time Period" />
        </SelectTrigger>
        <SelectContent className={DROPDOWN_CONTENT_STYLES}>
          {TIME_PERIOD_OPTIONS.map((option) => (
            <SelectItem 
              key={option.value} 
              value={option.value}
              className={DROPDOWN_ITEM_STYLES}
            >
              {compact ? option.value : option.label}
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
  compact?: boolean;
}

// Helper to get a meaningful display name for a client
const getClientDisplayName = (client: Client, index: number): string => {
  // Use hostname if available and not empty/unknown
  if (client.hostname && client.hostname !== 'unknown' && client.hostname.trim() !== '') {
    return client.hostname;
  }
  // Use client_id if it's meaningful (not just "unknown")
  if (client.client_id && client.client_id !== 'unknown' && client.client_id.trim() !== '') {
    // If it looks like a UUID or hash, show a truncated version
    if (client.client_id.length > 20) {
      return `Client ${client.client_id.slice(0, 8)}...`;
    }
    return client.client_id;
  }
  // Fallback to indexed name
  return `Client ${index + 1}`;
};

export const ClientSelector = memo(function ClientSelector({
  value,
  onChange,
  className = "",
  showAllOption = true,
  compact = false,
}: ClientSelectorProps) {
  const { data: clients, isLoading } = useClientsWithHostnames();
  
  // Use context if available, otherwise use props
  const context = useClientContextOptional();
  const effectiveValue = value ?? context?.selectedClientId ?? "all";
  const effectiveOnChange = onChange ?? context?.setSelectedClientId;
  
  // Filter out deleted/disabled clients and clients with null/undefined client_id
  const activeClients = clients?.filter((c: Client) => 
    c && c.client_id && !['deleted', 'disabled', 'suspended'].includes(c.state || '')
  ) || [];

  // Get display label for current selection
  const getSelectedLabel = () => {
    if (isLoading) return "Loading...";
    if (effectiveValue === "all") return "All Clients";
    const selectedClient = activeClients.find(c => c.client_id === effectiveValue);
    if (selectedClient) {
      const name = getClientDisplayName(selectedClient, activeClients.indexOf(selectedClient));
      return compact && name.length > 12 ? `${name.slice(0, 12)}...` : name;
    }
    return "Select Client";
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {!compact && <Server className="w-4 h-4 text-muted-foreground" />}
      <Select value={effectiveValue} onValueChange={effectiveOnChange} disabled={isLoading}>
        <SelectTrigger className={`${compact ? 'w-[140px]' : 'w-[180px]'} ${DROPDOWN_TRIGGER_STYLES}`}>
          <SelectValue placeholder={getSelectedLabel()}>
            {getSelectedLabel()}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className={DROPDOWN_CONTENT_STYLES}>
          {showAllOption && (
            <SelectItem value="all" className={DROPDOWN_ITEM_STYLES}>
              All Clients
            </SelectItem>
          )}
          {activeClients.map((client: Client, index: number) => (
            <SelectItem 
              key={client.client_id} 
              value={client.client_id}
              className={DROPDOWN_ITEM_STYLES}
            >
              {getClientDisplayName(client, index)}
            </SelectItem>
          ))}
          {activeClients.length === 0 && !isLoading && (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              No clients available
            </div>
          )}
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
  showAllOption?: boolean;
  compact?: boolean;
  className?: string;
}

export const ContextFilters = memo(function ContextFilters({
  timePeriod,
  onTimePeriodChange,
  clientId,
  onClientChange,
  showClientFilter = true,
  showAllOption = true,
  compact = false,
  className = "",
}: ContextFiltersProps) {
  // Use context if available, otherwise use props
  const context = useClientContextOptional();
  const effectiveTimePeriod = timePeriod ?? context?.timePeriod ?? "1h";
  const effectiveOnTimePeriodChange = onTimePeriodChange ?? context?.setTimePeriod;
  const effectiveClientId = clientId ?? context?.selectedClientId ?? "all";
  const effectiveOnClientChange = onClientChange ?? context?.setSelectedClientId;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {showClientFilter && (
        <ClientSelector 
          value={effectiveClientId} 
          onChange={effectiveOnClientChange} 
          showAllOption={showAllOption}
          compact={compact}
        />
      )}
      <TimePeriodSelector 
        value={effectiveTimePeriod} 
        onChange={effectiveOnTimePeriodChange}
        compact={compact}
      />
    </div>
  );
});

// ============================================
// EXPORT STYLING CONSTANTS FOR REUSE
// ============================================

export { DROPDOWN_TRIGGER_STYLES, DROPDOWN_CONTENT_STYLES, DROPDOWN_ITEM_STYLES };
