import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createChildBloomAdminClient } from '@/lib/supabase/childbloom-admin';
import {
  verifyDoctorConnection,
  fetchSleepLogs,
  fetchFeedingLogs,
  fetchSymptomReports,
  fetchMilestones,
  fetchGrowthMeasurements,
  fetchVaccinationRecords,
  fetchPrescriptionsFull,
  fetchConsultations,
} from '@/lib/childbloom/fetch';
import { buildGrowthPayload } from '@/lib/growth/build';

type TabId = 'sleep' | 'feeding' | 'symptoms' | 'milestones' | 'growth' | 'vaccines' | 'rx' | 'visits';

const VALID_TABS = new Set<TabId>([
  'sleep', 'feeding', 'symptoms', 'milestones', 'growth', 'vaccines', 'rx', 'visits',
]);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ childId: string }> },
) {
  const { childId } = await params;
  const tab = req.nextUrl.searchParams.get('tab') as TabId | null;

  if (!tab || !VALID_TABS.has(tab)) {
    return NextResponse.json({ error: 'Invalid tab' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const connected = await verifyDoctorConnection(user.id, childId);
  if (!connected) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  switch (tab) {
    case 'sleep':      return NextResponse.json({ data: await fetchSleepLogs(childId) });
    case 'feeding':    return NextResponse.json({ data: await fetchFeedingLogs(childId) });
    case 'symptoms':   return NextResponse.json({ data: await fetchSymptomReports(childId) });
    case 'milestones': return NextResponse.json({ data: await fetchMilestones(childId) });
    case 'vaccines':   return NextResponse.json({ data: await fetchVaccinationRecords(childId) });
    case 'rx':         return NextResponse.json({ data: await fetchPrescriptionsFull(childId) });
    case 'visits':     return NextResponse.json({ data: await fetchConsultations(childId, user.id) });
    case 'growth': {
      const cbAdmin = createChildBloomAdminClient();
      const [measurements, childRes] = await Promise.all([
        fetchGrowthMeasurements(childId),
        cbAdmin.from('children').select('gender, date_of_birth').eq('id', childId).single(),
      ]);
      const payload = buildGrowthPayload(
        measurements,
        childRes.data?.gender ?? null,
        childRes.data?.date_of_birth ?? null,
      );
      return NextResponse.json(payload);
    }
  }
}
