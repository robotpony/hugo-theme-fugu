#!/usr/bin/env python3
"""
install.py — Install Fugu on a new site the way docs/getting-started.md
says, and check the recipe page it promises.

    python3 tests/install.py modules
    python3 tests/install.py submodules

Starts from `hugo new site`, installs Fugu and Blowfish by one method,
writes the config, the recipes section, and the first recipe from the
code blocks in getting-started.md, builds it, failing on any warning but
Blowfish's Hugo version check (as tests/check.py does), and checks
the recipe page has its ingredients, method, and sidebar. Fixtures find
the themes through themesDir, so they can't catch the install steps or the
docs drifting from the theme; this can.

Fugu comes from this checkout: a `replace` directive for modules (the
working tree), a clone for submodules (the committed HEAD). Blowfish is
fetched as the docs say, unless --blowfish names a local checkout to use
instead (for a slow network). With modules, it also checks the site got
the Blowfish version Fugu's go.mod requires.

Needs Hugo, git, and for modules Go. Python standard library only. Exits 0
when the site builds and passes.
"""

import argparse
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

FUGU = Path(__file__).resolve().parent.parent
DOC = FUGU / "docs" / "getting-started.md"
FUGU_MODULE = "github.com/robotpony/hugo-theme-fugu"
BLOWFISH_MODULE = "github.com/nunocoracao/blowfish/v3"


def block_after(doc, marker):
    """The first fenced code block after `marker` in the doc."""
    start = doc.find(marker)
    if start < 0:
        sys.exit(f"install: getting-started.md has no {marker!r}")
    m = re.compile(r"^```\w*\n(.*?)^```", re.S | re.M).search(doc, start)
    if not m:
        sys.exit(f"install: no code block after {marker!r}")
    return m.group(1)


# Blowfish warns on a Hugo outside its declared range; that says nothing
# about whether the site renders, so it's the one warning a build may carry.
IGNORED_WARNINGS = [
    re.compile(r'Module "(blowfish|github\.com/nunocoracao/blowfish[^"]*)" is not compatible with this Hugo version'),
]


def run(cmd, cwd, shell=False):
    print("$", cmd if shell else " ".join(map(str, cmd)))
    r = subprocess.run(cmd, cwd=cwd, shell=shell, text=True,
                       stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    if r.stdout.strip():
        print(r.stdout.rstrip())
    if r.returncode:
        sys.exit(f"install: failed ({r.returncode})")
    return r.stdout


def install_modules(site, doc, blowfish):
    run(["hugo", "mod", "init", "example.org/my-cookbook"], site)
    gomod = site / "go.mod"
    lines = [f"replace {FUGU_MODULE} => {FUGU}"]
    if blowfish:
        lines.append(f"replace {BLOWFISH_MODULE} => {blowfish}")
    gomod.write_text(gomod.read_text() + "\n" + "\n".join(lines) + "\n")
    # The minimum config, with the module imports in place of `theme`.
    config = block_after(doc, "## 2. The minimum config")
    config = re.sub(r"^theme = .*\n", "", config, flags=re.M)
    imports = block_after(doc, "Then import both themes")
    (site / "hugo.toml").write_text(config + "\n" + imports)
    run(["hugo", "mod", "get", FUGU_MODULE], site)
    graph = run(["hugo", "mod", "graph"], site)
    want = re.search(rf"^require {re.escape(BLOWFISH_MODULE)} (\S+)",
                     (FUGU / "go.mod").read_text(), re.M).group(1)
    if f"{BLOWFISH_MODULE}@{want}" not in graph:
        sys.exit(f"install: the site didn't get Blowfish {want}, Fugu's go.mod requirement")


def install_submodules(site, doc, blowfish):
    steps = block_after(doc, "### As git submodules")
    for line in steps.splitlines():
        line = line.strip()
        if not line or line.startswith(("hugo new site", "cd ")):
            continue
        line = line.replace("https://github.com/robotpony/hugo-theme-fugu.git", str(FUGU))
        if blowfish:
            line = line.replace("https://github.com/nunocoracao/blowfish.git", str(blowfish))
        # Local paths need file transport, which git turns off for submodules.
        line = line.replace("git submodule add", "git -c protocol.file.allow=always submodule add")
        run(line, site, shell=True)
    # The minimum config, plus the replacement that points Fugu's
    # hugo-warped import at the submodule.
    replacement = block_after(doc, "List Fugu first in `theme`")
    (site / "hugo.toml").write_text(block_after(doc, "## 2. The minimum config") + "\n" + replacement)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0].split("—", 1)[1].strip())
    ap.add_argument("method", choices=["modules", "submodules"])
    ap.add_argument("--blowfish", type=Path, help="a local Blowfish checkout to use instead of fetching it")
    ap.add_argument("--keep", action="store_true", help="keep the site and print where it is")
    args = ap.parse_args()
    blowfish = args.blowfish.resolve() if args.blowfish else None

    doc = DOC.read_text()
    tmp = Path(tempfile.mkdtemp(prefix="fugu-install-"))
    site = tmp / "my-cookbook"
    try:
        run(["hugo", "new", "site", str(site), "--quiet"], tmp)
        (site / "hugo.toml").unlink(missing_ok=True)
        (site / "archetypes" / "default.md").unlink(missing_ok=True)
        if args.method == "modules":
            install_modules(site, doc, blowfish)
        else:
            install_submodules(site, doc, blowfish)

        recipes = site / "content" / "recipes"
        recipes.mkdir(parents=True)
        (recipes / "_index.md").write_text(block_after(doc, "Create `content/recipes/_index.md`"))
        (recipes / "plain-rice.md").write_text(block_after(doc, "Create `content/recipes/plain-rice.md`"))
        out = run(["hugo", "--logLevel", "warn", "--destination", "public"], site)
        warnings = [l for l in out.splitlines() if l.startswith("WARN")
                    and not any(p.search(l) for p in IGNORED_WARNINGS)]
        if warnings:
            sys.exit("install: build warned:\n" + "\n".join(warnings))

        page = (site / "public" / "recipes" / "plain-rice" / "index.html").read_text()
        checks = {
            "ingredients": 'data-ing-heading="true"',
            "an ingredient": "long-grain rice",
            "the method": 'data-method-heading="true"',
            "the sidebar": 'id="recipe-sidebar"',
            "the ingredients script": "/js/ingredients",
        }
        missing = [name for name, text in checks.items() if text not in page]
        if not (site / "public" / "recipes" / "index.json").exists():
            missing.append("recipes/index.json")
        if missing:
            sys.exit(f"install ({args.method}): the recipe page lacks " + ", ".join(missing))
        print(f"ok    install by {args.method}")
    finally:
        if args.keep:
            print(f"site: {site}")
        else:
            shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
