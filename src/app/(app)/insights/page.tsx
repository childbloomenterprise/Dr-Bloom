import * as React from 'react';
import { createClient } from '@/lib/supabase/server';
import { createChildBloomAdminClient } from '@/lib/supabase/childbloom-admin';
import { InsightsClient } from './InsightsClient';

export default async function InsightsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const cbAdmin = createChildBloomAdminClient();

  // Monitored = the doctor's active connected children (ChildBloom).
  const { data: connRaw } = await cbAdmin
    .from('doctor_child_connections')
    .select('child:children!doctor_child_connections_child_id_fkey(id, first_name, last_name)')
    .eq('doctor_id', user.id)
    .eq('status', 'active');
  const children = ((connRaw ?? []) as unknown as { child: { id: string; first_name: string; last_name: string | null } | null }[])
    .map(c => c.child)
    .filter((c): c is { id: string; first_name: string; last_name: string | null } => c !== null);

  // Doctor's notifications use the unified schema (recipient_id). Resilient: a
  // pre-cutover own-project notifications table may use a different shape.
  const notifications = await supabase
    .from('notifications')
    .select('id, type, title, body, is_read, read_at, created_at')
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30)
    .then(r => (r.data ?? []) as NotificationRow[], () => [] as NotificationRow[]);

  return <InsightsClient notifications={notifications} children={children} userId={user.id} />;
}

interface NotificationRow {
  id: string; type: string | null; title: string; body: string | null;
  is_read: boolean; read_at: string | null; created_at: string;
}
