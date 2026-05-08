"""Sync a project's figures dashboard to the lab-fig hub.

Workflow:
  1. From a project folder (cwd or --project), find figures/.
  2. Generate dashboard.html recursively (via build_dashboard).
  3. Copy to <hub>/<project-slug>/index.html.
  4. Refresh hub root index.html listing all projects.
  5. git add + commit + push from hub.
  6. Print final public URL.

Usage:
  cd /path/to/my-project
  python sync.py [--project /path] [--slug name] [--no-push]
"""

import argparse
import re
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# Allow importing build_dashboard from same folder
sys.path.insert(0, str(Path(__file__).parent))
from build_dashboard import build_dashboard  # noqa: E402

HUB_ROOT = Path(__file__).resolve().parent.parent
GITHUB_USER = "jinfama"
HUB_REPO_NAME = HUB_ROOT.name
PUBLIC_URL_BASE = f"https://{GITHUB_USER}.github.io/{HUB_REPO_NAME}"


def slugify(s: str) -> str:
    s = re.sub(r"[^\w\s-]", "", s.lower())
    s = re.sub(r"[\s_]+", "-", s).strip("-")
    return s or "project"


def render_root_index(hub_root: Path) -> str:
    projects = sorted(
        p for p in hub_root.iterdir()
        if p.is_dir() and not p.name.startswith(".") and not p.name.startswith("_")
    )
    cards = []
    for p in projects:
        index = p / "index.html"
        if not index.exists():
            continue
        n_figs = sum(1 for _ in p.rglob("*.jpg")) + sum(1 for _ in p.rglob("*.png"))
        mtime = datetime.fromtimestamp(index.stat().st_mtime).strftime("%Y-%m-%d %H:%M")
        cards.append(
            f'<a class="card" href="{p.name}/index.html">'
            f'<div class="name">{p.name}</div>'
            f'<div class="meta">actualizado {mtime}</div>'
            f'</a>'
        )
    if not cards:
        cards.append('<div class="empty">No hay proyectos publicados aún.</div>')

    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{HUB_REPO_NAME} — proyectos</title>
<style>
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    background: #fafafa;
    color: #222;
    margin: 0;
    padding: 24px;
    max-width: 800px;
    margin-left: auto;
    margin-right: auto;
  }}
  h1 {{ font-size: 18px; margin: 0 0 4px 0; }}
  .meta {{ color: #888; font-size: 12px; margin-bottom: 24px; }}
  .grid {{ display: grid; gap: 12px; grid-template-columns: 1fr; }}
  @media (min-width: 600px) {{ .grid {{ grid-template-columns: 1fr 1fr; }} }}
  .card {{
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    padding: 14px 16px;
    text-decoration: none;
    color: inherit;
    transition: border-color 0.1s;
  }}
  .card:hover {{ border-color: #888; }}
  .name {{ font-weight: 600; font-size: 15px; }}
  .card .meta {{ font-size: 11px; color: #999; margin: 6px 0 0 0; }}
  .empty {{ color: #888; font-style: italic; }}
</style>
</head>
<body>
  <h1>{HUB_REPO_NAME}</h1>
  <div class="meta">{len([c for c in cards if 'class="card"' in c])} proyecto(s) · actualizado {now}</div>
  <div class="grid">
    {chr(10).join(cards)}
  </div>
</body>
</html>
"""


def run_git(hub_root: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", *args], cwd=hub_root, capture_output=True, text=True
    )
    if result.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)} failed:\n{result.stderr}")
    return result.stdout


def sync_project(project_dir: Path, slug: str | None, push: bool) -> None:
    figures_dir = project_dir / "figures"
    if not figures_dir.is_dir():
        raise SystemExit(f"No figures/ folder in {project_dir}")

    project_slug = slug or slugify(project_dir.name)
    project_hub_dir = HUB_ROOT / project_slug
    project_hub_dir.mkdir(exist_ok=True)
    out_path = project_hub_dir / "index.html"

    title = f"{project_slug} — figuras"
    print(f"[sync] generating dashboard for {project_dir} ...")
    build_dashboard(figures_dir, title, out_path)

    print(f"[sync] refreshing hub root index ...")
    root_index = HUB_ROOT / "index.html"
    root_index.write_text(render_root_index(HUB_ROOT), encoding="utf-8")

    if push:
        print(f"[sync] git add + commit + push ...")
        run_git(HUB_ROOT, "add", project_slug, "index.html")
        try:
            run_git(HUB_ROOT, "commit", "-m", f"Update {project_slug} dashboard")
        except RuntimeError as e:
            if "nothing to commit" in str(e).lower():
                print("[sync] no changes to commit")
            else:
                raise
        else:
            run_git(HUB_ROOT, "push")

    public_url = f"{PUBLIC_URL_BASE}/{project_slug}/"
    print(f"\n[sync] DONE")
    print(f"  Hub:     {PUBLIC_URL_BASE}/")
    print(f"  Project: {public_url}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", type=Path, default=Path.cwd(),
                        help="Project folder (default: cwd)")
    parser.add_argument("--slug", default=None,
                        help="Override project slug (default: derived from folder name)")
    parser.add_argument("--no-push", action="store_true",
                        help="Skip git commit/push (only update local files)")
    args = parser.parse_args()
    sync_project(args.project.resolve(), args.slug, push=not args.no_push)
