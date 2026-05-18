'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { theme as T } from '@/lib/theme';
import { ageFromDob } from '@/lib/age';
import { createClient } from '@/lib/supabase/client';
import { Stack, HRow, Card, Button, Display, Body, Mono, Eyebrow, Avatar, Chip, Spacer, Ring, Spark, Divider, Input, ProgressBar } from '@/components/primitives';
import { Icon } from '@/components/Icon';

type Tab = 'overview' | 'vitals' | 'growth' | 'milestones' | 'contacts';

interface Props {
  child: any;
  vitals: any[];
  growth: any[];
  milestones: any[];
  emergencyContacts: any[];
}

export function ChildProfileClient({ child, vitals, growth, milestones, emergencyContacts }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [tab, setTab] = React.useState<Tab>('overview');
  const [isMobile, setIsMobile] = React.useState(false);

  // Add vital form
  const [vitalForm, setVitalForm] = React.useState({ temp: '', hr: '', sleep: '', mood: '', notes: '' });
  const [savingVital, setSavingVital] = React.useState(false);

  // Add milestone form
  const [msForm, setMsForm] = React.useState({ title: '', target: '', notes: '' });
  const [savingMs, setSavingMs] = React.useState(false);

  // Add contact form
  const [cForm, setCForm] = React.useState({ label: '', name: '', phone: '', relation: '' });
  const [savingC, setSavingC] = React.useState(false);

  // Add growth form
  const [growthForm, setGrowthForm] = React.useState({ weight: '', height: '', head: '' });
  const [savingGrowth, setSavingGrowth] = React.useState(false);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check(); window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  async function addVital(e: React.FormEvent) {
    e.preventDefault(); setSavingVital(true);
    await supabase.from('vitals').insert({
      child_id: child.id,
      recorded_at: new Date().toISOString(),
      temp_c: vitalForm.temp ? parseFloat(vitalForm.temp) : null,
      heart_rate: vitalForm.hr ? parseInt(vitalForm.hr) : null,
      sleep_hours: vitalForm.sleep ? parseFloat(vitalForm.sleep) : null,
      mood: vitalForm.mood || null,
      notes: vitalForm.notes || null,
    });
    setVitalForm({ temp: '', hr: '', sleep: '', mood: '', notes: '' });
    setSavingVital(false);
    router.refresh();
  }

  async function addMilestone(e: React.FormEvent) {
    e.preventDefault(); setSavingMs(true);
    await supabase.from('milestones').insert({
      child_id: child.id,
      title: msForm.title,
      target_date: msForm.target || null,
      notes: msForm.notes || null,
    });
    setMsForm({ title: '', target: '', notes: '' });
    setSavingMs(false);
    router.refresh();
  }

  async function addContact(e: React.FormEvent) {
    e.preventDefault(); setSavingC(true);
    await supabase.from('emergency_contacts').insert({
      child_id: child.id,
      label: cForm.label,
      name: cForm.name,
      phone: cForm.phone,
      relation: cForm.relation || null,
    });
    setCForm({ label: '', name: '', phone: '', relation: '' });
    setSavingC(false);
    router.refresh();
  }

  async function addGrowth(e: React.FormEvent) {
    e.preventDefault(); setSavingGrowth(true);
    await supabase.from('growth').insert({
      child_id: child.id,
      measured_at: new Date().toISOString(),
      weight_kg: growthForm.weight ? parseFloat(growthForm.weight) : null,
      height_cm: growthForm.height ? parseFloat(growthForm.height) : null,
      head_cm: growthForm.head ? parseFloat(growthForm.head) : null,
    });
    setGrowthForm({ weight: '', height: '', head: '' });
    setSavingGrowth(false);
    router.refresh();
  }

  async function achieveMilestone(id: string) {
    await supabase.from('milestones').update({ achieved_at: new Date().toISOString() }).eq('id', id);
    router.refresh();
  }

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview',   label: 'Overview',   icon: 'home'      },
    { id: 'vitals',     label: 'Vitals',     icon: 'thermo'    },
    { id: 'growth',     label: 'Growth',     icon: 'growth'    },
    { id: 'milestones', label: 'Milestones', icon: 'milestone' },
    { id: 'contacts',   label: 'Contacts',   icon: 'shield'    },
  ];

  const latestVital = vitals[0];
  const latestGrowth = growth[0];
  const sleepData = vitals.slice(0, 10).map(v => v.sleep_hours ?? 0).reverse();

  return (
    <div className="enter" style={{ height: '100vh', overflowY: 'auto', background: T.bg }}>
      {/* Header */}
      <div style={{ padding: isMobile ? '16px 18px 12px' : '24px 32px 16px', background: T.bg, borderBottom: `1px solid ${T.line}` }}>
        <HRow gap={12} style={{ marginBottom: 16, alignItems: 'center' }}>
          <button onClick={() => router.back()} style={{ width: 40, height: 40, borderRadius: T.radius.pill, background: T.surface, border: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.ink700, cursor: 'pointer' }}>
            <Icon name="chevronL" size={18} stroke={1.7} />
          </button>
          <HRow gap={14} style={{ alignItems: 'center', flex: 1 }}>
            <Avatar name={child.name} size={52} tone="brand" />
            <Stack gap={3}>
              <Display size={24} italic lh={1.05}>{child.name}</Display>
              <HRow gap={8}>
                <Mono size={11}>{ageFromDob(child.date_of_birth)}</Mono>
                {child.sex && <Mono size={11}>· {child.sex}</Mono>}
              </HRow>
            </Stack>
          </HRow>
          <Link href={`/consult?child=${child.id}`}>
            <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 16px', borderRadius: T.radius.pill, background: T.brand, color: '#fff', border: 'none', fontFamily: T.sans, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Icon name="sparkle" size={14} /> Ask Iris
            </button>
          </Link>
        </HRow>

        {/* Tab bar */}
        <div className="scroll-x" style={{ display: 'flex', gap: 4 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px',
              borderRadius: T.radius.pill, border: 'none', cursor: 'pointer',
              background: tab === t.id ? T.brand : T.surface,
              color: tab === t.id ? '#fff' : T.ink500,
              fontFamily: T.sans, fontSize: 13, fontWeight: tab === t.id ? 600 : 500,
              letterSpacing: T.sansTracking, flexShrink: 0, transition: 'background 0.15s',
            }}>
              <Icon name={t.icon} size={14} stroke={tab === t.id ? 2 : 1.6} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: isMobile ? '16px 14px 40px' : '24px 32px 48px' }}>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
            <Card p={24}>
              <Eyebrow color={T.ink400} style={{ marginBottom: 12 }}>Latest vitals</Eyebrow>
              {latestVital ? (
                <Stack gap={10}>
                  {latestVital.temp_c && <HRow gap={10}><Icon name="thermo" size={16} color={T.accent} /><Body size={14} color={T.ink900}><strong>{latestVital.temp_c}°C</strong> temperature</Body></HRow>}
                  {latestVital.heart_rate && <HRow gap={10}><Icon name="care" size={16} color={T.danger} /><Body size={14} color={T.ink900}><strong>{latestVital.heart_rate} bpm</strong> heart rate</Body></HRow>}
                  {latestVital.sleep_hours && <HRow gap={10}><Icon name="sleep" size={16} color={T.brandSoft} /><Body size={14} color={T.ink900}><strong>{latestVital.sleep_hours}h</strong> sleep</Body></HRow>}
                  {latestVital.mood && <HRow gap={10}><Icon name="mood" size={16} color={T.gold} /><Body size={14} color={T.ink900}>Mood: <strong>{latestVital.mood}</strong></Body></HRow>}
                  <Mono size={10} color={T.ink400}>{new Date(latestVital.recorded_at).toLocaleDateString()}</Mono>
                </Stack>
              ) : <Body size={13} color={T.ink500}>No vitals logged yet.</Body>}
            </Card>

            <Card p={24}>
              <Eyebrow color={T.ink400} style={{ marginBottom: 12 }}>Latest measurements</Eyebrow>
              {latestGrowth ? (
                <Stack gap={10}>
                  {latestGrowth.weight_kg && <HRow gap={8}><Chip tone="wash">{latestGrowth.weight_kg} kg</Chip><Body size={13} color={T.ink500}>weight</Body></HRow>}
                  {latestGrowth.height_cm && <HRow gap={8}><Chip tone="soft">{latestGrowth.height_cm} cm</Chip><Body size={13} color={T.ink500}>height</Body></HRow>}
                  {latestGrowth.head_cm && <HRow gap={8}><Chip tone="cream">{latestGrowth.head_cm} cm</Chip><Body size={13} color={T.ink500}>head circumference</Body></HRow>}
                </Stack>
              ) : <Body size={13} color={T.ink500}>No measurements logged yet.</Body>}
            </Card>

            {sleepData.length > 1 && (
              <Card p={24} style={{ gridColumn: isMobile ? undefined : 'span 2' }}>
                <Eyebrow color={T.ink400} style={{ marginBottom: 12 }}>Sleep trend (last {sleepData.length} entries)</Eyebrow>
                <Spark points={sleepData} w={600} h={60} color={T.brandSoft} />
              </Card>
            )}

            <Card p={24} style={{ gridColumn: isMobile ? undefined : 'span 2' }}>
              <Eyebrow color={T.ink400} style={{ marginBottom: 12 }}>Upcoming milestones</Eyebrow>
              {milestones.filter(m => !m.achieved_at).length === 0
                ? <Body size={13} color={T.ink500}>No pending milestones. Add some in the Milestones tab.</Body>
                : milestones.filter(m => !m.achieved_at).slice(0, 3).map(m => (
                  <HRow key={m.id} gap={12} style={{ padding: '10px 0', borderBottom: `1px solid ${T.line}`, alignItems: 'center' }}>
                    <Icon name="milestone" size={16} color={T.gold} />
                    <Stack gap={1} style={{ flex: 1 }}>
                      <Body size={14} weight={600} color={T.ink900}>{m.title}</Body>
                      {m.target_date && <Mono size={10}>{new Date(m.target_date).toLocaleDateString()}</Mono>}
                    </Stack>
                    <button onClick={() => achieveMilestone(m.id)} style={{ height: 32, padding: '0 12px', borderRadius: T.radius.pill, background: T.brandWash, color: T.brand, border: 'none', fontFamily: T.sans, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Achieved</button>
                  </HRow>
                ))
              }
            </Card>
          </div>
        )}

        {/* VITALS */}
        {tab === 'vitals' && (
          <Stack gap={20}>
            <Card p={28}>
              <Eyebrow color={T.brand} style={{ marginBottom: 16 }}>Log vitals</Eyebrow>
              <form onSubmit={addVital}>
                <Stack gap={12}>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                    <Input label="Temperature (°C)" type="number" step="0.1" placeholder="e.g. 37.2" value={vitalForm.temp} onChange={e => setVitalForm(f => ({ ...f, temp: e.target.value }))} />
                    <Input label="Heart rate (bpm)" type="number" placeholder="e.g. 110" value={vitalForm.hr} onChange={e => setVitalForm(f => ({ ...f, hr: e.target.value }))} />
                    <Input label="Sleep (hours)" type="number" step="0.5" placeholder="e.g. 8.5" value={vitalForm.sleep} onChange={e => setVitalForm(f => ({ ...f, sleep: e.target.value }))} />
                    <Input label="Mood" type="text" placeholder="e.g. happy, fussy, tired" value={vitalForm.mood} onChange={e => setVitalForm(f => ({ ...f, mood: e.target.value }))} />
                  </div>
                  <Input label="Notes" type="text" placeholder="Any additional notes…" value={vitalForm.notes} onChange={e => setVitalForm(f => ({ ...f, notes: e.target.value }))} />
                  <Button type="submit" disabled={savingVital}>{savingVital ? 'Saving…' : 'Log vitals'}</Button>
                </Stack>
              </form>
            </Card>

            <Card p={0}>
              <div style={{ padding: '18px 22px', borderBottom: `1px solid ${T.line}` }}>
                <Display size={20} italic weight={400}>Vitals history</Display>
              </div>
              {vitals.length === 0
                ? <div style={{ padding: 24 }}><Body size={13} color={T.ink500}>No vitals logged yet.</Body></div>
                : vitals.map((v, i) => (
                  <div key={v.id} style={{ padding: '14px 22px', borderBottom: i < vitals.length - 1 ? `1px solid ${T.line}` : 'none' }}>
                    <HRow gap={12} style={{ marginBottom: 6, alignItems: 'center' }}>
                      <Mono size={10} color={T.ink400}>{new Date(v.recorded_at).toLocaleString()}</Mono>
                      {v.mood && <Chip tone="cream">{v.mood}</Chip>}
                    </HRow>
                    <HRow gap={16} style={{ flexWrap: 'wrap' }}>
                      {v.temp_c && <Body size={13} color={T.ink700}><strong>{v.temp_c}°C</strong></Body>}
                      {v.heart_rate && <Body size={13} color={T.ink700}><strong>{v.heart_rate} bpm</strong></Body>}
                      {v.sleep_hours && <Body size={13} color={T.ink700}><strong>{v.sleep_hours}h</strong> sleep</Body>}
                      {v.notes && <Body size={12} color={T.ink500}>{v.notes}</Body>}
                    </HRow>
                  </div>
                ))}
            </Card>
          </Stack>
        )}

        {/* GROWTH */}
        {tab === 'growth' && (
          <Stack gap={20}>
            <Card p={28}>
              <Eyebrow color={T.brand} style={{ marginBottom: 16 }}>Log measurement</Eyebrow>
              <form onSubmit={addGrowth}>
                <Stack gap={12}>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 12 }}>
                    <Input label="Weight (kg)" type="number" step="0.01" placeholder="e.g. 5.4" value={growthForm.weight} onChange={e => setGrowthForm(f => ({ ...f, weight: e.target.value }))} />
                    <Input label="Height (cm)" type="number" step="0.1" placeholder="e.g. 60" value={growthForm.height} onChange={e => setGrowthForm(f => ({ ...f, height: e.target.value }))} />
                    <Input label="Head circ. (cm)" type="number" step="0.1" placeholder="e.g. 40" value={growthForm.head} onChange={e => setGrowthForm(f => ({ ...f, head: e.target.value }))} />
                  </div>
                  <Button type="submit" disabled={savingGrowth}>{savingGrowth ? 'Saving…' : 'Log measurement'}</Button>
                </Stack>
              </form>
            </Card>

            {growth.length > 1 && (
              <Card p={24}>
                <Eyebrow color={T.ink400} style={{ marginBottom: 14 }}>Weight trend</Eyebrow>
                <Spark points={growth.slice(0, 12).map(g => g.weight_kg ?? 0).reverse()} w={560} h={80} color={T.brand} />
              </Card>
            )}

            <Card p={0}>
              <div style={{ padding: '18px 22px', borderBottom: `1px solid ${T.line}` }}>
                <Display size={20} italic weight={400}>Growth history</Display>
              </div>
              {growth.length === 0
                ? <div style={{ padding: 24 }}><Body size={13} color={T.ink500}>No measurements logged yet.</Body></div>
                : growth.map((g, i) => (
                  <div key={g.id} style={{ display: 'flex', gap: 16, padding: '14px 22px', alignItems: 'center', borderBottom: i < growth.length - 1 ? `1px solid ${T.line}` : 'none' }}>
                    <Mono size={10} color={T.ink400} style={{ flexShrink: 0, width: 100 }}>{new Date(g.measured_at).toLocaleDateString()}</Mono>
                    <HRow gap={10} style={{ flexWrap: 'wrap' }}>
                      {g.weight_kg && <Chip tone="wash">{g.weight_kg} kg</Chip>}
                      {g.height_cm && <Chip tone="soft">{g.height_cm} cm</Chip>}
                      {g.head_cm && <Chip tone="cream">{g.head_cm} cm head</Chip>}
                    </HRow>
                  </div>
                ))}
            </Card>
          </Stack>
        )}

        {/* MILESTONES */}
        {tab === 'milestones' && (
          <Stack gap={20}>
            <Card p={28}>
              <Eyebrow color={T.brand} style={{ marginBottom: 16 }}>Add milestone</Eyebrow>
              <form onSubmit={addMilestone}>
                <Stack gap={12}>
                  <Input label="Milestone" type="text" placeholder="e.g. First steps, First words…" value={msForm.title} onChange={e => setMsForm(f => ({ ...f, title: e.target.value }))} required />
                  <Input label="Target date (optional)" type="date" value={msForm.target} onChange={e => setMsForm(f => ({ ...f, target: e.target.value }))} />
                  <Input label="Notes" type="text" placeholder="Any notes…" value={msForm.notes} onChange={e => setMsForm(f => ({ ...f, notes: e.target.value }))} />
                  <Button type="submit" disabled={savingMs}>{savingMs ? 'Saving…' : 'Add milestone'}</Button>
                </Stack>
              </form>
            </Card>

            <Card p={0}>
              <div style={{ padding: '18px 22px', borderBottom: `1px solid ${T.line}` }}>
                <Display size={20} italic weight={400}>Milestones</Display>
              </div>
              {milestones.length === 0
                ? <div style={{ padding: 24 }}><Body size={13} color={T.ink500}>No milestones yet.</Body></div>
                : milestones.map((m, i) => (
                  <div key={m.id} style={{ display: 'flex', gap: 14, padding: '14px 22px', alignItems: 'center', borderBottom: i < milestones.length - 1 ? `1px solid ${T.line}` : 'none' }}>
                    <div style={{ width: 32, height: 32, borderRadius: T.radius.md, background: m.achieved_at ? T.brandWash : T.surfaceDim, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon name={m.achieved_at ? 'check' : 'milestone'} size={16} stroke={2} color={m.achieved_at ? T.success : T.gold} />
                    </div>
                    <Stack gap={2} style={{ flex: 1 }}>
                      <Body size={14} weight={600} color={T.ink900}>{m.title}</Body>
                      {m.target_date && <Mono size={10} color={T.ink400}>Target: {new Date(m.target_date).toLocaleDateString()}</Mono>}
                      {m.achieved_at && <Mono size={10} color={T.success}>Achieved: {new Date(m.achieved_at).toLocaleDateString()}</Mono>}
                      {m.notes && <Body size={12} color={T.ink500}>{m.notes}</Body>}
                    </Stack>
                    {!m.achieved_at && (
                      <button onClick={() => achieveMilestone(m.id)} style={{ height: 32, padding: '0 12px', borderRadius: T.radius.pill, background: T.brandWash, color: T.brand, border: 'none', fontFamily: T.sans, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        Mark done
                      </button>
                    )}
                  </div>
                ))}
            </Card>
          </Stack>
        )}

        {/* CONTACTS */}
        {tab === 'contacts' && (
          <Stack gap={20}>
            <Card p={28}>
              <Eyebrow color={T.brand} style={{ marginBottom: 16 }}>Add emergency contact</Eyebrow>
              <form onSubmit={addContact}>
                <Stack gap={12}>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                    <Input label="Label" type="text" placeholder="e.g. Primary doctor, Grandma" value={cForm.label} onChange={e => setCForm(f => ({ ...f, label: e.target.value }))} required />
                    <Input label="Name" type="text" placeholder="Full name" value={cForm.name} onChange={e => setCForm(f => ({ ...f, name: e.target.value }))} required />
                    <Input label="Phone" type="tel" placeholder="+1 (555) 000-0000" value={cForm.phone} onChange={e => setCForm(f => ({ ...f, phone: e.target.value }))} required />
                    <Input label="Relation" type="text" placeholder="e.g. Grandmother" value={cForm.relation} onChange={e => setCForm(f => ({ ...f, relation: e.target.value }))} />
                  </div>
                  <Button type="submit" disabled={savingC}>{savingC ? 'Saving…' : 'Add contact'}</Button>
                </Stack>
              </form>
            </Card>

            <Card p={0}>
              <div style={{ padding: '18px 22px', borderBottom: `1px solid ${T.line}` }}>
                <Display size={20} italic weight={400}>Emergency contacts</Display>
              </div>
              {emergencyContacts.length === 0
                ? <div style={{ padding: 24 }}><Body size={13} color={T.ink500}>No contacts added yet.</Body></div>
                : emergencyContacts.map((c, i) => (
                  <div key={c.id} style={{ display: 'flex', gap: 14, padding: '14px 22px', alignItems: 'center', borderBottom: i < emergencyContacts.length - 1 ? `1px solid ${T.line}` : 'none' }}>
                    <div style={{ width: 40, height: 40, borderRadius: T.radius.md, background: T.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon name="profile" size={18} color={T.accent} />
                    </div>
                    <Stack gap={2} style={{ flex: 1 }}>
                      <HRow gap={8}>
                        <Body size={14} weight={600} color={T.ink900}>{c.name}</Body>
                        <Chip tone="cream">{c.label}</Chip>
                      </HRow>
                      {c.relation && <Mono size={10} color={T.ink400}>{c.relation}</Mono>}
                    </Stack>
                    <a href={`tel:${c.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px', borderRadius: T.radius.pill, background: T.brand, color: '#fff', fontFamily: T.sans, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                      <Icon name="care" size={14} color="#fff" /> {c.phone}
                    </a>
                  </div>
                ))}
            </Card>
          </Stack>
        )}
      </div>
    </div>
  );
}
