// Layout + visual primitives — with motion & hover enhancements.
'use client';
import * as React from 'react';
import { theme as T } from '@/lib/theme';
import { Icon } from './Icon';

type CSS = React.CSSProperties;

export function Stack({
  children, gap = 12, style, dir = 'col', align, justify, className,
}: { children?: React.ReactNode; gap?: number; style?: CSS; dir?: 'col' | 'row'; align?: CSS['alignItems']; justify?: CSS['justifyContent']; className?: string }) {
  return <div className={className} style={{ display: 'flex', flexDirection: dir === 'row' ? 'row' : 'column', gap, alignItems: align, justifyContent: justify, ...style }}>{children}</div>;
}

export function HRow({
  children, gap = 10, style, align = 'center', justify, className,
}: { children?: React.ReactNode; gap?: number; style?: CSS; align?: CSS['alignItems']; justify?: CSS['justifyContent']; className?: string }) {
  return <div className={className} style={{ display: 'flex', flexDirection: 'row', gap, alignItems: align, justifyContent: justify, ...style }}>{children}</div>;
}

export function Spacer({ h = 12, w }: { h?: number; w?: number }) {
  return <div style={{ height: h, width: w, flexShrink: 0 }} />;
}

export function Display({
  children, size = 32, italic, weight = 400, lh = 1.05, style,
}: { children?: React.ReactNode; size?: number; italic?: boolean; weight?: number; lh?: number; style?: CSS }) {
  return (
    <div style={{
      fontFamily: T.serif, fontSize: size, fontWeight: weight,
      fontStyle: italic ? 'italic' : 'normal', letterSpacing: T.serifTracking,
      color: T.ink900, lineHeight: lh, fontFeatureSettings: T.serifFeats, ...style,
    }}>{children}</div>
  );
}

export function Eyebrow({ children, color, style }: { children?: React.ReactNode; color?: string; style?: CSS }) {
  return (
    <div style={{
      fontFamily: T.sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.16em',
      textTransform: 'uppercase', color: color || T.ink400, ...style,
    }}>{children}</div>
  );
}

export function Body({
  children, size = 14, weight = 400, color, lh = 1.45, style,
}: { children?: React.ReactNode; size?: number; weight?: number; color?: string; lh?: number; style?: CSS }) {
  return (
    <div style={{
      fontFamily: T.sans, fontSize: size, fontWeight: weight,
      color: color || T.ink700, letterSpacing: T.sansTracking, lineHeight: lh, ...style,
    }}>{children}</div>
  );
}

export function Mono({ children, size = 11, color, style }: { children?: React.ReactNode; size?: number; color?: string; style?: CSS }) {
  return (
    <span style={{ fontFamily: T.mono, fontSize: size, color: color || T.ink400, letterSpacing: '0.04em', ...style }}>{children}</span>
  );
}

type CardTone = 'surface' | 'dim' | 'warm' | 'wash' | 'brand';
export function Card({
  children, p, tone = 'surface', radius = 'lg', style, onClick, hoverable,
}: { children?: React.ReactNode; p?: number; tone?: CardTone; radius?: keyof typeof T.radius; style?: CSS; onClick?: () => void; hoverable?: boolean }) {
  const r = T.radius[radius];
  const bg = tone === 'warm' ? T.surfaceWarm : tone === 'dim' ? T.surfaceDim
    : tone === 'brand' ? T.brand : tone === 'wash' ? T.brandWash : T.surface;
  const pad = p == null ? T.density.cardP : p;
  const isHoverable = hoverable || !!onClick;
  return (
    <div
      onClick={onClick}
      className={isHoverable ? 'hover-lift' : undefined}
      style={{
        background: bg, borderRadius: r, padding: pad,
        boxShadow: T.shadow.md + ', ' + T.shadow.ring,
        color: tone === 'brand' ? '#fff' : T.ink900,
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}>{children}</div>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

// Hover/active states are handled by the .dr-btn CSS class (globals.css).
// No React useState → zero re-renders on hover/press → instant response.
export function Button({
  children, variant = 'primary', size = 'md', icon, trailingIcon, onClick, full, style, type = 'button', disabled,
}: { children?: React.ReactNode; variant?: ButtonVariant; size?: ButtonSize; icon?: string; trailingIcon?: string; onClick?: (e: React.MouseEvent) => void; full?: boolean; style?: CSS; type?: 'button' | 'submit'; disabled?: boolean }) {
  const sizes: Record<ButtonSize, { h: number; fs: number; pad: number }> = {
    sm: { h: 36, fs: 13, pad: 14 }, md: { h: 48, fs: 15, pad: 18 }, lg: { h: 56, fs: 16, pad: 22 },
  };
  const s = sizes[size];
  const base: CSS = variant === 'primary'
    ? { background: T.brand, color: '#fff', border: 'none' }
    : variant === 'accent'
      ? { background: T.accent, color: '#fff', border: 'none' }
      : variant === 'danger'
        ? { background: T.danger, color: '#fff', border: 'none' }
        : variant === 'secondary'
          ? { background: 'transparent', color: T.ink900, border: `1px solid ${T.line}` }
          : { background: 'transparent', color: T.ink700, border: 'none' };

  const glowMap: Record<ButtonVariant, string> = {
    primary:   'rgba(15,61,46,.32)',
    accent:    'rgba(209,122,79,.32)',
    danger:    'rgba(176,73,44,.32)',
    secondary: 'transparent',
    ghost:     'transparent',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="dr-btn"
      style={{
        '--btn-glow': glowMap[variant],
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        height: s.h, padding: `0 ${s.pad}px`, borderRadius: T.radius.pill, fontFamily: T.sans,
        fontSize: s.fs, fontWeight: 600, letterSpacing: T.sansTracking,
        cursor: disabled ? 'not-allowed' : 'pointer',
        width: full ? '100%' : 'auto', flexShrink: 0, opacity: disabled ? 0.6 : 1,
        ...base, ...style,
      } as CSS}
    >
      {icon && <Icon name={icon} size={s.fs + 4} stroke={1.7} />}
      <span>{children}</span>
      {trailingIcon && <Icon name={trailingIcon} size={s.fs + 4} stroke={1.7} />}
    </button>
  );
}

export function Avatar({ size = 40, name = 'A', tone = 'brand' }: { size?: number; name?: string; tone?: 'brand' | 'soft' | 'wash' }) {
  const bg = tone === 'brand' ? T.brand : tone === 'soft' ? T.brandSoft : T.brandWash;
  const fg = tone === 'wash' ? T.brand : '#fff';
  return (
    <div
      className="hover-scale"
      style={{
        width: size, height: size, borderRadius: T.radius.pill, background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        fontFamily: T.serif, fontSize: size * 0.42, color: fg,
        boxShadow: T.shadow.ring, position: 'relative', overflow: 'hidden',
      }}
    >
      <span style={{ position: 'relative', zIndex: 1, fontStyle: 'italic' }}>{name?.[0] || 'A'}</span>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.08,
        backgroundImage: `repeating-linear-gradient(135deg, ${fg}, ${fg} 1px, transparent 1px, transparent 6px)` }}/>
    </div>
  );
}

export function Chip({ children, tone = 'wash', icon, style }: { children?: React.ReactNode; tone?: 'wash' | 'cream' | 'soft' | 'accent' | 'surface'; icon?: string; style?: CSS }) {
  const bg = tone === 'wash' ? T.brandWash : tone === 'cream' ? T.cream
    : tone === 'soft' ? T.surfaceDim : tone === 'accent' ? T.accentSoft : T.surface;
  const fg = tone === 'wash' ? T.brand : tone === 'accent' ? T.accent : T.ink700;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, height: 28,
      padding: '0 12px', borderRadius: T.radius.pill, background: bg, color: fg,
      fontFamily: T.sans, fontSize: 12, fontWeight: 500,
      transition: 'transform 0.15s ease, opacity 0.15s',
      ...style,
    }}>
      {icon && <Icon name={icon} size={13} stroke={1.7} />}
      {children}
    </div>
  );
}

export function Divider({ style }: { style?: CSS }) {
  return <div style={{ height: 1, background: T.line, ...style }} />;
}

export function Ring({
  value = 0.7, size = 88, stroke = 9, color, track, label, sub,
}: { value?: number; size?: number; stroke?: number; color?: string; track?: string; label?: React.ReactNode; sub?: string }) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const t = setTimeout(() => setProgress(value), 60);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track || T.ink100} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color || T.brand} strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${C * progress} ${C}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(.22,.68,0,1.1)' }}
        />
      </svg>
      {label != null && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ fontFamily: T.serif, fontSize: size * 0.28, color: T.ink900, lineHeight: 1 }}>{label}</div>
          {sub && <div style={{ fontFamily: T.sans, fontSize: 10, color: T.ink400, marginTop: 2, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{sub}</div>}
        </div>
      )}
    </div>
  );
}

export function Spark({
  points, w = 240, h = 64, color, fill = true,
}: { points: number[]; w?: number; h?: number; color?: string; fill?: boolean }) {
  if (!points?.length) return null;
  const max = Math.max(...points), min = Math.min(...points);
  const span = max - min || 1;
  const dx = w / Math.max(1, points.length - 1);
  const path = points.map((p, i) => {
    const x = i * dx, y = h - ((p - min) / span) * (h - 8) - 4;
    return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
  }).join(' ');
  const area = path + ` L${w} ${h} L0 ${h} Z`;
  const c = color || T.brand;
  const id = `sg-${c.replace('#', '')}-${w}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', maxWidth: '100%' }}>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.22" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${id})`} />}
      <path d={path} stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BloomFlower({
  size = 200, petals = [0.85, 0.7, 0.78, 0.6, 0.9, 0.72], animate = true,
}: { size?: number; petals?: number[]; animate?: boolean }) {
  const cx = size / 2, cy = size / 2;
  const cs = [T.brand, T.brandSoft, T.accent, T.gold, T.brand, T.brandSoft];
  return (
    <svg
      width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ display: 'block', animation: animate ? 'float 7s ease-in-out infinite' : undefined }}
    >
      <defs>
        <radialGradient id="bloomCenter" cx="50%" cy="50%">
          <stop offset="0%" stopColor={T.cream} stopOpacity="0.9" />
          <stop offset="100%" stopColor={T.brandWash} stopOpacity="0.4" />
        </radialGradient>
      </defs>
      {petals.map((v, i) => {
        const angle = (i / petals.length) * Math.PI * 2 - Math.PI / 2;
        const len = (size / 2 - 10) * (0.45 + v * 0.55);
        const w = 18 + v * 14;
        const tx = cx + Math.cos(angle) * len * 0.45;
        const ty = cy + Math.sin(angle) * len * 0.45;
        const rot = (angle * 180) / Math.PI + 90;
        return (
          <g key={i} transform={`translate(${tx} ${ty}) rotate(${rot})`}>
            <ellipse cx={0} cy={0} rx={w} ry={len * 0.5} fill={cs[i % cs.length]} fillOpacity={0.18 + v * 0.25} />
            <ellipse cx={0} cy={-len * 0.15} rx={w * 0.5} ry={len * 0.32} fill={cs[i % cs.length]} fillOpacity={0.4 + v * 0.3} />
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={size * 0.12} fill="url(#bloomCenter)" />
      <circle cx={cx} cy={cy} r={size * 0.06} fill={T.gold} fillOpacity={0.6} />
    </svg>
  );
}

export function Input({
  label, ...rest
}: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = React.useState(false);
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.ink500 }}>{label}</span>
      )}
      <input
        {...rest}
        onFocus={e => { setFocused(true); rest.onFocus?.(e); }}
        onBlur={e => { setFocused(false); rest.onBlur?.(e); }}
        style={{
          height: 48, padding: '0 16px', borderRadius: T.radius.pill,
          border: focused ? `1.5px solid ${T.brand}` : `1px solid ${T.line}`,
          background: T.surface, color: T.ink900, fontFamily: T.sans, fontSize: 14,
          letterSpacing: T.sansTracking, outline: 'none',
          boxShadow: focused ? `0 0 0 3px rgba(15,61,46,.12)` : 'none',
          transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
          ...(rest.style || {}),
        }}
      />
    </label>
  );
}

export function Select({
  label, children, ...rest
}: { label?: string; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [focused, setFocused] = React.useState(false);
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.ink500 }}>{label}</span>
      )}
      <select
        {...rest}
        onFocus={e => { setFocused(true); rest.onFocus?.(e); }}
        onBlur={e => { setFocused(false); rest.onBlur?.(e); }}
        style={{
          height: 48, padding: '0 16px', borderRadius: T.radius.pill,
          border: focused ? `1.5px solid ${T.brand}` : `1px solid ${T.line}`,
          background: T.surface, color: T.ink900, fontFamily: T.sans, fontSize: 14,
          letterSpacing: T.sansTracking, outline: 'none',
          boxShadow: focused ? `0 0 0 3px rgba(15,61,46,.12)` : 'none',
          transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
          ...(rest.style || {}),
        }}
      >{children}</select>
    </label>
  );
}

export function ProgressBar({ value = 0.5, color, h = 6 }: { value?: number; color?: string; h?: number }) {
  const [progress, setProgress] = React.useState(0);
  React.useEffect(() => {
    const t = setTimeout(() => setProgress(value), 60);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div style={{ height: h, background: T.ink100, borderRadius: T.radius.pill, overflow: 'hidden', width: '100%' }}>
      <div style={{
        height: '100%',
        width: `${Math.max(0, Math.min(1, progress)) * 100}%`,
        background: color || T.brand,
        borderRadius: T.radius.pill,
        transition: 'width 0.9s cubic-bezier(.22,.68,0,1.1)',
      }} />
    </div>
  );
}
