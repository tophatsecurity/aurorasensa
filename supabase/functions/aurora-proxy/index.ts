import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AURORA_ENDPOINT = "http://aurora.tophatsecurity.com:9151";
const AURORA_USERNAME = "admin";
const AURORA_PASSWORD = "admin";

// Configuration
const REQUEST_TIMEOUT = 30000;
const AUTH_TIMEOUT = 20000;

// Session state - lazy initialized
let sessionCookie: string | null = null;
let sessionExpiry = 0;

async function authenticate(): Promise<string | null> {
  console.log("Authenticating with Aurora API...");
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AUTH_TIMEOUT);
  
  try {
    const response = await fetch(`${AURORA_ENDPOINT}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: AURORA_USERNAME,
        password: AURORA_PASSWORD,
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    console.log(`Auth response: ${response.status}`);

    if (response.ok) {
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        sessionCookie = setCookie.split(';')[0];
        sessionExpiry = Date.now() + 55 * 60 * 1000;
        console.log("Auth successful");
        return sessionCookie;
      }
      
      // Try token from body
      const data = await response.json().catch(() => ({}));
      if (data?.token || data?.access_token) {
        sessionCookie = data.token || data.access_token;
        sessionExpiry = Date.now() + 55 * 60 * 1000;
        return sessionCookie;
      }
      
      // Session-based auth
      sessionCookie = "session";
      sessionExpiry = Date.now() + 55 * 60 * 1000;
      return sessionCookie;
    }
    
    return null;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("Auth error:", error);
    return null;
  }
}

async function proxyRequest(url: string, method: string, body: unknown): Promise<Response> {
  // Lazy auth - only if needed
  if (!sessionCookie || Date.now() >= sessionExpiry) {
    await authenticate();
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (sessionCookie && sessionCookie !== 'session') {
      headers['Cookie'] = sessionCookie;
    }

    const options: RequestInit = {
      method,
      headers,
      signal: controller.signal,
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    clearTimeout(timeoutId);
    
    console.log(`Response: ${response.status}`);

    // Re-auth on 401
    if (response.status === 401) {
      sessionCookie = null;
      sessionExpiry = 0;
      await authenticate();
      
      if (sessionCookie) {
        const retryHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
        if (sessionCookie !== 'session') {
          retryHeaders['Cookie'] = sessionCookie;
        }
        
        const retryOptions: RequestInit = { method, headers: retryHeaders };
        if (body && method !== 'GET') {
          retryOptions.body = JSON.stringify(body);
        }
        
        return fetch(url, retryOptions);
      }
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    console.error(isTimeout ? "Request timeout" : "Request error:", error);
    
    return new Response(JSON.stringify({ 
      error: isTimeout ? 'Request timeout' : 'Request failed'
    }), {
      status: isTimeout ? 504 : 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
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

    const response = await proxyRequest(url, method, body);
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
    return new Response(JSON.stringify({ error: 'Request failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
