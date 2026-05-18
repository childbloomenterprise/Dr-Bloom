import * as React from 'react';
import { createClient } from '@/lib/supabase/server';
import { ConsultClient } from './ConsultClient';
import type { UserRole, IrisMessage } from '@/types/database';

export interface ChildRow {
  id: string;
  first_name: string;
  last_name: string | null;
  date_of_birth: string | null;
}

export interface ConsultRow {
  id: string;
  child_id: string;
  created_at: string;
  updated_at: string;
}

export default async function ConsultPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string; id?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Only connected children are available in a consultation
  const { data: connections } = await supabase
    .from('doctor_child_connections')
    .select('child:children(id, first_name, last_name, date_of_birth)')
    .eq('doctor_id', user.id)
    .eq('status', 'active');

  type ConnectionJoin = { child: ChildRow | ChildRow[] | null };
  const children: ChildRow[] = (connections ?? [])
    .flatMap((c: ConnectionJoin) => {
      const ch = c.child;
      if (!ch) return [];
      return Array.isArray(ch) ? ch : [ch];
    });

  const { data: consultations } = await supabase
    .from('consultations')
    .select('id, child_id, created_at, updated_at')
    .eq('doctor_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(20);

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  let initialMessages: IrisMessage[] = [];
  let activeConsult: ConsultRow | null = null;

  if (sp.id) {
    const { data: c } = await supabase
      .from('consultations')
      .select('id, child_id, created_at, updated_at')
      .eq('id', sp.id)
      .single();

    const { data: conv } = await supabase
      .from('iris_conversations')
      .select('messages')
      .eq('consultation_id', sp.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    activeConsult = c ?? null;
    initialMessages = (conv?.messages ?? []) as IrisMessage[];
  }

  return (
    <ConsultClient
      userId={user.id}
      children={children}
      consultations={(consultations ?? []) as ConsultRow[]}
      activeConsult={activeConsult}
      initialMessages={initialMessages}
      defaultChildId={sp.child}
      userRole={(profile?.role ?? 'doctor') as UserRole}
    />
  );
}
