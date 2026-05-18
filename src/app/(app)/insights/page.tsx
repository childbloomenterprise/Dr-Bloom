import * as React from 'react';
import { createClient } from '@/lib/supabase/server';
import { InsightsClient } from './InsightsClient';

export default async function InsightsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: notifications }, { data: children }, { data: vitals }] = await Promise.all([
    supabase.from('notifications').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(30),
    supabase.from('children').select('id, name, date_of_birth').order('created_at'),
    supabase.from('vitals').select('*').order('recorded_at', { ascending: false }).limit(50),
  ]);
  return <InsightsClient notifications={notifications ?? []} children={children ?? []} vitals={vitals ?? []} userId={user!.id} />;
}
