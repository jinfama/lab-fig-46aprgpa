"""Build a self-contained dashboard inside a project at <project>/dashboard/.

The dashboard is a 3-tab static site (Status / Figures / Papers) that lives
INSIDE the project. It is fully local — no git, no hub, no network.

Layout produced:

    <project>/dashboard/
        index.html             ← shell with tabs
        _status.html           ← copy of <project>/STATUS.html (if present)
        _figures.html          ← dashboard from <project>/figures/
        _figures.meta.json     ← {"n_total": N}
        _papers/<slug>.html    ← one per <project>/papers/<paper>/manuscript.pdf

Open <project>/dashboard/index.html with a browser to view it. Nothing else.

To make it accessible from mobile, see publish-hub.py — it COPIES this folder
to the public hub on demand. It does not generate anything itself.

Usage:
    python dashboard.py --project <path>
    python dashboard.py --project <path> --only figures
    python dashboard.py --project <path> --only papers
    python dashboard.py --project <path> --only status

If --project is omitted, the current working directory is used.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from pathlib import Path

# Allow importing builders from same folder
sys.path.insert(0, str(Path(__file__).parent))
from build_dashboard import build_dashboard, count_figures_recursive  # noqa: E402
from build_paper_html import build_paper_html  # noqa: E402
from build_shell import build_shell  # noqa: E402


def slugify(s: str) -> str:
    s = re.sub(r"[^\w\s-]", "", s.lower())
    s = re.sub(r"[\s_]+", "-", s).strip("-")
    return s or "project"


def _sync_status(project_dir: Path, dashboard_dir: Path) -> bool:
    src = project_dir / "STATUS.html"
    dst = dashboard_dir / "_status.html"
    if src.is_file():
        shutil.copy2(src, dst)
        print(f"[status] copied {src.name} ({dst.stat().st_size // 1024} kb)")
        return True
    if dst.exists():
        dst.unlink()
        print(f"[status] removed stale {dst.name} (no STATUS.html in project)")
    else:
        print(f"[status] no STATUS.html in project - tab will show placeholder")
    return False


def _sync_figures(project_dir: Path, dashboard_dir: Path) -> int:
    figures_dir = project_dir / "figures"
    dst = dashboard_dir / "_figures.html"
    meta = dashboard_dir / "_figures.meta.json"

    if not figures_dir.is_dir():
        for p in (dst, meta):
            if p.exists():
                p.unlink()
        print(f"[figures] no figures/ folder - tab will show placeholder")
        return 0

    n_total = count_figures_recursive(figures_dir)
    if n_total == 0:
        for p in (dst, meta):
            if p.exists():
                p.unlink()
        print(f"[figures] figures/ exists but has no PNGs - tab will show placeholder")
        return 0

    title = f"{project_dir.name} - figuras"
    build_dashboard(figures_dir, title, dst)
    meta.write_text(json.dumps({"n_total": n_total}), encoding="utf-8")
    return n_total


def _discover_papers(project_dir: Path) -> list[Path]:
    """Find PDFs to publish:
       - <project>/papers/<paper>/manuscript.pdf  (canonical, plural)
       - <project>/papers/<paper>/*.pdf           (single PDF fallback)
       - <project>/paper/manuscript.pdf           (singular folder, single paper)
       - <project>/paper/*.pdf                    (single PDF fallback in singular)
    """
    found: list[Path] = []
    papers_root = project_dir / "papers"
    if papers_root.is_dir():
        for sub in sorted(p for p in papers_root.iterdir() if p.is_dir()):
            if sub.name.startswith(".") or sub.name.startswith("_"):
                continue
            canonical = sub / "manuscript.pdf"
            if canonical.is_file():
                found.append(canonical)
                continue
            pdfs = sorted(sub.glob("*.pdf"))
            if len(pdfs) == 1:
                found.append(pdfs[0])

    paper_singular = project_dir / "paper"
    if not found and paper_singular.is_dir():
        canonical = paper_singular / "manuscript.pdf"
        if canonical.is_file():
            found.append(canonical)
        else:
            pdfs = sorted(paper_singular.glob("*.pdf"))
            if len(pdfs) == 1:
                found.append(pdfs[0])
    return found


def _sync_papers(project_dir: Path, dashboard_dir: Path,
                 dpi: int, quality: int) -> list[dict]:
    papers_out = dashboard_dir / "_papers"
    pdfs = _discover_papers(project_dir)

    if not pdfs:
        if papers_out.exists():
            shutil.rmtree(papers_out)
        print(f"[papers] no papers/<x>/manuscript.pdf - tab will show placeholder")
        return []

    papers_out.mkdir(exist_ok=True)
    index: list[dict] = []
    seen_slugs = set()

    for pdf in pdfs:
        if pdf.parent.name == "paper":
            paper_dir_name = pdf.stem
        else:
            paper_dir_name = pdf.parent.name
        paper_slug = slugify(paper_dir_name)
        base = paper_slug
        i = 2
        while paper_slug in seen_slugs:
            paper_slug = f"{base}-{i}"
            i += 1
        seen_slugs.add(paper_slug)

        out_html = papers_out / f"{paper_slug}.html"
        title = paper_dir_name
        print(f"[papers] {pdf.parent.name}/{pdf.name} -> _papers/{paper_slug}.html")
        build_paper_html(pdf, title, out_html, dpi=dpi, quality=quality)
        index.append({
            "slug": paper_slug,
            "name": paper_dir_name,
            "html": f"_papers/{paper_slug}.html",
        })

    for old in papers_out.glob("*.html"):
        if old.stem not in seen_slugs:
            old.unlink()
            print(f"[papers] removed stale {old.name}")

    return index


def _existing_papers_index(dashboard_dir: Path) -> list[dict]:
    papers_out = dashboard_dir / "_papers"
    if not papers_out.is_dir():
        return []
    return [
        {"slug": p.stem, "name": p.stem, "html": f"_papers/{p.name}"}
        for p in sorted(papers_out.glob("*.html"))
    ]


def build_local(project_dir: Path, only: str | None,
                dpi: int = 150, quality: int = 80) -> Path:
    """Generate <project>/dashboard/ in place. Returns the dashboard dir."""
    if not project_dir.is_dir():
        raise SystemExit(f"Project folder not found: {project_dir}")

    dashboard_dir = project_dir / "dashboard"
    dashboard_dir.mkdir(exist_ok=True)

    print(f"[dashboard] project: {project_dir}")
    print(f"[dashboard] output:  {dashboard_dir}")
    print(f"[dashboard] mode:    {only or 'full (status+figures+papers)'}")

    if only in (None, "status"):
        _sync_status(project_dir, dashboard_dir)

    if only in (None, "figures"):
        _sync_figures(project_dir, dashboard_dir)

    if only in (None, "papers"):
        papers_index = _sync_papers(project_dir, dashboard_dir, dpi=dpi, quality=quality)
    else:
        papers_index = _existing_papers_index(dashboard_dir)

    print(f"[dashboard] reassembling shell index.html ...")
    build_shell(dashboard_dir, project_name=project_dir.name, papers_index=papers_index)

    print(f"\n[dashboard] DONE")
    print(f"  Open:  {dashboard_dir / 'index.html'}")
    return dashboard_dir


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", type=Path, default=None,
                        help="Project folder (default: cwd)")
    parser.add_argument("--only", choices=["status", "figures", "papers"], default=None,
                        help="Refresh only this section (others kept from last build)")
    parser.add_argument("--dpi", type=int, default=150,
                        help="Render DPI for PDF pages (default 150)")
    parser.add_argument("--quality", type=int, default=80,
                        help="JPEG quality for PDF pages (default 80)")
    args = parser.parse_args()

    project_dir = (args.project or Path.cwd()).resolve()
    build_local(project_dir, only=args.only, dpi=args.dpi, quality=args.quality)
