import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { parentEmail, childName, childDob } = await req.json();
  if (!parentEmail) return NextResponse.json({ error: 'parentEmail required' }, { status: 400 });

  // RLS enforces invited_by = auth.uid()
  const { data, error } = await supabase.from('childbloom_invites').insert({
    invited_by: user.id,
    parent_email: parentEmail,
    child_name: childName ?? null,
    child_dob: childDob ?? null,
  }).select('invite_token').single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // TODO: send invite email via email provider (e.g. Resend / SendGrid)
  // The invite_token is available at data.invite_token
  console.log(`[invite] Token for ${parentEmail}: ${data?.invite_token}`);

  return NextResponse.json({ ok: true });
}
