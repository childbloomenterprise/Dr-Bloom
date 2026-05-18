'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { theme as T } from '@/lib/theme';
import { Stack, HRow, Spacer, Card, Button, Display, Body, Eyebrow, Input, BloomFlower } from '@/components/primitives';
import { Icon } from '@/components/Icon';

export default function SignIn() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); setLoading(false); return; }
      router.refresh();
      router.push('/today');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {/* Background bloom */}
      <div style={{ position: 'fixed', right: -120, top: -60, opacity: 0.12, pointerEvents: 'none' }}>
        <BloomFlower size={480} />
      </div>

      <div className="enter" style={{ width: '100%', maxWidth: 440, position: 'relative' }}>
        {/* Logo */}
        <HRow gap={12} style={{ marginBottom: 40, alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: T.radius.pill, background: T.brand, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="bloom" size={24} stroke={1.8} />
          </div>
          <Stack gap={2}>
            <div style={{ fontFamily: T.serif, fontSize: 26, fontStyle: 'italic', color: T.ink900, letterSpacing: T.serifTracking, lineHeight: 1 }}>Dr Bloom</div>
            <span style={{ fontFamily: T.mono, fontSize: 9, color: T.ink400, letterSpacing: '0.18em' }}>PEDIATRIC OS</span>
          </Stack>
        </HRow>

        <Card p={36}>
          <Stack gap={4} style={{ marginBottom: 28, textAlign: 'center' }}>
            <Display size={28} italic lh={1.1}>Welcome back.</Display>
            <Body size={13.5} color={T.ink500}>Sign in to your Dr Bloom account</Body>
          </Stack>

          <form onSubmit={handleSubmit}>
            <Stack gap={14}>
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              {error && (
                <Body size={13} color={T.danger}>{error}</Body>
              )}
              <Spacer h={4} />
              <Button type="submit" full size="lg" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </Stack>
          </form>

          <Spacer h={20} />
          <Body size={13} color={T.ink500} style={{ textAlign: 'center' }}>
            No account?{' '}
            <Link href="/sign-up" style={{ color: T.brand, fontWeight: 600 }}>Create one →</Link>
          </Body>
        </Card>
      </div>
    </div>
  );
}
