#!/usr/bin/env python3
"""
check.py — Build every fixture site and check its pages, in one command.

For each site in tests/sites/ (a folder with a hugo.toml), and the example
site (exampleSite/), builds it, failing on any warning but Blowfish's
Hugo version check (IGNORED_WARNINGS), checks that every
internal link and wiki link in the built pages resolves, then checks the
pages against the site's expect.txt. A site with an XFAIL file is expected to fail for the reason
written in it: its problems are reported but don't fail the run. Delete the
file once the site passes.

With --compare, also runs tools/compare-builds.py on the site containing
the working directory (e.g. Not a Chef), so one command covers "the
fixtures still work" and "the real site didn't change".

expect.txt, one check per line (blank lines and # comments ignored):

    recipes/veg-patties/index.html: id="recipe-sidebar"     must contain
    recipes/rice-bowl/index.html: !cuisine-chip             must not contain
    recipes/index.json:                                     must exist
    !cuisine/index.html                                     must not exist

Python standard library only. Exits 0 when every non-XFAIL site passes.
"""

import argparse
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.parse
from pathlib import Path

FUGU = Path(__file__).resolve().parent.parent
SITES = FUGU / "tests" / "sites"
EXAMPLE = FUGU / "exampleSite"


# Blowfish declares the Hugo versions it was tested on and warns on any
# other. That says nothing about whether the site renders, so it's the one
# warning a build may carry; every other warning fails the build.
IGNORED_WARNINGS = [
    re.compile(r'Module "(blowfish|github\.com/nunocoracao/blowfish[^"]*)" is not compatible with this Hugo version'),
]


def build(site, out, hugo):
    result = subprocess.run(
        [hugo, "--source", str(site), "--destination", str(out),
         "--logLevel", "warn"],
        capture_output=True, text=True)
    # A panic prints a Go stack; the ERROR/WARN lines are the useful part.
    lines = [l for l in (result.stdout + result.stderr).splitlines()
             if l.startswith(("ERROR", "WARN", "panic:"))]
    lines = [l for l in lines if not any(p.search(l) for p in IGNORED_WARNINGS)]
    if result.returncode == 0 and not lines:
        return []
    return ["build failed: " + (" / ".join(lines) or result.stderr.strip()[:500])]


def check_links(out):
    """Internal href/src targets that aren't in the build, and wiki links
    render-link.html couldn't resolve (its .broken-link spans)."""
    missing = {}
    for page in sorted(out.rglob("*.html")):
        body = page.read_text(errors="replace")
        rel = str(page.relative_to(out))
        for target in re.findall(r'class="broken-link" title="Not found: ([^"]*)"', body):
            missing.setdefault(f"[[{target}]]", rel)
        for url in re.findall(r'(?:href|src)="([^"#?]+)', body):
            path = urllib.parse.urlparse(url).path if url.startswith("https://example.org/") else url
            if not path.startswith("/") or path.startswith("//"):
                continue
            target = out / urllib.parse.unquote(path).lstrip("/")
            if not (target.is_file() or (target / "index.html").is_file()):
                missing.setdefault(path, rel)
    return [f"broken link: {link} (in {page})" for link, page in missing.items()]


def check_expectations(site, out):
    expect = site / "expect.txt"
    if not expect.exists():
        return []
    problems = []
    for n, raw in enumerate(expect.read_text().splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        where = f"expect.txt:{n}"
        if line.startswith("!") and ":" not in line:
            if (out / line[1:]).exists():
                problems.append(f"{where}: {line[1:]} exists, but shouldn't")
            continue
        path, _, text = line.partition(":")
        target = out / path.strip()
        text = text.strip()
        if not target.is_file():
            problems.append(f"{where}: {path.strip()} is missing")
            continue
        if not text:
            continue
        body = target.read_text(errors="replace")
        if text.startswith("!"):
            if text[1:] in body:
                problems.append(f"{where}: {path.strip()} contains {text[1:]!r}, but shouldn't")
        elif text not in body:
            problems.append(f"{where}: {path.strip()} lacks {text!r}")
    return problems


def main():
    parser = argparse.ArgumentParser(
        description=__doc__.strip().split(" — ", 1)[1],
        formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("sites", nargs="*", help="fixture names to check, or exampleSite (default: all)")
    parser.add_argument("--hugo", default=os.environ.get("HUGO", "hugo"),
                        help="the hugo binary (default: $HUGO, else hugo on the PATH)")
    parser.add_argument("--compare", action="store_true",
                        help="also run compare-builds.py on the site containing the working directory")
    args = parser.parse_args()

    names = args.sites or sorted(p.name for p in SITES.iterdir() if (p / "hugo.toml").exists()) + [EXAMPLE.name]
    failed = False
    work = Path(tempfile.mkdtemp(prefix="fugu-check-"))
    try:
        for name in names:
            site = EXAMPLE if name == EXAMPLE.name else SITES / name
            if not (site / "hugo.toml").exists():
                parser.error(f"no fixture site called {name}")
            out = work / name
            problems = build(site, out, args.hugo)
            if not problems:
                problems = check_links(out) + check_expectations(site, out)
            xfail = site / "XFAIL"
            if not problems:
                note = "  (XFAIL file can go: it passes now)" if xfail.exists() else ""
                print(f"ok    {name}{note}")
                continue
            if xfail.exists():
                print(f"xfail {name}: {xfail.read_text().strip()}")
            else:
                print(f"FAIL  {name}")
                failed = True
            for p in problems:
                print(f"      {p}")
    finally:
        shutil.rmtree(work, ignore_errors=True)

    if args.compare:
        print(flush=True)  # before compare-builds writes to the same stdout
        result = subprocess.run([sys.executable, str(FUGU / "tools" / "compare-builds.py"),
                                 "--diff-lines", "8"])
        failed = failed or result.returncode != 0

    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
