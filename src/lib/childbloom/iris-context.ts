// Builds the Iris system prompt from structured child data.
// Separating this from the route handler keeps the AI context
// logic testable and reusable across the doctor and parent flows.

import type {
  Child, SleepLog, FeedingLog, SymptomReport,
  Milestone, GrowthMeasurement, Prescription,
} from '@/types/database';

export interface IrisContextData {
  child: (Child & { parent_name: string }) | null;
  sleep: SleepLog[];
  feeding: FeedingLog[];
  symptoms: SymptomReport[];
  milestones: Milestone[];
  growth: GrowthMeasurement[];
  prescriptions: Pick<Prescription, 'medication_name' | 'dosage' | 'unit' | 'frequency'>[];
}

function calculateAge(dob: string | null | undefined): string {
  if (!dob) return 'unknown age';
  const d = new Date(dob);
  const months =
    (new Date().getFullYear() - d.getFullYear()) * 12 +
    (new Date().getMonth() - d.getMonth());
  return months < 24 ? `${months} months` : `${Math.floor(months / 12)} years`;
}

function summarizeSleepLogs(logs: SleepLog[]): string {
  if (!logs.length) return 'No sleep data recorded.';
  const avgMin = logs.reduce((s, l) => s + (l.duration_minutes ?? 0), 0) / logs.length;
  const avgH = (avgMin / 60).toFixed(1);
  const withQuality = logs.filter(l => l.quality_score != null);
  const avgQ = withQuality.length
    ? (withQuality.reduce((s, l) => s + (l.quality_score ?? 0), 0) / withQuality.length).toFixed(1)
    : 'N/A';
  const recent = logs[0];
  const lastDate = recent?.sleep_start
    ? new Date(recent.sleep_start).toLocaleDateString()
    : 'unknown';
  return `${logs.length} records. Avg sleep: ${avgH}h/session. Avg quality: ${avgQ}/5. Most recent: ${lastDate}.`;
}

function summarizeFeedingLogs(logs: FeedingLog[]): string {
  if (!logs.length) return 'No feeding data recorded.';
  const types = [...new Set(logs.map(l => l.feeding_type))];
  const refused = logs.filter(l => l.refused_food).length;
  const recent = logs[0];
  const lastDate = recent?.fed_at
    ? new Date(recent.fed_at).toLocaleDateString()
    : 'unknown';
  return `${logs.length} records. Types: ${types.join(', ')}. Refused ${refused} time(s). Most recent: ${lastDate}.`;
}

function summarizeSymptoms(reports: SymptomReport[]): string {
  if (!reports.length) return 'No symptoms recorded.';
  return reports
    .slice(0, 10)
    .map(r => {
      const date = new Date(r.reported_at).toLocaleDateString();
      const status = r.is_ongoing ? 'ongoing' : 'resolved';
      return `• ${r.symptom} (severity ${r.severity}/5, ${status}, ${date})`;
    })
    .join('\n');
}

function summarizeMilestones(milestones: Milestone[]): string {
  if (!milestones.length) return 'No milestones recorded.';
  return milestones
    .slice(0, 10)
    .map(m => `• ${m.milestone_name} [${m.category}] — ${new Date(m.achieved_at).toLocaleDateString()}`)
    .join('\n');
}

function summarizeGrowth(measurements: GrowthMeasurement[]): string {
  if (!measurements.length) return 'No growth measurements recorded.';
  const latest = measurements[0];
  const date = new Date(latest.measured_at).toLocaleDateString();
  const weight = latest.weight_grams
    ? `${(latest.weight_grams / 1000).toFixed(2)} kg`
    : 'no weight';
  const height = latest.height_cm ? `${latest.height_cm} cm` : 'no height';
  const head = latest.head_circumference_cm
    ? `${latest.head_circumference_cm} cm head circ`
    : 'no head circ';
  return `Latest (${date}): ${weight}, ${height}, ${head}. ${measurements.length} total records.`;
}

// Builds the full Iris system prompt injected on every consultation.
// Follows the Phase 1 architecture from IRIS_ARCHITECTURE.md.
export function buildIrisSystemPrompt(data: IrisContextData): string {
  const { child, sleep, feeding, symptoms, milestones, growth, prescriptions } = data;

  if (!child) return 'Patient data not found.';

  const rxLines = prescriptions.length
    ? prescriptions
        .map(p => `• ${p.medication_name} ${p.dosage}${p.unit ? ' ' + p.unit : ''} — ${p.frequency}`)
        .join('\n')
    : 'None';

  return `You are Iris, an AI clinical assistant for pediatricians using Dr Bloom.
You have access to real data for the following patient.

PATIENT: ${child.first_name} ${child.last_name ?? ''}
Age: ${calculateAge(child.date_of_birth)}
DOB: ${child.date_of_birth ?? 'Unknown'}
Blood Type: ${child.blood_type ?? 'Unknown'}
Gender: ${child.gender ?? 'Not specified'}
Allergies: ${child.allergies?.join(', ') || 'None recorded'}
Known Conditions: ${child.medical_conditions?.join(', ') || 'None recorded'}

SLEEP (last 90 days, ${sleep.length} records):
${summarizeSleepLogs(sleep)}

FEEDING (last 90 days, ${feeding.length} records):
${summarizeFeedingLogs(feeding)}

SYMPTOMS (last 90 days):
${summarizeSymptoms(symptoms)}

RECENT MILESTONES:
${summarizeMilestones(milestones)}

GROWTH:
${summarizeGrowth(growth)}

ACTIVE PRESCRIPTIONS:
${rxLines}

Your role:
- Answer the doctor's clinical questions about this patient using the data above
- Flag any patterns or concerns you notice in the data
- Never fabricate data — only reference what is recorded above
- If data is insufficient to answer a question, say so clearly
- You are a thinking aid for the doctor, not a replacement for clinical judgment`;
}
