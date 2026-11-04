#!/usr/bin/env python3
"""
percent_scaling.py: Drives the percentage table bar in headless Chrome.

check.py reads built pages, which can't show what ingredients.js does to
them. This builds the everything fixture, serves it on a port the system
picks, loads its recipes in an iframe from a test page, types into the bar,
and compares what the page then says. Needs Hugo and Google Chrome ($HUGO,
$CHROME). Python standard library only.

    python3 tests/percent_scaling.py
"""

import functools
import http.server
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
from pathlib import Path

FUGU = Path(__file__).resolve().parent.parent
FIXTURE = FUGU / "tests" / "sites" / "everything"
CHROME_PATHS = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "google-chrome", "google-chrome-stable", "chromium",
]

TEST_PAGE = r"""<!doctype html><meta charset="utf-8"><iframe id="f" style="width:1280px;height:900px"></iframe>
<pre id="result">unfinished</pre>
<script>
var frame = document.getElementById('f'), results = [];
function load(url) {
  return new Promise(function (done) {
    frame.onload = function () { setTimeout(done, 50); };
    frame.src = url;
  });
}
function doc() { return frame.contentDocument; }
function q(s) { return doc().querySelector(s); }
function clean(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : null; }
function eq(what, got, want) {
  if (JSON.stringify(got) !== JSON.stringify(want)) results.push(what + ': got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want));
}
function column(table, n) {
  return Array.prototype.map.call(doc().querySelectorAll('table')[table].querySelectorAll('tbody tr'),
    function (tr) { return clean(tr.children[n]); });
}
function head(table, n) { return clean(doc().querySelectorAll('table')[table].querySelectorAll('thead th')[n]); }
function type(text) {
  var i = q('.ing-pct-input');
  i.focus();
  i.value = text;
  i.dispatchEvent(new Event('input', { bubbles: true }));
}
function leave() { q('.ing-pct-input').blur(); q('.ing-pct-input').dispatchEvent(new Event('blur')); }
function unit(key) { q('.ing-pct-units [data-base-unit="' + key + '"]').click(); }
function activeUnit() { return q('.ing-pct-units .active').dataset.baseUnit; }
function method() { return clean(Array.prototype.find.call(doc().querySelectorAll('.article-content p'), function (p) { return /Rest/.test(p.textContent); })); }

(async function () {
  try {
    localStorage.clear();
    var page = '/recipes/percent-flatbread/';
    await load(page);

    // As written. Column 0 is the checkbox.
    eq('one bar', doc().querySelectorAll('.ing-pct-bar').length, 1);
    var next = q('.ing-pct-bar').nextElementSibling;
    eq('bar is right above the first table', next.querySelector('table') === doc().querySelectorAll('table')[0] || next === doc().querySelectorAll('table')[0], true);
    eq('name', clean(q('.ing-pct-name')), 'AP flour');
    eq('no slider', q('.ing-scale-range'), null);
    eq('units stay', !!q('.ing-config .ing-units'), true);
    eq('field', q('.ing-pct-input').value, '600');
    eq('starts in the written unit', activeUnit(), 'g');
    eq('units offered', Array.prototype.map.call(doc().querySelectorAll('.ing-pct-units button'), clean), ['g', 'kg', 'lb']);
    eq('written amounts', column(0, 3), ['600g', '420g', '12.5g', '10g', '35g']);
    eq('written head', head(0, 3), 'Per 600 g');
    eq('written head 2', head(1, 3), 'Example: 250 ml shoyu');
    eq('written range', column(1, 3), ['250ml', '200–250ml', '100g']);
    eq('no multiplier', q('.ing-pct-mult').hidden, true);
    eq('no way back', q('.ing-pct-reset').hidden, true);

    // More: rounding, notes, the second table, the Method, the headings.
    type('900');
    eq('1.5x amounts', column(0, 3), ['900g', '630g', '18.8g', '15g', '53g']);
    eq('notes scale', column(0, 4)[4], '38g added with the liquid');
    eq('head', head(0, 3), 'For 900g');
    eq('second table follows', column(1, 3), ['375ml', '300–375ml', '150g']);
    eq('second head', head(1, 3), 'For 375ml shoyu');
    eq('method follows', method(), 'Rest 75g of the dough. Bake at 200°C (400°F).');
    eq('multiplier', clean(q('.ing-pct-mult')), '1.5×');
    eq('way back', clean(q('.ing-pct-reset')), 'Back to 600g');
    eq('field keeps its text', q('.ing-pct-input').value, '900');
    eq('serves follows', doc().getElementById('recipe-meta-servings') && clean(doc().getElementById('recipe-meta-servings')), '6');

    // A unit is the same amount, shown differently.
    leave();
    unit('kg');
    eq('same amount in kg', q('.ing-pct-input').value, '0.9');
    eq('table unmoved', column(0, 3)[0], '900g');

    // Typing in that unit; over 1000 reads as kg.
    type('1.36');
    eq('kg typed', column(0, 3), ['1.36kg', '952g', '28g', '23g', '79g']);
    eq('kg head', head(0, 3), 'For 1.36kg');

    // Rounded outside the table too.
    leave();
    unit('g');
    type('1000');
    eq('method rounds', method(), 'Rest 83g of the dough. Bake at 200°C (400°F).');
    unit('kg');
    type('1.36');

    // Bad input holds the last good amounts.
    ['', '0', 'abc', '2-3'].forEach(function (bad) {
      type(bad);
      eq('holds on ' + JSON.stringify(bad), column(0, 3)[0], '1.36kg');
      eq('flags ' + JSON.stringify(bad), q('.ing-pct-input').getAttribute('aria-invalid'), 'true');
    });
    leave();
    eq('leaving restores the field', q('.ing-pct-input').value, '1.36');
    eq('and clears the flag', q('.ing-pct-input').hasAttribute('aria-invalid'), false);

    // Remembered, in its unit.
    await load(page);
    eq('remembered amount', q('.ing-pct-input').value, '1.36');
    eq('remembered unit', activeUnit(), 'kg');
    eq('remembered table', column(0, 3)[0], '1.36kg');

    // No floor, no cap.
    unit('g');
    type('60');
    eq('a tenth', column(0, 3), ['60g', '42g', '1.3g', '1g', '3.5g']);
    eq('serves floor', clean(doc().getElementById('recipe-meta-servings')), '1');
    type('60000');
    eq('a hundred times', clean(q('.ing-pct-mult')), '100×');
    leave();

    // Imperial: the table stays metric, the field starts in lb, the Method converts.
    q('.ing-config [data-units="imperial"]').click();
    eq('field goes to lb', activeUnit(), 'lb');
    eq('table ignores imperial', column(0, 3)[1], '42kg');
    eq('method converts', /Bake at 400°F/.test(method()), true);
    q('.ing-config [data-units="original"]').click();

    // Back to the written batch, from a page reload too.
    q('.ing-pct-reset').click();
    eq('back: amounts', column(0, 3), ['600g', '420g', '12.5g', '10g', '35g']);
    eq('back: head', head(0, 3), 'Per 600 g');
    eq('back: field', q('.ing-pct-input').value, '600');
    eq('back: unit', activeUnit(), 'g');
    eq('back: nothing remembered', localStorage.getItem('ing:amount:' + q('.article-content').dataset.pageKey), null);

    // Written in a unit, typed in another: a pound field from imperial.
    q('.ing-config [data-units="imperial"]').click();
    leave();
    type('2');
    eq('lb typed', column(0, 3)[0], '907g');
    q('.ing-pct-reset').click();
    eq('imperial back starts in lb', activeUnit(), 'lb');
    q('.ing-config [data-units="original"]').click();

    // No 100% row: the slider, as ever.
    await load('/recipes/percent-no-base/');
    eq('no base, no bar', q('.ing-pct-bar'), null);
    eq('no base, slider', !!q('.ing-scale-range'), true);
    eq('no base, head as today', head(0, 3), 'Per 1kg');

    // An ordinary recipe keeps its slider.
    await load('/recipes/veg-patties/');
    eq('list recipe, no bar', q('.ing-pct-bar'), null);
    eq('list recipe, slider', !!q('.ing-scale-range'), true);
  } catch (e) {
    results.push('threw: ' + e + ' ' + e.stack);
  }
  document.getElementById('result').textContent = JSON.stringify(results);
})();
</script>"""


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        if self.path != "/__test":
            return super().do_GET()
        body = TEST_PAGE.encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def find_chrome():
    for candidate in [os.environ.get("CHROME")] + CHROME_PATHS:
        if candidate and (shutil.which(candidate) or Path(candidate).is_file()):
            return shutil.which(candidate) or candidate
    return None


def main():
    chrome = find_chrome()
    if not chrome:
        sys.exit("error: Google Chrome not found; install it or set $CHROME")
    work = Path(tempfile.mkdtemp(prefix="fugu-percent-"))
    server = None
    try:
        build = work / "site"
        server = http.server.ThreadingHTTPServer(
            ("127.0.0.1", 0), functools.partial(Handler, directory=str(build)))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        base = f"http://127.0.0.1:{server.server_address[1]}"
        result = subprocess.run(
            [os.environ.get("HUGO", "hugo"), "--source", str(FIXTURE), "--destination", str(build),
             "--baseURL", base + "/", "--quiet"], capture_output=True, text=True)
        if result.returncode != 0:
            sys.exit("error: the build failed:\n" + result.stderr.strip())
        result = subprocess.run(
            [chrome, "--headless=new", "--disable-gpu", "--no-first-run",
             f"--user-data-dir={work / 'profile'}", "--virtual-time-budget=20000",
             "--dump-dom", f"{base}/__test"], capture_output=True, text=True, timeout=120)
        found = re.search(r'<pre id="result">(.*?)</pre>', result.stdout, re.S)
        if not found:
            sys.exit("error: no result from Chrome:\n" + result.stderr.strip()[-500:])
        text = found.group(1).replace("&quot;", '"').replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
        if text == "unfinished":
            sys.exit("error: the test page didn't finish")
        failures = json.loads(text)
        for failure in failures:
            print("FAIL  " + failure)
        if failures:
            sys.exit(1)
        print("ok    percent scaling")
    finally:
        if server:
            server.shutdown()
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    main()
