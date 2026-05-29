import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createChildBloomAdminClient } from '@/lib/supabase/childbloom-admin';
import type { Child, UserProfile, PatientSearchResult } from '@/types/database';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify the caller is a doctor (Dr Bloom user_profiles)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'doctor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const q = searchParams.get('q')?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const cbAdmin = createChildBloomAdminClient();

  const { data: children, error } = await cbAdmin
    .from('children')
    .select('*, parent:user_profiles!children_parent_id_fkey(id, full_name, email)')
    .or(
      `first_name.ilike.%${q}%,last_name.ilike.%${q}%,date_of_birth.eq.${isDateLike(q) ? q : 'null'}`
    )
    .eq('is_active', true)
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!children || children.length === 0) {
    return NextResponse.json({ results: [] });
  }

  // Check connection status from ChildBloom — source of truth for approval state
  const childIds = children.map((c: Child) => c.id);
  const { data: connections } = await cbAdmin
    .from('doctor_child_connections')
    .select('id, child_id, status')
    .eq('doctor_id', user.id)
    .in('child_id', childIds);

  type ConnRow = { id: string; child_id: string; status: string };
  const connectionMap = new Map<string, ConnRow>(
    (connections ?? []).map((c: ConnRow) => [c.child_id, c]),
  );

  const results: PatientSearchResult[] = children.map((row: Child & { parent: Pick<UserProfile, 'id' | 'full_name' | 'email'> | null }) => {
    const conn = connectionMap.get(row.id);
    const { parent, ...child } = row;
    return {
      child: child as Child,
      connectionStatus: (conn ? conn.status : 'none') as PatientSearchResult['connectionStatus'],
      connectionId: conn?.id ?? null,
      parent: parent ?? null,
    };
  });

  return NextResponse.json({ results });
}

function isDateLike(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}
