import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { SURVEY } from '../surveyPaper';
import { KEYWORDS } from '../keywords';

const FAQ: React.FC = () => {
  return (
    <Container className="mt-3 base_container px-0">
      <h3 className="mb-2">What is this website?</h3>
      <p>
        This website is a comprehensive database of research papers related to 3D Scene Graphs
        (3DSGs). It allows users to search, explore, and contribute to the growing body of knowledge
        in this field. It is a contribution from the paper{' '}
        {SURVEY.comingSoon ? (
          <>{SURVEY.title} (coming soon)</>
        ) : (
          <>
            <a href={SURVEY.url} target="_blank" rel="noopener noreferrer">
              {SURVEY.title}
            </a>{' '}
            (<i>{SURVEY.journal}</i>, {SURVEY.year}; preprint on{' '}
            <a href={SURVEY.arxiv} target="_blank" rel="noopener noreferrer">
              arXiv
            </a>
            )
          </>
        )}
        .
      </p>

      <h3 className="mt-4 mb-2">How do I use the search functionality?</h3>
      <p>
        You can use the search bar on the homepage to search for papers by title. The{' '}
        <Link to={'/advanced-search'}>Advanced Search</Link> page allows you to filter papers based
        on various criteria, such as author, venue, date, and keywords. You can add multiple filters
        of the same type; these will act as OR within that type and AND across different types. To
        enforce an AND within the same query use &quot;&amp;&quot;, e.g. &quot;Manipulation &amp;
        Navigation&quot;. A comprehensive list of keywords used and their descriptions can be found
        below.
      </p>
      <Table
        responsive
        style={{
          borderSpacing: 0,
        }}
      >
        <thead>
          <tr>
            <th style={{ width: '25%', padding: '12px 0px' }}>Keyword</th>
            <th style={{ padding: '12px 0px' }}>Description</th>
          </tr>
        </thead>
        <tbody>
          {KEYWORDS.map((item, idx) => (
            <tr key={idx}>
              <td
                style={{
                  padding: '10px 0px',
                }}
              >
                {item.term}
              </td>
              <td style={{ padding: '10px 0px', fontSize: '0.95rem', lineHeight: 1.5 }}>
                {item.desc}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
};

export default FAQ;
