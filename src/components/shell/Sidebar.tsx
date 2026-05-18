'use client';
import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { theme as T } from '@/lib/theme';
import { Icon } from '@/components/Icon';
import { Avatar, Body, Mono, Stack, HRow, Spacer, Card, Divider } from '@/components/primitives';
import { createClient } from '@/lib/supabase/client';

const NAV = [
  { href: '/today',    label: 'Today',     icon: 'home'     },
  { href: '/patients', label: 'Patients',  icon: 'profile'  },
  { href: '/consult',  label: 'Consult',   icon: 'note'     },
  { href: '/insights', label: 'Insights',  icon: 'sparkle'  },
  { href: '/children', label: 'Children',  icon: 'care'     },
];

interface Props {
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  userName?: string;
  userRole?: string;
}

export function Sidebar({ isMobile, isOpen, onClose, userName, userRole }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/sign-in');
  }

  const sidebarStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed', left: 0, top: 0, bottom: 0, height: '100vh',
        width: 280, maxWidth: '85vw',
        background: T.surface,
        boxShadow: '4px 0 28px rgba(0,0,0,0.18)',
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.28s cubic-bezier(.22,.68,0,1.1)',
        zIndex: 50, display: 'flex', flexDirection: 'column', padding: '24px 18px 22px',
      }
    : {
        width: 232, height: '100vh', flexShrink: 0,
        background: T.surface,
        borderRight: `1px solid ${T.line}`,
        display: 'flex', flexDirection: 'column', padding: '28px 18px 22px',
      };

  return (
    <>
      {isMobile && isOpen && (
        <div onClick={onClose} className="fade-in" style={{
          position: 'fixed', inset: 0, background: 'rgba(11,23,20,0.45)',
          backdropFilter: 'blur(2px)', zIndex: 49,
        }} />
      )}
      <aside style={sidebarStyle}>
        {/* Logo */}
        <HRow gap={10} style={{ padding: '0 6px 4px', justifyContent: 'space-between', alignItems: 'center' }}>
          <HRow gap={10} style={{ alignItems: 'center' }}>
            <div style={{
              width: 34, height: 34, borderRadius: T.radius.pill,
              background: T.brand, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Icon name="bloom" size={18} stroke={1.8} />
            </div>
            <Stack gap={3}>
              <div style={{ fontFamily: T.serif, fontSize: 19, fontStyle: 'italic', color: T.ink900, letterSpacing: T.serifTracking, lineHeight: 1, whiteSpace: 'nowrap' }}>Dr Bloom</div>
              <Mono size={9} color={T.ink400} style={{ whiteSpace: 'nowrap', letterSpacing: '0.18em' }}>PEDIATRIC OS</Mono>
            </Stack>
          </HRow>
          {isMobile && (
            <button onClick={onClose} style={{
              width: 36, height: 36, borderRadius: T.radius.pill,
              background: T.surfaceDim, border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.ink700,
            }}>
              <Icon name="close" size={17} stroke={1.7} />
            </button>
          )}
        </HRow>

        <Spacer h={24} />
        <Mono size={9} color={T.ink300} style={{ padding: '0 12px', marginBottom: 8, letterSpacing: '0.18em' }}>WORKSPACE</Mono>

        <Stack gap={2} style={{ flex: 1 }}>
          {NAV.map(it => {
            const active = pathname === it.href || pathname.startsWith(it.href + '/');
            return (
              <Link key={it.href} href={it.href} onClick={() => isMobile && onClose?.()} style={{
                display: 'flex', alignItems: 'center', gap: 12, minHeight: 44,
                padding: '11px 14px', borderRadius: T.radius.pill,
                background: active ? T.brandWash : 'transparent',
                color: active ? T.brand : T.ink500,
                fontFamily: T.sans, fontSize: 14, fontWeight: active ? 600 : 500,
                letterSpacing: T.sansTracking, transition: 'background 0.18s',
              }}>
                <Icon name={it.icon} size={18} stroke={active ? 2 : 1.6} />
                {it.label}
              </Link>
            );
          })}

          <Spacer h={6} />
          <Divider style={{ margin: '0 10px' }} />
          <Spacer h={6} />

          <Link href="/emergency" onClick={() => isMobile && onClose?.()} style={{
            display: 'flex', alignItems: 'center', gap: 12, minHeight: 44,
            padding: '11px 14px', borderRadius: T.radius.pill,
            background: pathname === '/emergency' ? T.accentSoft : 'transparent',
            color: T.danger, fontFamily: T.sans, fontSize: 14, fontWeight: 600,
            letterSpacing: T.sansTracking,
          }}>
            <Icon name="shield" size={18} stroke={2} />
            Emergency
          </Link>

          <Link href="/settings" onClick={() => isMobile && onClose?.()} style={{
            display: 'flex', alignItems: 'center', gap: 12, minHeight: 44,
            padding: '11px 14px', borderRadius: T.radius.pill,
            background: pathname === '/settings' ? T.brandWash : 'transparent',
            color: pathname === '/settings' ? T.brand : T.ink500,
            fontFamily: T.sans, fontSize: 14, fontWeight: pathname === '/settings' ? 600 : 500,
            letterSpacing: T.sansTracking,
          }}>
            <Icon name="menu" size={18} stroke={1.6} />
            Settings
          </Link>
        </Stack>

        {/* Hospital card */}
        <Card tone="dim" p={14} style={{ marginBottom: 12 }}>
          <Mono size={9} color={T.ink400} style={{ letterSpacing: '0.18em' }}>CONNECTED TO</Mono>
          <Spacer h={4} />
          <Body size={12} weight={600} color={T.ink900} lh={1.3}>Bloom Children's<br />Medical Center</Body>
          <Spacer h={6} />
          <HRow gap={5} style={{ alignItems: 'center' }}>
            <div style={{ width: 6, height: 6, borderRadius: 3, background: T.success }} />
            <Mono size={9}>Live · just now</Mono>
          </HRow>
        </Card>

        {/* User row */}
        <HRow gap={10} style={{ alignItems: 'center', padding: '4px 6px' }}>
          <Avatar name={userName || 'U'} size={36} />
          <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
            <Body size={13} weight={600} color={T.ink900}>{userName || 'Doctor'}</Body>
            <Body size={11} color={T.ink400}>Pediatrics</Body>
          </Stack>
          <button onClick={signOut} title="Sign out" style={{
            background: 'none', border: 'none', color: T.ink400, display: 'flex', alignItems: 'center', padding: 4,
          }}>
            <Icon name="logout" size={16} stroke={1.6} />
          </button>
        </HRow>
      </aside>
    </>
  );
}
