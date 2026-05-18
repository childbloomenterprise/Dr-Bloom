import * as React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PatientsClient } from './PatientsClient';
import type { ConnectionWithChild, UserProfile } from '@/types/database';

export default async function PatientsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  // Fetch all active connections with child + parent data
  const { data: connections } = await supabase
    .from('doctor_child_connections')
    .select(`
      *,
      child:children(
        id, first_name, last_name, date_of_birth, gender,
        photo_url, blood_type, allergies, medical_conditions, parent_id
      )
    `)
    .eq('doctor_id', user.id)
    .eq('status', 'active')
    .order('updated_at', { ascending: false });

  // Get parent profiles for connected children
  const parentIds = [...new Set(
    (connections ?? [])
      .map((c: ConnectionWithChild) => c.child?.parent_id)
      .filter(Boolean)
  )] as string[];

  const { data: parents } = parentIds.length
    ? await supabase
        .from('user_profiles')
        .select('id, full_name, email')
        .in('id', parentIds)
    : { data: [] };

  const parentMap = new Map<string, Pick<UserProfile, 'id' | 'full_name' | 'email'>>(
    (parents ?? []).map((p: Pick<UserProfile, 'id' | 'full_name' | 'email'>) => [p.id, p])
  );

  // Pending connections sent by this doctor
  const { data: pendingConnections } = await supabase
    .from('doctor_child_connections')
    .select('id, child_id, created_at')
    .eq('doctor_id', user.id)
    .eq('status', 'pending');

  return (
    <PatientsClient
      connectedPatients={(connections ?? []).map((conn: ConnectionWithChild) => ({
        connection: conn,
        child: conn.child,
        parent: conn.child?.parent_id ? (parentMap.get(conn.child.parent_id) ?? null) : null,
      }))}
      pendingConnections={pendingConnections ?? []}
      doctorId={user.id}
    />
  );
}
