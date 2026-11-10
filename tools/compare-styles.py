#!/usr/bin/env python3
"""
compare-styles.py — Check that a CSS change doesn't alter how a site's
pages look by accident.

compare-builds.py compares the built HTML, which a stylesheet change
leaves alone. This renders pages in headless Chrome instead, before and
after, and compares every element: its box (position and size on the
page) and the computed styles that make up its look (colour, background,
font, size, weight, line height, letter spacing, borders, radius,
shadow, opacity, display), plus its ::before and ::after when they draw
something. Each page is measured at a desktop and a phone width, in light
and dark mode. Differences are grouped by what changed ("color:
rgb(43, 44, 37) -> rgb(0, 0, 0)" on 212 elements over 9 pages), with
examples, and moved boxes are listed by page. Exits 0 when nothing
differs, 1 when something does.

Usage:
    compare-styles.py                    the site and Fugu at HEAD vs their working trees
    compare-styles.py --ref REV          Fugu at REV (the site's styling still at HEAD)
    compare-styles.py --site-ref REV     the site's styling at REV
    compare-styles.py OLD NEW            two folders you've already built
    compare-styles.py --page /recipes/x/ ...   add pages to the automatic set

"Before" is a copy of the site whose styling files (assets/, layouts/,
config/, i18n/, and a hugo.toml or config.toml) that differ from the
site's --site-ref are put back to it, built with Fugu at --ref; content
is the working tree's on both sides, so a content edit in progress never
shows up as a style change. "After" is the site as it is on disk.

Pages: the home page, each section's list page, a page or two from each
section, a taxonomy list and a term, and the first page carrying each of
the components Fugu draws (ingredients, percentage tables, formula, flow
and stack diagrams, popovers, the glossary, the lineage timeline, photos,
part rows), from the "after" build. --page adds more; --pages-only uses
only those.

Not measured: hover and focus states, and anything a script draws more
than a few seconds after load. --open adds a view of each page with every
<details> open (the gear panel, contents toggles) and the first popover
shown; --all measures every page instead of the sample (slow: about a
second a view). The site is
$FUGU_SITE_ROOT or the nearest Hugo site, as for the other tools. Hugo is
$HUGO, Chrome is $CHROME (default: Google Chrome's usual place on macOS,
else `google-chrome` or `chromium` on the PATH). Python standard library
only.
"""

import argparse
import functools
import http.server
import json
import os
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import threading
import urllib.parse
from collections import defaultdict
from pathlib import Path

THEME_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from frontmatter import find_site_root, hugo_bin  # noqa: E402

TOOL = "compare-styles"
STYLE_PATHS = ["assets", "layouts", "config", "i18n", "hugo.toml", "config.toml"]
SKIP_COPY = {".git", "public", "resources", "themes", ".hugo_build.lock"}
WIDTHS = (1280, 390)
MODES = ("light", "dark")
HARNESS = "/__fugu_styles__.html"

# A page carrying each component, found by a marker in its built HTML. The
# percentage table and photos are drawn by scripts, so their markers are
# what the scripts start from.
COMPONENTS = [
    ("ingredients", 'data-ing-heading="true"'),
    ("ingredient groups", 'ing-subhead'),
    ("percentage table", "<th>%"),
    ("formula", 'class="formula'),
    ("flow", 'class="flow'),
    ("stack", 'class="stack'),
    ("popover", 'class="pop-host'),
    ("principle chip", 'principle-chip'),
    ("glossary", 'class="gl-letter'),
    ("lineage timeline", 'class="tl-'),
    ("side lineage", 'class="vt-'),
    ("part rows", 'class="part-row'),
    ("photos", "<figure"),
    ("draft banner", 'class="dev-strip'),
    ("table", "<table"),
    ("blockquote", "<blockquote"),
    ("code", "<pre"),
]

# The measuring page, served beside each build so its iframes share the
# build's origin. It loads each page at each width and mode, waits for
# fonts and scripts, and writes the measurements into #out, which
# Chrome's --dump-dom prints.
HARNESS_HTML = r"""<!doctype html><meta charset="utf-8"><body><pre id="out"></pre><script>
const PROPS = ["display","position","visibility","opacity","color","background-color","background-image",
  "font-family","font-size","font-weight","font-style","line-height","letter-spacing","text-transform",
  "text-decoration-line","text-decoration-color","text-decoration-style","text-align","white-space",
  "border-top-width","border-right-width","border-bottom-width","border-left-width",
  "border-top-style","border-right-style","border-bottom-style","border-left-style",
  "border-top-color","border-right-color","border-bottom-color","border-left-color",
  "border-radius","box-shadow","z-index","list-style-type","fill","stroke","stroke-width","transform","filter"];
const PSEUDO = ["content","color","background-color","width","height","top","left","border-top-color","border-bottom-color",
  "border-top-width","border-bottom-width","font-size"];
const q = new URLSearchParams(location.search);
const pages = JSON.parse(q.get("pages")), widths = JSON.parse(q.get("widths")), modes = JSON.parse(q.get("modes"));
const states = JSON.parse(q.get("states") || '["closed"]');
const sleep = t => new Promise(r => setTimeout(r, t));
const r1 = n => Math.round(n * 10) / 10;
function label(el) {
  let s = el.tagName.toLowerCase();
  if (el.id) s += "#" + el.id;
  const c = (el.getAttribute("class") || "").trim().split(/\s+/).filter(Boolean).slice(0, 3);
  if (c.length) s += "." + c.join(".");
  return s;
}
function measure(doc, win) {
  const out = [];
  const all = doc.body.querySelectorAll("*");
  let i = 0;
  for (const el of all) {
    const tag = el.tagName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT" || tag === "TEMPLATE" || tag === "LINK") continue;
    i++;
    const cs = win.getComputedStyle(el);
    const b = el.getBoundingClientRect();
    const rec = {k: i + " " + label(el), box: [r1(b.x + win.scrollX), r1(b.y + win.scrollY), r1(b.width), r1(b.height)], s: {}};
    for (const p of PROPS) rec.s[p] = cs.getPropertyValue(p);
    for (const ps of ["::before", "::after"]) {
      const pcs = win.getComputedStyle(el, ps);
      const c = pcs.getPropertyValue("content");
      if (c && c !== "none" && c !== "normal") for (const p of PSEUDO) rec.s[ps + " " + p] = pcs.getPropertyValue(p);
    }
    out.push(rec);
  }
  return out;
}
// "open": every <details> open (the gear panel, contents toggles) and the
// first popover shown, by focusing its link (popovers open on hover or
// focus-within, and hover can't be set from a script).
function openUp(doc) {
  doc.querySelectorAll("details").forEach(d => { d.open = true; });
  const pop = doc.querySelector(".pop-host a, .pop-host [tabindex]");
  if (pop) pop.focus({preventScroll: true});
}
async function settled(doc, win) {
  await sleep(500);
  let prev = JSON.stringify(measure(doc, win)), cur = null;
  for (let n = 0; n < 3; n++) {
    await sleep(700);
    cur = JSON.stringify(measure(doc, win));
    if (cur === prev) break;
    prev = cur;
  }
  return cur === prev ? JSON.parse(cur) : {error: "still changing after four passes"};
}
async function run() {
  const res = {};
  for (const page of pages) for (const w of widths) for (const mode of modes) {
    const f = document.createElement("iframe");
    f.style.cssText = "width:" + w + "px;height:900px;border:0";
    const loaded = new Promise(r => f.onload = r);
    f.src = page;
    document.body.appendChild(f);
    await loaded;
    const doc = f.contentDocument, win = f.contentWindow;
    let key = page + " @" + w + " " + mode;
    try {
      // Transitions off, so a colour isn't caught halfway to dark.
      const still = doc.createElement("style");
      still.textContent = "*,*::before,*::after{transition:none!important;animation:none!important}";
      doc.head.appendChild(still);
      doc.documentElement.classList.toggle("dark", mode === "dark");
      // Every declared face loaded, not only those already asked for: a
      // face that arrives mid-measure moves a line break.
      if (doc.fonts) {
        await Promise.all([...doc.fonts].map(f => f.load().catch(() => null)));
        await doc.fonts.ready;
      }
      // Measured until two passes agree (up to four), so a late font,
      // image or script doesn't pass for a style change.
      if (states.includes("closed")) res[key] = await settled(doc, win);
      if (states.includes("open")) {
        openUp(doc);
        res[key + " open"] = await settled(doc, win);
      }
    } catch (e) { res[key] = {error: String(e)}; }
    f.remove();
  }
  document.getElementById("out").textContent = JSON.stringify(res);
  document.title = "done";
}
run();
</script>"""


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.split("?", 1)[0] == HARNESS:
            body = HARNESS_HTML.encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def log_message(self, *args):
        pass


def serve(folder):
    """Serve a build folder on a free local port; returns (server, base URL)."""
    handler = functools.partial(Handler, directory=str(folder))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, f"http://127.0.0.1:{server.server_address[1]}"


def chrome_bin():
    if os.environ.get("CHROME"):
        return os.environ["CHROME"]
    mac = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    if Path(mac).exists():
        return mac
    for name in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser"):
        found = shutil.which(name)
        if found:
            return found
    sys.exit(f"{TOOL}: no Chrome found; set CHROME to its path")


def measure_pages(base, pages, widths, modes, profile, states=("closed",)):
    """Run the harness in headless Chrome over `pages`; returns
    {"<page> @<width> <mode>": [element records]}."""
    query = urllib.parse.urlencode({"pages": json.dumps(pages), "widths": json.dumps(list(widths)),
                                    "modes": json.dumps(list(modes)), "states": json.dumps(list(states))})
    cmd = [chrome_bin(), "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
           f"--user-data-dir={profile}", "--window-size=1400,1000", "--hide-scrollbars",
           "--virtual-time-budget=600000", "--dump-dom", f"{base}{HARNESS}?{query}"]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
    except OSError as e:
        sys.exit(f"{TOOL}: can't run Chrome ({cmd[0]}): {e.strerror}; set CHROME to its path")
    except subprocess.TimeoutExpired:
        sys.exit(f"{TOOL}: Chrome took more than 15 minutes on {len(pages)} pages")
    m = re.search(r'<pre id="out">(.*?)</pre>', result.stdout, re.S)
    if not m or not m.group(1).strip():
        sys.exit(f"{TOOL}: Chrome returned no measurements from {base}:\n{result.stderr[-2000:]}")
    import html
    return json.loads(html.unescape(m.group(1)))


def pick_pages(build):
    """The automatic page set, as site paths ("/recipes/x/")."""
    def path_of(index):
        rel = index.parent.relative_to(build).as_posix()
        return "/" if rel == "." else f"/{rel}/"

    pages = ["/"]
    top = sorted(p for p in build.iterdir() if p.is_dir() and (p / "index.html").exists())
    for section in top:
        pages.append(path_of(section / "index.html"))
        children = sorted(c for c in section.iterdir()
                          if c.is_dir() and c.name != "page" and (c / "index.html").exists())
        for child in children[:2]:
            pages.append(path_of(child / "index.html"))
    found = {}
    for index in sorted(build.rglob("index.html")):
        if "/page/" in index.as_posix():
            continue
        try:
            text = index.read_text(errors="replace")
        except OSError:
            continue
        for name, marker in COMPONENTS:
            if name not in found and marker in text:
                found[name] = path_of(index)
        if len(found) == len(COMPONENTS):
            break
    if (build / "404.html").exists():
        pages.append("/404.html")
    pages += found.values()
    return list(dict.fromkeys(pages)), found


def site_copy_at(site, site_ref, into):
    """A copy of the site whose styling files are put back to `site_ref`
    where they differ from it; everything else as on disk."""
    into.mkdir(parents=True)
    for entry in site.iterdir():
        if entry.name in SKIP_COPY:
            continue
        dest = into / entry.name
        if entry.is_dir():
            shutil.copytree(entry, dest, symlinks=True)
        else:
            shutil.copy2(entry, dest)
    # Hugo reads each page's git history (enableGitInfo); a link to the
    # site's .git gives the copy the same dates. Hugo only reads it.
    if (site / ".git").exists():
        (into / ".git").symlink_to((site / ".git").resolve())
    git = ["git", "-C", str(site)]
    paths = [p for p in STYLE_PATHS if (site / p).exists() or
             subprocess.run(git + ["cat-file", "-e", f"{site_ref}:{p}"], capture_output=True).returncode == 0]
    changed = subprocess.run(git + ["diff", "--name-only", site_ref, "--"] + paths,
                             capture_output=True, text=True)
    if changed.returncode != 0:
        sys.exit(f"{TOOL}: git diff {site_ref} in {site} failed:\n{changed.stderr}")
    untracked = subprocess.run(git + ["ls-files", "--others", "--exclude-standard", "--"] + paths,
                               capture_output=True, text=True).stdout
    restored = []
    for rel in sorted(set(changed.stdout.split() + untracked.split())):
        target = into / rel
        old = subprocess.run(git + ["show", f"{site_ref}:{rel}"], capture_output=True)
        if old.returncode == 0:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(old.stdout)
        elif target.exists():
            target.unlink()
        restored.append(rel)
    return restored


def hugo_build(source, out, themes_dir=None, extra=()):
    cmd = [hugo_bin(), "--quiet", "--source", str(source), "--destination", str(out)]
    if themes_dir:
        cmd += ["--themesDir", str(themes_dir)]
    cmd += list(extra)
    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
    except OSError as e:
        sys.exit(f"{TOOL}: can't run {cmd[0]}: {e.strerror} (set HUGO to its path)")
    if result.returncode != 0:
        sys.exit(f"{TOOL}: {' '.join(cmd)} failed:\n{result.stderr}")


def themes_at_ref(ref, site_themes, into):
    """Fugu at `ref` from git archive, beside links to the site's other themes."""
    fugu = into / THEME_DIR.name
    fugu.mkdir(parents=True)
    archive = subprocess.run(["git", "-C", str(THEME_DIR), "archive", ref], capture_output=True)
    if archive.returncode != 0:
        sys.exit(f"{TOOL}: git archive {ref} failed:\n{archive.stderr.decode()}")
    subprocess.run(["tar", "-x", "-C", str(fugu)], input=archive.stdout, check=True)
    for sibling in site_themes.iterdir():
        if sibling.name != THEME_DIR.name and sibling.is_dir():
            (into / sibling.name).symlink_to(sibling.resolve())
    return into


NUM_RE = re.compile(r"-?\d+(?:\.\d+)?")


COLOR_FN_RE = re.compile(r"color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: / ([\d.]+))?\)")


def srgb_to_rgb(v):
    """color(srgb 0.12 0.12 0.12 / 0.5) -> rgba(30.6, 30.6, 30.6, 0.5): Chrome
    reports color-mix() results in that form, the same colour as an rgb()."""
    def rgb(m):
        r, g, b = (float(x) * 255 for x in m.groups()[:3])
        return f"rgba({r:g}, {g:g}, {b:g}, {m.group(4)})" if m.group(4) else f"rgb({r:g}, {g:g}, {b:g})"
    return COLOR_FN_RE.sub(rgb, v)


def same_value(a, b, tolerance):
    """Equal, or the same apart from numbers within `tolerance` (8.48438px
    and 8.46875px: font metrics differ in the last decimal between runs).
    A color(srgb ...) counts as the rgb() it names, within 1 of each channel."""
    if a == b:
        return True
    if "color(srgb" in a or "color(srgb" in b:
        a, b = srgb_to_rgb(a), srgb_to_rgb(b)
        tolerance = max(tolerance, 1)
        a, b = a.replace("rgba(", "rgb(").replace(", 1)", ")"), b.replace("rgba(", "rgb(").replace(", 1)", ")")
    if NUM_RE.sub("#", a) != NUM_RE.sub("#", b):
        return False
    return all(abs(float(x) - float(y)) <= tolerance for x, y in zip(NUM_RE.findall(a), NUM_RE.findall(b)))


def compare(before, after, tolerance, examples):
    """Print the differences; returns True when there are none."""
    groups = defaultdict(lambda: {"n": 0, "pages": set(), "ex": []})
    moved = defaultdict(list)
    missing = []
    for key in sorted(set(before) | set(after)):
        a, b = before.get(key), after.get(key)
        if not isinstance(a, list) or not isinstance(b, list):
            for side, v in (("before", a), ("after", b)):
                if not isinstance(v, list):
                    print(f"! {key}: not measured {side}: {v['error'] if isinstance(v, dict) else 'missing'}")
            missing.append(None)
            continue
        page = key
        if len(a) != len(b):
            missing.append((key, f"{len(a)} elements", f"{len(b)} elements"))
        for ea, eb in zip(a, b):
            if ea["k"] != eb["k"]:
                missing.append((key, ea["k"], eb["k"]))
                break
            for prop in sorted(set(ea["s"]) | set(eb["s"])):
                va, vb = ea["s"].get(prop, "(none)"), eb["s"].get(prop, "(none)")
                if not same_value(va, vb, tolerance):
                    g = groups[(prop, va, vb)]
                    g["n"] += 1
                    g["pages"].add(page)
                    if len(g["ex"]) < examples:
                        g["ex"].append(f"{page}: {ea['k']}")
            if any(abs(x - y) > tolerance for x, y in zip(ea["box"], eb["box"])):
                moved[page].append((ea["k"], ea["box"], eb["box"]))

    for item in missing:
        if item is None:
            continue
        key, a, b = item
        print(f"! {key}: structure differs ({a} -> {b}); the pages' HTML changed, see compare-builds.py")
    for (prop, va, vb), g in sorted(groups.items(), key=lambda kv: -kv[1]["n"]):
        print(f"~ {prop}: {va} -> {vb}  ({g['n']} elements, {len(g['pages'])} page views)")
        for ex in g["ex"]:
            print(f"    {ex}")
    for page, items in moved.items():
        print(f"> {page}: {len(items)} boxes moved or resized (x, y, width, height)")
        for k, ba, bb in items[:examples]:
            print(f"    {k}: {ba} -> {bb}")
    n_views = len(set(before) & set(after))
    if not (groups or moved or missing):
        print(f"No differences in {n_views} page views.")
        return True
    print(f"\n{len(groups)} style changes, boxes moved on {len(moved)} of {n_views} page views.")
    return False


def main():
    signal.signal(signal.SIGPIPE, signal.SIG_DFL)
    parser = argparse.ArgumentParser(
        description=__doc__.strip().split("\n\n")[0].split("— ", 1)[1].replace("\n", " "),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="\n\n".join(__doc__.strip().split("\n\n")[2:]))
    parser.add_argument("old", nargs="?", type=Path, help="an existing build folder (the 'before')")
    parser.add_argument("new", nargs="?", type=Path, help="an existing build folder (the 'after')")
    parser.add_argument("--ref", default="HEAD", help="the Fugu commit to build as 'before' (default: HEAD)")
    parser.add_argument("--site-ref", default="HEAD",
                        help="the site commit whose styling files 'before' uses (default: HEAD)")
    parser.add_argument("--page", action="append", default=[], metavar="PATH",
                        help="a site path to measure as well, e.g. /recipes/beef-stew/; repeatable")
    parser.add_argument("--pages-only", action="store_true", help="measure only the --page paths")
    parser.add_argument("--width", action="append", type=int, metavar="PX",
                        help=f"a viewport width; repeatable (default: {', '.join(map(str, WIDTHS))})")
    parser.add_argument("--mode", action="append", choices=MODES, help="light or dark; repeatable (default: both)")
    parser.add_argument("--open", action="store_true",
                        help="also measure each view with every <details> open and the first popover shown")
    parser.add_argument("--all", action="store_true", help="measure every page the build has (slow)")
    parser.add_argument("--tolerance", type=float, default=0.5, metavar="PX",
                        help="how far a box may move before it counts (default: 0.5)")
    parser.add_argument("--examples", type=int, default=4, metavar="N", help="examples per difference (default: 4)")
    parser.add_argument("--hugo-arg", action="append", default=[], metavar="ARG",
                        help="pass an argument to both hugo builds, e.g. --hugo-arg=-D; repeatable")
    parser.add_argument("--keep", action="store_true", help="keep the work folder and print where it is")
    args = parser.parse_args()
    if args.pages_only and not args.page:
        parser.error("--pages-only needs at least one --page")
    widths, modes = args.width or WIDTHS, args.mode or MODES

    work = Path(tempfile.mkdtemp(prefix="fugu-styles-"))
    try:
        if args.old or args.new:
            if not (args.old and args.new):
                parser.error("give both OLD and NEW, or neither")
            old, new = args.old, args.new
            for d in (old, new):
                if not d.is_dir():
                    parser.error(f"{d} is not a folder")
        else:
            site = find_site_root()
            themes = site / "themes"
            if THEME_DIR.parent.resolve() != themes.resolve():
                sys.exit(f"{TOOL}: this Fugu ({THEME_DIR}) isn't the one {site} builds with "
                         f"({themes}/); run the copy in the site's themes folder, or pass OLD and NEW")
            old, new = work / "old", work / "new"
            restored = site_copy_at(site, args.site_ref, work / "site")
            hugo_build(work / "site", old, themes_at_ref(args.ref, themes, work / "themes"), args.hugo_arg)
            hugo_build(site, new, extra=args.hugo_arg)
            print(f"Site: {site}\nBefore: Fugu at {args.ref}, the site's styling at {args.site_ref}"
                  f"{' (' + str(len(restored)) + ' files put back)' if restored else ''}. "
                  "After: both working trees.")

        if args.pages_only:
            pages = list(dict.fromkeys(args.page))
        elif args.all:
            pages = sorted({"/" if p.parent == new else "/" + p.parent.relative_to(new).as_posix() + "/"
                            for p in new.rglob("index.html")})
        else:
            pages, found = pick_pages(new)
            pages = list(dict.fromkeys(pages + args.page))
            absent = [name for name, _ in COMPONENTS if name not in found]
            if absent:
                print(f"No page has: {', '.join(absent)}.")
        print(f"Measuring {len(pages)} pages at {', '.join(map(str, widths))}px, {' and '.join(modes)}.\n")

        results = []
        for side, folder in (("before", old), ("after", new)):
            server, base = serve(folder)
            try:
                states = ("closed", "open") if args.open else ("closed",)
                results.append(measure_pages(base, pages, widths, modes, work / f"profile-{side}", states))
            finally:
                server.shutdown()
        ok = compare(results[0], results[1], args.tolerance, args.examples)
    finally:
        if args.keep:
            print(f"\nWork folder kept in {work}")
        else:
            shutil.rmtree(work, ignore_errors=True)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
