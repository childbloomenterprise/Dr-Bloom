'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { theme as T } from '@/lib/theme';
import { Stack, HRow, Card, Button, Display, Body, Input, Select, Spacer } from '@/components/primitives';
import { Icon } from '@/components/Icon';

export default function NewChildPage() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = React.useState('');
  const [dob, setDob] = React.useState('');
  const [sex, setSex] = React.useState('');
  const [weight, setWeight] = React.useState('');
  const [height, setHeight] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/sign-in'); return; }
    const { error } = await supabase.from('children').insert({
      parent_id: user.id,
      name,
      date_of_birth: dob,
      sex: sex || null,
      weight_kg: weight ? parseFloat(weight) : null,
      height_cm: height ? parseFloat(height) : null,
      notes: notes || null,
    });
    if (error) { setError(error.message); setLoading(false); return; }
    // Create welcome notification
    await supabase.from('notifications').insert({
      user_id: user.id,
      title: `${name} added`,
      body: `Start logging vitals and milestones for ${name}.`,
      kind: 'milestone',
    });
    router.push('/children');
  }

  return (
    <div className="enter" style={{ height: '100vh', overflowY: 'auto', background: T.bg }}>
      <div style={{ padding: '24px 24px 48px', maxWidth: 540, margin: '0 auto' }}>
        <HRow gap={12} style={{ marginBottom: 28, alignItems: 'center' }}>
          <button onClick={() => router.back()} style={{ width: 40, height: 40, borderRadius: T.radius.pill, background: T.surface, border: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.ink700, flexShrink: 0, cursor: 'pointer' }}>
            <Icon name="chevronL" size={18} stroke={1.7} />
          </button>
          <Display size={26} italic lh={1.1}>Add a child.</Display>
        </HRow>

        <Card p={32}>
          <form onSubmit={handleSubmit}>
            <Stack gap={16}>
              <Input label="Full name" type="text" placeholder="e.g. Amara Johnson" value={name} onChange={e => setName(e.target.value)} required />
              <Input label="Date of birth" type="date" value={dob} onChange={e => setDob(e.target.value)} required />
              <Select label="Sex" value={sex} onChange={e => setSex(e.target.value)}>
                <option value="">Not specified</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </Select>
              <HRow gap={12}>
                <div style={{ flex: 1 }}>
                  <Input label="Weight (kg)" type="number" step="0.1" min="0" placeholder="e.g. 5.4" value={weight} onChange={e => setWeight(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <Input label="Height (cm)" type="number" step="0.1" min="0" placeholder="e.g. 60" value={height} onChange={e => setHeight(e.target.value)} />
                </div>
              </HRow>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.ink500 }}>Notes</span>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional notes…" rows={3} style={{ padding: '12px 16px', borderRadius: T.radius.md, border: `1px solid ${T.line}`, background: T.surface, color: T.ink900, fontFamily: T.sans, fontSize: 14, resize: 'vertical', outline: 'none' }} />
              </label>
              {error && <Body size={13} color={T.danger}>{error}</Body>}
              <Spacer h={4} />
              <Button type="submit" full size="lg" disabled={loading}>
                {loading ? 'Saving…' : 'Add child'}
              </Button>
            </Stack>
          </form>
        </Card>
      </div>
    </div>
  );
}
