import * as React from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createChildBloomAdminClient } from '@/lib/supabase/childbloom-admin';
import { ChildProfileClient } from './ChildProfileClient';
import type { Child, UserProfile, DoctorChildConnection, Prescription, HealthAlert } from '@/types/database';

interface Props {
  params: Promise<{ childId: string }>;
}

export default async function PatientProfilePage({ params }: Props) {
  const { childId } = await params;
  const supabase = await createClient();
  const cbAdmin = createChildBloomAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  // Verify active connection and fetch pre_visit_notes so doctor sees parent concerns.
  const { data: connection } = await cbAdmin
    .from('doctor_child_connections')
    .select('id, doctor_id, child_id, status, initiated_by, request_message, pre_visit_notes, pre_visit_notes_updated_at, created_at, updated_at')
    .eq('doctor_id', user.id)
    .eq('child_id', childId)
    .eq('status', 'active')
    .single();

  if (!connection) notFound();

  // Fetch child + parent + overview data in parallel
  const [childRes, prescriptionsRes, healthAlertsRes] = await Promise.all([
    cbAdmin
      .from('children')
      .select('*, parent:user_profiles!children_parent_id_fkey(id, full_name, email)')
      .eq('id', childId)
      .single(),
    supabase
      .from('prescriptions')
      .select('medication_name, dosage, unit, frequency')
      .eq('child_id', childId)
      .eq('is_active', true),
    supabase
      .from('health_alerts')
      .select('*')
      .eq('child_id', childId)
      .is('resolved_at', null)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  if (!childRes.data) notFound();

  type ChildRow = Child & { parent: Pick<UserProfile, 'id' | 'full_name' | 'email'> | null };
  const { parent, ...childData } = childRes.data as ChildRow;

  const conn = connection as DoctorChildConnection & {
    pre_visit_notes: string | null;
    pre_visit_notes_updated_at: string | null;
  };

  return (
    <ChildProfileClient
      child={childData as Child}
      parent={parent ?? null}
      connection={conn}
      preVisitNotes={conn.pre_visit_notes ?? null}
      preVisitNotesUpdatedAt={conn.pre_visit_notes_updated_at ?? null}
      prescriptions={(prescriptionsRes.data ?? []) as Partial<Prescription>[]}
      healthAlerts={(healthAlertsRes.data ?? []) as HealthAlert[]}
      doctorId={user.id}
    />
  );
}
