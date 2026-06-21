import { createClient } from '@supabase/supabase-js';

export function createChildBloomAdminClient() {
  // After the Stage 3 auth cutover the whole app lives on ONE Supabase project,
  // so CHILDBLOOM_* become optional and fall back to the primary project env.
  // Pre-cutover they point at ChildBloom explicitly. Either way this resolves.
  const url = process.env.CHILDBLOOM_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.CHILDBLOOM_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('No Supabase admin credentials: set CHILDBLOOM_SUPABASE_URL/CHILDBLOOM_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
