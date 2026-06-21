import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createChildBloomAdminClient } from '@/lib/supabase/childbloom-admin';

// Unified (single-source) connect: a doctor requests access to a ChildBloom child.
// Everything lives in the ChildBloom project now — one doctor_child_connections
// row (no dual-write / no stale Dr-Bloom-side copy), and doctor identity is read
// from the unified user_profiles + doctor_profiles (not the old empty per-app DB).
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { childId, message } = await req.json();
  if (!childId) return NextResponse.json({ error: 'childId required' }, { status: 400 });

  const cbAdmin = createChildBloomAdminClient();

  // Doctor identity + child/parent — all from the unified store.
  const [
    { data: doctorProfile },
    { data: doctorSpecialty },
    { data: child },
  ] = await Promise.all([
    cbAdmin.from('user_profiles').select('full_name').eq('id', user.id).maybeSingle(),
    cbAdmin.from('doctor_profiles').select('specialty').eq('id', user.id).maybeSingle(),
    cbAdmin.from('children').select('parent_id, first_name, last_name').eq('id', childId).single(),
  ]);

  const doctorDisplayName = doctorProfile?.full_name ?? null;
  const specialty = doctorSpecialty?.specialty ?? null;

  // Single connection row in ChildBloom. Upsert on the (doctor_id, child_id)
  // unique constraint so a re-request updates rather than 409s.
  const { error: connError } = await cbAdmin.from('doctor_child_connections').upsert(
    {
      doctor_id: user.id,
      child_id: childId,
      status: 'pending',
      initiated_by: 'doctor',
      request_message: message ?? null,
      doctor_display_name: doctorDisplayName,
      doctor_specialty: specialty,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'doctor_id,child_id' }
  );
  if (connError) {
    return NextResponse.json({ error: connError.message }, { status: 500 });
  }

  // Notify the parent (realtime toast + inbox in ChildBloom).
  let parentNotified = false;
  if (child?.parent_id) {
    const childName = child.first_name ?? 'your child';
    const { error: notifError } = await cbAdmin.from('notifications').insert({
      recipient_id: child.parent_id,
      type: 'connection_request',
      title: `Dr. ${doctorDisplayName ?? 'A doctor'} requested access`,
      body: `A doctor has requested access to ${childName}'s health data in Dr Bloom.${message ? ` Message: "${message}"` : ''}`,
      data: { doctor_id: user.id, child_id: childId },
    });
    if (notifError) {
      console.error('[connect] notification insert failed:', notifError);
    } else {
      parentNotified = true;
    }
  }

  return NextResponse.json({ ok: true, parentNotified });
}
