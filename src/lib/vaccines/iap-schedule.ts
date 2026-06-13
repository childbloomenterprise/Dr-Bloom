// IAP (Indian Academy of Pediatrics) immunization schedule — the routine 0–5y series.
// Used to render a per-child schedule, mark doses done from vaccination_records, and
// flag overdue / due-soon by age. recommendedAgeMonths is the standard catch point;
// window is the acceptable [from, to] age range in months.

import type { VaccinationRecord } from '@/types/database';

export interface ScheduleDose {
  key: string;            // stable id for the row
  vaccineKey: string;     // groups doses of the same vaccine
  vaccineName: string;    // display name
  doseLabel: string;      // e.g. "Birth", "1", "2", "Booster"
  doseNumber: number | null;
  recommendedAgeMonths: number;
  window: [number, number];
}

export const IAP_SCHEDULE: ScheduleDose[] = [
  // Birth
  { key: 'bcg',        vaccineKey: 'BCG',     vaccineName: 'BCG',                doseLabel: 'Birth',  doseNumber: 1, recommendedAgeMonths: 0,  window: [0, 1] },
  { key: 'opv0',       vaccineKey: 'OPV',     vaccineName: 'OPV (oral polio)',  doseLabel: '0',      doseNumber: 0, recommendedAgeMonths: 0,  window: [0, 0.5] },
  { key: 'hepb0',      vaccineKey: 'HepB',    vaccineName: 'Hepatitis B',       doseLabel: 'Birth',  doseNumber: 0, recommendedAgeMonths: 0,  window: [0, 0.5] },
  // 6 weeks (~1.5 mo)
  { key: 'dtwp1',      vaccineKey: 'DTwP',    vaccineName: 'DTwP / DTaP',       doseLabel: '1',      doseNumber: 1, recommendedAgeMonths: 1.5, window: [1.5, 3] },
  { key: 'ipv1',       vaccineKey: 'IPV',     vaccineName: 'IPV',               doseLabel: '1',      doseNumber: 1, recommendedAgeMonths: 1.5, window: [1.5, 3] },
  { key: 'hib1',       vaccineKey: 'Hib',     vaccineName: 'Hib',               doseLabel: '1',      doseNumber: 1, recommendedAgeMonths: 1.5, window: [1.5, 3] },
  { key: 'hepb1',      vaccineKey: 'HepB',    vaccineName: 'Hepatitis B',       doseLabel: '1',      doseNumber: 1, recommendedAgeMonths: 1.5, window: [1.5, 3] },
  { key: 'pcv1',       vaccineKey: 'PCV',     vaccineName: 'PCV',               doseLabel: '1',      doseNumber: 1, recommendedAgeMonths: 1.5, window: [1.5, 3] },
  { key: 'rota1',      vaccineKey: 'Rota',    vaccineName: 'Rotavirus',         doseLabel: '1',      doseNumber: 1, recommendedAgeMonths: 1.5, window: [1.5, 3] },
  // 10 weeks (~2.5 mo)
  { key: 'dtwp2',      vaccineKey: 'DTwP',    vaccineName: 'DTwP / DTaP',       doseLabel: '2',      doseNumber: 2, recommendedAgeMonths: 2.5, window: [2.5, 4] },
  { key: 'ipv2',       vaccineKey: 'IPV',     vaccineName: 'IPV',               doseLabel: '2',      doseNumber: 2, recommendedAgeMonths: 2.5, window: [2.5, 4] },
  { key: 'hib2',       vaccineKey: 'Hib',     vaccineName: 'Hib',               doseLabel: '2',      doseNumber: 2, recommendedAgeMonths: 2.5, window: [2.5, 4] },
  { key: 'hepb2',      vaccineKey: 'HepB',    vaccineName: 'Hepatitis B',       doseLabel: '2',      doseNumber: 2, recommendedAgeMonths: 2.5, window: [2.5, 4] },
  { key: 'pcv2',       vaccineKey: 'PCV',     vaccineName: 'PCV',               doseLabel: '2',      doseNumber: 2, recommendedAgeMonths: 2.5, window: [2.5, 4] },
  { key: 'rota2',      vaccineKey: 'Rota',    vaccineName: 'Rotavirus',         doseLabel: '2',      doseNumber: 2, recommendedAgeMonths: 2.5, window: [2.5, 4] },
  // 14 weeks (~3.5 mo)
  { key: 'dtwp3',      vaccineKey: 'DTwP',    vaccineName: 'DTwP / DTaP',       doseLabel: '3',      doseNumber: 3, recommendedAgeMonths: 3.5, window: [3.5, 5] },
  { key: 'ipv3',       vaccineKey: 'IPV',     vaccineName: 'IPV',               doseLabel: '3',      doseNumber: 3, recommendedAgeMonths: 3.5, window: [3.5, 5] },
  { key: 'hib3',       vaccineKey: 'Hib',     vaccineName: 'Hib',               doseLabel: '3',      doseNumber: 3, recommendedAgeMonths: 3.5, window: [3.5, 5] },
  { key: 'pcv3',       vaccineKey: 'PCV',     vaccineName: 'PCV',               doseLabel: '3',      doseNumber: 3, recommendedAgeMonths: 3.5, window: [3.5, 5] },
  { key: 'rota3',      vaccineKey: 'Rota',    vaccineName: 'Rotavirus',         doseLabel: '3',      doseNumber: 3, recommendedAgeMonths: 3.5, window: [3.5, 5] },
  // 6 months
  { key: 'hepb3',      vaccineKey: 'HepB',    vaccineName: 'Hepatitis B',       doseLabel: '3',      doseNumber: 3, recommendedAgeMonths: 6,   window: [6, 9] },
  { key: 'opv6',       vaccineKey: 'OPV',     vaccineName: 'OPV (oral polio)',  doseLabel: '1',      doseNumber: 1, recommendedAgeMonths: 6,   window: [6, 9] },
  // 9 months
  { key: 'mmr1',       vaccineKey: 'MMR',     vaccineName: 'MMR',               doseLabel: '1',      doseNumber: 1, recommendedAgeMonths: 9,   window: [9, 12] },
  { key: 'opv9',       vaccineKey: 'OPV',     vaccineName: 'OPV (oral polio)',  doseLabel: '2',      doseNumber: 2, recommendedAgeMonths: 9,   window: [9, 12] },
  // 12 months
  { key: 'hepa1',      vaccineKey: 'HepA',    vaccineName: 'Hepatitis A',       doseLabel: '1',      doseNumber: 1, recommendedAgeMonths: 12,  window: [12, 18] },
  { key: 'pcvb',       vaccineKey: 'PCV',     vaccineName: 'PCV booster',       doseLabel: 'Booster',doseNumber: 4, recommendedAgeMonths: 12,  window: [12, 15] },
  // 15 months
  { key: 'mmr2',       vaccineKey: 'MMR',     vaccineName: 'MMR',               doseLabel: '2',      doseNumber: 2, recommendedAgeMonths: 15,  window: [15, 18] },
  { key: 'varicella1', vaccineKey: 'Varicella', vaccineName: 'Varicella',       doseLabel: '1',      doseNumber: 1, recommendedAgeMonths: 15,  window: [15, 18] },
  // 16–18 months
  { key: 'dtwpb1',     vaccineKey: 'DTwP',    vaccineName: 'DTwP / DTaP booster', doseLabel: 'Booster 1', doseNumber: 4, recommendedAgeMonths: 18, window: [16, 24] },
  { key: 'ipvb',       vaccineKey: 'IPV',     vaccineName: 'IPV booster',       doseLabel: 'Booster',doseNumber: 4, recommendedAgeMonths: 18,  window: [16, 24] },
  { key: 'hibb',       vaccineKey: 'Hib',     vaccineName: 'Hib booster',       doseLabel: 'Booster',doseNumber: 4, recommendedAgeMonths: 18,  window: [16, 24] },
  // 2 years
  { key: 'hepa2',      vaccineKey: 'HepA',    vaccineName: 'Hepatitis A',       doseLabel: '2',      doseNumber: 2, recommendedAgeMonths: 18,  window: [18, 24] },
  { key: 'varicella2', vaccineKey: 'Varicella', vaccineName: 'Varicella',       doseLabel: '2',      doseNumber: 2, recommendedAgeMonths: 48,  window: [48, 72] },
  // 4–6 years
  { key: 'dtwpb2',     vaccineKey: 'DTwP',    vaccineName: 'DTwP / DTaP booster', doseLabel: 'Booster 2', doseNumber: 5, recommendedAgeMonths: 60, window: [48, 72] },
  { key: 'opv5',       vaccineKey: 'OPV',     vaccineName: 'OPV (oral polio)',  doseLabel: '3',      doseNumber: 3, recommendedAgeMonths: 60,  window: [48, 72] },
  { key: 'mmr3',       vaccineKey: 'MMR',     vaccineName: 'MMR',               doseLabel: '3',      doseNumber: 3, recommendedAgeMonths: 60,  window: [48, 72] },
];

export type DoseStatus = 'done' | 'overdue' | 'due-soon' | 'upcoming';

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Match an administered record to a schedule row by vaccine name (fuzzy) + dose number.
export function matchAdministered(record: VaccinationRecord, dose: ScheduleDose): boolean {
  const rn = norm(record.vaccine_name);
  const vn = norm(dose.vaccineKey);
  const nameHit = rn.includes(vn) || vn.includes(rn);
  if (!nameHit) return false;
  if (record.dose_number == null || dose.doseNumber == null) return nameHit;
  return record.dose_number === dose.doseNumber;
}

export function doseStatus(
  dose: ScheduleDose,
  ageMonths: number,
  administered: VaccinationRecord[],
): { status: DoseStatus; record: VaccinationRecord | null } {
  const record = administered.find(r => matchAdministered(r, dose)) ?? null;
  if (record) return { status: 'done', record };
  const [, to] = dose.window;
  if (ageMonths > to) return { status: 'overdue', record: null };
  if (ageMonths >= dose.window[0] - 1) return { status: 'due-soon', record: null };
  return { status: 'upcoming', record: null };
}

// Distinct vaccine names for the "record vaccine" dropdown.
export const VACCINE_OPTIONS: string[] = Array.from(
  new Set(IAP_SCHEDULE.map(d => d.vaccineName.replace(/ booster$/i, '').replace(/ \(.*\)$/, '').trim())),
).sort();
