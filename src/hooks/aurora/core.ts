// Aurora API Core - Base client and utilities
import { supabase } from "@/integrations/supabase/client";
import { auroraRequestQueue } from "./requestQueue";
import { updateConnectionState } from "../useConnectionStatus";

// Enhanced retry configuration for edge function cold starts
const MAX_RETRIES = 8; // More retries for cold starts
const COLD_START_RETRIES = 6; // More quick retries specifically for boot errors
const INITIAL_BACKOFF_MS = 150; // Start very short for cold starts
const COLD_START_BACKOFF_MS = 100; // Even shorter for boot errors
const MAX_BACKOFF_MS = 6000;

// Track connection state globally
let connectionHealthy = false;
let consecutiveBootErrors = 0;

// Helper to check if user has a valid Supabase session
export function hasAuroraSession(): boolean {
  // Check for Supabase session in local storage
  const storageKey = `sb-hewwtgcrupegpcwfujln-auth-token`;
  const stored = localStorage.getItem(storageKey);
  return !!stored;
}

// Helper to get current session token for API calls
async function getSessionToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

// Helper to clear session on auth failure
export function clearAuroraSession(): void {
  // Supabase handles session clearing through signOut
  supabase.auth.signOut();
}

// Sleep helper
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Check if error is a cold-start/boot error
function isBootError(error: Error | { code?: string; message?: string; context?: string }): boolean {
  const message = ('message' in error ? error.message : '').toLowerCase();
  const code = ('code' in error ? error.code : '').toLowerCase();
  const context = ('context' in error ? String(error.context) : '').toLowerCase();
  
  return code === 'boot_error' || 
         message.includes('boot_error') || 
         message.includes('function failed to start') ||
         context.includes('boot_error') ||
         (message.includes('503') && (message.includes('function') || message.includes('edge')));
}

// Check if error is retryable (includes edge function cold start errors)
function isRetryableError(error: Error | { code?: string; message?: string }): boolean {
  const message = ('message' in error ? error.message : '').toLowerCase();
  
  // Boot errors are always retryable
  if (isBootError(error)) return true;
  
  return message.includes('503') || 
         message.includes('504') ||
         message.includes('500') ||
         message.includes('network') ||
         message.includes('timeout') ||
         message.includes('unavailable') ||
         message.includes('retryable') ||
         message.includes('internal server error') ||
         message.includes('sanic') ||
         message.includes('blueprint') ||
         message.includes('already registered') ||
         message.includes('already in use') ||
         message.includes('failed to fetch') ||
         message.includes('econnrefused') ||
         message.includes('econnreset');
}

// Calculate backoff with jitter - shorter for cold starts
function calculateBackoff(attempt: number, isColdStart: boolean = false): number {
  const initialDelay = isColdStart ? COLD_START_BACKOFF_MS : INITIAL_BACKOFF_MS;
  const baseBackoff = initialDelay * Math.pow(1.8, attempt); // Gentler curve
  const jitter = Math.random() * (isColdStart ? 100 : 300); // Less jitter for cold starts
  return Math.min(baseBackoff + jitter, MAX_BACKOFF_MS);
}

interface AuroraProxyResponse {
  error?: string;
}

// Core API call function with retry logic and request queuing
export async function callAuroraApi<T>(
  path: string, 
  method: string = "GET", 
  body?: unknown
): Promise<T> {
  // Get the current Supabase session token
  const sessionToken = await getSessionToken();
  
  // Check cache first for GET requests
  if (method === 'GET') {
    const cached = auroraRequestQueue.getCached<T>(path, method);
    if (cached !== null) {
      return cached;
    }
  }
  
  // Log if no session for debugging (but allow public endpoints)
  const isPublicEndpoint = path === '/api/health' || path === '/health' || path.startsWith('/api/auth/');
  if (!sessionToken && !isPublicEndpoint) {
    console.warn(`No session token for protected endpoint: ${path}`);
  }
  
  const executor = async (): Promise<T> => {
    let lastError: Error | null = null;
    let coldStartRetries = 0;
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const { data, error } = await supabase.functions.invoke("aurora-proxy", {
          body: { path, method, body, sessionToken },
        });

        if (error) {
          const errorMessage = error.message?.toLowerCase() || '';
          const errorContext = (error as any).context?.toLowerCase?.() || '';
          const fullError = `${error.message} ${errorContext}`;
          
          // Check for BOOT_ERROR specifically (cold start failures)
          const isColdStartError = isBootError(error);
          
          if (isColdStartError) {
            coldStartRetries++;
            consecutiveBootErrors++;
            
            // Update global connection state to warming up
            updateConnectionState('warming_up', coldStartRetries, COLD_START_RETRIES);
            
            if (coldStartRetries <= COLD_START_RETRIES) {
              // Use shorter backoff for cold starts - function just needs time to boot
              const backoffMs = calculateBackoff(coldStartRetries - 1, true);
              console.log(`⏳ Edge function warming up for ${path}, retry ${coldStartRetries}/${COLD_START_RETRIES} in ${backoffMs}ms`);
              await sleep(backoffMs);
              lastError = new Error(`Boot error: ${fullError}`);
              continue;
            }
            
            // If we've exhausted boot retries, return empty data gracefully instead of throwing
            console.warn(`⚠️ Edge function failed to boot after ${COLD_START_RETRIES} retries for ${path}, returning empty data`);
            updateConnectionState('degraded');
            return getEmptyDataForPath(path) as T;
          }
          
          // Reset boot error counter on non-boot errors
          consecutiveBootErrors = 0;
          
          // Check if error message indicates a 500/503 from edge function or Aurora
          if (errorMessage.includes('500') || errorMessage.includes('503') || 
              errorMessage.includes('internal server error') || errorMessage.includes('boot_error')) {
            console.warn(`Server error for ${path}, returning empty data`);
            return getEmptyDataForPath(path) as T;
          }
          
          const apiError = new Error(`Aurora API error: ${error.message}`);
          if (isRetryableError(error) && attempt < MAX_RETRIES - 1) {
            const backoffMs = calculateBackoff(attempt, false);
            console.warn(`Retrying ${path} in ${backoffMs}ms (attempt ${attempt + 1}/${MAX_RETRIES}) - ${error.message}`);
            await sleep(backoffMs);
            lastError = apiError;
            continue;
          }
          
          // For final failure, return empty data instead of throwing to prevent UI crashes
          console.error(`Aurora API error for ${path} after retries:`, error.message);
          return getEmptyDataForPath(path) as T;
        }

        if (data && typeof data === 'object' && 'detail' in data) {
          const detailStr = String(data.detail);
          const detailLower = detailStr.toLowerCase();
          
          // Check for transient Aurora backend errors - return empty data instead of throwing
          const isTransientServerError = 
            detailLower.includes('sanic') ||
            detailLower.includes('blueprint') ||
            detailLower.includes('already registered') ||
            detailLower.includes('already in use') ||
            detailLower.includes('duplicate exception') ||
            detailLower.includes('internal server error');
          
          if (isTransientServerError) {
            console.warn(`Transient Aurora server error for ${path}: ${detailStr}, returning empty data`);
            return getEmptyDataForPath(path) as T;
          }
          
          const isAuthError = detailLower.includes('not authenticated') || 
                             detailLower.includes('invalid session') ||
                             detailLower.includes('provide x-api-key') ||
                             detailLower.includes('aurora api authentication');
          
          if (isAuthError) {
            // Aurora 401 errors mean the Aurora API needs auth, but our Supabase session is still valid
            // Return empty data instead of clearing the session
            console.warn(`Aurora API auth error for ${path}: ${detailStr}, returning empty data`);
            return getEmptyDataForPath(path) as T;
          }
          
          const isNotFoundError = detailLower.includes('not found') || 
                                  detailLower.includes('no ') && detailLower.includes('found');
          if (!isNotFoundError) {
            console.error(`Aurora backend error for ${path}:`, data.detail);
          }
          const error = new Error(detailStr);
          (error as any).status = isNotFoundError ? 404 : 400;
          throw error;
        }

        if ((data as AuroraProxyResponse)?.error) {
          // Handle retryable errors gracefully - return empty data instead of throwing
          if ((data as any).retryable) {
            console.warn(`Retryable error for ${path}: ${(data as AuroraProxyResponse).error}, returning empty data`);
            return getEmptyDataForPath(path) as T;
          }
          // Handle server errors gracefully - return empty data to prevent blank screens
          if ((data as any).error?.includes('temporarily unavailable') || 
              (data as any).error?.includes('timeout') ||
              (data as any).error?.includes('Internal Server Error')) {
            console.warn(`Server error for ${path}, returning empty data`);
            return getEmptyDataForPath(path) as T;
          }
          console.error(`Aurora API response error for ${path}:`, (data as AuroraProxyResponse).error);
          throw new Error((data as AuroraProxyResponse).error);
        }

        // Cache successful GET responses
        if (method === 'GET') {
          auroraRequestQueue.setCache(path, method, data);
        }

        // Mark connection as healthy on success and reset boot error counter
        consecutiveBootErrors = 0;
        if (!connectionHealthy) {
          connectionHealthy = true;
          updateConnectionState('connected');
        }

        return data as T;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        
        // If it's a timeout error, return empty data instead of throwing
        if (error.message.includes('timeout')) {
          console.warn(`Timeout for ${path}, returning empty data`);
          return getEmptyDataForPath(path) as T;
        }
        
        if (isRetryableError(error) && attempt < MAX_RETRIES - 1) {
          const backoffMs = calculateBackoff(attempt);
          console.warn(`Retrying ${path} in ${backoffMs}ms (attempt ${attempt + 1}/${MAX_RETRIES}) - ${error.message}`);
          await sleep(backoffMs);
          lastError = error;
          continue;
        }
        
        // Return empty data instead of throwing to prevent UI crashes
        console.error(`Failed request for ${path}:`, error.message);
        return getEmptyDataForPath(path) as T;
      }
    }
    
    // Return empty data instead of throwing after all retries exhausted
    console.warn(`All ${MAX_RETRIES} retries exhausted for ${path}, returning empty data`);
    return getEmptyDataForPath(path) as T;
  };
  
  // Use request queue to limit concurrent requests
  return auroraRequestQueue.enqueue(path, method, body, executor);
}

// Helper to return appropriate empty data based on endpoint path
function getEmptyDataForPath(path: string): unknown {
  if (path.includes('/list') || path.includes('/vessels') || path.includes('/stations') || 
      path.includes('/beacons') || path.includes('/aircraft') || path.includes('/devices') ||
      path.includes('/active') || path.includes('/readings') || path.includes('/rules') ||
      path.includes('/profiles') || path.includes('/violations') || path.includes('/baselines') ||
      path.includes('/clients') || path.includes('/sensors') || path.includes('/alerts')) {
    return [];
  }
  if (path.includes('/stats') || path.includes('/statistics') || path.includes('/overview')) {
    return {};
  }
  return null;
}

// Retry delay function for react-query with exponential backoff
// Uses shorter delays for initial retries (likely cold starts)
const retryDelay = (attemptIndex: number) => {
  // First 2 retries are quick (cold start recovery)
  if (attemptIndex < 2) {
    return 200 + Math.random() * 100;
  }
  // Then exponential backoff
  const baseDelay = 500 * Math.pow(1.8, attemptIndex - 2);
  const jitter = Math.random() * 300;
  return Math.min(baseDelay + jitter, 10000);
};

// Default query options - with enhanced retry for cold starts
export const defaultQueryOptions = {
  enabled: true,
  staleTime: 120000, // 2 minutes - data stays fresh longer
  refetchInterval: 180000, // 3 minutes - less frequent refetching
  retry: 8, // More retries for cold starts
  retryDelay,
  refetchOnWindowFocus: false,
  throwOnError: false, // Don't throw errors - we handle them gracefully
};

// Fast polling options (for real-time data)
export const fastQueryOptions = {
  enabled: true,
  staleTime: 60000, // 1 minute
  refetchInterval: 120000, // 2 minutes
  retry: 6,
  retryDelay,
  refetchOnWindowFocus: false,
  throwOnError: false,
};

// Slow polling options (for rarely changing data)
export const slowQueryOptions = {
  enabled: true,
  staleTime: 300000, // 5 minutes
  refetchInterval: 600000, // 10 minutes
  retry: 4,
  retryDelay,
  refetchOnWindowFocus: false,
  throwOnError: false,
};

// Export cache invalidation for manual cache clearing
export function invalidateAuroraCache(pathPattern?: string): void {
  auroraRequestQueue.invalidateCache(pathPattern);
}

// Export queue stats for debugging
export function getAuroraQueueStats() {
  return auroraRequestQueue.getStats();
}
