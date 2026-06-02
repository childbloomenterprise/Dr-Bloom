import * as React from 'react';
import { createClient } from '@/lib/supabase/server';
import { createChildBloomAdminClient } from '@/lib/supabase/childbloom-admin';
import { redirect } from 'next/navigation';
import { PatientsClient } from './PatientsClient';
import type { Child, DoctorChildConnection, UserProfile } from '@/types/database';

type PatientEntry = {
  connection: DoctorChildConnection;
  child: Child;
  parent: Pick<UserProfile, 'id' | 'full_name' | 'email'> | null;
};

export default async function PatientsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const cbAdmin = createChildBloomAdminClient();

  // Active connections — source of truth is ChildBloom.
  // Parent approves there, so only ChildBloom's copy ever reaches 'active'.
  // Dr Bloom's own copy remains 'pending' and must NOT be used for connected patients.
  const { data: activeConnsRaw } = await cbAdmin
    .from('doctor_child_connections')
    .select('id, doctor_id, child_id, status, initiated_by, request_message, created_at, updated_at')
    .eq('doctor_id', user.id)
    .eq('status', 'active')
    .order('updated_at', { ascending: false });

  const activeConns = (activeConnsRaw ?? []) as DoctorChildConnection[];
  const childIds = activeConns.map((c) => c.child_id);

  // Fetch child + parent data from ChildBloom
  const { data: childrenRaw } = childIds.length
    ? await cbAdmin
        .from('children')
        .select('*, parent:user_profiles!children_parent_id_fkey(id, full_name, email)')
        .in('id', childIds)
    : { data: [] as (Child & { parent: Pick<UserProfile, 'id' | 'full_name' | 'email'> | null })[] };

  type ChildRow = Child & { parent: Pick<UserProfile, 'id' | 'full_name' | 'email'> | null };
  const childMap = new Map<string, ChildRow>(
    ((childrenRaw ?? []) as ChildRow[]).map((c) => [c.id, c])
  );

  const connectedPatients: PatientEntry[] = activeConns
    .map((conn) => {
      const row = childMap.get(conn.child_id);
      if (!row) return null;
      const { parent, ...child } = row;
      return { connection: conn, child: child as Child, parent: parent ?? null };
    })
    .filter((e): e is PatientEntry => e !== null);

  // Pending count — Dr Bloom's own DB (connect route writes there when doctor sends request)
  const { data: pendingRaw } = await supabase
    .from('doctor_child_connections')
    .select('id, child_id, created_at')
    .eq('doctor_id', user.id)
    .eq('status', 'pending');

  // Data freshness — latest entry timestamp per child across sleep + feeding logs.
  // Used to show "Last logged X ago" on patient cards so doctor knows if data is current.
  const freshnessMap = new Map<string, string>();
  if (childIds.length > 0) {
    const [sleepRes, feedRes] = await Promise.all([
      cbAdmin.from('sleep_logs').select('child_id, created_at').in('child_id', childIds).order('created_at', { ascending: false }),
      cbAdmin.from('feeding_logs').select('child_id, created_at').in('child_id', childIds).order('created_at', { ascending: false }),
    ]);
    const allEntries = [
      ...(sleepRes.data ?? []),
      ...(feedRes.data ?? []),
    ] as { child_id: string; created_at: string }[];

    for (const e of allEntries) {
      const existing = freshnessMap.get(e.child_id);
      if (!existing || e.created_at > existing) {
        freshnessMap.set(e.child_id, e.created_at);
      }
    }
  }

  const lastLoggedAt = Object.fromEntries(freshnessMap.entries());

  return (
    <PatientsClient
      connectedPatients={connectedPatients}
      pendingConnections={(pendingRaw ?? []) as { id: string; child_id: string; created_at: string }[]}
      doctorId={user.id}
      lastLoggedAt={lastLoggedAt}
    />
  );
}
