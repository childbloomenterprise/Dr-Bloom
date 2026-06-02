'use client';
import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { theme as T } from '@/lib/theme';
import { Icon } from '@/components/Icon';
import { Avatar, Body, Mono, Stack, HRow, Spacer, Card, Divider } from '@/components/primitives';
import { createClient } from '@/lib/supabase/client';

const NAV = [
  { href: '/today',    label: 'Today',     icon: 'home'    },
  { href: '/patients', label: 'Patients',  icon: 'profile' },
  { href: '/consult',  label: 'Consult',   icon: 'note'    },
  { href: '/insights', label: 'Insights',  icon: 'sparkle' },
  { href: '/children', label: 'Children',  icon: 'care'    },
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
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setMounted(true), 40);
    return () => clearTimeout(t);
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/sign-in');
  }

  const sidebarStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed', left: 0, top: 0, bottom: 0, height: '100vh',
        width: 280, maxWidth: '85vw',
        background: T.surface,
        boxShadow: '4px 0 32px rgba(0,0,0,0.20)',
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.30s cubic-bezier(.22,.68,0,1.1)',
        zIndex: 50, display: 'flex', flexDirection: 'column', padding: '24px 18px 22px',
      }
    : {
        width: 232, height: '100vh', flexShrink: 0,
        background: T.surface,
        borderRight: `1px solid ${T.line}`,
        display: 'flex', flexDirection: 'column', padding: '28px 18px 22px',
      };

  const staggerClass = (i: number) => ['stagger-1','stagger-2','stagger-3','stagger-4','stagger-5','stagger-6','stagger-7'][i] ?? '';

  return (
    <>
      {isMobile && isOpen && (
        <div onClick={onClose} className="fade-in modal-overlay" style={{
          position: 'fixed', inset: 0, background: 'rgba(11,23,20,0.48)',
          backdropFilter: 'blur(3px)', zIndex: 49,
        }} />
      )}
      <aside style={sidebarStyle}>
        {/* Logo */}
        <HRow gap={10} className={mounted ? 'slide-right' : ''} style={{ padding: '0 6px 4px', justifyContent: 'space-between', alignItems: 'center' }}>
          <HRow gap={10} style={{ alignItems: 'center' }}>
            <div className="breathe" style={{
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
              transition: 'background 0.15s, transform 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1) rotate(90deg)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1) rotate(0deg)'; }}
            >
              <Icon name="close" size={17} stroke={1.7} />
            </button>
          )}
        </HRow>

        <Spacer h={24} />
        <Mono size={9} color={T.ink300} style={{ padding: '0 12px', marginBottom: 8, letterSpacing: '0.18em' }}>WORKSPACE</Mono>

        <Stack gap={2} style={{ flex: 1 }}>
          {NAV.map((it, i) => {
            const active = pathname === it.href || pathname.startsWith(it.href + '/');
            return (
              <NavItem
                key={it.href}
                href={it.href}
                label={it.label}
                icon={it.icon}
                active={active}
                animClass={mounted ? `nav-pop ${staggerClass(i)}` : ''}
                onClick={() => isMobile && onClose?.()}
              />
            );
          })}

          <Spacer h={6} />
          <Divider style={{ margin: '0 10px', opacity: 0.6 }} />
          <Spacer h={6} />

          <NavItem
            href="/emergency"
            label="Emergency"
            icon="shield"
            active={pathname === '/emergency'}
            danger
            animClass={mounted ? `nav-pop stagger-6` : ''}
            onClick={() => isMobile && onClose?.()}
          />
          <NavItem
            href="/settings"
            label="Settings"
            icon="menu"
            active={pathname === '/settings'}
            animClass={mounted ? `nav-pop stagger-7` : ''}
            onClick={() => isMobile && onClose?.()}
          />
        </Stack>

        {/* Hospital card */}
        <Card tone="dim" p={14} style={{ marginBottom: 12 }}>
          <HRow gap={6} style={{ alignItems: 'center', marginBottom: 4 }}>
            <div className="dot-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: T.success, flexShrink: 0 }} />
            <Mono size={9} color={T.ink400} style={{ letterSpacing: '0.18em' }}>CONNECTED TO</Mono>
          </HRow>
          <Body size={12} weight={600} color={T.ink900} lh={1.3}>Bloom Children's<br />Medical Center</Body>
          <Spacer h={4} />
          <Mono size={9}>Live · just now</Mono>
        </Card>

        {/* User row */}
        <HRow gap={10} style={{ alignItems: 'center', padding: '4px 6px' }}>
          <Avatar name={userName || 'U'} size={36} />
          <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
            <Body size={13} weight={600} color={T.ink900}>{userName || 'Doctor'}</Body>
            <Body size={11} color={T.ink400}>Pediatrics</Body>
          </Stack>
          <button
            onClick={signOut}
            title="Sign out"
            style={{
              background: 'none', border: 'none', color: T.ink400,
              display: 'flex', alignItems: 'center', padding: 4,
              borderRadius: T.radius.pill,
              transition: 'color 0.15s, transform 0.15s',
            }}
            onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = T.danger; b.style.transform = 'scale(1.15)'; }}
            onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = T.ink400; b.style.transform = 'scale(1)'; }}
          >
            <Icon name="logout" size={16} stroke={1.6} />
          </button>
        </HRow>
      </aside>
    </>
  );
}

// ── NavItem ───────────────────────────────────────────────────────────
// Hover/active handled entirely by CSS (.nav-item in globals.css) — no useState.

function NavItem({
  href, label, icon, active, danger, animClass, onClick,
}: {
  href: string; label: string; icon: string; active: boolean;
  danger?: boolean; animClass?: string; onClick?: () => void;
}) {
  const activeBg  = danger ? T.accentSoft : T.brandWash;
  const activeCol = danger ? T.danger     : T.brand;
  const hoverBg   = danger ? 'rgba(176,73,44,.08)' : T.brandTint;
  const defaultCol = danger ? T.danger : T.ink500;

  return (
    <Link
      href={href}
      onClick={onClick}
      className={[
        'nav-item',
        active ? 'nav-active' : '',
        danger ? 'nav-danger' : '',
        animClass || '',
      ].filter(Boolean).join(' ')}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, minHeight: 44,
        padding: '10px 14px', borderRadius: T.radius.pill,
        background: active ? activeBg : 'transparent',
        color: active ? activeCol : defaultCol,
        fontFamily: T.sans, fontSize: 14, fontWeight: active ? 600 : 500,
        letterSpacing: T.sansTracking,
        // Hover background/color injected as CSS custom properties
        '--nav-hover-bg': hoverBg,
        '--nav-hover-col': danger ? T.danger : T.brand,
      } as React.CSSProperties}
    >
      <span className="nav-icon">
        <Icon name={icon} size={18} stroke={active ? 2.1 : 1.6} />
      </span>
      {label}
      {active && (
        <div style={{
          marginLeft: 'auto', width: 6, height: 6, borderRadius: 3,
          background: activeCol, opacity: 0.7,
          animation: 'breathe 2.5s ease-in-out infinite',
        }} />
      )}
    </Link>
  );
}
