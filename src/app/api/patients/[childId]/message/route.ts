// Doctor → Parent message.
// Inserts a notification into ChildBloom's notifications table so the parent
// sees it as a real-time toast (via useNotifications) and in their inbox.
// Chess check: notifications is in supabase_realtime publication ✓ (migration 015)
//              RLS: recipient_id = auth.uid() ✓ (parent will read their own)
//              sender_id / sender_name columns added in migration 016 ✓

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createChildBloomAdminClient } from '@/lib/supabase/childbloom-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyDoctorConnection } from '@/lib/childbloom/fetch';

interface Params { params: Promise<{ childId: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { childId } = await params;
  const supabase    = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Only connected doctors may message this child's parent
  const connected = await verifyDoctorConnection(user.id, childId);
  if (!connected) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { message } = await req.json() as { message?: string };
  if (!message?.trim()) return NextResponse.json({ error: 'message required' }, { status: 400 });

  const cbAdmin    = createChildBloomAdminClient();
  const drAdmin    = createAdminClient();

  // Fetch doctor's display name and the child's parent_id in parallel
  const [{ data: doctorProfile }, { data: child }] = await Promise.all([
    drAdmin.from('user_profiles').select('full_name').eq('id', user.id).single(),
    cbAdmin.from('children').select('parent_id, first_name').eq('id', childId).single(),
  ]);

  if (!child?.parent_id) return NextResponse.json({ error: 'Child not found' }, { status: 404 });

  const doctorName = doctorProfile?.full_name ?? 'Your doctor';
  const childName  = child.first_name ?? 'your child';

  const { error } = await cbAdmin.from('notifications').insert({
    recipient_id: child.parent_id,
    type:         'doctor_message',
    title:        `Dr. ${doctorName} sent a note about ${childName}`,
    body:         message.trim(),
    data:         { doctor_id: user.id, child_id: childId },
    sender_id:    user.id,
    sender_name:  doctorName,
    sender_role:  'doctor',
  });

  if (error) {
    console.error('[patients/message] notification insert failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
