import * as React from 'react';
import { createClient } from '@/lib/supabase/server';
import { ChildrenListClient } from './ChildrenListClient';

export default async function ChildrenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single();
  const { data: children } = await supabase.from('children').select('*').order('created_at');
  return <ChildrenListClient children={children ?? []} role={profile?.role ?? 'doctor'} />;
}
