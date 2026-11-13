import React from 'react';
import { Container } from 'react-bootstrap';

import { papers } from '../components/papers';
import CumulativeChart from '../components/CumulativeChart';
import StatsPlot from '../components/StatsPlot';
import StatTiles from '../components/StatTiles';
import KeywordTrends from '../components/KeywordTrends';
import PaperGraph from '../components/PaperGraph';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="growth-title mt-5 mb-3">{children}</h2>;
}

// Every chart in one scrolling column, no selectors. Each section is the same
// component the Advanced Search "Statistics" tab shows behind its selector,
// here fed with every paper instead of the search results.
export default function Stats() {
  return (
    <Container className="mt-3 text-font-base">
      <h1 className="stats-page-title text-center mb-4">Statistics</h1>

      <StatTiles />

      <SectionTitle>Papers per year</SectionTitle>
      <StatsPlot suggestions={papers} mode="year" />

      <SectionTitle>Cumulative growth</SectionTitle>
      <CumulativeChart />

      <SectionTitle>Papers by venue</SectionTitle>
      <StatsPlot suggestions={papers} mode="venue" />

      {/* Keyword totals right above their share over time */}
      <SectionTitle>Papers by keyword</SectionTitle>
      <StatsPlot suggestions={papers} mode="keyword" />

      <SectionTitle>Keyword trends</SectionTitle>
      <KeywordTrends />

      <SectionTitle>Paper map</SectionTitle>
      <PaperGraph />
      <div className="mb-5" />
    </Container>
  );
}
