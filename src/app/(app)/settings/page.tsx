import * as React from 'react';
import { createClient } from '@/lib/supabase/server';
import { createChildBloomAdminClient } from '@/lib/supabase/childbloom-admin';
import { SettingsClient } from './SettingsClient';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Doctor identity lives in the unified ChildBloom store (user_profiles +
  // doctor_profiles), read via the service-role client. Resilient: a brand-new
  // doctor may not have rows yet.
  const cbAdmin = createChildBloomAdminClient();
  const [profile, doctor] = await Promise.all([
    cbAdmin.from('user_profiles').select('full_name, email').eq('id', user.id).maybeSingle()
      .then(r => r.data as { full_name: string | null; email: string | null } | null, () => null),
    cbAdmin.from('doctor_profiles').select('specialty').eq('id', user.id).maybeSingle()
      .then(r => r.data as { specialty: string | null } | null, () => null),
  ]);

  return (
    <SettingsClient
      userId={user.id}
      email={user.email ?? profile?.email ?? ''}
      fullName={profile?.full_name ?? ''}
      specialty={doctor?.specialty ?? ''}
    />
  );
}
