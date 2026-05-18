'use client';
import * as React from 'react';
import { theme as T } from '@/lib/theme';
import { Stack, HRow, Card, Display, Body, Mono, Eyebrow, Avatar, Chip, Spacer, Spark, Divider } from '@/components/primitives';
import { TopBar } from '@/components/shell/TopBar';
import { Icon } from '@/components/Icon';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Props { notifications: any[]; children: any[]; vitals: any[]; userId: string; }

export function InsightsClient({ notifications, children, vitals, userId }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [isMobile, setIsMobile] = React.useState(false);
  const [liveNotifs, setLiveNotifs] = React.useState(notifications);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check(); window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Realtime notifications
  React.useEffect(() => {
    const ch = supabase.channel('notifications-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => setLiveNotifs(prev => [payload.new as any, ...prev]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  async function markRead(id: string) {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    setLiveNotifs(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
  }

  async function markAllRead() {
    const unread = liveNotifs.filter(n => !n.read_at);
    await Promise.all(unread.map(n => supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', n.id)));
    setLiveNotifs(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
  }

  const unread = liveNotifs.filter(n => !n.read_at);
  const sleepData = vitals.slice(0, 14).map(v => v.sleep_hours ?? 0).reverse();
  const tempData = vitals.filter(v => v.temp_c).slice(0, 14).map(v => v.temp_c!).reverse();

  return (
    <div className="enter" style={{ height: '100vh', overflowY: 'auto', background: T.bg }}>
      <TopBar
        isMobile={isMobile}
        onMenu={() => (window as any).__drBloomOpenDrawer?.()}
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

        {/* Left: notifications */}
        <Stack gap={16}>
          <Card p={0}>
            <div style={{ padding: '18px 22px', borderBottom: `1px solid ${T.line}` }}>
              <HRow gap={10} style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Display size={20} italic weight={400}>All alerts.</Display>
                {unread.length > 0 && <Chip tone="wash">{unread.length} new</Chip>}
              </HRow>
            </div>
            {liveNotifs.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center' }}>
                <Body size={14} color={T.ink500}>No alerts yet. They appear here when Iris notices something worth your attention.</Body>
              </div>
            ) : liveNotifs.map((n, i) => (
              <div key={n.id} style={{
                display: 'flex', gap: 14, padding: '16px 22px', alignItems: 'flex-start',
                borderBottom: i < liveNotifs.length - 1 ? `1px solid ${T.line}` : 'none',
                background: n.read_at ? 'transparent' : T.brandTint,
                transition: 'background 0.15s',
              }}>
                <div style={{ width: 36, height: 36, borderRadius: T.radius.md, background: n.read_at ? T.surfaceDim : T.brandWash, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name={n.kind === 'milestone' ? 'milestone' : n.kind === 'vital' ? 'thermo' : 'sparkle'} size={16} color={n.read_at ? T.ink400 : T.brand} />
                </div>
                <Stack gap={2} style={{ flex: 1 }}>
                  <Body size={14} weight={600} color={T.ink900}>{n.title}</Body>
                  {n.body && <Body size={12.5} color={T.ink500} lh={1.5}>{n.body}</Body>}
                  <Mono size={10} color={T.ink300}>{new Date(n.created_at).toLocaleString()}</Mono>
                </Stack>
                {!n.read_at && (
                  <button onClick={() => markRead(n.id)} style={{ flexShrink: 0, background: 'none', border: 'none', color: T.brand, fontFamily: T.sans, fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '4px 0' }}>
                    Read
                  </button>
                )}
              </div>
            ))}
          </Card>
        </Stack>

        {/* Right: trend charts */}
        <Stack gap={16}>
          <Card p={0} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px', borderBottom: `1px solid ${T.line}` }}>
              <Eyebrow color={T.brand}>Iris · Active predictions</Eyebrow>
              <Display size={18} italic weight={400} style={{ marginTop: 4 }}>Pattern analysis.</Display>
            </div>
            <div style={{ padding: 20 }}>
              <Body size={13} color={T.ink500} lh={1.6}>
                {children.length === 0
                  ? 'Add a child profile and start logging vitals to receive pattern-based insights from Iris.'
                  : `Iris is monitoring ${children.length} profile${children.length > 1 ? 's' : ''}. Alerts appear above when patterns emerge in growth, sleep, temperature, or milestones.`}
              </Body>
            </div>
          </Card>

          {sleepData.length > 2 && (
            <Card p={20}>
              <Eyebrow color={T.ink400} style={{ marginBottom: 12 }}>Sleep trend</Eyebrow>
              <Spark points={sleepData} w={280} h={64} color={T.brandSoft} />
              <Body size={11} color={T.ink400} style={{ marginTop: 8 }}>
                Avg {(sleepData.reduce((a, b) => a + b, 0) / sleepData.length).toFixed(1)}h over last {sleepData.length} entries
              </Body>
            </Card>
          )}

          {tempData.length > 2 && (
            <Card p={20}>
              <Eyebrow color={T.ink400} style={{ marginBottom: 12 }}>Temperature trend</Eyebrow>
              <Spark points={tempData} w={280} h={64} color={T.accent} />
              <Body size={11} color={T.ink400} style={{ marginTop: 8 }}>
                Last: {tempData[tempData.length - 1]}°C
              </Body>
            </Card>
          )}

          <Card p={20}>
            <Eyebrow color={T.ink400} style={{ marginBottom: 12 }}>Children monitored</Eyebrow>
            {children.length === 0
              ? <Body size={13} color={T.ink500}>No children yet.</Body>
              : children.map(c => (
                <HRow key={c.id} gap={10} style={{ padding: '8px 0', alignItems: 'center', borderBottom: `1px solid ${T.line}` }}>
                  <Avatar name={c.name} size={32} tone="wash" />
                  <Body size={13.5} weight={500} color={T.ink900}>{c.name}</Body>
                  <div style={{ width: 6, height: 6, borderRadius: 3, background: T.success, marginLeft: 'auto' }} />
                </HRow>
              ))}
          </Card>
        </Stack>
      </div>
    </div>
  );
}
