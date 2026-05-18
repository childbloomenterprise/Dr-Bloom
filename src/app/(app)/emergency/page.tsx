import * as React from 'react';
import { createClient } from '@/lib/supabase/server';
import { EmergencyClient } from './EmergencyClient';

export default async function EmergencyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: children } = await supabase.from('children').select('id, name, emergency_contacts(*)').order('created_at');
  return <EmergencyClient children={children ?? []} />;
}
