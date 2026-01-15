// Aurora API Core - Base client and utilities
import { supabase } from "@/integrations/supabase/client";
import { auroraRequestQueue } from "./requestQueue";
import { updateConnectionState } from "../useConnectionStatus";
import { withQuery } from "./endpoints";

// Enhanced retry configuration for edge function cold starts
const MAX_RETRIES = 8;
const COLD_START_RETRIES = 6;
const INITIAL_BACKOFF_MS = 150;
const COLD_START_BACKOFF_MS = 100;
const MAX_BACKOFF_MS = 6000;

// Track connection state globally
let connectionHealthy = false;
let consecutiveBootErrors = 0;

// =============================================
// SESSION HELPERS
// =============================================

export function hasAuroraSession(): boolean {
  const storageKey = `sb-hewwtgcrupegpcwfujln-auth-token`;
  const stored = localStorage.getItem(storageKey);
  return !!stored;
}

async function getSessionToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export function clearAuroraSession(): void {
  supabase.auth.signOut();
}

// =============================================
// API OPTIONS & TYPES
// =============================================

export interface AuroraApiOptions {
  /** Filter by client ID */
  clientId?: string | null;
  /** Additional query parameters */
  params?: Record<string, string | number | boolean | undefined | null>;
  /** Skip caching for this request */
  skipCache?: boolean;
  /** Custom timeout in ms */
  timeout?: number;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface AuroraProxyResponse {
  error?: string;
  detail?: string;
  retryable?: boolean;
}

// =============================================
// ERROR HANDLING
// =============================================

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

function isRetryableError(error: Error | { code?: string; message?: string }): boolean {
  const message = ('message' in error ? error.message : '').toLowerCase();
  
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

function calculateBackoff(attempt: number, isColdStart: boolean = false): number {
  const initialDelay = isColdStart ? COLD_START_BACKOFF_MS : INITIAL_BACKOFF_MS;
  const baseBackoff = initialDelay * Math.pow(1.8, attempt);
  const jitter = Math.random() * (isColdStart ? 100 : 300);
  return Math.min(baseBackoff + jitter, MAX_BACKOFF_MS);
}

// =============================================
// PATH BUILDING
// =============================================

function buildFinalPath(path: string, options?: AuroraApiOptions): string {
  const params: Record<string, string | number | boolean | undefined | null> = {
    ...options?.params,
  };
  
  // Add client_id if provided and not "all"
  if (options?.clientId && options.clientId !== 'all') {
    params.client_id = options.clientId;
  }
  
  // If path already has query params, merge them
  if (path.includes('?')) {
    const [basePath, existingQuery] = path.split('?');
    const existingParams = new URLSearchParams(existingQuery);
    existingParams.forEach((value, key) => {
      if (params[key] === undefined) {
        params[key] = value;
      }
    });
    return withQuery(basePath, params);
  }
  
  return withQuery(path, params);
}

// =============================================
// EMPTY DATA FALLBACKS
// =============================================

function getEmptyDataForPath(path: string): unknown {
  // Specific endpoint patterns that return wrapped objects
  const wrappedPatterns: Record<string, unknown> = {
    '/lora/devices': { devices: [] },
    '/lora/detections': { detections: [] },
    '/lora/spectrum': { frequencies: [], power_levels: [], noise_floor: 0, channel_activity: [] },
    '/adsb/aircraft': { aircraft: [] },
    '/adsb/devices': { devices: [] },
    '/starlink/devices': { devices: [] },
    '/alerts/rules': { rules: [] },
    '/alerts/stats': { total: 0, active: 0, acknowledged: 0, resolved: 0, by_severity: {}, by_type: {}, last_24h: 0, last_hour: 0 },
    '/clients/list': { clients: [], count: 0 },
    '/clients/all-states': { clients_by_state: { pending: [], registered: [], adopted: [], disabled: [], suspended: [], deleted: [] }, statistics: { total: 0, by_state: {}, summary: { active: 0, needs_attention: 0, inactive: 0 } } },
    '/clients/statistics': { total: 0, pending: 0, registered: 0, adopted: 0, disabled: 0, suspended: 0 },
    '/batches/list': { batches: [], count: 0 },
    '/batches/by-client': { batches: [], count: 0 },
    '/batches/latest': null,
    '/sensors/list': { sensors: [], count: 0 },
    '/sensors/recent': { sensors: [], count: 0 },
    '/readings/latest': { readings: [], data: [] },
    '/stats/history': [],
    '/stats/devices': { devices: [] },
    '/stats/sensors': { sensor_types: [] },
    '/stats/endpoints': { endpoints: [] },
    '/system/arp': { entries: [] },
    '/system/routing': { routes: [] },
    '/system/interfaces': { interfaces: [] },
    '/system/usb': { devices: [] },
    '/audit/logs': { logs: [], count: 0 },
    '/activity': { activities: [] },
  };
  
  // Check specific patterns first
  for (const [pattern, value] of Object.entries(wrappedPatterns)) {
    if (path.includes(pattern)) {
      return value;
    }
  }
  
  // Check for list-type patterns
  if (path.includes('/alerts/list') || path.match(/\/alerts(\?|$)/)) {
    return { alerts: [], count: 0 };
  }
  
  // Generic patterns
  const listPatterns = ['/list', '/vessels', '/stations', '/beacons', '/aircraft', 
    '/devices', '/active', '/readings', '/rules', '/profiles', '/violations', 
    '/baselines', '/clients', '/sensors', '/alerts', '/channels'];
  
  for (const pattern of listPatterns) {
    if (path.includes(pattern)) {
      return [];
    }
  }
  
  if (path.includes('/stats') || path.includes('/statistics') || path.includes('/overview')) {
    return {};
  }
  
  return null;
}

// =============================================
// CORE API CALL
// =============================================

export async function callAuroraApi<T>(
  path: string, 
  method: HttpMethod = 'GET', 
  body?: unknown,
  options?: AuroraApiOptions
): Promise<T> {
  const finalPath = buildFinalPath(path, options);
  const sessionToken = await getSessionToken();
  
  // Check cache first for GET requests
  if (method === 'GET' && !options?.skipCache) {
    const cached = auroraRequestQueue.getCached<T>(finalPath, method);
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
          body: { path: finalPath, method, body, sessionToken },
        });

        if (error) {
          const errorMessage = error.message?.toLowerCase() || '';
          const errorContext = (error as { context?: string }).context?.toLowerCase?.() || '';
          const fullError = `${error.message} ${errorContext}`;
          
          const isColdStartError = isBootError(error);
          
          if (isColdStartError) {
            coldStartRetries++;
            consecutiveBootErrors++;
            
            updateConnectionState('warming_up', coldStartRetries, COLD_START_RETRIES);
            
            if (coldStartRetries <= COLD_START_RETRIES) {
              const backoffMs = calculateBackoff(coldStartRetries - 1, true);
              console.log(`⏳ Edge function warming up for ${path}, retry ${coldStartRetries}/${COLD_START_RETRIES} in ${backoffMs}ms`);
              await sleep(backoffMs);
              lastError = new Error(`Boot error: ${fullError}`);
              continue;
            }
            
            console.warn(`⚠️ Edge function failed to boot after ${COLD_START_RETRIES} retries for ${path}, returning empty data`);
            updateConnectionState('degraded');
            return getEmptyDataForPath(path) as T;
          }
          
          consecutiveBootErrors = 0;
          
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
          
          console.error(`Aurora API error for ${path} after retries:`, error.message);
          return getEmptyDataForPath(path) as T;
        }

        // Handle detail errors from Aurora
        if (data && typeof data === 'object' && 'detail' in data) {
          const detailStr = String(data.detail);
          const detailLower = detailStr.toLowerCase();
          
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
            console.warn(`Aurora API auth error for ${path}: ${detailStr}, returning empty data`);
            return getEmptyDataForPath(path) as T;
          }
          
          const isNotFoundError = detailLower.includes('not found') || 
                                  (detailLower.includes('no ') && detailLower.includes('found'));
          if (!isNotFoundError) {
            console.error(`Aurora backend error for ${path}:`, data.detail);
          }
          const error = new Error(detailStr);
          (error as { status?: number }).status = isNotFoundError ? 404 : 400;
          throw error;
        }

        if ((data as AuroraProxyResponse)?.error) {
          if ((data as AuroraProxyResponse).retryable) {
            console.warn(`Retryable error for ${path}: ${(data as AuroraProxyResponse).error}, returning empty data`);
            return getEmptyDataForPath(path) as T;
          }
          if ((data as AuroraProxyResponse).error?.includes('temporarily unavailable') || 
              (data as AuroraProxyResponse).error?.includes('timeout') ||
              (data as AuroraProxyResponse).error?.includes('Internal Server Error')) {
            console.warn(`Server error for ${path}, returning empty data`);
            return getEmptyDataForPath(path) as T;
          }
          console.error(`Aurora API response error for ${path}:`, (data as AuroraProxyResponse).error);
          throw new Error((data as AuroraProxyResponse).error);
        }

        // Cache successful GET responses
        if (method === 'GET' && !options?.skipCache) {
          auroraRequestQueue.setCache(finalPath, method, data);
        }

        // Mark connection as healthy
        consecutiveBootErrors = 0;
        if (!connectionHealthy) {
          connectionHealthy = true;
          updateConnectionState('connected');
        }

        return data as T;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        
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
        
        console.error(`Failed request for ${path}:`, error.message);
        return getEmptyDataForPath(path) as T;
      }
    }
    
    console.warn(`All ${MAX_RETRIES} retries exhausted for ${path}, returning empty data`);
    return getEmptyDataForPath(path) as T;
  };
  
  return auroraRequestQueue.enqueue(finalPath, method, body, executor);
}

// =============================================
// QUERY OPTIONS PRESETS
// =============================================

const retryDelay = (attemptIndex: number) => {
  if (attemptIndex < 2) {
    return 200 + Math.random() * 100;
  }
  const baseDelay = 500 * Math.pow(1.8, attemptIndex - 2);
  const jitter = Math.random() * 300;
  return Math.min(baseDelay + jitter, 10000);
};

export const defaultQueryOptions = {
  enabled: true,
  staleTime: 120000, // 2 minutes
  refetchInterval: 180000, // 3 minutes
  retry: 8,
  retryDelay,
  refetchOnWindowFocus: false,
  throwOnError: false,
};

export const fastQueryOptions = {
  enabled: true,
  staleTime: 60000, // 1 minute
  refetchInterval: 120000, // 2 minutes
  retry: 6,
  retryDelay,
  refetchOnWindowFocus: false,
  throwOnError: false,
};

export const slowQueryOptions = {
  enabled: true,
  staleTime: 300000, // 5 minutes
  refetchInterval: 600000, // 10 minutes
  retry: 4,
  retryDelay,
  refetchOnWindowFocus: false,
  throwOnError: false,
};

// =============================================
// CACHE UTILITIES
// =============================================

export function invalidateAuroraCache(pathPattern?: string): void {
  auroraRequestQueue.invalidateCache(pathPattern);
}

export function getAuroraQueueStats() {
  return auroraRequestQueue.getStats();
}
