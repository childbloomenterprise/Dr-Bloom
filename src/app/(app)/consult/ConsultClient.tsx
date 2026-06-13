'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { theme as T } from '@/lib/theme';
import { Stack, HRow, Card, Button, Display, Body, Mono, Eyebrow, Avatar, Chip, BloomFlower } from '@/components/primitives';
import { TopBar } from '@/components/shell/TopBar';
import { Icon } from '@/components/Icon';
import { createClient } from '@/lib/supabase/client';
import { ageFromDob } from '@/lib/age';
import type { UserRole, IrisMessage } from '@/types/database';
import type { ChildRow, ConsultRow } from './page';

interface Msg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface Props {
  userId: string;
  children: ChildRow[];
  consultations: ConsultRow[];
  activeConsult: ConsultRow | null;
  initialMessages: IrisMessage[];
  defaultChildId?: string;
  userRole: UserRole;
}

function irisToMsg(m: IrisMessage, i: number): Msg {
  return {
    id: `iris-${i}`,
    role: m.role,
    content: m.content,
    created_at: m.timestamp ?? new Date().toISOString(),
  };
}

function childDisplayName(c: ChildRow): string {
  return c.last_name ? `${c.first_name} ${c.last_name}` : c.first_name;
}

export function ConsultClient({
  userId, children, consultations, activeConsult, initialMessages,
  defaultChildId, userRole,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [isMobile, setIsMobile] = React.useState(false);
  const [selectedChild, setSelectedChild] = React.useState(defaultChildId ?? children[0]?.id ?? '');
  const [consult, setConsult] = React.useState<ConsultRow | null>(activeConsult);
  const [messages, setMessages] = React.useState<Msg[]>(initialMessages.map(irisToMsg));
  const [input, setInput] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [starting, setStarting] = React.useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check(); window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function startConsult() {
    if (!selectedChild) return;
    setStarting(true);
    const { data, error } = await supabase.from('consultations').insert({
      child_id: selectedChild,
      doctor_id: userId,
      status: 'in_progress',
    }).select('id, child_id, created_at, updated_at').single();
    if (error || !data) { setStarting(false); return; }
    setConsult(data as ConsultRow);
    setMessages([]);
    setStarting(false);
    router.push(`/consult?id=${data.id}`, { scroll: false });
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !consult || sending) return;
    setSending(true);
    const userMsg = input.trim();
    setInput('');

    const tempId = `temp-${Date.now()}`;
    const userMsgObj: Msg = { id: tempId, role: 'user', content: userMsg, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMsgObj]);

    const child = children.find(c => c.id === consult.child_id);
    const res = await fetch('/api/iris', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        consultationId: consult.id,
        message: userMsg,
        childName: child ? childDisplayName(child) : undefined,
        childAge: child?.date_of_birth ? ageFromDob(child.date_of_birth) : undefined,
        userRole,
        history: messages.slice(-8).map(m => ({ role: m.role, content: m.content })),
      }),
    });

    setSending(false);
    if (!res.ok) return;
    const json = await res.json() as { ok: boolean; reply?: string };
    if (json.reply) {
      setMessages(prev => [...prev, {
        id: `iris-${Date.now()}`,
        role: 'assistant',
        content: json.reply!,
        created_at: new Date().toISOString(),
      }]);
    }
  }

  const selectedChildData = children.find(c => c.id === (consult?.child_id ?? selectedChild));

  return (
    <div className="enter" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: T.bg }}>
      <TopBar
        isMobile={isMobile}
        onMenu={() => (window as Window & { __drBloomOpenDrawer?: () => void }).__drBloomOpenDrawer?.()}
        eyebrow="IRIS · AI CONSULTATION"
        title="Consult."
        subtitle="Ask Iris anything about your child's health."
      />

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: isMobile || consult ? '1fr' : '300px 1fr', minHeight: 0 }}>
        {/* Sidebar — past consults */}
        {!isMobile && !consult && (
          <div style={{ borderRight: `1px solid ${T.line}`, overflowY: 'auto', padding: 16 }}>
            <Eyebrow color={T.ink400} style={{ marginBottom: 12, padding: '0 4px' }}>Past consultations</Eyebrow>
            {consultations.length === 0
              ? <Body size={13} color={T.ink500} style={{ padding: '0 4px' }}>No consultations yet.</Body>
              : consultations.map(c => (
                <button key={c.id} onClick={() => router.push(`/consult?id=${c.id}`)} style={{
                  width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: T.radius.md,
                  background: 'transparent', border: 'none', cursor: 'pointer', marginBottom: 4,
                  transition: 'background 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = T.surfaceDim)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <Body size={13} weight={600} color={T.ink900}>
                    {children.find(ch => ch.id === c.child_id)
                      ? childDisplayName(children.find(ch => ch.id === c.child_id)!)
                      : 'Unknown patient'}
                  </Body>
                  <Mono size={10} color={T.ink400}>{new Date(c.created_at).toLocaleDateString()}</Mono>
                </button>
              ))}
          </div>
        )}

        {/* Main chat area */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {!consult ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
              <div className="enter" style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
                <div style={{ opacity: 0.15, marginBottom: 24 }}>
                  <BloomFlower size={180} animate />
                </div>
                <Display size={28} italic lh={1.1} style={{ marginBottom: 12 }}>Start a conversation.</Display>
                <Body size={14} color={T.ink500} lh={1.6} style={{ marginBottom: 28 }}>
                  Ask Iris about growth, feeding, sleep, symptoms, or anything on your mind.
                </Body>
                {children.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <select value={selectedChild} onChange={e => setSelectedChild(e.target.value)} style={{
                      width: '100%', height: 48, padding: '0 16px', borderRadius: T.radius.pill,
                      border: `1px solid ${T.line}`, background: T.surface, color: T.ink900,
                      fontFamily: T.sans, fontSize: 14, marginBottom: 12, outline: 'none',
                    }}>
                      <option value="">Select a patient…</option>
                      {children.map(c => (
                        <option key={c.id} value={c.id}>
                          {childDisplayName(c)}{c.date_of_birth ? ` (${ageFromDob(c.date_of_birth)})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {children.length === 0 && (
                  <Body size={13} color={T.ink500} style={{ marginBottom: 20 }}>
                    Connect with patients first via the Patients page.
                  </Body>
                )}
                <Button full size="lg" icon="sparkle" disabled={starting || !selectedChild} onClick={startConsult}>
                  {starting ? 'Starting…' : 'Start consultation'}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Child header */}
              {selectedChildData && (
                <div style={{ padding: '12px 20px', borderBottom: `1px solid ${T.line}`, background: T.surface }}>
                  <HRow gap={10} style={{ alignItems: 'center' }}>
                    <Avatar name={childDisplayName(selectedChildData)} size={32} tone="wash" />
                    <Body size={13.5} weight={600} color={T.ink900}>{childDisplayName(selectedChildData)}</Body>
                    {selectedChildData.date_of_birth && (
                      <Mono size={10}>{ageFromDob(selectedChildData.date_of_birth)}</Mono>
                    )}
                    <div style={{ marginLeft: 'auto' }}>
                      <Chip tone="wash" icon="sparkle">Iris active</Chip>
                    </div>
                  </HRow>
                </div>
              )}

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {messages.length === 0 && (
                  <div className="fade-in" style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Body size={14} color={T.ink400}>Send your first message to begin.</Body>
                  </div>
                )}
                {messages.map((msg, mi) => (
                  <div key={msg.id} className="slide-up" style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', animationDelay: `${Math.min(mi * 30, 200)}ms` }}>
                    {msg.role === 'assistant' ? (
                      <div style={{
                        maxWidth: '80%', background: T.brand, color: '#fff',
                        borderRadius: T.radius.lg, padding: '16px 20px', position: 'relative',
                        boxShadow: '0 4px 16px rgba(15,61,46,.25)',
                      }}>
                        <div style={{ position: 'absolute', top: 12, right: 12, opacity: 0.6, animation: 'breathe 3s ease-in-out infinite' }}>
                          <Icon name="sparkle" size={14} stroke={1.6} color="#fff" />
                        </div>
                        <div style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>Iris</div>
                        <div style={{ fontFamily: T.serif, fontSize: 17, lineHeight: 1.45, letterSpacing: T.serifTracking, paddingRight: 20 }}>
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <div style={{ maxWidth: '78%', background: T.surfaceDim, color: T.ink900, padding: '10px 16px', borderRadius: T.radius.lg, fontFamily: T.sans, fontSize: 14, lineHeight: 1.4, boxShadow: T.shadow.sm }}>
                        {msg.content}
                      </div>
                    )}
                  </div>
                ))}
                {sending && (
                  <div className="slide-up" style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{ background: T.brand, borderRadius: T.radius.lg, padding: '14px 20px', boxShadow: '0 4px 16px rgba(15,61,46,.2)' }}>
                      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                        {[0, 1, 2].map(i => (
                          <div key={i} className="pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.8)', animationDelay: `${i * 0.22}s` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <form onSubmit={sendMessage} style={{ padding: '12px 20px', borderTop: `1px solid ${T.line}`, background: T.surface }}>
                <HRow gap={10}>
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Ask Iris…"
                    disabled={sending}
                    style={{
                      flex: 1, height: 48, padding: '0 18px', borderRadius: T.radius.pill,
                      border: `1px solid ${T.line}`, background: T.bg, color: T.ink900,
                      fontFamily: T.sans, fontSize: 14, outline: 'none',
                      transition: 'border-color 0.18s, box-shadow 0.18s',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = T.brand; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(15,61,46,.12)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || sending}
                    style={{
                      width: 48, height: 48, borderRadius: T.radius.pill, background: T.brand,
                      border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
                      opacity: !input.trim() || sending ? 0.5 : 1, flexShrink: 0,
                      transition: 'transform 0.15s cubic-bezier(.22,.68,0,1.1), box-shadow 0.2s, opacity 0.15s',
                    }}
                    onMouseEnter={e => { if (input.trim() && !sending) { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(15,61,46,.35)'; } }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
                    onMouseDown={e => { if (input.trim() && !sending) e.currentTarget.style.transform = 'scale(0.94)'; }}
                    onMouseUp={e => { if (input.trim() && !sending) e.currentTarget.style.transform = 'scale(1.08)'; }}
                  >
                    <Icon name="send" size={18} color="#fff" />
                  </button>
                </HRow>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
