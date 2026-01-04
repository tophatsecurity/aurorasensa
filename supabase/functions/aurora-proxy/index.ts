import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AURORA_ENDPOINT = "http://aurora.tophatsecurity.com:9151";
const REQUEST_TIMEOUT = 30000;

async function proxyRequest(url: string, method: string, body: unknown): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const options: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    clearTimeout(timeoutId);
    
    console.log(`Response: ${response.status}`);
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
