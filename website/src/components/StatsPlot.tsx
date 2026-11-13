import React, { useMemo } from 'react';
import { useWindowSize } from '@uidotdev/usehooks';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts';

import {
  CHART_GREEN,
  CHART_GREEN_DARK,
  CHART_INK,
  CHART_GRID,
  CHART_AXIS,
  CHART_CURSOR,
  CHART_TOOLTIP_STYLE,
  YEAR_COLORS,
} from './Constants';
import type { Paper } from './papers';

// Fixed height (same for every mode, so toggling doesn't make the page jump)
// and the same margins as the other dashboard charts. A golden-ratio aspect
// made this chart ~720px tall on desktop, dwarfing the sections around it.
const BREAKDOWN_HEIGHT = 380;
const BAR_CHART_MARGIN = { top: 8, right: 8, left: -24, bottom: 0 };
const BAR_CHART_X_PADDING = { left: 0, right: 20 };

// Same recessive axis/grid/tooltip styling as the Stats page charts
// (GrowthChart, cumulative growth), so this view and that page read as one.
const GRID_PROPS = { strokeDasharray: '3 3', vertical: false, stroke: CHART_GRID };
const TICK = { fill: CHART_INK, fontSize: 12 };
const Y_AXIS_PROPS = { allowDecimals: false, tickLine: false, axisLine: false, tick: TICK };
// Single-series bars (keyword totals): main green fill, deeper green edge for
// contrast on white. The multi-colour charts (venue stacked by year, per-year
// bars) intentionally keep the YEAR_COLORS palette.
// No maxBarSize here (unlike GrowthChart): breakdown bars fill their band, so
// they stay wide when a search leaves only a few categories.
const SINGLE_BAR_PROPS = {
  fill: CHART_GREEN,
  stroke: CHART_GREEN_DARK,
  radius: [4, 4, 0, 0] as [number, number, number, number],
};

type StatsPlotProps = {
  suggestions?: Paper[];
  mode?: 'year' | 'venue' | 'keyword';
};

export default function StatsPlot({ suggestions = [], mode = 'keyword' }: StatsPlotProps) {
  const { venueRows, years, yearCount, keywordCount } = useMemo(() => {
    const yearCount: Record<string, number> = {};
    const keywordCount: Record<string, number> = {};
    const yearsSet = new Set<string>();
    const venueMap: Record<string, { venue: string } & Record<string, number | string>> = {};

    suggestions.forEach((item) => {
      const venueWithYear = item.VENUE || '';
      if (!venueWithYear) return;
      const keywords = (item.KEYWORD || '')
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

      const venue = venueWithYear.slice(0, -2);
      const year = '20' + venueWithYear.slice(-2);
      yearsSet.add(year);

      // venues, stacked by venue year
      const row = (venueMap[venue] ??= { venue });
      row[year] = ((row[year] as number) || 0) + 1;

      // totals per publication-date year
      const dateYear = item.DATE.slice(0, 4);
      yearCount[dateYear] = (yearCount[dateYear] || 0) + 1;

      // keyword totals
      keywords.forEach((keyword) => {
        keywordCount[keyword] = (keywordCount[keyword] || 0) + 1;
      });
    });

    return {
      venueRows: Object.values(venueMap).sort((a, b) => a.venue.localeCompare(b.venue)),
      years: [...yearsSet].sort((a, b) => Number(a) - Number(b)),
      yearCount: Object.entries(yearCount)
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([year, count]) => ({ year, count })),
      keywordCount: Object.entries(keywordCount)
        .sort((a, b) => b[1] - a[1])
        .map(([keyword, count]) => ({ keyword, count })),
    };
  }, [suggestions]);

  const size = useWindowSize();
  // Show every category label when there is room; on narrow screens let
  // recharts thin them out.
  const xInterval = (size.width ?? 0) >= 789 ? { interval: 0 } : {};

  if (!suggestions.length) {
    return <div></div>;
  }

  if (mode === 'venue') {
    return (
      <ResponsiveContainer width="100%" height={BREAKDOWN_HEIGHT}>
        <BarChart data={venueRows} margin={BAR_CHART_MARGIN}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis
            dataKey="venue"
            {...xInterval}
            angle={-45}
            textAnchor="end"
            height={70}
            padding={BAR_CHART_X_PADDING}
            tickLine={false}
            axisLine={{ stroke: CHART_AXIS }}
            tick={TICK}
          />
          <YAxis {...Y_AXIS_PROPS} />
          <Tooltip cursor={{ fill: CHART_CURSOR }} {...CHART_TOOLTIP_STYLE} />
          {years.map((year, idx) => (
            <Bar
              key={year}
              dataKey={year}
              stackId="a"
              fill={YEAR_COLORS[idx % YEAR_COLORS.length]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (mode === 'keyword') {
    return (
      <ResponsiveContainer width="100%" height={BREAKDOWN_HEIGHT}>
        <BarChart data={keywordCount} margin={BAR_CHART_MARGIN}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis
            dataKey="keyword"
            {...xInterval}
            angle={-45}
            textAnchor="end"
            height={100} // a bit more room for longer keywords
            padding={BAR_CHART_X_PADDING}
            tickLine={false}
            axisLine={{ stroke: CHART_AXIS }}
            tick={TICK}
          />
          <YAxis {...Y_AXIS_PROPS} />
          <Tooltip cursor={{ fill: CHART_CURSOR }} {...CHART_TOOLTIP_STYLE} />
          <Bar dataKey="count" name="Papers" {...SINGLE_BAR_PROPS} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (mode === 'year') {
    return (
      <ResponsiveContainer width="100%" height={BREAKDOWN_HEIGHT}>
        <BarChart data={yearCount} margin={BAR_CHART_MARGIN}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis
            dataKey="year"
            padding={BAR_CHART_X_PADDING}
            tickLine={false}
            axisLine={{ stroke: CHART_AXIS }}
            tick={TICK}
          />
          <YAxis {...Y_AXIS_PROPS} />
          <Tooltip cursor={{ fill: CHART_CURSOR }} {...CHART_TOOLTIP_STYLE} />
          {/* Per-year colours kept; wide bars with the site's rounded tops */}
          <Bar dataKey="count" name="Papers" radius={[4, 4, 0, 0]}>
            {yearCount.map((entry, index) => (
              <Cell key={entry.year} fill={YEAR_COLORS[index % YEAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // fallback
  return null;
}
