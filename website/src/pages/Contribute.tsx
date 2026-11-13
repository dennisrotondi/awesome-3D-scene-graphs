import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Card, Form, Row, Col, Button, Alert, Badge } from 'react-bootstrap';
import { GITHUB_REPO } from '../surveyPaper';
import { KEYWORDS } from '../keywords';
import { isHttpUrl, isArxivUrl, ARXIV_ABS_RE } from '../utils/links';

type Paper = {
  TITLE: string;
  VENUE: string;
  DATE: string;
  AUTHOR: string;
  ABSTRACT: string;
  ARXIV: string;
  FIRSTINSTITUTE: string;
  KEYWORD: string;
  SITE: string;
  CODE: string;
  VIDEO: string;
  BIBTEX: string;
};

const emptyPaper = (): Paper => ({
  TITLE: '',
  VENUE: '',
  DATE: '',
  AUTHOR: '',
  ABSTRACT: '',
  ARXIV: '',
  FIRSTINSTITUTE: '',
  KEYWORD: '',
  SITE: '',
  CODE: '',
  VIDEO: '',
  BIBTEX: '',
});

const Contribute: React.FC = () => {
  const [paper, setPaper] = useState<Paper>(emptyPaper());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<{ type: 'success' | 'danger'; msg: string } | null>(null);
  const [showKeywords, setShowKeywords] = useState(true);

  // Currently selected keywords, parsed from the comma-separated KEYWORD field.
  const selectedKeywords = paper.KEYWORD.split(',')
    .map((k) => k.trim())
    .filter(Boolean);

  // Toggle a keyword in/out of the comma-separated KEYWORD field.
  const toggleKeyword = (term: string) => {
    const set = new Set(selectedKeywords);
    if (set.has(term)) {
      set.delete(term);
    } else {
      set.add(term);
    }
    // Preserve the canonical FAQ order so the value stays tidy.
    const next = KEYWORDS.filter((k) => set.has(k.term)).map((k) => k.term);
    setPaper((prev) => ({ ...prev, KEYWORD: next.join(', ') }));
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.KEYWORD;
      return copy;
    });
  };

  // Helper to update fields
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPaper((prev) => ({ ...prev, [name]: value }));
    // clear error for that field
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy[name];
      return copy;
    });
  };

  // Basic validation for mandatory fields (ID removed)
  const mandatory = [
    'TITLE',
    'VENUE',
    'DATE',
    'AUTHOR',
    'ABSTRACT',
    'ARXIV',
    'FIRSTINSTITUTE',
    'KEYWORD',
    'BIBTEX',
  ];

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    mandatory.forEach((k) => {
      if (!paper[k as keyof Paper] || String(paper[k as keyof Paper]).trim() === '') {
        newErrors[k] = 'This field is required';
      }
    });

    // Links, with the same rules as scripts/validate_papers.py (see
    // utils/links.ts): every link is an http(s) URL, and an arXiv link in ARXIV
    // must be the canonical abstract link; a published-version link is fine.
    (['ARXIV', 'SITE', 'CODE', 'VIDEO'] as const).forEach((k) => {
      const value = paper[k].trim();
      if (value && !isHttpUrl(value)) newErrors[k] = 'Use a full http(s):// link';
    });
    const arxiv = paper.ARXIV.trim();
    if (!newErrors.ARXIV && isArxivUrl(arxiv) && !ARXIV_ABS_RE.test(arxiv)) {
      newErrors.ARXIV = 'Use https://arxiv.org/abs/<id> for arXiv links';
    }

    // DATE simple format check YYYY/MM/DD
    if (paper.DATE && !/^\d{4}\/\d{2}\/\d{2}$/.test(paper.DATE)) {
      newErrors.DATE = 'Use YYYY/MM/DD';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildJsonString = () => JSON.stringify(paper, null, 2);

  const handleCopy = async () => {
    if (!validate()) {
      setAlert({ type: 'danger', msg: 'Please fix validation errors before copying.' });
      return;
    }
    try {
      await navigator.clipboard.writeText(buildJsonString());
      setAlert({ type: 'success', msg: 'JSON copied to clipboard!' });
      setTimeout(() => setAlert(null), 2500);
    } catch (_e) {
      setAlert({ type: 'danger', msg: 'Failed to copy to clipboard.' });
    }
  };

  // simple slugify to create a safe filename from TITLE (fallback to 'paper_new')
  const slugify = (s?: string) =>
    (s || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'paper_new';

  const handleDownload = () => {
    if (!validate()) {
      setAlert({ type: 'danger', msg: 'Please fix validation errors before downloading.' });
      return;
    }
    const blob = new Blob([buildJsonString()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = `paper_${slugify(paper.TITLE)}.json`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setAlert({ type: 'success', msg: `Downloaded ${filename}` });
    setTimeout(() => setAlert(null), 2500);
  };

  const handleReset = () => {
    setPaper(emptyPaper());
    setErrors({});
    setAlert(null);
  };

  return (
    <Container className="mt-3 base_container px-0 ">
      <h3 className="mb-3">Contribute to the database</h3>
      <p>
        We welcome contributions! All data is manually curated and may contain errors or omissions,
        so your help in adding new papers or improving existing entries is invaluable. Please submit
        only works in which 3D scene graphs are used as a central component of the paper&apos;s main
        contribution. You can contribute through GitHub to help keep the resource reliable and
        complete.
      </p>

      <h4 className="mt-4">How to contribute</h4>
      <ol>
        <li>
          Visit the GitHub repository:&nbsp;
          <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer">
            awesome-3DSG
          </a>
          .
        </li>
        <li>Fork the repository.</li>
        <li>
          Add or edit a file in the <code>papers/</code> folder (one JSON file per paper, named
          after its BibTeX key).
        </li>
        <li>
          Submit a{' '}
          <a href={`${GITHUB_REPO}/pulls`} target="_blank" rel="noopener noreferrer">
            Pull Request
          </a>{' '}
          once you&apos;re done.
        </li>
      </ol>

      <p>
        Please provide as much information as possible. More complete entries make the resource more
        useful for everyone. Feel free to add code links, websites, videos, or correct/update any
        missing details. You can use the form below to generate a JSON entry. Download it and place
        the file in the <code>papers/</code> folder.
      </p>

      {/* <h3 className="mt-3">Field Requirements</h3> */}
      {/* <p>
        <strong>Mandatory to fill:</strong> <code>TITLE</code>, <code>VENUE</code>,{' '}
        <code>DATE</code>, <code>AUTHOR</code>, <code>ABSTRACT</code>, <code>ARXIV</code>,{' '}
        <code>FIRSTINSTITUTE</code>, <code>KEYWORD</code>, <code>BIBTEX</code>
      </p>
      <p>
        <strong>Can be left empty:</strong> <code>SITE</code>, <code>CODE</code>, <code>VIDEO</code>
      </p> */}

      <Card className="p-3 mb-4">
        <Form>
          <Row>
            <Col className="mb-3">
              <Form.Group controlId="formTitle">
                <Form.Label>TITLE</Form.Label>
                <Form.Control
                  name="TITLE"
                  value={paper.TITLE}
                  onChange={handleChange}
                  isInvalid={!!errors.TITLE}
                />
                <Form.Control.Feedback type="invalid">{errors.TITLE}</Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={4} className="mb-3">
              <Form.Group controlId="formVenue">
                <Form.Label>VENUE (e.g., CVPR25, IJRR23)</Form.Label>
                <Form.Control
                  name="VENUE"
                  value={paper.VENUE}
                  onChange={handleChange}
                  isInvalid={!!errors.VENUE}
                />
                <Form.Control.Feedback type="invalid">{errors.VENUE}</Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col md={4} className="mb-3">
              <Form.Group controlId="formDate">
                <Form.Label>DATE (YYYY/MM/DD)</Form.Label>
                <Form.Control
                  name="DATE"
                  value={paper.DATE}
                  onChange={handleChange}
                  isInvalid={!!errors.DATE}
                  placeholder="2025/11/19"
                />
                <Form.Control.Feedback type="invalid">{errors.DATE}</Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col md={4} className="mb-3">
              <Form.Group controlId="formFirstInstitute">
                <Form.Label>FIRST INSTITUTE (abbr.)</Form.Label>
                <Form.Control
                  name="FIRSTINSTITUTE"
                  value={paper.FIRSTINSTITUTE}
                  onChange={handleChange}
                  isInvalid={!!errors.FIRSTINSTITUTE}
                  placeholder="MIT"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.FIRSTINSTITUTE}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={12} className="mb-3">
              <Form.Group controlId="formAuthor">
                <Form.Label>AUTHOR (comma separated)</Form.Label>
                <Form.Control
                  name="AUTHOR"
                  value={paper.AUTHOR}
                  onChange={handleChange}
                  isInvalid={!!errors.AUTHOR}
                />
                <Form.Control.Feedback type="invalid">{errors.AUTHOR}</Form.Control.Feedback>
                <Form.Text className="text-muted">
                  Connect multi-part names with a hyphen (e.g., &quot;First-name Lastname&quot;).
                </Form.Text>
              </Form.Group>
            </Col>

            <Col md={12} className="mb-3">
              <Form.Group controlId="formAbstract">
                <Form.Label>ABSTRACT</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={5}
                  name="ABSTRACT"
                  value={paper.ABSTRACT}
                  onChange={handleChange}
                  isInvalid={!!errors.ABSTRACT}
                />
                <Form.Control.Feedback type="invalid">{errors.ABSTRACT}</Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6} className="mb-3">
              <Form.Group controlId="formArxiv">
                <Form.Label>ARXIV (arXiv link, or published link if not on arXiv)</Form.Label>
                <Form.Control
                  name="ARXIV"
                  value={paper.ARXIV}
                  onChange={handleChange}
                  isInvalid={!!errors.ARXIV}
                />
                <Form.Control.Feedback type="invalid">{errors.ARXIV}</Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col md={6} className="mb-3">
              <Form.Group controlId="formKeyword">
                <Form.Label>KEYWORD (comma separated)</Form.Label>
                <Form.Control
                  name="KEYWORD"
                  value={paper.KEYWORD}
                  onChange={handleChange}
                  isInvalid={!!errors.KEYWORD}
                />
                <Form.Control.Feedback type="invalid">{errors.KEYWORD}</Form.Control.Feedback>
                <Form.Text className="text-muted d-block" style={{ userSelect: 'none' }}>
                  Choose only from the FAQ list.{' '}
                  <button
                    type="button"
                    className="btn btn-link p-0 align-baseline"
                    onClick={() => setShowKeywords((s) => !s)}
                    aria-expanded={showKeywords}
                    style={{ color: '#3b4248', fontWeight: 600, textDecoration: 'underline' }}
                  >
                    {showKeywords ? 'Hide keywords ▴' : 'Show keywords ▾'}
                  </button>
                </Form.Text>
                {showKeywords && (
                  <div>
                    <div className="d-flex flex-wrap gap-1 mt-2">
                      {KEYWORDS.map((k) => {
                        const active = selectedKeywords.includes(k.term);
                        return (
                          <Badge
                            key={k.term}
                            bg=""
                            title={k.desc}
                            role="button"
                            onClick={() => toggleKeyword(k.term)}
                            style={{
                              cursor: 'pointer',
                              border: '1px solid #3b4248',
                              fontWeight: 400,
                              backgroundColor: active ? '#9CAFAA' : '#fff',
                              color: active ? '#fff' : '#3b4248',
                              userSelect: 'none',
                            }}
                          >
                            {k.term}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={4} className="mb-3">
              <Form.Group controlId="formSite">
                <Form.Label>SITE (optional)</Form.Label>
                <Form.Control name="SITE" value={paper.SITE} onChange={handleChange} />
              </Form.Group>
            </Col>

            <Col md={4} className="mb-3">
              <Form.Group controlId="formCode">
                <Form.Label>CODE (optional)</Form.Label>
                <Form.Control name="CODE" value={paper.CODE} onChange={handleChange} />
              </Form.Group>
            </Col>

            <Col md={4} className="mb-3">
              <Form.Group controlId="formVideo">
                <Form.Label>VIDEO (optional)</Form.Label>
                <Form.Control name="VIDEO" value={paper.VIDEO} onChange={handleChange} />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={12} className="mb-3">
              <Form.Group controlId="formBibtex">
                <Form.Label>BIBTEX</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  name="BIBTEX"
                  value={paper.BIBTEX}
                  onChange={handleChange}
                  isInvalid={!!errors.BIBTEX}
                />
                <Form.Control.Feedback type="invalid">{errors.BIBTEX}</Form.Control.Feedback>
                <Form.Text className="text-muted">
                  Paste a ready-to-copy BibTeX entry here.
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>

          <div className="d-flex gap-2">
            <Button variant="primary" onClick={handleCopy}>
              Copy
            </Button>
            <Button variant="primary" onClick={handleDownload}>
              Download
            </Button>
            <Button variant="primary" onClick={handleReset}>
              Reset
            </Button>
          </div>
        </Form>
      </Card>

      {alert && (
        <Alert variant={alert.type === 'success' ? 'success' : 'danger'}>{alert.msg}</Alert>
      )}

      <strong>JSON preview</strong>
      <Card className="p-3 mb-4">
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
          {JSON.stringify(paper, null, 2)}
        </pre>
      </Card>

      {/* Acknowledgments — uncomment and add names once contributors are active
      <h3 className="mb-2">Acknowledgments</h3>
      <p>Special thanks to ...</p>
      */}
    </Container>
  );
};

export default Contribute;
