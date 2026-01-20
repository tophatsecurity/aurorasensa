import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";
import { TimePeriodOption } from "@/components/ui/context-selectors";

// =============================================
// CLIENT CONTEXT TYPES
// =============================================

interface ClientContextValue {
  // Selected client ID - "all" means all clients
  selectedClientId: string;
  setSelectedClientId: (clientId: string) => void;
  
  // Time period for data filtering
  timePeriod: TimePeriodOption;
  setTimePeriod: (period: TimePeriodOption) => void;
  
  // Convenience helpers
  isAllClients: boolean;
  periodHours: number;
}

const ClientContext = createContext<ClientContextValue | null>(null);

// =============================================
// HELPER FUNCTIONS
// =============================================

export function timePeriodToHours(period: TimePeriodOption): number {
  switch (period) {
    case "1h": return 1;
    case "6h": return 6;
    case "12h": return 12;
    case "24h": return 24;
    case "weekly": return 168;
    default: return 24;
  }
}

// =============================================
// PROVIDER COMPONENT
// =============================================

interface ClientProviderProps {
  children: ReactNode;
  defaultClientId?: string;
  defaultTimePeriod?: TimePeriodOption;
}

export function ClientProvider({ 
  children, 
  defaultClientId = "all",
  defaultTimePeriod = "1h" 
}: ClientProviderProps) {
  const [selectedClientId, setSelectedClientId] = useState<string>(defaultClientId);
  const [timePeriod, setTimePeriod] = useState<TimePeriodOption>(defaultTimePeriod);

  const handleSetClientId = useCallback((clientId: string) => {
    setSelectedClientId(clientId);
  }, []);

  const handleSetTimePeriod = useCallback((period: TimePeriodOption) => {
    setTimePeriod(period);
  }, []);

  const value = useMemo<ClientContextValue>(() => ({
    selectedClientId,
    setSelectedClientId: handleSetClientId,
    timePeriod,
    setTimePeriod: handleSetTimePeriod,
    isAllClients: selectedClientId === "all",
    periodHours: timePeriodToHours(timePeriod),
  }), [selectedClientId, handleSetClientId, timePeriod, handleSetTimePeriod]);

  return (
    <ClientContext.Provider value={value}>
      {children}
    </ClientContext.Provider>
  );
}

// =============================================
// HOOK
// =============================================

export function useClientContext(): ClientContextValue {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error("useClientContext must be used within a ClientProvider");
  }
  return context;
}

// Optional hook that returns null if not in a provider (for backward compatibility)
export function useClientContextOptional(): ClientContextValue | null {
  return useContext(ClientContext);
}
