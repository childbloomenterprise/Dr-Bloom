import { describe, it, expect } from 'vitest';
import {
  zToPercentile, lmsZScore, lmsValueAtZ, percentileFor, bandsForAge, ageInMonths, ordinalPercentile,
} from './percentile';

describe('zToPercentile', () => {
  it('maps the standard normal correctly', () => {
    expect(zToPercentile(0)).toBeCloseTo(0.5, 3);
    expect(zToPercentile(1.6449)).toBeCloseTo(0.95, 2);   // 95th
    expect(zToPercentile(-1.6449)).toBeCloseTo(0.05, 2);  // 5th
    expect(zToPercentile(1.8808)).toBeCloseTo(0.97, 2);   // ~97th band
    expect(zToPercentile(-1.8808)).toBeCloseTo(0.03, 2);  // ~3rd band
  });
});

describe('LMS round-trip', () => {
  it('value -> z -> value is identity', () => {
    const lms = { L: 0.0644, M: 9.6479, S: 0.10925 };
    const z = lmsZScore(10.5, lms);
    expect(lmsValueAtZ(z, lms)).toBeCloseTo(10.5, 4);
  });
  it('the median value is P50 by construction', () => {
    expect(percentileFor('wfa', 'male', 0, 3.3464)).toBeCloseTo(50, 0);
    expect(percentileFor('hfa', 'female', 12, 74.0)).toBeCloseTo(50, 0);
  });
});

// Guards against decimal-slip encoding errors by checking the visible bands against
// published WHO chart values at well-known anchor ages.
describe('WHO band anchors', () => {
  it('boys weight-for-age @12mo: P3 ~7.7, P50 ~9.6, P97 ~12.0 kg', () => {
    const b = bandsForAge('wfa', 'male', 12)!;
    expect(b.p50).toBeCloseTo(9.6, 1);
    expect(b.p3).toBeGreaterThan(7.0);
    expect(b.p3).toBeLessThan(8.3);
    expect(b.p97).toBeGreaterThan(11.2);
    expect(b.p97).toBeLessThan(12.6);
  });
  it('girls height-for-age @24mo: P50 ~86 cm', () => {
    const b = bandsForAge('hfa', 'female', 24)!;
    expect(b.p50).toBeCloseTo(86.4, 0);
    expect(b.p3).toBeGreaterThan(80);
    expect(b.p97).toBeLessThan(93);
  });
  it('boys head-circ @0mo: P50 ~34.5 cm', () => {
    const b = bandsForAge('hcfa', 'male', 0)!;
    expect(b.p50).toBeCloseTo(34.5, 0);
  });
});

describe('percentileFor', () => {
  it('a +1SD-ish value lands around P85', () => {
    // boys weight 12mo P85 band value, fed back, should read ~85
    const b = bandsForAge('wfa', 'male', 12)!;
    expect(percentileFor('wfa', 'male', 12, b.p85)).toBeCloseTo(85, 0);
  });
  it('returns null for missing values', () => {
    expect(percentileFor('wfa', 'male', 12, null)).toBeNull();
    expect(percentileFor('wfa', 'male', 12, 0)).toBeNull();
  });
});

describe('ageInMonths', () => {
  it('computes months from dob', () => {
    expect(ageInMonths('2025-06-12', '2026-06-12')).toBeCloseTo(12, 0);
    expect(ageInMonths('2026-03-12', '2026-06-12')).toBeCloseTo(3, 0);
  });
});

describe('ordinalPercentile', () => {
  it('formats nicely', () => {
    expect(ordinalPercentile(62.3)).toBe('P62');
    expect(ordinalPercentile(0.4)).toBe('<P1');
    expect(ordinalPercentile(99.6)).toBe('>P99');
    expect(ordinalPercentile(null)).toBe('—');
  });
});
