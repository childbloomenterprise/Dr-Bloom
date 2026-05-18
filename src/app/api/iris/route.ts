import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAnthropic, hasAnthropic, IRIS_SYSTEM } from '@/lib/anthropic';
import { fetchAllChildDataForIris, verifyDoctorConnection } from '@/lib/childbloom/fetch';
import { buildIrisSystemPrompt } from '@/lib/childbloom/iris-context';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as {
    childId?: string;
    consultationId?: string;
    message: string;
    childName?: string;
    childAge?: string;
    userRole?: string;
    history?: { role: string; content: string }[];
  };

  const { childId, consultationId, message, childName, childAge, userRole, history = [] } = body;

  let systemPrompt: string;
  let reply: string;

  if (childId) {
    // ── Child-context path ──────────────────────────────────────────────────
    // Security gate: verify the calling doctor has an active connection
    const connected = await verifyDoctorConnection(user.id, childId);
    if (!connected) {
      return NextResponse.json({ error: 'Not connected to this patient' }, { status: 403 });
    }

    if (!hasAnthropic()) {
      reply = `(Demo mode — set ANTHROPIC_API_KEY to enable Iris) You asked: "${message}"`;
    } else {
      const childData = await fetchAllChildDataForIris(childId);
      systemPrompt = buildIrisSystemPrompt(childData);

      const anthropic = getAnthropic();
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1200,
        system: systemPrompt,
        messages: [
          ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          { role: 'user', content: message },
        ],
      });
      reply = response.content[0].type === 'text'
        ? response.content[0].text
        : 'No response generated.';
    }

    // Append full conversation turn to iris_conversations
    const updatedMessages = [
      ...history,
      { role: 'user', content: message },
      { role: 'assistant', content: reply },
    ];

    await supabase.from('iris_conversations').insert({
      user_id:         user.id,
      child_id:        childId,
      consultation_id: consultationId ?? null,
      context_type:    'consultation',
      messages:        updatedMessages,
    });

    return NextResponse.json({ ok: true, reply });
  }

  // ── General path (no childId) — existing consult flow preserved ────────────
  if (!hasAnthropic()) {
    reply = `Hi! I'm Iris, Dr Bloom's AI companion. (Set ANTHROPIC_API_KEY in .env.local to enable real responses.) You asked: "${message}"${childName ? ` — I'd love to help with ${childName}'s health once the API key is configured.` : ''}`;
  } else {
    systemPrompt = IRIS_SYSTEM
      + (childName ? `\n\nCurrent child: ${childName}${childAge ? `, ${childAge}` : ''}.` : '')
      + (userRole === 'doctor'
        ? '\nUser is a pediatrician — use clinical tone.'
        : '\nUser is a parent — use warm, accessible tone.');

    const anthropic = getAnthropic();
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user', content: message },
      ],
    });
    reply = response.content[0].type === 'text'
      ? response.content[0].text
      : 'I could not generate a response.';
  }

  // Persist conversation to iris_conversations
  if (consultationId) {
    const updatedMessages = [
      ...history,
      { role: 'user', content: message },
      { role: 'assistant', content: reply },
    ];
    await supabase.from('iris_conversations').insert({
      user_id: user.id,
      consultation_id: consultationId,
      context_type: 'consultation',
      messages: updatedMessages,
    });
    await supabase
      .from('consultations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', consultationId);
  }

  return NextResponse.json({ ok: true, reply });
}
