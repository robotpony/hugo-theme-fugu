#!/usr/bin/env python3
"""
compare-builds.py — Check that a change to Fugu doesn't alter a site's
built pages by accident.

Builds the site twice and compares every file with all whitespace
stripped, so reindented templates don't count as changes. Lists the files
that were added, removed, or changed, with a short diff for each changed
text file (files with the same diff share one copy). Exits 0 when the builds match, 1 when they differ.

Usage:
    compare-builds.py                  Fugu at HEAD vs the working tree
    compare-builds.py --ref REV        Fugu at REV vs the working tree
    compare-builds.py OLD NEW          two folders you've already built

The site is $FUGU_SITE_ROOT, or the nearest Hugo site at or above the
working directory. Fugu at REV comes from `git archive` of this repo, so
uncommitted changes count as "new". Every other theme (Blowfish) is used
as it is on disk, for both builds. Python standard library only.
"""

import argparse
import difflib
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

THEME_DIR = Path(__file__).resolve().parent.parent
TEXT_SUFFIXES = {
    ".html", ".xml", ".json", ".js", ".css", ".txt", ".svg", ".md",
    ".webmanifest", ".toml", ".yaml", ".yml",
}
WS_RE = re.compile(rb"\s+")


def find_site_root():
    """$FUGU_SITE_ROOT if set, otherwise the nearest directory at or above
    the working directory with a content/ folder and a Hugo config. Same
    rule as frontmatter.py and drafts.py."""
    if os.environ.get("FUGU_SITE_ROOT"):
        return Path(os.environ["FUGU_SITE_ROOT"]).resolve()
    here = Path.cwd().resolve()
    for d in (here, *here.parents):
        has_config = any((d / n).exists() for n in
                         ("hugo.toml", "hugo.yaml", "hugo.json", "config.toml", "config"))
        if (d / "content").is_dir() and has_config:
            return d
    sys.exit("compare-builds: no Hugo site found here; run it inside one or set FUGU_SITE_ROOT")


def hugo_build(site, out, themes_dir=None, extra=()):
    cmd = ["hugo", "--quiet", "--source", str(site), "--destination", str(out)]
    if themes_dir:
        cmd += ["--themesDir", str(themes_dir)]
    cmd += list(extra)
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        sys.exit(f"compare-builds: {' '.join(cmd)} failed:\n{result.stderr}")


def themes_at_ref(ref, into):
    """A themes folder holding Fugu at `ref` plus a symlink to every other
    theme beside Fugu (Blowfish), so the "before" build differs from the
    "after" one only in Fugu."""
    fugu = into / THEME_DIR.name
    fugu.mkdir(parents=True)
    archive = subprocess.run(["git", "-C", str(THEME_DIR), "archive", ref],
                             capture_output=True)
    if archive.returncode != 0:
        sys.exit(f"compare-builds: git archive {ref} failed:\n{archive.stderr.decode()}")
    subprocess.run(["tar", "-x", "-C", str(fugu)], input=archive.stdout, check=True)
    for sibling in THEME_DIR.parent.iterdir():
        if sibling.name != THEME_DIR.name and sibling.is_dir():
            (into / sibling.name).symlink_to(sibling.resolve())
    return into


def files_under(root):
    return {p.relative_to(root).as_posix() for p in root.rglob("*") if p.is_file()}


def is_text(rel):
    return Path(rel).suffix.lower() in TEXT_SUFFIXES


def same(a, b, rel):
    da, db = a.read_bytes(), b.read_bytes()
    if da == db:
        return True
    if is_text(rel):
        return WS_RE.sub(b"", da) == WS_RE.sub(b"", db)
    return False


def readable_lines(data):
    """Collapse whitespace and put each tag on its own line, so a diff of
    minified or reflowed HTML shows the tags that changed, not one huge
    line."""
    text = re.sub(r"\s+", " ", data.decode("utf-8", errors="replace"))
    parts = re.split(r"(?<=>)|(?=<)", text)
    return [p.strip() for p in parts if p.strip()]


def short_diff(a, b, max_lines):
    lines = list(difflib.unified_diff(readable_lines(a.read_bytes()),
                                      readable_lines(b.read_bytes()),
                                      lineterm="", n=1))[2:]
    # Hunk line numbers vary page to page; without them, the same change on
    # many pages gives the same diff and compare() can group it.
    lines = ["@@" if l.startswith("@@") else l for l in lines]
    if len(lines) > max_lines:
        lines = lines[:max_lines] + [f"… {len(lines) - max_lines} more diff lines"]
    return lines


def compare(old, new, max_lines):
    old_files, new_files = files_under(old), files_under(new)
    removed = sorted(old_files - new_files)
    added = sorted(new_files - old_files)
    changed = sorted(rel for rel in old_files & new_files
                     if not same(old / rel, new / rel, rel))

    print(f"Compared {len(old_files | new_files)} files: "
          f"{len(changed)} changed, {len(added)} added, {len(removed)} removed.")
    for rel in removed:
        print(f"\n- removed  {rel}")
    for rel in added:
        print(f"\n+ added    {rel}")
    # One template change usually shows up the same way on many pages, so
    # files with an identical diff are listed together under one copy of it.
    groups = {}
    for rel in changed:
        diff = (tuple(short_diff(old / rel, new / rel, max_lines))
                if is_text(rel) and max_lines else ())
        groups.setdefault(diff, []).append(rel)
    for diff, rels in groups.items():
        print()
        for rel in rels[:5]:
            print(f"~ changed  {rel}")
        if len(rels) > 5:
            print(f"~ … and {len(rels) - 5} more with the same diff")
        for line in diff:
            print(f"    {line}")
    return not (removed or added or changed)


def main():
    parser = argparse.ArgumentParser(
        description=__doc__.strip().split("\n\n")[0].split("— ", 1)[1].replace("\n", " "),
        epilog="With no arguments, compares Fugu at HEAD with the working tree.")
    parser.add_argument("old", nargs="?", type=Path, help="an existing build folder (the 'before')")
    parser.add_argument("new", nargs="?", type=Path, help="an existing build folder (the 'after')")
    parser.add_argument("--ref", default="HEAD",
                        help="the Fugu commit to build as 'before' (default: HEAD)")
    parser.add_argument("--hugo-arg", action="append", default=[], metavar="ARG",
                        help="pass an argument to both hugo builds, e.g. --hugo-arg=-D; repeatable")
    parser.add_argument("--diff-lines", type=int, default=20, metavar="N",
                        help="diff lines to show per changed file; 0 for none (default: 20)")
    parser.add_argument("--keep", action="store_true",
                        help="keep the build folders and print where they are")
    args = parser.parse_args()

    if args.old or args.new:
        if not (args.old and args.new):
            parser.error("give both OLD and NEW, or neither")
        for d in (args.old, args.new):
            if not d.is_dir():
                parser.error(f"{d} is not a folder")
        sys.exit(0 if compare(args.old, args.new, args.diff_lines) else 1)

    site = find_site_root()
    work = Path(tempfile.mkdtemp(prefix="fugu-compare-"))
    try:
        old, new = work / "old", work / "new"
        hugo_build(site, old, themes_at_ref(args.ref, work / "themes"), args.hugo_arg)
        hugo_build(site, new, extra=args.hugo_arg)
        print(f"Site: {site}\nBefore: Fugu at {args.ref}. After: Fugu's working tree.\n")
        ok = compare(old, new, args.diff_lines)
    finally:
        if args.keep:
            print(f"\nBuilds kept in {work}")
        else:
            shutil.rmtree(work, ignore_errors=True)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
