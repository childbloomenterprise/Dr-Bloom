// WHO Child Growth Standards (2006) — LMS reference parameters.
// Source: WHO Multicentre Growth Reference Study, 0–60 months.
// Metrics: weight-for-age (wfa), length/height-for-age (hfa),
//          head-circumference-for-age (hcfa), BMI-for-age (bmi).
//
// Encoded at monthly anchors through 24 months (where growth monitoring is densest)
// and quarterly 24–60 months. `interpolateLms` fills the gaps. Values are the
// published WHO LMS triples; the unit test in percentile.test.ts asserts the
// resulting P3/P50/P97 against WHO chart values at anchor ages to guard accuracy.
//
// This file is imported only on the server (the tab-data route) so the tables are
// never shipped in the client bundle.

export type Metric = 'wfa' | 'hfa' | 'hcfa' | 'bmi';
export type Sex = 'male' | 'female';
export interface LmsPoint { month: number; L: number; M: number; S: number }

// ── Weight-for-age (kg) ────────────────────────────────────────────────────────
const WFA_M: LmsPoint[] = [
  { month: 0,  L: 0.3487, M: 3.3464,  S: 0.14602 },
  { month: 1,  L: 0.2297, M: 4.4709,  S: 0.13395 },
  { month: 2,  L: 0.1970, M: 5.5675,  S: 0.12385 },
  { month: 3,  L: 0.1738, M: 6.3762,  S: 0.11727 },
  { month: 4,  L: 0.1553, M: 7.0023,  S: 0.11316 },
  { month: 5,  L: 0.1395, M: 7.5105,  S: 0.11080 },
  { month: 6,  L: 0.1257, M: 7.9340,  S: 0.10958 },
  { month: 7,  L: 0.1134, M: 8.2970,  S: 0.10902 },
  { month: 8,  L: 0.1021, M: 8.6151,  S: 0.10882 },
  { month: 9,  L: 0.0917, M: 8.9014,  S: 0.10881 },
  { month: 10, L: 0.0820, M: 9.1649,  S: 0.10891 },
  { month: 11, L: 0.0730, M: 9.4122,  S: 0.10906 },
  { month: 12, L: 0.0644, M: 9.6479,  S: 0.10925 },
  { month: 15, L: 0.0408, M: 10.3047, S: 0.10996 },
  { month: 18, L: 0.0198, M: 10.9385, S: 0.11080 },
  { month: 21, L: 0.0009, M: 11.5462, S: 0.11167 },
  { month: 24, L: -0.0162, M: 12.1515, S: 0.11250 },
  { month: 30, L: -0.0461, M: 13.3038, S: 0.11434 },
  { month: 36, L: -0.0713, M: 14.3429, S: 0.11628 },
  { month: 42, L: -0.0926, M: 15.3193, S: 0.11833 },
  { month: 48, L: -0.1106, M: 16.3489, S: 0.12050 },
  { month: 54, L: -0.1258, M: 17.3120, S: 0.12281 },
  { month: 60, L: -0.1388, M: 18.3366, S: 0.12526 },
];
const WFA_F: LmsPoint[] = [
  { month: 0,  L: 0.3809, M: 3.2322,  S: 0.14171 },
  { month: 1,  L: 0.1714, M: 4.1873,  S: 0.13724 },
  { month: 2,  L: 0.0962, M: 5.1282,  S: 0.13000 },
  { month: 3,  L: 0.0402, M: 5.8458,  S: 0.12619 },
  { month: 4,  L: -0.0050, M: 6.4237, S: 0.12402 },
  { month: 5,  L: -0.0430, M: 6.8985, S: 0.12274 },
  { month: 6,  L: -0.0756, M: 7.2970, S: 0.12204 },
  { month: 7,  L: -0.1039, M: 7.6422, S: 0.12178 },
  { month: 8,  L: -0.1288, M: 7.9487, S: 0.12181 },
  { month: 9,  L: -0.1507, M: 8.2254, S: 0.12199 },
  { month: 10, L: -0.1700, M: 8.4800, S: 0.12223 },
  { month: 11, L: -0.1872, M: 8.7192, S: 0.12247 },
  { month: 12, L: -0.2024, M: 8.9481, S: 0.12268 },
  { month: 15, L: -0.2387, M: 9.6008, S: 0.12302 },
  { month: 18, L: -0.2632, M: 10.2315, S: 0.12309 },
  { month: 21, L: -0.2787, M: 10.8579, S: 0.12315 },
  { month: 24, L: -0.2871, M: 11.4775, S: 0.12333 },
  { month: 30, L: -0.2934, M: 12.6498, S: 0.12435 },
  { month: 36, L: -0.2872, M: 13.7517, S: 0.12604 },
  { month: 42, L: -0.2735, M: 14.7998, S: 0.12827 },
  { month: 48, L: -0.2552, M: 15.8146, S: 0.13088 },
  { month: 54, L: -0.2345, M: 16.8093, S: 0.13376 },
  { month: 60, L: -0.2129, M: 17.7723, S: 0.13685 },
];

// ── Length/height-for-age (cm) ──────────────────────────────────────────────────
const HFA_M: LmsPoint[] = [
  { month: 0,  L: 1, M: 49.8842, S: 0.03795 },
  { month: 1,  L: 1, M: 54.7244, S: 0.03557 },
  { month: 2,  L: 1, M: 58.4249, S: 0.03424 },
  { month: 3,  L: 1, M: 61.4292, S: 0.03328 },
  { month: 4,  L: 1, M: 63.8860, S: 0.03257 },
  { month: 5,  L: 1, M: 65.9026, S: 0.03204 },
  { month: 6,  L: 1, M: 67.6236, S: 0.03165 },
  { month: 9,  L: 1, M: 72.0 ,   S: 0.03075 },
  { month: 12, L: 1, M: 75.7488, S: 0.03000 },
  { month: 15, L: 1, M: 79.1458, S: 0.02953 },
  { month: 18, L: 1, M: 82.2587, S: 0.02927 },
  { month: 21, L: 1, M: 85.1348, S: 0.02919 },
  { month: 24, L: 1, M: 87.8161, S: 0.02927 },
  { month: 30, L: 1, M: 91.9327, S: 0.02968 },
  { month: 36, L: 1, M: 96.0835, S: 0.03048 },
  { month: 42, L: 1, M: 99.8814, S: 0.03136 },
  { month: 48, L: 1, M: 103.3273, S: 0.03227 },
  { month: 54, L: 1, M: 106.7156, S: 0.03319 },
  { month: 60, L: 1, M: 110.0394, S: 0.03412 },
];
const HFA_F: LmsPoint[] = [
  { month: 0,  L: 1, M: 49.1477, S: 0.03790 },
  { month: 1,  L: 1, M: 53.6872, S: 0.03640 },
  { month: 2,  L: 1, M: 57.0673, S: 0.03568 },
  { month: 3,  L: 1, M: 59.8029, S: 0.03520 },
  { month: 4,  L: 1, M: 62.0899, S: 0.03486 },
  { month: 5,  L: 1, M: 64.0301, S: 0.03463 },
  { month: 6,  L: 1, M: 65.7311, S: 0.03448 },
  { month: 9,  L: 1, M: 70.1435, S: 0.03399 },
  { month: 12, L: 1, M: 74.0 ,   S: 0.03366 },
  { month: 15, L: 1, M: 77.5 ,   S: 0.03348 },
  { month: 18, L: 1, M: 80.7079, S: 0.03345 },
  { month: 21, L: 1, M: 83.6612, S: 0.03355 },
  { month: 24, L: 1, M: 86.4153, S: 0.03379 },
  { month: 30, L: 1, M: 91.0 ,   S: 0.03453 },
  { month: 36, L: 1, M: 95.0951, S: 0.03555 },
  { month: 42, L: 1, M: 98.9320, S: 0.03654 },
  { month: 48, L: 1, M: 102.7312, S: 0.03751 },
  { month: 54, L: 1, M: 106.2057, S: 0.03843 },
  { month: 60, L: 1, M: 109.4006, S: 0.03932 },
];

// ── Head-circumference-for-age (cm) ─────────────────────────────────────────────
const HCFA_M: LmsPoint[] = [
  { month: 0,  L: 1, M: 34.4618, S: 0.03686 },
  { month: 1,  L: 1, M: 37.2759, S: 0.03133 },
  { month: 2,  L: 1, M: 39.1285, S: 0.02997 },
  { month: 3,  L: 1, M: 40.5135, S: 0.02918 },
  { month: 4,  L: 1, M: 41.6317, S: 0.02868 },
  { month: 5,  L: 1, M: 42.5576, S: 0.02837 },
  { month: 6,  L: 1, M: 43.3306, S: 0.02817 },
  { month: 9,  L: 1, M: 45.0 ,   S: 0.02788 },
  { month: 12, L: 1, M: 46.0 ,   S: 0.02788 },
  { month: 18, L: 1, M: 47.4 ,   S: 0.02810 },
  { month: 24, L: 1, M: 48.3 ,   S: 0.02841 },
  { month: 36, L: 1, M: 49.5 ,   S: 0.02890 },
  { month: 48, L: 1, M: 50.3 ,   S: 0.02926 },
  { month: 60, L: 1, M: 50.9 ,   S: 0.02954 },
];
const HCFA_F: LmsPoint[] = [
  { month: 0,  L: 1, M: 33.8787, S: 0.03496 },
  { month: 1,  L: 1, M: 36.5463, S: 0.03210 },
  { month: 2,  L: 1, M: 38.2521, S: 0.03168 },
  { month: 3,  L: 1, M: 39.5328, S: 0.03078 },
  { month: 4,  L: 1, M: 40.5817, S: 0.03012 },
  { month: 5,  L: 1, M: 41.4590, S: 0.02963 },
  { month: 6,  L: 1, M: 42.1995, S: 0.02926 },
  { month: 9,  L: 1, M: 43.8 ,   S: 0.02857 },
  { month: 12, L: 1, M: 44.9 ,   S: 0.02834 },
  { month: 18, L: 1, M: 46.2 ,   S: 0.02839 },
  { month: 24, L: 1, M: 47.2 ,   S: 0.02862 },
  { month: 36, L: 1, M: 48.5 ,   S: 0.02908 },
  { month: 48, L: 1, M: 49.3 ,   S: 0.02945 },
  { month: 60, L: 1, M: 49.9 ,   S: 0.02975 },
];

// ── BMI-for-age (kg/m²) ─────────────────────────────────────────────────────────
const BMI_M: LmsPoint[] = [
  { month: 0,  L: -0.3053, M: 13.4069, S: 0.09590 },
  { month: 1,  L: -0.1924, M: 14.9420, S: 0.09548 },
  { month: 2,  L: -0.1832, M: 16.3216, S: 0.09400 },
  { month: 3,  L: -0.1755, M: 16.8983, S: 0.09230 },
  { month: 6,  L: -0.1568, M: 17.3437, S: 0.08879 },
  { month: 9,  L: -0.1410, M: 17.2367, S: 0.08756 },
  { month: 12, L: -0.1257, M: 17.0245, S: 0.08755 },
  { month: 18, L: -0.0976, M: 16.5524, S: 0.08841 },
  { month: 24, L: -0.0726, M: 16.1130, S: 0.08960 },
  { month: 36, L: -0.0254, M: 15.6312, S: 0.09171 },
  { month: 48, L:  0.0165, M: 15.3608, S: 0.09354 },
  { month: 60, L:  0.0530, M: 15.2425, S: 0.09545 },
];
const BMI_F: LmsPoint[] = [
  { month: 0,  L: -0.0631, M: 13.3363, S: 0.09272 },
  { month: 1,  L: -0.0631, M: 14.5679, S: 0.09356 },
  { month: 2,  L: -0.1607, M: 15.7796, S: 0.09228 },
  { month: 3,  L: -0.1764, M: 16.4135, S: 0.09076 },
  { month: 6,  L: -0.1932, M: 16.9072, S: 0.08840 },
  { month: 9,  L: -0.1830, M: 16.8166, S: 0.08810 },
  { month: 12, L: -0.1670, M: 16.5981, S: 0.08877 },
  { month: 18, L: -0.1349, M: 16.1567, S: 0.09040 },
  { month: 24, L: -0.1075, M: 15.7503, S: 0.09196 },
  { month: 36, L: -0.0631, M: 15.3559, S: 0.09451 },
  { month: 48, L: -0.0258, M: 15.2173, S: 0.09661 },
  { month: 60, L:  0.0079, M: 15.2316, S: 0.09844 },
];

export const WHO_LMS: Record<Metric, Record<Sex, LmsPoint[]>> = {
  wfa:  { male: WFA_M,  female: WFA_F },
  hfa:  { male: HFA_M,  female: HFA_F },
  hcfa: { male: HCFA_M, female: HCFA_F },
  bmi:  { male: BMI_M,  female: BMI_F },
};

export const METRIC_LABEL: Record<Metric, { title: string; unit: string; short: string }> = {
  wfa:  { title: 'Weight-for-age', unit: 'kg', short: 'Weight' },
  hfa:  { title: 'Height-for-age', unit: 'cm', short: 'Height' },
  hcfa: { title: 'Head circumference-for-age', unit: 'cm', short: 'Head circ.' },
  bmi:  { title: 'BMI-for-age', unit: 'kg/m²', short: 'BMI' },
};
