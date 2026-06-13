// Consolidated clinical write endpoint for a single child.
// One serverless function handles all three doctor-authored artifacts (vaccine,
// prescription, consultation) to stay under Vercel's function cap. Everything is
// written to the ChildBloom (unified) project via the service-role client, because
// (a) Dr Bloom's own project is paused and (b) the parent only ever sees ChildBloom.
//
// FK reality (verified against the live ChildBloom schema):
//   consultations.doctor_id            -> user_profiles.id   (shadow doctor needed)
//   prescriptions.doctor_id            -> user_profiles.id
//   prescriptions.consultation_id      -> consultations.id   (NOT NULL)
//   vaccination_records.logged_by      -> user_profiles.id
// → we ensureDoctorProfile() (shadow upsert) before writing, and create a stub
//   consultation for a standalone prescription.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createChildBloomAdminClient } from '@/lib/supabase/childbloom-admin';
import { verifyDoctorConnection } from '@/lib/childbloom/fetch';
import { ensureDoctorProfile, getDoctorIdentity, notifyParent, type DoctorIdentity } from '@/lib/childbloom/doctor';

interface Params { params: Promise<{ childId: string }> }

type Kind = 'vaccine' | 'prescription' | 'consultation';

export async function POST(req: NextRequest, { params }: Params) {
  const { childId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const connected = await verifyDoctorConnection(user.id, childId);
  if (!connected) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json() as { kind?: Kind } & Record<string, unknown>;
  const kind = body.kind;
  if (!kind || !['vaccine', 'prescription', 'consultation'].includes(kind)) {
    return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
  }

  const cbAdmin = createChildBloomAdminClient();

  // Child + parent, and doctor identity (from the connection mirror) in parallel.
  const [{ data: child }, identity] = await Promise.all([
    cbAdmin.from('children').select('parent_id, first_name').eq('id', childId).single(),
    getDoctorIdentity(cbAdmin, user.id),
  ]);
  if (!child?.parent_id) return NextResponse.json({ error: 'Child not found' }, { status: 404 });

  const doctor: DoctorIdentity = { id: user.id, fullName: identity.fullName, specialty: identity.specialty };
  const childName = child.first_name ?? 'your child';

  // Shadow doctor row so the FKs below resolve.
  await ensureDoctorProfile(cbAdmin, { id: user.id, email: user.email ?? null, fullName: identity.fullName, specialty: identity.specialty });

  if (kind === 'vaccine') {
    const { vaccineName, doseNumber, administeredAt, batchNumber, facility, nextDueDate, notes } = body as Record<string, string | number | null>;
    if (!vaccineName || !administeredAt) {
      return NextResponse.json({ error: 'vaccineName and administeredAt are required' }, { status: 400 });
    }
    const { data, error } = await cbAdmin.from('vaccination_records').insert({
      child_id: childId,
      logged_by: user.id,
      source: 'doctor',
      vaccine_name: vaccineName,
      dose_number: doseNumber ?? null,
      administered_at: administeredAt,
      batch_number: batchNumber ?? null,
      administered_by: identity.fullName,
      facility: facility ?? null,
      next_due_date: nextDueDate ?? null,
      notes: notes ?? null,
    }).select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await notifyParent(cbAdmin, {
      recipientId: child.parent_id, sender: doctor,
      type: 'vaccination_recorded',
      title: `Dr. ${identity.fullName} recorded a vaccine for ${childName}`,
      body: `${vaccineName}${doseNumber ? ` (dose ${doseNumber})` : ''} given on ${administeredAt}.`,
      data: { child_id: childId, doctor_id: user.id },
    });
    return NextResponse.json({ ok: true, record: data });
  }

  if (kind === 'consultation') {
    const c = body as Record<string, unknown>;
    const { data, error } = await cbAdmin.from('consultations').insert({
      doctor_id: user.id,
      child_id: childId,
      consultation_date: (c.consultationDate as string) ?? new Date().toISOString(),
      visit_type: (c.visitType as string) ?? 'routine',
      chief_complaint: (c.chiefComplaint as string) ?? null,
      history_of_present_illness: (c.historyOfPresentIllness as string) ?? null,
      examination_findings: (c.examinationFindings as string) ?? null,
      assessment: (c.assessment as string) ?? null,
      plan: (c.plan as string) ?? null,
      diagnosis_codes: (c.diagnosisCodes as string[]) ?? null,
      follow_up_days: (c.followUpDays as number) ?? null,
      status: 'completed',
    }).select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (c.pushParentSummary && c.parentSummary) {
      await notifyParent(cbAdmin, {
        recipientId: child.parent_id, sender: doctor,
        type: 'visit_summary',
        title: `Visit summary from Dr. ${identity.fullName}`,
        body: String(c.parentSummary),
        data: { child_id: childId, consultation_id: data.id },
      });
    }
    return NextResponse.json({ ok: true, consultation: data });
  }

  // kind === 'prescription'
  const p = body as Record<string, unknown>;
  if (!p.medicationName || !p.dosage || !p.unit || !p.frequency) {
    return NextResponse.json({ error: 'medicationName, dosage, unit and frequency are required' }, { status: 400 });
  }

  // ChildBloom prescriptions.consultation_id is NOT NULL → ensure we have one.
  let consultationId = (p.consultationId as string) ?? null;
  if (!consultationId) {
    const { data: stub, error: stubErr } = await cbAdmin.from('consultations').insert({
      doctor_id: user.id,
      child_id: childId,
      visit_type: 'routine',
      chief_complaint: 'Prescription issued',
      status: 'completed',
    }).select('id').single();
    if (stubErr) return NextResponse.json({ error: stubErr.message }, { status: 500 });
    consultationId = stub.id;
  }

  const { data, error } = await cbAdmin.from('prescriptions').insert({
    consultation_id: consultationId,
    doctor_id: user.id,
    child_id: childId,
    medication_name: p.medicationName,
    generic_name: (p.genericName as string) ?? null,
    dosage: p.dosage,
    unit: p.unit,
    frequency: p.frequency,
    duration_days: (p.durationDays as number) ?? null,
    route: (p.route as string) ?? 'oral',
    instructions: (p.instructions as string) ?? null,
    is_active: true,
  }).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await notifyParent(cbAdmin, {
    recipientId: child.parent_id, sender: doctor,
    type: 'prescription_added',
    title: `Dr. ${identity.fullName} prescribed ${p.medicationName} for ${childName}`,
    body: `${p.medicationName} ${p.dosage}${p.unit} · ${p.frequency}${p.durationDays ? ` for ${p.durationDays} days` : ''}.`,
    data: { child_id: childId, prescription_id: data.id },
  });
  return NextResponse.json({ ok: true, prescription: data });
}

// Deactivate a prescription.
export async function PATCH(req: NextRequest, { params }: Params) {
  const { childId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const connected = await verifyDoctorConnection(user.id, childId);
  if (!connected) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { prescriptionId, isActive } = await req.json() as { prescriptionId?: string; isActive?: boolean };
  if (!prescriptionId) return NextResponse.json({ error: 'prescriptionId required' }, { status: 400 });

  const cbAdmin = createChildBloomAdminClient();
  const { error } = await cbAdmin
    .from('prescriptions')
    .update({ is_active: isActive ?? false })
    .eq('id', prescriptionId)
    .eq('child_id', childId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
