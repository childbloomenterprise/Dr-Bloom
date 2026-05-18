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

  // Insert connection request into Dr Bloom — RLS enforces doctor_id = auth.uid()
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

  // Look up the child's parent in ChildBloom to send them a notification
  const cbAdmin = createChildBloomAdminClient();
  const { data: child } = await cbAdmin
    .from('children')
    .select('parent_id, first_name, last_name')
    .eq('id', childId)
    .single();

  if (child?.parent_id) {
    // Look up doctor's name from Dr Bloom
    const drBloomAdmin = createAdminClient();
    const { data: doctor } = await drBloomAdmin
      .from('user_profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    // Notify parent via ChildBloom notifications table (recipient_id + type columns match)
    await cbAdmin.from('notifications').insert({
      recipient_id: child.parent_id,
      type: 'connection_request',
      title: `Dr. ${doctor?.full_name ?? 'A doctor'} requested access`,
      body: `A doctor has requested access to ${child.first_name}'s health data in Dr Bloom.${message ? ` Message: "${message}"` : ''}`,
      data: { doctor_id: user.id, child_id: childId },
    });
  }

  return NextResponse.json({ ok: true });
}
