'use client';
import * as React from 'react';
import Link from 'next/link';
import { theme as T } from '@/lib/theme';
import { Stack, HRow, Card, Display, Body, Mono, Eyebrow, Chip, Spacer, Divider } from '@/components/primitives';
import { TopBar } from '@/components/shell/TopBar';
import { Icon } from '@/components/Icon';

const GLOBAL_EMERGENCY = [
  { label: 'International SOS', number: '112', note: 'Works in most countries' },
  { label: 'WHO Emergency Hotline', number: '+41 22 791 2111', note: 'World Health Organisation' },
];

const RED_FLAGS = [
  { icon: 'thermo',   title: 'High fever — infant < 3 months', body: 'Any fever ≥ 38°C (100.4°F) in a baby under 3 months requires immediate emergency care.' },
  { icon: 'care',     title: 'Breathing difficulty', body: 'Rapid, laboured, or noisy breathing; blue or pale lips or fingertips — call emergency services immediately.' },
  { icon: 'bloom',    title: 'Unresponsive or seizure', body: 'If your child is unconscious, will not wake, or is having a seizure — call emergency services now.' },
  { icon: 'shield',   title: 'Severe allergic reaction', body: 'Swelling of the face/throat, hives spreading rapidly, difficulty breathing — use epinephrine if available and call emergency services.' },
  { icon: 'growth',   title: 'Suspected poisoning or overdose', body: 'Call Poison Control or your national emergency number immediately. Do not induce vomiting unless instructed.' },
];

const WHO_FEVER_GUIDE = [
  { age: 'Under 3 months', threshold: '≥ 38°C', action: 'Emergency — go immediately', color: T.danger },
  { age: '3–6 months',     threshold: '≥ 38°C', action: 'Call doctor same day',      color: T.warn   },
  { age: '6–24 months',    threshold: '≥ 39°C', action: 'Call doctor if persists >24h', color: T.warn },
  { age: 'Over 2 years',   threshold: '≥ 40°C', action: 'Call doctor; manage at home', color: T.gold  },
];

interface Props { children: any[]; }

export function EmergencyClient({ children }: Props) {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check(); window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const allContacts = children.flatMap(c =>
    (c.emergency_contacts ?? []).map((ec: any) => ({ ...ec, childName: c.name }))
  );

  return (
    <div className="enter" style={{ height: '100vh', overflowY: 'auto', background: T.bg }}>
      <TopBar
        isMobile={isMobile}
        onMenu={() => (window as any).__drBloomOpenDrawer?.()}
        eyebrow="EMERGENCY"
        title={<span style={{ color: T.danger }}>Emergency.</span>}
        subtitle="WHO-based guidance · Global emergency numbers"
      />

      {/* SOS banner */}
      <div style={{ padding: isMobile ? '16px 14px 0' : '20px 32px 0' }}>
        <div style={{ background: T.danger, borderRadius: T.radius.lg, padding: isMobile ? 18 : 24, color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -40, top: -40, opacity: 0.1 }}>
            <Icon name="shield" size={160} stroke={1} color="#fff" />
          </div>
          <Mono size={10} style={{ letterSpacing: '0.18em', color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>IF IN IMMEDIATE DANGER</Mono>
          <div style={{ fontFamily: T.serif, fontSize: isMobile ? 24 : 32, fontStyle: 'italic', lineHeight: 1.1, marginBottom: 14 }}>Call emergency services now.</div>
          <Body size={13.5} lh={1.5} style={{ color: 'rgba(255,255,255,0.85)', marginBottom: 18, maxWidth: 480 }}>
            Dial your local emergency number. In most countries dial <strong>112</strong> or <strong>911</strong>. Do not wait.
          </Body>
          <HRow gap={10} style={{ flexWrap: 'wrap' }}>
            <a href="tel:112" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 44, padding: '0 20px', borderRadius: T.radius.pill, background: '#fff', color: T.danger, fontFamily: T.sans, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
              <Icon name="care" size={16} color={T.danger} /> Call 112
            </a>
            <a href="tel:911" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 44, padding: '0 20px', borderRadius: T.radius.pill, background: 'rgba(255,255,255,0.18)', color: '#fff', fontFamily: T.sans, fontSize: 14, fontWeight: 600, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.3)' }}>
              <Icon name="care" size={16} color="#fff" /> Call 911
            </a>
          </HRow>
        </div>
      </div>

      <div style={{ padding: isMobile ? '16px 14px 40px' : '20px 32px 48px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 18 }}>

        {/* Emergency contacts from child profiles */}
        <Card p={0} style={{ gridColumn: isMobile ? undefined : 'span 2' }}>
          <div style={{ padding: '18px 22px', borderBottom: `1px solid ${T.line}` }}>
            <HRow gap={10} style={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Display size={20} italic weight={400}>Your emergency contacts.</Display>
              <Link href="/children">
                <button style={{ height: 32, padding: '0 14px', borderRadius: T.radius.pill, background: T.brandWash, color: T.brand, border: 'none', fontFamily: T.sans, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Manage →
                </button>
              </Link>
            </HRow>
          </div>
          {allContacts.length === 0 ? (
            <div style={{ padding: '24px 22px' }}>
              <Body size={14} color={T.ink500}>No emergency contacts yet. Add them from a child profile.</Body>
              <Spacer h={12} />
              <Link href="/children">
                <button style={{ height: 38, padding: '0 16px', borderRadius: T.radius.pill, background: T.brandWash, color: T.brand, border: 'none', fontFamily: T.sans, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Go to Children →
                </button>
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 1, background: T.line }}>
              {allContacts.map((c: any) => (
                <div key={c.id} style={{ background: T.surface, padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 40, height: 40, borderRadius: T.radius.md, background: T.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name="profile" size={18} color={T.accent} />
                  </div>
                  <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                    <HRow gap={6}>
                      <Body size={13.5} weight={600} color={T.ink900}>{c.name}</Body>
                      <Chip tone="cream">{c.label}</Chip>
                    </HRow>
                    <Mono size={10} color={T.ink400}>{c.childName}{c.relation ? ` · ${c.relation}` : ''}</Mono>
                  </Stack>
                  <a href={`tel:${c.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px', borderRadius: T.radius.pill, background: T.brand, color: '#fff', fontFamily: T.sans, fontSize: 13, fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}>
                    <Icon name="care" size={14} color="#fff" /> Call
                  </a>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Red-flag symptoms */}
        <Card p={0}>
          <div style={{ padding: '18px 22px', borderBottom: `1px solid ${T.line}` }}>
            <Eyebrow color={T.danger}>WHO · Red flag symptoms</Eyebrow>
            <Display size={18} italic weight={400} style={{ marginTop: 4 }}>Call emergency now if…</Display>
          </div>
          <Stack gap={0}>
            {RED_FLAGS.map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, padding: '16px 22px', borderBottom: i < RED_FLAGS.length - 1 ? `1px solid ${T.line}` : 'none' }}>
                <div style={{ width: 36, height: 36, borderRadius: T.radius.md, background: T.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name={f.icon} size={16} color={T.danger} />
                </div>
                <Stack gap={2}>
                  <Body size={13.5} weight={600} color={T.ink900}>{f.title}</Body>
                  <Body size={12.5} color={T.ink500} lh={1.5}>{f.body}</Body>
                </Stack>
              </div>
            ))}
          </Stack>
        </Card>

        {/* Fever guide (WHO) */}
        <Card p={0}>
          <div style={{ padding: '18px 22px', borderBottom: `1px solid ${T.line}` }}>
            <Eyebrow color={T.warn}>WHO · Fever management guide</Eyebrow>
            <Display size={18} italic weight={400} style={{ marginTop: 4 }}>By age group.</Display>
          </div>
          <Stack gap={0}>
            {WHO_FEVER_GUIDE.map((g, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 22px', borderBottom: i < WHO_FEVER_GUIDE.length - 1 ? `1px solid ${T.line}` : 'none', alignItems: 'center' }}>
                <div style={{ width: 6, height: 36, borderRadius: 3, background: g.color, flexShrink: 0 }} />
                <Stack gap={2} style={{ flex: 1 }}>
                  <Body size={13.5} weight={600} color={T.ink900}>{g.age}</Body>
                  <HRow gap={8}>
                    <Chip tone="cream" style={{ background: g.color + '18', color: g.color }}>{g.threshold}</Chip>
                    <Body size={12} color={T.ink500}>{g.action}</Body>
                  </HRow>
                </Stack>
              </div>
            ))}
          </Stack>
          <div style={{ padding: '12px 22px' }}>
            <Body size={11} color={T.ink400} lh={1.5}>
              Source: WHO Integrated Management of Childhood Illness (IMCI) guidelines. Always consult a qualified healthcare provider for individual advice.
            </Body>
          </div>
        </Card>

        {/* Global numbers */}
        <Card p={0} style={{ gridColumn: isMobile ? undefined : 'span 2' }}>
          <div style={{ padding: '18px 22px', borderBottom: `1px solid ${T.line}` }}>
            <Display size={18} italic weight={400}>Global emergency numbers.</Display>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: 1, background: T.line }}>
            {GLOBAL_EMERGENCY.map((e, i) => (
              <div key={i} style={{ background: T.surface, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: T.radius.md, background: T.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name="shield" size={18} color={T.danger} />
                </div>
                <Stack gap={2} style={{ flex: 1 }}>
                  <Body size={13.5} weight={600} color={T.ink900}>{e.label}</Body>
                  <Mono size={10} color={T.ink400}>{e.note}</Mono>
                </Stack>
                <a href={`tel:${e.number}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px', borderRadius: T.radius.pill, background: T.danger, color: '#fff', fontFamily: T.sans, fontSize: 13, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>
                  {e.number}
                </a>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
