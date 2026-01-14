import { create } from 'zustand';

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
  setState: (state: ConnectionState) => void;
  setRetryProgress: (current: number, max: number) => void;
  setConnected: () => void;
  setWarmingUp: (retryCount: number, maxRetries: number) => void;
  setDegraded: () => void;
  setDisconnected: () => void;
}

export const useConnectionStatus = create<ConnectionStatusStore>((set) => ({
  state: 'checking',
  lastSuccessTime: null,
  retryCount: 0,
  maxRetries: 0,
  setState: (state) => set({ state }),
  setRetryProgress: (current, max) => set({ retryCount: current, maxRetries: max }),
  setConnected: () => set({ 
    state: 'connected', 
    lastSuccessTime: new Date(),
    retryCount: 0,
    maxRetries: 0
  }),
  setWarmingUp: (retryCount, maxRetries) => set({ 
    state: 'warming_up',
    retryCount,
    maxRetries
  }),
  setDegraded: () => set({ state: 'degraded' }),
  setDisconnected: () => set({ state: 'disconnected' }),
}));

// Export a function to update status from the core module
export function updateConnectionState(state: ConnectionState, retryCount?: number, maxRetries?: number) {
  const store = useConnectionStatus.getState();
  store.setState(state);
  if (retryCount !== undefined && maxRetries !== undefined) {
    store.setRetryProgress(retryCount, maxRetries);
  }
}
