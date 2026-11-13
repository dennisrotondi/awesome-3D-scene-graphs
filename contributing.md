# Contribution Guidelines

Thank you for helping keep this list up to date!

## Adding or editing a paper

All papers live in the [`papers/`](papers/) folder at the root of this repository:  one JSON file per paper, named after its BibTeX key (e.g. `papers/rotondi2026survey.json`). To add a new paper, add a new file; to edit an existing one, find the file by looking up the BibTeX key on the paper's page at [3dscenegraphs.com](https://3dscenegraphs.com), or search by title, e.g. `grep -rl "Paper Title" papers/`. Then modify the file directly and open a pull request.

The easiest way to generate a correctly formatted entry is to use the form at [3dscenegraphs.com/contribute](https://3dscenegraphs.com/contribute), fill in the fields, and download the resulting JSON file. Place it in the `papers/` folder and open a PR.

Each entry follows this structure:

```json
{
  "TITLE": "Paper Title",
  "VENUE": "CVPR24",
  "DATE": "2024/06/15",
  "AUTHOR": "First Last, First Last, First Last",
  "ABSTRACT": "Short abstract...",
  "ARXIV": "https://arxiv.org/abs/XXXX.XXXXX",
  "FIRSTINSTITUTE": "MIT",
  "KEYWORD": "SUN, Indoor, Open-Vocabulary",
  "SITE": "https://project-page.github.io/",
  "CODE": "https://github.com/author/repo",
  "VIDEO": "",
  "BIBTEX": "@inproceedings{...}"
}
```

**Field notes:**
- `VENUE`: venue abbreviation + 2-digit year (e.g. `IROS25`, `RAL24`, `arXiv25`)
- `DATE`: format `YYYY/MM/DD` using the publication or arXiv submission date
- `ARXIV`: the arXiv abstract link, exactly `https://arxiv.org/abs/XXXX.XXXXX` (no `www.`, `/pdf/` or version suffix); if the paper is not on arXiv, the link to the published version (DOI, publisher page, proceedings) instead
- `KEYWORD`: comma-separated from the controlled list in [`scripts/constants.py`](scripts/constants.py), use the exact casing shown there
- `BIBTEX`: paste the BibTeX entry; leave as `""` only if unavailable
- `SITE`, `CODE`, `VIDEO`: leave as `""` if not available

Once your PR is merged, the README and the website update automatically.

## Automated checks

When you open a PR, a GitHub Action validates every paper file you changed. It checks that each file:

- is valid UTF-8 JSON with **exactly** the fields above (a missing or misspelled key fails);
- has a non-empty `TITLE`, `VENUE`, `DATE`, `AUTHOR`, `ABSTRACT`, `ARXIV`, and `FIRSTINSTITUTE`;
- uses `DATE` as `YYYY/MM/DD` (a real, non-future date), `VENUE` ending in a 2-digit year, and `KEYWORD`s drawn exactly (casing included) from [`scripts/constants.py`](scripts/constants.py);
- has well-formed `http(s)` links (an arXiv link in `ARXIV` in the `https://arxiv.org/abs/<id>` form), and a `BIBTEX` entry starting with `@`;
- is not a duplicate of an existing entry — by arXiv id, or by title when the link is a proceedings/journal page with no arXiv id;
- changes exactly **one** paper — open a separate PR per paper.

A PR may only add or edit files under `papers/`. You can run the exact same checks locally before pushing (no dependencies needed):

```bash
python scripts/validate_papers.py papers/yourpaper.json   # just your file
python scripts/validate_papers.py                          # the whole folder
```

> Maintainers: to land a PR that also touches scripts, workflows, or the README, add the `allow-infra` label to that PR.

## Updating your PR

If the maintainers request changes, edit your existing PR rather than opening a new one. [Here is a guide](https://github.com/RichardLitt/knowledge/blob/master/github/amending-a-commit-guide.md) on how to amend a PR.

## Reporting errors

If you notice a mistake in an existing entry, open a PR fixing the relevant field in the paper's file inside `papers/`, or [contact the maintainer](https://dennisrotondi.com/#contact) directly.
