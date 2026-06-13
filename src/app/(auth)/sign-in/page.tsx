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
  const [googleHov, setGoogleHov] = React.useState(false);

  async function handleGoogle() {
    setLoading(true); setError('');
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

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
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflow: 'hidden' }}>

      {/* Background blooms */}
      <div style={{ position: 'fixed', right: -140, top: -80, opacity: 0.14, pointerEvents: 'none' }}>
        <BloomFlower size={500} animate />
      </div>
      <div style={{ position: 'fixed', left: -180, bottom: -120, opacity: 0.08, pointerEvents: 'none' }}>
        <BloomFlower size={420} petals={[0.6, 0.8, 0.7, 0.9, 0.65, 0.75]} animate />
      </div>

      <div style={{ width: '100%', maxWidth: 440, position: 'relative' }}>

        {/* Logo */}
        <HRow gap={12} className="enter" style={{ marginBottom: 40, alignItems: 'center', justifyContent: 'center' }}>

          <div
            className="breathe"
            style={{ width: 44, height: 44, borderRadius: T.radius.pill, background: T.brand, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="bloom" size={24} stroke={1.8} />
          </div>
          <Stack gap={2}>
            <div style={{ fontFamily: T.serif, fontSize: 26, fontStyle: 'italic', color: T.ink900, letterSpacing: T.serifTracking, lineHeight: 1 }}>Dr Bloom</div>
            <span style={{ fontFamily: T.mono, fontSize: 9, color: T.ink400, letterSpacing: '0.18em' }}>PEDIATRIC OS</span>
          </Stack>
        </HRow>

        {/* Card */}
        <div className="enter stagger-1">
          <Card p={36}>
            <div className="fade-down stagger-2" style={{ marginBottom: 28, textAlign: 'center' }}>
              <Display size={28} italic lh={1.1}>Welcome back.</Display>
              <Spacer h={6} />
              <Body size={13.5} color={T.ink500}>Sign in to your Dr Bloom account</Body>
            </div>

            <form onSubmit={handleSubmit}>
              <Stack gap={14}>
                <div className="slide-right stagger-3">
                  <Input
                    label="Email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="slide-right stagger-4">
                  <Input
                    label="Password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
                {error && (
                  <div className="pop-in">
                    <Body size={13} color={T.danger}>{error}</Body>
                  </div>
                )}
                <div className="slide-right stagger-5">
                  <Spacer h={4} />
                  <Button type="submit" full size="lg" disabled={loading}>
                    {loading ? 'Signing in…' : 'Sign in'}
                  </Button>
                </div>
              </Stack>
            </form>

            <Spacer h={16} />
            <div className="fade-in stagger-6">
              <HRow gap={10} style={{ alignItems: 'center' }}>
                <div style={{ flex: 1, height: 1, background: T.ink200 }} />
                <Body size={12} color={T.ink400}>or</Body>
                <div style={{ flex: 1, height: 1, background: T.ink200 }} />
              </HRow>
              <Spacer h={16} />
              <button
                type="button"
                onClick={handleGoogle}
                disabled={loading}
                onMouseEnter={() => setGoogleHov(true)}
                onMouseLeave={() => setGoogleHov(false)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 10, padding: '11px 20px', borderRadius: T.radius.md,
                  border: `1.5px solid ${googleHov ? T.brand : T.ink200}`,
                  background: googleHov ? T.brandTint : '#fff',
                  fontFamily: T.sans, fontSize: 14, fontWeight: 500, color: T.ink900,
                  cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
                  transition: 'border-color 0.18s, background 0.18s, transform 0.15s cubic-bezier(.22,.68,0,1.1), box-shadow 0.2s',
                  transform: googleHov && !loading ? 'translateY(-1px)' : 'none',
                  boxShadow: googleHov && !loading ? '0 4px 12px rgba(11,23,20,.1)' : 'none',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                  <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 6.294C4.672 4.167 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
            </div>

            <Spacer h={20} />
            <div className="fade-in stagger-7">
              <Body size={13} color={T.ink500} style={{ textAlign: 'center' }}>
                No account?{' '}
                <Link href="/sign-up" style={{ color: T.brand, fontWeight: 600 }}>Create one →</Link>
              </Body>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
