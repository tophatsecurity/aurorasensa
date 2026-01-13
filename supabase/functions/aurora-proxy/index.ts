import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

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
  if (apiPath.includes('/list') || apiPath.includes('/vessels') || apiPath.includes('/stations') || 
      apiPath.includes('/beacons') || apiPath.includes('/aircraft') || apiPath.includes('/devices') ||
      apiPath.includes('/active') || apiPath.includes('/readings') || apiPath.includes('/rules') ||
      apiPath.includes('/profiles') || apiPath.includes('/violations') || apiPath.includes('/baselines') ||
      apiPath.includes('/clients') || apiPath.includes('/sensors') || apiPath.includes('/alerts')) {
    return [];
  }
  if (apiPath.includes('/stats') || apiPath.includes('/statistics') || apiPath.includes('/overview')) {
    return {};
  }
  return null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { path = "", method = "GET", body: requestBody, sessionToken } = body;
    
    if (!path) {
      return new Response(JSON.stringify({ error: 'Missing path' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const url = `${AURORA_ENDPOINT}${path}`;
    // Support both old and new login endpoints
    const isLoginEndpoint = path === '/api/login' || path === '/api/auth/login';
    const isLogoutEndpoint = path === '/api/logout' || path === '/api/auth/logout';
    const isHealthEndpoint = path === '/api/health' || path === '/health';
    const isPublicEndpoint = isLoginEndpoint || isLogoutEndpoint || isHealthEndpoint;
    
    console.log(`Proxy ${method}: ${url}${sessionToken ? ' (with session)' : ' (no session)'}`);

    // Verify Supabase JWT for protected endpoints
    if (!isPublicEndpoint) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        console.log('No Authorization header for protected endpoint');
        return new Response(JSON.stringify({ 
          detail: 'Not authenticated. Please log in first.' 
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify the Supabase JWT
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const token = authHeader.replace('Bearer ', '');
      
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        console.log('Invalid or expired Supabase token:', authError?.message);
        return new Response(JSON.stringify({ 
          detail: 'Invalid or expired session. Please log in again.' 
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`Authenticated user: ${user.email}`);
    }

    // Prepare headers - Aurora API expects JSON for all endpoints
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    let bodyContent: string | undefined;
    
    if (requestBody && method !== 'GET') {
      bodyContent = JSON.stringify(requestBody);
      if (isLoginEndpoint) {
        console.log('Login request using JSON format');
      }
    }
    
    // Use session token for Aurora API authentication if provided
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
      console.log('Using Bearer token for Aurora API auth');
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
      // Connection refused or network error after all retries
      console.error(`Connection error for ${url}: ${msg}`);
      return new Response(JSON.stringify({ 
        error: 'Aurora server unavailable', 
        details: 'Cannot connect to Aurora server after multiple attempts. It may be offline.',
        retryable: true
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Handle 500 errors gracefully - Aurora backend internal errors
    // These are often transient (like "Sanic app name already in use")
    if (response.status === 500) {
      const responseText = await response.text();
      console.error(`Aurora server error (500) for ${path}: ${responseText}`);
      
      // For data fetching endpoints, return empty data to prevent UI crashes
      if (!isLoginEndpoint && method === 'GET') {
        const emptyData = getEmptyDataForPath(path);
        if (emptyData !== null) {
          console.log(`Returning empty data for ${path} due to server error`);
          return new Response(JSON.stringify(emptyData), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
      
      // For other requests, return a cleaner error with retry suggestion
      return new Response(JSON.stringify({
        error: 'Aurora server temporarily unavailable',
        detail: 'The server is experiencing issues. Please try again in a moment.',
        retryable: true,
        originalError: responseText.substring(0, 200)
      }), {
        status: 503, // Return 503 instead of 500 to indicate temporary issue
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Handle 404 errors gracefully - return empty data instead of error
    if (response.status === 404) {
      console.log(`Endpoint not found (404): ${path} - returning empty data`);
      const emptyData = getEmptyDataForPath(path);
      return new Response(JSON.stringify(emptyData), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Handle 401 from Aurora - pass through but don't expose internal details
    if (response.status === 401) {
      console.log(`Aurora returned 401 for ${path}`);
      return new Response(JSON.stringify({ 
        detail: 'Aurora API authentication required' 
      }), {
        status: 200, // Return 200 with empty data to avoid breaking UI
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Handle 422 validation errors for non-existent endpoints gracefully
    // The Aurora backend interprets "/api/alerts/rules" as "/api/alerts/{alert_id}" where alert_id="rules"
    if (response.status === 422) {
      const responseText = await response.text();
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.detail && Array.isArray(errorData.detail) && 
            errorData.detail.some((d: { type?: string }) => d.type === 'int_parsing')) {
          console.log(`Endpoint validation error (422): ${path} - returning empty data`);
          let emptyData: unknown = null;
          if (path.includes('/rules')) {
            emptyData = { rules: [] };
          } else if (path.includes('/settings')) {
            emptyData = {};
          } else if (path.includes('/profiles') || path.includes('/violations') || path.includes('/baselines')) {
            emptyData = [];
          } else {
            emptyData = [];
          }
          return new Response(JSON.stringify(emptyData), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch {
        // If parsing fails, continue with normal response handling
      }
      // Re-fetch for normal 422 handling if not a path parsing error
      response = await fetchWithTimeout(url, {
        method,
        headers,
        body: bodyContent,
      });
    }
    
    // Handle login response with token/cookie capture
    let responseText = await response.text();
    
    if (isLoginEndpoint && response.ok) {
      console.log('Login response received, status:', response.status);
      try {
        const parsed = JSON.parse(responseText);
        
        // Capture access_token for OAuth2 Bearer auth
        if (parsed.access_token) {
          console.log('OAuth2 access_token captured');
          // The access_token can be used as Bearer token for subsequent requests
          parsed.auroraCookie = `Bearer ${parsed.access_token}`;
        }
        
        // Also capture set-cookie if present (for session-based auth)
        const setCookie = response.headers.get('set-cookie');
        if (setCookie) {
          const sessionCookieValue = setCookie.split(';')[0];
          console.log('Session cookie captured');
          parsed.auroraCookie = sessionCookieValue;
        }
        
        responseText = JSON.stringify(parsed);
      } catch {
        // Keep original if not JSON
        console.log('Login response not JSON, keeping original');
      }
    }
    
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
