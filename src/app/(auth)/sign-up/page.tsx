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
  const supabase = createClient();
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [specialty, setSpecialty] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

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
      const body = await res.json() as { userId?: string; existed?: boolean; error?: string };
      if (!res.ok) {
        setError(body.error ?? 'Sign-up failed.');
        setLoading(false);
        return;
      }

      // Sign in — whether new account or existing account that was upgraded
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) {
        if (body.existed) {
          setError('Your account has been upgraded to a doctor account. Please sign in with your existing ChildBloom password on the Sign in page.');
        } else {
          setError(signInErr.message);
        }
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
