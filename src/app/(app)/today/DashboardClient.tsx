'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { theme as T } from '@/lib/theme';
import { greetingTime, ageFromDob } from '@/lib/age';
import { Stack, HRow, Spacer, Card, Display, Eyebrow, Body, Chip, Avatar, BloomFlower, Spark, Divider } from '@/components/primitives';
import { TopBar } from '@/components/shell/TopBar';
import { Icon } from '@/components/Icon';
import { createClient } from '@/lib/supabase/client';
import type { UserProfile, Child, HealthAlert, Notification } from '@/types/database';

interface ConsultationRow {
  id: string;
  child_id: string;
  visit_type: string;
  status: string;
  child: { first_name: string; last_name: string | null } | null;
}

interface AlertWithChild extends HealthAlert {
  child: { first_name: string; last_name: string | null } | null;
}

interface Props {
  profile: UserProfile | null;
  connectedChildren: Child[];
  healthAlerts: AlertWithChild[];
  notifications: Notification[];
  pendingConnectionCount: number;
  todayConsultations: ConsultationRow[];
}

const SEVERITY_COLOR: Record<string, string> = {
  info:      T.brandSoft,
  warning:   T.gold,
  urgent:    T.accent,
  emergency: T.danger,
};

const WELLNESS_TREND = [62, 65, 64, 68, 70, 71, 73, 72, 75, 77, 76, 78];

export function DashboardClient({ profile, connectedChildren, healthAlerts, notifications, pendingConnectionCount, todayConsultations }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [isMobile, setIsMobile] = React.useState(false);
  const [resolvingId, setResolvingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  async function resolveAlert(alertId: string) {
    setResolvingId(alertId);
    await supabase
      .from('health_alerts')
      .update({ resolved_at: new Date().toISOString(), resolved_by: profile?.id })
      .eq('id', alertId);
    setResolvingId(null);
    router.refresh();
  }

  const now = new Date();
  const dateLabel = now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
  const greeting = greetingTime();
  const firstName = (profile?.full_name ?? 'there').split(' ')[0] ?? 'there';
  const unreadCount = notifications.length;

  return (
    <div className="enter" style={{ height: '100vh', overflowY: 'auto', background: T.bg }}>
      <TopBar
        isMobile={isMobile}
        onMenu={() => (window as Window & { __drBloomOpenDrawer?: () => void }).__drBloomOpenDrawer?.()}
        eyebrow={dateLabel}
        title={<>{greeting}, <span style={{ fontStyle: 'italic' }}>Dr. {firstName}</span>.</>}
        subtitle={`${connectedChildren.length} patients · ${healthAlerts.length} active alert${healthAlerts.length !== 1 ? 's' : ''} · Iris ready`}
        trailing={
          <Link href="/consult">
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, height: 44, padding: '0 18px',
              borderRadius: T.radius.pill, background: T.brand, color: '#fff', border: 'none',
              fontFamily: T.sans, fontSize: 13.5, fontWeight: 600, letterSpacing: T.sansTracking, cursor: 'pointer',
            }}>
              <Icon name="sparkle" size={15} />
              New consultation
            </button>
          </Link>
        }
      />

      <div style={{ padding: isMobile ? '16px 14px 40px' : '24px 32px 48px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.6fr 1fr', gap: isMobile ? 14 : 20 }}>

        {/* LEFT */}
        <Stack gap={20}>

          {/* Pending Alerts — top of dashboard */}
          {healthAlerts.length > 0 && (
            <Card p={0}>
              <div style={{ padding: '16px 22px 12px', borderBottom: `1px solid ${T.line}` }}>
                <HRow gap={8} style={{ alignItems: 'center' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: T.danger }} />
                  <Eyebrow color={T.danger}>Active patient alerts</Eyebrow>
                </HRow>
              </div>
              <Stack gap={0}>
                {healthAlerts.map((alert, i) => (
                  <div
                    key={alert.id}
                    style={{
                      display: 'flex', gap: 14, padding: '14px 22px', alignItems: 'flex-start',
                      borderBottom: i < healthAlerts.length - 1 ? `1px solid ${T.line}` : 'none',
                      borderLeft: `3px solid ${SEVERITY_COLOR[alert.severity] ?? T.ink400}`,
                    }}
                  >
                    <Stack gap={3} style={{ flex: 1, minWidth: 0 }}>
                      <HRow gap={8} style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                        <Body size={13.5} weight={600} color={T.ink900}>{alert.title}</Body>
                        <Chip tone={alert.severity === 'emergency' || alert.severity === 'urgent' ? 'accent' : 'soft'}>
                          {alert.severity}
                        </Chip>
                        {alert.child && (
                          <Chip tone="wash">{alert.child.first_name} {alert.child.last_name ?? ''}</Chip>
                        )}
                      </HRow>
                      <Body size={12} color={T.ink500} lh={1.4}>{alert.description}</Body>
                    </Stack>
                    <button
                      onClick={() => resolveAlert(alert.id)}
                      disabled={resolvingId === alert.id}
                      style={{
                        height: 32, padding: '0 14px', borderRadius: T.radius.pill,
                        background: T.brandWash, color: T.brand, border: 'none',
                        fontFamily: T.sans, fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                        opacity: resolvingId === alert.id ? 0.5 : 1,
                      }}
                    >
                      {resolvingId === alert.id ? '…' : 'Resolve'}
                    </button>
                  </div>
                ))}
              </Stack>
            </Card>
          )}

          {/* Pending connection requests badge */}
          {pendingConnectionCount > 0 && (
            <Link href="/patients" style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px',
                borderRadius: T.radius.md, background: T.brandWash, cursor: 'pointer',
              }}>
                <Icon name="clock" size={16} color={T.brand} />
                <Body size={13} color={T.brand} weight={500}>
                  {pendingConnectionCount} connection request{pendingConnectionCount > 1 ? 's' : ''} awaiting parent approval
                </Body>
                <Icon name="chevron" size={14} stroke={1.6} color={T.brand} style={{ marginLeft: 'auto' }} />
              </div>
            </Link>
          )}

          {/* Hero brief */}
          <Card p={isMobile ? 18 : 26} style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: isMobile ? -80 : -50, top: -40, opacity: isMobile ? 0.1 : 0.18 }}>
              <BloomFlower size={isMobile ? 200 : 260} />
            </div>
            <div style={{ position: 'relative' }}>
              <Eyebrow color={T.brand}>Iris · Morning briefing</Eyebrow>
              <Spacer h={14} />
              <Display size={isMobile ? 22 : 28} italic weight={400} lh={1.2} style={{ maxWidth: 520 }}>
                {connectedChildren.length === 0
                  ? 'Search for patients to get started. Connect with parents in ChildBloom.'
                  : `${connectedChildren.length} connected patient${connectedChildren.length > 1 ? 's' : ''}. Iris is ready to help.`}
              </Display>
              <Spacer h={18} />
              <Body size={13.5} color={T.ink500} lh={1.6} style={{ maxWidth: 540 }}>
                Dr Bloom syncs patient data from ChildBloom so you see what parents log at home. Open a consultation anytime to chat with Iris.
              </Body>
              <Spacer h={20} />
              <HRow gap={8}>
                <Link href={connectedChildren.length === 0 ? '/patients' : '/consult'}>
                  <button style={{
                    height: 40, padding: '0 16px', borderRadius: T.radius.pill, background: T.brand,
                    color: '#fff', border: 'none', fontFamily: T.sans, fontSize: 13, fontWeight: 600,
                    display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                  }}>
                    <Icon name={connectedChildren.length === 0 ? 'profile' : 'sparkle'} size={14} />
                    {connectedChildren.length === 0 ? 'Find patients' : 'Open Iris'}
                  </button>
                </Link>
                {unreadCount > 0 && (
                  <Chip tone="wash">{unreadCount} new alert{unreadCount > 1 ? 's' : ''}</Chip>
                )}
              </HRow>
            </div>
          </Card>

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 12 }}>
            {[
              { label: 'Patients', value: String(connectedChildren.length), sub: 'Connected', data: [0, 1, 1, 2, 2, 2, connectedChildren.length] },
              { label: 'Alerts', value: String(healthAlerts.length), sub: 'Unresolved', data: [0, 0, 1, 1, 1, 1, healthAlerts.length] },
              { label: 'Consultations', value: String(todayConsultations.length || '—'), sub: 'Today', data: [0, 0, 0, 1, 1, 1, todayConsultations.length] },
              { label: 'Pending', value: String(pendingConnectionCount || '0'), sub: 'Awaiting approval', data: [0, 0, 0, 0, 0, pendingConnectionCount, pendingConnectionCount] },
            ].map(k => (
              <Card key={k.label} p={18} style={{ minHeight: 120 }}>
                <Eyebrow color={T.ink400}>{k.label}</Eyebrow>
                <Spacer h={10} />
                <div style={{ fontFamily: T.serif, fontSize: 30, fontWeight: 500, color: T.ink900, letterSpacing: T.serifTracking, lineHeight: 1 }}>{k.value}</div>
                <div style={{ marginTop: 10, overflow: 'hidden' }}>
                  <Spark points={k.data} w={160} h={32} color={T.brand} />
                </div>
                <Body size={11} color={T.ink400} style={{ marginTop: 6 }}>{k.sub}</Body>
              </Card>
            ))}
          </div>

          {/* Today's consultations */}
          {todayConsultations.length > 0 && (
            <Card p={0}>
              <div style={{ padding: '18px 22px 12px', borderBottom: `1px solid ${T.line}` }}>
                <Eyebrow color={T.ink400}>Today&apos;s patients</Eyebrow>
                <Display size={20} italic weight={400}>{todayConsultations.length} consultation{todayConsultations.length > 1 ? 's' : ''}.</Display>
              </div>
              {todayConsultations.map((c, i) => (
                <div key={c.id} style={{ display: 'flex', gap: 14, padding: '12px 22px', alignItems: 'center', borderBottom: i < todayConsultations.length - 1 ? `1px solid ${T.line}` : 'none' }}>
                  <Avatar name={c.child ? `${c.child.first_name} ${c.child.last_name ?? ''}` : '?'} size={38} tone="wash" />
                  <Stack gap={2} style={{ flex: 1 }}>
                    <Body size={13.5} weight={600} color={T.ink900}>
                      {c.child ? `${c.child.first_name} ${c.child.last_name ?? ''}` : 'Unknown'}
                    </Body>
                    <Mono size={10}>{c.visit_type}</Mono>
                  </Stack>
                  <Chip tone={c.status === 'completed' ? 'wash' : 'soft'}>{c.status}</Chip>
                </div>
              ))}
            </Card>
          )}

          {/* Connected patients list */}
          <Card p={0}>
            <div style={{ padding: '18px 22px 12px', borderBottom: `1px solid ${T.line}` }}>
              <HRow gap={12} style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack gap={2}>
                  <Eyebrow color={T.ink400}>Connected patients</Eyebrow>
                  <Display size={20} italic weight={400}>
                    {connectedChildren.length === 0 ? 'No patients yet.' : `${connectedChildren.length} patient${connectedChildren.length > 1 ? 's' : ''}.`}
                  </Display>
                </Stack>
                <Link href="/patients">
                  <button style={{ height: 36, padding: '0 14px', borderRadius: T.radius.pill, background: T.brand, color: '#fff', border: 'none', fontFamily: T.sans, fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <Icon name="profile" size={13} /> Patients
                  </button>
                </Link>
              </HRow>
            </div>
            {connectedChildren.length === 0 ? (
              <div style={{ padding: '32px 22px', textAlign: 'center' }}>
                <Body size={14} color={T.ink500}>No connected patients yet.</Body>
                <Spacer h={12} />
                <Link href="/patients">
                  <button style={{ height: 40, padding: '0 18px', borderRadius: T.radius.pill, background: T.brandWash, color: T.brand, border: 'none', fontFamily: T.sans, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Find patients →
                  </button>
                </Link>
              </div>
            ) : (
              connectedChildren.slice(0, 6).map((child, i) => (
                <Link key={child.id} href={`/patients/${child.id}`} style={{ textDecoration: 'none' }}>
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', gap: 16, padding: '14px 22px',
                      borderBottom: i < Math.min(connectedChildren.length, 6) - 1 ? `1px solid ${T.line}` : 'none',
                      cursor: 'pointer', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = T.surfaceDim)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Avatar name={`${child.first_name} ${child.last_name ?? ''}`} size={40} tone="wash" />
                    <Stack gap={3} style={{ flex: 1, minWidth: 0 }}>
                      <Body size={14} weight={600} color={T.ink900}>{child.first_name} {child.last_name ?? ''}</Body>
                      <Mono size={11}>{ageFromDob(child.date_of_birth)}{child.gender ? ` · ${child.gender}` : ''}</Mono>
                    </Stack>
                    <Icon name="chevron" size={14} stroke={1.6} color={T.ink300} />
                  </div>
                </Link>
              ))
            )}
          </Card>
        </Stack>

        {/* RIGHT */}
        <Stack gap={20}>
          {/* Notifications */}
          <Card p={20}>
            <HRow gap={10} style={{ alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <Stack gap={2}>
                <Eyebrow color={T.brand}>Iris · Alerts</Eyebrow>
                <Display size={18} italic weight={400}>Recent signals.</Display>
              </Stack>
              <div className="glow" style={{ width: 36, height: 36, borderRadius: 18, background: T.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="sparkle" size={16} stroke={1.8} color="#fff" />
              </div>
            </HRow>
            {notifications.length === 0 ? (
              <Body size={13} color={T.ink500}>All clear — no unread alerts.</Body>
            ) : (
              <Stack gap={10}>
                {notifications.slice(0, 4).map((n: Notification) => (
                  <div key={n.id} style={{ padding: '12px 14px', background: T.brandTint, borderRadius: T.radius.md }}>
                    <Body size={13.5} weight={600} color={T.ink900} lh={1.3}>{n.title}</Body>
                    {n.body && <Body size={12} color={T.ink500} lh={1.5} style={{ marginTop: 4 }}>{n.body}</Body>}
                  </div>
                ))}
              </Stack>
            )}
          </Card>

          {/* Quick actions */}
          <Card p={20}>
            <Eyebrow color={T.ink400} style={{ marginBottom: 12 }}>Quick actions</Eyebrow>
            <Stack gap={8}>
              {[
                { href: '/patients',  icon: 'profile',  label: 'Find patients' },
                { href: '/consult',   icon: 'sparkle',  label: 'Ask Iris' },
                { href: '/insights',  icon: 'growth',   label: 'View insights' },
                { href: '/emergency', icon: 'shield',   label: 'Emergency' },
              ].map(a => (
                <Link key={a.href} href={a.href}>
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                      borderRadius: T.radius.md, background: T.surfaceDim, cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = T.brandWash)}
                    onMouseLeave={e => (e.currentTarget.style.background = T.surfaceDim)}
                  >
                    <Icon name={a.icon} size={18} stroke={1.6} color={T.brand} />
                    <Body size={13.5} weight={500} color={T.ink900}>{a.label}</Body>
                    <Icon name="chevron" size={13} stroke={1.6} color={T.ink300} style={{ marginLeft: 'auto' }} />
                  </div>
                </Link>
              ))}
            </Stack>
          </Card>
        </Stack>
      </div>
    </div>
  );
}

function Mono({ children, size = 11, color }: { children: React.ReactNode; size?: number; color?: string }) {
  return <span style={{ fontFamily: T.mono, fontSize: size, color: color || T.ink400, letterSpacing: '0.04em' }}>{children}</span>;
}
