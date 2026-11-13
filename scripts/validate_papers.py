#!/usr/bin/env python3
"""Validate paper JSON entries for awesome-3D-scene-graphs.

The controlled vocabularies (KEYWORDS, VENUES) live in scripts/constants.py and
are imported here so the validation rules never drift from what json_to_md.py and
the website expect. Standard library only -- no pip/uv install needed to run it.

Besides the per-field schema checks, validate_bibtex() keeps the BIBTEX entry
coherent with the structured fields: it errors when VENUE and the BibTeX disagree
on whether the paper is an arXiv preprint or a published work (the classic "paper
got accepted, VENUE was bumped, but the BibTeX still says arXiv" drift), when the
BibTeX year doesn't match the VENUE year, or when a conference acronym is wrong;
cosmetic venue-string differences are only warnings.

Usage:
    python scripts/validate_papers.py                  # validate every papers/*.json
    python scripts/validate_papers.py papers/foo.json  # validate just these files
                                                       # (duplicate arXiv ids are still
                                                       #  checked against the whole folder)

Exit 0 = no hard errors. Non-zero = at least one hard error.
Warnings are printed but never change the exit code.
"""
from __future__ import annotations

import collections
import datetime
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

SCRIPTS_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPTS_DIR.parent
PAPERS_DIR = REPO_ROOT / "papers"

# Import the controlled vocabularies from the existing single source of truth.
sys.path.insert(0, str(SCRIPTS_DIR))
from constants import KEYWORDS, VENUES  # noqa: E402

# --- the schema -------------------------------------------------------------
# Every paper file must contain exactly these keys (no more, no fewer).
REQUIRED_NONEMPTY = (
    "TITLE", "VENUE", "DATE", "AUTHOR", "ABSTRACT", "ARXIV", "FIRSTINSTITUTE",
)
# Must be present, but may be "" (KEYWORD-empty just drops the paper into the
# README "Other" section; SITE/CODE/VIDEO/BIBTEX are genuinely optional).
PRESENT_MAYBE_EMPTY = ("KEYWORD", "SITE", "CODE", "VIDEO", "BIBTEX")
ALL_KEYS = set(REQUIRED_NONEMPTY) | set(PRESENT_MAYBE_EMPTY)
URL_FIELDS = ("ARXIV", "SITE", "CODE", "VIDEO")

DATE_RE = re.compile(r"^[0-9]{4}/[0-9]{2}/[0-9]{2}$")
FNAME_RE = re.compile(r"^[A-Za-z0-9_]+\.json$")
ARXIV_ID_RE = re.compile(r"arxiv\.org/(?:abs|pdf)/([0-9]{4}\.[0-9]{4,6})")
ARXIV_CANON_RE = re.compile(r"^https://arxiv\.org/abs/[0-9]{4}\.[0-9]{4,5}$")
BIB_HEADER_RE = re.compile(r"@(\w+)\s*\{\s*([^,]+),")
TITLE_NORM_RE = re.compile(r"[^a-z0-9]+")

errors: list[str] = []
warnings: list[str] = []


def err(name: str, msg: str) -> None:
    errors.append(f"❌ {name}: {msg}")


def warn(name: str, msg: str) -> None:
    warnings.append(f"⚠️  {name}: {msg}")


def norm_title(t: str) -> str:
    """Normalize a title for duplicate detection: lowercase, then drop everything
    that is not a letter or digit, so case/spacing/punctuation variants collapse."""
    return TITLE_NORM_RE.sub("", t.lower())


def is_http_url(value: str) -> bool:
    try:
        p = urlparse(value)
    except ValueError:
        return False
    return p.scheme in ("http", "https") and bool(p.netloc)


def norm_venue(s: str) -> str:
    """Normalize a venue string for comparison: drop braces, collapse whitespace,
    lowercase. Absorbs the cosmetic differences between hand-written BibTeX and the
    canonical VENUES expansion (e.g. '{IEEE} Access' vs 'IEEE Access')."""
    return re.sub(r"\s+", " ", re.sub(r"[{}]", "", s)).strip().lower()


def extract_bib_field(bib: str, field: str) -> str | None:
    """Return the value of a top-level `field = {...}` (or `field = value`) in a
    BibTeX entry, or None if the field is absent.

    Brace-aware: nested braces inside the value are preserved and the matching outer
    brace ends the value, so a trailing stray '}' after a balanced value is ignored
    (the entry-wide brace-balance check flags that separately). An unbalanced opening
    brace returns the rest of the string. `\\b` keeps 'title' from matching inside
    'booktitle'."""
    m = re.search(rf"\b{field}\s*=\s*", bib, re.I)
    if not m:
        return None
    i = m.end()
    if i < len(bib) and bib[i] == "{":
        depth = 0
        for j in range(i, len(bib)):
            if bib[j] == "{":
                depth += 1
            elif bib[j] == "}":
                depth -= 1
                if depth == 0:
                    return bib[i + 1:j].strip()
        return bib[i + 1:].strip()  # unbalanced opening brace
    m2 = re.match(r'"?([^,\n}"]+)', bib[i:])
    return m2.group(1).strip() if m2 else None


def bib_venue(bib: str) -> tuple[str | None, str | None]:
    """Return (field-name, value) of the BibTeX venue -- booktitle or journal --
    or (None, None) if neither is present (i.e. an arXiv-style @misc entry)."""
    for f in ("booktitle", "journal"):
        v = extract_bib_field(bib, f)
        if v is not None:
            return f, v
    return None, None


def validate_bibtex(name: str, bib: str, venue: str) -> None:
    """Validate that BIBTEX is well-formed and stays coherent with the structured
    fields -- above all with VENUE. The classic bug this guards against: a paper
    gets accepted, VENUE is bumped from 'arXivNN' to the conference, but the BibTeX
    is left as the old arXiv @misc entry. That is a hard error; cosmetic venue-string
    differences are only warnings."""
    bs = bib.lstrip()
    if not bs.startswith("@"):
        err(name, "BIBTEX should start with '@'")
    if bib.count("{") != bib.count("}"):
        warn(name, "BIBTEX has unbalanced { } braces (a stray or missing brace?)")

    m = BIB_HEADER_RE.match(bs)
    if not m:
        err(name, "BIBTEX is not a parseable entry (expected '@type{key, ...}')")
        return
    key = m.group(2).strip()
    if key != name[:-5]:
        warn(name, f"filename stem {name[:-5]!r} != BibTeX key {key!r} "
                   "(convention: name the file after the BibTeX key)")
    for f in ("title", "author", "year"):
        if extract_bib_field(bib, f) is None:
            warn(name, f"BIBTEX is missing a {f} field")

    # --- coherence with VENUE ------------------------------------------------
    # VENUE is '<abbrev><2-digit-year>'; if it is malformed it already errored in
    # the VENUE block, so there is nothing reliable to compare against here.
    if not venue or not re.search(r"[0-9]{2}$", venue):
        return
    abbr = venue[:-2].lower()
    acro = venue[:-2]
    expected_year = f"20{venue[-2:]}"
    canon = VENUES.get(abbr, "")

    is_arxiv_field = abbr == "arxiv"
    vfield, vval = bib_venue(bib)
    # "arXiv-class" BibTeX = no real booktitle/journal (an @misc), or one literally
    # valued 'arXiv...'. We key off the *absence of a published venue* rather than the
    # presence of eprint/archivePrefix, because published entries may legitimately
    # keep an eprint line next to their booktitle.
    is_arxiv_bib = (vval is None) or ("arxiv" in vval.lower())

    if is_arxiv_field and not is_arxiv_bib:
        err(name, f"VENUE {venue!r} is an arXiv preprint, but the BIBTEX gives a "
                  f"published venue ({vfield} = {vval!r}). Make VENUE and BibTeX agree.")
    elif (not is_arxiv_field) and is_arxiv_bib:
        shown = f"{vfield} = {vval!r}" if vval is not None else "no booktitle/journal"
        err(name, f"VENUE {venue!r} is a published venue"
                  + (f" ({canon!r})" if canon else "")
                  + f", but the BIBTEX still describes an arXiv preprint ({shown}). "
                  "Regenerate the BibTeX for the accepted venue.")

    # year must track the VENUE year
    byear = extract_bib_field(bib, "year")
    if byear:
        digits = re.search(r"\d{4}", byear)
        if digits and digits.group(0) != expected_year:
            err(name, f"BIBTEX year {digits.group(0)} does not match the VENUE year "
                      f"{expected_year} (from VENUE {venue!r}).")

    # venue-string coherence when both sides are a published venue
    if (not is_arxiv_field) and (not is_arxiv_bib) and vval is not None and canon:
        if norm_venue(vval) != norm_venue(canon):
            # If the canonical VENUES entry carries a parenthetical acronym (e.g.
            # '(ICRA)'), that acronym is a reliable anchor: its absence from the
            # BibTeX venue means a genuinely wrong conference -> hard error. Without
            # such an anchor (most journals) we can only warn on the difference.
            anchored = f"({acro.lower()})" in norm_venue(canon)
            if anchored and not re.search(rf"\b{re.escape(acro)}\b", vval, re.I):
                err(name, f"BIBTEX {vfield} {vval!r} is not the {acro} venue expected "
                          f"from VENUE {venue!r} ({canon!r}). Update the BibTeX venue.")
            else:
                warn(name, f"BIBTEX {vfield} {vval!r} differs from the canonical VENUES "
                           f"entry {canon!r} (formatting, or a different venue?).")


def validate_file(path: Path, arxiv_to_files: dict[str, list[str]],
                  title_to_files: dict[str, list[str]]) -> None:
    name = path.name

    # --- extension / location ---
    if path.suffix != ".json":
        err(name, "not a .json file")
        return
    try:
        path.resolve().relative_to(PAPERS_DIR)
    except ValueError:
        err(name, "file is outside the papers/ folder")
        return
    if name.startswith("_"):
        return  # templates / helper files are not paper entries
    if not FNAME_RE.match(name):
        err(name, "filename must match [A-Za-z0-9_]+.json (no spaces, dashes or extra dots)")

    # --- bytes / encoding / parse ---
    raw = path.read_bytes()
    if raw.startswith(b"\xef\xbb\xbf"):
        err(name, "file has a UTF-8 BOM; re-save as UTF-8 without BOM")
        return
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as e:
        err(name, f"not valid UTF-8: {e}")
        return
    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        err(name, f"invalid JSON: {e}")
        return
    if not isinstance(data, dict):
        err(name, "top-level JSON must be an object")
        return

    # --- key set: exactly ALL_KEYS ---
    keys = set(data)
    for missing in sorted(ALL_KEYS - keys):
        err(name, f"missing required key {missing!r}")
    for extra in sorted(keys - ALL_KEYS):
        err(name, f"unexpected key {extra!r} (typo, or not part of the schema)")

    # all values must be strings
    for k in sorted(keys & ALL_KEYS):
        if not isinstance(data[k], str):
            err(name, f"{k} must be a string, got {type(data[k]).__name__}")

    # required fields must be non-empty
    for k in REQUIRED_NONEMPTY:
        if isinstance(data.get(k), str) and not data[k].strip():
            err(name, f"{k} is empty")

    def sval(k: str) -> str:
        v = data.get(k, "")
        return v.strip() if isinstance(v, str) else ""

    # --- DATE: YYYY/MM/DD, a real date, not (implausibly) in the future ---
    dt = sval("DATE")
    if dt:
        if not DATE_RE.match(dt):
            err(name, f"DATE {dt!r} is not in YYYY/MM/DD format")
        else:
            try:
                d = datetime.datetime.strptime(dt, "%Y/%m/%d").date()
            except ValueError:
                err(name, f"DATE {dt!r} is not a real calendar date")
            else:
                today = datetime.date.today()
                if d > today:
                    if d.year > today.year + 1:
                        err(name, f"DATE {dt} is implausibly far in the future (year typo?)")
                    else:
                        warn(name, f"DATE {dt} is in the future")

    # --- VENUE: <abbrev><2-digit year>; abbrev should be known ---
    v = sval("VENUE")
    if v:
        if not re.search(r"[0-9]{2}$", v):
            err(name, f"VENUE {v!r} must end with a 2-digit year (e.g. CVPR25, arXiv25)")
        else:
            abbr = v[:-2].lower()
            if abbr and abbr not in VENUES:
                warn(name, f"VENUE abbrev {abbr!r} not in constants.VENUES (typo, or add it there)")

    # --- KEYWORD: comma-separated, every token from the controlled list ---
    kw_raw = sval("KEYWORD")
    if not kw_raw:
        warn(name, "KEYWORD is empty (paper will land in the README 'Other' section)")
    else:
        toks = [t.strip() for t in kw_raw.split(",")]
        if any(t == "" for t in toks):
            warn(name, "KEYWORD has an empty entry (trailing or double comma?)")
        for t in toks:
            if t and t not in KEYWORDS:
                err(name, f"KEYWORD {t!r} is not in the controlled list (check casing against constants.KEYWORDS)")

    # --- URL fields: valid http(s) when present ---
    for k in URL_FIELDS:
        val = sval(k)
        if val and not is_http_url(val):
            err(name, f"{k} is not a valid http(s) URL: {val!r}")

    # --- ARXIV: the paper's link -- its arXiv abstract page, or the published
    #     version (DOI, publisher, proceedings) when it has no arXiv version.
    #     Present + valid URL is already enforced above (REQUIRED_NONEMPTY +
    #     URL_FIELDS). An arXiv link must use the one canonical form, so the
    #     duplicate check and the citation lookup see the same id everywhere. ---
    ax = sval("ARXIV")
    host = (urlparse(ax).hostname or "") if ax else ""
    if ax and is_http_url(ax) and (host == "arxiv.org" or host.endswith(".arxiv.org")):
        if not ARXIV_CANON_RE.match(ax):
            err(name, f"ARXIV arXiv links must be https://arxiv.org/abs/<id> "
                      f"(no www., /pdf/ or version suffix): {ax!r}")

    # --- BIBTEX: optional; if present must be well-formed and stay coherent with
    #     the structured fields (above all VENUE -- see validate_bibtex). ---
    bib = data.get("BIBTEX", "")
    if isinstance(bib, str):
        if not bib.strip():
            warn(name, "BIBTEX is empty (paste the entry when available)")
        else:
            validate_bibtex(name, bib, sval("VENUE"))

    # --- duplicate arXiv id across the whole folder (arxiv.org links only) ---
    m = ARXIV_ID_RE.search(sval("ARXIV"))
    if m:
        others = [f for f in arxiv_to_files.get(m.group(1), []) if f != name]
        if others:
            err(name, f"duplicate arXiv id {m.group(1)} (also in {', '.join(sorted(others))})")

    # --- duplicate title across the whole folder (the fallback for papers whose
    #     ARXIV is a published-version link with no arXiv id to compare) ---
    nt = norm_title(sval("TITLE"))
    if nt:
        others = [f for f in title_to_files.get(nt, []) if f != name]
        if others:
            err(name, f"duplicate title (also in {', '.join(sorted(others))}) -- "
                      "is this paper already in the list?")


def build_indexes(files: list[Path]) -> tuple[dict[str, list[str]], dict[str, list[str]]]:
    """Map arXiv id -> [filenames] and normalized-title -> [filenames] across every
    (parseable) file, so duplicates are detected regardless of which subset is
    being validated."""
    arxiv_idx: dict[str, list[str]] = collections.defaultdict(list)
    title_idx: dict[str, list[str]] = collections.defaultdict(list)
    for p in files:
        try:
            d = json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            continue  # malformed files are reported by validate_file
        m = ARXIV_ID_RE.search(str(d.get("ARXIV", "")))
        if m:
            arxiv_idx[m.group(1)].append(p.name)
        nt = norm_title(str(d.get("TITLE", "")))
        if nt:
            title_idx[nt].append(p.name)
    return arxiv_idx, title_idx


def main(argv: list[str]) -> int:
    if not PAPERS_DIR.is_dir():
        print(f"papers/ folder not found at {PAPERS_DIR}")
        return 2

    all_files = sorted(p for p in PAPERS_DIR.glob("*.json") if not p.name.startswith("_"))
    arxiv_to_files, title_to_files = build_indexes(all_files)

    if argv:
        targets = [Path(a) for a in argv]
        real = [t for t in targets if not t.name.startswith("_")]
        if len(real) > 1:
            err("(PR)", f"{len(real)} paper files changed in one PR; please open one PR per paper")
    else:
        targets = all_files
        real = all_files

    for path in targets:
        if not path.exists():
            err(path.name, "file does not exist")
            continue
        validate_file(path, arxiv_to_files, title_to_files)

    for w in warnings:
        print(w)
    for e in errors:
        print(e)

    print()
    if errors:
        print(f"\U0001f6d1 {len(errors)} error(s), {len(warnings)} warning(s). Fix the errors and push again.")
        return 1
    print(f"✅ OK -- {len(real)} file(s) validated, {len(warnings)} warning(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
