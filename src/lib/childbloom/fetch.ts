// Central data access layer for reading ChildBloom parent-logged data.
// All child data queries in Dr Bloom must go through this module —
// never raw inline queries on child tables in API routes.

import { createAdminClient } from '@/lib/supabase/admin';
import type {
  Child, SleepLog, FeedingLog, SymptomReport,
  Milestone, GrowthMeasurement, Prescription,
} from '@/types/database';

function ninetyDaysAgo(): string {
  return new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
}

// Verify a doctor has an active connection to this child before fetching anything.
// Uses admin client so it bypasses RLS, but manually checks both IDs.
export async function verifyDoctorConnection(doctorId: string, childId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('doctor_child_connections')
    .select('id')
    .eq('doctor_id', doctorId)
    .eq('child_id', childId)
    .eq('status', 'active')
    .single();
  return !!data;
}

type ProfileJoin = { full_name: string | null } | null;

// Full child profile with parent's display name.
export async function fetchChildProfile(childId: string): Promise<(Child & { parent_name: string }) | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('children')
    .select('*, user_profiles!parent_id(full_name)')
    .eq('id', childId)
    .single();

  if (!data) return null;
  const profileJoin = (data.user_profiles as unknown) as ProfileJoin;
  return {
    ...(data as unknown as Child),
    parent_name: profileJoin?.full_name ?? 'Unknown',
  };
}

// Sleep logs — last 90 days.
export async function fetchSleepLogs(childId: string): Promise<SleepLog[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('sleep_logs')
    .select('*')
    .eq('child_id', childId)
    .gte('sleep_start', ninetyDaysAgo())
    .order('sleep_start', { ascending: false });
  return (data ?? []) as SleepLog[];
}

// Feeding logs — last 90 days.
export async function fetchFeedingLogs(childId: string): Promise<FeedingLog[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('feeding_logs')
    .select('*')
    .eq('child_id', childId)
    .gte('fed_at', ninetyDaysAgo())
    .order('fed_at', { ascending: false });
  return (data ?? []) as FeedingLog[];
}

// Symptom reports — all time, sorted by recency.
export async function fetchSymptomReports(childId: string): Promise<SymptomReport[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('symptom_reports')
    .select('*')
    .eq('child_id', childId)
    .order('reported_at', { ascending: false })
    .limit(100);
  return (data ?? []) as SymptomReport[];
}

// Milestones — all time.
export async function fetchMilestones(childId: string): Promise<Milestone[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('milestones')
    .select('*')
    .eq('child_id', childId)
    .order('achieved_at', { ascending: false });
  return (data ?? []) as Milestone[];
}

// Growth measurements — all time (needed for trend charts).
export async function fetchGrowthMeasurements(childId: string): Promise<GrowthMeasurement[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('growth_measurements')
    .select('*')
    .eq('child_id', childId)
    .order('measured_at', { ascending: false });
  return (data ?? []) as GrowthMeasurement[];
}

// Active prescriptions for Iris context.
export async function fetchActivePrescriptions(
  childId: string,
): Promise<Pick<Prescription, 'medication_name' | 'dosage' | 'unit' | 'frequency'>[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('prescriptions')
    .select('medication_name, dosage, unit, frequency')
    .eq('child_id', childId)
    .eq('is_active', true);
  return (data ?? []) as Pick<Prescription, 'medication_name' | 'dosage' | 'unit' | 'frequency'>[];
}

// Everything bundled for Iris context building — runs in parallel.
export async function fetchAllChildDataForIris(childId: string) {
  const [child, sleep, feeding, symptoms, milestones, growth, prescriptions] = await Promise.all([
    fetchChildProfile(childId),
    fetchSleepLogs(childId),
    fetchFeedingLogs(childId),
    fetchSymptomReports(childId),
    fetchMilestones(childId),
    fetchGrowthMeasurements(childId),
    fetchActivePrescriptions(childId),
  ]);
  return { child, sleep, feeding, symptoms, milestones, growth, prescriptions };
}

// Overview: latest one entry from each category (for the Overview tab).
export async function fetchChildOverview(childId: string) {
  const supabase = createAdminClient();
  const [sleepRes, feedingRes, symptomRes, growthRes] = await Promise.all([
    supabase.from('sleep_logs').select('*').eq('child_id', childId).order('sleep_start', { ascending: false }).limit(1),
    supabase.from('feeding_logs').select('*').eq('child_id', childId).order('fed_at', { ascending: false }).limit(1),
    supabase.from('symptom_reports').select('*').eq('child_id', childId).order('reported_at', { ascending: false }).limit(3),
    supabase.from('growth_measurements').select('*').eq('child_id', childId).order('measured_at', { ascending: false }).limit(1),
  ]);
  return {
    latestSleep:    (sleepRes.data?.[0] ?? null) as SleepLog | null,
    latestFeeding:  (feedingRes.data?.[0] ?? null) as FeedingLog | null,
    recentSymptoms: (symptomRes.data ?? []) as SymptomReport[],
    latestGrowth:   (growthRes.data?.[0] ?? null) as GrowthMeasurement | null,
  };
}
