import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { userId, title, body, kind, link } = await req.json() as {
    userId?: string;
    title: string;
    body?: string;
    kind?: string;
    link?: string;
  };

  const targetUser = userId ?? user.id;

  const { error } = await supabase.from('notifications').insert({
    recipient_id: targetUser,
    type: kind ?? 'general',
    title,
    body: body ?? '',
    data: link ? { link } : null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
