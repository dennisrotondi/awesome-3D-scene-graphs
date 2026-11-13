// ==============================================================================
// Paper link rules
// ==============================================================================

// The same rules scripts/validate_papers.py applies in CI, shared by the
// Contribute form (so it never accepts a link CI would reject) and the paper
// page (which labels the ARXIV link by where it leads).

/** An absolute http(s) URL with a host, like `is_http_url` in the validator. */
export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && Boolean(url.hostname);
  } catch {
    return false;
  }
}

/** True when the URL's host is arxiv.org or one of its subdomains. Decided on
 *  the host, so a publisher URL that mentions arxiv.org in its path or query
 *  does not count. */
export function isArxivUrl(value: string): boolean {
  try {
    return /(^|\.)arxiv\.org$/i.test(new URL(value).hostname);
  } catch {
    return false;
  }
}

/** The one accepted form of an arXiv link: the abstract page, no `www.`,
 *  no `/pdf/`, no version suffix. */
export const ARXIV_ABS_RE = /^https:\/\/arxiv\.org\/abs\/\d{4}\.\d{4,5}$/;
