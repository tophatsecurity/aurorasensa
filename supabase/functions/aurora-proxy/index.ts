import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AURORA_ENDPOINT = "http://aurora.tophatsecurity.com:9151";
const AURORA_API_KEY = Deno.env.get('AURORA_API_KEY');
const AURORA_USERNAME = Deno.env.get('AURORA_USERNAME');
const AURORA_PASSWORD = Deno.env.get('AURORA_PASSWORD');

// Store session cookie in memory (will reset on cold start)
let sessionCookie: string | null = null;

async function authenticateWithSession(): Promise<string | null> {
  if (!AURORA_USERNAME || !AURORA_PASSWORD) {
    console.warn('Session auth credentials not configured');
    return null;
  }

  try {
    console.log('Attempting session-based authentication...');
    const formData = new URLSearchParams();
    formData.append('username', AURORA_USERNAME);
    formData.append('password', AURORA_PASSWORD);

    const response = await fetch(`${AURORA_ENDPOINT}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (response.ok) {
      const cookies = response.headers.get('set-cookie');
      if (cookies) {
        sessionCookie = cookies.split(';')[0];
        console.log('Session authentication successful');
        return sessionCookie;
      }
    }
    console.error('Session auth failed:', response.status);
    return null;
  } catch (error) {
    console.error('Session auth error:', error);
    return null;
  }
}

async function makeRequest(
  url: string,
  method: string,
  body: unknown,
  useApiKey: boolean,
  cookie: string | null
): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  
  if (useApiKey && AURORA_API_KEY) {
    headers['X-API-Key'] = AURORA_API_KEY;
  }
  
  if (cookie) {
    headers['Cookie'] = cookie;
  }

  const options: RequestInit = { method, headers };
  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  return fetch(url, options);
}

serve(async (req) => {
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
    
    const url = `${AURORA_ENDPOINT}${path}`;
    console.log(`Proxy ${method}: ${url}`);

    // Strategy 1: Try with API key first
    if (AURORA_API_KEY) {
      console.log('Trying API key authentication...');
      const response = await makeRequest(url, method, body, true, null);
      
      if (response.status !== 401) {
        console.log(`API key auth response: ${response.status}`);
        const data = await response.text();
        return new Response(data, {
          status: response.status,
          headers: { 
            ...corsHeaders, 
            'Content-Type': response.headers.get('Content-Type') || 'application/json',
          },
        });
      }
      console.log('API key auth returned 401, trying session auth...');
    }

    // Strategy 2: Try with existing session cookie
    if (sessionCookie) {
      console.log('Trying existing session cookie...');
      const response = await makeRequest(url, method, body, false, sessionCookie);
      
      if (response.status !== 401) {
        console.log(`Session cookie response: ${response.status}`);
        const data = await response.text();
        return new Response(data, {
          status: response.status,
          headers: { 
            ...corsHeaders, 
            'Content-Type': response.headers.get('Content-Type') || 'application/json',
          },
        });
      }
      console.log('Session cookie expired, re-authenticating...');
      sessionCookie = null;
    }

    // Strategy 3: Authenticate and get new session cookie
    const newCookie = await authenticateWithSession();
    if (newCookie) {
      console.log('Retrying with new session cookie...');
      const response = await makeRequest(url, method, body, false, newCookie);
      console.log(`New session response: ${response.status}`);
      const data = await response.text();
      return new Response(data, {
        status: response.status,
        headers: { 
          ...corsHeaders, 
          'Content-Type': response.headers.get('Content-Type') || 'application/json',
        },
      });
    }

    // All auth methods failed
    return new Response(JSON.stringify({ error: 'Authentication failed - no valid credentials' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Handler error:", error);
    return new Response(JSON.stringify({ error: 'Request failed', details: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
