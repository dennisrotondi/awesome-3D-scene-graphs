import React, {
  forwardRef,
  useMemo,
  useState,
  useEffect,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import type { Paper } from './papers';
import {
  ResponsiveContainer,
  ScatterChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceArea,
  Scatter,
  Cell,
  DefaultZIndexes,
  ZIndexLayer,
  useXAxisScale,
  useYAxisScale,
  type ScaleFunction,
} from 'recharts';
import {
  YEAR_COLORS,
  ONE_DAY_MS,
  FIVE_YEARS_DAYS,
  THREE_YEARS_DAYS,
  ZOOM_WHEEL_FACTOR,
  CHART_ASPECT_RATIO,
  CHART_INK,
  formatDate,
} from './Constants';

type TimelineDataPoint = {
  id: number;
  paperId: string;
  x: number;
  year: number;
  title: string;
  author: string;
  venue: string;
  dateExact: string;
  y?: number;
};

export type TimelineHandle = {
  resetZoom: () => void;
  getSpanLabel: () => string;
  zoomToRange: (from: number | null, to: number | null) => void;
};

type TimelineDotProps = {
  cx?: number;
  cy?: number;
  fill?: string;
  currentRangeDays: number;
  dotCursor?: string;
};

type HoveredPoint = {
  paperId: string;
  x: number;
  y: number;
  fill: string;
  title: string;
  author: string;
  venue: string;
  dateExact: string;
};

type TimelinePlotProps = {
  suggestions?: Paper[];
  onSpanChange?: (label: string) => void;
};

const AXIS_PADDING = 15;
const CHART_MARGIN_LEFT = 40;
const CHART_MARGIN_RIGHT = 20;

const getColorForYear = (year: number) => YEAR_COLORS[year % YEAR_COLORS.length];

// Smaller dots when zoomed out, where many papers share little space.
const dotRadius = (rangeDays: number) => (rangeDays > FIVE_YEARS_DAYS ? 6 : 8);

const TimelineDot = React.memo(function TimelineDot({
  cx,
  cy,
  fill,
  currentRangeDays,
  dotCursor = 'pointer',
}: TimelineDotProps) {
  if (cx == null || cy == null) return null;
  const r = dotRadius(currentRangeDays);

  return (
    <g style={{ cursor: dotCursor }}>
      <circle cx={cx} cy={cy} r={r + 3} fill={fill} fillOpacity={0.2} />
      <circle cx={cx} cy={cy} r={r} fill={fill} stroke="white" strokeWidth={1} />
    </g>
  );
});

// ==============================================================================
// Papers published on the same day
// ==============================================================================

// A paper's height is its rank among all papers, so neighbours sit 1/N of the
// chart apart (~2px for 257 papers), and papers published on the same day share
// an x position. Zooming only the date axis therefore left same-day papers
// stacked on top of each other at every zoom level, and the date-only hover
// always picked the first of them. Three pieces fix that:
//   1. the hidden y-axis is fitted to the ranks currently in view, so zooming
//      in also spreads the visible papers over the full chart height and a
//      same-day group opens up into a vertical column;
//   2. hover picks the nearest dot in both directions, from the chart's live
//      scales, so every paper of a stack can be reached;
//   3. the hovered paper gets a ring drawn above all dots, so it is clear which
//      paper a click will open.
const HOVER_RADIUS = 20; // px from a dot's centre that still counts as hovering it

type ChartScales = { x: ScaleFunction; y: ScaleFunction };

// The mouse handlers live on the wrapper div, outside the chart, where
// recharts' hooks are not available; this child hands them the live scales.
function ScaleProbe({ scalesRef }: { scalesRef: React.MutableRefObject<ChartScales | null> }) {
  const x = useXAxisScale();
  const y = useYAxisScale();
  useEffect(() => {
    scalesRef.current = x && y ? { x, y } : null;
  });
  return null;
}

// Redraws the hovered dot with a ring, one layer above the scatter dots.
function HoverRing({ point, r }: { point: HoveredPoint | null; r: number }) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  if (!point || !xScale || !yScale) return null;
  const cx = xScale(point.x);
  const cy = yScale(point.y);
  if (cx == null || cy == null) return null;
  return (
    <ZIndexLayer zIndex={DefaultZIndexes.scatter + 1}>
      <g pointerEvents="none">
        <circle cx={cx} cy={cy} r={r} fill={point.fill} stroke="white" strokeWidth={1} />
        <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke={CHART_INK} strokeWidth={2} />
      </g>
    </ZIndexLayer>
  );
}

// Throttle helper for smoother wheel zooming
const throttle = <T extends unknown[]>(fn: (...args: T) => void, delay: number) => {
  let lastCall = 0;
  return function (this: unknown, ...args: T) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn.apply(this, args);
    }
  };
};

const TimelinePlot = forwardRef<TimelineHandle, TimelinePlotProps>(function TimelinePlot(
  { suggestions = [], onSpanChange },
  ref
) {
  const { baseData, minX, maxX } = useMemo(() => {
    const items = suggestions.reduce<TimelineDataPoint[]>((acc, item, idx) => {
      const d = new Date(item.DATE);
      acc.push({
        id: idx,
        paperId: item.ID,
        x: d.getTime(),
        year: d.getFullYear(),
        title: item.TITLE,
        author: item.AUTHOR,
        venue: item.VENUE,
        dateExact: formatDate(item.DATE),
      });
      return acc;
    }, []);

    items.sort((a, b) => a.x - b.x);
    if (!items.length) return { baseData: [], minX: null, maxX: null };

    const yearMap = new Map<number, TimelineDataPoint[]>();
    items.forEach((item) => {
      if (!yearMap.has(item.year)) yearMap.set(item.year, []);
      yearMap.get(item.year)!.push(item);
    });

    const totalCount = items.length;
    const years = [...yearMap.keys()].sort((a, b) => a - b);
    const bands = new Map<number, { start: number; end: number }>();
    let cumulative = 0;

    years.forEach((year) => {
      const count = yearMap.get(year)!.length;
      const height = count / totalCount;
      bands.set(year, { start: cumulative, end: cumulative + height });
      cumulative += height;
    });

    years.forEach((year) => {
      const band = bands.get(year)!;
      const entries = yearMap.get(year)!;
      const n = entries.length;

      entries.forEach((item, i) => {
        const pos = (i + 0.5) / n;
        item.y = band.start + pos * (band.end - band.start);
      });
    });

    return {
      baseData: items,
      minX: items[0].x,
      maxX: items[items.length - 1].x,
    };
  }, [suggestions]);

  const [xDomainLeft, setXDomainLeft] = useState(minX);
  const [xDomainRight, setXDomainRight] = useState(maxX);
  const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<number | null>(null);
  const mouseDownXRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const clickedPaperRef = useRef<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<HoveredPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setXDomainLeft(minX);
    setXDomainRight(maxX);
    setRefAreaLeft(null);
    setRefAreaRight(null);
  }, [minX, maxX, baseData]);

  const currentLeft = xDomainLeft ?? minX ?? 0;
  const currentRight = xDomainRight ?? maxX ?? 0;
  const rangeDays = (currentRight - currentLeft) / ONE_DAY_MS;

  const visibleData = useMemo(
    () => baseData.filter((d) => d.x >= currentLeft && d.x <= currentRight),
    [baseData, currentLeft, currentRight]
  );

  // 1. Fit the hidden y-axis to the ranks in view, with one rank of headroom on
  //    each side. At full zoom this is the old [0, 1] domain.
  const rankStep = baseData.length ? 1 / baseData.length : 1;
  const yDomain: [number, number] = visibleData.length
    ? [(visibleData[0].y ?? 0) - rankStep, (visibleData[visibleData.length - 1].y ?? 1) + rankStep]
    : [0, 1];

  const scalesRef = useRef<ChartScales | null>(null);

  const monthTicks =
    rangeDays <= THREE_YEARS_DAYS && rangeDays > 90
      ? (() => {
          const seen = new Set<string>();
          const ticks: number[] = [];

          visibleData.forEach((p) => {
            const d = new Date(p.x);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            if (!seen.has(key)) {
              seen.add(key);
              ticks.push(p.x);
            }
          });

          return ticks.length ? ticks : null;
        })()
      : null;

  const yearTicks =
    rangeDays > THREE_YEARS_DAYS
      ? (() => {
          const seenYears = new Set<number>();
          const ticks: number[] = [];
          visibleData.forEach((p) => {
            if (!seenYears.has(p.year)) {
              seenYears.add(p.year);
              ticks.push(p.x);
            }
          });
          return ticks.length ? ticks : null;
        })()
      : null;

  const tickMode = rangeDays > THREE_YEARS_DAYS ? 'year' : rangeDays > 90 ? 'month' : 'day';
  const finalTicks = yearTicks || monthTicks || undefined;

  const getXValue = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (minX == null || maxX == null) return null;

      const rect = e.currentTarget.getBoundingClientRect();
      const plotWidth = rect.width - (CHART_MARGIN_LEFT + CHART_MARGIN_RIGHT) - AXIS_PADDING * 2;
      const mouseXRelativeToPlot = e.clientX - rect.left - CHART_MARGIN_LEFT - AXIS_PADDING;

      let ratio = mouseXRelativeToPlot / plotWidth;
      if (ratio < 0) ratio = 0;
      if (ratio > 1) ratio = 1;

      const domainStart = xDomainLeft ?? minX;
      const domainEnd = xDomainRight ?? maxX;
      const domainRange = domainEnd - domainStart;

      return domainStart + domainRange * ratio;
    },
    [minX, maxX, xDomainLeft, xDomainRight]
  );

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    mouseDownXRef.current = e.clientX;
    isDraggingRef.current = false;
    clickedPaperRef.current = hoveredPoint?.paperId ?? null;
    const xValue = getXValue(e);
    if (xValue !== null) {
      setRefAreaLeft(xValue);
      setRefAreaRight(xValue);
    }
  };

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (refAreaLeft != null) {
      if (mouseDownXRef.current !== null && Math.abs(e.clientX - mouseDownXRef.current) > 5) {
        isDraggingRef.current = true;
      }
      const xValue = getXValue(e);
      if (xValue !== null) setRefAreaRight(xValue);
      return;
    }

    // 2. Nearest dot in both directions, measured in the chart's own pixels.
    const scales = scalesRef.current;
    const surface = e.currentTarget.querySelector('svg.recharts-surface');
    if (!scales || !surface || visibleData.length === 0) return;
    const rect = surface.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    let nearest: TimelineDataPoint | null = null;
    let minDist = Infinity;
    for (const point of visibleData) {
      const px = scales.x(point.x);
      const py = scales.y(point.y);
      if (px == null || py == null) continue;
      const dist = Math.hypot(mouseX - px, mouseY - py);
      if (dist < minDist) {
        minDist = dist;
        nearest = point;
      }
    }

    if (nearest && minDist <= HOVER_RADIUS) {
      setHoveredPoint({
        paperId: nearest.paperId,
        x: nearest.x,
        y: nearest.y ?? 0,
        fill: getColorForYear(nearest.year),
        title: nearest.title,
        author: nearest.author,
        venue: nearest.venue,
        dateExact: nearest.dateExact,
      });
      setTooltipPos({ x: e.clientX, y: e.clientY });
    } else {
      setHoveredPoint(null);
    }
  };

  const onMouseLeave = () => setHoveredPoint(null);

  const zoom = useCallback(() => {
    if (refAreaLeft == null || refAreaRight == null || refAreaLeft === refAreaRight) {
      setRefAreaLeft(null);
      setRefAreaRight(null);
      return;
    }

    const left = Math.min(refAreaLeft, refAreaRight);
    const right = Math.max(refAreaLeft, refAreaRight);

    setXDomainLeft(left);
    setXDomainRight(right);
    setRefAreaLeft(null);
    setRefAreaRight(null);
  }, [refAreaLeft, refAreaRight]);

  const onMouseUp = () => {
    if (!isDraggingRef.current && clickedPaperRef.current) {
      window.open(`/${clickedPaperRef.current}`, '_blank');
    }
    clickedPaperRef.current = null;
    zoom();
  };

  const zoomOut = useCallback(() => {
    setXDomainLeft(minX);
    setXDomainRight(maxX);
    setRefAreaLeft(null);
    setRefAreaRight(null);
  }, [minX, maxX]);

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (minX == null || maxX == null) return;

      const fullRange = maxX - minX;
      const domainStart = xDomainLeft ?? minX;
      const domainEnd = xDomainRight ?? maxX;
      const domainRange = domainEnd - domainStart;

      const rect = e.currentTarget.getBoundingClientRect();
      const plotWidth = rect.width - (CHART_MARGIN_LEFT + CHART_MARGIN_RIGHT) - AXIS_PADDING * 2;
      const mouseXRelativePlot = e.clientX - rect.left - CHART_MARGIN_LEFT - AXIS_PADDING;
      const mouseRatio = Math.max(0, Math.min(1, mouseXRelativePlot / plotWidth));
      const anchorX = domainStart + domainRange * mouseRatio;

      let newRange =
        e.deltaY > 0
          ? domainRange * (1 + ZOOM_WHEEL_FACTOR)
          : domainRange * (1 - ZOOM_WHEEL_FACTOR);

      newRange = Math.max(fullRange / 365, Math.min(newRange, fullRange));

      let newStart = anchorX - newRange * mouseRatio;
      let newEnd = anchorX + newRange * (1 - mouseRatio);

      if (newStart < minX) {
        newStart = minX;
        newEnd = minX + newRange;
      }
      if (newEnd > maxX) {
        newEnd = maxX;
        newStart = maxX - newRange;
      }

      setXDomainLeft(newStart);
      setXDomainRight(newEnd);
    },
    [minX, maxX, xDomainLeft, xDomainRight]
  );

  const throttledWheel = useMemo(() => throttle(handleWheel, 50), [handleWheel]);

  const formatTimeTick = (value: number) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');

    if (rangeDays > THREE_YEARS_DAYS) return `${y}`;
    if (rangeDays > 90) return `${y}-${m}`;
    return `${y}-${m}-${day}`;
  };

  const spanLabel =
    rangeDays > 730
      ? `${Math.round(rangeDays / 365)} Years`
      : rangeDays > 30
        ? `${Math.round(rangeDays / 30)} Months`
        : `${Math.round(rangeDays)} Days`;

  useEffect(() => {
    onSpanChange?.(spanLabel);
  }, [spanLabel, onSpanChange]);

  useImperativeHandle(ref, () => ({
    resetZoom: zoomOut,
    getSpanLabel: () => spanLabel,
    zoomToRange: (from, to) => {
      if (from == null || to == null) return;
      setXDomainLeft(Math.min(from, to));
      setXDomainRight(Math.max(from, to));
    },
  }));

  const cursor = refAreaLeft == null ? 'crosshair' : 'grabbing';
  const dotCursor = refAreaLeft == null ? 'pointer' : 'grabbing';

  if (!baseData.length) {
    return <div></div>;
  }

  return (
    <>
      <div
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onWheelCapture={throttledWheel}
        style={{ width: '100%', padding: 0, cursor: cursor, userSelect: 'none' }}
      >
        <ResponsiveContainer width="100%" aspect={CHART_ASPECT_RATIO}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 50, left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis
              key={tickMode}
              type="number"
              dataKey="x"
              scale="time"
              domain={[xDomainLeft ?? 'dataMin', xDomainRight ?? 'dataMax']}
              tickFormatter={formatTimeTick}
              ticks={finalTicks}
              allowDataOverflow={true}
              padding={{ left: AXIS_PADDING, right: AXIS_PADDING }}
              angle={-45}
              textAnchor="end"
            />

            <YAxis type="number" dataKey="y" domain={yDomain} allowDataOverflow hide />

            {refAreaLeft != null && refAreaRight != null && (
              <ReferenceArea
                x1={refAreaLeft}
                x2={refAreaRight}
                y1={yDomain[0]}
                y2={yDomain[1]}
                fill="#a5b4fc"
                fillOpacity={0.25}
                stroke="#6366f1"
                strokeOpacity={0.8}
                // recharts 3 dropped `isFront`: draw the selection above the dots
                zIndex={DefaultZIndexes.scatter + 1}
              />
            )}

            <Scatter
              data={visibleData}
              isAnimationActive={false}
              shape={(p) => (
                <TimelineDot {...p} currentRangeDays={rangeDays} dotCursor={dotCursor} />
              )}
            >
              {visibleData.map((p) => (
                <Cell key={p.id} fill={getColorForYear(p.year)} />
              ))}
            </Scatter>

            {/* 3. ring on the hovered paper, above every dot */}
            <HoverRing point={hoveredPoint} r={dotRadius(rangeDays)} />
            <ScaleProbe scalesRef={scalesRef} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {hoveredPoint && tooltipPos && (
        <div
          className="chart-tooltip"
          style={{
            position: 'fixed',
            left: tooltipPos.x + 14,
            top: tooltipPos.y - 10,
            background: 'white',
            border: '1px solid #e5e7eb',
            boxShadow: '0 8px 20px rgba(15,23,42,0.12)',
            padding: '10px 12px',
            maxWidth: 340,
            pointerEvents: 'none',
            borderRadius: 8,
            zIndex: 1000,
            fontSize: 13,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{hoveredPoint.title}</div>
          {hoveredPoint.author && (
            <div style={{ color: '#6b7280', marginBottom: 2 }}>{hoveredPoint.author}</div>
          )}
          <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
            {hoveredPoint.venue && <span style={{ fontWeight: 500 }}>{hoveredPoint.venue}</span>}
            <span style={{ color: '#9ca3af' }}>{hoveredPoint.dateExact}</span>
          </div>
        </div>
      )}
    </>
  );
});

export default TimelinePlot;
