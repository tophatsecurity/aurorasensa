const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const AURORA_ENDPOINT = "http://aurora.tophatsecurity.com:9151";

// SSE stream types and their endpoints
const STREAM_ENDPOINTS: Record<string, string> = {
  'readings': '/api/stream/readings',
  'alerts': '/api/stream/alerts',
  'dashboard': '/api/stream/dashboard/stats',
  'clients': '/api/stream/clients',
  'starlink': '/api/stream/readings/starlink',
  'thermal': '/api/stream/readings/thermal_probe',
  'gps': '/api/stream/readings/gps',
  'adsb': '/api/stream/readings/adsb',
  'arduino': '/api/stream/readings/arduino',
  'power': '/api/stream/readings/power',
  'system': '/api/stream/readings/system_monitor',
  'radio': '/api/stream/readings/radio',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow GET for SSE
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(req.url);
    const streamType = url.searchParams.get('type') || 'readings';
    const sessionCookie = url.searchParams.get('session');
    const clientId = url.searchParams.get('client_id');
    const commandId = url.searchParams.get('command_id');

    // Check if stream type is valid
    let endpoint = STREAM_ENDPOINTS[streamType];
    
    // Special case for command status
    if (streamType === 'command' && commandId) {
      endpoint = `/api/stream/commands/${commandId}/status`;
    }
    
    if (!endpoint) {
      return new Response(JSON.stringify({ error: 'Invalid stream type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Require session for protected streams
    if (!sessionCookie) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build Aurora URL with optional client_id filter
    const auroraUrl = new URL(`${AURORA_ENDPOINT}${endpoint}`);
    if (clientId && clientId !== 'all') {
      auroraUrl.searchParams.set('client_id', clientId);
    }

    console.log(`SSE Proxy connecting to: ${auroraUrl.toString()}`);

    // Connect to Aurora SSE endpoint
    const response = await fetch(auroraUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cookie': sessionCookie,
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      console.error(`Aurora SSE error: ${response.status}`);
      return new Response(JSON.stringify({ 
        error: 'Aurora stream unavailable',
        status: response.status 
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if response is actually SSE
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('text/event-stream')) {
      console.error(`Aurora returned non-SSE content: ${contentType}`);
      return new Response(JSON.stringify({ 
        error: 'Aurora stream not available',
        contentType 
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Stream the SSE response through to the client
    const sseHeaders = {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    };

    // Return the stream directly
    return new Response(response.body, {
      status: 200,
      headers: sseHeaders,
    });

  } catch (error) {
    console.error("SSE Proxy error:", error);
    return new Response(JSON.stringify({ 
      error: 'Stream connection failed',
      details: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
