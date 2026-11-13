import { ToastContainer, Toast, Container, Row, Col, Image } from 'react-bootstrap';
import React, { useState } from 'react';
import { FaFilePdf, FaCopy, FaBookOpen } from 'react-icons/fa';
import 'bootstrap/dist/css/bootstrap.min.css';
import SearchBar from '../components/SearchBar';
import { useNavigate } from 'react-router-dom';
import Button from 'react-bootstrap/Button';
import { papers } from '../components/papers';
import type { Paper } from '../components/papers';
import { SURVEY } from '../surveyPaper';
import { TOAST_DURATION_MS } from '../components/Constants';
// import GrowthChart from '../components/GrowthChart'; // re-enable with the chart block below

function Home() {
  const [showToast, setShowToast] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(SURVEY.bibtex);
    setShowToast(true);
    setTimeout(() => setShowToast(false), TOAST_DURATION_MS);
  };

  const navigate = useNavigate();
  const handleSuggestionSelected = (
    _event: React.FormEvent,
    { suggestion, suggestionValue }: { suggestion: Paper; suggestionValue: string }
  ) => {
    navigate('/advanced-search', {
      state: { value: suggestionValue, matches: [suggestion] },
    });
  };
  const handleClick = (e: React.SyntheticEvent, value: string, suggestions: Paper[]) => {
    e.preventDefault();
    navigate('/advanced-search', {
      state: { value: value, matches: suggestions },
    });
  };

  return (
    <Container className="justify-content-center text-center text-font-base base_container">
      {/* Logo */}
      <Row className="justify-content-center">
        <Col className="d-flex p-0">
          <Image src="logo.svg" className="img-fluid w-100" />
        </Col>
      </Row>
      {/* searchbar */}
      <Row className="justify-content-center mb-4 mt-5 d-flex">
        <Col className="px-0">
          <SearchBar
            field="TITLE"
            placeholder="Search all 3D Scene Graphs papers."
            onSuggestionSelected={handleSuggestionSelected}
            onClick={handleClick}
          />
        </Col>
      </Row>
      {/* buttons */}
      <Row className="justify-content-center mb-3">
        <Col xs="auto" md="auto">
          <div className="d-flex flex-wrap justify-content-center gap-3">
            <Button
              variant="primary"
              size="lg"
              className="btn-uniform"
              onClick={() => navigate('/advanced-search')}
            >
              Advanced Search
            </Button>
            <Button
              variant="primary"
              size="lg"
              className="btn-uniform"
              onClick={() => navigate(`/${papers[Math.floor(Math.random() * papers.length)].ID}`)}
            >
              Graph a Paper
            </Button>
            <Button
              variant="primary"
              size="lg"
              className="btn-uniform"
              onClick={() => navigate('/contribute')}
            >
              Add/Edit Paper
            </Button>
          </div>
        </Col>
      </Row>

      {/* Paper preview — Coming Soon overlay when not yet published */}
      {SURVEY.comingSoon ? (
        <Row className="mb-2 justify-content-center">
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img src={SURVEY.cover} className="preview-img" style={{ opacity: 0.4 }} />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              <span
                style={{
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: '#D6A99D',
                  letterSpacing: '0.05em',
                  lineHeight: 1.3,
                }}
              >
                Survey Paper
                <br />
                Coming Soon
              </span>
            </div>
          </div>
        </Row>
      ) : (
        <>
          <Row className="justify-content-center mb-2">
            <Col xs="auto">
              Check out our{' '}
              <a
                href={SURVEY.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-font-base"
              >
                Survey paper!
              </a>
            </Col>
          </Row>
          <Row className="mb-2 justify-content-center">
            <div>
              <a href={SURVEY.url} target="_blank" rel="noopener noreferrer">
                <img src={SURVEY.cover} className="preview-img" />
              </a>
            </div>
          </Row>
          <Row className="justify-content-center">
            <Col xs="auto">
              <a
                href={SURVEY.url}
                target="_blank"
                rel="noopener noreferrer"
                className="d-flex align-items-center text-font-base"
                title={SURVEY.journal}
              >
                <FaBookOpen className="me-1" /> Journal
              </a>
            </Col>
            <Col xs="auto">
              <a
                href={SURVEY.arxiv}
                target="_blank"
                rel="noopener noreferrer"
                className="d-flex align-items-center text-font-base"
              >
                <FaFilePdf className="me-1" /> arXiv
              </a>
            </Col>
            <Col xs="auto">
              <a
                href={SURVEY.pdf}
                target="_blank"
                rel="noopener noreferrer"
                className="d-flex align-items-center text-font-base"
              >
                <FaFilePdf className="me-1" /> PDF
              </a>
            </Col>
            <Col xs="auto">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handleCopy();
                }}
                className="d-flex align-items-center text-font-base"
              >
                <FaCopy className="me-1" /> BibTeX
              </a>
            </Col>
          </Row>
          <ToastContainer className="p-3" position="middle-center" style={{ zIndex: 1 }}>
            <Toast
              onClose={() => setShowToast(false)}
              show={showToast}
              delay={TOAST_DURATION_MS}
              autohide
            >
              <Toast.Header>
                <strong className="me-auto text-font-base">Clipboard</strong>
              </Toast.Header>
              <Toast.Body className="text-font-small">BibTeX copied to clipboard!</Toast.Body>
            </Toast>
          </ToastContainer>
        </>
      )}

      {/* Field growth: papers per year — hidden for now, re-enable by uncommenting
          (also restore the GrowthChart import above)
      <Row className="justify-content-center mt-5 mb-4">
        <Col xs={12} md={10}>
          <h2 className="growth-title">Papers per year</h2>
          <GrowthChart />
        </Col>
      </Row>
      */}
    </Container>
  );
}

export default Home;
