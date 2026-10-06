#!/usr/bin/env python3
"""
drafts.py — List content marked draft: true across content/recipes,
content/essays, content/reference, and content/the-food-log.

Reuses frontmatter.py's parser (same constrained YAML subset, no
third-party dependencies).
"""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import frontmatter as fm  # noqa: E402


def find_drafts(paths):
    files = fm.collect_files(paths)
    drafts = []
    for path in files:
        abspath = path if path.is_absolute() else (fm.REPO_ROOT / path)
        kind = fm.classify(abspath)
        if kind is None or abspath.name == "_index.md" or abspath.name.startswith("."):
            continue
        try:
            fm_lines, _ = fm.read_file(abspath)
        except fm.FrontmatterError:
            continue
        fields = fm.parse_fields(fm_lines)
        if fields.get("draft") is True:
            drafts.append({
                "path": str(abspath.relative_to(fm.REPO_ROOT)),
                "kind": kind,
                "title": fields.get("title") or "(untitled)",
            })
    return drafts


def main():
    parser = argparse.ArgumentParser(description=__doc__.strip().splitlines()[0])
    parser.add_argument("paths", nargs="*", help="specific files or dirs (default: all content)")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    drafts = find_drafts(args.paths)

    if args.json:
        print(json.dumps(drafts, indent=2))
        return 0

    if not drafts:
        print("No drafts found.")
        return 0

    by_kind = {}
    for d in drafts:
        by_kind.setdefault(d["kind"], []).append(d)

    labels = {"recipe": "recipes", "essay": "essays", "reference": "reference pages", "log": "log entries"}
    for kind in ("recipe", "essay", "reference", "log"):
        if kind not in by_kind:
            continue
        print(f"{labels[kind]} ({len(by_kind[kind])}):")
        for d in sorted(by_kind[kind], key=lambda d: d["path"]):
            print(f"  {d['title']} — {d['path']}")
        print()

    print(f"{len(drafts)} draft(s) total.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
