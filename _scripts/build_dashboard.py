"""Generate self-contained HTML dashboard from a recursive figures folder.

Walks a figures directory, replicates the folder structure as nested
collapsible HTML5 <details> elements, base64-embeds all PNGs as
web-quality thumbnails. Single self-contained HTML file, opens offline
in any browser including mobile.

Usage:
    python build_dashboard.py <figures_dir> [--title T] [--out path]
"""

import argparse
import base64
import io
from datetime import datetime
from pathlib import Path

from PIL import Image


HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<style>
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    background: #fafafa;
    color: #222;
    margin: 0;
    padding: 0;
  }}
  header {{
    background: #fff;
    padding: 14px 20px;
    border-bottom: 1px solid #ddd;
    position: sticky;
    top: 0;
    z-index: 10;
  }}
  h1 {{ margin: 0; font-size: 16px; font-weight: 600; }}
  .meta {{ color: #888; font-size: 12px; margin-top: 4px; }}
  main {{ padding: 12px; max-width: 1400px; margin: auto; }}
  details {{
    margin: 0 0 6px 0;
    border-left: 3px solid #ddd;
    padding-left: 10px;
  }}
  details > summary {{
    cursor: pointer;
    user-select: none;
    padding: 5px 4px;
    font-size: 14px;
    font-weight: 500;
    color: #333;
  }}
  details > summary::-webkit-details-marker {{ color: #888; }}
  details > summary:hover {{ background: #f0f0f0; }}
  .count {{ color: #999; font-weight: 400; font-size: 12px; margin-left: 6px; }}
  .grid {{
    display: grid;
    gap: 8px;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    margin: 6px 0 8px 0;
  }}
  .card {{
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    overflow: hidden;
  }}
  .card img {{ width: 100%; height: auto; display: block; cursor: zoom-in; }}
  .card .caption {{
    padding: 6px 8px;
    font-size: 11px;
    color: #555;
    border-top: 1px solid #eee;
    word-break: break-word;
  }}
  .modal {{
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.92);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 16px;
  }}
  .modal.open {{ display: flex; }}
  .modal img {{ max-width: 100%; max-height: 100%; }}
  .modal .close {{
    position: absolute;
    top: 12px;
    right: 16px;
    color: #fff;
    font-size: 32px;
    cursor: pointer;
    user-select: none;
  }}
</style>
</head>
<body>
<header>
  <h1>{title}</h1>
  <div class="meta">{n_total} figura(s) · {n_folders} carpeta(s) · generado {date}</div>
</header>
<main>
  {tree}
</main>
<div class="modal" id="modal">
  <div class="close">&times;</div>
  <img id="modal-img">
</div>
<script>
  const modal = document.getElementById('modal');
  const modalImg = document.getElementById('modal-img');
  document.querySelectorAll('.card img').forEach(img => {{
    img.addEventListener('click', () => {{
      modalImg.src = img.src;
      modal.classList.add('open');
    }});
  }});
  modal.addEventListener('click', () => modal.classList.remove('open'));
</script>
</body>
</html>
"""


def is_skipped_dir(p: Path) -> bool:
    return p.name.startswith(".") or p.name.startswith("_")


def make_thumb_b64(img_path: Path, max_width: int = 1000) -> str:
    img = Image.open(img_path).convert("RGB")
    if img.width > max_width:
        ratio = max_width / img.width
        img = img.resize((max_width, int(img.height * ratio)), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=82, optimize=True)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def count_figures_recursive(folder: Path) -> int:
    n = 0
    for p in folder.rglob("*.png"):
        if any(is_skipped_dir(parent) for parent in p.relative_to(folder).parents):
            continue
        n += 1
    return n


def count_folders(folder: Path) -> int:
    n = 1
    for sub in folder.iterdir():
        if sub.is_dir() and not is_skipped_dir(sub):
            n += count_folders(sub)
    return n


def render_node(folder: Path, depth: int) -> str:
    """Recursively render a folder as nested <details> with embedded figures."""
    name = folder.name if depth > 0 else "figures"
    pngs = sorted(folder.glob("*.png"))
    subdirs = sorted(p for p in folder.iterdir() if p.is_dir() and not is_skipped_dir(p))

    n_recursive = count_figures_recursive(folder)
    if n_recursive == 0 and not subdirs:
        return ""

    open_attr = " open" if depth < 2 else ""
    parts = [
        f'<details{open_attr}>',
        f'<summary>{name}<span class="count">{n_recursive} fig.</span></summary>',
    ]

    if pngs:
        parts.append('<div class="grid">')
        for p in pngs:
            try:
                b64 = make_thumb_b64(p)
                parts.append(
                    f'<div class="card">'
                    f'<img src="data:image/jpeg;base64,{b64}" alt="{p.name}" loading="lazy">'
                    f'<div class="caption">{p.name}</div>'
                    f'</div>'
                )
            except Exception as e:
                parts.append(
                    f'<div class="card"><div class="caption">[error: {p.name} — {e}]</div></div>'
                )
        parts.append('</div>')

    for sub in subdirs:
        sub_html = render_node(sub, depth + 1)
        if sub_html:
            parts.append(sub_html)

    parts.append('</details>')
    return "\n".join(parts)


def build_dashboard(figures_dir: Path, title: str, out_path: Path) -> None:
    if not figures_dir.exists() or not figures_dir.is_dir():
        raise SystemExit(f"Folder not found: {figures_dir}")
    n_total = count_figures_recursive(figures_dir)
    if n_total == 0:
        raise SystemExit(f"No PNGs in {figures_dir} (recursive)")
    n_folders = count_folders(figures_dir)
    tree_html = render_node(figures_dir, depth=0)

    html = HTML_TEMPLATE.format(
        title=title,
        n_total=n_total,
        n_folders=n_folders,
        date=datetime.now().strftime("%Y-%m-%d %H:%M"),
        tree=tree_html,
    )
    out_path.write_text(html, encoding="utf-8")
    size_kb = out_path.stat().st_size // 1024
    print(f"Wrote {out_path} ({size_kb} kb, {n_total} figures, {n_folders} folders)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("figures_dir", type=Path)
    parser.add_argument("--title", default="Figures")
    parser.add_argument("--out", type=Path, default=None)
    args = parser.parse_args()
    out = args.out or (args.figures_dir / "dashboard.html")
    build_dashboard(args.figures_dir, args.title, out)
