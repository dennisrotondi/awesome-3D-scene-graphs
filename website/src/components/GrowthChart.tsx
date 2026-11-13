import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { papers } from './papers';
import {
  CHART_GREEN,
  CHART_GREEN_DARK,
  CHART_INK,
  CHART_GRID,
  CHART_AXIS,
  CHART_CURSOR,
  CHART_TOOLTIP_STYLE,
} from './Constants';

export default function GrowthChart() {
  const yearCount = useMemo(() => {
    const counts: Record<string, number> = {};
    papers.forEach((paper) => {
      const year = (paper.DATE || '').slice(0, 4);
      if (!year) return;
      counts[year] = (counts[year] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([year, count]) => ({ year, count }));
  }, []);

  if (!yearCount.length) return null;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={yearCount} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID} />
        <XAxis
          dataKey="year"
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
        <Tooltip cursor={{ fill: CHART_CURSOR }} {...CHART_TOOLTIP_STYLE} />
        <Bar
          dataKey="count"
          name="Papers"
          fill={CHART_GREEN}
          stroke={CHART_GREEN_DARK}
          radius={[4, 4, 0, 0]}
          maxBarSize={38}
          animationDuration={1200}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
