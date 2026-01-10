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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { path = "", method = "GET", body: requestBody, sessionCookie } = body;
    
    if (!path) {
      return new Response(JSON.stringify({ error: 'Missing path' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const url = `${AURORA_ENDPOINT}${path}`;
    const isLoginEndpoint = path === '/api/auth/login';
    console.log(`Proxy ${method}: ${url}${sessionCookie ? ' (with session)' : ' (no session)'}`);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    
    // Use session cookie for authentication
    if (sessionCookie) {
      headers['Cookie'] = sessionCookie;
    }
    
    // For non-login endpoints without a session, return 401 immediately
    if (!sessionCookie && !isLoginEndpoint) {
      console.log('No session cookie for protected endpoint, returning 401');
      return new Response(JSON.stringify({ 
        detail: 'Not authenticated. Please log in first.' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let response: Response;
    try {
      response = await fetchWithTimeout(url, {
        method,
        headers,
        body: requestBody && method !== 'GET' ? JSON.stringify(requestBody) : undefined,
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
    
    // Handle login response with cookie capture
    let responseText = await response.text();
    
    if (isLoginEndpoint && response.ok) {
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        const auroraCookie = setCookie.split(';')[0];
        console.log('Aurora session cookie captured');
        try {
          const parsed = JSON.parse(responseText);
          responseText = JSON.stringify({ ...parsed, auroraCookie });
        } catch {
          // Keep original if not JSON
        }
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
