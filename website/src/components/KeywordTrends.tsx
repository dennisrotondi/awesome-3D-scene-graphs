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
import { CHART_TOOLTIP_STYLE, rankKeywords, keywordColor } from './Constants';

const INK = '#3b4248';
const TOP_KEYWORDS = 6;
// Years with fewer papers than this are dropped: percentage shares over a
// handful of papers are all noise. Relaxed for small filtered sets, where a
// hard floor of 5 would drop every year and blank the chart.
const MIN_PAPERS_PER_YEAR = 5;

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
          perYear[year].counts[k] = (perYear[year].counts[k] || 0) + 1;
        });
    });

    // Same ranking as "Papers by keyword", so line colours match the bars.
    const topKeywords = rankKeywords(items)
      .slice(0, TOP_KEYWORDS)
      .map(({ keyword }) => keyword);

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

  // A keyword's rank in this view is its index in topKeywords.
  const colorOf = (keyword: string) => keywordColor(topKeywords.indexOf(keyword));

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
            // 3px: the shared palette's pastel steps are faint as thinner lines
            strokeWidth={3}
            dot={{ r: 4, strokeWidth: 0, fill: colorOf(keyword) }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        ))}
        <EndLabels rows={rows} keywords={topKeywords} colorOf={colorOf} />
      </LineChart>
    </ResponsiveContainer>
  );
}
