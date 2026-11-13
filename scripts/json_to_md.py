"""Generate README.md from the papers/ folder.

Each paper can appear in multiple sections based on its keywords.
Can be run from anywhere:
    uv run python json_to_md.py              # from scripts/
    uv run python scripts/json_to_md.py      # from repo root
"""
import argparse
import json
import os
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent

import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns
from loguru import logger

# Maps README section name → set of keywords that place a paper there.
# A paper appears in every section whose keyword set it intersects.
SECTION_KEYWORDS = {
    "3D Scene Understanding": {
        "SUN",
    },
    "Generation and Mapping": {
        "SLAM", "RGB-D", "LiDAR", "Pre-Built PCD",
        "Incremental", "Real-Time", "Active",
        "Short-Term Dynamics", "Long-Term Dynamics", "Compression",
    },
    "Navigation": {
        "Navigation",
    },
    "Planning": {
        "Planning", "Manipulation",
    },
    "Dataset": {
        "Dataset",
    },
}

SECTION_ORDER = [
    "3D Scene Understanding",
    "Generation and Mapping",
    "Navigation",
    "Planning",
    "Dataset",
    "Other",
]

SECTION_EMOJI = {
    "3D Scene Understanding": "🏛️",
    "Generation and Mapping": "🗺️",
    "Navigation": "🚀",
    "Planning": "🤔",
    "Other": "📌",
    "Dataset": "📚",
}

README_HEADER = """\
# Awesome 3D Scene Graphs  [![Awesome](https://awesome.re/badge.svg)](https://awesome.re) [![PR's Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat)](http://makeapullrequest.com)

A curated list of papers on 3D Scene Graphs (3DSGs), covering generation and applications \
such as autonomous navigation, robotic manipulation, scene understanding, path planning, and multi-robot collaboration.

This repository accompanies the survey paper **["3D Scene Graphs: Open Challenges and Future Directions"](https://doi.org/10.1146/annurev-control-031025-014243)**, \
published in the *Annual Review of Control, Robotics, and Autonomous Systems* ([arXiv](https://arxiv.org/abs/2606.19383)), \
a comprehensive review of the 3DSG literature. \
It also contains the source code for the companion website at [3dscenegraphs.com](https://3dscenegraphs.com). \
The paper database lives in the [`papers/`](papers) folder (one JSON file per paper) and drives both this README and the website. \
To add or edit a paper, open a PR adding or modifying a file in [`papers/`](papers) \
(see [contributing.md](contributing.md) for the field format).

## 📑 Contents
"""

FOOTER = """\
## Statistics
![papers by year](plots/papers_by_year.png)
![papers by publication](plots/papers_by_publication.png)
"""


def get_sections(paper: dict) -> list[str]:
    keywords = {kw.strip() for kw in paper.get("KEYWORD", "").split(",") if kw.strip()}
    sections = [s for s in SECTION_ORDER if s != "Other" and SECTION_KEYWORDS[s] & keywords]
    if not sections:
        logger.warning(f"No section match, placing in Other: {paper.get('TITLE', '?')[:70]}")
        return ["Other"]
    return sections


def make_extra(paper: dict) -> str:
    parts = []
    if paper.get("SITE", "").strip():
        parts.append(f"[project]({paper['SITE'].strip()})")
    if paper.get("CODE", "").strip():
        parts.append(f"[github]({paper['CODE'].strip()})")
    return ", ".join(parts) if parts else "-"


def build_section_table(papers: list[dict], section: str) -> str:
    rows = []
    for paper in papers:
        if section not in get_sections(paper):
            continue
        date_parts = paper["DATE"].strip().split("/")
        rows.append({
            "Date": "-".join(date_parts[:2]),
            "Publication": paper["VENUE"],
            "Paper": f"[{paper['TITLE']}]({paper['ARXIV']})",
            "Institute (first)": paper["FIRSTINSTITUTE"],
            "Extra": make_extra(paper),
        })
    if not rows:
        return ""
    return pd.DataFrame(rows).sort_values("Date").to_markdown(index=False)


def generate_plots(papers: list[dict], plots_dir: str = "plots") -> None:
    os.makedirs(plots_dir, exist_ok=True)

    years = [p["DATE"].strip().split("/")[0] for p in papers if p.get("DATE")]
    year_counts = pd.Series(years).value_counts().sort_index().reset_index()
    year_counts.columns = ["year", "count"]

    plt.figure(figsize=(12, 6))
    sns.barplot(x="year", y="count", data=year_counts, hue="count", palette="viridis", legend=False)
    plt.title("Papers by Year", fontsize=16)
    plt.xlabel(""), plt.ylabel("")
    plt.xticks(rotation=45)
    plt.grid(axis="y")
    plt.tight_layout()
    plt.gca().yaxis.set_major_locator(plt.MaxNLocator(integer=True))
    plt.savefig(f"{plots_dir}/papers_by_year.png", dpi=300)
    plt.close()

    pubs = [p["VENUE"][:-2] for p in papers if p.get("VENUE") and p["VENUE"][:-2].lower() != "arxiv"]
    pub_counts = pd.Series(pubs).value_counts().reset_index()
    pub_counts.columns = ["publication", "count"]

    plt.figure(figsize=(12, 6))
    sns.barplot(x="publication", y="count", data=pub_counts, hue="count", palette="coolwarm", legend=False)
    plt.title("Papers by Publication", fontsize=16)
    plt.xlabel(""), plt.ylabel("")
    plt.xticks(rotation=45)
    plt.grid(axis="y")
    plt.tight_layout()
    plt.gca().yaxis.set_major_locator(plt.MaxNLocator(integer=True))
    plt.savefig(f"{plots_dir}/papers_by_publication.png", dpi=300)
    plt.close()


def generate_readme(papers: list[dict], output_path: str) -> None:
    toc_lines = []
    for section in SECTION_ORDER:
        emoji = SECTION_EMOJI.get(section, "")
        anchor = section.lower().replace(" ", "-")
        toc_lines.append(f"- [{section}](#{anchor}) {emoji}")
    toc_lines.append("- [Statistics](#statistics) 📊")

    body = README_HEADER + "\n".join(toc_lines) + "\n\n"

    for section in SECTION_ORDER:
        table = build_section_table(papers, section)
        if table:
            body += f"## {section}\n{table} \n\n"

    body += FOOTER

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(body)
    logger.info(f"README written to {output_path} ({len(papers)} papers)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input_papers", nargs="?", default=str(REPO_ROOT / "papers"))
    parser.add_argument("output_md", nargs="?", default=str(REPO_ROOT / "README.md"))
    parser.add_argument("--plots-dir", default=str(REPO_ROOT / "plots"))
    parser.add_argument("--no-plots", action="store_true", help="Skip plot generation")
    args = parser.parse_args()

    papers_dir = Path(args.input_papers)
    papers = [json.loads(p.read_text(encoding="utf-8")) for p in sorted(papers_dir.glob("*.json"))]

    logger.info(f"Loaded {len(papers)} papers from {papers_dir}")

    if not args.no_plots:
        generate_plots(papers, args.plots_dir)

    generate_readme(papers, args.output_md)
