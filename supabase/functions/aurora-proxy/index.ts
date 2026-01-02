import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AURORA_ENDPOINT = "http://128.136.131.89:9151";
const AURORA_USERNAME = "admin";
const AURORA_PASSWORD = "admin";

// Store session cookie globally for reuse
let sessionCookie: string | null = null;

async function authenticate(): Promise<string | null> {
  console.log("Authenticating with Aurora API...");
  
  try {
    const response = await fetch(`${AURORA_ENDPOINT}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: AURORA_USERNAME,
        password: AURORA_PASSWORD,
      }),
    });

    console.log(`Auth response status: ${response.status}`);

    if (response.ok) {
      // Extract session cookie from response headers
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        // Parse the cookie value
        const cookieMatch = setCookie.match(/([^;]+)/);
        if (cookieMatch) {
          sessionCookie = cookieMatch[1];
          console.log("Authentication successful, cookie obtained");
          return sessionCookie;
        }
      }
      
      // Some APIs return token in body instead
      const data = await response.json().catch(() => null);
      if (data?.token || data?.access_token) {
        sessionCookie = data.token || data.access_token;
        console.log("Authentication successful, token obtained from body");
        return sessionCookie;
      }
    }

    console.error("Authentication failed:", await response.text());
    return null;
  } catch (error) {
    console.error("Authentication error:", error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { path = "", method = "GET", body } = await req.json().catch(() => ({}));
    
    const url = `${AURORA_ENDPOINT}${path}`;
    console.log(`Proxying ${method} request to: ${url}`);

    // Authenticate if we don't have a session
    if (!sessionCookie) {
      await authenticate();
    }

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(sessionCookie && { 'Cookie': sessionCookie }),
      },
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    let response = await fetch(url, fetchOptions);
    console.log(`Response status: ${response.status}`);

    // If unauthorized, try to re-authenticate and retry
    if (response.status === 401) {
      console.log("Got 401, re-authenticating...");
      sessionCookie = null;
      await authenticate();
      
      if (sessionCookie) {
        fetchOptions.headers = {
          ...fetchOptions.headers as Record<string, string>,
          'Cookie': sessionCookie,
        };
        response = await fetch(url, fetchOptions);
        console.log(`Retry response status: ${response.status}`);
      }
    }

    const data = await response.text();

    return new Response(data, {
      status: response.status,
      headers: { 
        ...corsHeaders, 
        'Content-Type': response.headers.get('Content-Type') || 'application/json' 
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error proxying request:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
