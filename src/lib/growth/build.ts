// Server-only: turn raw growth measurements into a client-ready chart payload.
// Computes each measurement's age + percentile per metric and the WHO band curves,
// so the WHO LMS tables never reach the browser.
import type { GrowthMeasurement } from '@/types/database';
import { percentileFor, bandSeries, ageInMonths, type Sex } from './percentile';
import type { Metric } from './who-lms';

export interface EnrichedMeasurement {
  id: string;
  measured_at: string;
  source: string;
  ageMonths: number;
  weightKg: number | null;
  heightCm: number | null;
  hcCm: number | null;
  bmi: number | null;
  weightPct: number | null;
  heightPct: number | null;
  hcPct: number | null;
  bmiPct: number | null;
}

export interface GrowthPayload {
  data: EnrichedMeasurement[];
  bands: Record<Metric, { month: number; p3: number; p15: number; p50: number; p85: number; p97: number }[]> | null;
  sex: Sex | null;
}

function toSex(gender: string | null): Sex | null {
  if (gender === 'male' || gender === 'female') return gender;
  return null;
}

export function buildGrowthPayload(
  measurements: GrowthMeasurement[],
  gender: string | null,
  dob: string | null,
): GrowthPayload {
  const sex = toSex(gender);

  const data: EnrichedMeasurement[] = measurements.map(m => {
    const ageMonths = dob ? ageInMonths(dob, m.measured_at) : 0;
    const weightKg = m.weight_grams != null ? m.weight_grams / 1000 : null;
    const heightCm = m.height_cm ?? null;
    const hcCm = m.head_circumference_cm ?? null;
    const bmi = m.bmi ?? (weightKg && heightCm ? weightKg / Math.pow(heightCm / 100, 2) : null);
    return {
      id: m.id,
      measured_at: m.measured_at,
      source: m.source,
      ageMonths,
      weightKg, heightCm, hcCm, bmi,
      weightPct: sex ? percentileFor('wfa', sex, ageMonths, weightKg) : null,
      heightPct: sex ? percentileFor('hfa', sex, ageMonths, heightCm) : null,
      hcPct:     sex ? percentileFor('hcfa', sex, ageMonths, hcCm) : null,
      bmiPct:    sex ? percentileFor('bmi', sex, ageMonths, bmi) : null,
    };
  });

  const bands = sex
    ? {
        wfa:  bandSeries('wfa', sex),
        hfa:  bandSeries('hfa', sex),
        hcfa: bandSeries('hcfa', sex),
        bmi:  bandSeries('bmi', sex),
      }
    : null;

  return { data, bands, sex };
}
