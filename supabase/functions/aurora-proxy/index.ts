import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AURORA_ENDPOINT = "http://aurora.tophatsecurity.com:9151";
const TIMEOUT_MS = 55000; // Edge functions have ~60s limit

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Helper to get empty data based on path
function getEmptyDataForPath(apiPath: string): unknown {
  if (apiPath.includes('/lora/devices')) return { devices: [] };
  if (apiPath.includes('/lora/detections')) return { detections: [] };
  if (apiPath.includes('/lora/channels')) return [];
  if (apiPath.includes('/lora/spectrum')) return { frequencies: [], power_levels: [], noise_floor: 0, channel_activity: [] };
  if (apiPath.includes('/lora/stats') || apiPath.includes('/lora/config')) return {};
  if (apiPath.includes('/adsb/aircraft')) return { aircraft: [] };
  if (apiPath.includes('/adsb/devices')) return { devices: [] };
  if (apiPath.includes('/starlink/devices')) return { devices: [] };
  if (apiPath.includes('/alerts/rules')) return { rules: [] };
  if (apiPath.includes('/alerts/list') || apiPath.match(/\/alerts(\?|$)/)) return { alerts: [], count: 0 };
  if (apiPath.includes('/alerts/stats')) return { total: 0, active: 0, acknowledged: 0, resolved: 0, by_severity: {}, by_type: {}, last_24h: 0, last_hour: 0 };
  if (apiPath.includes('/alerts/settings')) return {};
  if (apiPath.includes('/clients/list') || apiPath.includes('/clients/all-states')) return { clients: [], count: 0 };
  if (apiPath.includes('/clients/pending') || apiPath.includes('/clients/registered') ||
      apiPath.includes('/clients/adopted') || apiPath.includes('/clients/disabled') ||
      apiPath.includes('/clients/suspended') || apiPath.includes('/clients/deleted')) return { clients: [] };
  if (apiPath.includes('/clients/statistics')) return { total: 0, pending: 0, registered: 0, adopted: 0, disabled: 0, suspended: 0 };
  if (apiPath.includes('/batches/list') || apiPath.includes('/batches/by-client')) return { batches: [], count: 0 };
  if (apiPath.includes('/sensors/list') || apiPath.includes('/sensors/recent')) return { sensors: [] };
  if (apiPath.includes('/maritime/vessels') || apiPath.includes('/maritime/stations') || apiPath.includes('/maritime/beacons')) return [];
  if (apiPath.includes('/stats/history')) return [];
  if (apiPath.includes('/stats/devices')) return { devices: [] };
  if (apiPath.includes('/stats/endpoints')) return { endpoints: [] };
  if (apiPath.includes('/audit/logs')) return { logs: [], count: 0 };
  if (apiPath.includes('/activity')) return { activities: [] };
  if (apiPath.includes('/users') && !apiPath.includes('/users/')) return { users: [] };
  if (apiPath.includes('/roles') && !apiPath.includes('/roles/')) return { roles: [] };
  if (apiPath.includes('/permissions') && !apiPath.includes('/permissions/')) return { permissions: [] };
  if (apiPath.includes('/auth/verify')) return { valid: false };
  if (apiPath.includes('/auth/me')) return null;
  
  // Generic patterns
  if (apiPath.includes('/list') || apiPath.includes('/vessels') || apiPath.includes('/stations') || 
      apiPath.includes('/beacons') || apiPath.includes('/aircraft') || apiPath.includes('/devices') ||
      apiPath.includes('/active') || apiPath.includes('/readings') || apiPath.includes('/rules') ||
      apiPath.includes('/profiles') || apiPath.includes('/violations') || apiPath.includes('/baselines') ||
      apiPath.includes('/clients') || apiPath.includes('/sensors') || apiPath.includes('/alerts')) {
    return [];
  }
  if (apiPath.includes('/stats') || apiPath.includes('/statistics') || apiPath.includes('/overview')) return {};
  return null;
}

// Login endpoints to try in order - JSON format first (based on actual API behavior)
const LOGIN_ENDPOINTS = ['/api/login', '/api/auth/login', '/token', '/api/token'];

async function tryLoginEndpoints(
  username: string, 
  password: string
): Promise<{ data?: unknown; error?: string; status: number }> {
  
  // Try JSON format first (Aurora API uses this)
  for (const endpoint of LOGIN_ENDPOINTS) {
    const url = `${AURORA_ENDPOINT}${endpoint}`;
    console.log(`Trying login endpoint (JSON): ${url}`);
    
    try {
      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Login successful via ${endpoint} (JSON format)`);
        // Aurora returns { success: true, username: "...", session_token?: "...", token?: "..." }
        // Normalize to include access_token for consistency
        if (data.session_token && !data.access_token) {
          data.access_token = data.session_token;
        } else if (data.token && !data.access_token) {
          data.access_token = data.token;
        }
        return { data, status: response.status };
      }
      
      if (response.status === 401 || response.status === 403) {
        const text = await response.text();
        console.log(`Auth failed at ${endpoint}: ${text}`);
        try {
          const errorData = JSON.parse(text);
          return { error: errorData.detail || errorData.message || 'Invalid credentials', status: response.status };
        } catch {
          return { error: 'Invalid credentials', status: response.status };
        }
      }
      
      if (response.status === 404) {
        console.log(`${endpoint} not found, trying next...`);
        continue;
      }
      
      if (response.status === 422) {
        // Validation error - try OAuth2 form-urlencoded format
        console.log(`${endpoint} returned 422, trying form-urlencoded format...`);
        const formBody = new URLSearchParams();
        formBody.append('username', username);
        formBody.append('password', password);
        formBody.append('grant_type', 'password');
        
        const formResponse = await fetchWithTimeout(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formBody.toString(),
        });
        
        if (formResponse.ok) {
          const data = await formResponse.json();
          console.log(`Login successful via ${endpoint} (form-urlencoded)`);
          return { data, status: formResponse.status };
        }
        
        if (formResponse.status === 401 || formResponse.status === 403) {
          return { error: 'Invalid credentials', status: formResponse.status };
        }
      }
      
      console.log(`${endpoint} returned ${response.status}, trying next...`);
    } catch (err) {
      console.log(`${endpoint} failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  
  return { error: 'Login endpoint not available. Please check server configuration.', status: 503 };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { path = "", method = "GET", body: requestBody, auroraToken } = body;
    
    if (!path) {
      return new Response(JSON.stringify({ error: 'Missing path' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const isLoginEndpoint = path === '/api/login' || path === '/api/auth/login' || path === '/token' || path === '/api/token';
    const isLogoutEndpoint = path === '/api/logout' || path === '/api/auth/logout';
    const isHealthEndpoint = path === '/api/health' || path === '/health';
    
    // Special handling for login - try multiple endpoints with OAuth2 format
    if (isLoginEndpoint && method === 'POST' && requestBody) {
      const username = requestBody.username || requestBody.email || requestBody.identifier;
      const password = requestBody.password;
      
      if (!username || !password) {
        return new Response(JSON.stringify({ error: 'Username and password required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const result = await tryLoginEndpoints(username, password);
      
      if (result.data) {
        console.log('Login successful, returning token data');
        return new Response(JSON.stringify(result.data), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ 
        detail: result.error || 'Login failed',
        error: result.error || 'Login failed'
      }), {
        status: result.status === 401 || result.status === 403 ? 401 : 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const url = `${AURORA_ENDPOINT}${path}`;
    console.log(`Proxy ${method}: ${url}${auroraToken ? ' (with Aurora token)' : ' (no token)'}`);

    // Prepare headers for Aurora API
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Use Aurora token for authentication (not Supabase token)
    if (auroraToken) {
      headers['Authorization'] = `Bearer ${auroraToken}`;
      console.log('Using Aurora Bearer token for API auth');
    }
    
    let bodyContent: string | undefined;
    if (requestBody && method !== 'GET') {
      bodyContent = JSON.stringify(requestBody);
    }

    let response: Response;
    try {
      response = await fetchWithTimeout(url, {
        method,
        headers,
        body: bodyContent,
      });
    } catch (fetchError) {
      const msg = fetchError instanceof Error ? fetchError.message : String(fetchError);
      if (msg.includes('aborted')) {
        console.error(`Timeout after ${TIMEOUT_MS}ms for ${url}`);
        return new Response(JSON.stringify({ 
          error: 'Aurora server timeout', 
          details: 'The Aurora server is taking too long to respond. Please try again.',
          retryable: true
        }), {
          status: 504,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.error(`Connection error for ${url}: ${msg}`);
      return new Response(JSON.stringify({ 
        error: 'Aurora server unavailable', 
        details: 'Cannot connect to Aurora server. It may be offline.',
        retryable: true
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Handle 500 errors gracefully
    if (response.status === 500) {
      const responseText = await response.text();
      console.error(`Aurora server error (500) for ${path}: ${responseText}`);
      
      if (method === 'GET') {
        const emptyData = getEmptyDataForPath(path);
        if (emptyData !== null) {
          console.log(`Returning empty data for ${path} due to server error`);
          return new Response(JSON.stringify(emptyData), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
      
      return new Response(JSON.stringify({
        error: 'Aurora server temporarily unavailable',
        detail: 'The server is experiencing issues. Please try again in a moment.',
        retryable: true,
        originalError: responseText.substring(0, 200)
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Handle 404 errors gracefully - return empty data for GET requests
    if (response.status === 404) {
      console.log(`Endpoint not found (404): ${path}`);
      if (method === 'GET') {
        const emptyData = getEmptyDataForPath(path);
        console.log(`Returning empty data for ${path}`);
        return new Response(JSON.stringify(emptyData), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // For non-GET, return the 404
      return new Response(JSON.stringify({ error: 'Endpoint not found', path }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Handle 401 from Aurora - this means Aurora token is invalid/missing
    if (response.status === 401) {
      console.log(`Aurora returned 401 for ${path}`);
      return new Response(JSON.stringify({ 
        detail: 'Aurora API authentication required. Please log in again.',
        requiresAuth: true
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Handle 501 Not Implemented
    if (response.status === 501) {
      console.log(`Endpoint not implemented (501): ${path}`);
      const emptyData = getEmptyDataForPath(path);
      return new Response(JSON.stringify(emptyData), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Handle 422 validation errors
    if (response.status === 422) {
      const responseText = await response.text();
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.detail && Array.isArray(errorData.detail) && 
            errorData.detail.some((d: { type?: string }) => d.type === 'int_parsing')) {
          console.log(`Endpoint validation error (422): ${path} - returning empty data`);
          let emptyData: unknown = null;
          if (path.includes('/rules')) emptyData = { rules: [] };
          else if (path.includes('/settings')) emptyData = {};
          else if (path.includes('/profiles') || path.includes('/violations') || path.includes('/baselines')) emptyData = [];
          else emptyData = [];
          return new Response(JSON.stringify(emptyData), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch {
        // Continue with normal response handling
      }
    }
    
    // Get response text
    const responseText = await response.text();
    
    return new Response(responseText, {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
    });

  } catch (error) {
    console.error("Handler error:", error);
    return new Response(JSON.stringify({ 
      error: 'Request failed', 
      details: error instanceof Error ? error.message : String(error),
      retryable: true
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
