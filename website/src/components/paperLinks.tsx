import React from 'react';
import { FaHome, FaGithub, FaYoutube, FaBookOpen } from 'react-icons/fa';
import { FaRegFilePdf } from 'react-icons/fa';
import type { Paper } from './papers';

export type PaperLink = { url: string; label: string; icon: React.ReactElement };

// The ARXIV field holds the arXiv abstract link, or the published version
// (DOI, publisher, proceedings) for papers without an arXiv version, so the
// button is labelled by where it actually leads.
function paperLink(url: string): PaperLink {
  const isArxiv = /(^|\.)arxiv\.org$/i.test(safeHost(url));
  return isArxiv
    ? { url, label: 'arXiv', icon: <FaRegFilePdf /> }
    : { url, label: 'Paper', icon: <FaBookOpen /> };
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

export function getPaperLinks(paper: Paper): PaperLink[] {
  return [
    { url: paper.SITE, label: 'Website', icon: <FaHome /> },
    { url: paper.CODE, label: 'Code', icon: <FaGithub /> },
    paperLink(paper.ARXIV),
    { url: paper.VIDEO, label: 'Video', icon: <FaYoutube /> },
  ].filter((l) => Boolean(l.url));
}
