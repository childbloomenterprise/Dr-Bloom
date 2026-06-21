'use client';
import * as React from 'react';
import { theme as T } from '@/lib/theme';
import { Stack, HRow, Card, Display, Body, Mono, Eyebrow, Avatar, Chip } from '@/components/primitives';
import { TopBar } from '@/components/shell/TopBar';
import { Icon } from '@/components/Icon';
import { createClient } from '@/lib/supabase/client';

interface NotificationRow {
  id: string; type: string | null; title: string; body: string | null;
  is_read: boolean; read_at: string | null; created_at: string;
}
interface ChildRow { id: string; first_name: string; last_name: string | null; }
interface Props { notifications: NotificationRow[]; children: ChildRow[]; userId: string; }

function iconForType(type: string | null): string {
  if (!type) return 'sparkle';
  if (type.includes('vacc')) return 'shield';
  if (type.includes('prescription')) return 'note';
  if (type.includes('visit') || type.includes('consult')) return 'note';
  if (type.includes('connection')) return 'profile';
  if (type.includes('milestone')) return 'milestone';
  return 'sparkle';
}

export function InsightsClient({ notifications, children, userId }: Props) {
  const supabase = createClient();
  const [isMobile, setIsMobile] = React.useState(false);
  const [liveNotifs, setLiveNotifs] = React.useState<NotificationRow[]>(notifications);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check(); window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Realtime — new doctor notifications (unified schema, recipient_id).
  React.useEffect(() => {
    const ch = supabase.channel('insights-notifs')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` },
        (payload) => setLiveNotifs(prev => [payload.new as NotificationRow, ...prev]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, supabase]);

  async function markRead(id: string) {
    const now = new Date().toISOString();
    setLiveNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true, read_at: now } : n));
    try { await supabase.from('notifications').update({ is_read: true, read_at: now }).eq('id', id); } catch { /* local state already updated */ }
  }
  async function markAllRead() {
    const now = new Date().toISOString();
    const unreadIds = liveNotifs.filter(n => !n.is_read).map(n => n.id);
    setLiveNotifs(prev => prev.map(n => n.is_read ? n : { ...n, is_read: true, read_at: now }));
    if (unreadIds.length) {
      try { await supabase.from('notifications').update({ is_read: true, read_at: now }).in('id', unreadIds); } catch { /* local state already updated */ }
    }
  }

  const unread = liveNotifs.filter(n => !n.is_read);

  return (
    <div className="enter" style={{ height: '100vh', overflowY: 'auto', background: T.bg }}>
      <TopBar
        isMobile={isMobile}
        onMenu={() => (window as unknown as { __drBloomOpenDrawer?: () => void }).__drBloomOpenDrawer?.()}
        eyebrow="IRIS · INSIGHTS"
        title="Insights."
        subtitle={`${unread.length} unread alert${unread.length !== 1 ? 's' : ''}`}
        trailing={unread.length > 0 ? (
          <button onClick={markAllRead} style={{ height: 40, padding: '0 16px', borderRadius: T.radius.pill, background: T.brandWash, color: T.brand, border: 'none', fontFamily: T.sans, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Mark all read
          </button>
        ) : undefined}
      />

      <div style={{ padding: isMobile ? '16px 14px 40px' : '24px 32px 48px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap: 20 }}>

        {/* Left: alerts */}
        <Stack gap={16}>
          <div className="enter stagger-1">
            <Card p={0}>
              <div style={{ padding: '18px 22px', borderBottom: `1px solid ${T.line}` }}>
                <HRow gap={10} style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <Display size={20} italic weight={400}>All alerts.</Display>
                  {unread.length > 0 && <Chip tone="wash">{unread.length} new</Chip>}
                </HRow>
              </div>
              {liveNotifs.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center' }}>
                  <Body size={14} color={T.ink500}>No alerts yet. Updates from your connected patients — new prescriptions, visit summaries, vaccines, and access approvals — appear here.</Body>
                </div>
              ) : liveNotifs.map((n, i) => (
                <div key={n.id} className={`slide-right stagger-${Math.min(i + 1, 6)}`} style={{
                  display: 'flex', gap: 14, padding: '16px 22px', alignItems: 'flex-start',
                  borderBottom: i < liveNotifs.length - 1 ? `1px solid ${T.line}` : 'none',
                  background: n.is_read ? 'transparent' : T.brandTint,
                  transition: 'background 0.2s, transform 0.18s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateX(3px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateX(0)'; }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: T.radius.md,
                    background: n.is_read ? T.surfaceDim : T.brandWash,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon name={iconForType(n.type)} size={16} color={n.is_read ? T.ink400 : T.brand} />
                  </div>
                  <Stack gap={2} style={{ flex: 1 }}>
                    <Body size={14} weight={600} color={T.ink900}>{n.title}</Body>
                    {n.body && <Body size={12.5} color={T.ink500} lh={1.5}>{n.body}</Body>}
                    <Mono size={10} color={T.ink300}>{new Date(n.created_at).toLocaleString()}</Mono>
                  </Stack>
                  {!n.is_read && (
                    <button
                      onClick={() => markRead(n.id)}
                      style={{ flexShrink: 0, background: 'none', border: 'none', color: T.brand, fontFamily: T.sans, fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '4px 8px', borderRadius: T.radius.pill }}
                      onMouseEnter={e => { e.currentTarget.style.background = T.brandWash; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                    >
                      Read
                    </button>
                  )}
                </div>
              ))}
            </Card>
          </div>
        </Stack>

        {/* Right: monitored patients */}
        <Stack gap={16}>
          <div className="enter stagger-2">
            <Card p={0} style={{ overflow: 'hidden' }}>
              <div style={{ padding: '18px 20px', borderBottom: `1px solid ${T.line}` }}>
                <Eyebrow color={T.brand}>Iris · Monitoring</Eyebrow>
                <Display size={18} italic weight={400} style={{ marginTop: 4 }}>Your patients.</Display>
              </div>
              <div style={{ padding: 20 }}>
                <Body size={13} color={T.ink500} lh={1.6}>
                  {children.length === 0
                    ? 'Connect to a child in Patients to start monitoring. Alerts appear on the left as parents log data and you record care.'
                    : `Iris is monitoring ${children.length} connected patient${children.length > 1 ? 's' : ''}. Alerts surface on the left when something needs your attention.`}
                </Body>
              </div>
            </Card>
          </div>

          <div className="enter stagger-3">
            <Card p={20}>
              <Eyebrow color={T.ink400} style={{ marginBottom: 12 }}>Patients monitored</Eyebrow>
              {children.length === 0
                ? <Body size={13} color={T.ink500}>No connected patients yet.</Body>
                : children.map((c) => (
                  <HRow key={c.id} gap={10} style={{ padding: '8px 0', alignItems: 'center', borderBottom: `1px solid ${T.line}` }}>
                    <Avatar name={c.first_name} size={32} tone="wash" />
                    <Body size={13.5} weight={500} color={T.ink900}>{[c.first_name, c.last_name].filter(Boolean).join(' ')}</Body>
                    <div className="dot-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: T.success, marginLeft: 'auto' }} />
                  </HRow>
                ))}
            </Card>
          </div>
        </Stack>
      </div>
    </div>
  );
}
