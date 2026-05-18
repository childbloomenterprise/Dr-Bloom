import { type NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const { email, password, full_name, specialty } = await req.json() as {
      email: string;
      password: string;
      full_name: string;
      specialty?: string;
    };

    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: 'Email, password, and full name are required.' },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    // Check if email is already registered in Dr Bloom auth
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const alreadyExists = existingUsers?.users?.some(u => u.email === email);
    if (alreadyExists) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in.' },
        { status: 400 },
      );
    }

    // Create auth user — handle_new_doctor trigger auto-creates user_profiles row
    const { data, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: 'doctor', specialty },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = data.user.id;

    // Ensure user_profiles row exists (trigger may need a moment; upsert is safe)
    const { error: profileError } = await admin.from('user_profiles').upsert(
      { id: userId, email, full_name, role: 'doctor' },
      { onConflict: 'id' },
    );

    if (profileError) {
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: `Profile creation failed: ${profileError.message}` },
        { status: 500 },
      );
    }

    const { error: doctorError } = await admin.from('doctor_profiles').upsert(
      { id: userId, specialty: specialty || 'General Pediatrics' },
      { onConflict: 'id' },
    );

    if (doctorError) {
      await admin.from('user_profiles').delete().eq('id', userId);
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: `Doctor profile creation failed: ${doctorError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ userId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create account.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
