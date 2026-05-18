import { createClient } from '@supabase/supabase-js';

export function createChildBloomAdminClient() {
  const url = process.env.CHILDBLOOM_SUPABASE_URL!;
  const serviceKey = process.env.CHILDBLOOM_SERVICE_ROLE_KEY!;
  if (!url || !serviceKey) {
    throw new Error('CHILDBLOOM_SUPABASE_URL / CHILDBLOOM_SERVICE_ROLE_KEY not set in .env.local');
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
