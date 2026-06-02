'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { theme as T } from '@/lib/theme';
import { ageFromDob } from '@/lib/age';
import { createClient } from '@/lib/supabase/client';
import {
  Stack, HRow, Card, Body, Eyebrow, Display,
  Avatar, Chip, Spark,
} from '@/components/primitives';
import { Icon } from '@/components/Icon';
import type {
  Child, UserProfile, DoctorChildConnection, Prescription, HealthAlert,
  SleepLog, FeedingLog, SymptomReport, Milestone, GrowthMeasurement,
} from '@/types/database';

type TabId = 'overview' | 'sleep' | 'feeding' | 'symptoms' | 'milestones' | 'growth';

interface Props {
  child: Child;
  parent: Pick<UserProfile, 'id' | 'full_name' | 'email'> | null;
  connection: DoctorChildConnection;
  preVisitNotes: string | null;
  preVisitNotesUpdatedAt: string | null;
  prescriptions: Partial<Prescription>[];
  healthAlerts: HealthAlert[];
  doctorId: string;
}

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview',   label: 'Overview',   icon: 'home'      },
  { id: 'sleep',      label: 'Sleep',      icon: 'sleep'     },
  { id: 'feeding',    label: 'Feeding',    icon: 'feed'      },
  { id: 'symptoms',   label: 'Symptoms',   icon: 'thermo'    },
  { id: 'milestones', label: 'Milestones', icon: 'milestone' },
  { id: 'growth',     label: 'Growth',     icon: 'growth'    },
];

const SEVERITY_COLOR: Record<string, string> = {
  info:      T.brandSoft,
  warning:   T.gold,
  urgent:    T.accent,
  emergency: T.danger,
};

type TabCache = {
  sleep?:      SleepLog[];
  feeding?:    FeedingLog[];
  symptoms?:   SymptomReport[];
  milestones?: Milestone[];
  growth?:     GrowthMeasurement[];
};

export function ChildProfileClient({ child, parent, connection, preVisitNotes, preVisitNotesUpdatedAt, prescriptions, healthAlerts, doctorId }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [tab, setTab] = React.useState<TabId>('overview');
  const [isMobile, setIsMobile] = React.useState(false);
  const [irisOpen, setIrisOpen] = React.useState(false);

  // Tab data cache — loaded once per tab, kept in memory
  const [tabCache, setTabCache] = React.useState<TabCache>({});
  const [tabLoading, setTabLoading] = React.useState(false);

  // Send note to parent
  const [noteOpen, setNoteOpen] = React.useState(false);
  const [noteText, setNoteText] = React.useState('');
  const [noteSending, setNoteSending] = React.useState(false);
  const [noteToast, setNoteToast] = React.useState<string | null>(null);

  // Iris state
  const [irisMessages, setIrisMessages] = React.useState<{ role: string; content: string }[]>([]);
  const [irisInput, setIrisInput] = React.useState('');
  const [irisSending, setIrisSending] = React.useState(false);
  const [irisLoading, setIrisLoading] = React.useState(false);
  const irisEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Lazy-load tab data on first visit to each tab
  React.useEffect(() => {
    if (tab === 'overview') return;
    if (tabCache[tab as keyof TabCache] !== undefined) return; // already cached

    setTabLoading(true);
    fetch(`/api/patients/${child.id}/tab-data?tab=${tab}`)
      .then(r => r.json())
      .then(json => {
        if (json.data) {
          setTabCache(prev => ({ ...prev, [tab]: json.data }));
        }
      })
      .finally(() => setTabLoading(false));
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-generate pre-visit brief when Iris panel opens
  React.useEffect(() => {
    if (!irisOpen || irisMessages.length > 0) return;
    setIrisLoading(true);
    fetch('/api/iris', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        childId: child.id,
        message: 'Generate a pre-visit brief for this patient.',
        history: [],
        userRole: 'doctor',
      }),
    })
      .then(r => r.json())
      .then(json => {
        if (json.reply) setIrisMessages([{ role: 'assistant', content: json.reply }]);
      })
      .finally(() => setIrisLoading(false));
  }, [irisOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    irisEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [irisMessages]);

  async function sendNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim() || noteSending) return;
    setNoteSending(true);
    try {
      const res = await fetch(`/api/patients/${child.id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: noteText.trim() }),
      });
      if (res.ok) {
        setNoteText('');
        setNoteOpen(false);
        setNoteToast(`Note sent to ${parent?.full_name ?? 'parent'}`);
        setTimeout(() => setNoteToast(null), 4000);
      } else {
        const j = await res.json();
        setNoteToast(`Error: ${j.error}`);
        setTimeout(() => setNoteToast(null), 4000);
      }
    } catch { setNoteToast('Network error'); setTimeout(() => setNoteToast(null), 4000); }
    setNoteSending(false);
  }

  async function sendIrisMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!irisInput.trim() || irisSending) return;
    const userMsg = irisInput.trim();
    setIrisInput('');
    setIrisMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIrisSending(true);
    try {
      const res = await fetch('/api/iris', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: child.id,
          message: userMsg,
          history: irisMessages.map(m => ({ role: m.role, content: m.content })),
          userRole: 'doctor',
        }),
      });
      const json = await res.json();
      if (json.reply) setIrisMessages(prev => [...prev, { role: 'assistant', content: json.reply }]);
    } catch { /* silent */ }
    setIrisSending(false);
  }

  async function resolveAlert(alertId: string) {
    await supabase
      .from('health_alerts')
      .update({ resolved_at: new Date().toISOString(), resolved_by: doctorId })
      .eq('id', alertId);
    router.refresh();
  }

  const childName = `${child.first_name}${child.last_name ? ` ${child.last_name}` : ''}`;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: T.bg }}>
      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: isMobile ? '14px 16px 10px' : '22px 28px 14px', background: T.bg, borderBottom: `1px solid ${T.line}`, flexShrink: 0 }}>
          <HRow gap={12} style={{ marginBottom: 14, alignItems: 'center' }}>
            <button
              onClick={() => router.back()}
              style={{ width: 38, height: 38, borderRadius: T.radius.pill, background: T.surface, border: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.ink700, cursor: 'pointer', flexShrink: 0 }}
            >
              <Icon name="chevronL" size={17} stroke={1.7} />
            </button>

            <HRow gap={14} style={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
              {child.photo_url ? (
                <img src={child.photo_url} alt={childName} style={{ width: 52, height: 52, borderRadius: T.radius.pill, objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <Avatar name={childName} size={52} tone="brand" />
              )}
              <Stack gap={3} style={{ minWidth: 0 }}>
                <Display size={isMobile ? 20 : 26} italic lh={1.05}>{childName}</Display>
                <HRow gap={8} style={{ flexWrap: 'wrap' }}>
                  <Mono size={11}>{ageFromDob(child.date_of_birth)}</Mono>
                  <Mono size={11}>· DOB {child.date_of_birth}</Mono>
                  {child.blood_type && <Chip tone="soft">{child.blood_type}</Chip>}
                  <Chip tone="wash" icon="leaf">Linked via ChildBloom</Chip>
                  {parent && <Mono size={11} color={T.ink400}>· {parent.full_name}</Mono>}
                </HRow>
                {(child.allergies?.length ?? 0) > 0 && (
                  <HRow gap={4} style={{ flexWrap: 'wrap', marginTop: 2 }}>
                    {child.allergies!.map(a => <Chip key={a} tone="accent">{a}</Chip>)}
                  </HRow>
                )}
              </Stack>
            </HRow>

            <HRow gap={8}>
              {/* Send note to parent */}
              <button
                onClick={() => setNoteOpen(o => !o)}
                className="dr-btn"
                style={{
                  '--btn-glow': 'rgba(209,122,79,.32)',
                  display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 14px',
                  borderRadius: T.radius.pill, background: noteOpen ? T.accent : T.accentSoft,
                  color: noteOpen ? '#fff' : T.accent, border: 'none', fontFamily: T.sans,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                } as React.CSSProperties}
              >
                <Icon name="send" size={14} color="currentColor" />
                {isMobile ? '' : 'Note'}
              </button>

              {/* Ask Iris */}
              <button
                onClick={() => setIrisOpen(o => !o)}
                className="dr-btn"
                style={{
                  '--btn-glow': 'rgba(15,61,46,.32)',
                  display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 16px',
                  borderRadius: T.radius.pill, background: irisOpen ? T.brandDeep : T.brand,
                  color: '#fff', border: 'none', fontFamily: T.sans, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', flexShrink: 0,
                } as React.CSSProperties}
              >
                <Icon name="sparkle" size={14} color="#fff" />
                {isMobile ? 'Iris' : 'Ask Iris'}
              </button>
            </HRow>
          </HRow>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 2 }}>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px',
                  borderRadius: T.radius.pill, border: 'none', cursor: 'pointer', flexShrink: 0,
                  background: tab === t.id ? T.brand : T.surface,
                  color: tab === t.id ? '#fff' : T.ink500,
                  fontFamily: T.sans, fontSize: 13, fontWeight: tab === t.id ? 600 : 500,
                  letterSpacing: T.sansTracking, transition: 'background 0.15s',
                }}
              >
                <Icon name={t.icon} size={13} stroke={tab === t.id ? 2 : 1.6} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '14px 12px 40px' : '22px 28px 48px' }}>

          {tab === 'overview' && (
            <OverviewTab
              child={child}
              healthAlerts={healthAlerts}
              prescriptions={prescriptions}
              preVisitNotes={preVisitNotes}
              preVisitNotesUpdatedAt={preVisitNotesUpdatedAt}
              onResolve={resolveAlert}
            />
          )}
          {tab === 'sleep' && (
            <SleepTab logs={tabCache.sleep ?? null} loading={tabLoading} />
          )}
          {tab === 'feeding' && (
            <FeedingTab logs={tabCache.feeding ?? null} loading={tabLoading} />
          )}
          {tab === 'symptoms' && (
            <SymptomsTab reports={tabCache.symptoms ?? null} loading={tabLoading} />
          )}
          {tab === 'milestones' && (
            <MilestonesTab milestones={tabCache.milestones ?? null} loading={tabLoading} />
          )}
          {tab === 'growth' && (
            <GrowthTab measurements={tabCache.growth ?? null} loading={tabLoading} />
          )}
        </div>
      </div>

      {/* Send note to parent — sliding panel */}
      {noteOpen && (
        <div style={{
          width: isMobile ? '100%' : 340,
          height: isMobile ? 'auto' : '100vh',
          position: isMobile ? 'fixed' : 'relative',
          bottom: isMobile ? 0 : undefined, left: isMobile ? 0 : undefined, right: isMobile ? 0 : undefined,
          background: T.surface, borderLeft: `1px solid ${T.line}`,
          display: 'flex', flexDirection: 'column',
          zIndex: isMobile ? 55 : undefined,
          boxShadow: isMobile ? T.shadow.lg : 'none',
          borderRadius: isMobile ? `${T.radius.xl}px ${T.radius.xl}px 0 0` : 0,
          padding: 22,
        }}>
          <HRow gap={10} style={{ alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <Stack gap={2}>
              <Body size={14} weight={600} color={T.ink900}>Send note to parent</Body>
              <Body size={12} color={T.ink400}>
                {parent?.full_name ?? 'Parent'} · {child.first_name}
              </Body>
            </Stack>
            <button onClick={() => setNoteOpen(false)} style={{ width: 32, height: 32, borderRadius: T.radius.pill, background: T.surfaceDim, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.ink700, cursor: 'pointer' }}>
              <Icon name="close" size={15} stroke={1.7} />
            </button>
          </HRow>
          <form onSubmit={sendNote}>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder={`E.g. "Vishnu's weight is on track. Please log sleep for the next 7 days."`}
              rows={5}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: T.radius.md,
                border: `1px solid ${T.line}`, background: T.surfaceDim,
                fontFamily: T.sans, fontSize: 13.5, color: T.ink900, outline: 'none',
                resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box',
              }}
            />
            <Body size={11} color={T.ink400} style={{ marginTop: 6, marginBottom: 14 }}>
              Parent will see this as a notification in ChildBloom.
            </Body>
            <button
              type="submit"
              disabled={noteSending || !noteText.trim()}
              className="dr-btn"
              style={{
                '--btn-glow': 'rgba(209,122,79,.32)',
                width: '100%', height: 46, borderRadius: T.radius.pill,
                background: T.accent, color: '#fff', border: 'none',
                fontFamily: T.sans, fontSize: 14, fontWeight: 600,
                opacity: noteSending || !noteText.trim() ? 0.55 : 1,
              } as React.CSSProperties}
            >
              {noteSending ? 'Sending…' : 'Send note'}
            </button>
          </form>
        </div>
      )}

      {/* Note sent toast */}
      {noteToast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: noteToast.startsWith('Error') ? T.danger : T.ink900,
          color: '#fff', padding: '12px 22px', borderRadius: T.radius.pill,
          fontFamily: T.sans, fontSize: 13.5, fontWeight: 500,
          boxShadow: T.shadow.lg, zIndex: 300, pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}>
          {noteToast}
        </div>
      )}

      {/* Iris panel */}
      {irisOpen && (
        <div style={{
          width: isMobile ? '100%' : 360,
          height: isMobile ? '60vh' : '100vh',
          position: isMobile ? 'fixed' : 'relative',
          bottom: isMobile ? 0 : undefined,
          left: isMobile ? 0 : undefined,
          right: isMobile ? 0 : undefined,
          background: T.surface,
          borderLeft: `1px solid ${T.line}`,
          display: 'flex', flexDirection: 'column',
          zIndex: isMobile ? 50 : undefined,
          boxShadow: isMobile ? T.shadow.lg : 'none',
          borderRadius: isMobile ? `${T.radius.xl}px ${T.radius.xl}px 0 0` : 0,
        }}>
          <div style={{ padding: '16px 18px 14px', borderBottom: `1px solid ${T.line}`, flexShrink: 0 }}>
            <HRow gap={8} style={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <HRow gap={8} style={{ alignItems: 'center' }}>
                <div style={{ width: 30, height: 30, borderRadius: T.radius.pill, background: T.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="sparkle" size={14} color="#fff" stroke={1.8} />
                </div>
                <Stack gap={1}>
                  <Body size={13} weight={600} color={T.ink900}>Ask Iris about {child.first_name}</Body>
                  <Body size={11} color={T.ink400}>AI clinical assistant</Body>
                </Stack>
              </HRow>
              <button onClick={() => setIrisOpen(false)} style={{ width: 30, height: 30, borderRadius: T.radius.pill, background: T.surfaceDim, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.ink700, cursor: 'pointer' }}>
                <Icon name="close" size={15} stroke={1.7} />
              </button>
            </HRow>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {irisLoading && (
              <div style={{ padding: '12px 14px', background: T.brandWash, borderRadius: T.radius.md }}>
                <Body size={13} color={T.brand}>Generating pre-visit brief…</Body>
              </div>
            )}
            {irisMessages.map((msg, i) => (
              <div
                key={i}
                style={{
                  padding: '12px 14px', borderRadius: T.radius.md, maxWidth: '94%',
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  background: msg.role === 'user' ? T.brand : T.brandWash,
                  color: msg.role === 'user' ? '#fff' : T.ink900,
                }}
              >
                <Body size={13} color="inherit" lh={1.5}>{msg.content}</Body>
              </div>
            ))}
            <div ref={irisEndRef} />
          </div>

          <form onSubmit={sendIrisMessage} style={{ padding: '12px 14px', borderTop: `1px solid ${T.line}`, flexShrink: 0 }}>
            <HRow gap={8}>
              <input
                value={irisInput}
                onChange={e => setIrisInput(e.target.value)}
                placeholder="Ask Iris…"
                disabled={irisSending}
                style={{
                  flex: 1, height: 40, padding: '0 14px', borderRadius: T.radius.pill,
                  border: `1px solid ${T.line}`, background: T.surfaceDim,
                  fontFamily: T.sans, fontSize: 13, color: T.ink900, outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={irisSending || !irisInput.trim()}
                style={{
                  width: 40, height: 40, borderRadius: T.radius.pill, background: T.brand,
                  color: '#fff', border: 'none', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', cursor: irisSending ? 'not-allowed' : 'pointer',
                  opacity: irisSending || !irisInput.trim() ? 0.5 : 1,
                }}
              >
                <Icon name="send" size={15} color="#fff" stroke={1.7} />
              </button>
            </HRow>
          </form>
        </div>
      )}
    </div>
  );
}

// ── Shared ────────────────────────────────────────────────────────────────────

function Mono({ children, size = 11, color, style }: { children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties }) {
  return <span style={{ fontFamily: T.mono, fontSize: size, color: color || T.ink400, letterSpacing: '0.04em', ...style }}>{children}</span>;
}

function TabSkeleton() {
  return (
    <Stack gap={12}>
      {[100, 200, 80].map((h, i) => (
        <div key={i} style={{ height: h, borderRadius: T.radius.md, background: T.ink100, animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
    </Stack>
  );
}

// ── Tab components ────────────────────────────────────────────────────────────

function OverviewTab({ child, healthAlerts, prescriptions, preVisitNotes, preVisitNotesUpdatedAt, onResolve }: {
  child: Child;
  healthAlerts: HealthAlert[];
  prescriptions: Partial<Prescription>[];
  preVisitNotes: string | null;
  preVisitNotesUpdatedAt: string | null;
  onResolve: (id: string) => void;
}) {
  return (
    <Stack gap={16}>

      {/* Parent's pre-visit notes — shown first so doctor sees them immediately */}
      {preVisitNotes && (
        <Card p={18} tone="warm">
          <HRow gap={8} style={{ alignItems: 'center', marginBottom: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: T.radius.md, background: T.accent + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="note" size={14} color={T.accent} />
            </div>
            <Stack gap={1}>
              <Eyebrow color={T.accent}>Parent&apos;s pre-visit notes</Eyebrow>
              {preVisitNotesUpdatedAt && (
                <span style={{ fontFamily: T.mono, fontSize: 9, color: T.ink400, letterSpacing: '0.04em' }}>
                  Updated {new Date(preVisitNotesUpdatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </Stack>
          </HRow>
          <Body size={14} color={T.ink700} lh={1.6} style={{ fontStyle: 'italic' }}>
            &ldquo;{preVisitNotes}&rdquo;
          </Body>
        </Card>
      )}

      {healthAlerts.length > 0 && (
        <Card p={20}>
          <Eyebrow color={T.danger} style={{ marginBottom: 12 }}>Active alerts</Eyebrow>
          <Stack gap={10}>
            {healthAlerts.map(alert => (
              <div key={alert.id} style={{ padding: '12px 14px', borderRadius: T.radius.md, background: T.surfaceDim, borderLeft: `3px solid ${SEVERITY_COLOR[alert.severity] ?? T.ink400}` }}>
                <HRow gap={10} style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Stack gap={3}>
                    <Body size={13.5} weight={600} color={T.ink900}>{alert.title}</Body>
                    <Body size={12} color={T.ink500} lh={1.4}>{alert.description}</Body>
                    <Chip tone={alert.severity === 'emergency' || alert.severity === 'urgent' ? 'accent' : 'soft'}>
                      {alert.severity}
                    </Chip>
                  </Stack>
                  <button
                    onClick={() => onResolve(alert.id)}
                    style={{ height: 30, padding: '0 12px', borderRadius: T.radius.pill, background: T.brandWash, color: T.brand, border: 'none', fontFamily: T.sans, fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
                  >
                    Resolve
                  </button>
                </HRow>
              </div>
            ))}
          </Stack>
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card p={18}>
          <Eyebrow color={T.ink400} style={{ marginBottom: 8 }}>Blood type</Eyebrow>
          <Body size={20} weight={600} color={T.ink900}>{child.blood_type ?? 'Unknown'}</Body>
        </Card>
        <Card p={18}>
          <Eyebrow color={T.ink400} style={{ marginBottom: 8 }}>Gender</Eyebrow>
          <Body size={20} weight={600} color={T.ink900}>{child.gender ?? '—'}</Body>
        </Card>
      </div>

      {(child.medical_conditions?.length ?? 0) > 0 && (
        <Card p={18}>
          <Eyebrow color={T.ink400} style={{ marginBottom: 10 }}>Known conditions</Eyebrow>
          <HRow gap={6} style={{ flexWrap: 'wrap' }}>
            {child.medical_conditions!.map(c => <Chip key={c} tone="soft">{c}</Chip>)}
          </HRow>
        </Card>
      )}

      {prescriptions.length > 0 && (
        <Card p={18}>
          <Eyebrow color={T.ink400} style={{ marginBottom: 12 }}>Active prescriptions</Eyebrow>
          <Stack gap={8}>
            {prescriptions.map((p, i) => (
              <HRow key={i} gap={10} style={{ padding: '8px 0', borderBottom: i < prescriptions.length - 1 ? `1px solid ${T.line}` : 'none' }}>
                <Icon name="medicine" size={16} color={T.brand} />
                <Body size={13} color={T.ink900}><strong>{p.medication_name}</strong> {p.dosage} {p.unit} — {p.frequency}</Body>
              </HRow>
            ))}
          </Stack>
        </Card>
      )}

      {(child.birth_weight_grams || child.gestational_age_weeks) && (
        <Card p={18}>
          <Eyebrow color={T.ink400} style={{ marginBottom: 10 }}>Birth details</Eyebrow>
          <Stack gap={6}>
            {child.birth_weight_grams && <Body size={13} color={T.ink700}>Birth weight: <strong>{(child.birth_weight_grams / 1000).toFixed(2)} kg</strong></Body>}
            {child.birth_height_cm && <Body size={13} color={T.ink700}>Birth height: <strong>{child.birth_height_cm} cm</strong></Body>}
            {child.gestational_age_weeks && <Body size={13} color={T.ink700}>Gestational age: <strong>{child.gestational_age_weeks} weeks</strong></Body>}
          </Stack>
        </Card>
      )}
    </Stack>
  );
}

function SleepTab({ logs, loading }: { logs: SleepLog[] | null; loading: boolean }) {
  if (logs === null) return <TabSkeleton />;

  const avgHours = logs.length
    ? logs.reduce((s, l) => s + (l.duration_minutes ?? 0) / 60, 0) / logs.length
    : 0;
  const sleepPoints = logs.slice(0, 30).map(l => (l.duration_minutes ?? 0) / 60).reverse();

  return (
    <Stack gap={16}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card p={18}>
          <Eyebrow color={T.ink400} style={{ marginBottom: 6 }}>Avg hours / night</Eyebrow>
          <Body size={28} weight={600} color={T.ink900}>{loading ? '…' : `${avgHours.toFixed(1)}h`}</Body>
        </Card>
        <Card p={18}>
          <Eyebrow color={T.ink400} style={{ marginBottom: 6 }}>Logs (90 days)</Eyebrow>
          <Body size={28} weight={600} color={T.ink900}>{loading ? '…' : logs.length}</Body>
        </Card>
      </div>
      {sleepPoints.length > 1 && (
        <Card p={18}>
          <Eyebrow color={T.ink400} style={{ marginBottom: 12 }}>Sleep duration trend</Eyebrow>
          <Spark points={sleepPoints} w={600} h={80} color={T.brandSoft} />
        </Card>
      )}
      <Card p={0}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.line}` }}>
          <Display size={18} italic weight={400}>Sleep log</Display>
        </div>
        {logs.length === 0
          ? <div style={{ padding: 24 }}><Body size={13} color={T.ink500}>No sleep logs in the last 90 days.</Body></div>
          : logs.map((log, i) => (
            <div key={log.id} style={{ display: 'flex', gap: 14, padding: '12px 20px', alignItems: 'center', borderBottom: i < logs.length - 1 ? `1px solid ${T.line}` : 'none' }}>
              <Icon name="sleep" size={16} color={T.brandSoft} />
              <Stack gap={2} style={{ flex: 1 }}>
                <Body size={13.5} weight={500} color={T.ink900}>
                  {log.duration_minutes ? `${(log.duration_minutes / 60).toFixed(1)}h` : 'Ongoing'}
                  {log.sleep_type && <span style={{ color: T.ink400, fontWeight: 400 }}> · {log.sleep_type}</span>}
                </Body>
                <Mono size={10}>{new Date(log.sleep_start).toLocaleDateString()} {new Date(log.sleep_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Mono>
              </Stack>
              {log.quality_score && <Chip tone="wash">{log.quality_score}/5 quality</Chip>}
              {log.interruptions > 0 && <Chip tone="soft">{log.interruptions} wakes</Chip>}
            </div>
          ))}
      </Card>
    </Stack>
  );
}

function FeedingTab({ logs, loading }: { logs: FeedingLog[] | null; loading: boolean }) {
  if (logs === null) return <TabSkeleton />;
  return (
    <Card p={0}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.line}` }}>
        <Display size={18} italic weight={400}>
          Feeding log{loading ? '' : ` · ${logs.length} entries`}
        </Display>
      </div>
      {logs.length === 0
        ? <div style={{ padding: 24 }}><Body size={13} color={T.ink500}>No feeding logs recorded.</Body></div>
        : logs.map((log, i) => (
          <div key={log.id} style={{ display: 'flex', gap: 14, padding: '12px 20px', alignItems: 'center', borderBottom: i < logs.length - 1 ? `1px solid ${T.line}` : 'none' }}>
            <Icon name="feed" size={16} color={T.accent} />
            <Stack gap={2} style={{ flex: 1 }}>
              <HRow gap={8}>
                <Body size={13.5} weight={500} color={T.ink900}>{log.feeding_type}</Body>
                {log.amount_ml && <Chip tone="wash">{log.amount_ml} ml</Chip>}
                {log.duration_minutes && <Chip tone="soft">{log.duration_minutes} min</Chip>}
                {log.refused_food && <Chip tone="accent">Refused</Chip>}
              </HRow>
              {log.food_description && <Body size={12} color={T.ink500}>{log.food_description}</Body>}
              <Mono size={10}>{new Date(log.fed_at).toLocaleDateString()} {new Date(log.fed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Mono>
            </Stack>
          </div>
        ))}
    </Card>
  );
}

function SymptomsTab({ reports, loading }: { reports: SymptomReport[] | null; loading: boolean }) {
  if (reports === null) return <TabSkeleton />;
  const severityColor = (s: number) =>
    s >= 4 ? T.danger : s === 3 ? T.accent : s === 2 ? T.gold : T.brandSoft;

  return (
    <Card p={0}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.line}` }}>
        <Display size={18} italic weight={400}>Symptom reports{!loading && reports.length > 0 ? ` · ${reports.length}` : ''}</Display>
      </div>
      {reports.length === 0
        ? <div style={{ padding: 24 }}><Body size={13} color={T.ink500}>No symptoms logged.</Body></div>
        : reports.map((r, i) => (
          <div key={r.id} style={{ display: 'flex', gap: 14, padding: '12px 20px', alignItems: 'flex-start', borderBottom: i < reports.length - 1 ? `1px solid ${T.line}` : 'none', borderLeft: `3px solid ${severityColor(r.severity)}` }}>
            <Stack gap={3} style={{ flex: 1 }}>
              <HRow gap={8}>
                <Body size={13.5} weight={600} color={T.ink900}>{r.symptom}</Body>
                <Chip tone="soft">Severity {r.severity}/5</Chip>
                {r.is_ongoing ? <Chip tone="accent">Ongoing</Chip> : <Chip tone="wash">Resolved</Chip>}
              </HRow>
              {r.body_location && <Body size={12} color={T.ink500}>Location: {r.body_location}</Body>}
              {r.parent_notes && <Body size={12} color={T.ink500}>{r.parent_notes}</Body>}
              <Mono size={10}>{new Date(r.reported_at).toLocaleDateString()}</Mono>
            </Stack>
          </div>
        ))}
    </Card>
  );
}

function MilestonesTab({ milestones, loading }: { milestones: Milestone[] | null; loading: boolean }) {
  if (milestones === null) return <TabSkeleton />;
  if (milestones.length === 0) return <Body size={13} color={T.ink500}>No milestones logged yet.</Body>;

  const categories = ['motor', 'language', 'social', 'cognitive', 'feeding', 'other'] as const;

  return (
    <Stack gap={16}>
      {categories.map(cat => {
        const items = milestones.filter(m => m.category === cat);
        if (items.length === 0) return null;
        return (
          <Card key={cat} p={18}>
            <Eyebrow color={T.ink400} style={{ marginBottom: 12, textTransform: 'capitalize' }}>{cat}</Eyebrow>
            <Stack gap={8}>
              {items.map((m, i) => (
                <HRow key={m.id} gap={10} style={{ padding: '8px 0', borderBottom: i < items.length - 1 ? `1px solid ${T.line}` : 'none', alignItems: 'flex-start' }}>
                  <Icon name="check" size={16} stroke={2} color={T.success} />
                  <Stack gap={1} style={{ flex: 1 }}>
                    <Body size={13.5} weight={600} color={T.ink900}>{m.milestone_name}</Body>
                    {m.description && <Body size={12} color={T.ink500}>{m.description}</Body>}
                    <Mono size={10}>{new Date(m.achieved_at).toLocaleDateString()}</Mono>
                  </Stack>
                </HRow>
              ))}
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}

function GrowthTab({ measurements, loading }: { measurements: GrowthMeasurement[] | null; loading: boolean }) {
  if (measurements === null) return <TabSkeleton />;

  const weightPoints = measurements.map(m => m.weight_grams ? m.weight_grams / 1000 : 0).reverse();
  const heightPoints = measurements.map(m => m.height_cm ?? 0).reverse();

  return (
    <Stack gap={16}>
      {measurements.length > 1 && (
        <>
          <Card p={18}>
            <Eyebrow color={T.ink400} style={{ marginBottom: 12 }}>Weight (kg)</Eyebrow>
            <Spark points={weightPoints} w={600} h={80} color={T.brand} />
          </Card>
          <Card p={18}>
            <Eyebrow color={T.ink400} style={{ marginBottom: 12 }}>Height (cm)</Eyebrow>
            <Spark points={heightPoints} w={600} h={80} color={T.brandSoft} />
          </Card>
        </>
      )}
      <Card p={0}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.line}` }}>
          <Display size={18} italic weight={400}>Growth history</Display>
        </div>
        {measurements.length === 0
          ? <div style={{ padding: 24 }}><Body size={13} color={T.ink500}>No growth measurements logged yet.</Body></div>
          : measurements.map((m, i) => (
            <div key={m.id} style={{ display: 'flex', gap: 14, padding: '12px 20px', alignItems: 'center', borderBottom: i < measurements.length - 1 ? `1px solid ${T.line}` : 'none' }}>
              <Icon name="growth" size={16} color={T.brand} />
              <Mono size={10} style={{ width: 90, flexShrink: 0 }}>{new Date(m.measured_at).toLocaleDateString()}</Mono>
              <HRow gap={8} style={{ flex: 1, flexWrap: 'wrap' }}>
                {m.weight_grams && <Chip tone="wash">{(m.weight_grams / 1000).toFixed(2)} kg</Chip>}
                {m.height_cm && <Chip tone="soft">{m.height_cm} cm</Chip>}
                {m.head_circumference_cm && <Chip tone="cream">{m.head_circumference_cm} cm head</Chip>}
                {m.bmi && <Chip tone="surface">BMI {m.bmi}</Chip>}
              </HRow>
              <Chip tone="soft">{m.source}</Chip>
            </div>
          ))}
      </Card>
    </Stack>
  );
}
