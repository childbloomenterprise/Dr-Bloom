// Shared loading / empty / error / toast primitives.
// Keeps every tab and panel visually consistent and fixes the class of bug where a
// failed fetch left a tab stuck on a skeleton forever (there was no error state).
'use client';
import * as React from 'react';
import { theme as T } from '@/lib/theme';
import { Icon } from './Icon';
import { Stack, HRow, Body } from './primitives';

// Inline spinner — matches the search spinner in PatientsClient.
export function InlineSpinner({ size = 16, color }: { size?: number; color?: string }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `2px solid ${T.ink200}`, borderTopColor: color ?? T.brand,
      animation: 'spin 0.7s linear infinite', flexShrink: 0,
    }} />
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div style={{ padding: '14px 16px', background: '#fff0ee', borderRadius: T.radius.md }}>
      <HRow gap={10} style={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <HRow gap={8} style={{ alignItems: 'flex-start' }}>
          <Icon name="shield" size={16} color={T.danger} style={{ marginTop: 1, flexShrink: 0 }} />
          <Body size={13} color={T.danger}>{message ?? 'Something went wrong. Please try again.'}</Body>
        </HRow>
        {onRetry && (
          <button
            onClick={onRetry}
            className="dr-btn"
            style={{
              height: 30, padding: '0 14px', borderRadius: T.radius.pill,
              background: T.surface, color: T.danger, border: `1px solid ${T.danger}33`,
              fontFamily: T.sans, fontSize: 12.5, fontWeight: 600, flexShrink: 0,
            }}
          >
            Retry
          </button>
        )}
      </HRow>
    </div>
  );
}

export function EmptyState({
  icon = 'leaf', title, sub, action,
}: { icon?: string; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <Stack gap={10} align="center" style={{ padding: '36px 24px', textAlign: 'center' }}>
      <div style={{
        width: 46, height: 46, borderRadius: T.radius.pill, background: T.brandWash,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={icon} size={20} color={T.brand} stroke={1.6} />
      </div>
      <Stack gap={3} align="center">
        <Body size={14} weight={600} color={T.ink900}>{title}</Body>
        {sub && <Body size={12.5} color={T.ink500}>{sub}</Body>}
      </Stack>
      {action}
    </Stack>
  );
}

// Fixed bottom-center pill toast + hook. Replaces the duplicated toast blocks.
export type ToastTone = 'default' | 'success' | 'error' | 'warn';

export function useToast() {
  const [toast, setToast] = React.useState<{ msg: string; tone: ToastTone; key: number } | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = React.useCallback((msg: string, tone: ToastTone = 'default') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ msg, tone, key: Date.now() });
    timer.current = setTimeout(() => setToast(null), 4000);
  }, []);
  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return { toast, show };
}

export function Toast({ toast }: { toast: { msg: string; tone: ToastTone; key: number } | null }) {
  if (!toast) return null;
  const bg = toast.tone === 'error' ? T.danger
    : toast.tone === 'warn' ? T.gold
    : toast.tone === 'success' ? T.brand
    : T.ink900;
  return (
    <div
      key={toast.key}
      className="toast-enter"
      style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        background: bg, color: '#fff', padding: '12px 22px', borderRadius: T.radius.pill,
        fontFamily: T.sans, fontSize: 13.5, fontWeight: 500, boxShadow: T.shadow.lg,
        zIndex: 300, pointerEvents: 'none', maxWidth: '90vw', textAlign: 'center',
      }}
    >
      {toast.msg}
    </div>
  );
}
