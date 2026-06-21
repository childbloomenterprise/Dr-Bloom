'use server';

// Server action for saving the doctor's profile into the unified ChildBloom
// store (user_profiles + doctor_profiles). Runs server-side with the service
// role, so it works whether or not user_profiles/doctor_profiles expose
// self-update RLS — and it adds no new serverless route (function-count safe).

import { createClient } from '@/lib/supabase/server';
import { createChildBloomAdminClient } from '@/lib/supabase/childbloom-admin';

export async function saveDoctorProfile(input: { fullName: string; specialty: string }): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  const cbAdmin = createChildBloomAdminClient();
  const fullName = (input.fullName || '').trim() || 'Doctor';
  const specialty = (input.specialty || '').trim() || 'Pediatrics';
  const now = new Date().toISOString();

  const { error: upErr } = await cbAdmin.from('user_profiles').upsert(
    { id: user.id, email: user.email ?? `${user.id}@drbloom.doctor`, full_name: fullName, role: 'doctor', updated_at: now },
    { onConflict: 'id' },
  );
  if (upErr) return { ok: false, error: upErr.message };

  const { error: docErr } = await cbAdmin.from('doctor_profiles').upsert(
    { id: user.id, specialty, updated_at: now },
    { onConflict: 'id' },
  );
  if (docErr) return { ok: false, error: docErr.message };

  return { ok: true };
}
