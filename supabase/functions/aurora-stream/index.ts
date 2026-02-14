const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const AURORA_ENDPOINT = "http://aurora.tophatsecurity.com:9151";

// SSE stream types and their endpoints
// Only includes endpoints confirmed in Aurora API docs at /docs#/Real-Time%20Streams
const STREAM_ENDPOINTS: Record<string, string> = {
  // Sensor-specific reading streams (confirmed in API docs)
  'starlink_readings': '/api/stream/readings/starlink',
  'thermal': '/api/stream/readings/thermal_probe',
  'gps': '/api/stream/readings/gps',
  'adsb': '/api/stream/readings/adsb',
  'arduino': '/api/stream/readings/arduino',
  'power': '/api/stream/readings/power',
  'system': '/api/stream/readings/system_monitor',
  'radio': '/api/stream/readings/radio',
  // Aliases for backward compatibility
  'starlink': '/api/stream/readings/starlink',
  'readings': '/api/stream/readings/starlink', // fallback to a known endpoint
  // These may exist but aren't in docs yet - try them anyway
  'alerts': '/api/stream/alerts',
  'dashboard': '/api/stream/dashboard/stats',
  'dashboard_clients': '/api/stream/dashboard/clients',
  'clients': '/api/stream/clients',
  'map_positions': '/api/stream/map/positions',
  'system_health': '/api/stream/system/health',
  'realtime': '/api/realtime/stream',
  'realtime_full': '/api/realtime/stream/full',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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
    const auroraToken = url.searchParams.get('token');
    const clientId = url.searchParams.get('client_id');
    const commandId = url.searchParams.get('command_id');
    const sensorType = url.searchParams.get('sensor_type');

    // Check if stream type is valid
    let endpoint = STREAM_ENDPOINTS[streamType];
    
    // Special case for command status
    if (streamType === 'command' && commandId) {
      endpoint = `/api/stream/commands/${commandId}/status`;
    }
    
    // Special case for specific client stream
    if (streamType === 'client' && clientId) {
      endpoint = `/api/stream/clients/${clientId}`;
    }
    
    // Special case for generic sensor type stream
    if (streamType === 'sensor' && sensorType) {
      endpoint = `/api/stream/readings/${sensorType}`;
    }
    
    if (!endpoint) {
      return new Response(JSON.stringify({ error: 'Invalid stream type', available: Object.keys(STREAM_ENDPOINTS) }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Authentication: accept token (Supabase JWT or Aurora token) or session cookie
    // If a Supabase JWT is provided, we validate it and use the AURORA_API_KEY for upstream
    let upstreamToken = auroraToken;
    
    if (!auroraToken && !sessionCookie) {
      return new Response(JSON.stringify({ error: 'Not authenticated. Provide token or session param.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If we got a token, try to validate it as a Supabase JWT
    if (auroraToken) {
      try {
        const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: `Bearer ${auroraToken}` } },
        });
        const { data, error: authError } = await supabase.auth.getUser(auroraToken);
        if (!authError && data?.user) {
          console.log(`SSE authenticated user: ${data.user.email}`);
          // Use AURORA_API_KEY for upstream instead of the Supabase JWT
          upstreamToken = Deno.env.get('AURORA_API_KEY') || auroraToken;
        }
      } catch (e) {
        console.warn('JWT validation failed, using token as-is:', e);
      }
    }

    // Build Aurora URL with optional client_id filter
    const auroraUrl = new URL(`${AURORA_ENDPOINT}${endpoint}`);
    if (clientId && clientId !== 'all' && streamType !== 'client') {
      auroraUrl.searchParams.set('client_id', clientId);
    }

    console.log(`SSE Proxy connecting to: ${auroraUrl.toString()} (auth: ${auroraToken ? 'token' : 'cookie'})`);

    // Build headers - support both token and cookie auth
    const fetchHeaders: Record<string, string> = {
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
    };
    if (upstreamToken) {
      fetchHeaders['Authorization'] = `Bearer ${upstreamToken}`;
      fetchHeaders['X-API-Key'] = upstreamToken;
    }
    if (sessionCookie) {
      fetchHeaders['Cookie'] = sessionCookie;
    }

    // Connect to Aurora SSE endpoint
    const response = await fetch(auroraUrl.toString(), {
      method: 'GET',
      headers: fetchHeaders,
    });

    if (!response.ok) {
      console.error(`Aurora SSE error: ${response.status}`);
      return new Response(JSON.stringify({ 
        error: 'Aurora streaming not available',
        status: response.status,
        fallback: 'polling',
        message: 'SSE streaming endpoints not available on Aurora server. Use polling instead.'
      }), {
        status: 503,
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
