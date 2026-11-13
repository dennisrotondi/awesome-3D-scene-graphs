import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import type { DateRange } from 'react-day-picker';
import SearchBar from '../components/SearchBar';
import { AiOutlinePlus, AiOutlineMinus } from 'react-icons/ai';
import { FaFileDownload } from 'react-icons/fa';
import { Container, Row, Col, Form, Button, ButtonGroup } from 'react-bootstrap';
import SuggestionCard from '../components/SuggestionCard';
import { DatePicker } from '../components/DatePicker';
import { papers } from '../components/papers';
import StatsPlot from '../components/StatsPlot';
import StatTiles from '../components/StatTiles';
import KeywordTrends from '../components/KeywordTrends';
import CumulativeChart from '../components/CumulativeChart';
import PaperGraph from '../components/PaperGraph';
import TimelinePlot, { type TimelineHandle } from '../components/Timeline';
import { isBookmarked, onBookmarksChange } from '../utils/bookmarks';
import './AdvancedSearch.css';

type SearchBarConfig = {
  id: number;
  field: string;
  value: string | DateRange | undefined;
  placeholder: string;
  option: string;
};

export default function AdvancedSearch() {
  const location = useLocation();
  const valueTitle = location.state?.value;
  const matches = location.state?.matches || [...papers];
  const [suggestions, setSuggestions] = useState([...matches]);
  const [detailLevel, setDetailLevel] = useState<'mini' | 'small' | 'detail'>('detail');
  const [onlyWithCode, setOnlyWithCode] = useState(false);
  const [onlyReviewed, setOnlyReviewed] = useState(false);
  const [onlyBookmarked, setOnlyBookmarked] = useState(Boolean(location.state?.bookmarked));
  // Bumped whenever bookmarks change so an active "Bookmarked" filter re-runs.
  const [bookmarkVersion, setBookmarkVersion] = useState(0);

  useEffect(() => onBookmarksChange(() => setBookmarkVersion((v) => v + 1)), []);

  // Navbar bookmark badge navigates here with state; sync when already on this page.
  useEffect(() => {
    if (location.state?.bookmarked) setOnlyBookmarked(true);
  }, [location.state]);
  // Default to no explicit sort: papers already load oldest-first (see papers.tsx),
  // so the initial order is correct without a re-sort flash on load.
  const [sortBy, setSortBy] = useState('');

  const [viewMode, setViewMode] = useState<'browse' | 'statistics' | 'timeline' | 'graph'>(
    'browse'
  );
  const [statsMode, setStatsMode] = useState<'year' | 'venue' | 'keyword' | 'growth' | 'trends'>(
    'year'
  );

  // default bars
  const [searchBars, setSearchBars] = useState([
    {
      id: 1,
      field: 'TITLE',
      value: valueTitle || '',
      placeholder: 'Search by title.',
      option: 'Title',
    },
    {
      id: 2,
      field: 'AUTHOR',
      value: '',
      placeholder: 'Search by author.',
      option: 'Author',
    },
    {
      id: 3,
      value: '',
      field: 'VENUE',
      placeholder: 'Search by venue.',
      option: 'Venue',
    },
    {
      id: 4,
      field: 'KEYWORD',
      value: '',
      placeholder: 'Search by keyword.',
      option: 'Keyword',
    },
    {
      id: 5,
      field: 'DATE',
      value: '',
      placeholder: 'Search by date.',
      option: 'Date',
    },
  ]);
  const [nextId, setNextId] = useState(6); // next available id

  // Helper to capitalize first letter
  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

  const addSearchBar = (field: string) => {
    const id = nextId;

    setSearchBars((prev) => [
      ...prev,
      {
        id,
        field,
        value: '',
        placeholder: `Search by ${field.toLowerCase()}.`,
        option: capitalize(field),
      },
    ]);

    setNextId((prev) => prev + 1);
  };

  const removeSearchBar = (id: number) => {
    setSearchBars((prev) => prev.filter((bar) => bar.id !== id));
  };

  const onOptionChange = (id: number, newOption: string) => {
    setSearchBars((prev) =>
      prev.map((bar) =>
        bar.id === id
          ? {
              ...bar,
              option: newOption,
              placeholder: `Search by ${newOption.toLowerCase()}.`,
              field: newOption.toUpperCase(),
              value: '',
            }
          : bar
      )
    );
  };

  const onSearch = useCallback(() => {
    let advancedSugg = [...papers];
    if (onlyWithCode) {
      advancedSugg = advancedSugg.filter((paper) => paper['CODE'] && paper['CODE'] !== 'TODO');
    }
    if (onlyReviewed) {
      advancedSugg = advancedSugg.filter(
        (paper) => !String(paper['VENUE']).toLowerCase().includes('arxiv')
      );
    }
    if (onlyBookmarked) {
      // bookmarkVersion ties this filter to bookmark toggles (isBookmarked reads localStorage)
      void bookmarkVersion;
      advancedSugg = advancedSugg.filter((paper) => isBookmarked(paper['ID']));
    }
    const searchMap = new Map();
    searchBars.forEach((bar) => {
      const field = bar.field;
      const value = bar.value;
      if (!searchMap.has(field)) {
        searchMap.set(field, []);
      }
      if (field === 'DATE') {
        searchMap.get(field).push(value);
      } else {
        searchMap.get(field).push(value?.trim().toLowerCase());
      }
    });

    for (const field of searchMap.keys()) {
      const values = searchMap.get(field).filter(Boolean);

      if (field !== 'DATE' && values.length > 0) {
        // we want to force that in queries where we write &, we apply the and and so all of them are included
        // values: e.g. ["A&B", "C", "D&F"]

        // 1. Parse into groups of AND-terms. Each value is one OR-clause.
        const groups = values
          .map(
            (v: string) =>
              v
                .split('&')
                .map((s) => s.trim().toLowerCase())
                .filter(Boolean) // remove empty strings
          )
          .filter((group) => group.length > 0); // remove completely empty groups

        // 2. Filter advancedSugg by OR-of-ANDs:
        //    keep a paper if at least one group matches,
        //    and a group matches if *all* its terms are included.
        advancedSugg = advancedSugg.filter((paper) => {
          const fieldValue = (paper[field as keyof typeof paper] ?? '').toString().toLowerCase();
          if (!fieldValue) return false;

          // OR over groups
          return groups.some((group) =>
            // AND within group
            group.every((query) => fieldValue.includes(query))
          );
        });
        // advancedSugg = advancedSugg.filter(
        //   (paper) =>
        //     paper[field] &&
        //     values.some((query: string) => String(paper[field]).toLowerCase().includes(query))
        // );
      } else if (field === 'DATE' && values.length > 0) {
        advancedSugg = advancedSugg.filter((paper) => {
          if (!paper[field as keyof typeof paper]) return false;
          const date = new Date(String(paper[field as keyof typeof paper]));
          return values.some(
            (query: { from: Date; to: Date }) => query.from <= date && date <= query.to
          );
        });
      }
    }

    if (sortBy === 'TITLE') {
      advancedSugg = advancedSugg.sort((a, b) => a['TITLE'].localeCompare(b['TITLE']));
    } else if (sortBy === 'DATEN' || sortBy === 'DATEO') {
      advancedSugg = advancedSugg.sort((a, b) => {
        const dateA = new Date(a['DATE']);
        const dateB = new Date(b['DATE']);
        return sortBy === 'DATEN'
          ? dateB.getTime() - dateA.getTime()
          : dateA.getTime() - dateB.getTime();
      });
    }
    setSuggestions(advancedSugg);
  }, [searchBars, onlyWithCode, onlyReviewed, onlyBookmarked, bookmarkVersion, sortBy]);

  useEffect(() => {
    onSearch();
  }, [onSearch]);

  const onUpdateBar = (id: number, newValue: string | DateRange | undefined) => {
    setSearchBars((prev) =>
      prev.map((bar) =>
        bar.id === id
          ? {
              ...bar,
              value: newValue,
            }
          : bar
      )
    );
  };

  const handleSuggestionSelected = (
    _event: React.FormEvent,
    { suggestionValue }: { suggestionValue: string },
    id: number
  ) => {
    onUpdateBar(id, suggestionValue);
  };

  // Clicking a keyword chip on a card fills (or adds) a keyword search bar.
  const handleKeywordClick = (term: string) => {
    setSearchBars((prev) => {
      const keywordBar = prev.find((bar) => bar.field === 'KEYWORD');
      if (keywordBar) {
        return prev.map((bar) => (bar.id === keywordBar.id ? { ...bar, value: term } : bar));
      }
      return [
        ...prev,
        {
          id: nextId,
          field: 'KEYWORD',
          value: term,
          placeholder: 'Search by keyword.',
          option: 'Keyword',
        },
      ];
    });
    setNextId((prev) => prev + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const buildSearchBar = (bar: SearchBarConfig) => {
    const isTitleBar = bar.id === 1;
    const isDateBar = bar.field === 'DATE';

    return (
      <Row className="mb-2 justify-content-center" key={bar.id}>
        <Col className="p-0">
          <div className="d-flex">
            {!isTitleBar && (
              <Form.Select
                className="me-1 keyword"
                defaultValue={bar.option}
                onChange={(e) => onOptionChange(bar.id, e.target.value)}
              >
                <option>Author</option>
                <option>Date</option>
                <option>Keyword</option>
                <option>Venue</option>
              </Form.Select>
            )}

            <div className="flex-grow-1">
              {isDateBar && <DatePicker onChange={(range) => onUpdateBar(bar.id, range)} />}
              {!isDateBar && (
                <SearchBar
                  field={bar.field}
                  placeholder={bar.placeholder}
                  // Keyword bars stay synced so keyword-chip clicks show up in the input.
                  initialValue={
                    isTitleBar || bar.field === 'KEYWORD'
                      ? typeof bar.value === 'string'
                        ? bar.value
                        : ''
                      : ''
                  }
                  id={bar.id}
                  icon="X"
                  onSuggestionSelected={(event, data) =>
                    handleSuggestionSelected(event, data, bar.id)
                  }
                  onClick={(e, v, _s) => {
                    onUpdateBar(bar.id, v);
                  }}
                />
              )}
            </div>

            <Button
              variant="secondary"
              size="lg"
              className="ms-1"
              onClick={() => (isTitleBar ? addSearchBar('AUTHOR') : removeSearchBar(bar.id))}
            >
              {isTitleBar ? <AiOutlinePlus /> : <AiOutlineMinus />}
            </Button>
          </div>
        </Col>
      </Row>
    );
  };

  const DownloadBibTeX = () => {
    const bibtexEntries = suggestions.map((paper) => paper['BIBTEX'] || '').join('\n\n');
    const blob = new Blob([bibtexEntries], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '3DSceneGraphs_papers.bib';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  const timelineRef = useRef<TimelineHandle | null>(null);
  const [timelineSpanLabel, setTimelineSpanLabel] = useState('');
  return (
    <Container id="SearchBars" className="mt-3">
      {/* --- VIEW MODE TOGGLE --- */}
      <div className="d-flex justify-content-center mb-3">
        <Button
          className="mx-2"
          variant={viewMode === 'browse' ? 'primary' : 'outline-primary'}
          onClick={() => setViewMode('browse')}
        >
          Browse
        </Button>

        <Button
          className="mx-2"
          variant={viewMode === 'statistics' ? 'primary' : 'outline-primary'}
          onClick={() => setViewMode('statistics')}
        >
          Statistics
        </Button>

        <Button
          className="mx-2"
          variant={viewMode === 'timeline' ? 'primary' : 'outline-primary'}
          onClick={() => setViewMode('timeline')}
        >
          Timeline
        </Button>

        <Button
          className="mx-2"
          variant={viewMode === 'graph' ? 'primary' : 'outline-primary'}
          onClick={() => setViewMode('graph')}
        >
          Paper map
        </Button>
      </div>

      {/* Search bars */}
      {searchBars.map((bar) => buildSearchBar(bar))}

      {/* bar with buttons and selection */}
      <Row className="align-items-center mb-3 p-0 ms-0 me-0 g-3 text-font-base">
        {/* 1. Download + Count + Sort */}
        <Col xs="12" md="6" xl="4" className="p-0">
          <div className="d-flex align-items-center">
            <div
              onClick={() => DownloadBibTeX()}
              style={{ cursor: 'pointer' }}
              title="Download BibTeX"
            >
              <FaFileDownload className="me-1" />
            </div>
            <div className="me-3 flex-shrink-0 text-end " style={{ width: '3ch' }}>
              {suggestions.length}
            </div>
            {/* Sort */}
            <div className="d-flex align-items-center flex-grow-1">
              <span className="flex-shrink-0 me-2">Sort by:</span>
              <Form.Select
                size="sm"
                className="flex-grow-1 sortsel"
                onChange={(e) => setSortBy(e.target.value)}
                value={sortBy}
              >
                <option value="">Select...</option>
                <option value="TITLE">Title</option>
                <option value="DATEN">Newest first</option>
                <option value="DATEO">Oldest first</option>
              </Form.Select>
            </div>
          </div>
        </Col>

        {/* 2. Checkboxes */}
        <Col xs="12" md="6" xl="4" className="p-0">
          <div className="d-flex align-items-center justify-content-center gap-3">
            <div className="d-flex align-items-center">
              <input
                type="checkbox"
                id="reviewedCheck"
                onChange={(e) => setOnlyReviewed(e.target.checked)}
                className="form-check-input m-0"
              />
              <label htmlFor="reviewedCheck" className="form-check-label ms-1 mb-0">
                Reviewed
              </label>
            </div>

            <div className="d-flex align-items-center">
              <input
                type="checkbox"
                id="codeCheck"
                onChange={(e) => setOnlyWithCode(e.target.checked)}
                className="form-check-input m-0"
              />
              <label htmlFor="codeCheck" className="form-check-label ms-1 mb-0">
                With code
              </label>
            </div>

            <div className="d-flex align-items-center">
              <input
                type="checkbox"
                id="bookmarkCheck"
                checked={onlyBookmarked}
                onChange={(e) => setOnlyBookmarked(e.target.checked)}
                className="form-check-input m-0"
              />
              <label htmlFor="bookmarkCheck" className="form-check-label ms-1 mb-0">
                Bookmarked
              </label>
            </div>
          </div>
        </Col>

        {/* 3. RIGHT-SIDE BUTTONS: depend on viewMode */}
        <Col xs="12" md="6" xl="4" className="p-0">
          <div className="d-flex justify-content-md-end">
            {/* Browse: Mini / Compact / Detail */}
            {viewMode === 'browse' && (
              <ButtonGroup size="sm" className="w-100 w-md-auto">
                <Button
                  variant={detailLevel === 'mini' ? 'outline-secondary' : 'outline-primary'}
                  onClick={() => setDetailLevel('mini')}
                >
                  Mini
                </Button>
                <Button
                  variant={detailLevel === 'small' ? 'outline-secondary' : 'outline-primary'}
                  onClick={() => setDetailLevel('small')}
                >
                  Compact
                </Button>
                <Button
                  variant={detailLevel === 'detail' ? 'outline-secondary' : 'outline-primary'}
                  onClick={() => setDetailLevel('detail')}
                >
                  Detail
                </Button>
              </ButtonGroup>
            )}

            {/* Statistics: chart selector */}
            {viewMode === 'statistics' && (
              <ButtonGroup size="sm" className="w-100 w-md-auto flex-wrap">
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
                <Button
                  variant={statsMode === 'growth' ? 'outline-secondary' : 'outline-primary'}
                  onClick={() => setStatsMode('growth')}
                >
                  Growth
                </Button>
                <Button
                  variant={statsMode === 'trends' ? 'outline-secondary' : 'outline-primary'}
                  onClick={() => setStatsMode('trends')}
                >
                  Trends
                </Button>
              </ButtonGroup>
            )}

            {/* Timeline: nothing for now */}
            {viewMode === 'timeline' && (
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 w-100">
                <span className="text-font-base ms-md-3 text-end">Span: {timelineSpanLabel}</span>
                <ButtonGroup size="sm" className="flex-shrink-0">
                  <Button
                    variant="outline-primary"
                    onClick={() => timelineRef.current?.resetZoom()}
                  >
                    Reset zoom
                  </Button>
                </ButtonGroup>
              </div>
            )}
          </div>
        </Col>
      </Row>

      {/* --- CONTENT: browse / statistics / timeline --- */}
      {viewMode === 'statistics' ? (
        <Row>
          <Col xs={12}>
            <div className="mb-4">
              <StatTiles suggestions={suggestions} />
            </div>
            {/* Each option is the same component as the matching Stats page
                section, fed the current search results instead of every paper. */}
            {statsMode === 'trends' ? (
              <KeywordTrends suggestions={suggestions} />
            ) : statsMode === 'growth' ? (
              <CumulativeChart suggestions={suggestions} />
            ) : (
              <StatsPlot suggestions={suggestions} mode={statsMode} />
            )}
          </Col>
        </Row>
      ) : viewMode === 'graph' ? (
        <Row>
          <Col xs={12}>
            <PaperGraph suggestions={suggestions} />
          </Col>
        </Row>
      ) : viewMode === 'timeline' ? (
        <Row>
          <Col xs={12}>
            <TimelinePlot
              ref={timelineRef}
              suggestions={suggestions}
              onSpanChange={setTimelineSpanLabel}
            />
          </Col>
        </Row>
      ) : (
        // Browse: suggestion cards
        <Row>
          {suggestions.map((sugg) => (
            <SuggestionCard
              key={sugg['ID']}
              sugg={sugg}
              detailLevel={detailLevel}
              onKeywordClick={handleKeywordClick}
            />
          ))}
        </Row>
      )}
    </Container>
  );
}
