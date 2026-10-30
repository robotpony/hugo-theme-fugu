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
    count.textContent = words.length ? shown + (shown === 1 ? ' entry' : ' entries') : '';
    none.hidden = !(words.length && !shown);
  }

  box.hidden = false;
  q.addEventListener('input', filter);
  if (q.value) filter();
})();
