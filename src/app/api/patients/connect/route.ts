import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { childId, message } = await req.json();
  if (!childId) return NextResponse.json({ error: 'childId required' }, { status: 400 });

  // Insert connection request — RLS enforces doctor_id = auth.uid() and role = doctor
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

  // Look up the parent to notify them (admin client to get parent_id)
  const admin = createAdminClient();
  const { data: child } = await admin
    .from('children')
    .select('parent_id, first_name, last_name')
    .eq('id', childId)
    .single();

  if (child?.parent_id) {
    const { data: doctor } = await admin
      .from('user_profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    await admin.from('notifications').insert({
      recipient_id: child.parent_id,
      type: 'connection_request',
      title: `Dr. ${doctor?.full_name ?? 'A doctor'} requested access`,
      body: `A doctor has requested access to ${child.first_name}'s health data in Dr Bloom.${message ? ` Message: "${message}"` : ''}`,
      data: { doctor_id: user.id, child_id: childId },
    });
  }

  return NextResponse.json({ ok: true });
}
