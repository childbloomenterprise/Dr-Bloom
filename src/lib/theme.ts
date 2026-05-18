// Design tokens ported from bloom-tokens.jsx — single emerald light theme.
// Picked the default tweak preset (emerald / editorial / soft / regular / clinical).

export const colors = {
  bg: '#F2F0EA',
  surface: '#FFFFFF',
  surfaceDim: '#F7F5EF',
  surfaceWarm: '#F5EFE3',
  ink900: '#0B1714',
  ink700: '#1F2A26',
  ink500: '#4B5651',
  ink400: '#6B7570',
  ink300: '#8E9690',
  ink200: '#C8CCC6',
  ink100: '#E5E7E1',
  line: 'rgba(11,23,20,0.08)',
  brand: '#0F3D2E',
  brandDeep: '#0A2920',
  brandSoft: '#5FB48A',
  brandWash: '#D9EBE1',
  brandTint: '#EDF4EF',
  accent: '#D17A4F',
  accentSoft: '#F0C9BB',
  gold: '#C9A35A',
  cream: '#F5EFE3',
  success: '#1E7A55',
  warn: '#C9A35A',
  danger: '#B0492C',
};

export const type = {
  serif: '"Fraunces", "Cormorant Garamond", Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
  serifFeats: '"opsz" 144, "SOFT" 50, "WONK" 0',
  serifTracking: '-0.02em',
  sansTracking: '-0.011em',
};

export const radius = { xs: 6, sm: 10, md: 16, lg: 22, xl: 28, pill: 999 };

export const density = { pad: 16, gap: 14, rowH: 56, cardP: 18, sectionGap: 24 };

export const shadow = {
  sm: '0 1px 2px rgba(11,23,20,.04), 0 1px 1px rgba(11,23,20,.03)',
  md: '0 2px 4px rgba(11,23,20,.03), 0 12px 28px rgba(11,23,20,.06)',
  lg: '0 6px 14px rgba(11,23,20,.05), 0 28px 64px rgba(11,23,20,.08)',
  ring: '0 0 0 1px rgba(11,23,20,.04)',
};

export const theme = { ...colors, ...type, radius, density, shadow, dark: false };
export type Theme = typeof theme;
