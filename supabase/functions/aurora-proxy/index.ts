const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AURORA_ENDPOINT = "http://aurora.tophatsecurity.com:9151";
const TIMEOUT_MS = 25000; // 25 seconds - single attempt to avoid wasting time on retries

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('aborted')) {
      throw new Error('Aurora server took too long to respond. Please try again.');
    }
    
    throw new Error(errorMessage);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { path = "", method = "GET", body, sessionCookie } = await req.json().catch(() => ({}));
    
    if (!path) {
      return new Response(JSON.stringify({ error: 'Missing path' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const url = `${AURORA_ENDPOINT}${path}`;
    console.log(`Proxy ${method}: ${url}`);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    
    // Use the session cookie passed from the client
    if (sessionCookie) {
      headers['Cookie'] = sessionCookie;
    }

    const options: RequestInit = { method, headers };
    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetchWithTimeout(url, options);
    
    // Capture session cookie from login responses
    const isLoginEndpoint = path === '/api/auth/login';
    let auroraCookie: string | undefined;
    
    if (isLoginEndpoint && response.ok) {
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        // Extract just the cookie value (before the first semicolon)
        auroraCookie = setCookie.split(';')[0];
        console.log('Aurora session cookie captured');
      }
    }
    
    const data = await response.text();
    let responseBody = data;
    
    // Include the actual Aurora cookie in login response for client to store
    if (isLoginEndpoint && response.ok && auroraCookie) {
      try {
        const parsed = JSON.parse(data);
        responseBody = JSON.stringify({ ...parsed, auroraCookie });
      } catch {
        // Keep as-is if not JSON
      }
    }
    
    return new Response(responseBody, {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
    });

  } catch (error) {
    console.error("Handler error:", error);
    return new Response(JSON.stringify({ error: 'Request failed', details: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
