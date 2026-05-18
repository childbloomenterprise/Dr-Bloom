'use client';
import * as React from 'react';
import Link from 'next/link';
import { theme as T } from '@/lib/theme';
import { ageFromDob } from '@/lib/age';
import { Stack, HRow, Card, Body, Mono, Eyebrow, Display, Avatar, Chip, Spacer } from '@/components/primitives';
import { TopBar } from '@/components/shell/TopBar';
import { Icon } from '@/components/Icon';

export function ChildrenListClient({ children, role }: { children: any[]; role: string }) {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check(); window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <div className="enter" style={{ height: '100vh', overflowY: 'auto', background: T.bg }}>
      <TopBar
        isMobile={isMobile}
        onMenu={() => (window as any).__drBloomOpenDrawer?.()}
        eyebrow={role === 'doctor' ? 'PATIENTS' : 'MY CHILDREN'}
        title={role === 'doctor' ? 'All patients.' : 'Children profiles.'}
        subtitle={`${children.length} total`}
        trailing={
          <Link href="/children/new">
            <button style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 44, padding: '0 18px', borderRadius: T.radius.pill, background: T.brand, color: '#fff', border: 'none', fontFamily: T.sans, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
              <Icon name="plus" size={15} /> Add child
            </button>
          </Link>
        }
      />
      <div style={{ padding: isMobile ? '16px 14px 40px' : '24px 32px 48px' }}>
        {children.length === 0 ? (
          <Card p={40} style={{ textAlign: 'center', maxWidth: 420, margin: '0 auto' }}>
            <Display size={24} italic lh={1.1} style={{ marginBottom: 12 }}>No profiles yet.</Display>
            <Body size={14} color={T.ink500} lh={1.6}>Add your first child to start tracking growth, vitals, and milestones.</Body>
            <Spacer h={24} />
            <Link href="/children/new">
              <button style={{ height: 44, padding: '0 20px', borderRadius: T.radius.pill, background: T.brand, color: '#fff', border: 'none', fontFamily: T.sans, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Add first child →
              </button>
            </Link>
          </Card>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
            {children.map(child => (
              <Link key={child.id} href={`/children/${child.id}`} style={{ textDecoration: 'none' }}>
                <Card style={{ cursor: 'pointer', transition: 'transform 0.15s' }}
                  onClick={() => {}}
                >
                  <HRow gap={14} style={{ alignItems: 'center' }}>
                    <Avatar name={child.name} size={52} tone="wash" />
                    <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                      <Body size={16} weight={600} color={T.ink900}>{child.name}</Body>
                      <Mono size={11}>{ageFromDob(child.date_of_birth)} · {child.sex ?? 'not set'}</Mono>
                      <HRow gap={6}>
                        {child.weight_kg && <Chip tone="wash">{child.weight_kg} kg</Chip>}
                        {child.height_cm && <Chip tone="soft">{child.height_cm} cm</Chip>}
                      </HRow>
                    </Stack>
                    <Icon name="chevron" size={16} stroke={1.6} color={T.ink300} />
                  </HRow>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
