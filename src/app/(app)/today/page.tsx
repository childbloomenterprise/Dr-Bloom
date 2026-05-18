import * as React from 'react';
import { createClient } from '@/lib/supabase/server';
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

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    profileRes,
    connectionsRes,
    alertsRes,
    notificationsRes,
    pendingRes,
    consultationsRes,
  ] = await Promise.all([
    // Doctor's own profile
    supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single(),

    // Active connections with child data
    supabase
      .from('doctor_child_connections')
      .select('id, child_id, child:children(id, first_name, last_name, date_of_birth, gender, photo_url, parent_id)')
      .eq('doctor_id', user.id)
      .eq('status', 'active'),

    // Unresolved health alerts — RLS limits to connected children
    supabase
      .from('health_alerts')
      .select('*, child:children(first_name, last_name)')
      .is('resolved_at', null)
      .order('created_at', { ascending: false })
      .limit(10),

    // Unread notifications for this doctor
    supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', user.id)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(5),

    // Pending connections sent by this doctor
    supabase
      .from('doctor_child_connections')
      .select('id')
      .eq('doctor_id', user.id)
      .eq('status', 'pending'),

    // Today's consultations
    supabase
      .from('consultations')
      .select('id, child_id, visit_type, status, child:children(first_name, last_name)')
      .eq('doctor_id', user.id)
      .gte('consultation_date', todayStart.toISOString())
      .order('consultation_date'),
  ]);

  const connections = (connectionsRes.data ?? []) as unknown as { child: Child | null }[];
  const connectedChildren: Child[] = connections
    .map(c => c.child)
    .filter((c): c is Child => c !== null);

  return (
    <DashboardClient
      profile={(profileRes.data as UserProfile) ?? null}
      connectedChildren={connectedChildren}
      healthAlerts={(alertsRes.data ?? []) as (HealthAlert & { child: { first_name: string; last_name: string | null } | null })[]}
      notifications={(notificationsRes.data ?? []) as Notification[]}
      pendingConnectionCount={pendingRes.data?.length ?? 0}
      todayConsultations={(consultationsRes.data ?? []) as unknown as ConsultationRow[]}
    />
  );
}
