import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Card, Image } from 'react-bootstrap';

interface Author {
  name: string;
  affiliation: string;
  image?: string;
  link: string;
}

const authors: Author[] = [
  {
    name: 'Dennis Rotondi',
    affiliation: 'IMPRS-IS, UniStuttgart',
    image: '/contributors/dennis.webp',
    link: 'https://dennisrotondi.com/',
  },
  {
    name: 'Francesco Argenziano',
    affiliation: 'Sapienza University of Rome',
    image: '/contributors/francesco.webp',
    link: 'https://fra-tsuna.github.io/website/',
  },
  {
    name: 'Sebastian Koch',
    affiliation: 'University Ulm, Google',
    image: '/contributors/sebastian.webp',
    link: 'https://kochsebastian.com/',
  },
  {
    name: 'Nathan Hughes',
    affiliation: 'MIT',
    image: '/contributors/nathan.webp',
    link: 'https://scholar.google.com/citations?user=8-FI_t0AAAAJ&hl=en',
  },
  {
    name: 'Martin Büchner',
    affiliation: 'University of Freiburg',
    image: '/contributors/martin.webp',
    link: 'https://rl.uni-freiburg.de/people/buechner',
  },
  {
    name: 'Johanna Wald',
    affiliation: 'Google',
    image: '/contributors/johanna.webp',
    link: 'https://scholar.google.de/citations?user=dfjN3YAAAAAJ&hl=en',
  },
  {
    name: 'Lukas R. Schmid',
    affiliation: 'UTN',
    image: '/contributors/lukas.webp',
    link: 'https://schmluk.github.io/',
  },
  {
    name: 'Daniele Nardi',
    affiliation: 'Sapienza University of Rome',
    image: '/contributors/daniele.webp',
    link: 'https://www.diag.uniroma1.it/users/daniele_nardi',
  },
  {
    name: 'Abhinav Valada',
    affiliation: 'University of Freiburg',
    image: '/contributors/abhinav.webp',
    link: 'https://rl.uni-freiburg.de/people/valada',
  },
  {
    name: 'Liam Paull',
    affiliation: 'University of Montreal, Mila',
    image: '/contributors/liam.webp',
    link: 'https://liampaull.ca/',
  },
  {
    name: 'Federico Tombari',
    affiliation: 'Google, TU Munich',
    image: '/contributors/federico.webp',
    link: 'https://federicotombari.github.io/',
  },
  {
    name: 'Luca Carlone',
    affiliation: 'MIT',
    image: '/contributors/luca.webp',
    link: 'https://lucacarlone.mit.edu/',
  },
  {
    name: 'Kai O. Arras',
    affiliation: 'University of Stuttgart',
    image: '/contributors/kai.webp',
    link: 'https://www.ki.uni-stuttgart.de/departments/sir/',
  },
];

const colors = ['#D6A99D', '#e7cf77ff', '#c2ce97ff', '#9CAFAA'];

const About: React.FC = () => {
  return (
    <Container className="mt-3 base_container px-0">
      <h3 className="mb-4">Survey paper authors</h3>
      <Row xs={1} sm={2} md={3} className="g-4 justify-content-center mb-4">
        {authors.map((author, idx) => {
          const color = colors[idx % colors.length];
          return (
            <Col key={idx} className="d-flex justify-content-center">
              <Card
                className="h-100 shadow-sm"
                style={{
                  borderRadius: '12px',
                  backgroundColor: '#F7F7F7',
                  minWidth: '243px',
                  maxWidth: '300px',
                }}
              >
                <Card.Body className="d-flex flex-column flex-grow-1 justify-content-center align-items-center text-center">
                  {/* Image + link */}
                  <a
                    href={author.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none' }}
                  >
                    <div
                      style={{
                        width: '200px',
                        height: '200px',
                        marginBottom: '15px',
                        borderRadius: '50%',
                        padding: '5px',
                        backgroundColor: color,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      {author.image ? (
                        <Image
                          src={author.image}
                          roundedCircle
                          fluid
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            border: `5px solid ${color}`,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            backgroundColor: '#D6DAC8',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            color: '#fff',
                            fontWeight: 'bold',
                            fontSize: '2rem',
                          }}
                        >
                          ?
                        </div>
                      )}
                    </div>
                  </a>
                  <Card.Title style={{ marginBottom: '5px', fontSize: '1.2rem' }}>
                    {author.name}
                  </Card.Title>
                  <Card.Text style={{ color: '#6B6B6B' }}>{author.affiliation}</Card.Text>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>
    </Container>
  );
};

export default About;
