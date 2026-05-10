"""Build the per-project shell index.html with three tabs.

The shell is a single static page with three tabs (Status / Figures / Papers).
Each tab loads its content via <iframe> from a sibling file under the slug:

    <slug>/index.html        ← this shell
    <slug>/_status.html      ← copy of project's STATUS.html (or placeholder)
    <slug>/_figures.html     ← standalone figures dashboard (build_dashboard)
    <slug>/_papers/*.html    ← one html per paper (build_paper_html)

Iframes keep each tab's CSS isolated, so styles in STATUS.html / figures /
papers don't bleed into the shell or into each other.

The shell is reassembled on every sync (cheap), even when --only refreshes a
single section. The fragment files persist between syncs so an --only run
doesn't drop the other two tabs.
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path


SHELL_TEMPLATE = """<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{project_name} — dashboard</title>
<style>
  html, body {{
    margin: 0;
    padding: 0;
    height: 100%;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    background: #fafafa;
    color: #222;
  }}
  body {{
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }}
  header {{
    background: #fff;
    border-bottom: 1px solid #e0e0e0;
    padding: 10px 16px 0 16px;
    flex-shrink: 0;
  }}
  .title-row {{
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 12px;
  }}
  h1 {{
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }}
  .meta {{
    color: #888;
    font-size: 11px;
  }}
  nav.tabs {{
    display: flex;
    gap: 0;
    margin-top: 10px;
    border-bottom: none;
  }}
  nav.tabs button {{
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 500;
    color: #666;
    cursor: pointer;
    font-family: inherit;
    margin-bottom: -1px;
  }}
  nav.tabs button:hover {{
    color: #222;
  }}
  nav.tabs button.active {{
    color: #c0392b;
    border-bottom-color: #c0392b;
    font-weight: 600;
  }}
  nav.tabs .badge {{
    display: inline-block;
    background: #eee;
    color: #777;
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 8px;
    margin-left: 6px;
    vertical-align: middle;
  }}
  nav.tabs button.active .badge {{
    background: #c0392b;
    color: #fff;
  }}
  main {{
    flex: 1 1 auto;
    position: relative;
    background: #fff;
  }}
  .tab-pane {{
    display: none;
    height: 100%;
    width: 100%;
  }}
  .tab-pane.active {{
    display: block;
  }}
  .tab-pane iframe {{
    width: 100%;
    height: 100%;
    border: 0;
    display: block;
  }}
  .empty-pane {{
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #888;
    font-size: 13px;
    font-style: italic;
    padding: 20px;
    text-align: center;
  }}
  .empty-pane code {{
    font-style: normal;
    background: #f4f4f4;
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 12px;
  }}
  .papers-toolbar {{
    background: #fafafa;
    border-bottom: 1px solid #e0e0e0;
    padding: 6px 12px;
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    align-items: center;
  }}
  .papers-toolbar label {{
    color: #666;
    font-size: 11px;
    margin-right: 4px;
  }}
  .papers-toolbar button {{
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 3px;
    padding: 4px 10px;
    font-size: 12px;
    cursor: pointer;
    font-family: inherit;
    color: #444;
  }}
  .papers-toolbar button.active {{
    background: #c0392b;
    color: #fff;
    border-color: #c0392b;
  }}
  .papers-toolbar button:hover:not(.active) {{
    background: #f0f0f0;
  }}
  #papers-pane .papers-body {{
    height: calc(100% - 36px);
  }}
  #papers-pane iframe {{
    width: 100%;
    height: 100%;
    border: 0;
    display: block;
  }}
</style>
</head>
<body>
<header>
  <div class="title-row">
    <h1>{project_name}</h1>
    <div class="meta">actualizado {date}</div>
  </div>
  <nav class="tabs">
    <button data-tab="status" class="active">Status{status_badge}</button>
    <button data-tab="figures">Figures{figures_badge}</button>
    <button data-tab="papers">Papers{papers_badge}</button>
  </nav>
</header>
<main>
  <div class="tab-pane active" id="status-pane">
    {status_content}
  </div>
  <div class="tab-pane" id="figures-pane">
    {figures_content}
  </div>
  <div class="tab-pane" id="papers-pane">
    {papers_content}
  </div>
</main>
<script>
  // Tab switching
  const tabButtons = document.querySelectorAll('nav.tabs button');
  const panes = document.querySelectorAll('.tab-pane');
  tabButtons.forEach(btn => {{
    btn.addEventListener('click', () => {{
      const tab = btn.dataset.tab;
      tabButtons.forEach(b => b.classList.toggle('active', b === btn));
      panes.forEach(p => p.classList.toggle('active', p.id === tab + '-pane'));
      // Update URL hash for shareable tab links
      history.replaceState(null, '', '#' + tab);
    }});
  }});
  // Restore tab from URL hash on load
  if (window.location.hash) {{
    const hashTab = window.location.hash.slice(1);
    const btn = document.querySelector(`nav.tabs button[data-tab="${{hashTab}}"]`);
    if (btn) btn.click();
  }}

  // Papers sub-nav
  const papersBtns = document.querySelectorAll('.papers-toolbar button');
  const papersFrame = document.getElementById('papers-frame');
  papersBtns.forEach(btn => {{
    btn.addEventListener('click', () => {{
      papersBtns.forEach(b => b.classList.toggle('active', b === btn));
      if (papersFrame) papersFrame.src = btn.dataset.src;
    }});
  }});
</script>
</body>
</html>
"""


def _empty_pane(message: str) -> str:
    return f'<div class="empty-pane">{message}</div>'


def _badge(n: int | None) -> str:
    if n is None or n <= 0:
        return ""
    return f'<span class="badge">{n}</span>'


def build_shell(slug_dir: Path, project_name: str, papers_index: list[dict]) -> None:
    """Render the shell index.html using whatever fragments already exist on disk.

    Args:
        slug_dir: <hub>/<slug>/ directory where index.html and fragments live.
        project_name: human-readable name (slug or fancier).
        papers_index: list of dicts {"slug": str, "name": str, "html": "_papers/<slug>.html"}.
    """
    status_path = slug_dir / "_status.html"
    figures_path = slug_dir / "_figures.html"

    if status_path.exists():
        status_content = '<iframe src="_status.html" title="Status"></iframe>'
        status_badge = ""
    else:
        status_content = _empty_pane(
            "No hay <code>STATUS.html</code> en este proyecto aún. "
            "Genera <code>docs/STATUS.md</code> y rendéralo con "
            "<code>python docs/_render_status_html.py</code>, luego vuelve a sincronizar."
        )
        status_badge = ""

    if figures_path.exists():
        figures_content = '<iframe src="_figures.html" title="Figures"></iframe>'
        # Try to read figure count from a sidecar metadata json if present.
        meta_path = slug_dir / "_figures.meta.json"
        n_figs = None
        if meta_path.exists():
            try:
                n_figs = json.loads(meta_path.read_text(encoding="utf-8")).get("n_total")
            except Exception:
                n_figs = None
        figures_badge = _badge(n_figs)
    else:
        figures_content = _empty_pane(
            "No hay carpeta <code>figures/</code> en este proyecto. "
            "Cuando la haya, sincroniza con <code>--only figures</code>."
        )
        figures_badge = ""

    if papers_index:
        toolbar_btns = []
        for i, p in enumerate(papers_index):
            cls = ' class="active"' if i == 0 else ""
            toolbar_btns.append(
                f'<button{cls} data-src="{p["html"]}">{p["name"]}</button>'
            )
        first_src = papers_index[0]["html"]
        papers_content = (
            '<div class="papers-toolbar">'
            '<label>Manuscript:</label>'
            + "".join(toolbar_btns) +
            '</div>'
            '<div class="papers-body">'
            f'<iframe id="papers-frame" src="{first_src}" title="Paper"></iframe>'
            '</div>'
        )
        papers_badge = _badge(len(papers_index))
    else:
        papers_content = _empty_pane(
            "No hay <code>papers/&lt;paper&gt;/manuscript.pdf</code> en este proyecto. "
            "Cuando los haya, sincroniza con <code>--only papers</code>."
        )
        papers_badge = ""

    out = SHELL_TEMPLATE.format(
        project_name=project_name,
        date=datetime.now().strftime("%Y-%m-%d %H:%M"),
        status_badge=status_badge,
        figures_badge=figures_badge,
        papers_badge=papers_badge,
        status_content=status_content,
        figures_content=figures_content,
        papers_content=papers_content,
    )
    (slug_dir / "index.html").write_text(out, encoding="utf-8")
