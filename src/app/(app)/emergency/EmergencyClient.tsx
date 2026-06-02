'use client';
import * as React from 'react';
import Link from 'next/link';
import { theme as T } from '@/lib/theme';
import { Stack, HRow, Card, Display, Body, Mono, Eyebrow, Chip, Spacer } from '@/components/primitives';
import { TopBar } from '@/components/shell/TopBar';
import { Icon } from '@/components/Icon';

// ── Data ─────────────────────────────────────────────────────────────────────

const INDIA_PRIMARY = [
  { number: '112', label: 'National Emergency', note: 'Police · Fire · Ambulance', color: T.danger },
  { number: '108', label: 'Emergency Ambulance', note: 'National ambulance service', color: '#C0392B' },
  { number: '102', label: 'Women & Child Ambulance', note: 'Dedicated for children & mothers', color: T.accent },
  { number: '1098', label: 'CHILDLINE India', note: '24 × 7 child helpline', color: T.brand },
];

const INDIA_SECONDARY = [
  { number: '100', label: 'Police' },
  { number: '101', label: 'Fire Brigade' },
  { number: '104', label: 'Health Helpline' },
  { number: '1800-180-1104', label: 'Poison Control (India)' },
];

const GLOBAL_EMERGENCY = [
  { label: 'International SOS', number: '112', note: 'Works in most countries — EU, India, Australia' },
  { label: 'USA / Canada', number: '911', note: 'United States & Canada' },
  { label: 'UK', number: '999', note: 'United Kingdom' },
  { label: 'WHO Emergency', number: '+41 22 791 2111', note: 'World Health Organisation' },
];

const RED_FLAGS = [
  { icon: 'thermo',  title: 'Fever < 3 months old', body: 'Any temp ≥ 38 °C (100.4 °F) in a baby under 3 months — go to emergency now.' },
  { icon: 'care',    title: 'Breathing difficulty', body: 'Rapid, laboured or noisy breathing; blue lips or fingertips — call 112/108 immediately.' },
  { icon: 'bloom',   title: 'Unresponsive or seizure', body: 'Unconscious, will not wake, or actively seizing — call emergency services now.' },
  { icon: 'shield',  title: 'Severe allergic reaction', body: 'Swelling of face/throat, spreading hives, difficulty breathing — use epinephrine if available and call 112.' },
  { icon: 'growth',  title: 'Poisoning or overdose', body: 'Call 1800-180-1104 (India) or your national poison line. Do not induce vomiting unless instructed.' },
];

const WHO_FEVER_GUIDE = [
  { age: 'Under 3 months', threshold: '≥ 38 °C', action: 'Emergency → go immediately', color: T.danger },
  { age: '3 – 6 months',   threshold: '≥ 38 °C', action: 'Call doctor same day',        color: T.warn   },
  { age: '6 – 24 months',  threshold: '≥ 39 °C', action: 'Call doctor if persists > 24h', color: T.warn },
  { age: 'Over 2 years',   threshold: '≥ 40 °C', action: 'Manage at home; call if no improvement', color: T.gold },
];

// ── Component ────────────────────────────────────────────────────────────────

interface Props { children: any[]; }

export function EmergencyClient({ children }: Props) {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const allContacts = children.flatMap(c =>
    (c.emergency_contacts ?? []).map((ec: any) => ({ ...ec, childName: c.name ?? c.first_name }))
  );

  const pad = isMobile ? '14px 14px' : '20px 32px';

  return (
    <div className="enter" style={{ height: '100vh', overflowY: 'auto', background: T.bg }}>
      <TopBar
        isMobile={isMobile}
        onMenu={() => (window as any).__drBloomOpenDrawer?.()}
        eyebrow="EMERGENCY"
        title={<span style={{ color: T.danger }}>Emergency.</span>}
        subtitle="WHO guidance · India & global numbers"
      />

      {/* ── SOS Banner ─────────────────────────────────────────────── */}
      <div style={{ padding: isMobile ? '16px 14px 0' : '20px 32px 0' }}>
        <div style={{
          background: `linear-gradient(135deg, ${T.danger} 0%, #8B1A0A 100%)`,
          borderRadius: T.radius.lg, padding: isMobile ? '20px 18px' : '28px 32px',
          color: '#fff', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', right: -60, top: -60, opacity: 0.08, pointerEvents: 'none' }}>
            <Icon name="shield" size={220} stroke={0.8} color="#fff" />
          </div>
          <Mono size={10} style={{ letterSpacing: '0.2em', color: 'rgba(255,255,255,0.65)', marginBottom: 8 }}>
            IF IN IMMEDIATE DANGER
          </Mono>
          <div style={{ fontFamily: T.serif, fontSize: isMobile ? 26 : 34, fontStyle: 'italic', lineHeight: 1.05, marginBottom: 10 }}>
            Call emergency services now.
          </div>
          <Body size={13} lh={1.55} style={{ color: 'rgba(255,255,255,0.80)', marginBottom: 20, maxWidth: 500 }}>
            In India dial <strong>112</strong> (unified) or <strong>108</strong> (ambulance).
            Outside India dial <strong>112</strong> or <strong>911</strong>. Do not wait.
          </Body>
          {/* Big call buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: 10 }}>
            {INDIA_PRIMARY.slice(0, isMobile ? 2 : 4).map(n => (
              <a
                key={n.number}
                href={`tel:${n.number}`}
                className="dr-call-btn"
                style={{
                  height: 60, fontSize: isMobile ? 17 : 16, color: n.color,
                  background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
                  flexDirection: 'column', gap: 2,
                }}
              >
                <span style={{ fontSize: isMobile ? 22 : 20, fontWeight: 800, lineHeight: 1 }}>{n.number}</span>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', opacity: 0.75 }}>{n.label.toUpperCase()}</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main grid ──────────────────────────────────────────────── */}
      <div style={{ padding: isMobile ? '16px 14px 48px' : '20px 32px 56px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>

        {/* India Numbers */}
        <Card p={0} style={{ gridColumn: isMobile ? undefined : 'span 2' }}>
          <div style={{ padding: '18px 22px', borderBottom: `1px solid ${T.line}` }}>
            <Eyebrow color={T.danger} style={{ marginBottom: 4 }}>India · Emergency numbers</Eyebrow>
            <Display size={20} italic weight={400}>Tap to call instantly.</Display>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)',
            gap: 1, background: T.line,
          }}>
            {INDIA_PRIMARY.map(n => (
              <a
                key={n.number}
                href={`tel:${n.number}`}
                className="dr-call-btn"
                style={{
                  flexDirection: 'column', gap: 4, height: 96,
                  background: T.surface, color: n.color,
                  borderRadius: 0,
                  boxShadow: 'none',
                }}
              >
                <span style={{ fontSize: 32, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em' }}>{n.number}</span>
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.03em' }}>{n.label}</span>
                <span style={{ fontSize: 10.5, color: T.ink400, fontWeight: 400, letterSpacing: 0 }}>{n.note}</span>
              </a>
            ))}
          </div>
          {/* Secondary numbers */}
          <div style={{ padding: '14px 22px', borderTop: `1px solid ${T.line}` }}>
            <Eyebrow color={T.ink400} style={{ marginBottom: 10 }}>Other helplines</Eyebrow>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {INDIA_SECONDARY.map(n => (
                <a
                  key={n.number}
                  href={`tel:${n.number}`}
                  className="dr-call-btn"
                  style={{
                    height: 40, fontSize: 13, width: 'auto', padding: '0 16px',
                    background: T.surfaceDim, color: T.ink900,
                    boxShadow: 'none',
                    border: `1px solid ${T.line}`,
                  }}
                >
                  <Icon name="care" size={13} color={T.brand} />
                  <strong>{n.number}</strong>
                  <span style={{ color: T.ink500 }}>{n.label}</span>
                </a>
              ))}
            </div>
          </div>
        </Card>

        {/* Patient emergency contacts */}
        <Card p={0} style={{ gridColumn: isMobile ? undefined : 'span 2' }}>
          <div style={{ padding: '18px 22px', borderBottom: `1px solid ${T.line}` }}>
            <HRow gap={10} style={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Stack gap={3}>
                <Eyebrow color={T.ink400}>Patient contacts</Eyebrow>
                <Display size={20} italic weight={400}>Your emergency contacts.</Display>
              </Stack>
              <Link href="/children">
                <button
                  className="dr-btn"
                  style={{
                    '--btn-glow': 'transparent',
                    height: 34, padding: '0 14px', borderRadius: T.radius.pill,
                    background: T.brandWash, color: T.brand, border: 'none',
                    fontFamily: T.sans, fontSize: 12.5, fontWeight: 600,
                  } as React.CSSProperties}
                >
                  Manage →
                </button>
              </Link>
            </HRow>
          </div>
          {allContacts.length === 0 ? (
            <div style={{ padding: '28px 22px' }}>
              <Body size={14} color={T.ink500}>No emergency contacts yet. Add them from a child profile.</Body>
              <Spacer h={14} />
              <Link href="/children">
                <button
                  className="dr-btn"
                  style={{
                    '--btn-glow': 'transparent',
                    height: 38, padding: '0 16px', borderRadius: T.radius.pill,
                    background: T.brandWash, color: T.brand, border: 'none',
                    fontFamily: T.sans, fontSize: 13, fontWeight: 600,
                  } as React.CSSProperties}
                >
                  Go to Children →
                </button>
              </Link>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 1, background: T.line,
            }}>
              {allContacts.map((c: any) => (
                <div
                  key={c.id}
                  style={{ background: T.surface, padding: '14px 20px', display: 'flex', gap: 14, alignItems: 'center' }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: T.radius.md,
                    background: T.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon name="profile" size={19} color={T.accent} />
                  </div>
                  <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                    <HRow gap={6} style={{ flexWrap: 'wrap' }}>
                      <Body size={13.5} weight={600} color={T.ink900}>{c.name}</Body>
                      <Chip tone="cream">{c.label}</Chip>
                    </HRow>
                    <Mono size={10} color={T.ink400}>{c.childName}{c.relation ? ` · ${c.relation}` : ''}</Mono>
                  </Stack>
                  <a
                    href={`tel:${c.phone}`}
                    className="dr-call-btn"
                    style={{
                      height: 48, width: 'auto', padding: '0 18px',
                      fontSize: 13, background: T.brand, color: '#fff',
                      boxShadow: '0 2px 8px rgba(15,61,46,.22)',
                      flexShrink: 0,
                    }}
                  >
                    <Icon name="care" size={15} color="#fff" />
                    Call
                  </a>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Red-flag symptoms */}
        <Card p={0}>
          <div style={{ padding: '18px 22px', borderBottom: `1px solid ${T.line}` }}>
            <Eyebrow color={T.danger} style={{ marginBottom: 4 }}>WHO · Red flag symptoms</Eyebrow>
            <Display size={18} italic weight={400}>Call emergency now if…</Display>
          </div>
          <Stack gap={0}>
            {RED_FLAGS.map((f, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', gap: 14, padding: '15px 22px',
                  borderBottom: i < RED_FLAGS.length - 1 ? `1px solid ${T.line}` : 'none',
                  alignItems: 'flex-start',
                }}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: T.radius.md,
                  background: '#fff0ee', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon name={f.icon} size={17} color={T.danger} />
                </div>
                <Stack gap={3}>
                  <Body size={13.5} weight={600} color={T.ink900}>{f.title}</Body>
                  <Body size={12.5} color={T.ink500} lh={1.55}>{f.body}</Body>
                </Stack>
              </div>
            ))}
          </Stack>
        </Card>

        {/* Fever guide */}
        <Card p={0}>
          <div style={{ padding: '18px 22px', borderBottom: `1px solid ${T.line}` }}>
            <Eyebrow color={T.warn} style={{ marginBottom: 4 }}>WHO · Fever management</Eyebrow>
            <Display size={18} italic weight={400}>By age group.</Display>
          </div>
          <Stack gap={0}>
            {WHO_FEVER_GUIDE.map((g, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', gap: 14, padding: '14px 22px',
                  borderBottom: i < WHO_FEVER_GUIDE.length - 1 ? `1px solid ${T.line}` : 'none',
                  alignItems: 'center',
                }}
              >
                <div style={{ width: 5, minHeight: 40, borderRadius: 3, background: g.color, flexShrink: 0 }} />
                <Stack gap={4} style={{ flex: 1 }}>
                  <Body size={13.5} weight={600} color={T.ink900}>{g.age}</Body>
                  <HRow gap={8} style={{ flexWrap: 'wrap' }}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 10px',
                      borderRadius: T.radius.pill, background: g.color + '18', color: g.color,
                      fontFamily: T.mono, fontSize: 11, fontWeight: 600,
                    }}>{g.threshold}</div>
                    <Body size={12} color={T.ink500}>{g.action}</Body>
                  </HRow>
                </Stack>
              </div>
            ))}
          </Stack>
          <div style={{ padding: '12px 22px', borderTop: `1px solid ${T.line}` }}>
            <Body size={11} color={T.ink400} lh={1.6}>
              Source: WHO Integrated Management of Childhood Illness (IMCI). Always consult a qualified healthcare provider for individual advice.
            </Body>
          </div>
        </Card>

        {/* Global numbers */}
        <Card p={0} style={{ gridColumn: isMobile ? undefined : 'span 2' }}>
          <div style={{ padding: '18px 22px', borderBottom: `1px solid ${T.line}` }}>
            <Display size={18} italic weight={400}>Global emergency numbers.</Display>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)',
            gap: 1, background: T.line,
          }}>
            {GLOBAL_EMERGENCY.map((e) => (
              <a
                key={e.number}
                href={`tel:${e.number}`}
                className="dr-call-btn"
                style={{
                  flexDirection: 'column', gap: 3, height: 90,
                  background: T.surface, color: T.danger,
                  borderRadius: 0, boxShadow: 'none',
                }}
              >
                <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>{e.number}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.ink900 }}>{e.label}</span>
                <span style={{ fontSize: 10.5, color: T.ink400, fontWeight: 400 }}>{e.note}</span>
              </a>
            ))}
          </div>
        </Card>

      </div>
    </div>
  );
}
