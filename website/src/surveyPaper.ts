export const GITHUB_REPO = 'https://github.com/DennisRotondi/awesome-3D-scene-graphs';

// === Single source of truth for the survey link ===========================
// The survey is published in the Annual Review of Control, Robotics, and
// Autonomous Systems (ARCRAS), and the preprint stays on arXiv. The journal DOI
// is the primary link (it is what people should cite); the arXiv abstract and
// PDF stay as the open-access copy. The url, pdf and BibTeX below all derive
// from DOI and ARXIV_ID, so that one edit links them everywhere on the site.
const DOI = '10.1146/annurev-control-031025-014243';
const ARXIV_ID = '2606.19383';
const TITLE = '3D Scene Graphs: Open Challenges and Future Directions';
const JOURNAL = 'Annual Review of Control, Robotics, and Autonomous Systems';
// "Last, First" order (matches papers/rotondi2026survey.json so the Home cite
// box and the survey's paper page show the same BibTeX); the surname order also
// disambiguates the multi-word "Rosenberger Schmid".
const AUTHORS =
  'Rotondi, Dennis and Argenziano, Francesco and Koch, Sebastian and Hughes, Nathan and ' +
  'Büchner, Martin and Wald, Johanna and Rosenberger Schmid, Lukas and Nardi, Daniele and ' +
  'Valada, Abhinav and Paull, Liam and Tombari, Federico and Carlone, Luca and Arras, Kai O.';

export const SURVEY = {
  comingSoon: false,
  title: TITLE,
  journal: JOURNAL,
  year: 2026,
  url: `https://doi.org/${DOI}`,
  arxiv: `https://arxiv.org/abs/${ARXIV_ID}`,
  pdf: `https://arxiv.org/pdf/${ARXIV_ID}`,
  // First page of the paper, rendered to a 612px WebP (~74 KB): it is shown at
  // ~200-260px wide, where the previous vector export (394 KB, 69 embedded
  // images) only cost download size.
  cover: 'preview.webp',
  // TODO: once the article leaves "In press" and volume 10 is out (2027), add
  // `pages`, set `year` to the volume year, and drop the `note` (also in
  // papers/rotondi2026survey.json, whose VENUE then becomes ARCRAS27).
  bibtex: `@article{rotondi2026survey,
  title = {${TITLE}},
  author = {${AUTHORS}},
  journal = {${JOURNAL}},
  volume = {10},
  year = {2026},
  doi = {${DOI}},
  publisher = {Annual Reviews},
  note = {In press}
}`,
};
