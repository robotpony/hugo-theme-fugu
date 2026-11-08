#!/usr/bin/env python3
"""
percent_scaling.py: Drives the percentage table row in headless Chrome.

check.py reads built pages, which can't show what ingredients.js does to
them. This builds the everything fixture, serves it on a port the system
picks, loads its recipes in an iframe from a test page, types into the row,
and compares what the page then says. Needs Hugo and Google Chrome ($HUGO,
$CHROME). Python standard library only.

    python3 tests/percent_scaling.py
"""

import functools
import http.server
import json
import os
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
// JSON can't tell two elements apart, so these compare identity.
function same(what, got, want) {
  if (got !== want) results.push(what + ': got ' + (got ? got.outerHTML.slice(0, 80) : got));
}
function resized() {
  // Layout runs on the frame's own schedule, so wait for the listener's work.
  var want = frame.offsetWidth <= 680;
  return new Promise(function (done) {
    var tries = 0;
    (function poll() {
      var row = q('.ing-pct-row');
      if ((row && row.classList.contains('is-stacked') === want) || ++tries > 100) return done();
      setTimeout(poll, 20);
    })();
  });
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
    eq('one row', doc().querySelectorAll('.ing-pct-row').length, 1);
    var row = q('.ing-pct-row');
    same('row is under the headings', doc().querySelectorAll('table')[0].tHead.rows[1], row);
    eq('a cell per column', row.children.length, doc().querySelectorAll('table')[0].tHead.rows[0].children.length);
    eq('name', clean(q('.ing-pct-name')), 'Scale based on AP flour');
    same('name is over the names', row.children[1], q('.ing-pct-name'));
    same('multiplier is over the %', q('.ing-pct-mult').parentNode, row.children[2]);
    same('amount is over the amounts', q('.ing-pct-input').closest('td'), row.children[3]);
    same('units are over the notes', q('.ing-pct-units').closest('td'), row.children[4]);
    eq('no menu', q('.ing-config'), null);
    eq('no slider', q('.ing-scale-range'), null);
    var amountQty = doc().querySelectorAll('table')[0].tBodies[0].rows[0].children[3].querySelector('.qty');
    var firstAmount = amountQty.getBoundingClientRect().left + parseFloat(frame.contentWindow.getComputedStyle(amountQty).paddingLeft);
    var input = q('.ing-pct-input'), inputStyle = frame.contentWindow.getComputedStyle(input);
    var digits = input.getBoundingClientRect().left + parseFloat(inputStyle.paddingLeft) + parseFloat(inputStyle.borderLeftWidth);
    eq('digits line up with the amounts', Math.abs(digits - firstAmount) <= 1, true);
    eq('field', q('.ing-pct-input').value, '600');
    eq('starts in the written unit', activeUnit(), 'g');
    eq('units offered', Array.prototype.map.call(doc().querySelectorAll('.ing-pct-units button'), clean), ['g', 'kg', 'lb']);
    eq('written amounts', column(0, 3), ['600g', '420g', '12.5g', '10g', '35g']);
    eq('written head', head(0, 3), 'Per 600 g');
    eq('written head 2', head(1, 3), 'Example: 250 ml shoyu');
    eq('written range', column(1, 3), ['250ml', '200–250ml', '100g']);
    eq('no multiplier', q('.ing-pct-mult').hidden, true);
    eq('no way back', frame.contentWindow.getComputedStyle(q('.ing-pct-reset')).visibility, 'hidden');
    var unitsLeft = q('.ing-pct-units').getBoundingClientRect().left, resetGap = q('.ing-pct-reset').getBoundingClientRect().left - unitsLeft;
    eq('revert keeps its space', resetGap > 0, true);

    // More: rounding, notes, the second table, the Method, the headings.
    type('900');
    eq('1.5x amounts', column(0, 3), ['900g', '630g', '18.8g', '15g', '53g']);
    eq('notes scale', column(0, 4)[4], '38g added with the liquid');
    eq('head', head(0, 3), 'For 900g');
    eq('second table follows', column(1, 3), ['375ml', '300–375ml', '150g']);
    eq('second head', head(1, 3), 'For 375ml shoyu');
    eq('method follows', method(), 'Rest 75g of the dough. Bake at 200°C (400°F).');
    eq('multiplier', clean(q('.ing-pct-mult')), '1.5×');
    eq('way back', q('.ing-pct-reset').getAttribute('aria-label'), 'Back to 600g');
    eq('way back, shown', frame.contentWindow.getComputedStyle(q('.ing-pct-reset')).visibility, 'visible');
    eq('revert appearing moves nothing', q('.ing-pct-reset').getBoundingClientRect().left - q('.ing-pct-units').getBoundingClientRect().left, resetGap);
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

    // Back to the written batch.
    q('.ing-pct-reset').click();
    eq('back: amounts', column(0, 3), ['600g', '420g', '12.5g', '10g', '35g']);
    eq('back: head', head(0, 3), 'Per 600 g');
    eq('back: field', q('.ing-pct-input').value, '600');
    eq('back: unit', activeUnit(), 'g');
    eq('back: nothing remembered', localStorage.getItem('ing:amount:' + q('.article-content').dataset.pageKey), null);

    // A phone: the units stack under the amount, and come back.
    frame.style.width = '390px';
    await resized();
    same('narrow: stacked', q('.ing-pct-units').closest('td'), q('.ing-pct-row').children[3]);
    eq('narrow: under the input', q('.ing-pct-units').getBoundingClientRect().top >= q('.ing-pct-input').getBoundingClientRect().bottom, true);
    eq('narrow: last cell empty', clean(q('.ing-pct-row').children[4]), '');
    frame.style.width = '1280px';
    await resized();
    same('wide: back over the notes', q('.ing-pct-units').closest('td'), q('.ing-pct-row').children[4]);

    // A saved Units setting: the table stays metric, the field starts in lb,
    // the Method converts.
    localStorage.setItem('ing:units', 'imperial');
    await load(page);
    eq('imperial: field starts in lb', activeUnit(), 'lb');
    eq('imperial: same written amount', q('.ing-pct-input').value, '1.32');
    eq('imperial: table ignores it', column(0, 3)[1], '420g');
    eq('imperial: method converts', /Bake at 400°F/.test(method()), true);
    type('2');
    eq('imperial: lb typed', column(0, 3)[0], '907g');
    q('.ing-pct-reset').click();
    eq('imperial: back starts in lb', activeUnit(), 'lb');
    localStorage.removeItem('ing:units');

    // No Notes column: the units beside the amount, in its cell.
    await load('/recipes/percent-no-notes/');
    eq('no notes: a cell per column', q('.ing-pct-row').children.length, 4);
    same('no notes: units with the amount', q('.ing-pct-units').closest('td'), q('.ing-pct-row').children[3]);
    eq('no notes: beside it', q('.ing-pct-units').getBoundingClientRect().left >= q('.ing-pct-input').getBoundingClientRect().right, true);
    eq('volume units', Array.prototype.map.call(doc().querySelectorAll('.ing-pct-units button'), clean), ['ml', 'L', 'cup']);
    eq('no notes: lowercased', clean(q('.ing-pct-name')), 'Scale based on shoyu (soy sauce)');

    // No 100% row: the slider, as ever.
    await load('/recipes/percent-no-base/');
    eq('no base, no row', q('.ing-pct-row'), null);
    eq('no base, menu', !!q('.ing-config'), true);
    eq('no base, slider', !!q('.ing-scale-range'), true);
    eq('no base, head as today', head(0, 3), 'Per 1kg');

    // An ordinary recipe keeps its slider.
    await load('/recipes/veg-patties/');
    eq('list recipe, no row', q('.ing-pct-row'), null);
    eq('list recipe, slider', !!q('.ing-scale-range'), true);
  } catch (e) {
    results.push('threw: ' + e + ' ' + e.stack);
  }
  fetch('/__result', { method: 'POST', body: JSON.stringify(results) });
})();
</script>"""


class Handler(http.server.SimpleHTTPRequestHandler):
    # The test page posts its findings here. Chrome runs in real time, not
    # with --virtual-time-budget and --dump-dom: virtual time runs no rendering
    # steps, so a media query's change event would never fire.
    done = threading.Event()
    failures = None

    def log_message(self, *args):
        pass

    def do_POST(self):
        body = self.rfile.read(int(self.headers["Content-Length"]))
        Handler.failures = json.loads(body)
        self.send_response(204)
        self.end_headers()
        Handler.done.set()

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
        browser = subprocess.Popen(
            [chrome, "--headless=new", "--disable-gpu", "--no-first-run",
             f"--user-data-dir={work / 'profile'}", f"{base}/__test"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        try:
            if not Handler.done.wait(120):
                sys.exit("error: the test page didn't finish")
        finally:
            browser.terminate()
            browser.wait()
        failures = Handler.failures
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
