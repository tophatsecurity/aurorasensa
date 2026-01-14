import { create } from 'zustand';
import { toast } from "@/hooks/use-toast";

export type ConnectionState = 
  | 'connected'      // Server is healthy and responding
  | 'warming_up'     // Edge function is in cold start, retrying
  | 'degraded'       // Server has issues but partially working
  | 'disconnected'   // Cannot reach server
  | 'checking';      // Initial check in progress

interface ConnectionStatusStore {
  state: ConnectionState;
  lastSuccessTime: Date | null;
  retryCount: number;
  maxRetries: number;
  hasShownWarmupToast: boolean;
  warmupToastId: string | null;
  setState: (state: ConnectionState) => void;
  setRetryProgress: (current: number, max: number) => void;
  setConnected: () => void;
  setWarmingUp: (retryCount: number, maxRetries: number) => void;
  setDegraded: () => void;
  setDisconnected: () => void;
  resetToastState: () => void;
}

// Track last toast time to prevent spam
let lastWarmupToastTime = 0;
const TOAST_COOLDOWN_MS = 10000; // 10 seconds between warmup toasts

export const useConnectionStatus = create<ConnectionStatusStore>((set, get) => ({
  state: 'checking',
  lastSuccessTime: null,
  retryCount: 0,
  maxRetries: 0,
  hasShownWarmupToast: false,
  warmupToastId: null,
  setState: (state) => set({ state }),
  setRetryProgress: (current, max) => set({ retryCount: current, maxRetries: max }),
  setConnected: () => {
    const currentState = get();
    // Show success toast if we were warming up
    if (currentState.state === 'warming_up' && currentState.hasShownWarmupToast) {
      toast({
        title: "✓ Connected",
        description: "Backend is ready and responding.",
        duration: 3000,
      });
    }
    set({ 
      state: 'connected', 
      lastSuccessTime: new Date(),
      retryCount: 0,
      maxRetries: 0,
      hasShownWarmupToast: false,
      warmupToastId: null
    });
  },
  setWarmingUp: (retryCount, maxRetries) => {
    const now = Date.now();
    const currentState = get();
    
    // Only show toast on first warmup or after cooldown
    if (!currentState.hasShownWarmupToast && now - lastWarmupToastTime > TOAST_COOLDOWN_MS) {
      lastWarmupToastTime = now;
      toast({
        title: "⏳ Warming up...",
        description: `Backend is starting up. This may take a few seconds (${retryCount}/${maxRetries})`,
        duration: 5000,
      });
      set({ 
        state: 'warming_up',
        retryCount,
        maxRetries,
        hasShownWarmupToast: true
      });
    } else {
      set({ 
        state: 'warming_up',
        retryCount,
        maxRetries
      });
    }
  },
  setDegraded: () => {
    const currentState = get();
    if (currentState.state !== 'degraded') {
      toast({
        title: "⚠️ Limited Connectivity",
        description: "Some data may be temporarily unavailable. We'll keep trying.",
        variant: "destructive",
        duration: 5000,
      });
    }
    set({ state: 'degraded' });
  },
  setDisconnected: () => {
    const currentState = get();
    if (currentState.state !== 'disconnected') {
      toast({
        title: "❌ Connection Lost",
        description: "Unable to reach the backend. Please check your connection.",
        variant: "destructive",
        duration: 8000,
      });
    }
    set({ state: 'disconnected' });
  },
  resetToastState: () => set({ hasShownWarmupToast: false, warmupToastId: null }),
}));

// Export a function to update status from the core module
export function updateConnectionState(state: ConnectionState, retryCount?: number, maxRetries?: number) {
  const store = useConnectionStatus.getState();
  
  switch (state) {
    case 'connected':
      store.setConnected();
      break;
    case 'warming_up':
      if (retryCount !== undefined && maxRetries !== undefined) {
        store.setWarmingUp(retryCount, maxRetries);
      } else {
        store.setState(state);
      }
      break;
    case 'degraded':
      store.setDegraded();
      break;
    case 'disconnected':
      store.setDisconnected();
      break;
    default:
      store.setState(state);
  }
}
