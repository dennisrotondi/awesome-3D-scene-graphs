import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { papers } from '../components/papers';
import { Container, Row, Col } from 'react-bootstrap';
import { getPaperLinks } from '../components/paperLinks';
import { formatDate, TOAST_DURATION_MS } from '../components/Constants';
import { FaCopy, FaCheck } from 'react-icons/fa';

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

export default function PaperPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const paper = papers.find((p) => p['ID'] === id);

  useEffect(() => {
    if (!paper) {
      navigate('/');
    }
  }, [paper, navigate]);

  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(paper?.BIBTEX ?? '');
    setCopied(true);
    setTimeout(() => setCopied(false), TOAST_DURATION_MS);
  };

  if (!paper) return null;
  const { TITLE, AUTHOR, ABSTRACT, VENUE, DATE, FIRSTINSTITUTE, BIBTEX, VIDEO, KEYWORD } = paper;
  const keywords = (KEYWORD ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
  const links = getPaperLinks(paper);
  const youtubeId = VIDEO ? extractYouTubeId(VIDEO) : null;

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col xs={12} md={10} lg={10} xl={8}>
          {/* Title */}
          <div className="text-center mb-4">
            <h1 className="display-5 fw-bold">{TITLE}</h1>
          </div>

          {/* Authors */}
          <div className="text-center mb-4">
            <h4 className="">{AUTHOR}</h4>
          </div>

          {/* Link Buttons */}
          <div className="d-flex justify-content-center flex-wrap gap-3 mb-4">
            {links.map((link, index) => (
              <a
                key={index}
                href={link.url}
                className="btn btn-dark d-flex align-items-center gap-2 px-4 py-2 rounded-pill shadow-sm"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontWeight: 500, fontSize: '1rem' }}
              >
                {link.icon}
                {link.label}
              </a>
            ))}
          </div>

          {/* Venue and Date */}
          <div className="text-center text-muted mb-4">
            {VENUE && (
              <div>
                <strong>Venue:</strong> {VENUE}
              </div>
            )}
            {DATE && (
              <div>
                <strong>Date:</strong> {formatDate(DATE)}
              </div>
            )}

            {FIRSTINSTITUTE && (
              <div>
                <strong>First author affiliation:</strong> {FIRSTINSTITUTE}
              </div>
            )}
          </div>

          {/* Keywords */}
          {keywords.length > 0 && (
            <div className="d-flex justify-content-center flex-wrap gap-2 mb-5">
              {keywords.map((kw, index) => (
                <span
                  key={index}
                  className="badge rounded-pill"
                  style={{
                    backgroundColor: '#9CAFAA',
                    color: '#fff',
                    fontWeight: 500,
                    fontSize: '0.9rem',
                    padding: '0.5em 0.9em',
                  }}
                >
                  {kw}
                </span>
              ))}
            </div>
          )}

          {/* Abstract Box */}
          <div className="bg-light border rounded p-4 shadow-sm">
            <h4 className="mb-3">Abstract</h4>
            <p className="mb-0" style={{ whiteSpace: 'pre-line' }}>
              {ABSTRACT}
            </p>
          </div>

          {/* Video embed */}
          {youtubeId && (
            <div className="mt-5">
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}`}
                title="Paper video"
                allowFullScreen
                style={{ width: '100%', aspectRatio: '16/9', border: 'none', borderRadius: 8 }}
              />
            </div>
          )}

          {/* BibTeX Box */}
          <div className="mt-5 bg-light border rounded shadow-sm overflow-hidden">
            <div className="d-flex justify-content-between align-items-center p-4 pb-3">
              <h4 className="mb-0">BibTeX Citation</h4>
              <button
                onClick={handleCopy}
                title="Copy BibTeX"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  // a clearly green confirmation at the site's green hue; the
                  // softer CHART_GREEN_DARK was too close to the idle grey
                  color: copied ? '#309778' : '#6c757d',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: '0.85rem',
                  transition: 'color 0.15s',
                  padding: 0,
                }}
              >
                {copied ? <FaCheck size={13} /> : <FaCopy size={13} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre
              className="mb-0 border-top"
              style={{
                backgroundColor: '#ffffff',
                padding: '1rem 1.25rem',
                fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
                fontSize: '0.85rem',
                lineHeight: 1.65,
                overflowX: 'auto',
                whiteSpace: 'pre',
                color: '#1f2328',
              }}
            >
              {BIBTEX}
            </pre>
          </div>
        </Col>
      </Row>
    </Container>
  );
}
