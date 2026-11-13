import React, { useEffect, useMemo, useState } from 'react';
import { papers } from './papers';
import type { Paper } from './papers';
import { yearColor, formatDate } from './Constants';
import citationsJson from '../citations.json';

// The paper map. Every paper is linked to its K most
// keyword-similar papers (Jaccard) and drawn toward the survey milestone
// papers it resembles; milestones act as pinned cluster anchors. Layout is
// two-level: a force layout of the anchors, then one global simulation with
// each paper tethered to its milestone-weighted base point. Node size scales
// with citation count (scripts/fetch_citations.py).
const K_NEIGHBORS = 2;
const WIDTH = 900;
const HEIGHT = 640;
const MIN_RADIUS = 4;
const MAX_RADIUS = 14;
const HIT_RADIUS = 12; // minimum hover target, regardless of node size
const CLUSTER_GAP = 310; // spread of the pinned milestone anchors
const CLUSTER_SCALE = 80; // initial spread of papers around their anchor
const ANCHOR_PULL = 0.3; // spring strength toward a paper's milestone-weighted base point
const PRIMARY_MIX = 0.55; // how much the base point sticks to the primary milestone
const INK = '#3b4248';

// The milestone papers highlighted in the survey's timeline figure.
const MILESTONES: { id: string; label: string }[] = [
  { id: 'armeni2019scenegraph', label: '3D Scene Graph' },
  { id: 'wald2020learning3d', label: '3DSSG' },
  { id: 'rosinol2021kimera', label: 'Kimera' },
  { id: 'wu2021scenegraphfusion', label: 'SceneGraphFusion' },
  { id: 'hughes2022hydra', label: 'Hydra' },
  { id: 'rana2023sayplan', label: 'SayPlan' },
  { id: 'gu2024conceptgraphs', label: 'ConceptGraphs' },
  { id: 'koch2024open3dsg', label: 'Open3DSG' },
  { id: 'werby2024hierarchical', label: 'HOV-SG' },
  { id: 'maggio2024clio', label: 'Clio' },
  { id: 'jiang2024roboexp', label: 'RoboEXP' },
  { id: 'zhang2025functional3dsg', label: 'OpenFunGraph' },
  { id: 'rotondi2025fungraph', label: 'FunGraph' },
  { id: 'kassab2026lexisg', label: 'LEXI-SG' },
];

// Keyed by bare arXiv id, or lowercased title for papers without an arXiv link
const citations = citationsJson as Record<string, number>;

function citationCount(arxivUrl: string, title: string): number {
  const match = arxivUrl.match(/arxiv\.org\/(?:abs|pdf)\/([0-9]{4}\.[0-9]{4,5})/);
  return (match && citations[match[1]]) ?? citations[title.toLowerCase()] ?? 0;
}

type GraphNode = {
  id: string;
  title: string;
  author: string;
  venue: string;
  dateExact: string;
  year: number;
  citations: number;
  radius: number;
  milestoneLabel?: string;
  x: number;
  y: number;
};

type GraphEdge = { source: number; target: number };
type WeightedEdge = { source: number; target: number; w: number };

// Fruchterman-Reingold-style force layout with linear cooling, weighted
// attraction, and optionally pinned nodes. Positions are modified in place;
// initial positions must be deterministic (no randomness, so the graph looks
// the same on every visit).
function forceLayout(
  xs: number[],
  ys: number[],
  edges: WeightedEdge[],
  iterations: number,
  spread: number,
  pinned?: boolean[],
  tether?: { xs: number[]; ys: number[]; strength: number }
) {
  const n = xs.length;
  if (n <= 1) return;
  const kDist = spread / Math.sqrt(n);
  for (let iter = 0; iter < iterations; iter++) {
    const dx = new Array<number>(n).fill(0);
    const dy = new Array<number>(n).fill(0);

    if (tether) {
      // linear spring toward each node's own base point; unlike a pull toward
      // the anchors themselves, this cannot be overpowered by mass repulsion
      for (let i = 0; i < n; i++) {
        dx[i] += (tether.xs[i] - xs[i]) * tether.strength;
        dy[i] += (tether.ys[i] - ys[i]) * tether.strength;
      }
    }

    // repulsion is local (cut off at a few kDist): distant nodes should not
    // push each other, or the tether/edge forces get overpowered at range
    const cutoff = 4 * kDist;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let ddx = xs[i] - xs[j];
        let ddy = ys[i] - ys[j];
        if (Math.abs(ddx) > cutoff || Math.abs(ddy) > cutoff) continue;
        let dist = Math.sqrt(ddx * ddx + ddy * ddy);
        if (dist > cutoff) continue;
        if (dist < 0.01) {
          ddx = (i - j) * 0.01;
          ddy = 0.01;
          dist = 0.02;
        }
        const rep = (kDist * kDist) / dist;
        dx[i] += (ddx / dist) * rep;
        dy[i] += (ddy / dist) * rep;
        dx[j] -= (ddx / dist) * rep;
        dy[j] -= (ddy / dist) * rep;
      }
    }

    edges.forEach(({ source, target, w }) => {
      const ddx = xs[source] - xs[target];
      const ddy = ys[source] - ys[target];
      const dist = Math.max(0.01, Math.sqrt(ddx * ddx + ddy * ddy));
      const att = ((dist * dist) / kDist) * w;
      dx[source] -= (ddx / dist) * att;
      dy[source] -= (ddy / dist) * att;
      dx[target] += (ddx / dist) * att;
      dy[target] += (ddy / dist) * att;
    });

    const temp = (spread / 10) * (1 - iter / iterations) + 0.5;
    for (let i = 0; i < n; i++) {
      if (pinned?.[i]) continue;
      const disp = Math.max(0.01, Math.sqrt(dx[i] * dx[i] + dy[i] * dy[i]));
      xs[i] += (dx[i] / disp) * Math.min(disp, temp);
      ys[i] += (dy[i] / disp) * Math.min(disp, temp);
    }
  }
}

// Normalize positions so each axis has unit standard deviation around 0
function normalize(xs: number[], ys: number[]) {
  const n = xs.length;
  if (!n) return;
  const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / n;
  const mx = mean(xs);
  const my = mean(ys);
  const std = (a: number[], m: number) =>
    Math.sqrt(a.reduce((s, v) => s + (v - m) * (v - m), 0) / n) + 1e-9;
  const sx = std(xs, mx);
  const sy = std(ys, my);
  for (let i = 0; i < n; i++) {
    xs[i] = (xs[i] - mx) / sx;
    ys[i] = (ys[i] - my) / sy;
  }
}

function goldenSpiral(n: number, step: number): { xs: number[]; ys: number[] } {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < n; i++) {
    xs.push(Math.sqrt(i + 1) * step * Math.cos(i * goldenAngle));
    ys.push(Math.sqrt(i + 1) * step * Math.sin(i * goldenAngle));
  }
  return { xs, ys };
}

function buildGraph(items: Paper[]) {
  const keywordSets = items.map(
    (p) =>
      new Set(
        (p.KEYWORD || '')
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean)
      )
  );

  const jaccard = (a: Set<string>, b: Set<string>) => {
    if (!a.size || !b.size) return 0;
    let shared = 0;
    a.forEach((k) => {
      if (b.has(k)) shared += 1;
    });
    return shared / (a.size + b.size - shared);
  };

  // K nearest neighbors per paper, deduplicated into an undirected edge list
  const edgeSet = new Set<string>();
  const edges: GraphEdge[] = [];
  items.forEach((_, i) => {
    const sims: { j: number; sim: number }[] = [];
    items.forEach((__, j) => {
      if (i === j) return;
      const sim = jaccard(keywordSets[i], keywordSets[j]);
      if (sim > 0) sims.push({ j, sim });
    });
    sims.sort((a, b) => b.sim - a.sim);
    sims.slice(0, K_NEIGHBORS).forEach(({ j }) => {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push({ source: Math.min(i, j), target: Math.max(i, j) });
      }
    });
  });

  // --- Cluster assignment: every paper belongs to its most-similar milestone.
  // Only milestones that survive the active filter can anchor clusters.
  const idToIndex = new Map(items.map((p, i) => [p.ID, i]));
  const anchors = MILESTONES.filter((m) => idToIndex.has(m.id));
  const anchorIndex = anchors.map((m) => idToIndex.get(m.id)!);
  const milestoneLabelByIndex = new Map(anchors.map((m, a) => [anchorIndex[a], m.label]));
  const hasAnchors = anchors.length > 0;

  const clusterOf = items.map((p, i) => {
    if (!hasAnchors) return 0;
    const own = anchorIndex.indexOf(i);
    if (own >= 0) return own; // a milestone anchors its own cluster
    let best = 0;
    let bestSim = -1;
    anchorIndex.forEach((mi, a) => {
      const sim = jaccard(keywordSets[i], keywordSets[mi]);
      if (sim > bestSim) {
        bestSim = sim;
        best = a;
      }
    });
    if (bestSim > 0) return best;
    // No keyword overlap with any milestone: fall back to the closest in time
    const t = new Date(p.DATE).getTime();
    let closest = 0;
    let closestGap = Infinity;
    anchorIndex.forEach((mi, a) => {
      const gap = Math.abs(new Date(items[mi].DATE).getTime() - t);
      if (gap < closestGap) {
        closestGap = gap;
        closest = a;
      }
    });
    return closest;
  });

  // --- Level 1: lay out the milestone anchors. Edge weight combines how
  // similar two milestones are themselves (so e.g. FunGraph and OpenFunGraph
  // sit near each other) with how many kNN edges connect their members.
  const nClusters = anchors.length;
  const metaEdgeCount = new Map<string, number>();
  edges.forEach(({ source, target }) => {
    const a = clusterOf[source];
    const b = clusterOf[target];
    if (a === b) return;
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    metaEdgeCount.set(key, (metaEdgeCount.get(key) || 0) + 1);
  });
  const maxCross = Math.max(1, ...metaEdgeCount.values());
  const metaEdges: WeightedEdge[] = [];
  for (let a = 0; a < nClusters; a++) {
    for (let b = a + 1; b < nClusters; b++) {
      const milestoneSim = jaccard(keywordSets[anchorIndex[a]], keywordSets[anchorIndex[b]]);
      const cross = (metaEdgeCount.get(`${a}-${b}`) || 0) / maxCross;
      const w = 3 * milestoneSim + cross;
      if (w > 0.15) metaEdges.push({ source: a, target: b, w });
    }
  }

  const centers = goldenSpiral(nClusters, 16);
  forceLayout(centers.xs, centers.ys, metaEdges, 250, 90);
  normalize(centers.xs, centers.ys);

  // --- Level 2: one global simulation over all papers. Each paper's base
  // point blends its primary milestone's position with the similarity-weighted
  // centroid of its top-3, so a paper close to two milestones settles between
  // them. A spring tether to the base point keeps clusters together while kNN
  // edges and repulsion arrange the papers locally. Anchors stay pinned.
  const xs = new Array<number>(items.length).fill(0);
  const ys = new Array<number>(items.length).fill(0);
  const baseXs = new Array<number>(items.length).fill(0);
  const baseYs = new Array<number>(items.length).fill(0);
  const pinned = new Array<boolean>(items.length).fill(false);

  anchorIndex.forEach((mi, a) => {
    xs[mi] = baseXs[mi] = centers.xs[a] * CLUSTER_GAP;
    ys[mi] = baseYs[mi] = centers.ys[a] * CLUSTER_GAP;
    pinned[mi] = true;
  });

  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  items.forEach((_, i) => {
    if (pinned[i]) return;
    const sims = anchorIndex
      .map((mi, a) => ({ a, sim: jaccard(keywordSets[i], keywordSets[mi]) }))
      .sort((s1, s2) => s2.sim - s1.sim)
      .slice(0, 3)
      .filter(({ sim }) => sim > 0);

    if (sims.length) {
      const total = sims.reduce((s, { sim }) => s + sim * sim, 0);
      let softX = 0;
      let softY = 0;
      sims.forEach(({ a, sim }) => {
        softX += centers.xs[a] * CLUSTER_GAP * ((sim * sim) / total);
        softY += centers.ys[a] * CLUSTER_GAP * ((sim * sim) / total);
      });
      const primary = sims[0].a;
      baseXs[i] = PRIMARY_MIX * centers.xs[primary] * CLUSTER_GAP + (1 - PRIMARY_MIX) * softX;
      baseYs[i] = PRIMARY_MIX * centers.ys[primary] * CLUSTER_GAP + (1 - PRIMARY_MIX) * softY;
    } else if (hasAnchors) {
      // no keyword overlap with any milestone: base on the date-fallback anchor
      baseXs[i] = centers.xs[clusterOf[i]] * CLUSTER_GAP;
      baseYs[i] = centers.ys[clusterOf[i]] * CLUSTER_GAP;
    }

    // deterministic start slightly off the base point
    xs[i] = baseXs[i] + Math.sqrt(i + 1) * CLUSTER_SCALE * 0.12 * Math.cos(i * goldenAngle);
    ys[i] = baseYs[i] + Math.sqrt(i + 1) * CLUSTER_SCALE * 0.12 * Math.sin(i * goldenAngle);
  });

  const simEdges: WeightedEdge[] = edges.map((e) => ({ ...e, w: 1 }));
  forceLayout(xs, ys, simEdges, 250, 300, pinned, {
    xs: baseXs,
    ys: baseYs,
    strength: ANCHOR_PULL,
  });

  // Area (radius²) proportional to citations, so a 4x-cited paper looks 4x big
  const counts = items.map((p) => citationCount(p.ARXIV || '', p.TITLE));
  const maxCount = Math.max(1, ...counts);
  const radiusFor = (c: number) => MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * Math.sqrt(c / maxCount);
  const radii = counts.map(radiusFor);

  // Collision relaxation: push overlapping nodes apart so none stack up
  for (let iter = 0; iter < 80; iter++) {
    let moved = false;
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const minGap = radii[i] + radii[j] + 3;
        let ddx = xs[i] - xs[j];
        let ddy = ys[i] - ys[j];
        let dist = Math.sqrt(ddx * ddx + ddy * ddy);
        if (dist >= minGap) continue;
        if (dist < 0.01) {
          ddx = (i - j) * 0.01;
          ddy = 0.01;
          dist = 0.02;
        }
        const push = (minGap - dist) / 2;
        xs[i] += (ddx / dist) * push;
        ys[i] += (ddy / dist) * push;
        xs[j] -= (ddx / dist) * push;
        ys[j] -= (ddy / dist) * push;
        moved = true;
      }
    }
    if (!moved) break;
  }

  // Fit the layout into the viewBox with a margin (room for anchor labels)
  const pad = 48;
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const scaleX = (WIDTH - 2 * pad) / Math.max(1, maxX - minX);
  const scaleY = (HEIGHT - 2 * pad) / Math.max(1, maxY - minY);

  const nodes: GraphNode[] = items.map((p, i) => ({
    id: p.ID,
    title: p.TITLE,
    author: p.AUTHOR,
    venue: p.VENUE,
    dateExact: formatDate(p.DATE),
    year: new Date(p.DATE).getFullYear(),
    citations: counts[i],
    radius: radiusFor(counts[i]),
    milestoneLabel: milestoneLabelByIndex.get(i),
    x: pad + (xs[i] - minX) * scaleX,
    y: pad + (ys[i] - minY) * scaleY,
  }));

  const adjacency: Set<number>[] = nodes.map(() => new Set());
  edges.forEach(({ source, target }) => {
    adjacency[source].add(target);
    adjacency[target].add(source);
  });

  return { nodes, edges, adjacency, clusterOf };
}

export default function PaperGraph({ suggestions }: { suggestions?: Paper[] }) {
  const items = suggestions ?? papers;
  const { nodes, edges, adjacency, clusterOf } = useMemo(() => buildGraph(items), [items]);
  const [hovered, setHovered] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // node indices shift when the filtered set changes; drop any stale hover
  useEffect(() => setHovered(null), [items]);

  if (!items.length) return null;

  // Nearest-node hover on the whole svg: per-node hit circles overlap in dense
  // clusters and steal each other's hover, so big nodes became untouchable.
  const onMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scale = WIDTH / rect.width; // uniform: viewBox keeps the aspect ratio
    const mx = (e.clientX - rect.left) * scale;
    const my = (e.clientY - rect.top) * scale;

    let nearest: number | null = null;
    let minDist = Infinity;
    nodes.forEach((node, i) => {
      const dist = Math.hypot(node.x - mx, node.y - my);
      if (dist < minDist) {
        minDist = dist;
        nearest = i;
      }
    });

    if (nearest !== null && minDist <= Math.max(HIT_RADIUS, nodes[nearest].radius + 4)) {
      setHovered(nearest);
      setTooltipPos({ x: e.clientX, y: e.clientY });
    } else {
      setHovered(null);
    }
  };

  return (
    <>
      <svg
        className="paper-graph"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        style={{
          display: 'block',
          userSelect: 'none',
          cursor: hovered !== null ? 'pointer' : 'default',
        }}
        onMouseMove={onMouseMove}
        onMouseLeave={() => setHovered(null)}
        onClick={() => {
          if (hovered !== null) window.open(`/${nodes[hovered].id}`, '_blank');
        }}
      >
        {edges.map(({ source, target }, i) => {
          // hover lights up the paper's own kNN links — its most similar papers
          const active = hovered !== null && (source === hovered || target === hovered);
          const sameCluster = clusterOf[source] === clusterOf[target];
          return (
            <line
              key={i}
              x1={nodes[source].x}
              y1={nodes[source].y}
              x2={nodes[target].x}
              y2={nodes[target].y}
              stroke={active ? INK : sameCluster ? 'rgba(59,66,72,0.18)' : 'rgba(59,66,72,0.05)'}
              strokeWidth={active ? 1.5 : sameCluster ? 1 : 0.8}
            />
          );
        })}
        {nodes.map((node, i) => {
          const dimmed = hovered !== null && i !== hovered && !adjacency[hovered].has(i);
          return (
            <circle
              key={node.id}
              opacity={dimmed ? 0.3 : 1}
              cx={node.x}
              cy={node.y}
              r={hovered === i ? node.radius + 2 : node.radius}
              fill={yearColor(node.year)}
              stroke={node.milestoneLabel ? INK : 'white'}
              strokeWidth={1.5}
            />
          );
        })}
        {/* milestone labels on top, with a white halo so they stay readable */}
        {nodes.map(
          (node) =>
            node.milestoneLabel && (
              <text
                key={`label-${node.id}`}
                x={node.x}
                y={node.y + node.radius + 12}
                textAnchor="middle"
                fontSize={11}
                fontWeight={600}
                fill={INK}
                stroke="white"
                strokeWidth={3}
                paintOrder="stroke"
              >
                {node.milestoneLabel}
              </text>
            )
        )}
      </svg>

      {hovered !== null && tooltipPos && (
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
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
            {nodes[hovered].title}
          </div>
          {nodes[hovered].author && (
            <div style={{ color: '#6b7280', marginBottom: 2 }}>{nodes[hovered].author}</div>
          )}
          <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
            {nodes[hovered].venue && (
              <span style={{ fontWeight: 500 }}>{nodes[hovered].venue}</span>
            )}
            <span style={{ color: '#9ca3af' }}>{nodes[hovered].dateExact}</span>
            <span style={{ color: '#9ca3af' }}>
              {nodes[hovered].citations} citation{nodes[hovered].citations === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
