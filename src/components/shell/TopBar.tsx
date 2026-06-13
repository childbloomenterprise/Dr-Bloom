'use client';
import * as React from 'react';
import { theme as T } from '@/lib/theme';
import { Icon } from '@/components/Icon';
import { Display, Eyebrow, Body } from '@/components/primitives';

interface Props {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: string;
  trailing?: React.ReactNode;
  isMobile?: boolean;
  onMenu?: () => void;
}

export function TopBar({ eyebrow, title, subtitle, trailing, isMobile, onMenu }: Props) {
  if (isMobile) {
    return (
      <div style={{
        padding: '14px 18px', background: T.bg,
        borderBottom: `1px solid ${T.line}`,
        display: 'flex', flexDirection: 'column', gap: 12,
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            aria-label="Open navigation menu"
            onClick={onMenu}
            style={{
              width: 40, height: 40, borderRadius: T.radius.pill,
              background: T.surface, border: `1px solid ${T.line}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: T.ink900, flexShrink: 0,
              transition: 'background 0.18s, transform 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
          >
            <Icon name="menu" size={17} stroke={1.7} />
          </button>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 26, height: 26, borderRadius: T.radius.pill, background: T.brand, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              animation: 'breathe 3.8s ease-in-out infinite',
            }}>
              <Icon name="bloom" size={14} stroke={1.8} />
            </div>
            <div style={{ fontFamily: T.serif, fontSize: 17, fontStyle: 'italic', color: T.ink900, letterSpacing: T.serifTracking, lineHeight: 1 }}>Dr Bloom</div>
          </div>
        </div>
        <div className="fade-down" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {eyebrow && <Eyebrow color={T.ink400}>{eyebrow}</Eyebrow>}
          <Display size={24} italic lh={1.1}>{title}</Display>
          {subtitle && <Body size={12.5} color={T.ink500} lh={1.5}>{subtitle}</Body>}
        </div>
        {trailing && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{trailing}</div>}
      </div>
    );
  }

  return (
    <div style={{
      padding: '24px 32px 20px', background: T.bg,
      display: 'flex', alignItems: 'flex-end', gap: 20,
      borderBottom: `1px solid ${T.line}`,
      flexWrap: 'wrap',
    }}>
      <div className="fade-down" style={{ flex: '1 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {eyebrow && <Eyebrow color={T.ink400}>{eyebrow}</Eyebrow>}
        <Display size={32} italic lh={1.05}>{title}</Display>
        {subtitle && <Body size={13} color={T.ink500} style={{ marginTop: 2 }}>{subtitle}</Body>}
      </div>
      {trailing && (
        <div className="fade-in stagger-2">{trailing}</div>
      )}
    </div>
  );
}
