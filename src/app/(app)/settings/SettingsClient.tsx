'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { theme as T } from '@/lib/theme';
import { Stack, HRow, Card, Button, Display, Body, Mono, Eyebrow, Avatar, Chip, Spacer, Divider, Input, Select } from '@/components/primitives';
import { TopBar } from '@/components/shell/TopBar';
import { Icon } from '@/components/Icon';

interface Props { profile: any; userId: string; email: string; }

export function SettingsClient({ profile, userId, email }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [isMobile, setIsMobile] = React.useState(false);
  const [fullName, setFullName] = React.useState(profile?.full_name ?? '');
  const [specialty, setSpecialty] = React.useState(profile?.specialty ?? '');
  const [hospital, setHospital] = React.useState(profile?.hospital ?? '');
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check(); window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await supabase.from('profiles').upsert({ id: userId, full_name: fullName, specialty: specialty || null, hospital: hospital || null });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/sign-in');
  }

  return (
    <div className="enter" style={{ height: '100vh', overflowY: 'auto', background: T.bg }}>
      <TopBar
        isMobile={isMobile}
        onMenu={() => (window as any).__drBloomOpenDrawer?.()}
        eyebrow="SETTINGS"
        title="Settings."
        subtitle="Manage your profile and account."
      />

      <div style={{ padding: isMobile ? '16px 14px 40px' : '24px 32px 48px', maxWidth: 640 }}>
        <Stack gap={20}>
          {/* Profile */}
          <Card p={28}>
            <Eyebrow color={T.brand} style={{ marginBottom: 16 }}>Profile</Eyebrow>
            <HRow gap={16} style={{ marginBottom: 24, alignItems: 'center' }}>
              <Avatar name={fullName || 'U'} size={56} tone="brand" />
              <Stack gap={3}>
                <Body size={16} weight={600} color={T.ink900}>{fullName || 'Your name'}</Body>
                <Mono size={11}>{email}</Mono>
                <Chip tone="wash">Doctor</Chip>
              </Stack>
            </HRow>
            <form onSubmit={saveProfile}>
              <Stack gap={14}>
                <Input label="Full name" type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" />
                <Input label="Specialty" type="text" value={specialty} onChange={e => setSpecialty(e.target.value)} placeholder="e.g. Pediatrics, Neonatology" />
                <Input label="Hospital / Clinic" type="text" value={hospital} onChange={e => setHospital(e.target.value)} placeholder="e.g. Bloom Children's Medical Center" />
                <Button type="submit" size="md" disabled={saving}>
                  {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save profile'}
                </Button>
              </Stack>
            </form>
          </Card>

          {/* Account */}
          <Card p={28}>
            <Eyebrow color={T.ink400} style={{ marginBottom: 16 }}>Account</Eyebrow>
            <Stack gap={12}>
              <HRow gap={12} style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack gap={2}>
                  <Body size={14} weight={600} color={T.ink900}>Email address</Body>
                  <Mono size={11}>{email}</Mono>
                </Stack>
                <Chip tone="soft">Verified</Chip>
              </HRow>
              <Divider />
              <HRow gap={12} style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack gap={2}>
                  <Body size={14} weight={600} color={T.ink900}>Role</Body>
                  <Body size={12.5} color={T.ink500}>Pediatrician — full clinical access</Body>
                </Stack>
                <Chip tone="wash">Doctor</Chip>
              </HRow>
              <Divider />
              <HRow gap={12} style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack gap={2}>
                  <Body size={14} weight={600} color={T.ink900}>Data standards</Body>
                  <Body size={12.5} color={T.ink500}>Growth charts use WHO Child Growth Standards</Body>
                </Stack>
                <Chip tone="cream">WHO</Chip>
              </HRow>
            </Stack>
          </Card>

          {/* About */}
          <Card p={28} tone="dim">
            <Eyebrow color={T.ink400} style={{ marginBottom: 12 }}>About Dr Bloom</Eyebrow>
            <Body size={13} color={T.ink500} lh={1.65}>
              Dr Bloom is a pediatric intelligence platform for pediatricians worldwide. All growth assessments follow <strong>WHO Child Growth Standards</strong>. Emergency guidance is based on <strong>WHO IMCI guidelines</strong>. Dr Bloom is not a substitute for professional medical advice.
            </Body>
            <Spacer h={16} />
            <HRow gap={8}>
              <Chip tone="wash">v0.1.0</Chip>
              <Chip tone="cream">WHO standards</Chip>
              <Chip tone="soft">Global</Chip>
            </HRow>
          </Card>

          {/* Sign out */}
          <Button variant="secondary" full size="lg" icon="logout" onClick={signOut}>
            Sign out
          </Button>
        </Stack>
      </div>
    </div>
  );
}
