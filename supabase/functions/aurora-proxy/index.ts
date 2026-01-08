const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AURORA_ENDPOINT = "http://aurora.tophatsecurity.com:9151";
const MAX_RETRIES = 3;
const TIMEOUT_MS = 45000;

// Store session cookie in memory (per isolate)
let sessionCookie: string | null = null;

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
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
      
      const isLastAttempt = attempt === retries;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isAbort = error instanceof Error && error.name === 'AbortError';
      const isRetryable = isAbort || 
        errorMessage.includes('connection') ||
        errorMessage.includes('reset') ||
        errorMessage.includes('timeout');
      
      console.log(`Attempt ${attempt}/${retries} failed for ${url}: ${errorMessage}`);
      
      if (isLastAttempt || !isRetryable) {
        throw new Error(isAbort ? `Request timeout after ${TIMEOUT_MS}ms` : errorMessage);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  throw new Error('Max retries exceeded');
}

async function ensureAuthenticated(): Promise<boolean> {
  if (sessionCookie) {
    return true;
  }
  
  const apiKey = Deno.env.get('AURORA_API_KEY');
  if (!apiKey) {
    console.error('No AURORA_API_KEY configured');
    return false;
  }
  
  // Parse API key as username:password
  const [username, password] = apiKey.includes(':') 
    ? apiKey.split(':') 
    : ['admin', apiKey];
  
  console.log(`Authenticating as user: ${username}`);
  
  try {
    const response = await fetchWithRetry(`${AURORA_ENDPOINT}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    
    if (response.ok) {
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        sessionCookie = setCookie.split(';')[0];
        console.log('Session authenticated successfully');
        return true;
      }
    }
    
    const errorText = await response.text();
    console.error(`Auth failed: ${response.status} - ${errorText}`);
    return false;
  } catch (error) {
    console.error('Auth error:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { path = "", method = "GET", body } = await req.json().catch(() => ({}));
    
    if (!path) {
      return new Response(JSON.stringify({ error: 'Missing path' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Skip auth for login endpoint
    const isLoginEndpoint = path === '/api/auth/login';
    
    if (!isLoginEndpoint) {
      const authenticated = await ensureAuthenticated();
      if (!authenticated) {
        return new Response(JSON.stringify({ error: 'Failed to authenticate with Aurora API' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    const url = `${AURORA_ENDPOINT}${path}`;
    console.log(`Proxy ${method}: ${url}`);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    
    if (sessionCookie && !isLoginEndpoint) {
      headers['Cookie'] = sessionCookie;
    }

    const options: RequestInit = { method, headers };
    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetchWithRetry(url, options);
    
    // Capture session cookie from login responses
    if (isLoginEndpoint && response.ok) {
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        sessionCookie = setCookie.split(';')[0];
      }
    }
    
    // Clear session on 401 to force re-auth
    if (response.status === 401) {
      sessionCookie = null;
    }
    
    const data = await response.text();
    
    return new Response(data, {
      status: response.status,
      headers: { 
        ...corsHeaders, 
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });

  } catch (error) {
    console.error("Handler error:", error);
    return new Response(JSON.stringify({ error: 'Request failed', details: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
