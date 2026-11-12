// Sidebar behaviour: section relocation, photos, the mobile toggle, the
// frontmatter meta rail's live Serves value, and the reading sidebar's
// "On this page" section toggles.
//
// Split out of ingredients.js so the sidebar can work on pages that have
// no ingredient list. Everything here is driven by markup, not page type:
// it runs wherever it finds slots ([data-sidebar-slot]) and marked
// headings (h2[data-sidebar-heading], set by render-heading.html).
//
// Loaded before ingredients.js (single.html), both deferred, so this
// runs first: deferred scripts run in document order once the page is
// parsed, when readyState is already "interactive", so each calls its
// init straight away rather than waiting for DOMContentLoaded. Sections
// are in the sidebar when the ingredient walks run, and the servings
// listener is attached before ingredients.js fires its first scale event.
// Keep the order of the two <script> tags.

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
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  // --- Sidebar relocation -------------------------------------------------
  //
  // Mechanic / To serve / Notes are simple optional top-level sections
  // (docs/recipe-format.md) — render-heading.html flags each one's H2 with
  // data-sidebar-heading so this can walk forward to the next H2 (same
  // "walk from a marked heading" approach as the ingredient/method walks
  // in ingredients.js, for the same reason: Hugo's heading-only render hook
  // has no "end of section" hook to close a template-level wrapper
  // around). The matched heading + everything after it up to the next H2 is
  // moved (not copied) into the matching slot single.html already laid out;
  // slots with nothing to show stay hidden.
  function moveSidebarSections(article) {
    var slots = {};
    document.querySelectorAll('[data-sidebar-slot]').forEach(function (el) {
      slots[el.dataset.sidebarSlot] = el;
    });

    article.querySelectorAll('h2[data-sidebar-heading]').forEach(function (h2) {
      var key = h2.dataset.sidebarHeading;
      var slot = slots[key];
      // A Mechanic with no sidebar slot (the site left "mechanic" out of
      // params.fugu.recipeSidebar) stays in the article, wrapped in place
      // as a callout. Other sections without a slot stay as written.
      if (!slot && key === 'mechanic') {
        slot = document.createElement('div');
        slot.className = 'mechanic-callout';
        h2.parentNode.insertBefore(slot, h2);
      }
      if (!slot) return;
      var nodes = [h2];
      var el = h2.nextElementSibling;
      while (el && el.tagName !== 'H2') {
        nodes.push(el);
        el = el.nextElementSibling;
      }
      nodes.forEach(function (node) { slot.appendChild(node); });
    });
    if (!Object.keys(slots).length) return;

    // Notes and Equipment/Hardware both render as a plain <ul> today —
    // give them the em-dash-bullet list style now that they live in the
    // sidebar rather than the prose flow (Equipment/Hardware is the same
    // shape of content as Notes — a flat reference list — so it gets the
    // same treatment rather than a second bullet style).
    ['notes', 'equipment'].forEach(function (key) {
      var list = slots[key] && slots[key].querySelector('ul');
      if (list) list.classList.add('notes-list');
    });

    // Mechanic's prose becomes the accent-bordered callout box now that
    // it's off on its own in the sidebar instead of opening the article
    // body.
    if (slots.mechanic && slots.mechanic.children.length > 1) {
      var box = document.createElement('div');
      box.className = 'mechanic';
      var heading = slots.mechanic.firstElementChild;
      while (heading.nextSibling) box.appendChild(heading.nextSibling);
      slots.mechanic.appendChild(box);
    }

    Object.keys(slots).forEach(function (key) {
      var slot = slots[key];
      if (slot.hasChildNodes()) slot.hidden = false;
    });
  }

  // --- Meta rail: Serves --------------------------------------------------
  //
  // The sidebar's Serves meta row (single.html) is plain server-rendered
  // text, not a .qty span — it isn't a quantity in an ingredient/method
  // sense, just a frontmatter fact, but it should still track the scale
  // slider. ingredients.js announces scale changes with a `recipe:scale`
  // event rather than touching the sidebar itself, and scales the values
  // too (detail.servings and detail.portions, from ingredients.js's
  // scaleYield), so Serves, Makes and the scale callout's yield line
  // always agree. A number, a range
  // ("3–4") or a number leading some words ("9 burgers", "1 loaf", which
  // becomes "2 loaves") scales; anything else ("makes ~750 ml") arrives as
  // null and is left exactly as written.
  function initServings() {
    [['recipe-meta-servings', 'servings'], ['recipe-meta-portions', 'portions']].forEach(function (pair) {
      var el = document.getElementById(pair[0]);
      if (!el) return;
      var written = el.textContent;
      document.addEventListener('recipe:scale', function (e) {
        el.textContent = e.detail[pair[1]] || written;
      });
    });
  }

  // --- Mobile toggle ------------------------------------------------------
  //
  // Mobile-only collapse for the recipe sidebar (single.html's
  // .recipe-sidebar-wrap / .recipe-sidebar-toggle) — see that file's
  // comment for why this is a plain button + class toggle rather than
  // <details>. No-ops above the lg breakpoint, where the button is
  // display:none and the sidebar is always shown regardless of `.is-open`.
  // With JS off, a <noscript> style in single.html shows the sidebar and
  // hides the button, since nothing could open it.
  function initSidebarToggle() {
    var toggle = document.querySelector('.recipe-sidebar-toggle');
    var wrap = document.querySelector('.recipe-sidebar-wrap');
    if (!toggle || !wrap) return;
    toggle.addEventListener('click', function () {
      var open = wrap.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  // --- On this page toggles -----------------------------------------------
  //
  // Reading sidebar "On this page" (partials/reading-sidebar.html): on long
  // pages each section with subsections gets a count button. The markup
  // ships open with the buttons hidden, so without JS every subsection
  // stays reachable; this collapses the groups and shows the buttons.
  function initTocToggles() {
    document.querySelectorAll('.rs-toc-toggle').forEach(function (button) {
      var group = document.getElementById(button.getAttribute('aria-controls'));
      if (!group) return;
      group.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      button.hidden = false;
      button.addEventListener('click', function () {
        var open = group.hidden;
        group.hidden = !open;
        button.setAttribute('aria-expanded', String(open));
      });
    });
  }

  // --- Photos -------------------------------------------------------------
  //
  // render-image.html renders every markdown
  // image as a figure[data-sidebar-photo], inline. On pages with a photos
  // slot this moves them out of the reading flow: thumbnails in the
  // sidebar (desktop) and a strip under the title (mobile), both opening a
  // <dialog> viewer. Each figure is hidden on screen (it still prints) and
  // a small "Photo N" marker is left where it was. Runs before
  // moveSidebarSections, so an image inside Notes is gathered here rather
  // than carried into the sidebar with its section.
  var CAMERA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13.5" r="3.5"/></svg>';

  function headingText(h) {
    return h.textContent.replace(/\s+/g, ' ').trim();
  }

  // Nearest heading above the figure, for the viewer's "From" line. An h3
  // or deeper gets its h2 in front ("Tuesday, June 10th · Week plan"),
  // since Food Log entry names repeat from day to day.
  function photoSource(fig, article) {
    var el = fig, found = null;
    while (el && el !== article) {
      var prev = el.previousElementSibling;
      while (prev) {
        if (/^H[2-4]$/.test(prev.tagName)) {
          if (!found) {
            found = prev;
            if (prev.tagName === 'H2') return headingText(found);
          } else if (prev.tagName === 'H2') {
            return headingText(prev) + ' · ' + headingText(found);
          }
        }
        prev = prev.previousElementSibling;
      }
      el = el.parentElement;
    }
    return found ? headingText(found) : '';
  }

  function thumbButton(photo, i, total) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'photo-thumb';
    b.dataset.photo = i;
    b.setAttribute('aria-label', phrase('open_photo', 'Open photo {n} of {total}: {caption}', { n: i + 1, total: total, caption: photo.caption }));
    var img = document.createElement('img');
    img.className = 'nozoom';
    img.src = photo.thumb;
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    b.appendChild(img);
    return b;
  }

  function buildViewer(photos) {
    var dlg = document.createElement('dialog');
    dlg.className = 'photo-viewer';
    dlg.setAttribute('aria-label', phrase('photo_viewer', 'Photo viewer'));
    dlg.innerHTML =
      '<div class="pv-inner">' +
        '<div class="pv-top"><span class="pv-count"></span>' +
          '<button type="button" class="pv-btn pv-close" aria-label="' + esc(phrase('close', 'Close')) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
        '<div class="pv-stage">' +
          '<button type="button" class="pv-btn pv-prev" aria-label="' + esc(phrase('previous_photo', 'Previous photo')) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>' +
          '<figure><img class="nozoom" alt=""></figure>' +
          '<button type="button" class="pv-btn pv-next" aria-label="' + esc(phrase('next_photo', 'Next photo')) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>' +
        '</div>' +
        '<div class="pv-foot"><p class="pv-cap"></p><p class="pv-src"></p></div>' +
        '<p class="pv-live sr-only" role="status" aria-live="polite"></p>' +
      '</div>';
    document.body.appendChild(dlg);

    var img = dlg.querySelector('.pv-stage img');
    var multi = photos.length > 1;
    var idx = 0;
    // visibility, not hidden: the arrows keep their grid columns so a
    // single photo still sits centred.
    if (!multi) dlg.classList.add('is-single');

    // Moving to another photo is read out ("Photo 2 of 5: Browned onions"),
    // since focus stays on the arrow; opening the viewer isn't, as the
    // dialog's own name and the focused button already are.
    var live = dlg.querySelector('.pv-live');
    function show(i, announce) {
      idx = (i + photos.length) % photos.length;
      var p = photos[idx];
      var said = phrase('photo_shown', 'Photo {n} of {total}', { n: idx + 1, total: photos.length });
      var what = p.caption || p.alt;
      live.textContent = announce && multi ? said + (what ? ': ' + what : '') : '';
      img.src = p.full;
      img.alt = p.alt;
      dlg.querySelector('.pv-cap').textContent = p.caption;
      dlg.querySelector('.pv-count').textContent = (idx + 1) + ' / ' + photos.length;
      var src = dlg.querySelector('.pv-src');
      src.textContent = '';
      if (p.from) {
        var from = document.createElement('span');
        from.textContent = phrase('photo_from', 'From {source}', { source: p.from });
        src.appendChild(from);
      }
      var jump = document.createElement('a');
      jump.href = '#' + p.marker.id;
      jump.className = 'pv-jump';
      jump.textContent = phrase('jump_to_text', 'Jump to it in the text →');
      src.appendChild(jump);
    }

    dlg.querySelector('.pv-close').addEventListener('click', function () { dlg.close(); });
    dlg.querySelector('.pv-prev').addEventListener('click', function () { show(idx - 1, true); });
    dlg.querySelector('.pv-next').addEventListener('click', function () { show(idx + 1, true); });
    dlg.addEventListener('keydown', function (e) {
      if (!multi) return;
      if (e.key === 'ArrowRight') show(idx + 1, true);
      if (e.key === 'ArrowLeft') show(idx - 1, true);
    });
    dlg.addEventListener('click', function (e) {
      var jump = e.target.closest('.pv-jump');
      if (jump) {
        e.preventDefault();
        dlg.close();
        var marker = photos[idx].marker;
        marker.scrollIntoView({ block: 'center' });
        marker.focus({ preventScroll: true });
        return;
      }
      // Anywhere that isn't the photo, its caption, or a button closes it.
      if (!e.target.closest('.pv-foot, .pv-stage img, .pv-btn')) dlg.close();
    });
    // Touch swipe. Without touch-action, iOS takes a sideways drag as a
    // pan and sends pointercancel instead of pointerup, so the swipe never
    // lands; pan-y keeps vertical scrolling (a long caption) and pinch-zoom.
    // A swipe that ends off the photo also fires a click, which would
    // close the viewer, so that one click is swallowed.
    dlg.style.touchAction = 'pan-y pinch-zoom';
    var x0 = null;
    var swiped = false;
    dlg.addEventListener('pointerdown', function (e) { x0 = e.pointerType === 'mouse' ? null : e.clientX; });
    dlg.addEventListener('pointercancel', function () { x0 = null; });
    dlg.addEventListener('pointerup', function (e) {
      if (x0 === null || !multi) return;
      var dx = e.clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 50) {
        swiped = true;
        setTimeout(function () { swiped = false; }, 400);
        show(idx + (dx < 0 ? 1 : -1), true);
      }
    });
    dlg.addEventListener('click', function (e) {
      if (!swiped) return;
      swiped = false;
      e.stopImmediatePropagation();
      e.preventDefault();
    }, true);

    return function open(i) {
      show(i);
      dlg.showModal();
    };
  }

  // Whether ingredients.js will hide this figure as a personal note: in an
  // intro blockquote (hideIntroQuotes) or under a hidden heading such as
  // "## History" (hideHiddenSections). It runs after this script, so the
  // rule is repeated here, or a hidden section's photo would come back as a
  // thumbnail. Only on recipe pages (data-page-key), where it runs.
  function personalNote(fig, article) {
    if (!article.dataset.pageKey) return false;
    var top = fig;
    while (top.parentElement && top.parentElement !== article) top = top.parentElement;
    if (top.parentElement !== article) return false;
    var h = top.previousElementSibling;
    while (h && h.tagName !== 'H2') h = h.previousElementSibling;
    if (!h) return top.tagName === 'BLOCKQUOTE' && article.dataset.showIntroQuotes !== 'true';
    return h.dataset.hideHeading === 'true';
  }

  function initPhotos(article) {
    var slot = document.querySelector('[data-sidebar-slot="photos"]');
    if (!slot) return;
    var figs = Array.prototype.filter.call(article.querySelectorAll('figure[data-sidebar-photo]'),
      function (fig) { return !personalNote(fig, article); });
    if (!figs.length) return;

    var photos = [];
    figs.forEach(function (fig, i) {
      var img = fig.querySelector('img');
      var cap = fig.querySelector('figcaption');
      var alt = img ? img.alt : '';
      var marker = document.createElement('button');
      marker.type = 'button';
      marker.className = 'photo-marker';
      marker.id = 'photo-' + (i + 1);
      marker.dataset.photo = i;
      marker.innerHTML = CAMERA + esc(phrase('photo', 'Photo')) + '<span class="n">' + (i + 1) + '</span>';
      // Named in full, since the number is a separate span ("Photo1" read aloud).
      marker.setAttribute('aria-label', alt ? phrase('photo_n', 'Photo {n}: {alt}', { n: i + 1, alt: alt })
        : phrase('photo', 'Photo') + ' ' + (i + 1));
      fig.parentNode.insertBefore(marker, fig);
      fig.classList.add('is-relocated');
      photos.push({
        full: fig.dataset.full || (img && img.src),
        thumb: fig.dataset.thumb || (img && img.src),
        alt: alt,
        caption: (cap && cap.textContent.trim()) || alt,
        from: photoSource(fig, article),
        marker: marker
      });
    });

    var n = photos.length, cap = 6;
    var label = document.createElement('h2');
    label.className = 'photos-label';
    label.innerHTML = esc(phrase('photos', 'Photos')) + '<span class="n">' + n + '</span>';
    label.setAttribute('aria-label', phrase('photos', 'Photos') + ' ' + n);
    var grid = document.createElement('div');
    grid.className = 'photo-grid ' + (n === 1 ? 'n1' : (n === 2 || n === 4) ? 'n2' : 'n3');
    photos.slice(0, cap).forEach(function (p, i) {
      var b = thumbButton(p, i, n);
      if (i === cap - 1 && n > cap) {
        var more = document.createElement('span');
        more.className = 'more';
        more.textContent = '+' + (n - cap + 1);
        b.appendChild(more);
      }
      grid.appendChild(b);
    });
    slot.appendChild(label);
    slot.appendChild(grid);
    if (n === 1 && photos[0].caption) {
      var p = document.createElement('p');
      p.className = 'photo-caption';
      p.textContent = photos[0].caption;
      slot.appendChild(p);
    }
    slot.hidden = false;

    var header = document.getElementById('single_header');
    if (header) {
      var strip = document.createElement('div');
      strip.className = 'photo-strip' + (n === 1 ? ' solo' : '');
      strip.setAttribute('role', 'group');
      strip.setAttribute('aria-label', phrase('photos', 'Photos'));
      photos.forEach(function (p, i) { strip.appendChild(thumbButton(p, i, n)); });
      header.appendChild(strip);
    }

    var open = buildViewer(photos);
    document.addEventListener('click', function (e) {
      var t = e.target.closest('.photo-thumb, .photo-marker');
      if (t) open(+t.dataset.photo);
    });
  }

  function init() {
    var article = document.querySelector('.article-content');
    if (article) initPhotos(article);
    if (article) moveSidebarSections(article);
    initServings();
    initSidebarToggle();
    initTocToggles();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
