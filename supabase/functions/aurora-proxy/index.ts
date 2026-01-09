const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AURORA_ENDPOINT = "http://aurora.tophatsecurity.com:9151";
const MAX_RETRIES = 3;
const TIMEOUT_MS = 45000;

// Store user sessions by token (in-memory per isolate)
const userSessions: Map<string, string> = new Map();

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      const isLastAttempt = attempt === retries;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`Attempt ${attempt}/${retries} failed: ${errorMessage}`);
      
      if (isLastAttempt) throw new Error(errorMessage);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  throw new Error('Max retries exceeded');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { path = "", method = "GET", body, sessionToken } = await req.json().catch(() => ({}));
    
    if (!path) {
      return new Response(JSON.stringify({ error: 'Missing path' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const url = `${AURORA_ENDPOINT}${path}`;
    console.log(`Proxy ${method}: ${url}`);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    
    // Add session cookie if user has one
    if (sessionToken && userSessions.has(sessionToken)) {
      headers['Cookie'] = userSessions.get(sessionToken)!;
    }

    const options: RequestInit = { method, headers };
    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetchWithRetry(url, options);
    
    // Capture session cookie from login responses
    const isLoginEndpoint = path === '/api/auth/login';
    let newSessionToken: string | undefined;
    
    if (isLoginEndpoint && response.ok) {
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        const cookie = setCookie.split(';')[0];
        newSessionToken = crypto.randomUUID();
        userSessions.set(newSessionToken, cookie);
        console.log('User session stored for token:', newSessionToken);
      }
    }
    
    // Handle logout - clear user session
    if (path === '/api/auth/logout' && sessionToken) {
      userSessions.delete(sessionToken);
    }
    
    const data = await response.text();
    let responseBody = data;
    
    // Include session token in login response
    if (isLoginEndpoint && response.ok && newSessionToken) {
      try {
        const parsed = JSON.parse(data);
        responseBody = JSON.stringify({ ...parsed, sessionToken: newSessionToken });
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
