// ==============================================================================
// Stats chart palette
// ==============================================================================

// Single-colour statistics charts (Stats page, Advanced Search statistics view)
// use the site's main green, the navbar/button colour, so they read as one
// system with the rest of the site instead of the earlier brown. Multi-colour
// charts (per-year stacks, keyword trends, Connected Papers) keep YEAR_COLORS.
export const CHART_GREEN = '#9CAFAA';
// The main green is a light, greyish tone (2.2:1 on white): fine as a fill, too
// faint for thin lines or as the only edge of a bar. This deeper step of the
// same hue (OKLCH h≈178) clears 3:1, so lines use it and bars use it as outline.
export const CHART_GREEN_DARK = '#6E8A83';
export const CHART_INK = '#3b4248';
export const CHART_GRID = 'rgba(59,66,72,0.15)';
export const CHART_AXIS = 'rgba(59,66,72,0.25)';
export const CHART_CURSOR = 'rgba(156,175,170,0.15)';
// Recharts tooltips shaped like the site's own chart tooltips (Connected Papers,
// Timeline: `.chart-tooltip`), instead of recharts' square grey-bordered box.
export const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    fontFamily: "'Ubuntu Sans', sans-serif",
    fontSize: 13,
    color: CHART_INK,
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    boxShadow: '0 8px 20px rgba(15,23,42,0.12)',
    padding: '10px 12px',
  },
  labelStyle: { fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: CHART_INK, padding: 0 },
};

// Color palette for timeline scatter plot
export const YEAR_COLORS = [
  '#D6A99D', // warm clay
  '#CDB4DB', // soft lilac
  '#D6DAC8', // sage
  '#A27E6F', // deeper rose
  '#BFA780', // muted ochre
  '#B7C4A1', // olive sage
  '#8CA6A6', // muted teal
  '#CCAFA5', // dusty mauve
  '#C4CFD0', // cool gray-blue
  '#A4B8B5', // aqua-gray
];

// Time constants
export const ONE_DAY_MS = 1000 * 60 * 60 * 24;
export const FIVE_YEARS_DAYS = 365 * 5;
export const THREE_YEARS_DAYS = 365 * 3;

// Zoom behaviour
export const ZOOM_WHEEL_FACTOR = 0.15;

// Chart aspect ratio (golden ratio) — used by ResponsiveContainer in Timeline
export const CHART_ASPECT_RATIO = 1.618;

// Duration for clipboard toast notifications (ms)
export const TOAST_DURATION_MS = 1500;

// Consistent date display: "19 November 2025"
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
