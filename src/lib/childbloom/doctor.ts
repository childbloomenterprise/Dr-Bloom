// Doctor identity + cross-app write helpers for the ChildBloom (unified) store.
//
// Why this exists: the connected doctor authenticates in the *Dr Bloom* Supabase
// project, so their auth id is NOT a row in ChildBloom's `user_profiles`. But every
// clinical table we write into ChildBloom (consultations, prescriptions,
// vaccination_records) has an FK doctor_id/logged_by -> user_profiles.id. ChildBloom's
// user_profiles.id has NO FK to auth.users, so we can safely upsert a lightweight
// "shadow" doctor row before any clinical write. See the architecture memo.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface DoctorIdentity {
  id: string;
  fullName: string;
  specialty: string | null;
}

// Pull the doctor's display name + specialty from the connection mirror in ChildBloom
// (written by the connect route). This is the reliable source — the doctor isn't a
// ChildBloom user otherwise.
export async function getDoctorIdentity(
  cbAdmin: SupabaseClient,
  doctorId: string,
): Promise<{ fullName: string; specialty: string | null }> {
  const { data } = await cbAdmin
    .from('doctor_child_connections')
    .select('doctor_display_name, doctor_specialty')
    .eq('doctor_id', doctorId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return {
    fullName: data?.doctor_display_name ?? 'Your doctor',
    specialty: data?.doctor_specialty ?? null,
  };
}

// Ensure a shadow doctor identity exists in ChildBloom so clinical FKs resolve.
// user_profiles.id FKs auth.users.id, and the REST client can't write to the auth
// schema — so this goes through the ensure_doctor_shadow SECURITY DEFINER RPC, which
// seeds both auth.users and user_profiles with the doctor's existing id. Idempotent.
export async function ensureDoctorProfile(
  cbAdmin: SupabaseClient,
  doctor: { id: string; email?: string | null; fullName: string; specialty?: string | null },
): Promise<void> {
  const { error } = await cbAdmin.rpc('ensure_doctor_shadow', { p_id: doctor.id, p_name: doctor.fullName });
  if (error) console.error('[ensureDoctorProfile] failed:', error.message);
}

// Send a notification to the child's parent in ChildBloom (realtime inbox channel).
// This is the parent's reliable view of doctor-authored clinical events, since the
// clinical tables themselves are doctor-scoped under RLS.
export async function notifyParent(
  cbAdmin: SupabaseClient,
  args: {
    recipientId: string;
    type: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    sender: DoctorIdentity;
  },
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await cbAdmin.from('notifications').insert({
    recipient_id: args.recipientId,
    type: args.type,
    title: args.title,
    body: args.body,
    data: args.data ?? null,
    sender_id: args.sender.id,
    sender_name: args.sender.fullName,
    sender_role: 'doctor',
  });
  if (error) {
    console.error('[notifyParent] insert failed:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
