import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AURORA_ENDPOINT = "http://aurora.tophatsecurity.com:9151";
const REQUEST_TIMEOUT = 15000; // 15 seconds per attempt
const MAX_RETRIES = 2;

async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function proxyRequest(url: string, method: string, body: unknown): Promise<Response> {
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Retry attempt ${attempt}/${MAX_RETRIES}`);
        await new Promise(r => setTimeout(r, 500 * attempt)); // Brief delay between retries
      }
      
      const response = await fetchWithTimeout(url, options, REQUEST_TIMEOUT);
      console.log(`Response: ${response.status}`);
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const isTimeout = lastError.name === 'AbortError';
      console.error(`Attempt ${attempt + 1} failed:`, isTimeout ? "timeout" : lastError.message);
      
      if (!isTimeout) break; // Only retry on timeout
    }
  }

  const isTimeout = lastError?.name === 'AbortError';
  return new Response(JSON.stringify({ 
    error: isTimeout ? 'Aurora API timeout - server may be slow or unreachable' : 'Request failed',
    details: lastError?.message
  }), {
    status: isTimeout ? 504 : 502,
    headers: { 'Content-Type': 'application/json' },
  });
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
