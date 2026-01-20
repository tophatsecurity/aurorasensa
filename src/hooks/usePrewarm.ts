import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Silent prewarm - makes a lightweight request to wake up the edge function
// without showing any error toasts or affecting connection status UI
export function usePrewarm() {
  const hasPrewarmed = useRef(false);

  useEffect(() => {
    if (hasPrewarmed.current) return;
    hasPrewarmed.current = true;

    const prewarm = async () => {
      const maxAttempts = 5;
      const baseDelay = 300;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          // Use a simple health check endpoint - this is fast and won't fail from missing auth
          const { error } = await supabase.functions.invoke('aurora-proxy', {
            body: { path: '/api/health', method: 'GET' },
          });

          if (!error) {
            console.log('✓ Edge function prewarmed successfully');
            return;
          }

          // Check if it's a boot error (cold start)
          const errorMsg = error.message?.toLowerCase() || '';
          const isColdStart = 
            errorMsg.includes('boot_error') ||
            errorMsg.includes('function failed to start') ||
            errorMsg.includes('503');

          if (isColdStart && attempt < maxAttempts - 1) {
            const delay = baseDelay * Math.pow(1.5, attempt);
            console.log(`⏳ Prewarming edge function... (attempt ${attempt + 1}/${maxAttempts})`);
            await new Promise(r => setTimeout(r, delay));
            continue;
          }

          // Non-cold-start error or max attempts reached - silently exit
          console.log('Prewarm completed (with fallback)');
          return;
        } catch (err) {
          // Network or other errors - silently continue
          if (attempt < maxAttempts - 1) {
            const delay = baseDelay * Math.pow(1.5, attempt);
            await new Promise(r => setTimeout(r, delay));
          }
        }
      }

      console.log('Prewarm completed (max attempts)');
    };

    // Start prewarming immediately on mount
    prewarm();
  }, []);
}

// Standalone prewarm function for use outside of React
export async function prewarmEdgeFunction(): Promise<boolean> {
  const maxAttempts = 5;
  const baseDelay = 300;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const { error } = await supabase.functions.invoke('aurora-proxy', {
        body: { path: '/api/health', method: 'GET' },
      });

      if (!error) {
        return true;
      }

      const errorMsg = error.message?.toLowerCase() || '';
      const isColdStart = 
        errorMsg.includes('boot_error') ||
        errorMsg.includes('function failed to start') ||
        errorMsg.includes('503');

      if (isColdStart && attempt < maxAttempts - 1) {
        const delay = baseDelay * Math.pow(1.5, attempt);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      return false;
    } catch {
      if (attempt < maxAttempts - 1) {
        const delay = baseDelay * Math.pow(1.5, attempt);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  return false;
}
