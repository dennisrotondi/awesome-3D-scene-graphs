import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  usePlotArea,
  useXAxisScale,
  useYAxisScale,
} from 'recharts';
import { papers } from './papers';
import type { Paper } from './papers';
import { CHART_TOOLTIP_STYLE } from './Constants';

const INK = '#3b4248';
const TOP_KEYWORDS = 6;
// Years with fewer papers than this are dropped: percentage shares over a
// handful of papers are all noise. Relaxed for small filtered sets, where a
// hard floor of 5 would drop every year and blank the chart.
const MIN_PAPERS_PER_YEAR = 5;

// ==============================================================================
// Line colours
// ==============================================================================

// Six categorical line colours in the site's own hues (navbar green, logo
// clay, slate ink, logo mustard, lilac, olive sage), taken a few steps deeper
// so thin 2px lines stay readable on white. Warm and cool slots alternate, so
// neighbours in this order always differ in hue family. Validated with the
// dataviz palette checks for line charts: lightness band, chroma floor, and
// neighbour separation (normal vision ΔE ≥ 19.9, colour-blind ΔE ≥ 8.6).
// The lilac and olive steps are under 3:1 on white, which is acceptable only
// because every line also carries a direct end label and a legend entry.
const TREND_COLORS = [
  '#309778', // green (navbar #9CAFAA)
  '#AB5D35', // clay (logo #D6A99D)
  '#3361A5', // slate (ink #3B4248)
  '#A18E28', // mustard (logo #EBD08D)
  '#B785C1', // lilac (#CDB4DB)
  '#95C077', // olive sage (#C2CE97)
];

// Keywords ranked by how many papers carry them (name breaks ties, so the
// order is deterministic).
function rankKeywords(totals: Record<string, number>): string[] {
  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([keyword]) => keyword);
}

// Colours follow the keyword, not its rank in the current view: the six most
// common keywords across *all* papers own a colour each, so a search never
// repaints them. A keyword that only makes the top six of a filtered view takes
// the first colour not owned by a keyword already in that view.
// TODO: such view-only keywords can still change colour between searches; a
// fully stable mapping would need a colour per keyword (25), which is more than
// a line chart can keep apart.
const GLOBAL_KEYWORD_RANK = rankKeywords(
  papers.reduce<Record<string, number>>((totals, p) => {
    (p.KEYWORD || '')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)
      .forEach((k) => (totals[k] = (totals[k] || 0) + 1));
    return totals;
  }, {})
);

function assignTrendColors(keywords: string[]): Map<string, string> {
  const colors = new Map<string, string>();
  const owned = new Set<number>();
  keywords.forEach((keyword) => {
    const slot = GLOBAL_KEYWORD_RANK.indexOf(keyword);
    if (slot >= 0 && slot < TREND_COLORS.length) {
      colors.set(keyword, TREND_COLORS[slot]);
      owned.add(slot);
    }
  });
  const free = TREND_COLORS.map((_, slot) => slot).filter((slot) => !owned.has(slot));
  keywords.forEach((keyword) => {
    if (!colors.has(keyword)) colors.set(keyword, TREND_COLORS[free.shift() ?? 0]);
  });
  return colors;
}

type YearRow = { year: string } & Record<string, number | string>;

// ==============================================================================
// End-of-line labels
// ==============================================================================

// Each line gets a direct label at its last point, so it is identifiable
// without the legend (the palette alone is not CVD-safe). Keywords often end on
// the same share: always so for small filtered sets (e.g. an author search),
// where shares are coarse fractions like 1/3 or 2/3. Labelling each line on its
// own then prints the names on top of each other, so the labels are laid out
// together instead:
//   1. place each label at its line's last point,
//   2. walk them top to bottom, pushing each one at least END_LABEL_GAP px
//      below the previous one,
//   3. if that pushed the stack past the bottom of the plot, walk bottom to
//      top pulling them back up (never above the top of the plot).
// A label that had to move gets a short leader in its line's colour, so it
// still points at the right line end.
const END_LABEL_GAP = 14; // px between label baselines (12px text + 2px air)
const END_LABEL_DX = 8; // px from the last point to the label text

function EndLabels({
  rows,
  keywords,
  colorOf,
}: {
  rows: YearRow[];
  keywords: string[];
  colorOf: (keyword: string) => string;
}) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  const plot = usePlotArea();
  if (!xScale || !yScale || !plot || !rows.length) return null;

  const last = rows[rows.length - 1];
  const x = xScale(last.year);
  if (x == null) return null;

  // 1. desired positions, sorted top to bottom (keyword name breaks ties so
  //    the order is stable across renders)
  const labels = keywords
    .map((keyword) => {
      const pointY = yScale(last[keyword]) ?? plot.y + plot.height;
      return { keyword, pointY, y: pointY };
    })
    .sort((a, b) => a.pointY - b.pointY || a.keyword.localeCompare(b.keyword));

  // 2. push down so no two labels overlap
  for (let i = 1; i < labels.length; i++) {
    labels[i].y = Math.max(labels[i].y, labels[i - 1].y + END_LABEL_GAP);
  }
  // 3. pull back up if the stack overflows the plot bottom
  const bottom = plot.y + plot.height;
  for (let i = labels.length - 1; i >= 0; i--) {
    const limit = i === labels.length - 1 ? bottom : labels[i + 1].y - END_LABEL_GAP;
    labels[i].y = Math.max(Math.min(labels[i].y, limit), plot.y);
  }

  return (
    <g className="trend-end-labels">
      {labels.map(({ keyword, pointY, y }) => (
        <g key={keyword}>
          {Math.abs(y - pointY) > 1 && (
            <line
              x1={x + 3}
              y1={pointY}
              x2={x + END_LABEL_DX - 2}
              y2={y}
              stroke={colorOf(keyword)}
              strokeWidth={1}
            />
          )}
          <text x={x + END_LABEL_DX} y={y + 4} fill={INK} fontSize={12}>
            {keyword}
          </text>
        </g>
      ))}
    </g>
  );
}

export default function KeywordTrends({ suggestions }: { suggestions?: Paper[] }) {
  const items = suggestions ?? papers;

  const { rows, topKeywords } = useMemo(() => {
    const keywordTotal: Record<string, number> = {};
    const perYear: Record<string, { total: number; counts: Record<string, number> }> = {};

    items.forEach((p) => {
      const year = (p.DATE || '').slice(0, 4);
      if (!year) return;
      if (!perYear[year]) perYear[year] = { total: 0, counts: {} };
      perYear[year].total += 1;

      (p.KEYWORD || '')
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean)
        .forEach((k) => {
          keywordTotal[k] = (keywordTotal[k] || 0) + 1;
          perYear[year].counts[k] = (perYear[year].counts[k] || 0) + 1;
        });
    });

    const topKeywords = rankKeywords(keywordTotal).slice(0, TOP_KEYWORDS);

    const minPerYear = Math.min(MIN_PAPERS_PER_YEAR, Math.max(1, Math.round(items.length / 20)));
    const rows: YearRow[] = Object.entries(perYear)
      .filter(([, { total }]) => total >= minPerYear)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([year, { total, counts }]) => {
        const row: YearRow = { year };
        topKeywords.forEach((k) => {
          row[k] = Math.round((100 * (counts[k] || 0)) / total);
        });
        return row;
      });

    return { rows, topKeywords };
  }, [items]);

  if (!rows.length) {
    return (
      <div className="text-font-small py-5 text-center" style={{ color: '#6b7280' }}>
        Not enough papers match the current filters to show keyword trends.
      </div>
    );
  }

  const trendColors = assignTrendColors(topKeywords);
  const colorOf = (keyword: string) => trendColors.get(keyword) ?? INK;

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={rows} margin={{ top: 8, right: 110, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(59,66,72,0.15)" />
        <XAxis
          dataKey="year"
          tickLine={false}
          axisLine={{ stroke: 'rgba(59,66,72,0.25)' }}
          tick={{ fill: INK, fontSize: 12 }}
        />
        <YAxis unit="%" tickLine={false} axisLine={false} tick={{ fill: INK, fontSize: 12 }} />
        <Tooltip formatter={(value: number) => `${value}%`} {...CHART_TOOLTIP_STYLE} />
        <Legend
          wrapperStyle={{ fontSize: 13 }}
          formatter={(value) => <span style={{ color: INK }}>{value}</span>}
        />
        {topKeywords.map((keyword) => (
          <Line
            key={keyword}
            dataKey={keyword}
            stroke={colorOf(keyword)}
            strokeWidth={2}
            dot={{ r: 3, strokeWidth: 0, fill: colorOf(keyword) }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        ))}
        <EndLabels rows={rows} keywords={topKeywords} colorOf={colorOf} />
      </LineChart>
    </ResponsiveContainer>
  );
}
