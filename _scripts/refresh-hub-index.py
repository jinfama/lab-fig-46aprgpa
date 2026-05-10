"""Refresh just the hub root index.html (the catalog of slugs).

Use this after manually adding/removing slug folders in the hub without
going through publish-hub.py (e.g. wholesale cleanup).

Usage:
    python refresh-hub-index.py
    python refresh-hub-index.py --push    # also git commit + push
"""

from __future__ import annotations

import argparse
import importlib.util
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent

# Load publish-hub.py (hyphen prevents direct import) for render_root_index + git helpers.
_spec = importlib.util.spec_from_file_location("_publish_hub", HERE / "publish-hub.py")
_mod = importlib.util.module_from_spec(_spec)
sys.modules["_publish_hub"] = _mod
_spec.loader.exec_module(_mod)


def main(push: bool) -> None:
    hub_root = _mod.HUB_ROOT
    out = hub_root / "index.html"
    out.write_text(_mod.render_root_index(hub_root), encoding="utf-8")
    print(f"Refreshed {out}")

    if push:
        print("[hub] git add + commit + push ...")
        _mod.run_git(hub_root, "add", "-A")
        try:
            _mod.run_git(hub_root, "commit", "-m", "Refresh hub root index")
        except RuntimeError as e:
            if "nothing to commit" in str(e).lower():
                print("[hub] no changes to commit")
                return
            raise
        _mod.run_git(hub_root, "push")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--push", action="store_true")
    args = parser.parse_args()
    main(push=args.push)
