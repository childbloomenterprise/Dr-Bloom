import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createChildBloomAdminClient } from '@/lib/supabase/childbloom-admin';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { childId, message } = await req.json();
  if (!childId) return NextResponse.json({ error: 'childId required' }, { status: 400 });

  const cbAdmin = createChildBloomAdminClient();
  const drBloomAdmin = createAdminClient();

  // Fetch doctor name + specialty from Dr Bloom in parallel with child lookup
  const [
    { data: doctorProfile },
    { data: doctorSpecialty },
    { data: child },
  ] = await Promise.all([
    drBloomAdmin.from('user_profiles').select('full_name').eq('id', user.id).single(),
    drBloomAdmin.from('doctor_profiles').select('specialty').eq('id', user.id).maybeSingle(),
    cbAdmin.from('children').select('parent_id, first_name, last_name').eq('id', childId).single(),
  ]);

  const doctorDisplayName = doctorProfile?.full_name ?? null;
  const specialty = doctorSpecialty?.specialty ?? null;

  // Insert connection into Dr Bloom (doctor-side record, RLS-enforced)
  const { error: connError } = await supabase.from('doctor_child_connections').insert({
    doctor_id: user.id,
    child_id: childId,
    status: 'pending',
    initiated_by: 'doctor',
    request_message: message ?? null,
  });

  if (connError) {
    return NextResponse.json({ error: connError.message }, { status: 500 });
  }

  // Mirror connection into ChildBloom so the parent's inbox shows it.
  // Upsert is safe because (doctor_id, child_id) has a unique constraint.
  const { error: cbConnError } = await cbAdmin.from('doctor_child_connections').upsert(
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

  if (cbConnError) {
    console.error('[connect] ChildBloom connection mirror failed:', cbConnError);
    // Non-fatal: Dr Bloom's own record was created; inform caller but don't block.
  }

  // Notify parent via ChildBloom notifications table (triggers realtime toast in app).
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
      console.error('[connect] ChildBloom notification insert failed:', notifError);
    }
  }

  return NextResponse.json({ ok: true, cbMirrorOk: !cbConnError });
}
