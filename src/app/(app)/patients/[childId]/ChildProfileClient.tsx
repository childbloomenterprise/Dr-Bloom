'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { theme as T } from '@/lib/theme';
import { ageFromDob } from '@/lib/age';
import { createClient } from '@/lib/supabase/client';
import {
  Stack, HRow, Card, Body, Eyebrow, Display, Avatar, Chip, Spark, Button, Input, Select,
} from '@/components/primitives';
import { Icon } from '@/components/Icon';
import { GrowthChart, type GrowthBand, type GrowthPoint } from '@/components/growth/GrowthChart';
import { ErrorState, EmptyState, Toast, useToast } from '@/components/states';
import { IAP_SCHEDULE, doseStatus, VACCINE_OPTIONS, type DoseStatus } from '@/lib/vaccines/iap-schedule';
import type {
  Child, UserProfile, DoctorChildConnection, Prescription, HealthAlert,
  SleepLog, FeedingLog, SymptomReport, Milestone, VaccinationRecord, Consultation,
} from '@/types/database';

// Growth payload shape mirrors the server's buildGrowthPayload output. Imported as a
// type only so the WHO LMS tables never enter the client bundle.
interface EnrichedMeasurement {
  id: string; measured_at: string; source: string; ageMonths: number;
  weightKg: number | null; heightCm: number | null; hcCm: number | null; bmi: number | null;
  weightPct: number | null; heightPct: number | null; hcPct: number | null; bmiPct: number | null;
}
interface GrowthPayload {
  data: EnrichedMeasurement[];
  bands: Record<'wfa' | 'hfa' | 'hcfa' | 'bmi', GrowthBand[]> | null;
  sex: 'male' | 'female' | null;
}

type StreamTab = 'sleep' | 'feeding' | 'symptoms' | 'milestones';
type TabId = 'overview' | 'visits' | 'rx' | 'vaccines' | 'growth' | StreamTab;

interface Props {
  child: Child;
  parent: Pick<UserProfile, 'id' | 'full_name' | 'email'> | null;
  connection: DoctorChildConnection;
  preVisitNotes: string | null;
  preVisitNotesUpdatedAt: string | null;
  prescriptions: Prescription[];
  vaccines: VaccinationRecord[];
  consultations: Consultation[];
  growth: GrowthPayload;
  healthAlerts: HealthAlert[];
  doctorId: string;
}

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview',   label: 'Overview',   icon: 'home'        },
  { id: 'visits',     label: 'Visits',     icon: 'timeline'    },
  { id: 'rx',         label: 'Rx',         icon: 'rx'          },
  { id: 'vaccines',   label: 'Vaccines',   icon: 'syringe'     },
  { id: 'growth',     label: 'Growth',     icon: 'growth'      },
  { id: 'sleep',      label: 'Sleep',      icon: 'sleep'       },
  { id: 'feeding',    label: 'Feeding',    icon: 'feed'        },
  { id: 'symptoms',   label: 'Symptoms',   icon: 'thermo'      },
  { id: 'milestones', label: 'Milestones', icon: 'milestone'   },
];

const SEVERITY_COLOR: Record<string, string> = {
  info: T.brandSoft, warning: T.gold, urgent: T.accent, emergency: T.danger,
};

const STATUS_TONE: Record<DoseStatus, 'wash' | 'soft' | 'accent' | 'surface'> = {
  done: 'wash', 'due-soon': 'soft', overdue: 'accent', upcoming: 'surface',
};

type StreamState<D> = { status: 'idle' | 'loading' | 'ready' | 'error'; data?: D[]; error?: string };

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function ageMonthsOf(dob: string): number {
  const ms = Date.now() - new Date(dob).getTime();
  return Math.max(0, ms / (30.4375 * 24 * 3600 * 1000));
}
function fmtPct(p: number | null): string {
  if (p == null) return '—';
  if (p < 1) return '<P1';
  if (p > 99) return '>P99';
  return `P${Math.round(p)}`;
}

export function ChildProfileClient(props: Props) {
  const { child, parent, preVisitNotes, preVisitNotesUpdatedAt, healthAlerts, doctorId } = props;
  const router = useRouter();
  const supabase = createClient();
  const { toast, show } = useToast();

  const [tab, setTab] = React.useState<TabId>('overview');
  const [isMobile, setIsMobile] = React.useState(false);

  // Clinical data lives in state so writes update the UI optimistically.
  const [rxList, setRxList] = React.useState<Prescription[]>(props.prescriptions);
  const [vaxList, setVaxList] = React.useState<VaccinationRecord[]>(props.vaccines);
  const [visitList, setVisitList] = React.useState<Consultation[]>(props.consultations);

  // Lazy-loaded parent-logged streams.
  const [streams, setStreams] = React.useState<Record<StreamTab, StreamState<unknown>>>({
    sleep: { status: 'idle' }, feeding: { status: 'idle' },
    symptoms: { status: 'idle' }, milestones: { status: 'idle' },
  });

  // Panels
  const [panel, setPanel] = React.useState<'none' | 'note' | 'vaccine' | 'rx' | 'visit' | 'iris'>('none');

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const loadStream = React.useCallback((t: StreamTab) => {
    setStreams(prev => ({ ...prev, [t]: { status: 'loading' } }));
    fetch(`/api/patients/${child.id}/tab-data?tab=${t}`)
      .then(async r => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || 'Could not load data');
        return json.data ?? [];
      })
      .then(data => setStreams(prev => ({ ...prev, [t]: { status: 'ready', data } })))
      .catch(e => setStreams(prev => ({ ...prev, [t]: { status: 'error', error: e.message } })));
  }, [child.id]);

  React.useEffect(() => {
    if ((tab === 'sleep' || tab === 'feeding' || tab === 'symptoms' || tab === 'milestones')
      && streams[tab].status === 'idle') {
      loadStream(tab);
    }
  }, [tab, streams, loadStream]);

  async function resolveAlert(alertId: string) {
    const { error } = await supabase.from('health_alerts')
      .update({ resolved_at: new Date().toISOString(), resolved_by: doctorId })
      .eq('id', alertId);
    if (error) {
      show('Could not resolve alert', 'error');
      return;
    }
    router.refresh();
  }

  const childName = `${child.first_name}${child.last_name ? ` ${child.last_name}` : ''}`;
  const ageMonths = ageMonthsOf(child.date_of_birth);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: T.bg }}>
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
              <HeaderBtn icon="send" label={isMobile ? '' : 'Note'} active={panel === 'note'} tone="accent" onClick={() => setPanel(p => p === 'note' ? 'none' : 'note')} />
              <HeaderBtn icon="sparkle" label={isMobile ? 'Iris' : 'Ask Iris'} active={panel === 'iris'} tone="brand" onClick={() => setPanel(p => p === 'iris' ? 'none' : 'iris')} />
            </HRow>
          </HRow>

          {/* Tab bar */}
          <div className="scroll-x" style={{ display: 'flex', gap: 4, paddingBottom: 2 }}>
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
                  letterSpacing: T.sansTracking, transition: 'background 0.15s, color 0.15s',
                }}
              >
                <Icon name={t.icon} size={13} stroke={tab === t.id ? 2 : 1.6} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div key={tab} className="fade-in" style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '14px 12px 40px' : '22px 28px 48px' }}>
          {tab === 'overview' && (
            <OverviewTab
              child={child} healthAlerts={healthAlerts} prescriptions={rxList.filter(p => p.is_active)}
              vaccines={vaxList} consultations={visitList} growth={props.growth}
              ageMonths={ageMonths}
              preVisitNotes={preVisitNotes} preVisitNotesUpdatedAt={preVisitNotesUpdatedAt}
              onResolve={resolveAlert} onGoTab={setTab}
            />
          )}
          {tab === 'visits'   && <VisitsTab visits={visitList} onNew={() => setPanel('visit')} />}
          {tab === 'rx'       && <RxTab prescriptions={rxList} childId={child.id} onWrite={() => setPanel('rx')} onChange={setRxList} show={show} />}
          {tab === 'vaccines' && <VaccinesTab records={vaxList} ageMonths={ageMonths} onRecord={() => setPanel('vaccine')} />}
          {tab === 'growth'   && <GrowthTab growth={props.growth} />}
          {tab === 'sleep'      && <StreamWrap state={streams.sleep} onRetry={() => loadStream('sleep')} render={(d) => <SleepTab logs={d as SleepLog[]} />} />}
          {tab === 'feeding'    && <StreamWrap state={streams.feeding} onRetry={() => loadStream('feeding')} render={(d) => <FeedingTab logs={d as FeedingLog[]} />} />}
          {tab === 'symptoms'   && <StreamWrap state={streams.symptoms} onRetry={() => loadStream('symptoms')} render={(d) => <SymptomsTab reports={d as SymptomReport[]} />} />}
          {tab === 'milestones' && <StreamWrap state={streams.milestones} onRetry={() => loadStream('milestones')} render={(d) => <MilestonesTab milestones={d as Milestone[]} />} />}
        </div>
      </div>

      {/* Side panels */}
      {panel === 'note' && (
        <NotePanel child={child} parent={parent} isMobile={isMobile} onClose={() => setPanel('none')} show={show} />
      )}
      {panel === 'vaccine' && (
        <VaccinePanel childId={child.id} isMobile={isMobile} onClose={() => setPanel('none')}
          onDone={(rec) => { setVaxList(prev => [rec, ...prev]); show('Vaccine recorded · parent notified', 'success'); setPanel('none'); }}
          show={show} />
      )}
      {panel === 'rx' && (
        <RxPanel childId={child.id} isMobile={isMobile} onClose={() => setPanel('none')}
          onDone={(rec) => { setRxList(prev => [rec, ...prev]); show('Prescription sent · parent notified', 'success'); setPanel('none'); }}
          show={show} />
      )}
      {panel === 'visit' && (
        <VisitPanel childId={child.id} isMobile={isMobile} onClose={() => setPanel('none')}
          onDone={(rec) => { setVisitList(prev => [rec, ...prev]); show('Visit saved', 'success'); setPanel('none'); }}
          show={show} />
      )}
      {panel === 'iris' && (
        <IrisPanel child={child} isMobile={isMobile} onClose={() => setPanel('none')} />
      )}

      <Toast toast={toast} />
    </div>
  );
}

// ── Shared ────────────────────────────────────────────────────────────────────

function Mono({ children, size = 11, color, style }: { children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties }) {
  return <span style={{ fontFamily: T.mono, fontSize: size, color: color || T.ink400, letterSpacing: '0.04em', ...style }}>{children}</span>;
}

function HeaderBtn({ icon, label, active, tone, onClick }: { icon: string; label: string; active: boolean; tone: 'accent' | 'brand'; onClick: () => void }) {
  const bg = active ? (tone === 'accent' ? T.accent : T.brandDeep) : (tone === 'accent' ? T.accentSoft : T.brand);
  const fg = tone === 'accent' ? (active ? '#fff' : T.accent) : '#fff';
  return (
    <button onClick={onClick} className="dr-btn"
      style={{
        '--btn-glow': tone === 'accent' ? 'rgba(209,122,79,.32)' : 'rgba(15,61,46,.32)',
        display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: label ? '0 16px' : '0 12px',
        borderRadius: T.radius.pill, background: bg, color: fg, border: 'none',
        fontFamily: T.sans, fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
      } as React.CSSProperties}
    >
      <Icon name={icon} size={14} color="currentColor" />{label}
    </button>
  );
}

function TabSkeleton() {
  return (
    <Stack gap={12}>
      {[100, 200, 80].map((h, i) => (
        <div key={i} className="skeleton" style={{ height: h }} />
      ))}
    </Stack>
  );
}

function StreamWrap<D>({ state, onRetry, render }: { state: StreamState<D>; onRetry: () => void; render: (d: D[]) => React.ReactNode }) {
  if (state.status === 'loading' || state.status === 'idle') return <TabSkeleton />;
  if (state.status === 'error') return <ErrorState message={state.error} onRetry={onRetry} />;
  return <>{render(state.data ?? [])}</>;
}

function SectionHeader({ title, action }: { title: React.ReactNode; action?: React.ReactNode }) {
  return (
    <HRow gap={12} style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
      <Display size={20} italic weight={400}>{title}</Display>
      {action}
    </HRow>
  );
}

// ── Overview (clinical cockpit) ─────────────────────────────────────────────────

function OverviewTab({
  child, healthAlerts, prescriptions, vaccines, consultations, growth, ageMonths,
  preVisitNotes, preVisitNotesUpdatedAt, onResolve, onGoTab,
}: {
  child: Child; healthAlerts: HealthAlert[]; prescriptions: Prescription[];
  vaccines: VaccinationRecord[]; consultations: Consultation[]; growth: GrowthPayload; ageMonths: number;
  preVisitNotes: string | null; preVisitNotesUpdatedAt: string | null;
  onResolve: (id: string) => void; onGoTab: (t: TabId) => void;
}) {
  const lastVisit = consultations[0] ?? null;
  const latest = growth.data[0] ?? null;
  const nextDue = computeNextVaccine(vaccines, ageMonths);

  return (
    <Stack gap={16}>
      {preVisitNotes && (
        <div className="slide-up">
          <Card p={18} tone="warm">
            <HRow gap={8} style={{ alignItems: 'center', marginBottom: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: T.radius.md, background: T.accent + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="note" size={14} color={T.accent} />
              </div>
              <Stack gap={1}>
                <Eyebrow color={T.accent}>Parent&apos;s pre-visit notes</Eyebrow>
                {preVisitNotesUpdatedAt && <Mono size={9}>Updated {fmtDate(preVisitNotesUpdatedAt)}</Mono>}
              </Stack>
            </HRow>
            <Body size={14} color={T.ink700} lh={1.6} style={{ fontStyle: 'italic' }}>&ldquo;{preVisitNotes}&rdquo;</Body>
          </Card>
        </div>
      )}

      {healthAlerts.length > 0 && (
        <div className="slide-up stagger-1">
          <Card p={20}>
            <Eyebrow color={T.danger} style={{ marginBottom: 12 }}>Active alerts</Eyebrow>
            <Stack gap={10}>
              {healthAlerts.map(alert => (
                <div key={alert.id} style={{ padding: '12px 14px', borderRadius: T.radius.md, background: T.surfaceDim, borderLeft: `3px solid ${SEVERITY_COLOR[alert.severity] ?? T.ink400}` }}>
                  <HRow gap={10} style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Stack gap={3}>
                      <Body size={13.5} weight={600} color={T.ink900}>{alert.title}</Body>
                      <Body size={12} color={T.ink500} lh={1.4}>{alert.description}</Body>
                      <Chip tone={alert.severity === 'emergency' || alert.severity === 'urgent' ? 'accent' : 'soft'}>{alert.severity}</Chip>
                    </Stack>
                    <button onClick={() => onResolve(alert.id)} className="dr-btn" style={{ height: 30, padding: '0 12px', borderRadius: T.radius.pill, background: T.brandWash, color: T.brand, border: 'none', fontFamily: T.sans, fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 } as React.CSSProperties}>Resolve</button>
                  </HRow>
                </div>
              ))}
            </Stack>
          </Card>
        </div>
      )}

      {/* Cockpit summary grid */}
      <div className="slide-up stagger-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <MiniCard icon="timeline" label="Last visit" onClick={() => onGoTab('visits')}
          value={lastVisit ? fmtDate(lastVisit.consultation_date) : 'No visits yet'}
          sub={lastVisit ? (lastVisit.chief_complaint ?? lastVisit.visit_type) : 'Log the first visit'} />
        <MiniCard icon="rx" label="Active Rx" onClick={() => onGoTab('rx')}
          value={`${prescriptions.length}`}
          sub={prescriptions[0]?.medication_name ?? 'None active'} />
        <MiniCard icon="syringe" label="Next vaccine" onClick={() => onGoTab('vaccines')}
          value={nextDue ? nextDue.vaccineName : 'Up to date'}
          sub={nextDue ? nextDue.label : 'No dues'} tone={nextDue?.overdue ? 'accent' : undefined} />
        <MiniCard icon="growth" label="Growth" onClick={() => onGoTab('growth')}
          value={latest ? `${fmtPct(latest.weightPct)} wt` : 'No data'}
          sub={latest ? `${fmtPct(latest.heightPct)} ht · ${fmtDate(latest.measured_at)}` : 'No measurements'} />
      </div>

      {latest && (
        <div className="slide-up stagger-3">
          <Card p={18}>
            <Eyebrow color={T.ink400} style={{ marginBottom: 12 }}>Latest growth percentiles</Eyebrow>
            <HRow gap={8} style={{ flexWrap: 'wrap' }}>
              {latest.weightKg != null && <PctChip label="Weight" value={`${latest.weightKg.toFixed(2)} kg`} pct={latest.weightPct} />}
              {latest.heightCm != null && <PctChip label="Height" value={`${latest.heightCm} cm`} pct={latest.heightPct} />}
              {latest.hcCm != null && <PctChip label="Head" value={`${latest.hcCm} cm`} pct={latest.hcPct} />}
              {latest.bmi != null && <PctChip label="BMI" value={latest.bmi.toFixed(1)} pct={latest.bmiPct} />}
            </HRow>
          </Card>
        </div>
      )}

      {prescriptions.length > 0 && (
        <div className="slide-up stagger-4">
          <Card p={18}>
            <Eyebrow color={T.ink400} style={{ marginBottom: 12 }}>Active prescriptions</Eyebrow>
            <Stack gap={8}>
              {prescriptions.map((p, i) => (
                <HRow key={p.id} gap={10} style={{ padding: '8px 0', borderBottom: i < prescriptions.length - 1 ? `1px solid ${T.line}` : 'none' }}>
                  <Icon name="medicine" size={16} color={T.brand} />
                  <Body size={13} color={T.ink900}><strong>{p.medication_name}</strong> {p.dosage}{p.unit} — {p.frequency}</Body>
                </HRow>
              ))}
            </Stack>
          </Card>
        </div>
      )}

      <div className="slide-up stagger-5" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
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

function MiniCard({ icon, label, value, sub, onClick, tone }: { icon: string; label: string; value: string; sub?: string; onClick?: () => void; tone?: 'accent' }) {
  return (
    <Card p={16} onClick={onClick}>
      <HRow gap={8} style={{ marginBottom: 8 }}>
        <div style={{ width: 26, height: 26, borderRadius: T.radius.sm, background: tone === 'accent' ? T.accentSoft : T.brandWash, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={14} color={tone === 'accent' ? T.accent : T.brand} />
        </div>
        <Eyebrow color={T.ink400}>{label}</Eyebrow>
      </HRow>
      <Body size={16} weight={600} color={tone === 'accent' ? T.accent : T.ink900} style={{ marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</Body>
      {sub && <Body size={11.5} color={T.ink400} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</Body>}
    </Card>
  );
}

function PctChip({ label, value, pct }: { label: string; value: string; pct: number | null }) {
  const tone = pct == null ? T.ink400 : pct < 3 || pct > 97 ? T.danger : pct < 15 || pct > 85 ? T.gold : T.success;
  return (
    <div style={{ padding: '10px 14px', borderRadius: T.radius.md, background: T.surfaceDim, minWidth: 92 }}>
      <Mono size={9} style={{ textTransform: 'uppercase' }}>{label}</Mono>
      <Body size={15} weight={600} color={T.ink900} style={{ marginTop: 2 }}>{value}</Body>
      <Body size={12} weight={600} color={tone}>{fmtPct(pct)}</Body>
    </div>
  );
}

function computeNextVaccine(records: VaccinationRecord[], ageMonths: number): { vaccineName: string; label: string; overdue: boolean } | null {
  let overdue: { vaccineName: string; label: string } | null = null;
  let dueSoon: { vaccineName: string; label: string } | null = null;
  for (const dose of IAP_SCHEDULE) {
    const { status } = doseStatus(dose, ageMonths, records);
    if (status === 'overdue' && !overdue) overdue = { vaccineName: dose.vaccineName, label: `Overdue · ${dose.doseLabel}` };
    if (status === 'due-soon' && !dueSoon) dueSoon = { vaccineName: dose.vaccineName, label: `Due now · ${dose.doseLabel}` };
  }
  if (overdue) return { ...overdue, overdue: true };
  if (dueSoon) return { ...dueSoon, overdue: false };
  return null;
}

// ── Visits ──────────────────────────────────────────────────────────────────────

function VisitsTab({ visits, onNew }: { visits: Consultation[]; onNew: () => void }) {
  const [open, setOpen] = React.useState<string | null>(null);
  return (
    <Stack gap={16}>
      <SectionHeader title="Visit history" action={<Button size="sm" icon="plus" onClick={onNew}>New visit</Button>} />
      {visits.length === 0 ? (
        <Card p={0}><EmptyState icon="timeline" title="No visits recorded yet" sub="Document the first consultation to start the timeline." action={<Button size="sm" icon="plus" onClick={onNew}>New visit</Button>} /></Card>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 22 }}>
          <div style={{ position: 'absolute', left: 6, top: 6, bottom: 6, width: 2, background: T.brandWash }} />
          <Stack gap={12}>
            {visits.map(v => (
              <div key={v.id} style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: -22, top: 18, width: 12, height: 12, borderRadius: '50%', background: T.brand, border: `2px solid ${T.bg}` }} />
                <Card p={16} onClick={() => setOpen(o => o === v.id ? null : v.id)}>
                  <HRow gap={10} style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Stack gap={3} style={{ flex: 1, minWidth: 0 }}>
                      <HRow gap={8} style={{ flexWrap: 'wrap' }}>
                        <Body size={14} weight={600} color={T.ink900}>{v.chief_complaint || 'Consultation'}</Body>
                        <Chip tone="soft">{v.visit_type.replace('_', ' ')}</Chip>
                      </HRow>
                      <Mono size={10}>{fmtDate(v.consultation_date)}</Mono>
                    </Stack>
                    <Icon name={open === v.id ? 'chevronU' : 'chevronD'} size={16} color={T.ink400} />
                  </HRow>
                  {open === v.id && (
                    <Stack gap={10} style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.line}` }}>
                      <Field label="History" value={v.history_of_present_illness} />
                      <Field label="Examination" value={v.examination_findings} />
                      <Field label="Assessment" value={v.assessment} />
                      <Field label="Plan" value={v.plan} />
                      {v.diagnosis_codes?.length ? (
                        <Stack gap={4}><Eyebrow color={T.ink400}>Diagnosis</Eyebrow><HRow gap={6} style={{ flexWrap: 'wrap' }}>{v.diagnosis_codes.map(c => <Chip key={c} tone="wash">{c}</Chip>)}</HRow></Stack>
                      ) : null}
                      {v.follow_up_days != null && <Body size={12.5} color={T.ink500}>Follow-up in {v.follow_up_days} days</Body>}
                    </Stack>
                  )}
                </Card>
              </div>
            ))}
          </Stack>
        </div>
      )}
    </Stack>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <Stack gap={3}>
      <Eyebrow color={T.ink400}>{label}</Eyebrow>
      <Body size={13} color={T.ink700} lh={1.5}>{value}</Body>
    </Stack>
  );
}

// ── Rx ────────────────────────────────────────────────────────────────────────

function RxTab({ prescriptions, childId, onWrite, onChange, show }: {
  prescriptions: Prescription[]; childId: string; onWrite: () => void;
  onChange: (next: Prescription[]) => void; show: (m: string, t?: 'success' | 'error' | 'warn' | 'default') => void;
}) {
  const active = prescriptions.filter(p => p.is_active);
  const past = prescriptions.filter(p => !p.is_active);

  async function deactivate(id: string) {
    onChange(prescriptions.map(p => p.id === id ? { ...p, is_active: false } : p)); // optimistic
    const res = await fetch(`/api/patients/${childId}/clinical`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prescriptionId: id, isActive: false }),
    });
    if (!res.ok) { show('Could not deactivate', 'error'); onChange(prescriptions); }
    else show('Prescription deactivated', 'success');
  }

  return (
    <Stack gap={16}>
      <SectionHeader title="Prescriptions" action={<Button size="sm" icon="plus" onClick={onWrite}>Write Rx</Button>} />
      {prescriptions.length === 0 ? (
        <Card p={0}><EmptyState icon="rx" title="No prescriptions yet" sub="Write a prescription — the parent sees it instantly in ChildBloom." action={<Button size="sm" icon="plus" onClick={onWrite}>Write Rx</Button>} /></Card>
      ) : (
        <>
          {active.length > 0 && (
            <Card p={0}>
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.line}` }}><Eyebrow color={T.brand}>Active</Eyebrow></div>
              {active.map((p, i) => <RxRow key={p.id} p={p} last={i === active.length - 1} onDeactivate={() => deactivate(p.id)} />)}
            </Card>
          )}
          {past.length > 0 && (
            <Card p={0}>
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.line}` }}><Eyebrow color={T.ink400}>Past</Eyebrow></div>
              {past.map((p, i) => <RxRow key={p.id} p={p} last={i === past.length - 1} inactive />)}
            </Card>
          )}
        </>
      )}
    </Stack>
  );
}

function RxRow({ p, last, inactive, onDeactivate }: { p: Prescription; last: boolean; inactive?: boolean; onDeactivate?: () => void }) {
  return (
    <div style={{ padding: '14px 18px', borderBottom: last ? 'none' : `1px solid ${T.line}`, opacity: inactive ? 0.6 : 1 }}>
      <HRow gap={10} style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Stack gap={3} style={{ flex: 1 }}>
          <HRow gap={8} style={{ flexWrap: 'wrap' }}>
            <Body size={14} weight={600} color={T.ink900} style={{ textDecoration: inactive ? 'line-through' : 'none' }}>{p.medication_name}</Body>
            <Chip tone="soft">{p.dosage}{p.unit}</Chip>
            <Chip tone="wash">{p.frequency}</Chip>
            <Chip tone="surface">{p.route}</Chip>
            {p.duration_days != null && <Chip tone="soft">{p.duration_days}d</Chip>}
          </HRow>
          {p.instructions && <Body size={12.5} color={T.ink500}>{p.instructions}</Body>}
          <Mono size={10}>Prescribed {fmtDate(p.prescribed_at)}</Mono>
        </Stack>
        {!inactive && onDeactivate && (
          <button onClick={onDeactivate} className="dr-btn" style={{ height: 30, padding: '0 12px', borderRadius: T.radius.pill, background: T.surfaceDim, color: T.ink500, border: 'none', fontFamily: T.sans, fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 } as React.CSSProperties}>Deactivate</button>
        )}
      </HRow>
    </div>
  );
}

// ── Vaccines ────────────────────────────────────────────────────────────────────

function VaccinesTab({ records, ageMonths, onRecord }: { records: VaccinationRecord[]; ageMonths: number; onRecord: () => void }) {
  const rows = IAP_SCHEDULE.map(dose => ({ dose, ...doseStatus(dose, ageMonths, records) }));
  const groups: { key: DoseStatus; label: string }[] = [
    { key: 'overdue', label: 'Overdue' },
    { key: 'due-soon', label: 'Due now' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'done', label: 'Completed' },
  ];
  const doneCount = rows.filter(r => r.status === 'done').length;

  return (
    <Stack gap={16}>
      <SectionHeader title="Immunization" action={<Button size="sm" icon="plus" onClick={onRecord}>Record vaccine</Button>} />
      <Card p={16}>
        <HRow gap={12} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Body size={13} color={T.ink500}>{doneCount} of {IAP_SCHEDULE.length} scheduled doses recorded · IAP schedule</Body>
          <Mono size={11}>{Math.round((doneCount / IAP_SCHEDULE.length) * 100)}%</Mono>
        </HRow>
      </Card>
      {groups.map(g => {
        const items = rows.filter(r => r.status === g.key);
        if (items.length === 0) return null;
        return (
          <Card key={g.key} p={0}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.line}` }}>
              <Eyebrow color={g.key === 'overdue' ? T.accent : g.key === 'done' ? T.brand : T.ink400}>{g.label} · {items.length}</Eyebrow>
            </div>
            {items.map((r, i) => (
              <div key={r.dose.key} style={{ display: 'flex', gap: 12, padding: '12px 18px', alignItems: 'center', borderBottom: i < items.length - 1 ? `1px solid ${T.line}` : 'none' }}>
                <Icon name={r.status === 'done' ? 'check' : 'syringe'} size={16} stroke={r.status === 'done' ? 2 : 1.6} color={r.status === 'done' ? T.success : r.status === 'overdue' ? T.accent : T.ink400} />
                <Stack gap={2} style={{ flex: 1 }}>
                  <Body size={13.5} weight={600} color={T.ink900}>{r.dose.vaccineName} <span style={{ color: T.ink400, fontWeight: 400 }}>· {r.dose.doseLabel}</span></Body>
                  {r.record
                    ? <Mono size={10}>Given {fmtDate(r.record.administered_at)}{r.record.facility ? ` · ${r.record.facility}` : ''}</Mono>
                    : <Mono size={10}>Recommended ~{r.dose.recommendedAgeMonths < 1 ? 'birth' : `${r.dose.recommendedAgeMonths} mo`}</Mono>}
                </Stack>
                <Chip tone={STATUS_TONE[r.status]}>{r.status === 'done' ? 'Done' : r.status === 'overdue' ? 'Overdue' : r.status === 'due-soon' ? 'Due' : 'Upcoming'}</Chip>
              </div>
            ))}
          </Card>
        );
      })}
    </Stack>
  );
}

// ── Growth ──────────────────────────────────────────────────────────────────────

function GrowthTab({ growth }: { growth: GrowthPayload }) {
  if (!growth.data.length) {
    return <Card p={0}><EmptyState icon="growth" title="No growth measurements yet" sub="Weight, height and head-circumference logged in ChildBloom will plot here against WHO percentiles." /></Card>;
  }
  if (!growth.sex || !growth.bands) {
    // No sex on file → can't compute WHO percentiles; fall back to plain trend.
    const weightPoints = growth.data.map(m => m.weightKg ?? 0).reverse();
    const heightPoints = growth.data.map(m => m.heightCm ?? 0).reverse();
    return (
      <Stack gap={16}>
        <Card p={16}><Body size={12.5} color={T.ink500}>Add the child&apos;s sex in ChildBloom to overlay WHO percentile bands. Showing raw trend for now.</Body></Card>
        <Card p={18}><Eyebrow color={T.ink400} style={{ marginBottom: 12 }}>Weight (kg)</Eyebrow><Spark points={weightPoints} w={600} h={80} color={T.brand} /></Card>
        <Card p={18}><Eyebrow color={T.ink400} style={{ marginBottom: 12 }}>Height (cm)</Eyebrow><Spark points={heightPoints} w={600} h={80} color={T.brandSoft} /></Card>
        <GrowthHistory data={growth.data} />
      </Stack>
    );
  }

  const charts: { metric: 'wfa' | 'hfa' | 'hcfa' | 'bmi'; title: string; unit: string; pick: (m: EnrichedMeasurement) => { v: number | null; p: number | null } }[] = [
    { metric: 'wfa', title: 'Weight-for-age', unit: 'kg', pick: m => ({ v: m.weightKg, p: m.weightPct }) },
    { metric: 'hfa', title: 'Height-for-age', unit: 'cm', pick: m => ({ v: m.heightCm, p: m.heightPct }) },
    { metric: 'hcfa', title: 'Head circumference', unit: 'cm', pick: m => ({ v: m.hcCm, p: m.hcPct }) },
    { metric: 'bmi', title: 'BMI-for-age', unit: 'kg/m²', pick: m => ({ v: m.bmi, p: m.bmiPct }) },
  ];

  return (
    <Stack gap={16}>
      {charts.map(c => {
        const points: GrowthPoint[] = growth.data
          .map(m => { const { v, p } = c.pick(m); return v != null ? { ageMonths: m.ageMonths, value: v, pct: p } : null; })
          .filter((x): x is GrowthPoint => x !== null);
        if (!points.length) return null;
        const latest = [...points].sort((a, b) => b.ageMonths - a.ageMonths)[0];
        return (
          <Card key={c.metric} p={18}>
            <HRow gap={10} style={{ justifyContent: 'space-between', marginBottom: 12 }}>
              <Eyebrow color={T.ink400}>{c.title}</Eyebrow>
              <Chip tone="wash">{fmtPct(latest.pct)}</Chip>
            </HRow>
            <GrowthChart bands={growth.bands![c.metric]} points={points} unit={c.unit} />
          </Card>
        );
      })}
      <GrowthHistory data={growth.data} />
    </Stack>
  );
}

function GrowthHistory({ data }: { data: EnrichedMeasurement[] }) {
  return (
    <Card p={0}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.line}` }}><Display size={18} italic weight={400}>Measurement history</Display></div>
      {data.map((m, i) => (
        <div key={m.id} style={{ display: 'flex', gap: 14, padding: '12px 20px', alignItems: 'center', borderBottom: i < data.length - 1 ? `1px solid ${T.line}` : 'none' }}>
          <Icon name="growth" size={16} color={T.brand} />
          <Mono size={10} style={{ width: 84, flexShrink: 0 }}>{fmtDate(m.measured_at)}</Mono>
          <HRow gap={6} style={{ flex: 1, flexWrap: 'wrap' }}>
            {m.weightKg != null && <Chip tone="wash">{m.weightKg.toFixed(2)} kg · {fmtPct(m.weightPct)}</Chip>}
            {m.heightCm != null && <Chip tone="soft">{m.heightCm} cm · {fmtPct(m.heightPct)}</Chip>}
            {m.hcCm != null && <Chip tone="cream">{m.hcCm} cm head</Chip>}
          </HRow>
          <Chip tone="surface">{m.source}</Chip>
        </div>
      ))}
    </Card>
  );
}

// ── Parent-logged stream tabs (unchanged behaviour, error-safe wrapper) ──────────

function SleepTab({ logs }: { logs: SleepLog[] }) {
  const avgHours = logs.length ? logs.reduce((s, l) => s + (l.duration_minutes ?? 0) / 60, 0) / logs.length : 0;
  const sleepPoints = logs.slice(0, 30).map(l => (l.duration_minutes ?? 0) / 60).reverse();
  if (logs.length === 0) return <Card p={0}><EmptyState icon="sleep" title="No sleep logs in 90 days" /></Card>;
  return (
    <Stack gap={16}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card p={18}><Eyebrow color={T.ink400} style={{ marginBottom: 6 }}>Avg hours / night</Eyebrow><Body size={28} weight={600} color={T.ink900}>{avgHours.toFixed(1)}h</Body></Card>
        <Card p={18}><Eyebrow color={T.ink400} style={{ marginBottom: 6 }}>Logs (90 days)</Eyebrow><Body size={28} weight={600} color={T.ink900}>{logs.length}</Body></Card>
      </div>
      {sleepPoints.length > 1 && <Card p={18}><Eyebrow color={T.ink400} style={{ marginBottom: 12 }}>Sleep duration trend</Eyebrow><Spark points={sleepPoints} w={600} h={80} color={T.brandSoft} /></Card>}
      <Card p={0}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.line}` }}><Display size={18} italic weight={400}>Sleep log</Display></div>
        {logs.map((log, i) => (
          <div key={log.id} style={{ display: 'flex', gap: 14, padding: '12px 20px', alignItems: 'center', borderBottom: i < logs.length - 1 ? `1px solid ${T.line}` : 'none' }}>
            <Icon name="sleep" size={16} color={T.brandSoft} />
            <Stack gap={2} style={{ flex: 1 }}>
              <Body size={13.5} weight={500} color={T.ink900}>{log.duration_minutes ? `${(log.duration_minutes / 60).toFixed(1)}h` : 'Ongoing'}{log.sleep_type && <span style={{ color: T.ink400, fontWeight: 400 }}> · {log.sleep_type}</span>}</Body>
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

function FeedingTab({ logs }: { logs: FeedingLog[] }) {
  if (logs.length === 0) return <Card p={0}><EmptyState icon="feed" title="No feeding logs recorded" /></Card>;
  return (
    <Card p={0}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.line}` }}><Display size={18} italic weight={400}>Feeding log · {logs.length} entries</Display></div>
      {logs.map((log, i) => (
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

function SymptomsTab({ reports }: { reports: SymptomReport[] }) {
  const severityColor = (s: number) => s >= 4 ? T.danger : s === 3 ? T.accent : s === 2 ? T.gold : T.brandSoft;
  if (reports.length === 0) return <Card p={0}><EmptyState icon="thermo" title="No symptoms logged" /></Card>;
  return (
    <Card p={0}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.line}` }}><Display size={18} italic weight={400}>Symptom reports · {reports.length}</Display></div>
      {reports.map((r, i) => (
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

function MilestonesTab({ milestones }: { milestones: Milestone[] }) {
  if (milestones.length === 0) return <Card p={0}><EmptyState icon="milestone" title="No milestones logged yet" /></Card>;
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

// ── Side panels ─────────────────────────────────────────────────────────────────

function SidePanel({ title, sub, isMobile, onClose, children }: { title: string; sub?: string; isMobile: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="slide-left" style={{
      width: isMobile ? '100%' : 380, height: isMobile ? '88vh' : '100vh',
      position: isMobile ? 'fixed' : 'relative', bottom: isMobile ? 0 : undefined, left: isMobile ? 0 : undefined, right: isMobile ? 0 : undefined,
      background: T.surface, borderLeft: `1px solid ${T.line}`, display: 'flex', flexDirection: 'column',
      zIndex: isMobile ? 55 : undefined, boxShadow: isMobile ? T.shadow.lg : 'none',
      borderRadius: isMobile ? `${T.radius.xl}px ${T.radius.xl}px 0 0` : 0,
    }}>
      <HRow gap={10} style={{ alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px', borderBottom: `1px solid ${T.line}`, flexShrink: 0 }}>
        <Stack gap={2}>
          <Body size={14} weight={600} color={T.ink900}>{title}</Body>
          {sub && <Body size={12} color={T.ink400}>{sub}</Body>}
        </Stack>
        <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: T.radius.pill, background: T.surfaceDim, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.ink700, cursor: 'pointer' }}><Icon name="close" size={15} stroke={1.7} /></button>
      </HRow>
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>{children}</div>
    </div>
  );
}

function NotePanel({ child, parent, isMobile, onClose, show }: { child: Child; parent: Pick<UserProfile, 'id' | 'full_name' | 'email'> | null; isMobile: boolean; onClose: () => void; show: (m: string, t?: 'success' | 'error' | 'warn' | 'default') => void }) {
  const [text, setText] = React.useState('');
  const [sending, setSending] = React.useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/patients/${child.id}/message`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text.trim() }) });
      if (res.ok) { show(`Note sent to ${parent?.full_name ?? 'parent'}`, 'success'); onClose(); }
      else { const j = await res.json(); show(j.error ?? 'Failed to send', 'error'); }
    } catch { show('Network error', 'error'); }
    setSending(false);
  }
  return (
    <SidePanel title="Send note to parent" sub={`${parent?.full_name ?? 'Parent'} · ${child.first_name}`} isMobile={isMobile} onClose={onClose}>
      <form onSubmit={submit}>
        <Textarea value={text} onChange={setText} placeholder={`E.g. "${child.first_name}'s weight is on track. Please log sleep for the next 7 days."`} rows={5} />
        <Body size={11} color={T.ink400} style={{ marginTop: 6, marginBottom: 14 }}>Parent sees this as a notification in ChildBloom.</Body>
        <Button type="submit" variant="accent" full disabled={sending || !text.trim()}>{sending ? 'Sending…' : 'Send note'}</Button>
      </form>
    </SidePanel>
  );
}

function VaccinePanel({ childId, isMobile, onClose, onDone, show }: { childId: string; isMobile: boolean; onClose: () => void; onDone: (r: VaccinationRecord) => void; show: (m: string, t?: 'success' | 'error' | 'warn' | 'default') => void }) {
  const [vaccineName, setVaccineName] = React.useState(VACCINE_OPTIONS[0] ?? '');
  const [doseNumber, setDoseNumber] = React.useState('');
  const [administeredAt, setAdministeredAt] = React.useState(new Date().toISOString().slice(0, 10));
  const [batchNumber, setBatch] = React.useState('');
  const [facility, setFacility] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/patients/${childId}/clinical`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'vaccine', vaccineName, doseNumber: doseNumber ? Number(doseNumber) : null, administeredAt, batchNumber: batchNumber || null, facility: facility || null }),
      });
      const json = await res.json();
      if (res.ok) {
        if (!json.record) { show('Unexpected response from server', 'error'); }
        else onDone(json.record as VaccinationRecord);
      } else show(json.error ?? 'Failed', 'error');
    } catch { show('Network error', 'error'); }
    setSaving(false);
  }

  return (
    <SidePanel title="Record vaccine" sub="Writes to ChildBloom · notifies parent" isMobile={isMobile} onClose={onClose}>
      <form onSubmit={submit}>
        <Stack gap={14}>
          <Select label="Vaccine" value={vaccineName} onChange={e => setVaccineName(e.target.value)}>
            {VACCINE_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
          </Select>
          <HRow gap={10}>
            <Input label="Dose #" type="number" value={doseNumber} onChange={e => setDoseNumber(e.target.value)} placeholder="1" style={{ width: '100%' }} />
            <Input label="Date given" type="date" value={administeredAt} onChange={e => setAdministeredAt(e.target.value)} style={{ width: '100%' }} />
          </HRow>
          <Input label="Batch number" value={batchNumber} onChange={e => setBatch(e.target.value)} placeholder="Optional" />
          <Input label="Facility" value={facility} onChange={e => setFacility(e.target.value)} placeholder="Optional" />
          <Button type="submit" full disabled={saving || !vaccineName}>{saving ? 'Saving…' : 'Record vaccine'}</Button>
        </Stack>
      </form>
    </SidePanel>
  );
}

function RxPanel({ childId, isMobile, onClose, onDone, show }: { childId: string; isMobile: boolean; onClose: () => void; onDone: (r: Prescription) => void; show: (m: string, t?: 'success' | 'error' | 'warn' | 'default') => void }) {
  const [f, setF] = React.useState({ medicationName: '', dosage: '', unit: 'mg', frequency: '', route: 'oral', durationDays: '', instructions: '' });
  const [saving, setSaving] = React.useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF(p => ({ ...p, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/patients/${childId}/clinical`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'prescription', ...f, durationDays: f.durationDays ? Number(f.durationDays) : null }),
      });
      const json = await res.json();
      if (res.ok) {
        if (!json.prescription) { show('Unexpected response from server', 'error'); }
        else onDone(json.prescription as Prescription);
      } else show(json.error ?? 'Failed', 'error');
    } catch { show('Network error', 'error'); }
    setSaving(false);
  }

  return (
    <SidePanel title="Write prescription" sub="Parent sees it instantly in ChildBloom" isMobile={isMobile} onClose={onClose}>
      <form onSubmit={submit}>
        <Stack gap={14}>
          <Input label="Medication" value={f.medicationName} onChange={set('medicationName')} placeholder="e.g. Amoxicillin" required />
          <HRow gap={10}>
            <Input label="Dosage" value={f.dosage} onChange={set('dosage')} placeholder="250" style={{ width: '100%' }} required />
            <Select label="Unit" value={f.unit} onChange={set('unit')}>
              {['mg', 'ml', 'mcg', 'g', 'drops', 'tablet', 'puff', 'units'].map(u => <option key={u} value={u}>{u}</option>)}
            </Select>
          </HRow>
          <Input label="Frequency" value={f.frequency} onChange={set('frequency')} placeholder="e.g. twice daily" required />
          <HRow gap={10}>
            <Select label="Route" value={f.route} onChange={set('route')}>
              {['oral', 'topical', 'inhaled', 'injection', 'drops', 'other'].map(r => <option key={r} value={r}>{r}</option>)}
            </Select>
            <Input label="Duration (days)" type="number" value={f.durationDays} onChange={set('durationDays')} placeholder="5" style={{ width: '100%' }} />
          </HRow>
          <Textarea value={f.instructions} onChange={v => setF(p => ({ ...p, instructions: v }))} placeholder="Instructions for the parent (optional)" rows={3} label="Instructions" />
          <Button type="submit" full disabled={saving || !f.medicationName || !f.dosage || !f.frequency}>{saving ? 'Sending…' : 'Send prescription'}</Button>
        </Stack>
      </form>
    </SidePanel>
  );
}

function VisitPanel({ childId, isMobile, onClose, onDone, show }: { childId: string; isMobile: boolean; onClose: () => void; onDone: (r: Consultation) => void; show: (m: string, t?: 'success' | 'error' | 'warn' | 'default') => void }) {
  const [f, setF] = React.useState({ visitType: 'routine', chiefComplaint: '', historyOfPresentIllness: '', examinationFindings: '', assessment: '', plan: '', followUpDays: '' });
  const [pushSummary, setPushSummary] = React.useState(true);
  const [parentSummary, setParentSummary] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const setT_ = (k: keyof typeof f) => (v: string) => setF(p => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/patients/${childId}/clinical`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'consultation', ...f, followUpDays: f.followUpDays ? Number(f.followUpDays) : null, pushParentSummary: pushSummary, parentSummary: pushSummary ? (parentSummary || f.plan || f.assessment) : null }),
      });
      const json = await res.json();
      if (res.ok) {
        if (!json.consultation) { show('Unexpected response from server', 'error'); }
        else onDone(json.consultation as Consultation);
      } else show(json.error ?? 'Failed', 'error');
    } catch { show('Network error', 'error'); }
    setSaving(false);
  }

  return (
    <SidePanel title="New visit" sub="Clinical note — stored for you" isMobile={isMobile} onClose={onClose}>
      <form onSubmit={submit}>
        <Stack gap={14}>
          <Select label="Visit type" value={f.visitType} onChange={e => setF(p => ({ ...p, visitType: e.target.value }))}>
            {['routine', 'sick', 'follow_up', 'emergency', 'telehealth'].map(v => <option key={v} value={v}>{v.replace('_', ' ')}</option>)}
          </Select>
          <Input label="Chief complaint" value={f.chiefComplaint} onChange={e => setF(p => ({ ...p, chiefComplaint: e.target.value }))} placeholder="e.g. Fever 2 days" />
          <Textarea label="History of present illness" value={f.historyOfPresentIllness} onChange={setT_('historyOfPresentIllness')} rows={2} />
          <Textarea label="Examination findings" value={f.examinationFindings} onChange={setT_('examinationFindings')} rows={2} />
          <Textarea label="Assessment" value={f.assessment} onChange={setT_('assessment')} rows={2} />
          <Textarea label="Plan" value={f.plan} onChange={setT_('plan')} rows={2} />
          <Input label="Follow-up (days)" type="number" value={f.followUpDays} onChange={e => setF(p => ({ ...p, followUpDays: e.target.value }))} placeholder="7" />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={pushSummary} onChange={e => setPushSummary(e.target.checked)} style={{ width: 16, height: 16, accentColor: T.brand }} />
            <Body size={13} color={T.ink700}>Send a summary to the parent</Body>
          </label>
          {pushSummary && <Textarea value={parentSummary} onChange={setParentSummary} placeholder="Parent-friendly summary (defaults to your Plan)" rows={2} />}
          <Button type="submit" full disabled={saving}>{saving ? 'Saving…' : 'Save visit'}</Button>
        </Stack>
      </form>
    </SidePanel>
  );
}

function Textarea({ value, onChange, placeholder, rows = 3, label }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; label?: string }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.ink500 }}>{label}</span>}
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        style={{ width: '100%', padding: '12px 14px', borderRadius: T.radius.md, border: `1px solid ${T.line}`, background: T.surfaceDim, fontFamily: T.sans, fontSize: 13.5, color: T.ink900, outline: 'none', resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box' }} />
    </label>
  );
}

function IrisPanel({ child, isMobile, onClose }: { child: Child; isMobile: boolean; onClose: () => void }) {
  const [messages, setMessages] = React.useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setLoading(true);
    fetch('/api/iris', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ childId: child.id, message: 'Generate a pre-visit brief for this patient.', history: [], userRole: 'doctor' }) })
      .then(r => r.json()).then(json => { if (json.reply) setMessages([{ role: 'assistant', content: json.reply }]); }).finally(() => setLoading(false));
  }, [child.id]);

  React.useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    const userMsg = input.trim(); setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]); setSending(true);
    try {
      const res = await fetch('/api/iris', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ childId: child.id, message: userMsg, history: messages, userRole: 'doctor' }) });
      const json = await res.json();
      if (json.reply) setMessages(prev => [...prev, { role: 'assistant', content: json.reply }]);
    } catch (err) {
      console.error('[Iris chat] send failed:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I couldn\'t process that request. Please try again.' }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <SidePanel title={`Ask Iris about ${child.first_name}`} sub="AI clinical assistant" isMobile={isMobile} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: '60vh' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading && <div style={{ padding: '12px 14px', background: T.brandWash, borderRadius: T.radius.md }}><Body size={13} color={T.brand}>Generating pre-visit brief…</Body></div>}
          {messages.map((m, i) => (
            <div key={i} style={{ padding: '12px 14px', borderRadius: T.radius.md, maxWidth: '94%', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', background: m.role === 'user' ? T.brand : T.brandWash, color: m.role === 'user' ? '#fff' : T.ink900 }}>
              <Body size={13} color="inherit" lh={1.5}>{m.content}</Body>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <form onSubmit={send} style={{ position: 'sticky', bottom: 0, background: T.surface, paddingTop: 8 }}>
          <HRow gap={8}>
            <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask Iris…" disabled={sending}
              style={{ flex: 1, height: 40, padding: '0 14px', borderRadius: T.radius.pill, border: `1px solid ${T.line}`, background: T.surfaceDim, fontFamily: T.sans, fontSize: 13, color: T.ink900, outline: 'none' }} />
            <button type="submit" disabled={sending || !input.trim()} style={{ width: 40, height: 40, borderRadius: T.radius.pill, background: T.brand, color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: sending ? 'not-allowed' : 'pointer', opacity: sending || !input.trim() ? 0.5 : 1 }}>
              <Icon name="send" size={15} color="#fff" stroke={1.7} />
            </button>
          </HRow>
        </form>
      </div>
    </SidePanel>
  );
}
