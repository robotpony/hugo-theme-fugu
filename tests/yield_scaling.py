#!/usr/bin/env python3
"""
yield_scaling.py: Checks scaleYield, the yield line's scaling, in headless Chrome.

scaleYield (assets/js/ingredients.js) scales a recipe's servings and
portions for the scale menu's yield line and the sidebar's Serves and
Makes rows. This takes the function and its helpers out of the script,
runs them on a test page over the cases below (most of them Not a Chef's
real yields), and reports any that read differently. Needs Google Chrome
($CHROME). Python standard library only.

    python3 tests/yield_scaling.py
"""

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

FUGU = Path(__file__).resolve().parent.parent
SCRIPT = FUGU / "assets" / "js" / "ingredients.js"
CHROME_PATHS = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "google-chrome", "google-chrome-stable", "chromium",
]

# (written, scale, expected). None: left as written.
CASES = [
    # A count's word agrees with it.
    ("1 drink", 2, "2 drinks"),
    ("1 loaf", 2, "2 loaves"),
    ("1 batch", 2, "2 batches"),
    ("1 cherry pie", 2, "2 cherry pies"),
    ("1 pan of buns (6–12, depending on size)", 2, "2 pans of buns (12–24, depending on size)"),
    ("about 1 cup (250 ml)", 2, "about 2 cups (500 ml)"),
    ("2 loaves", 0.5, "1 loaf"),
    ("1–2 loaves", 2, "2–4 loaves"),
    ("1–2 loaves", 0.5, "1 loaf"),
    ("~200 ml (¾ cup)", 2, "~400 ml (1½ cups)"),
    # Units, "dozen", and nouns the same in both forms stay.
    ("1 kg potatoes", 2, "2 kg potatoes"),
    ("about 1 L (4 cups)", 2, "about 2 L (8 cups)"),
    ("1 dozen buns", 2, "2 dozen buns"),
    ("about 2 dozen cookies", 0.5, "about 1 dozen cookies"),
    ("about 11 naan", 2, "about 22 naan"),
    # A parenthesis restating the whole yield scales, ranges at both ends.
    ("about 1.7 kg (30–35 meatballs)", 2, "about 3.4 kg (60–70 meatballs)"),
    ("4 (about 12 pancakes)", 2, "8 (about 24 pancakes)"),
    ("4 (makes ~300ml)", 2, "8 (makes ~600ml)"),
    ("~550 ml (2¼ cups)", 2, "~1.1 L (4½ cups)"),
    ("about 6 L (6 qt)", 2, "about 12 L (12 qt)"),
    # One about a single piece doesn't.
    ("8 individual pizzas (200 g each)", 2, "16 individual pizzas (200 g each)"),
    ("6–12 (3–5 meatballs each)", 2, "12–24 (3–5 meatballs each)"),
    ("8 (125 g portions)", 2, "16 (125 g portions)"),
    ("4 (200 ml / 7 oz ramekins)", 2, "8 (200 ml / 7 oz ramekins)"),
    ("1 pan (23×33 cm / 9×13 in)", 2, "2 pans (23×33 cm / 9×13 in)"),
    # Alternatives each scale.
    ("6 burger buns, 8 hot dog buns, or 9 dinner buns", 2, "12 burger buns, 16 hot dog buns, or 18 dinner buns"),
    # Ranges widen outward; past 1000, ml and g read as L and kg.
    ("3–4", 1.5, "4–6"),
    ("12–14 bars", 2, "24–28 bars"),
    ("~500 ml", 2, "~1 L"),
    ("~775 g (~5 cups)", 2, "~1.6 kg (~10 cups)"),
    ("about 750 ml (3 small grocery-store tubs)", 2, "about 1.5 L (6 small grocery-store tubs)"),
    # What can't be scaled honestly isn't.
    ("makes ~750 ml", 2, None),
    ("enough for about 700 g chicken", 2, None),
    ("4+ (as a protein component)", 2, None),
]


def chrome():
    if os.environ.get("CHROME"):
        return os.environ["CHROME"]
    for c in CHROME_PATHS:
        if Path(c).exists() or shutil.which(c):
            return c
    sys.exit("yield_scaling: no Chrome found; set CHROME")


def functions():
    """FRACTIONS, formatFraction, and the yield helpers through scaleYield."""
    src = SCRIPT.read_text()
    fractions = re.search(r"  var FRACTIONS = \[.*?\];\n", src, re.S).group(0)
    fmt = re.search(r"  function formatFraction\(value\) \{.*?\n  \}\n", src, re.S).group(0)
    start = src.index("  var YIELD_FRACTION_CHARS")
    end = src.index("\n  }\n", src.index("  function scaleYield(")) + 4
    return fractions + fmt + src[start:end]


def main():
    cases = [[w, s] for w, s, _ in CASES]
    page = ("<!doctype html><html lang=\"en\"><meta charset=\"utf-8\"><pre id=\"out\"></pre><script>\n"
            + functions()
            + "\nvar cases = " + json.dumps(cases, ensure_ascii=False) + ";\n"
            + "document.getElementById('out').textContent = JSON.stringify("
            + "cases.map(function (c) { return scaleYield(c[0], c[1]); }));\n</script>")
    with tempfile.TemporaryDirectory() as tmp:
        html = Path(tmp) / "yields.html"
        html.write_text(page)
        out = subprocess.run([chrome(), "--headless=new", "--disable-gpu", "--no-first-run",
                              f"--user-data-dir={tmp}/profile", "--dump-dom", html.as_uri()],
                             capture_output=True, text=True, timeout=120).stdout
    m = re.search(r'<pre id="out">(.*?)</pre>', out, re.S)
    if not m:
        sys.exit("yield_scaling: the test page returned nothing (a script error?)")
    import html as h
    got = json.loads(h.unescape(m.group(1)))
    bad = [(w, s, e, g) for (w, s, e), g in zip(CASES, got) if g != e]
    for w, s, e, g in bad:
        print(f"FAIL  {w!r} at {s}×: expected {e!r}, got {g!r}")
    print(f"{len(CASES) - len(bad)} of {len(CASES)} yields scale as expected.")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
