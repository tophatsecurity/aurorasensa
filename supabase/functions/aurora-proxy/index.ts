import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AURORA_ENDPOINT = "http://aurora.tophatsecurity.com:9151";
const AURORA_USERNAME = "admin";
const AURORA_PASSWORD = "admin";

// Configuration - increased timeouts for slow API
const CONFIG = {
  requestTimeout: 25000, // 25 seconds
  authTimeout: 20000, // 20 seconds for auth
  maxRetries: 2, // Reduce retries
  baseRetryDelay: 1000,
  maxRetryDelay: 3000,
};

// Session state
const session = {
  cookie: null as string | null,
  expiry: 0
};

// Helper to add timeout to fetch requests
async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Calculate exponential backoff delay with jitter
function getRetryDelay(attempt: number): number {
  const exponentialDelay = CONFIG.baseRetryDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 200;
  return Math.min(exponentialDelay + jitter, CONFIG.maxRetryDelay);
}

// Sleep helper
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Check if session is still valid (with 5 min buffer)
function isSessionValid(): boolean {
  return session.cookie !== null && Date.now() < session.expiry - 5 * 60 * 1000;
}

async function authenticate(): Promise<string | null> {
  console.log("Authenticating with Aurora API...");
  
  for (let attempt = 0; attempt < CONFIG.maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(
        `${AURORA_ENDPOINT}/api/auth/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: AURORA_USERNAME,
            password: AURORA_PASSWORD,
          }),
        },
        CONFIG.authTimeout
      );

      console.log(`Auth response status: ${response.status} (attempt ${attempt + 1})`);

      if (response.ok) {
        // Extract session cookie from response headers
        const setCookie = response.headers.get('set-cookie');
        if (setCookie) {
          const cookieMatch = setCookie.match(/([^;]+)/);
          if (cookieMatch) {
            session.cookie = cookieMatch[1];
            session.expiry = Date.now() + 60 * 60 * 1000;
            console.log("Authentication successful, cookie obtained");
            return session.cookie;
          }
        }
        
        // Some APIs return token in body instead
        const data = await response.json().catch(() => null);
        if (data?.token || data?.access_token) {
          session.cookie = data.token || data.access_token;
          session.expiry = Date.now() + 60 * 60 * 1000;
          console.log("Authentication successful, token obtained from body");
          return session.cookie;
        }
        
        // Auth succeeded but no token - might be session-based
        console.log("Auth succeeded, assuming session-based auth");
        session.cookie = "authenticated";
        session.expiry = Date.now() + 60 * 60 * 1000;
        return session.cookie;
      }

      // Non-retryable auth errors
      if (response.status === 401 || response.status === 403) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error("Authentication failed (credentials rejected):", errorText);
        return null;
      }

      // Retryable error - wait and retry
      if (attempt < CONFIG.maxRetries - 1) {
        const delay = getRetryDelay(attempt);
        console.log(`Auth failed with status ${response.status}, retrying in ${delay}ms...`);
        await sleep(delay);
      }
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === 'AbortError';
      const errorType = isTimeout ? 'timeout' : 'network error';
      console.error(`Authentication ${errorType} (attempt ${attempt + 1}):`, error);
      
      if (attempt < CONFIG.maxRetries - 1) {
        const delay = getRetryDelay(attempt);
        console.log(`Retrying auth in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  console.error("Authentication failed after all retries");
  return null;
}

async function proxyRequest(
  url: string, 
  method: string, 
  body: unknown,
  attempt: number = 0
): Promise<Response> {
  // Ensure we have a valid session
  if (!isSessionValid()) {
    console.log("Session invalid or expired, authenticating...");
    await authenticate();
  }

  const fetchOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(session.cookie && session.cookie !== 'authenticated' && { 'Cookie': session.cookie }),
    },
  };

  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }

  try {
    const response = await fetchWithTimeout(url, fetchOptions, CONFIG.requestTimeout);
    console.log(`Response status: ${response.status} (attempt ${attempt + 1})`);

    // If unauthorized, invalidate session and retry once
    if (response.status === 401 && attempt === 0) {
      console.log("Got 401, invalidating session and retrying...");
      session.cookie = null;
      session.expiry = 0;
      return proxyRequest(url, method, body, attempt + 1);
    }

    // Server errors - retry with backoff
    if (response.status >= 500 && attempt < CONFIG.maxRetries - 1) {
      const delay = getRetryDelay(attempt);
      console.log(`Server error ${response.status}, retrying in ${delay}ms...`);
      await sleep(delay);
      return proxyRequest(url, method, body, attempt + 1);
    }

    return response;
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    const isNetworkError = error instanceof TypeError;
    
    if (isTimeout) {
      console.error(`Request timeout after ${CONFIG.requestTimeout}ms (attempt ${attempt + 1})`);
    } else if (isNetworkError) {
      console.error(`Network error (attempt ${attempt + 1}):`, error);
    } else {
      console.error(`Request error (attempt ${attempt + 1}):`, error);
    }

    // Retry on timeout or network errors
    if ((isTimeout || isNetworkError) && attempt < CONFIG.maxRetries - 1) {
      const delay = getRetryDelay(attempt);
      console.log(`Retrying request in ${delay}ms...`);
      await sleep(delay);
      return proxyRequest(url, method, body, attempt + 1);
    }

    // Create error response
    const errorMessage = isTimeout 
      ? 'Request timeout - Aurora API did not respond in time'
      : error instanceof Error 
        ? error.message 
        : 'Unknown network error';
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      retries: attempt + 1,
      endpoint: url 
    }), {
      status: isTimeout ? 504 : 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const { path = "", method = "GET", body } = await req.json().catch(() => ({}));
    
    if (!path) {
      return new Response(JSON.stringify({ error: 'Missing path parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const url = `${AURORA_ENDPOINT}${path}`;
    console.log(`Proxying ${method} request to: ${url}`);

    const response = await proxyRequest(url, method, body);
    const data = await response.text();
    const duration = Date.now() - startTime;
    
    console.log(`Request completed in ${duration}ms with status ${response.status}`);

    return new Response(data, {
      status: response.status,
      headers: { 
        ...corsHeaders, 
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        'X-Response-Time': `${duration}ms`,
      },
    });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error proxying request after ${duration}ms:`, error);
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      duration: `${duration}ms` 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});