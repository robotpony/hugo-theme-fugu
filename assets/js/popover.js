/*
  Popovers: the shared hover/focus popover (.pop-host wrapping a trigger
  and its .pop) used by glossary terms (render-link.html), principle chips
  (principle-chip.html), and the draft mark on cards
  (development/mark.html). CSS opens and closes them; a site styles the
  classes. This script only improves where they land, each time one
  opens:

  - The pointer goes under the middle of whatever opened it (--pop-x on
    the .pop), which matters on cards, where the popover spans the row
    and the trigger can be anywhere in it.
  - It flips to open the other way (.pop-flip) when there isn't room on
    its usual side of the window (below a sticky header, at the top) and
    there's more on the other.
  - Escape closes it, by moving focus off the trigger.

  Without it, popovers still open, with the pointer at its default spot
  near the left edge and no flip.
*/
(function () {
  var GAP = 12; // the 8px gap, the pointer, and a little air

  // The bottom of a sticky or fixed header over the top of the window,
  // so "room above" means room below it, not behind it.
  function topInset() {
    var el = document.elementFromPoint(window.innerWidth / 2, 1);
    for (; el && el !== document.body; el = el.parentElement) {
      var pos = getComputedStyle(el).position;
      if (pos === 'fixed' || pos === 'sticky') return Math.max(0, el.getBoundingClientRect().bottom);
    }
    return 0;
  }

  function place(host) {
    var pop = host.querySelector(':scope > .pop');
    var trigger = host.firstElementChild;
    if (!pop || !trigger || trigger === pop) return;

    pop.classList.remove('pop-flip');
    var t = trigger.getBoundingClientRect();
    var p = pop.getBoundingClientRect();
    if (!p.width) return;

    var x = t.left + t.width / 2 - p.left - 1; // 1px: the popover's border
    x = Math.max(16, Math.min(p.width - 16, x));
    pop.style.setProperty('--pop-x', x + 'px');

    var need = p.height + GAP;
    var below = window.innerHeight - t.bottom;
    var above = t.top - topInset();
    var up = pop.classList.contains('pop-up');
    if (up ? (above < need && below > above) : (below < need && above > below)) {
      pop.classList.add('pop-flip');
    }
  }

  function onEnter(e) {
    var host = e.target.closest && e.target.closest('.pop-host');
    if (host && !host.contains(e.relatedTarget)) place(host);
  }

  document.addEventListener('mouseover', onEnter);
  document.addEventListener('focusin', onEnter);
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var el = document.activeElement;
    if (el && el.closest && el.closest('.pop-host')) el.blur();
  });
})();
