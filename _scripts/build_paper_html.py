"""Convert a PDF to a self-contained HTML page with embedded page images.

Renders each PDF page as a JPEG at given DPI, base64-embeds in a single HTML.
Mobile-friendly vertical scrolling with click-to-zoom modal. No external
dependencies at view time. Ideal for previewing technical PDFs from mobile.

Usage:
    python build_paper_html.py <pdf> [--title T] [--out path] [--dpi N] [--quality Q]
"""

import argparse
import base64
import io
from datetime import datetime
from pathlib import Path

import fitz  # pymupdf
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
    background: #2a2a2a;
    color: #ddd;
    margin: 0;
    padding: 0;
  }}
  header {{
    background: #1a1a1a;
    padding: 10px 20px;
    border-bottom: 1px solid #444;
    position: sticky;
    top: 0;
    z-index: 10;
  }}
  h1 {{ margin: 0; font-size: 14px; font-weight: 500; color: #eee; }}
  .meta {{ color: #888; font-size: 11px; margin-top: 3px; }}
  main {{ padding: 10px; max-width: 1000px; margin: auto; }}
  .page {{
    background: #fff;
    margin: 0 auto 10px auto;
    border-radius: 2px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    overflow: hidden;
  }}
  .page img {{
    width: 100%;
    height: auto;
    display: block;
    cursor: zoom-in;
  }}
  .page-number {{
    text-align: center;
    color: #888;
    font-size: 10px;
    padding: 3px;
    background: #fafafa;
    border-top: 1px solid #eee;
  }}
  .modal {{
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.96);
    display: none;
    z-index: 100;
    overflow: auto;
    padding: 8px;
  }}
  .modal.open {{ display: block; }}
  .modal img {{ max-width: 100%; height: auto; display: block; margin: auto; }}
  .modal .close {{
    position: fixed;
    top: 10px;
    right: 14px;
    color: #fff;
    font-size: 28px;
    cursor: pointer;
    user-select: none;
    background: rgba(0,0,0,0.7);
    border-radius: 50%;
    width: 40px;
    height: 40px;
    line-height: 38px;
    text-align: center;
  }}
</style>
</head>
<body>
<header>
  <h1>{title}</h1>
  <div class="meta">{n_pages} páginas · convertido {date}</div>
</header>
<main>
  {pages}
</main>
<div class="modal" id="modal">
  <div class="close" id="modal-close">&times;</div>
  <img id="modal-img">
</div>
<script>
  const modal = document.getElementById('modal');
  const modalImg = document.getElementById('modal-img');
  document.querySelectorAll('.page img').forEach(img => {{
    img.addEventListener('click', () => {{
      modalImg.src = img.src;
      modal.classList.add('open');
      window.scrollTo({{ top: 0 }});
    }});
  }});
  modal.addEventListener('click', () => modal.classList.remove('open'));
</script>
</body>
</html>
"""


def render_page_b64(page, dpi: int, quality: int) -> str:
    zoom = dpi / 72.0
    mat = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality, optimize=True)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def build_paper_html(pdf_path: Path, title: str, out_path: Path,
                     dpi: int = 150, quality: int = 80) -> None:
    if not pdf_path.is_file():
        raise SystemExit(f"PDF not found: {pdf_path}")

    doc = fitz.open(pdf_path)
    n_pages = len(doc)
    print(f"[paper] rendering {n_pages} pages at {dpi} DPI ...")

    pages_html = []
    for i, page in enumerate(doc, start=1):
        b64 = render_page_b64(page, dpi=dpi, quality=quality)
        pages_html.append(
            f'<div class="page">'
            f'<img src="data:image/jpeg;base64,{b64}" alt="page {i}" loading="lazy">'
            f'<div class="page-number">{i} / {n_pages}</div>'
            f'</div>'
        )
        if i % 10 == 0 or i == n_pages:
            print(f"  ... page {i}/{n_pages}")
    doc.close()

    html = HTML_TEMPLATE.format(
        title=title,
        n_pages=n_pages,
        date=datetime.now().strftime("%Y-%m-%d %H:%M"),
        pages="\n".join(pages_html),
    )
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(html, encoding="utf-8")
    size_kb = out_path.stat().st_size // 1024
    print(f"[paper] wrote {out_path} ({size_kb} kb, {n_pages} pages)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf_path", type=Path)
    parser.add_argument("--title", default=None)
    parser.add_argument("--out", type=Path, default=None)
    parser.add_argument("--dpi", type=int, default=150,
                        help="Render DPI (default 150, good for mobile)")
    parser.add_argument("--quality", type=int, default=80,
                        help="JPEG quality 1-95 (default 80)")
    args = parser.parse_args()
    title = args.title or args.pdf_path.stem
    out = args.out or args.pdf_path.with_suffix(".html")
    build_paper_html(args.pdf_path, title, out, dpi=args.dpi, quality=args.quality)
