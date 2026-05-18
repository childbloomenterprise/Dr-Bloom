import * as React from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ChildProfileClient } from './ChildProfileClient';
import type {
  Child, UserProfile, DoctorChildConnection,
  Prescription, HealthAlert,
} from '@/types/database';

interface Props {
  params: Promise<{ childId: string }>;
}

export default async function PatientProfilePage({ params }: Props) {
  const { childId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  // Verify active connection — RLS also enforces this, but explicit check gives better UX
  const { data: connection } = await supabase
    .from('doctor_child_connections')
    .select('*')
    .eq('doctor_id', user.id)
    .eq('child_id', childId)
    .eq('status', 'active')
    .single();

  if (!connection) notFound();

  // Fetch child profile — RLS allows because is_connected_doctor returns true
  const { data: child } = await supabase
    .from('children')
    .select('*, parent:user_profiles!children_parent_id_fkey(id, full_name, email)')
    .eq('id', childId)
    .single();

  if (!child) notFound();

  // Fetch active prescriptions for Iris context
  const { data: prescriptions } = await supabase
    .from('prescriptions')
    .select('medication_name, dosage, unit, frequency')
    .eq('child_id', childId)
    .eq('is_active', true);

  // Fetch unresolved health alerts
  const { data: healthAlerts } = await supabase
    .from('health_alerts')
    .select('*')
    .eq('child_id', childId)
    .is('resolved_at', null)
    .order('created_at', { ascending: false })
    .limit(10);

  const { parent, ...childData } = child;

  return (
    <ChildProfileClient
      child={childData as Child}
      parent={(parent as Pick<UserProfile, 'id' | 'full_name' | 'email'>) ?? null}
      connection={connection as DoctorChildConnection}
      prescriptions={(prescriptions ?? []) as Partial<Prescription>[]}
      healthAlerts={(healthAlerts ?? []) as HealthAlert[]}
      doctorId={user.id}
    />
  );
}
