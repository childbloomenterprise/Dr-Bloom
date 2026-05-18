import * as React from 'react';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { ChildProfileClient } from './ChildProfileClient';

export default async function ChildPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: child }, { data: vitals }, { data: growth }, { data: milestones }, { data: emergencyContacts }] = await Promise.all([
    supabase.from('children').select('*').eq('id', id).single(),
    supabase.from('vitals').select('*').eq('child_id', id).order('recorded_at', { ascending: false }).limit(20),
    supabase.from('growth').select('*').eq('child_id', id).order('measured_at', { ascending: false }).limit(20),
    supabase.from('milestones').select('*').eq('child_id', id).order('target_date'),
    supabase.from('emergency_contacts').select('*').eq('child_id', id),
  ]);
  if (!child) notFound();
  return <ChildProfileClient child={child} vitals={vitals ?? []} growth={growth ?? []} milestones={milestones ?? []} emergencyContacts={emergencyContacts ?? []} />;
}
