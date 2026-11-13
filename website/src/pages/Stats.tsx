import React, { useState } from 'react';
import { Container, Button, ButtonGroup } from 'react-bootstrap';

import { papers } from '../components/papers';
import GrowthChart from '../components/GrowthChart';
import CumulativeChart from '../components/CumulativeChart';
import StatsPlot from '../components/StatsPlot';
import StatTiles from '../components/StatTiles';
import KeywordTrends from '../components/KeywordTrends';
import PaperGraph from '../components/PaperGraph';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="growth-title mt-5 mb-3">{children}</h2>;
}

export default function Stats() {
  const [statsMode, setStatsMode] = useState<'year' | 'venue' | 'keyword'>('keyword');

  return (
    <Container className="mt-3 text-font-base">
      <h1 className="stats-page-title text-center mb-4">Statistics</h1>

      <StatTiles />

      {/* Papers per year */}
      <SectionTitle>Papers per year</SectionTitle>
      <GrowthChart />

      {/* Cumulative growth */}
      <SectionTitle>Cumulative growth</SectionTitle>
      <CumulativeChart />

      {/* Breakdown by keyword / venue / year */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-5 mb-3">
        <h2 className="growth-title m-0">Breakdown</h2>
        <ButtonGroup size="sm">
          <Button
            variant={statsMode === 'keyword' ? 'outline-secondary' : 'outline-primary'}
            onClick={() => setStatsMode('keyword')}
          >
            Keyword
          </Button>
          <Button
            variant={statsMode === 'venue' ? 'outline-secondary' : 'outline-primary'}
            onClick={() => setStatsMode('venue')}
          >
            Venue
          </Button>
          <Button
            variant={statsMode === 'year' ? 'outline-secondary' : 'outline-primary'}
            onClick={() => setStatsMode('year')}
          >
            Year
          </Button>
        </ButtonGroup>
      </div>
      <StatsPlot suggestions={papers} mode={statsMode} />

      {/* Keyword share over time */}
      <SectionTitle>Keyword trends</SectionTitle>
      <KeywordTrends />

      {/* Connected papers */}
      <SectionTitle>Connected papers</SectionTitle>
      <PaperGraph />
      <div className="mb-5" />
    </Container>
  );
}
