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
        { error: 'email, password, and full_name are required.' },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    // Check if this email already has a profile (ChildBloom parent or prior doctor attempt)
    const { data: existingProfile } = await admin
      .from('user_profiles')
      .select('id, role')
      .eq('email', email)
      .maybeSingle();

    if (existingProfile) {
      // Upgrade existing account to doctor role
      await admin
        .from('user_profiles')
        .update({ full_name, role: 'doctor', updated_at: new Date().toISOString() })
        .eq('id', existingProfile.id);

      await admin.from('doctor_profiles').upsert(
        { id: existingProfile.id, specialty: specialty || 'General Pediatrics', updated_at: new Date().toISOString() },
        { onConflict: 'id' },
      );

      // Return existed=true so client knows to sign in with existing password
      return NextResponse.json({ userId: existingProfile.id, existed: true });
    }

    // Brand new user — create auth account
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

    // ChildBloom's handle_new_user trigger may have already inserted a 'parent' row —
    // upsert forces role to 'doctor' regardless
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
