'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { theme as T } from '@/lib/theme';
import { Stack, HRow, Spacer, Card, Button, Display, Body, Input, BloomFlower } from '@/components/primitives';
import { Icon } from '@/components/Icon';

export default function SignUp() {
  const router = useRouter();
  // Lazy client creation in handlers only — keeps static prerender env-free.
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [specialty, setSpecialty] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  async function handleGoogle() {
    setLoading(true); setError('');
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      // Create user server-side — no confirmation email sent
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName, specialty }),
      });
      const body = await res.json() as { userId?: string; error?: string };
      if (!res.ok) {
        setError(body.error ?? 'Sign-up failed.');
        setLoading(false);
        return;
      }

      // Sign in with the credentials just created
      const supabase = createClient();
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) {
        setError(signInErr.message);
        setLoading(false);
        return;
      }

      // Refresh server components so layout picks up the new session cookie
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
      <div style={{ position: 'fixed', right: -120, top: -60, opacity: 0.12, pointerEvents: 'none' }}>
        <BloomFlower size={480} />
      </div>

      <div className="enter" style={{ width: '100%', maxWidth: 480, position: 'relative' }}>
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
            <Display size={28} italic lh={1.1}>Create your account.</Display>
            <Body size={13.5} color={T.ink500}>For pediatricians and doctors worldwide.</Body>
          </Stack>

          <form onSubmit={handleSubmit}>
            <Stack gap={14}>
              <Input label="Full name" type="text" placeholder="Dr. Sarah Chen" value={fullName} onChange={e => setFullName(e.target.value)} required />
              <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
              <Input label="Password" type="password" placeholder="8+ characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
              <Input label="Specialty" type="text" placeholder="e.g. Pediatrics, Neonatology" value={specialty} onChange={e => setSpecialty(e.target.value)} />
              {error && <Body size={13} color={T.danger}>{error}</Body>}
              <Spacer h={4} />
              <Button type="submit" full size="lg" disabled={loading}>
                {loading ? 'Creating account…' : 'Create account'}
              </Button>
            </Stack>
          </form>

          <Spacer h={16} />
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
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 10, padding: '11px 20px', borderRadius: T.radius.md,
              border: `1.5px solid ${T.ink200}`, background: '#fff',
              fontFamily: T.sans, fontSize: 14, fontWeight: 500, color: T.ink900,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.brand; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.ink200; }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 6.294C4.672 4.167 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
          <Spacer h={20} />
          <Body size={13} color={T.ink500} style={{ textAlign: 'center' }}>
            Already have an account?{' '}
            <Link href="/sign-in" style={{ color: T.brand, fontWeight: 600 }}>Sign in →</Link>
          </Body>
        </Card>
      </div>
    </div>
  );
}
