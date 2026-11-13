import type { Paper } from './papers';

// ==============================================================================
// Stats chart palette
// ==============================================================================

// Single-series stats charts that are not bar charts (cumulative growth) use
// the site's main green, the navbar/button colour, instead of the earlier
// brown. Every multi-colour chart (papers per year, by venue, by keyword,
// keyword trends, paper map) uses YEAR_COLORS.
export const CHART_GREEN = '#9CAFAA';
// The main green is a light, greyish tone (2.2:1 on white): fine as a fill, too
// faint for thin lines or as the only edge of a bar. This deeper step of the
// same hue (OKLCH h≈178) clears 3:1, so lines use it and bars use it as outline.
export const CHART_GREEN_DARK = '#6E8A83';
export const CHART_INK = '#3b4248';
export const CHART_GRID = 'rgba(59,66,72,0.15)';
export const CHART_AXIS = 'rgba(59,66,72,0.25)';
export const CHART_CURSOR = 'rgba(156,175,170,0.15)';
// Recharts tooltips shaped like the site's own chart tooltips (paper map,
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

// The shared categorical palette of the stats charts, the timeline and the
// paper map. Three steps were too pale on white: sage (1.4:1) made a
// near-invisible trend line, and grey-blue (1.6:1) and olive sage (1.8:1) were
// faint. They were stepped down, and sage and olive sage re-chosen together so
// they stay apart (darkening sage alone made it merge with olive sage):
// sage 1.7:1, olive sage 2.8:1, grey-blue (shifted toward blue, away from the
// aqua-grey next to it) 1.75:1. The muted palette still separates less than a
// validated categorical one for colour-blind readers; every chart carries
// identity in axis labels, end labels or a legend as well.
export const YEAR_COLORS = [
  '#D6A99D', // warm clay
  '#CDB4DB', // soft lilac
  '#C1C9A5', // sage (was #D6DAC8)
  '#A27E6F', // deeper rose
  '#BFA780', // muted ochre
  '#949E70', // olive sage (was #B7C4A1)
  '#8CA6A6', // muted teal
  '#CCAFA5', // dusty mauve
  '#B4C5DF', // pale blue (was cool grey-blue #C4CFD0)
  '#A4B8B5', // aqua-gray
];

// One colour per calendar year, keyed by the year itself (not by its position
// in a chart), so a year has the same colour in "Papers per year", the venue
// stacks, the timeline and the paper map, and a search never repaints it.
export const yearColor = (year: number) => YEAR_COLORS[year % YEAR_COLORS.length];

// ==============================================================================
// Keyword colours
// ==============================================================================

// Keywords of a set of papers, most frequent first (name breaks ties, so the
// order is deterministic), with how many papers carry each.
export function rankKeywords(items: Paper[]): { keyword: string; count: number }[] {
  const counts: Record<string, number> = {};
  items.forEach((p) =>
    (p.KEYWORD || '')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)
      .forEach((k) => (counts[k] = (counts[k] || 0) + 1))
  );
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([keyword, count]) => ({ keyword, count }));
}

// One colour rule for every keyword chart: a keyword takes the YEAR_COLORS
// entry at its rankKeywords() position, the same pattern as the other stats
// bars. "Papers by keyword" and "Keyword trends" rank the same set of papers,
// so a keyword always has the same colour in both.
// TODO: colours follow the rank in the current view, so the same keyword can
// change colour between Advanced Search queries. A colour per keyword would
// need 25 distinguishable colours, more than a chart can keep apart; accepted
// so that the two keyword charts always match each other.
export const keywordColor = (rank: number) => YEAR_COLORS[rank % YEAR_COLORS.length];

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
