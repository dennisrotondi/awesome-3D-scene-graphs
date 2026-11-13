import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { papers } from './papers';
import type { Paper } from './papers';
import {
  formatDate,
  CHART_GREEN,
  CHART_GREEN_DARK,
  CHART_INK,
  CHART_GRID,
  CHART_AXIS,
  CHART_TOOLTIP_STYLE,
} from './Constants';

// Running total of papers over time. Shared by the Stats page (every paper) and
// the Advanced Search "Statistics" tab (the current search results), like the
// other stats components: pass `suggestions` to chart a subset.
export default function CumulativeChart({ suggestions }: { suggestions?: Paper[] }) {
  const items = suggestions ?? papers;

  const { cumulative, yearTicks } = useMemo(() => {
    // Sort explicitly: the full list loads oldest-first, but search results
    // may be sorted by title or newest first.
    const dates = items.map((p) => new Date(p.DATE).getTime()).sort((a, b) => a - b);
    const cumulative = dates.map((x, i) => ({ x, count: i + 1 }));

    // One tick per year (Jan 1), else the time axis emits a tick per data point
    const yearTicks: number[] = [];
    if (cumulative.length) {
      const firstYear = new Date(cumulative[0].x).getFullYear();
      const lastYear = new Date(cumulative[cumulative.length - 1].x).getFullYear();
      for (let y = firstYear; y <= lastYear; y++) {
        yearTicks.push(new Date(y, 0, 1).getTime());
      }
    }

    return { cumulative, yearTicks };
  }, [items]);

  if (!cumulative.length) return null;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={cumulative} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID} />
        <XAxis
          dataKey="x"
          type="number"
          scale="time"
          domain={['dataMin', 'dataMax']}
          ticks={yearTicks}
          tickFormatter={(v) => String(new Date(v).getFullYear())}
          tickLine={false}
          axisLine={{ stroke: CHART_AXIS }}
          tick={{ fill: CHART_INK, fontSize: 12 }}
        />
        <YAxis
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          tick={{ fill: CHART_INK, fontSize: 12 }}
        />
        <Tooltip
          labelFormatter={(v) => formatDate(new Date(v as number).toISOString())}
          {...CHART_TOOLTIP_STYLE}
        />
        <Area
          dataKey="count"
          name="Papers"
          type="stepAfter"
          stroke={CHART_GREEN_DARK}
          strokeWidth={2}
          fill={CHART_GREEN}
          fillOpacity={0.35}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
