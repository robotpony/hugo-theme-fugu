/*
  Glossary search (partials/glossary/page.html): filters the glossary
  page's entries as you type, matching every word typed against the
  term, its other forms, and the definition, so "thicken" finds a roux.

  It shows the search box (hidden without JavaScript, when the page is
  the full list), hides each entry, letter heading and list with no
  match, marks their letters in the A to Z .is-empty, says how many
  match in .gl-count (aria-live), and shows .gl-none when nothing does.
*/
(function () {
  // The words this script shows, from the page's #fugu-strings block
  // (partials/js-strings.html, i18n's fugu.js keys). Each call carries its
  // English as the fallback, so a page without the block still reads.
  // {name} in a string is filled from vars.
  var STRINGS = (function () {
    try {
      var el = document.getElementById('fugu-strings');
      return el ? JSON.parse(el.textContent) : {};
    } catch (e) { return {}; }
  })();
  function phrase(key, fallback, vars) {
    var s = STRINGS[key] || fallback;
    return vars ? s.replace(/\{(\w+)\}/g, function (m, k) { return k in vars ? vars[k] : m; }) : s;
  }
  var box = document.querySelector('.gl-search');
  var page = box && box.closest('.glossary-page');
  if (!page) return;
  var q = box.querySelector('input');
  var count = box.querySelector('.gl-count');
  var none = page.querySelector('.gl-none');

  var entries = [].map.call(page.querySelectorAll('dl.glossary > dt'), function (dt) {
    var dd = dt.nextElementSibling;
    var def = [].map.call(dd.querySelectorAll(':scope > p'), function (p) { return p.textContent; }).join(' ');
    return { dt: dt, dd: dd, text: (dt.textContent + ' ' + def).toLowerCase() };
  });
  var lists = [].map.call(page.querySelectorAll('dl.glossary'), function (dl) {
    var h = dl.previousElementSibling;
    var link = h && h.id ? page.querySelector('.gl-letters a[href="#' + h.id + '"]') : null;
    return { dl: dl, heading: h, link: link };
  });

  function filter() {
    var words = q.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    var shown = 0;
    entries.forEach(function (e) {
      var hit = words.every(function (w) { return e.text.indexOf(w) !== -1; });
      e.dt.hidden = e.dd.hidden = !hit;
      if (hit) shown++;
    });
    lists.forEach(function (l) {
      var any = !!l.dl.querySelector(':scope > dt:not([hidden])');
      l.dl.hidden = !any;
      if (l.heading) l.heading.hidden = !any;
      if (l.link) l.link.classList.toggle('is-empty', !any);
    });
    count.textContent = words.length ? countText(shown) : '';
    none.hidden = !(words.length && !shown);
  }

  // "3 entries": the plural form for the page's language, from the
  // strings block's data-lang, falling back to one/other.
  function countText(n) {
    var el = document.getElementById('fugu-strings');
    var form = n === 1 ? 'one' : 'other';
    try { form = new Intl.PluralRules((el && el.dataset.lang) || 'en').select(n); } catch (e) {}
    var key = STRINGS['entries_' + form] ? 'entries_' + form : (n === 1 ? 'entries_one' : 'entries_other');
    return phrase(key, n === 1 ? '{n} entry' : '{n} entries', { n: n });
  }

  box.hidden = false;
  q.addEventListener('input', filter);
  if (q.value) filter();
})();
