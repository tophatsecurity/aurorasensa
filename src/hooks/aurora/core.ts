// Aurora API Core - Base client and utilities
import { supabase } from "@/integrations/supabase/client";
import { auroraRequestQueue } from "./requestQueue";

// Retry configuration with exponential backoff for edge function cold starts
const MAX_RETRIES = 4;
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 16000;

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

// Check if error is retryable (includes edge function cold start errors)
function isRetryableError(error: Error | { code?: string; message?: string }): boolean {
  const message = ('message' in error ? error.message : '').toLowerCase();
  const code = ('code' in error ? error.code : '').toLowerCase();
  
  // Edge function boot errors (cold starts)
  if (code === 'boot_error' || message.includes('boot_error') || message.includes('function failed to start')) {
    return true;
  }
  
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
         message.includes('econnrefused');
}

// Calculate backoff with jitter
function calculateBackoff(attempt: number): number {
  const baseBackoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
  const jitter = Math.random() * 500; // Add 0-500ms jitter
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
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const { data, error } = await supabase.functions.invoke("aurora-proxy", {
          body: { path, method, body, sessionToken },
        });

        if (error) {
          // Check if error message indicates a 500 from Aurora (transient server issue)
          if (error.message?.includes('500') || error.message?.includes('Internal Server Error')) {
            console.warn(`Aurora server error for ${path}, returning empty data`);
            return getEmptyDataForPath(path) as T;
          }
          
          const apiError = new Error(`Aurora API error: ${error.message}`);
          if (isRetryableError(error) && attempt < MAX_RETRIES - 1) {
            const backoffMs = calculateBackoff(attempt);
            console.warn(`Retrying ${path} in ${backoffMs}ms (attempt ${attempt + 1}/${MAX_RETRIES}) - ${error.message}`);
            await sleep(backoffMs);
            lastError = apiError;
            continue;
          }
          console.error(`Aurora API error for ${path}:`, error.message);
          throw apiError;
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

// Retry delay function for react-query with exponential backoff
const retryDelay = (attemptIndex: number) => {
  const baseDelay = 1000 * Math.pow(2, attemptIndex);
  const jitter = Math.random() * 500;
  return Math.min(baseDelay + jitter, 16000);
};

// Default query options - with enhanced retry for cold starts
export const defaultQueryOptions = {
  enabled: true,
  staleTime: 120000, // 2 minutes - data stays fresh longer
  refetchInterval: 180000, // 3 minutes - less frequent refetching
  retry: 4, // More retries for cold starts
  retryDelay,
  refetchOnWindowFocus: false,
};

// Fast polling options (for real-time data)
export const fastQueryOptions = {
  enabled: true,
  staleTime: 60000, // 1 minute
  refetchInterval: 120000, // 2 minutes
  retry: 4,
  retryDelay,
  refetchOnWindowFocus: false,
};

// Slow polling options (for rarely changing data)
export const slowQueryOptions = {
  enabled: true,
  staleTime: 300000, // 5 minutes
  refetchInterval: 600000, // 10 minutes
  retry: 3,
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
