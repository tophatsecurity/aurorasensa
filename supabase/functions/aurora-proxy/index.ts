const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AURORA_ENDPOINT = "http://aurora.tophatsecurity.com:9151";

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
    
    const url = `${AURORA_ENDPOINT}${path}`;
    console.log(`Proxy ${method}: ${url}`);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    
    // Add API key if available
    const apiKey = Deno.env.get('AURORA_API_KEY');
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }

    const options: RequestInit = { method, headers };
    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
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
