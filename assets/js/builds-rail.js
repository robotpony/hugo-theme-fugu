/*
  Builds rail on the methods list (partials/method/list.html): each
  blueprint's build tiles (.build-tiles) scroll sideways inside .bp-builds.
  Per rail this sets .is-overflowing when the tiles don't all fit and
  .at-end when scrolled to the end (custom.css hangs the buttons and the
  peek fade on these), disables ‹ › at either end, steps one tile (plus
  the gap) per click, and fills .bp-rail-dots with one dot per tile, .on
  on the first one in view. Recomputed on scroll and resize. Without it
  the tiles are a plain sideways scroll.
*/
(function () {
  function init(rail) {
    var track = rail.querySelector(".build-tiles");
    if (!track) return;
    var tiles = track.querySelectorAll(".build-tile");
    var prev = rail.querySelector(".bp-rail-prev");
    var next = rail.querySelector(".bp-rail-next");
    var dots = rail.querySelector(".bp-rail-dots");

    if (dots) {
      dots.innerHTML = "";
      for (var i = 0; i < tiles.length; i++) dots.appendChild(document.createElement("i"));
    }

    function step() {
      if (!tiles.length) return 1;
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return tiles[0].getBoundingClientRect().width + gap;
    }

    function update() {
      var max = track.scrollWidth - track.clientWidth;
      var overflowing = max > 1;
      var atStart = track.scrollLeft < 4;
      var atEnd = track.scrollLeft > max - 4;
      rail.classList.toggle("is-overflowing", overflowing);
      rail.classList.toggle("at-end", overflowing && atEnd);
      if (prev) prev.disabled = !overflowing || atStart;
      if (next) next.disabled = !overflowing || atEnd;
      if (dots) {
        var first = Math.round(track.scrollLeft / step());
        var all = dots.children;
        for (var j = 0; j < all.length; j++) all[j].classList.toggle("on", j === first);
      }
    }

    function go(dir) {
      track.scrollBy({ left: dir * step(), behavior: "smooth" });
    }
    if (prev) prev.addEventListener("click", function () { go(-1); });
    if (next) next.addEventListener("click", function () { go(1); });
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  function start() {
    document.querySelectorAll(".bp-builds").forEach(init);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
