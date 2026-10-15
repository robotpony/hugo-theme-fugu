#!/usr/bin/env python3
"""
screenshots.py — Take the README and docs screenshots in one run.

Builds a site (the example site by default) into a temporary folder,
serves it on 127.0.0.1, and points headless Chrome at a fixed list of
shots, each a page at a window size in light or dark mode. Writes them to
docs/images/ at 2x, plus the theme listing's images/screenshot.png
(1500x1000) and images/tn.png (900x600). Run it again whenever the styles
change.

The server adds a small script to each page it serves for a shot, so the
theme needs no hooks for this: it sets Blowfish's `appearance` in
localStorage (light or dark, so the machine's own setting doesn't count),
can set a recipe's scale (`ing:scale:<page key>`, as ingredients.js keeps
it), and can open a <details> element once the page has loaded (the scale
and units menu). Each shot gets a fresh Chrome profile, so nothing carries
over between them.

Headless Chrome won't make a window narrower than 500px, so a phone-width
shot loads its page in an iframe of that width (the server's /__frame
page) and the PNG is cropped to it afterwards.

Needs Hugo and Google Chrome (found on the usual paths, or $CHROME). PNGs
go through oxipng or optipng when one is installed. Python standard
library only.
"""

import argparse
import functools
import http.server
import os
import re
import shutil
import socket
import struct
import subprocess
import sys
import tempfile
import threading
import urllib.parse
import zlib
from pathlib import Path

FUGU = Path(__file__).resolve().parent.parent
EXAMPLE = FUGU / "exampleSite"

# name, page (with an optional #anchor to scroll to), window width and
# height (CSS pixels), and options:
#   dark   dark mode instead of light
#   scale  the recipe's scale, as the scale slider sets it
#   open   a CSS selector for a <details> to open after load
SHOTS = [
    ("recipe",        "/recipes/veg-patties/",                 1280, 900, {}),
    ("recipe-dark",   "/recipes/veg-patties/",                 1280, 900, {"dark": True}),
    ("recipe-phone",  "/recipes/veg-patties/",                  390, 844, {}),
    ("scaling",       "/recipes/butter-tarts/",                1280, 900, {"scale": 2, "open": "details.ing-config"}),
    ("cards",         "/recipes/",                             1280, 900, {}),
    ("build",         "/methods/burgers/builds/drive-in-deluxe/#picks", 1280, 1300, {}),
    ("blueprint",     "/methods/burgers/",                     1280, 900, {}),
    ("methods",       "/methods/",                             1280, 900, {}),
    ("principle",     "/tags/win-the-fridge/",                 1280, 900, {}),
]

# The theme listing (themes.gohugo.io): exact sizes, so 1x and 0.6x.
LISTING = [
    ("screenshot", 1.0),
    ("tn", 0.6),
]
LISTING_PAGE = ("/recipes/veg-patties/", 1500, 1000, {})

# Headless Chrome's narrowest window; narrower shots go through /__frame.
MIN_WINDOW = 500

CHROME_PATHS = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "google-chrome", "google-chrome-stable", "chromium", "chromium-browser",
]


def find_chrome():
    for candidate in [os.environ.get("CHROME")] + CHROME_PATHS:
        if not candidate:
            continue
        path = shutil.which(candidate) or (candidate if Path(candidate).is_file() else None)
        if path:
            return path
    return None


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def shot_script(html, opts):
    """The <script> the server adds at the top of <head> for one shot."""
    lines = [f"localStorage.setItem('appearance', '{'dark' if opts.get('dark') else 'light'}');"]
    if "scale" in opts:
        key = re.search(r'data-page-key="([^"]+)"', html)
        if key:
            lines.append(f"localStorage.setItem('ing:scale:{key.group(1)}', '{opts['scale']}');")
    if "open" in opts:
        lines.append("addEventListener('load', function () {"
                     f" var d = document.querySelector('{opts['open']}'); if (d) d.open = true; }});")
    return "<script>try {" + " ".join(lines) + "} catch (e) {}</script>"


class Handler(http.server.SimpleHTTPRequestHandler):
    """Serves the build, adding a shot's script to HTML pages. The shot's
    options come from the query string (?dark=1&scale=2&open=...)."""

    def log_message(self, *args):
        pass

    def do_GET(self):
        path, _, query = self.path.partition("?")
        if not query:
            return super().do_GET()
        opts = dict(p.split("=", 1) for p in query.split("&") if "=" in p)
        opts = {k: urllib.parse.unquote(v) for k, v in opts.items()}
        if path == "/__frame":
            return self.send_html(
                '<!doctype html><html><body style="margin:0">'
                f'<iframe src="{opts["src"]}" width="{opts["w"]}" height="{opts["h"]}" '
                'scrolling="no" style="border:0;display:block"></iframe></body></html>')
        if "dark" in opts:
            opts["dark"] = opts["dark"] == "1"
        target = Path(self.translate_path(path))
        if target.is_dir():
            target = target / "index.html"
        if not target.is_file():
            return self.send_error(404)
        html = target.read_text(errors="replace")
        self.send_html(html.replace("<head>", "<head>" + shot_script(html, opts), 1))

    def send_html(self, html):
        body = html.encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def page_url(base, page, opts):
    page, _, anchor = page.partition("#")
    query = [f"dark={1 if opts.get('dark') else 0}"]
    if "scale" in opts:
        query.append(f"scale={opts['scale']}")
    if "open" in opts:
        query.append("open=" + urllib.parse.quote(opts["open"]))
    return base + page + "?" + "&".join(query) + ("#" + anchor if anchor else "")


def crop_png(path, width):
    """Crop a PNG to its leftmost `width` pixels: 8-bit RGB or RGBA, not
    interlaced, as Chrome writes them. Rows are re-filtered with Sub."""
    data = path.read_bytes()
    pos, idat, ihdr = 8, b"", None
    while pos < len(data):
        length, kind = struct.unpack(">I4s", data[pos:pos + 8])
        chunk = data[pos + 8:pos + 8 + length]
        if kind == b"IHDR":
            ihdr = chunk
        elif kind == b"IDAT":
            idat += chunk
        pos += 12 + length
    w, h, depth, colour, _, _, interlace = struct.unpack(">IIBBBBB", ihdr)
    if depth != 8 or colour not in (2, 6) or interlace:
        raise RuntimeError(f"can't crop {path.name}: not an 8-bit RGB(A) PNG")
    bpp = 4 if colour == 6 else 3
    stride = w * bpp
    raw = zlib.decompress(idat)
    prev = bytearray(stride)
    out = bytearray()
    for y in range(h):
        kind = raw[y * (stride + 1)]
        row = bytearray(raw[y * (stride + 1) + 1:(y + 1) * (stride + 1)])
        for i in range(stride):
            a = row[i - bpp] if i >= bpp else 0
            b = prev[i]
            c = prev[i - bpp] if i >= bpp else 0
            if kind == 1:
                row[i] = (row[i] + a) & 255
            elif kind == 2:
                row[i] = (row[i] + b) & 255
            elif kind == 3:
                row[i] = (row[i] + (a + b) // 2) & 255
            elif kind == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                row[i] = (row[i] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        prev = row
        kept = row[:width * bpp]
        out.append(1)
        out += bytes([kept[i] if i < bpp else (kept[i] - kept[i - bpp]) & 255
                      for i in range(len(kept))])

    def chunk(kind, body):
        return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", zlib.crc32(kind + body))
    path.write_bytes(b"\x89PNG\r\n\x1a\n"
                     + chunk(b"IHDR", struct.pack(">IIBBBBB", width, h, 8, colour, 0, 0, 0))
                     + chunk(b"IDAT", zlib.compress(bytes(out), 9))
                     + chunk(b"IEND", b""))


def capture(chrome, url, width, height, factor, dest, work):
    profile = tempfile.mkdtemp(prefix="profile-", dir=work)
    result = subprocess.run(
        [chrome, "--headless=new", "--disable-gpu", "--hide-scrollbars",
         "--no-first-run", "--no-default-browser-check",
         f"--user-data-dir={profile}",
         f"--window-size={width},{height}",
         f"--force-device-scale-factor={factor}",
         "--virtual-time-budget=4000",
         f"--screenshot={dest}", url],
        capture_output=True, text=True, timeout=60)
    if result.returncode != 0 or not dest.is_file():
        raise RuntimeError(f"Chrome couldn't take {dest.name}: {result.stderr.strip()[-300:]}")


def optimise(paths):
    tool = shutil.which("oxipng") or shutil.which("optipng")
    if not tool:
        return None
    args = ["-o", "4", "--strip", "safe"] if tool.endswith("oxipng") else ["-quiet", "-o2"]
    subprocess.run([tool, *args, *map(str, paths)], capture_output=True)
    return Path(tool).name


def main():
    parser = argparse.ArgumentParser(
        description=__doc__.strip().split(" — ", 1)[1],
        formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--site", type=Path, default=EXAMPLE,
                        help="the Hugo site to build (default: exampleSite/)")
    parser.add_argument("--out", type=Path, default=FUGU / "docs" / "images",
                        help="where the docs shots go (default: docs/images/)")
    parser.add_argument("--listing", type=Path, default=FUGU / "images",
                        help="where screenshot.png and tn.png go (default: images/); '' skips them")
    parser.add_argument("--only", nargs="+", metavar="NAME",
                        help="take only these shots: " + ", ".join(s[0] for s in SHOTS))
    parser.add_argument("--hugo", default=os.environ.get("HUGO", "hugo"),
                        help="the hugo binary (default: $HUGO, else hugo on the PATH)")
    parser.add_argument("--scale", type=float, default=2,
                        help="device pixels per CSS pixel for the docs shots (default: 2)")
    args = parser.parse_args()

    if not shutil.which(args.hugo):
        sys.exit(f"error: Hugo not found ({args.hugo}); install it or set $HUGO")
    chrome = find_chrome()
    if not chrome:
        sys.exit("error: Google Chrome not found; install it or set $CHROME to its binary")
    if not (args.site / "hugo.toml").exists():
        sys.exit(f"error: no hugo.toml in {args.site}")
    shots = [s for s in SHOTS if not args.only or s[0] in args.only]
    unknown = set(args.only or []) - {s[0] for s in SHOTS}
    if unknown:
        sys.exit("error: no shot called " + ", ".join(sorted(unknown)))

    work = Path(tempfile.mkdtemp(prefix="fugu-shots-"))
    server = None
    try:
        port = free_port()
        base = f"http://127.0.0.1:{port}"
        build = work / "site"
        result = subprocess.run(
            [args.hugo, "--source", str(args.site), "--destination", str(build),
             "--baseURL", base + "/", "--quiet"],
            capture_output=True, text=True)
        if result.returncode != 0:
            sys.exit("error: the build failed:\n" + result.stderr.strip())

        server = http.server.ThreadingHTTPServer(
            ("127.0.0.1", port), functools.partial(Handler, directory=str(build)))
        threading.Thread(target=server.serve_forever, daemon=True).start()

        written = []
        args.out.mkdir(parents=True, exist_ok=True)
        for name, page, width, height, opts in shots:
            dest = args.out / f"{name}.png"
            url = page_url(base, page, opts)
            if width < MIN_WINDOW:
                frame = urllib.parse.urlencode({"src": url, "w": width, "h": height})
                capture(chrome, f"{base}/__frame?{frame}", MIN_WINDOW, height, args.scale, dest, work)
                crop_png(dest, round(width * args.scale))
            else:
                capture(chrome, url, width, height, args.scale, dest, work)
            written.append(dest)
            print(f"{dest.relative_to(FUGU) if dest.is_relative_to(FUGU) else dest}  {page}  {width}x{height}")

        if str(args.listing) and not args.only:
            args.listing.mkdir(parents=True, exist_ok=True)
            page, width, height, opts = LISTING_PAGE
            for name, factor in LISTING:
                dest = args.listing / f"{name}.png"
                capture(chrome, page_url(base, page, opts), width, height, factor, dest, work)
                written.append(dest)
                print(f"{dest.relative_to(FUGU) if dest.is_relative_to(FUGU) else dest}  {page}  "
                      f"{round(width * factor)}x{round(height * factor)}")

        tool = optimise(written)
        print(f"{len(written)} images" + (f", optimised with {tool}" if tool else ""))
    except (RuntimeError, subprocess.TimeoutExpired) as e:
        sys.exit(f"error: {e}")
    finally:
        if server:
            server.shutdown()
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    main()
