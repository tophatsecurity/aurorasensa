// Aurora API Core - Base client and utilities
import { supabase } from "@/integrations/supabase/client";
import { auroraRequestQueue } from "./requestQueue";

// Session keys
const SESSION_KEY = 'aurora_session';
const SESSION_COOKIE_KEY = 'aurora_cookie';

// Retry configuration - reduced for slow server
const MAX_RETRIES = 2;
const INITIAL_BACKOFF_MS = 2000;

// Helper to check if user has a session
export function hasAuroraSession(): boolean {
  return !!sessionStorage.getItem(SESSION_COOKIE_KEY);
}

// Helper to clear session on auth failure
export function clearAuroraSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_COOKIE_KEY);
}

// Sleep helper
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Check if error is retryable
function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return message.includes('503') || 
         message.includes('504') ||
         message.includes('boot_error') || 
         message.includes('function failed to start') ||
         message.includes('network') ||
         message.includes('timeout') ||
         message.includes('unavailable') ||
         message.includes('retryable');
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
  const sessionCookie = sessionStorage.getItem(SESSION_COOKIE_KEY);
  
  // Check cache first for GET requests
  if (method === 'GET') {
    const cached = auroraRequestQueue.getCached<T>(path, method);
    if (cached !== null) {
      return cached;
    }
  }
  
  // Log if no session for debugging
  if (!sessionCookie && !path.startsWith('/api/auth/')) {
    console.warn(`No session cookie for protected endpoint: ${path}`);
  }
  
  const executor = async (): Promise<T> => {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const { data, error } = await supabase.functions.invoke("aurora-proxy", {
          body: { path, method, body, sessionCookie },
        });

        if (error) {
          // Check if error message indicates a 500 from Aurora (transient server issue)
          if (error.message?.includes('500') || error.message?.includes('Internal Server Error')) {
            console.warn(`Aurora server error for ${path}, returning empty data`);
            return getEmptyDataForPath(path) as T;
          }
          
          const apiError = new Error(`Aurora API error: ${error.message}`);
          if (isRetryableError(apiError) && attempt < MAX_RETRIES - 1) {
            const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
            console.warn(`Retrying ${path} in ${backoffMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
            await sleep(backoffMs);
            lastError = apiError;
            continue;
          }
          console.error(`Aurora API error for ${path}:`, error.message);
          throw apiError;
        }

        if (data && typeof data === 'object' && 'detail' in data) {
          const detailStr = String(data.detail);
          
          const isAuthError = detailStr.toLowerCase().includes('not authenticated') || 
                             detailStr.toLowerCase().includes('invalid session') ||
                             detailStr.toLowerCase().includes('provide x-api-key');
          
          if (isAuthError) {
            const isAuthEndpoint = path.startsWith('/api/auth/');
            if (isAuthEndpoint) {
              console.log('Auth endpoint returned 401, clearing session');
              clearAuroraSession();
            } else {
              console.warn(`Endpoint ${path} returned auth error, but session may still be valid`);
            }
            
            const error = new Error(isAuthEndpoint ? 'Session expired. Please log in again.' : detailStr);
            (error as any).status = 401;
            throw error;
          }
          
          const isNotFoundError = detailStr.toLowerCase().includes('not found') || 
                                  detailStr.toLowerCase().includes('no ') && detailStr.toLowerCase().includes('found');
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

        return data as T;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        
        // If it's a timeout error, return empty data instead of throwing
        if (error.message.includes('timeout')) {
          console.warn(`Timeout for ${path}, returning empty data`);
          return getEmptyDataForPath(path) as T;
        }
        
        if (isRetryableError(error) && attempt < MAX_RETRIES - 1) {
          const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
          console.warn(`Retrying ${path} in ${backoffMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await sleep(backoffMs);
          lastError = error;
          continue;
        }
        throw error;
      }
    }
    
    throw lastError || new Error(`Failed after ${MAX_RETRIES} retries`);
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

// Retry delay function for react-query
const retryDelay = (attemptIndex: number) => Math.min(2000 * 2 ** attemptIndex, 60000);

// Default query options - increased stale times for slow server
export const defaultQueryOptions = {
  enabled: true,
  staleTime: 120000, // 2 minutes - data stays fresh longer
  refetchInterval: 180000, // 3 minutes - less frequent refetching
  retry: 2,
  retryDelay,
  refetchOnWindowFocus: false,
};

// Fast polling options (for real-time data) - still reduced for slow server
export const fastQueryOptions = {
  enabled: true,
  staleTime: 60000, // 1 minute
  refetchInterval: 120000, // 2 minutes
  retry: 2,
  retryDelay,
  refetchOnWindowFocus: false,
};

// Slow polling options (for rarely changing data)
export const slowQueryOptions = {
  enabled: true,
  staleTime: 300000, // 5 minutes
  refetchInterval: 600000, // 10 minutes
  retry: 1,
  retryDelay,
  refetchOnWindowFocus: false,
};

// Export cache invalidation for manual cache clearing
export function invalidateAuroraCache(pathPattern?: string): void {
  auroraRequestQueue.invalidateCache(pathPattern);
}

// Export queue stats for debugging
export function getAuroraQueueStats() {
  return auroraRequestQueue.getStats();
}
