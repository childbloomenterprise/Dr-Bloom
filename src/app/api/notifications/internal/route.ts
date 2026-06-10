// Internal cross-app notification endpoint.
// ChildBloom's backend calls this (with X-Internal-Key) when a parent
// approves or declines a doctor's connection request, so the doctor gets
// a real-time toast in Dr. Bloom without requiring cross-Supabase auth.
//
// Auth: X-Internal-Key must equal DRBLOOM_INTERNAL_KEY — a dedicated
// least-privilege secret shared only for this notify channel. The legacy
// CHILDBLOOM_SERVICE_ROLE_KEY is still accepted during the transition so
// neither app breaks if it deploys first; remove it once both sides are
// confirmed on the new key.

import { type NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const key = req.headers.get('x-internal-key');
  const validKeys = [
    process.env.DRBLOOM_INTERNAL_KEY,
    process.env.CHILDBLOOM_SERVICE_ROLE_KEY, // legacy — drop after rollout
  ].filter(Boolean);
  if (!key || !validKeys.includes(key)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { doctor_id, event_type, title, body } = await req.json() as {
    doctor_id: string;
    event_type: string;
    title: string;
    body?: string;
  };

  if (!doctor_id || !event_type || !title) {
    return NextResponse.json({ error: 'doctor_id, event_type, title required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from('notifications').insert({
    recipient_id: doctor_id,
    type:         event_type,
    title,
    body:         body ?? '',
    data:         null,
  });

  if (error) {
    console.error('[notifications/internal] insert failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
