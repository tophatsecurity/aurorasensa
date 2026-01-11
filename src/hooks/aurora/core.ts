// Aurora API Core - Base client and utilities
import { supabase } from "@/integrations/supabase/client";

// Session keys
const SESSION_KEY = 'aurora_session';
const SESSION_COOKIE_KEY = 'aurora_cookie';

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

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

// Core API call function with retry logic
export async function callAuroraApi<T>(
  path: string, 
  method: string = "GET", 
  body?: unknown
): Promise<T> {
  const sessionCookie = sessionStorage.getItem(SESSION_COOKIE_KEY);
  
  // Log if no session for debugging
  if (!sessionCookie && !path.startsWith('/api/auth/')) {
    console.warn(`No session cookie for protected endpoint: ${path}`);
  }
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke("aurora-proxy", {
        body: { path, method, body, sessionCookie },
      });

      if (error) {
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
        console.error(`Aurora API response error for ${path}:`, (data as AuroraProxyResponse).error);
        throw new Error((data as AuroraProxyResponse).error);
      }

      return data as T;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
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
}

// Retry delay function for react-query
const retryDelay = (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000);

// Default query options with better error handling
export const defaultQueryOptions = {
  enabled: true,
  staleTime: 60000,
  refetchInterval: 120000,
  retry: 3,
  retryDelay,
  refetchOnWindowFocus: false,
};

// Fast polling options (for real-time data)
export const fastQueryOptions = {
  enabled: true,
  staleTime: 30000,
  refetchInterval: 60000,
  retry: 3,
  retryDelay,
  refetchOnWindowFocus: false,
};

// Slow polling options (for rarely changing data)
export const slowQueryOptions = {
  enabled: true,
  staleTime: 120000,
  refetchInterval: 300000,
  retry: 3,
  retryDelay,
  refetchOnWindowFocus: false,
};
