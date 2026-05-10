"""Publish a project's local dashboard to the public lab-fig-46aprgpa hub.

This script is a thin transport layer:

    1. If <project>/dashboard/ does not exist, build it (delegates to dashboard.py).
    2. Copy <project>/dashboard/ -> <hub>/<slug>/ (mirrored, idempotent).
    3. Refresh the hub root index.html.
    4. git add + commit + push  (unless --no-push).

Slug = name of the project folder. One project = one URL, always.

The hub is a public GitHub Pages mirror with an obscure URL. Publishing is
opt-in: you only run this when you want the project's dashboard reachable
from mobile or shareable. Until then, the dashboard lives only inside the
project and is never on the network.

Usage:
    python publish-hub.py --project <path>
    python publish-hub.py --project <path> --only figures   # rebuild + push that tab
    python publish-hub.py --project <path> --no-push        # local hub copy only
"""

from __future__ import annotations

import argparse
import os
import shutil
import stat
import subprocess
import sys
from datetime import datetime
from pathlib import Path


def _on_rm_error(func, path, exc_info):
    """Handler for shutil.rmtree to deal with Windows readonly / OneDrive locks."""
    try:
        os.chmod(path, stat.S_IWRITE)
        func(path)
    except Exception:
        # Re-raise the original — caller will see the underlying error.
        raise

sys.path.insert(0, str(Path(__file__).parent))
from dashboard import build_local, slugify  # noqa: E402

HUB_ROOT = Path(__file__).resolve().parent.parent
GITHUB_USER = "jinfama"
HUB_REPO_NAME = HUB_ROOT.name
PUBLIC_URL_BASE = f"https://{GITHUB_USER}.github.io/{HUB_REPO_NAME}"

GIT_USER_NAME = "Juan Infante-Amate"
GIT_USER_EMAIL = "jinfama@ugr.es"


# ---------------------------------------------------------------------------
# Hub-level helpers
# ---------------------------------------------------------------------------

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
        mtime = datetime.fromtimestamp(index.stat().st_mtime).strftime("%Y-%m-%d %H:%M")
        cards.append(
            f'<a class="card" href="{p.name}/index.html">'
            f'<div class="name">{p.name}</div>'
            f'<div class="meta">actualizado {mtime}</div>'
            f'</a>'
        )
    if not cards:
        cards.append('<div class="empty">No hay proyectos publicados a&uacute;n.</div>')

    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{HUB_REPO_NAME} - proyectos</title>
<style>
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    background: #fafafa; color: #222; margin: 0; padding: 24px;
    max-width: 800px; margin-left: auto; margin-right: auto;
  }}
  h1 {{ font-size: 18px; margin: 0 0 4px 0; }}
  .meta {{ color: #888; font-size: 12px; margin-bottom: 24px; }}
  .grid {{ display: grid; gap: 12px; grid-template-columns: 1fr; }}
  @media (min-width: 600px) {{ .grid {{ grid-template-columns: 1fr 1fr; }} }}
  .card {{
    background: #fff; border: 1px solid #e0e0e0; border-radius: 6px;
    padding: 14px 16px; text-decoration: none; color: inherit;
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
  <div class="meta">{len([c for c in cards if 'class="card"' in c])} proyecto(s) - actualizado {now}</div>
  <div class="grid">
    {chr(10).join(cards)}
  </div>
</body>
</html>
"""


def run_git(hub_root: Path, *args: str) -> str:
    cmd = [
        "git",
        "-c", f"user.name={GIT_USER_NAME}",
        "-c", f"user.email={GIT_USER_EMAIL}",
        *args,
    ]
    result = subprocess.run(cmd, cwd=hub_root, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)} failed:\n{result.stderr}")
    return result.stdout


def _git_push_slug(slug: str, message: str) -> None:
    print(f"[hub] git add + commit + push ...")
    run_git(HUB_ROOT, "add", slug, "index.html")
    try:
        run_git(HUB_ROOT, "commit", "-m", message)
    except RuntimeError as e:
        if "nothing to commit" in str(e).lower():
            print("[hub] no changes to commit")
            return
        raise
    run_git(HUB_ROOT, "push")


def _mirror_dashboard(dashboard_dir: Path, slug_dir: Path) -> None:
    """Copy <project>/dashboard/ -> <hub>/<slug>/ idempotently.

    Wipes the target slug folder and recopies. Cheaper than diff-mirror and
    correct (no stale files left over from a previous publish).
    """
    if slug_dir.exists():
        shutil.rmtree(slug_dir, onexc=_on_rm_error)
    shutil.copytree(dashboard_dir, slug_dir)
    n_files = sum(1 for _ in slug_dir.rglob("*") if _.is_file())
    size_mb = sum(p.stat().st_size for p in slug_dir.rglob("*") if p.is_file()) / 1024 / 1024
    print(f"[hub] mirrored dashboard -> {slug_dir.name}/ ({n_files} files, {size_mb:.1f} MB)")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def publish(project_dir: Path, only: str | None,
            push: bool, dpi: int, quality: int) -> None:
    if not project_dir.is_dir():
        raise SystemExit(f"Project folder not found: {project_dir}")

    # 1. Build/refresh the local dashboard inside the project.
    dashboard_dir = build_local(project_dir, only=only, dpi=dpi, quality=quality)

    # 2. Mirror to the hub under the canonical slug.
    slug = slugify(project_dir.name)
    slug_dir = HUB_ROOT / slug
    _mirror_dashboard(dashboard_dir, slug_dir)

    # 3. Refresh hub root index (catalog of slugs).
    print(f"[hub] refreshing root index ...")
    (HUB_ROOT / "index.html").write_text(render_root_index(HUB_ROOT), encoding="utf-8")

    # 4. Push.
    if push:
        suffix = "" if only is None else f" [{only}]"
        _git_push_slug(slug, f"Update {slug} dashboard{suffix}")

    print(f"\n[hub] DONE")
    print(f"  Project local: {dashboard_dir / 'index.html'}")
    print(f"  Hub:           {PUBLIC_URL_BASE}/")
    print(f"  Public URL:    {PUBLIC_URL_BASE}/{slug}/")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", type=Path, default=None,
                        help="Project folder (default: cwd)")
    parser.add_argument("--only", choices=["status", "figures", "papers"], default=None,
                        help="Refresh only this section before publishing")
    parser.add_argument("--no-push", action="store_true",
                        help="Mirror to hub locally but skip git commit/push")
    parser.add_argument("--dpi", type=int, default=150)
    parser.add_argument("--quality", type=int, default=80)
    args = parser.parse_args()

    project_dir = (args.project or Path.cwd()).resolve()
    publish(project_dir, only=args.only, push=not args.no_push,
            dpi=args.dpi, quality=args.quality)
