import * as React from 'react';
import { createClient } from '@/lib/supabase/server';
import { createChildBloomAdminClient } from '@/lib/supabase/childbloom-admin';
import { DashboardClient } from './DashboardClient';
import type { UserProfile, Child, HealthAlert, Notification } from '@/types/database';

interface ConsultationRow {
  id: string;
  child_id: string;
  visit_type: string;
  status: string;
  child: { first_name: string; last_name: string | null } | null;
}

export default async function TodayPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const cbAdmin = createChildBloomAdminClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Connections, children, alerts and consultations all live in ChildBloom (the
  // unified store). The active status only ever exists there, so reading them from
  // Dr Bloom's own (paused) project would show nothing — read from ChildBloom.
  const { data: connRaw } = await cbAdmin
    .from('doctor_child_connections')
    .select('child_id, child:children!doctor_child_connections_child_id_fkey(id, first_name, last_name, date_of_birth, gender, photo_url, parent_id)')
    .eq('doctor_id', user.id)
    .eq('status', 'active');

  const connectedChildren: Child[] = ((connRaw ?? []) as unknown as { child: Child | null }[])
    .map(c => c.child)
    .filter((c): c is Child => c !== null);
  const childIds = connectedChildren.map(c => c.id);

  const [profileRes, alertsRes, notificationsRes, pendingRes, consultationsRes] = await Promise.all([
    // Doctor's own profile lives in the Dr Bloom project; make it resilient.
    supabase.from('user_profiles').select('*').eq('id', user.id).single()
      .then(r => r.data as UserProfile | null, () => null),

    // Unresolved alerts for connected children (ChildBloom).
    childIds.length
      ? cbAdmin.from('health_alerts')
          .select('*, child:children(first_name, last_name)')
          .in('child_id', childIds)
          .is('resolved_at', null)
          .order('created_at', { ascending: false })
          .limit(10)
          .then(r => r.data ?? [], () => [])
      : Promise.resolve([]),

    // Doctor's own notifications (Dr Bloom), resilient.
    supabase.from('notifications').select('*').eq('recipient_id', user.id).eq('is_read', false)
      .order('created_at', { ascending: false }).limit(5)
      .then(r => r.data ?? [], () => []),

    // Pending requests the doctor sent (Dr Bloom), resilient.
    supabase.from('doctor_child_connections').select('id').eq('doctor_id', user.id).eq('status', 'pending')
      .then(r => r.data ?? [], () => []),

    // Today's consultations (ChildBloom).
    cbAdmin.from('consultations')
      .select('id, child_id, visit_type, status, child:children(first_name, last_name)')
      .eq('doctor_id', user.id)
      .gte('consultation_date', todayStart.toISOString())
      .order('consultation_date')
      .then(r => r.data ?? [], () => []),
  ]);

  return (
    <DashboardClient
      profile={profileRes}
      connectedChildren={connectedChildren}
      healthAlerts={(alertsRes ?? []) as (HealthAlert & { child: { first_name: string; last_name: string | null } | null })[]}
      notifications={(notificationsRes ?? []) as Notification[]}
      pendingConnectionCount={pendingRes?.length ?? 0}
      todayConsultations={(consultationsRes ?? []) as unknown as ConsultationRow[]}
    />
  );
}
