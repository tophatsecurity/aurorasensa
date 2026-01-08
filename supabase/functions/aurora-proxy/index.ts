const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AURORA_ENDPOINT = "http://aurora.tophatsecurity.com:9151";
const MAX_RETRIES = 3;
const TIMEOUT_MS = 45000;

// Store user sessions by token (in-memory per isolate)
const userSessions: Map<string, string> = new Map();

// Server session cookie for API key auth
let serverSessionCookie: string | null = null;

// Get API key from environment (format: username:password)
const AURORA_API_KEY = Deno.env.get('AURORA_API_KEY');

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

// Authenticate using API key credentials and get server session
async function ensureServerSession(): Promise<string | null> {
  if (serverSessionCookie) return serverSessionCookie;
  
  if (!AURORA_API_KEY || !AURORA_API_KEY.includes(':')) {
    console.log('No valid AURORA_API_KEY (format: username:password)');
    return null;
  }
  
  const [username, password] = AURORA_API_KEY.split(':');
  console.log(`Authenticating server session as: ${username}`);
  
  try {
    const response = await fetchWithRetry(`${AURORA_ENDPOINT}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    
    if (response.ok) {
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        serverSessionCookie = setCookie.split(';')[0];
        console.log('Server session established');
        return serverSessionCookie;
      }
    }
    console.error('Failed to establish server session:', await response.text());
  } catch (error) {
    console.error('Server auth error:', error);
  }
  return null;
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
    
    // Use user session if available, otherwise use server session
    if (sessionToken && userSessions.has(sessionToken)) {
      headers['Cookie'] = userSessions.get(sessionToken)!;
    } else {
      // Get server session for unauthenticated requests
      const serverCookie = await ensureServerSession();
      if (serverCookie) {
        headers['Cookie'] = serverCookie;
      }
    }

    const options: RequestInit = { method, headers };
    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    let response = await fetchWithRetry(url, options);
    
    // If we get 401, clear server session and retry once
    if (response.status === 401 && !sessionToken) {
      serverSessionCookie = null;
      const newCookie = await ensureServerSession();
      if (newCookie) {
        headers['Cookie'] = newCookie;
        response = await fetchWithRetry(url, { method, headers, body: options.body });
      }
    }
    
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