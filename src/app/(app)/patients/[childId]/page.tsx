import * as React from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createChildBloomAdminClient } from '@/lib/supabase/childbloom-admin';
import {
  fetchSleepLogs,
  fetchFeedingLogs,
  fetchSymptomReports,
  fetchMilestones,
  fetchGrowthMeasurements,
} from '@/lib/childbloom/fetch';
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
  const cbAdmin = createChildBloomAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  // Verify active connection — source of truth is ChildBloom (parent approves there).
  // Dr Bloom's own copy stays 'pending' after approval; never use it for access gating.
  const { data: connection } = await cbAdmin
    .from('doctor_child_connections')
    .select('id, doctor_id, child_id, status, initiated_by, request_message, created_at, updated_at')
    .eq('doctor_id', user.id)
    .eq('child_id', childId)
    .eq('status', 'active')
    .single();

  if (!connection) notFound();

  // Fetch child + parent from ChildBloom
  const { data: childRaw } = await cbAdmin
    .from('children')
    .select('*, parent:user_profiles!children_parent_id_fkey(id, full_name, email)')
    .eq('id', childId)
    .single();

  if (!childRaw) notFound();

  type ChildRow = Child & { parent: Pick<UserProfile, 'id' | 'full_name' | 'email'> | null };
  const { parent, ...childData } = childRaw as ChildRow;

  // Fetch all tab data in parallel — ChildBloom logs + Dr Bloom clinical data
  const [
    sleepLogs,
    feedingLogs,
    symptoms,
    milestones,
    growth,
    prescriptionsRes,
    healthAlertsRes,
  ] = await Promise.all([
    fetchSleepLogs(childId),
    fetchFeedingLogs(childId),
    fetchSymptomReports(childId),
    fetchMilestones(childId),
    fetchGrowthMeasurements(childId),
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

  return (
    <ChildProfileClient
      child={childData as Child}
      parent={parent ?? null}
      connection={connection as DoctorChildConnection}
      prescriptions={(prescriptionsRes.data ?? []) as Partial<Prescription>[]}
      healthAlerts={(healthAlertsRes.data ?? []) as HealthAlert[]}
      sleepLogs={sleepLogs}
      feedingLogs={feedingLogs}
      symptoms={symptoms}
      milestones={milestones}
      growth={growth}
      doctorId={user.id}
    />
  );
}
