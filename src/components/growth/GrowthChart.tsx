// Hand-rolled WHO percentile growth chart (no chart lib). Mirrors the Spark/Ring
// conventions: pure SVG, theme colours, faint band fill, the child's plotted line on top.
'use client';
import * as React from 'react';
import { theme as T } from '@/lib/theme';

export interface GrowthBand { month: number; p3: number; p15: number; p50: number; p85: number; p97: number }
export interface GrowthPoint { ageMonths: number; value: number; pct: number | null }

interface Props {
  bands: GrowthBand[];
  points: GrowthPoint[];
  unit: string;
  maxMonth?: number;
  height?: number;
}

export function GrowthChart({ bands, points, unit, maxMonth = 60, height = 200 }: Props) {
  const [hover, setHover] = React.useState<number | null>(null);
  const W = 600, H = height;
  const padL = 34, padR = 12, padT = 12, padB = 24;
  const plotW = W - padL - padR, plotH = H - padT - padB;

  if (!bands.length) return null;

  // y-domain from the band extremes + the child's points, padded.
  const allVals = [
    ...bands.flatMap(b => [b.p3, b.p97]),
    ...points.map(p => p.value),
  ].filter(v => v > 0);
  const yMin = Math.min(...allVals);
  const yMax = Math.max(...allVals);
  const ySpan = (yMax - yMin) || 1;
  const yLo = yMin - ySpan * 0.08;
  const yHi = yMax + ySpan * 0.08;

  const x = (m: number) => padL + (Math.min(m, maxMonth) / maxMonth) * plotW;
  const y = (v: number) => padT + (1 - (v - yLo) / (yHi - yLo)) * plotH;

  const bandPath = (key: keyof GrowthBand) =>
    bands.map((b, i) => `${i === 0 ? 'M' : 'L'}${x(b.month).toFixed(1)} ${y(b[key] as number).toFixed(1)}`).join(' ');

  // Filled envelope between P3 and P97.
  const envelope =
    bands.map((b, i) => `${i === 0 ? 'M' : 'L'}${x(b.month).toFixed(1)} ${y(b.p97).toFixed(1)}`).join(' ') +
    ' ' +
    [...bands].reverse().map(b => `L${x(b.month).toFixed(1)} ${y(b.p3).toFixed(1)}`).join(' ') + ' Z';

  const childPts = [...points].filter(p => p.value > 0).sort((a, b) => a.ageMonths - b.ageMonths);
  const childLine = childPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.ageMonths).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');

  const yTicks = 4;
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => yLo + (i / yTicks) * (yHi - yLo));
  const xTicks = [0, 12, 24, 36, 48, 60].filter(m => m <= maxMonth);

  const hovered = hover != null ? childPts[hover] : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', maxWidth: '100%', overflow: 'visible' }}>
      <defs>
        <linearGradient id="growthBand" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={T.brandSoft} stopOpacity="0.16" />
          <stop offset="100%" stopColor={T.brandSoft} stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* y gridlines + labels */}
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke={T.line} strokeWidth="1" />
          <text x={padL - 6} y={y(t) + 3} textAnchor="end" fontSize="9" fill={T.ink400} fontFamily={T.mono}>
            {t.toFixed(t < 20 ? 1 : 0)}
          </text>
        </g>
      ))}

      {/* x labels */}
      {xTicks.map(m => (
        <text key={m} x={x(m)} y={H - 8} textAnchor="middle" fontSize="9" fill={T.ink400} fontFamily={T.mono}>
          {m}m
        </text>
      ))}

      {/* percentile envelope + curves */}
      <path d={envelope} fill="url(#growthBand)" />
      {(['p3', 'p15', 'p85', 'p97'] as const).map(k => (
        <path key={k} d={bandPath(k)} fill="none" stroke={T.brandSoft} strokeOpacity={k === 'p3' || k === 'p97' ? 0.55 : 0.32} strokeWidth="1" strokeDasharray="3 3" />
      ))}
      <path d={bandPath('p50')} fill="none" stroke={T.brandSoft} strokeOpacity={0.7} strokeWidth="1.2" />

      {/* band labels at the right edge */}
      {(['p97', 'p50', 'p3'] as const).map(k => {
        const last = bands[bands.length - 1];
        return (
          <text key={k} x={W - padR + 1} y={y(last[k] as number) + 3} fontSize="8" fill={T.ink300} fontFamily={T.mono}>
            {k.toUpperCase()}
          </text>
        );
      })}

      {/* child line + points */}
      {childPts.length > 1 && <path d={childLine} fill="none" stroke={T.brand} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
      {childPts.map((p, i) => (
        <g key={i}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
          style={{ cursor: 'pointer' }}
        >
          <circle cx={x(p.ageMonths)} cy={y(p.value)} r={hover === i ? 5.5 : 3.5} fill={T.brand} stroke="#fff" strokeWidth="1.5" />
          <circle cx={x(p.ageMonths)} cy={y(p.value)} r={11} fill="transparent" />
        </g>
      ))}

      {/* hover tooltip */}
      {hovered && (
        <g pointerEvents="none">
          <rect
            x={Math.min(x(hovered.ageMonths) + 8, W - 96)} y={Math.max(y(hovered.value) - 30, padT)}
            width="90" height="26" rx="6" fill={T.ink900}
          />
          <text
            x={Math.min(x(hovered.ageMonths) + 8, W - 96) + 8} y={Math.max(y(hovered.value) - 30, padT) + 16}
            fontSize="10" fill="#fff" fontFamily={T.sans}
          >
            {hovered.value.toFixed(1)}{unit} · {hovered.pct != null ? `P${Math.round(hovered.pct)}` : '—'}
          </text>
        </g>
      )}
    </svg>
  );
}
