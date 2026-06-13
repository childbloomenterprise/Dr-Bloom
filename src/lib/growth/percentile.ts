// WHO LMS percentile / z-score math. Pure, dependency-free, unit-tested.
// Reference: WHO Child Growth Standards (2006) use the LMS method, where a measurement
// X at a given age is converted to a z-score via the Box-Cox transform:
//   z = ((X/M)^L - 1) / (L * S)      (L != 0)
//   z = ln(X/M) / S                  (L == 0)
// and inverted as:
//   X = M * (1 + L*S*z)^(1/L)        (L != 0)
//   X = M * exp(S*z)                 (L == 0)

import { WHO_LMS, type Metric, type Sex, type LmsPoint } from './who-lms';

export type { Metric, Sex } from './who-lms';

const EPS = 1e-7;

export function lmsZScore(value: number, { L, M, S }: Pick<LmsPoint, 'L' | 'M' | 'S'>): number {
  if (Math.abs(L) < EPS) return Math.log(value / M) / S;
  return (Math.pow(value / M, L) - 1) / (L * S);
}

export function lmsValueAtZ(z: number, { L, M, S }: Pick<LmsPoint, 'L' | 'M' | 'S'>): number {
  if (Math.abs(L) < EPS) return M * Math.exp(S * z);
  return M * Math.pow(1 + L * S * z, 1 / L);
}

// Standard normal CDF (Abramowitz & Stegun 7.1.26 via erf). Returns 0..1.
export function zToPercentile(z: number): number {
  // erf approximation
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t
    * Math.exp(-(z * z) / 2);
  const cdf = z >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
  return Math.min(1, Math.max(0, cdf));
}

// Linear interpolation of L, M, S between the two bracketing monthly anchors.
export function interpolateLms(months: number, table: LmsPoint[]): LmsPoint | null {
  if (!table.length) return null;
  const clamped = Math.max(table[0].month, Math.min(table[table.length - 1].month, months));
  let lo = table[0];
  let hi = table[table.length - 1];
  for (let i = 0; i < table.length - 1; i++) {
    if (clamped >= table[i].month && clamped <= table[i + 1].month) {
      lo = table[i]; hi = table[i + 1]; break;
    }
  }
  if (lo.month === hi.month) return { ...lo, month: clamped };
  const f = (clamped - lo.month) / (hi.month - lo.month);
  return {
    month: clamped,
    L: lo.L + f * (hi.L - lo.L),
    M: lo.M + f * (hi.M - lo.M),
    S: lo.S + f * (hi.S - lo.S),
  };
}

export function lmsFor(metric: Metric, sex: Sex, months: number): LmsPoint | null {
  return interpolateLms(months, WHO_LMS[metric][sex]);
}

// Percentile (0..100, one decimal) of a measured value for a metric/sex/age. null if no ref.
export function percentileFor(metric: Metric, sex: Sex, months: number, value: number | null): number | null {
  if (value == null || !(value > 0)) return null;
  const lms = lmsFor(metric, sex, months);
  if (!lms) return null;
  const z = lmsZScore(value, lms);
  return Math.round(zToPercentile(z) * 1000) / 10;
}

// The five WHO band values (P3/P15/P50/P85/P97) at a given age, for drawing curves.
const BAND_Z: Record<'p3' | 'p15' | 'p50' | 'p85' | 'p97', number> = {
  p3: -1.880793608, p15: -1.036433389, p50: 0, p85: 1.036433389, p97: 1.880793608,
};

export interface Bands { month: number; p3: number; p15: number; p50: number; p85: number; p97: number }

export function bandsForAge(metric: Metric, sex: Sex, months: number): Bands | null {
  const lms = lmsFor(metric, sex, months);
  if (!lms) return null;
  return {
    month: months,
    p3:  lmsValueAtZ(BAND_Z.p3, lms),
    p15: lmsValueAtZ(BAND_Z.p15, lms),
    p50: lmsValueAtZ(BAND_Z.p50, lms),
    p85: lmsValueAtZ(BAND_Z.p85, lms),
    p97: lmsValueAtZ(BAND_Z.p97, lms),
  };
}

// Band curves across the whole 0..maxMonth range at monthly steps (for the chart).
export function bandSeries(metric: Metric, sex: Sex, maxMonth = 60): Bands[] {
  const out: Bands[] = [];
  for (let m = 0; m <= maxMonth; m++) {
    const b = bandsForAge(metric, sex, m);
    if (b) out.push(b);
  }
  return out;
}

export function ageInMonths(dob: string, at: string | Date = new Date()): number {
  const d0 = new Date(dob).getTime();
  const d1 = (at instanceof Date ? at : new Date(at)).getTime();
  if (isNaN(d0) || isNaN(d1)) return 0;
  const months = (d1 - d0) / (30.4375 * 24 * 3600 * 1000);
  return Math.max(0, Math.round(months * 10) / 10);
}

export function ordinalPercentile(p: number | null): string {
  if (p == null) return '—';
  if (p < 1) return '<P1';
  if (p > 99) return '>P99';
  return `P${Math.round(p)}`;
}
