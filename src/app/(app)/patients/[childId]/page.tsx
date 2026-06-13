import * as React from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createChildBloomAdminClient } from '@/lib/supabase/childbloom-admin';
import {
  fetchPrescriptionsFull, fetchVaccinationRecords, fetchConsultations, fetchGrowthMeasurements,
} from '@/lib/childbloom/fetch';
import { buildGrowthPayload } from '@/lib/growth/build';
import { ChildProfileClient } from './ChildProfileClient';
import type {
  Child, UserProfile, DoctorChildConnection, Prescription, HealthAlert,
  VaccinationRecord, Consultation,
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

  // Verify active connection + read pre-visit notes (source of truth: ChildBloom).
  const { data: connection } = await cbAdmin
    .from('doctor_child_connections')
    .select('id, doctor_id, child_id, status, initiated_by, request_message, pre_visit_notes, pre_visit_notes_updated_at, created_at, updated_at')
    .eq('doctor_id', user.id)
    .eq('child_id', childId)
    .eq('status', 'active')
    .single();

  if (!connection) notFound();

  // Everything clinical lives in the ChildBloom (unified) project — Dr Bloom's own
  // project is paused. Health alerts still come from Dr Bloom but are made resilient
  // so a cold/paused project can't crash the whole page.
  const [childRes, prescriptions, vaccines, consultations, growthRaw, healthAlerts] = await Promise.all([
    cbAdmin
      .from('children')
      .select('*, parent:user_profiles!children_parent_id_fkey(id, full_name, email)')
      .eq('id', childId)
      .single(),
    fetchPrescriptionsFull(childId),
    fetchVaccinationRecords(childId),
    fetchConsultations(childId, user.id),
    fetchGrowthMeasurements(childId),
    supabase
      .from('health_alerts')
      .select('*')
      .eq('child_id', childId)
      .is('resolved_at', null)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(
        r => (r.data ?? []) as HealthAlert[],
        () => [] as HealthAlert[],
      ),
  ]);

  if (!childRes.data) notFound();

  type ChildRow = Child & { parent: Pick<UserProfile, 'id' | 'full_name' | 'email'> | null };
  const { parent, ...childData } = childRes.data as ChildRow;
  const child = childData as Child;

  const conn = connection as DoctorChildConnection & {
    pre_visit_notes: string | null;
    pre_visit_notes_updated_at: string | null;
  };

  const growth = buildGrowthPayload(growthRaw, child.gender ?? null, child.date_of_birth ?? null);

  return (
    <ChildProfileClient
      child={child}
      parent={parent ?? null}
      connection={conn}
      preVisitNotes={conn.pre_visit_notes ?? null}
      preVisitNotesUpdatedAt={conn.pre_visit_notes_updated_at ?? null}
      prescriptions={prescriptions as Prescription[]}
      vaccines={vaccines as VaccinationRecord[]}
      consultations={consultations as Consultation[]}
      growth={growth}
      healthAlerts={healthAlerts}
      doctorId={user.id}
    />
  );
}
