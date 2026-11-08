# CSS class inventory

The first task of PLAN.md §5 ("Default design"): every class Fugu emits, the rules in Not a Chef's `assets/css/custom.css` that style it, whether `assets/css/fugu.css` already has it, and whether those rules are structure or look. It sizes the split §5 makes: structure (layout, sidebar, formula row, popovers, check-off, positioning, display, flex and grid, the sizes that make things work) moves into `fugu.css`, and the look (colour, type, spacing, borders, radius, shadows) becomes `--fugu-*` custom properties.

Made 2026-11-07 against Fugu `8205167` (v0.2.0) and Not a Chef's `custom.css` at 2,413 lines. Line numbers are `custom.css` line numbers on that day; they drift with every edit to the file.

## How it was made

Two Python scripts (standard library only, in the appendix) read the source; nothing is guessed from built pages.

```sh
cd ~/writing/not-a-chef
HITS=hits.json python3 inventory.py . > inv.json   # classes emitted, CSS rules parsed
python3 report.py inv.json hits.json assets/css/custom.css > tables.md
```

`tables.md` holds the per-area tables, the unstyled, site-only and dead lists, the totals, and the raw hard-case listings this file was written from. Build into a scratch folder, not the repo.

- **Classes Fugu emits.** Every `class="…"` and `class='…'` attribute in `themes/fugu/layouts/**`, including those inside Go template strings, read up to the closing quote outside any `{{ }}`. Literal words count; inside an action, quoted string literals count (`cond $x "mb-10" "mb-5"`) except the right-hand side of `eq`/`ne`/`in`/`hasPrefix`. A word glued to a value action (`pop-{{ .kind }}`) is a dynamic prefix, matched later against the class names in `custom.css`. Classes first built into a variable (`$class := printf "vt-name%s" …`) are read from the assignment. In `themes/fugu/assets/js/*.js`: `className = '…'`, `classList.add/toggle(…)`, ingredients.js's `element(tag, '…')`, a `*_CLASS = '…'` constant, and `class="…"` inside HTML strings. `classList.remove/contains` only reads a class, so it doesn't count.
- **Classes the site emits.** The same scan over Not a Chef's own `layouts/` (`index.html`, `404.html`, `partials/header/basic.html`, `footer.html`, `favicons.html`, `fonts.html`).
- **Blowfish's classes.** The same scan over `themes/blowfish/layouts` and `assets/js`, to tell a Blowfish class from a dead one.
- **Content.** `content/` carries no class attributes; the only attribute is `{.article}` on headings, which render-heading.html reads and doesn't emit.
- **CSS.** Comments are blanked (keeping line numbers), then each style rule is read with its selector, first and last line, enclosing `@media`/`@supports`, and declarations. A rule's classes are the `.name` tokens in its selector, attribute selectors and strings removed.
- **Area.** Each Fugu class is placed in one area by name and emitting file. A rule belongs to the area of the first Fugu class in its selector that isn't a generic helper (`.n`, `.more`, `.mono`, `.y`, `.is-*`, `.article-content`, …); a rule with any site-only class is site-owned.
- **Structure or look.** Per declaration, by property. Structure: `display`, `position` and offsets, `z-index`, `flex*`, `grid*`, `order`, alignment, widths and heights with their min and max, `aspect-ratio`, `overflow*`, `visibility`, `box-sizing`, `table-layout`, `border-collapse`, `content`, `cursor`, `pointer-events`, `user-select`, `transform`, `white-space` and word breaking, `vertical-align`, `appearance`, `object-fit`, `scroll-*`, `columns`, `clip-path` and the like. Everything else is look: colour, background, `font*`, `line-height`, letter spacing, `text-*`, `margin`, `padding`, `gap`, `border*`, radius, shadows, `outline`, `opacity`, `transition`, `animation`, `fill`, `stroke`, and custom properties. A rule is structure, look, or both; a class's split column is the union over every rule that names it.
- **Tailwind.** Utility classes Fugu copied from Blowfish's templates or search.js are left out of the tables (see below).

The split by property is a first cut. Margin, padding and gap count as look, as §5 lists spacing under look, although some (a grid gap, a sidebar's top offset) are what makes a layout work. Show and hide by `opacity` and `transition` (popovers, the heading anchor) count as look although they are behaviour. Expect the structure share to grow a little when the rules are actually moved.

**Tailwind utilities.** Fugu emits 123 distinct Tailwind utility classes (98 in templates, 37 in `search.js`, 25 of those only in `search.js`): spacing (`mt-5`, `px-3`), colour (`text-neutral-500`, `bg-neutral-100`), variants (`dark:…`, `lg:…`, `hover:…`, `print:hidden`, `ltr:`/`rtl:`), Typography (`prose`, `not-prose`, `dark:prose-invert`). They are styled by Blowfish's compiled CSS, not `custom.css`; the few `custom.css` overrides are listed under the hard cases.

## Summary

- Fugu emits **310 classes** (after expanding the dynamic ones: `formula-ratio`, `formula-seq`, `principle-win-the-fridge`, `r2`, `r3`), plus the 123 Tailwind utilities. 10 of the 310 are Blowfish's own names in copied overrides (`toc`, `toc-inside`, `toc-right`, `article-content`, `anchor`, `-start-6`, `bf-scrollbar`, `overscroll-contain`, `email-link`, `nozoom`).
- `custom.css` styles 284 of them; **26 are unstyled**. `fugu.css` already names 268 of the 310. The 16 that `custom.css` styles and `fugu.css` lacks are mostly the reading-layout page shells: `blueprint-layout`, `blueprint-page`, `build-grid`, `method-list`, `method-list-layout`, `principle-layout`, `principle-page`, `principle-win-the-fridge`, `glossary-page`, `listing`, plus `essay-link`, `formula-seq`, `ing-pct-head`, `ing-table--percent`, `toc`, `toc-inside`.
- `custom.css` names **377 classes**: the Fugu ones, 70 site-owned, 8 Blowfish or Tailwind, 2 site-owned SVG internals, and 13 dead.
- Of its 2,413 lines, 1,552 are inside style rules: **1,099 Fugu-related**, 208 site-only, 232 global or Blowfish overrides (tokens, `body`, `main`, `.prose`), 13 dead. The other ~860 are comments, `@media` wrappers and blank lines.
- Of the 1,099 Fugu-related rule lines, about **400 are structure and 700 look** (weighting each rule's lines by its declarations: 821 structure, 1,392 look). By rule: 142 structure only, 276 look only, **227 both**.

## Classes by area

Columns: the class; where Fugu emits it (file and line, first two files, `+n` for more); the start lines of every `custom.css` rule whose selector names it (a range is consecutive one-line rules); whether `fugu.css` has a rule naming it; the structure/look split over those rules; notes. "Site tokens" are custom properties `custom.css` defines itself (`--accent`, `--ink`, …) rather than `--fugu-*` or Blowfish's `--color-*`.

### Recipe page and ingredients

39 classes.

| Class | Fugu emits it in | custom.css rules (start lines) | fugu.css | Split | Notes |
|---|---|---|---|---|---|
| `ing` | `assets/js/ingredients.js`:646 | 495, 505, 508, 520, 524, 535, 553, 573, 637 | yes | both | site tokens `--accent` `--bg` `--border` `--border-strong` …; hardcoded font |
| `ing-awake` | `assets/js/ingredients.js`:1337 | 695–697, 705–708 | yes | both | site tokens `--accent` `--accent-soft` `--accent-strong` `--border-strong` … |
| `ing-awake--alone` | `assets/js/ingredients.js`:1478 | 704 | yes | structure |  |
| `ing-btn` | `assets/js/ingredients.js`:833 | 782, 794–797, 831 | yes | both | site tokens `--accent` `--accent-soft` `--accent-strong` `--border-strong` …; hardcoded font |
| `ing-check-cell` | `assets/js/ingredients.js`:729 | 568, 616 | yes | both | `!important` |
| `ing-config` | `assets/js/ingredients.js`:1287 | 666, 669, 674, 687–691, 696 | yes | both | site tokens `--accent` `--accent-strong` `--border-strong` `--ink` … |
| `ing-config-btn` | `assets/js/ingredients.js`:1290 | – | no | – | unstyled |
| `ing-config-group` | `assets/js/ingredients.js`:877 | 741 | yes | both |  |
| `ing-config-group--units` | `assets/js/ingredients.js`:919 | 742 | yes | look | site tokens `--border` |
| `ing-config-head` | `assets/js/ingredients.js`:879 | 743 | yes | structure |  |
| `ing-config-label` | `assets/js/ingredients.js`:881 | 744 | yes | look | site tokens `--ink-faint` |
| `ing-config-panel` | `assets/js/ingredients.js`:1296 | 715, 734, 739–740 | yes | both | site tokens `--border-strong` `--surface`; hardcoded font |
| `ing-list` | `assets/js/ingredients.js`:688 | 486 | yes | both |  |
| `ing-pct-amount` | `assets/js/ingredients.js`:1010 | – | no | – | unstyled |
| `ing-pct-controls` | `assets/js/ingredients.js`:1013 | 821 | yes | both |  |
| `ing-pct-head` | `assets/js/ingredients.js`:808 | 814 | no | structure |  |
| `ing-pct-input` | `assets/js/ingredients.js`:1003 | 822, 827–829 | yes | both | site tokens `--accent` `--accent-strong` `--border-strong` `--ink-faint` … |
| `ing-pct-mult` | `assets/js/ingredients.js`:999 | 815, 839 | yes | both | site tokens `--accent-strong` |
| `ing-pct-name` | `assets/js/ingredients.js`:996 | 812 | yes | both |  |
| `ing-pct-reset` | `assets/js/ingredients.js`:1026 | 832, 837–838 | yes | both | site tokens `--accent-strong` `--ink-muted` `--surface-2` |
| `ing-pct-row` | `assets/js/ingredients.js`:987 | 805, 810–812, 820, 840 | yes | both | site tokens `--flag-soft` `--ink-faint`; `!important` |
| `ing-pct-stack` | `assets/js/ingredients.js`:1008 | 819–820 | yes | both |  |
| `ing-pct-units` | `assets/js/ingredients.js`:1014 | 830–831 | yes | both |  |
| `ing-row` | `assets/js/ingredients.js`:743 | – | no | – | unstyled |
| `ing-scale-range` | `assets/js/ingredients.js`:891 | 749, 753, 757–759, 763–766 | yes | both | site tokens `--accent` `--border` `--surface` `--surface-2` |
| `ing-scale-ticks` | `assets/js/ingredients.js`:900 | 769–771 | yes | both | site tokens `--accent-strong` `--ink-faint` |
| `ing-scale-value` | `assets/js/ingredients.js`:884 | 745 | yes | look | site tokens `--accent-strong` |
| `ing-subhead` | `_default/_markup/render-heading.html`:109 | 648 | yes | look | site tokens `--ink-faint`; hardcoded font |
| `ing-table` | `assets/js/ingredients.js`:722 | 573 | yes | look | site tokens `--border-strong` `--ink-faint` |
| `ing-table--percent` | `assets/js/ingredients.js`:797 | 817 | no | look |  |
| `ing-units` | `assets/js/ingredients.js`:927 | 778 | yes | both | site tokens `--border-strong` |
| `ing-yield` | `assets/js/ingredients.js`:913 | 772 | yes | look | site tokens `--ink-muted`; hardcoded font |
| `is-current` | `assets/js/ingredients.js`:1195 | 771 | yes | look | site tokens `--accent-strong` |
| `is-stacked` | `assets/js/ingredients.js`:1035 | 820 | yes | both |  |
| `mono` | `assets/js/ingredients.js`:317 | 842 | yes | look | hardcoded font |
| `qty` | `assets/js/ingredients.js`:317 | 624 | yes | look | site tokens `--accent-strong` |
| `sub` | `assets/js/ingredients.js`:684 | 637 | yes | look | site tokens `--ink-muted` |
| `table-scroll` | `_default/_markup/render-table.html`:9 | 607, 2112, 2280 | yes | both |  |
| `temp` | `assets/js/ingredients.js`:570 | 624 | yes | look | site tokens `--accent-strong` |

### Sidebar and automagic sidebar

47 classes.

| Class | Fugu emits it in | custom.css rules (start lines) | fugu.css | Split | Notes |
|---|---|---|---|---|---|
| `active` | `assets/js/ingredients.js`:1143, `partials/toc.html`:45 | 796 | yes | look | site tokens `--accent-soft` `--accent-strong` |
| `bf-scrollbar` | `partials/toc.html`:13 | – | no | – | Blowfish class; unstyled |
| `is-open` | `assets/js/automagic-sidebar.js`:136 | 1577 | yes | structure | only under @media |
| `is-relocated` | `assets/js/automagic-sidebar.js`:335 | 1821 | yes | structure | only under @media |
| `is-single` | `assets/js/automagic-sidebar.js`:239 | 1878 | yes | structure |  |
| `mechanic` | `assets/js/automagic-sidebar.js`:87 | 1642, 1655–1657 | yes | look | site tokens `--accent-strong` `--ink-muted`; hardcoded font |
| `mechanic-callout` | `assets/js/automagic-sidebar.js`:58 | 2376, 2380, 2385, 2387–2389 | yes | both | site tokens `--accent` `--accent-strong` `--ink` `--surface`; hardcoded font |
| `more` | `assets/js/automagic-sidebar.js`:356 | 1841 | yes | both | hardcoded font |
| `n1` | `assets/js/automagic-sidebar.js`:351 | 1826, 1833 | yes | structure |  |
| `n2` | `assets/js/automagic-sidebar.js`:351 | 1827 | yes | structure |  |
| `n3` | `assets/js/automagic-sidebar.js`:351 | – | no | – | unstyled |
| `notes-list` | `assets/js/automagic-sidebar.js`:79 | 1666, 1672, 1677, 1683, 2393 | yes | both | site tokens `--ink-faint` `--ink-muted` |
| `overscroll-contain` | `partials/toc.html`:13 | – | no | – | Blowfish class; unstyled |
| `page-photo` | `_default/_markup/render-image.html`:49 | 1821 | yes | structure | only under @media |
| `photo-caption` | `assets/js/automagic-sidebar.js`:366 | 1846 | yes | both | site tokens `--ink-muted`; hardcoded font |
| `photo-grid` | `assets/js/automagic-sidebar.js`:351 | 1825–1827, 1833 | yes | both |  |
| `photo-marker` | `assets/js/automagic-sidebar.js`:329 | 1822, 1857, 1863–1865 | yes | both | site tokens `--accent` `--accent-strong` `--border-strong` `--ink-faint` …; `!important`; hardcoded font |
| `photo-strip` | `assets/js/automagic-sidebar.js`:375 | 1822, 1851–1854 | yes | both | `!important` |
| `photo-thumb` | `assets/js/automagic-sidebar.js`:204 | 1828, 1833–1835, 1839–1841, 1852–1853, 1898–1899 | yes | both | site tokens `--accent` `--ink` `--surface-2`; hardcoded font |
| `photo-viewer` | `assets/js/automagic-sidebar.js`:219 | 1822, 1869–1873, 1877–1878, 1880–1881, 1884–1891, 1893–1895 | yes | both | site tokens `--accent-strong` `--ink` `--ink-faint` `--surface`; `!important`; hardcoded font |
| `photos-label` | `assets/js/automagic-sidebar.js`:348 | 1824 | yes | look | hardcoded font |
| `pv-btn` | `assets/js/automagic-sidebar.js`:224 | 1873, 1877, 1880, 1895 | yes | both |  |
| `pv-cap` | `assets/js/automagic-sidebar.js`:230 | 1887 | yes | look | hardcoded font |
| `pv-close` | `assets/js/automagic-sidebar.js`:224 | – | no | – | unstyled |
| `pv-count` | `assets/js/automagic-sidebar.js`:223 | – | no | – | unstyled |
| `pv-foot` | `assets/js/automagic-sidebar.js`:230 | 1886 | yes | both | site tokens `--surface` |
| `pv-inner` | `assets/js/automagic-sidebar.js`:222 | 1871, 1893 | yes | both |  |
| `pv-jump` | `assets/js/automagic-sidebar.js`:257 | 1890–1891 | yes | look | site tokens `--accent-strong` |
| `pv-next` | `assets/js/automagic-sidebar.js`:228 | 1878 | yes | structure |  |
| `pv-prev` | `assets/js/automagic-sidebar.js`:226 | 1878 | yes | structure |  |
| `pv-src` | `assets/js/automagic-sidebar.js`:230 | 1888–1889 | yes | both | site tokens `--ink-faint`; hardcoded font |
| `pv-stage` | `assets/js/automagic-sidebar.js`:225 | 1881, 1884–1885, 1894–1895 | yes | both |  |
| `pv-top` | `assets/js/automagic-sidebar.js`:223 | 1872 | yes | both | hardcoded font |
| `recipe-meta` | `_default/single.html`:281, `_default/term.html`:93 (+3) | 1694 | yes | both | site tokens `--border` |
| `recipe-meta-label` | `_default/single.html`:283, `_default/term.html`:94 (+3) | 1706, 2097 | yes | both | site tokens `--ink-faint`; hardcoded font |
| `recipe-meta-row` | `_default/single.html`:283, `_default/term.html`:94 (+3) | 1701, 2098 | yes | both |  |
| `recipe-meta-value` | `_default/single.html`:283, `_default/term.html`:94 (+3) | 1716 | yes | both | site tokens `--ink-muted`; hardcoded font |
| `recipe-sidebar` | `_default/single.html`:232 | 364, 1581, 1593, 1759, 1761, 2400 | yes | both | site tokens `--accent` `--ink-faint` |
| `recipe-sidebar-section` | `_default/single.html`:295, `partials/reading-sidebar.html`:52 | 1598, 1602, 1612, 1618, 1625–1626, 1628, 1635, 1642, 1655–1657, 1666, 1672, 1677, 1683, 2028–2030, 2032–2037, 2039–2040, 2393 | yes | both | site tokens `--accent-strong` `--ink` `--ink-faint` `--ink-muted`; hardcoded font |
| `recipe-sidebar-toggle` | `_default/single.html`:228 | 1256, 1502, 1524, 1531, 1584 | yes | both | site tokens `--ink` `--ink-faint` `--surface-2`; hardcoded font |
| `recipe-sidebar-wrap` | `_default/single.html`:227 | 1577, 1590 | yes | structure | only under @media |
| `sidebar-photos` | `_default/single.html`:295, `partials/reading-sidebar.html`:52 | 1824, 1846, 1855 | yes | both | site tokens `--ink-muted`; hardcoded font |
| `solo` | `assets/js/automagic-sidebar.js`:375 | 1853 | yes | structure |  |
| `toc` | `_default/single.html`:86 | 1539–1541, 1555–1556, 1566–1568 | no | both | Blowfish class; site tokens `--ink` `--ink-faint` `--surface-2`; hardcoded font; only under @media |
| `toc-inside` | `partials/toc.html`:24 | 1540–1541, 1555–1556, 1566–1568 | no | both | Blowfish class; site tokens `--ink` `--ink-faint` `--surface-2`; hardcoded font; only under @media |
| `toc-jump-label` | `partials/toc.html`:18 | 1304 | yes | look | site tokens `--ink-faint` |
| `toc-right` | `partials/toc.html`:13 | – | no | – | Blowfish class; unstyled |

### Reading sidebar

14 classes.

| Class | Fugu emits it in | custom.css rules (start lines) | fugu.css | Split | Notes |
|---|---|---|---|---|---|
| `reading-sidebar` | `_default/term.html`:86, `partials/reading-sidebar.html`:32 (+2) | 364, 1752–1753, 1758–1759, 1761, 1763–1764, 1768–1770, 1775–1776, 1780–1791, 1793, 1797–1802, 1807, 1810–1812, 2135, 2405–2413 | yes | both | site tokens `--accent` `--accent-soft` `--accent-strong` `--border` …; hardcoded font |
| `reading-sidebar-pin` | `_default/single.html`:200, `_default/term.html`:85 (+2) | 1750 | yes | both | only under @media |
| `reading-sidebar-wrap` | `_default/single.html`:199, `_default/term.html`:84 (+2) | 1738, 1741, 1743, 2088, 2094 | yes | both | site tokens `--border` |
| `rs-label` | `_default/term.html`:104, `partials/reading-sidebar.html`:66 (+2) | 1753, 1758 | yes | look | site tokens `--ink-faint`; hardcoded font |
| `rs-more` | `partials/reading-sidebar.html`:144 | 1793, 1797–1799 | yes | both | site tokens `--accent-strong`; hardcoded font |
| `rs-number` | `partials/reading-sidebar.html`:262 | 1802, 1807, 1810–1812 | yes | both | site tokens `--accent-soft` `--accent-strong` `--border` `--ink-muted`; hardcoded font |
| `rs-numbers` | `partials/reading-sidebar.html`:243 | 1801 | yes | structure |  |
| `rs-section` | `_default/term.html`:87, `partials/reading-sidebar.html`:33 (+2) | – | no | – | unstyled |
| `rs-toc` | `partials/reading-sidebar.html`:93, `partials/method/list.html`:133 (+1) | 1768–1770 | yes | both | site tokens `--accent-strong` `--ink`; hardcoded font |
| `rs-toc-group` | `partials/reading-sidebar.html`:102, `partials/method/list.html`:136 | 1785–1788 | yes | both | site tokens `--accent-strong` `--border-strong` `--ink-muted` |
| `rs-toc-toggle` | `partials/reading-sidebar.html`:98 | 1776, 1780–1784, 1789 | yes | both | site tokens `--accent-strong` `--ink-faint`; hardcoded font |
| `rs-toc-top` | `partials/reading-sidebar.html`:95, `partials/method/list.html`:135 (+1) | 1775, 1784, 2135 | yes | both | site tokens `--accent-strong` `--ink-faint`; hardcoded font |
| `rs-year` | `partials/reading-sidebar.html`:220 | 2405–2406 | yes | look | site tokens `--ink-faint`; hardcoded font |
| `rs-year-fold` | `partials/reading-sidebar.html`:224 | 2407–2413 | yes | both | site tokens `--accent-soft` `--accent-strong` `--ink-faint` `--ink-muted`; hardcoded font |

### Cards and lists

Includes the listing and term pages, pagination, related blocks, and the principle tag page (`principle-*`, `read-essay`). 50 classes.

| Class | Fugu emits it in | custom.css rules (start lines) | fugu.css | Split | Notes |
|---|---|---|---|---|---|
| `article-pagination` | `partials/article-pagination.html`:27, `partials/method/part-nav.html`:36 | 1435, 1440, 1741 | yes | both | site tokens `--border`; hardcoded font |
| `article-pagination-label` | `partials/article-pagination.html`:30, `partials/method/part-nav.html`:34 | 1450 | yes | look | site tokens `--accent-strong` |
| `article-pagination-link` | `partials/article-pagination.html`:29, `partials/method/part-nav.html`:34 | 1445, 1457 | yes | both | site tokens `--accent-strong` `--ink` |
| `article-pagination-next` | `partials/article-pagination.html`:35, `partials/method/part-nav.html`:34 | 1449 | yes | look |  |
| `article-pagination-title` | `partials/article-pagination.html`:31, `partials/method/part-nav.html`:34 | 1454, 1457 | yes | look | site tokens `--accent-strong` |
| `block-title` | `partials/related.html`:26, `partials/development/list.html`:18 | 1058 | yes | look | also emitted by the site |
| `browse-grid` | `_default/terms.html`:39 | 1306, 1308 | yes | both |  |
| `browse-list` | `_default/term.html`:105, `_default/terms.html`:41 (+3) | 1309–1312, 1763–1764, 1790–1791 | yes | both | site tokens `--accent-soft` `--accent-strong` `--ink` `--ink-faint`; hardcoded font |
| `has-formula` | `partials/recipe-card.html`:143 | 1126 | yes | structure |  |
| `has-glass` | `partials/recipe-card.html`:143 | – | no | – | unstyled |
| `list-pagination` | `partials/pagination.html`:20 | 1469 | yes | both | hardcoded font |
| `list-pagination-current` | `partials/pagination.html`:40 | 1481 | yes | look | site tokens `--accent` `--accent-soft` `--accent-strong` |
| `list-pagination-ellipsis` | `partials/pagination.html`:43 | 1723 | yes | look | site tokens `--ink-faint` |
| `list-pagination-link` | `partials/pagination.html`:24 | 1474, 1480 | yes | both | site tokens `--accent` `--border-strong` `--ink` `--ink-muted` |
| `list-pagination-spacer` | `partials/pagination.html`:18 | 1466 | yes | look |  |
| `listing` | `essays/list.html`:24, `_default/term.html`:67 (+6) | 1164, 2086 | no | both |  |
| `listing-count` | `essays/list.html`:27, `_default/term.html`:124 (+4) | 1169 | yes | look | site tokens `--ink-faint`; hardcoded font |
| `listing-dek` | `essays/list.html`:29, `_default/term.html`:137 (+3) | 1170 | yes | look | site tokens `--ink-muted` |
| `listing-head` | `essays/list.html`:25, `_default/term.html`:68 (+6) | 468, 1165 | yes | both |  |
| `listing-section-link` | `_default/term.html`:137 | – | no | – | unstyled |
| `ltitle` | `essays/list.html`:26, `_default/term.html`:69 (+6) | 1166 | yes | look | site tokens `--ink`; hardcoded font |
| `ltitle-kind` | `_default/term.html`:69, `partials/blueprint/page.html`:73 | 1167 | yes | look | site tokens `--accent-strong` |
| `ltitle-kind-method` | `partials/blueprint/page.html`:73 | – | no | – | unstyled |
| `ltitle-kind-principle` | `_default/term.html`:69 | 1168, 1228 | yes | look | site tokens `--flag` `--flag-soft` `--principle-strong` |
| `n` | `_default/term.html`:104, `_default/terms.html`:42 (+6) | 969, 1143, 1151, 1312, 1758, 1791, 1824, 1865, 2135, 2410–2412 | yes | both | also emitted by the site; site tokens `--accent-strong` `--ink-faint`; hardcoded font |
| `pin-icon` | `partials/recipe-card.html`:151 | 1298–1299 | yes | both | site tokens `--ink-faint` |
| `principle-intro` | `_default/term.html`:71 | 2081, 2108–2109, 2112, 2116–2119 | yes | both | site tokens `--principle-strong`; hardcoded font |
| `principle-layout` | `_default/term.html`:66 | 2085–2086, 2088, 2094, 2097–2098 | no | both |  |
| `principle-page` | `_default/term.html`:67 | 1228, 2100, 2103–2104 | no | both | site tokens `--flag` `--flag-soft` |
| `principle-win-the-fridge` | `_default/term.html`:67 | 1228 | no | look | dynamic, term.html, principle-chip.html: principle-<slug>; site tokens `--flag` `--flag-soft` |
| `rcard` | `partials/recipe-card.html`:143, `partials/blueprint/build-card.html`:9 | 1104, 1107–1108, 1112, 1126, 1191, 2366–2368, 2371 | yes | both | site tokens `--accent` `--border` `--surface` |
| `rcard-drink` | `partials/recipe-card.html`:153 | 1128 | yes | both |  |
| `rcard-drink-text` | `partials/recipe-card.html`:153 | 1129 | yes | both |  |
| `rcard-formula` | `partials/formula-strip.html`:45 | 1131, 1136–1137, 1142–1143, 1148–1151, 2366–2367, 2371 | yes | both | site tokens `--accent` `--accent-strong`; hardcoded font |
| `rcard-formula-link` | `partials/formula-strip.html`:46 | 1135, 1148 | yes | both | site tokens `--ink` |
| `rcard-glass` | `partials/drink/glass.html`:81 | 1130 | yes | both | site tokens `--ink` |
| `rcard-intro` | `partials/recipe-card.html`:155, `partials/blueprint/build-card.html`:16 | 1122, 1126, 1437 | yes | both | site tokens `--ink-muted`; hardcoded font |
| `rcard-link` | `partials/recipe-card.html`:154, `partials/blueprint/build-card.html`:14 | 1109–1111 | yes | both |  |
| `rcard-stat` | `partials/recipe-card.html`:161, `partials/blueprint/build-card.html`:19 | 1157–1160, 2104 | yes | both | site tokens `--ink` `--ink-faint`; hardcoded font |
| `rcard-stats` | `partials/recipe-card.html`:159, `partials/blueprint/build-card.html`:18 | 1153, 2103, 2357, 2367–2368, 2371 | yes | both | site tokens `--border` |
| `rcard-title` | `partials/recipe-card.html`:154, `partials/blueprint/build-card.html`:14 | 1121, 1437 | yes | look | site tokens `--ink`; hardcoded font |
| `rcard-top` | `partials/recipe-card.html`:144, `partials/blueprint/build-card.html`:10 | 1113–1115, 1220, 1284–1287, 1290–1291 | yes | both | site tokens `--border-strong` |
| `read-essay` | `_default/term.html`:73, `partials/blueprint/page.html`:78 | 1228, 2118–2119, 2122–2123 | yes | both | site tokens `--accent-strong` `--flag` `--flag-soft` `--principle-strong`; hardcoded font |
| `related-heading` | `partials/related.html`:26, `partials/development/list.html`:18 | 1422 | yes | look |  |
| `related-section` | `partials/related.html`:25, `partials/development/list.html`:17 | 1417, 1422, 1430, 1435, 1437 | yes | both | site tokens `--border` |
| `rgrid` | `essays/list.html`:31, `_default/term.html`:76 (+7) | 1065, 1072–1074, 1430, 2100 | yes | both | also emitted by the site |
| `section-caveat` | `partials/development/list.html`:24 | 1324–1325, 1800 | yes | look | also emitted by the site; site tokens `--ink-faint` `--ink-muted` `--surface-2`; hardcoded font |
| `subsection-count` | `partials/method/list.html`:71, `partials/blueprint/page.html`:93 | 1174 | yes | look | site tokens `--ink-faint`; hardcoded font |
| `subsection-gap` | `partials/method/list.html`:105, `partials/blueprint/page.html`:93 | 1175, 2196 | yes | look |  |
| `subsection-title` | `_default/term.html`:75, `partials/method/list.html`:71 (+1) | 1173 | yes | look | hardcoded font |

### Chips, tags and popovers

19 classes.

| Class | Fugu emits it in | custom.css rules (start lines) | fugu.css | Split | Notes |
|---|---|---|---|---|---|
| `blueprint-chip` | `partials/blueprint/chip.html`:16 | 1195, 1197 | yes | both | site tokens `--accent` `--accent-strong`; hardcoded font |
| `blueprint-chip-part` | `partials/blueprint/chip.html`:16 | 1196 | yes | both | site tokens `--ink-muted` |
| `cuisine-chip` | `partials/recipe-card.html`:146, `partials/article-meta/basic.html`:147 | 1112, 1203, 1206–1207, 1284, 1290 | yes | both | site tokens `--highlight`; hardcoded font |
| `dev-chip` | `partials/development/mark.html`:13 | 1271–1274, 1284–1285, 1290 | yes | both | site tokens `--flag`; hardcoded font |
| `is-icon` | `partials/principle-chip.html`:42 | 1220–1222 | yes | both |  |
| `method-chip` | `partials/method/chip.html`:15 | 1187–1191, 1284–1285, 1290 | yes | both | site tokens `--accent-strong`; hardcoded font |
| `pop` | `partials/concept/pop.html`:18, `partials/glossary/pop.html`:17 | 384, 394, 402–404, 413 | yes | both | site tokens `--border-strong` `--ink-muted` `--surface`; hardcoded font |
| `pop-flip` | `assets/js/popover.js`:61 | 406–408, 410–412, 416 | yes | both | site tokens `--border-strong` `--surface` |
| `pop-glossary` | `partials/glossary/pop.html`:17 | – | no | – | unstyled |
| `pop-head` | `partials/concept/pop.html`:18, `partials/glossary/pop.html`:17 | 395–396 | yes | both | site tokens `--pop-head`; hardcoded font |
| `pop-host` | `partials/concept/pop.html`:18, `partials/glossary/pop.html`:17 | 383, 394, 413, 415–416 | yes | both | site tokens `--accent-strong` `--ink` |
| `pop-link` | `partials/concept/pop.html`:18 | 398–400 | yes | both | site tokens `--pop-accent`; hardcoded font |
| `pop-note` | `partials/concept/pop.html`:18 | 397 | yes | look |  |
| `pop-text` | `partials/concept/pop.html`:18, `partials/glossary/pop.html`:17 | – | no | – | unstyled |
| `pop-up` | `partials/glossary/pop.html`:17 | 406–408, 410–412, 416 | yes | both | site tokens `--border-strong` `--surface` |
| `principle-chip` | `partials/principle-chip.html`:39 | 1112, 1214–1216, 1220–1222, 1228, 1232, 1284–1285, 1290, 2098 | yes | both | site tokens `--flag` `--flag-soft` `--principle-strong`; hardcoded font |
| `tag` | `partials/recipe-card.html`:149, `partials/article-meta/basic.html`:175 | 1115, 1198, 1201–1202, 1284, 1286 | yes | both | site tokens `--accent` `--border-strong` `--ink` `--ink-muted`; hardcoded font |
| `tag-more` | `partials/recipe-card.html`:150 | 1115, 1199, 1287 | yes | both | site tokens `--ink-faint` |
| `tags-row` | `partials/article-meta/basic.html`:142 | 1183 | yes | look |  |

### Formula, stack and flow diagrams

46 classes.

| Class | Fugu emits it in | custom.css rules (start lines) | fugu.css | Split | Notes |
|---|---|---|---|---|---|
| `f-bar` | `_default/_markup/render-codeblock-formula.html`:66 | 2009–2010 | yes | both | site tokens `--accent` `--accent-soft` |
| `f-cap` | `_default/_markup/render-codeblock-formula.html`:73 | 2011 | yes | look | site tokens `--ink-faint`; hardcoded font |
| `f-eq` | `_default/_markup/render-codeblock-formula.html`:59 | 2005 | yes | look | site tokens `--ink-faint` |
| `f-icons` | `partials/formula-slot.html`:4 | 1995, 2020, 2030 | yes | both |  |
| `f-label` | `partials/formula-slot.html`:15 | 1997–1998, 2023, 2035 | yes | look | site tokens `--ink` `--ink-muted`; hardcoded font |
| `f-num` | `partials/formula-slot.html`:14 | 2007, 2039 | yes | look | site tokens `--accent-strong`; hardcoded font |
| `f-op` | `_default/_markup/render-codeblock-formula.html`:59 | 2004–2006, 2008, 2018–2019, 2034, 2040 | yes | both | site tokens `--accent` `--ink-faint`; hardcoded font |
| `f-or` | `partials/formula-slot.html`:27 | 2000, 2002–2003, 2024, 2037 | yes | both | site tokens `--ink-faint`; hardcoded font |
| `f-pair` | `partials/formula-slot.html`:4 | 1996, 2022, 2033 | yes | structure |  |
| `f-qty` | `partials/formula-slot.html`:22 | 1999, 2024, 2036 | yes | look | site tokens `--accent-strong`; hardcoded font |
| `f-result` | `partials/formula-slot.html`:3 | 1998 | yes | look | site tokens `--ink-muted` |
| `f-slot` | `partials/formula-slot.html`:3 | 1994, 2017, 2029 | yes | both | site tokens `--ink` |
| `f-step` | `_default/_markup/render-codeblock-formula.html`:58 | 1993 | yes | structure |  |
| `f-sub` | `partials/formula-slot.html`:20 | 2000–2001, 2024, 2037 | yes | look | site tokens `--ink-muted`; hardcoded font |
| `flow` | `_default/_markup/render-codeblock-flow.html`:60 | 2289–2293, 2298–2299, 2301–2305, 2309, 2313–2316, 2320–2321, 2326–2332 | yes | both | site tokens `--accent` `--border-strong` `--ink` `--ink-faint` …; hardcoded font |
| `flow-arrow` | `_default/_markup/render-codeblock-flow.html`:63 | 2301, 2328 | yes | both | site tokens `--accent`; hardcoded font |
| `flow-cap` | `_default/_markup/render-codeblock-flow.html`:70 | 2302 | yes | look | site tokens `--ink-faint`; hardcoded font |
| `flow-grid` | `_default/_markup/render-codeblock-flow.html`:74 | 2303–2304, 2309, 2313, 2320–2321, 2332 | yes | both |  |
| `flow-head` | `_default/_markup/render-codeblock-flow.html`:79 | 2305, 2330–2331 | yes | both | site tokens `--ink-faint`; hardcoded font |
| `flow-item` | `_default/_markup/render-codeblock-flow.html`:83 | 2314–2316, 2326 | yes | both |  |
| `flow-label` | `_default/_markup/render-codeblock-flow.html`:65 | 2293, 2299, 2327 | yes | both | site tokens `--border-strong` `--ink` `--surface`; hardcoded font |
| `flow-note` | `_default/_markup/render-codeblock-flow.html`:66 | 2298–2299, 2329 | yes | both | site tokens `--ink-muted`; hardcoded font |
| `flow-row` | `_default/_markup/render-codeblock-flow.html`:61 | 2291, 2309, 2313, 2321, 2332 | yes | both |  |
| `flow-rows` | `_default/_markup/render-codeblock-flow.html`:73 | – | no | – | unstyled |
| `flow-step` | `_default/_markup/render-codeblock-flow.html`:64 | 2292, 2316, 2326 | yes | both |  |
| `formula` | `_default/_markup/render-codeblock-formula.html`:52 | 1983–1985, 1990, 2017–2018, 2020–2024, 2028, 2030, 2032, 2389 | yes | both | site tokens `--ink-faint` |
| `formula-ratio` | `_default/_markup/render-codeblock-formula.html`:52 | 2007–2008, 2019, 2039–2040 | yes | look | dynamic, render-codeblock-formula.html: formula-{{ $variant }}; site tokens `--accent-strong`; hardcoded font |
| `formula-row` | `_default/_markup/render-codeblock-formula.html`:53 | 1991 | yes | both |  |
| `formula-seq` | `_default/_markup/render-codeblock-formula.html`:52 | 2006 | no | look | dynamic, render-codeblock-formula.html: formula-{{ $variant }}; hardcoded font |
| `headed` | `_default/_markup/render-codeblock-flow.html`:73 | 2304, 2313 | yes | structure |  |
| `ic` | `partials/formula-slot.html`:7, `partials/formula-strip.html`:52 | 1137, 1149, 1985, 1996, 2020–2022, 2030, 2032–2033 | yes | both |  |
| `ic-missing` | `partials/formula-slot.html`:9 | 1990 | yes | look | site tokens `--ink-faint` |
| `op` | `partials/formula-strip.html`:48 | 1142, 1150 | yes | both | site tokens `--accent`; hardcoded font |
| `slot` | `partials/formula-strip.html`:49 | 1136, 1148 | yes | both |  |
| `stack` | `partials/stack/draw.html`:82 | 2340, 2350, 2354 | yes | both | site tokens `--ink` |
| `stack-bracket` | `partials/stack/draw.html`:103 | 2346 | yes | look | site tokens `--accent` |
| `stack-cap` | `partials/stack/draw.html`:108 | 2349 | yes | look | site tokens `--ink-faint`; hardcoded font |
| `stack-compact` | `partials/stack/draw.html`:82 | – | no | – | unstyled |
| `stack-dot` | `partials/stack/draw.html`:90 | 2345 | yes | look | site tokens `--ink-faint` |
| `stack-label` | `partials/stack/draw.html`:92 | 2342 | yes | look | site tokens `--ink`; hardcoded font |
| `stack-labelled` | `partials/stack/draw.html`:82 | – | no | – | unstyled |
| `stack-lead` | `partials/stack/draw.html`:91 | 2344 | yes | look | site tokens `--ink-faint` |
| `stack-missing` | `partials/stack/draw.html`:51 | 2348 | yes | look | site tokens `--ink-faint` |
| `stack-role` | `partials/stack/draw.html`:94 | 2343 | yes | look | site tokens `--ink-muted`; hardcoded font |
| `stack-svg` | `partials/stack/draw.html`:83 | 2341 | yes | structure |  |
| `stack-times` | `partials/stack/draw.html`:104 | 2347 | yes | look | site tokens `--accent-strong`; hardcoded font |

### Blueprint, methods and lineage

The methods list, blueprint pages, build cards, and both lineage drawings (`tl-*` across, `vt-*` down the sidebar). 61 classes.

| Class | Fugu emits it in | custom.css rules (start lines) | fugu.css | Split | Notes |
|---|---|---|---|---|---|
| `alt` | `partials/blueprint/lineage.html`:98 | 2178–2179, 2270–2271 | yes | both | site tokens `--border-strong` |
| `blueprint-intro` | `partials/blueprint/page.html`:76 | 2122–2123 | yes | both | site tokens `--accent-strong`; hardcoded font |
| `blueprint-layout` | `partials/blueprint/page.html`:70 | 2085–2086, 2088, 2094, 2097 | no | both |  |
| `blueprint-lineage` | `partials/blueprint/page.html`:86 | 2196 | yes | look | only under @media |
| `blueprint-page` | `partials/blueprint/page.html`:71 | 2125, 2127, 2133 | no | structure |  |
| `bp` | `partials/method/list.html`:77, `partials/blueprint/page.html`:94 | 2046, 2146, 2150 | yes | both | also emitted by the site; site tokens `--border` `--surface` |
| `bp-builds-inline` | `partials/method/list.html`:91 | 2141–2142 | yes | both | site tokens `--border` `--ink-faint`; hardcoded font |
| `bp-builds-lead` | `partials/blueprint/page.html`:111 | 2157 | yes | both |  |
| `bp-count` | `partials/method/list.html`:80 | 2053 | yes | both | also emitted by the site; site tokens `--ink-faint`; hardcoded font |
| `bp-desc` | `partials/method/list.html`:82, `partials/blueprint/page.html`:96 | 2054, 2150, 2155–2156 | yes | look | also emitted by the site; site tokens `--ink-muted`; hardcoded font |
| `bp-head` | `partials/method/list.html`:78 | 2047 | yes | both | also emitted by the site |
| `bp-list` | `partials/method/list.html`:72 | 2045 | yes | both |  |
| `bp-name` | `partials/method/list.html`:79 | 2048–2052 | yes | both | also emitted by the site; site tokens `--accent-strong` `--ink`; hardcoded font |
| `bp-parts-only` | `partials/blueprint/page.html`:94 | 2146, 2150 | yes | look |  |
| `bp-row` | `partials/method/list.html`:76 | 2124 | yes | both |  |
| `build-card` | `partials/blueprint/build-card.html`:9 | 2354, 2357, 2366–2368, 2371 | yes | both | site tokens `--border` |
| `build-grid` | `partials/blueprint/page.html`:113 | 2133 | no | structure | only under @media |
| `build-origin` | `partials/blueprint/build-card.html`:15 | 2166 | yes | look | site tokens `--ink-faint`; hardcoded font |
| `go` | `partials/method/list.html`:79 | 2051–2052 | yes | both | site tokens `--accent-strong` |
| `hist` | `partials/blueprint/lineage-side.html`:70, `partials/blueprint/lineage.html`:98 | 2223–2224, 2230–2231, 2242–2244, 2247, 2250, 2254, 2256, 2273, 2275–2276 | yes | both | site tokens `--border-strong` `--ink-faint` `--ink-muted` |
| `lbl` | `partials/method/list.html`:92 | 2142 | yes | look | site tokens `--ink-faint`; hardcoded font |
| `ln-dot` | `partials/blueprint/lineage-side.html`:77 | 2208, 2212–2213, 2216, 2218, 2224, 2227–2233 | yes | both | site tokens `--accent` `--accent-soft` `--accent-strong` `--bg` … |
| `method-icon` | `partials/method/icon.html`:10 | – | no | – | unstyled |
| `method-intro` | `partials/method/list.html`:68, `partials/blueprint/page.html`:76 | 2081, 2108–2109, 2112, 2116–2117 | yes | both | hardcoded font |
| `method-list` | `partials/method/list.html`:64 | 2124–2125, 2127 | no | both |  |
| `method-list-layout` | `partials/method/list.html`:63 | 2085–2086, 2088, 2094, 2097 | no | both |  |
| `opt-pill` | `partials/method/list.html`:94 | 2143–2144, 2161–2163 | yes | both | also emitted by the site; site tokens `--accent` `--border-strong` `--ink` `--ink-faint` …; hardcoded font |
| `part-nav` | `partials/method/part-nav.html`:36 | – | no | – | unstyled |
| `part-nav-next` | `partials/method/part-nav.html`:34 | – | no | – | unstyled |
| `part-nav-up` | `partials/method/part-nav.html`:36 | – | no | – | unstyled |
| `part-row` | `partials/method/list.html`:86, `partials/blueprint/page.html`:102 | 2066–2072 | yes | both | site tokens `--accent` `--accent-soft` `--accent-strong` `--ink`; hardcoded font |
| `parts` | `partials/method/list.html`:84, `partials/blueprint/page.html`:100 | 2058–2060 | yes | both | site tokens `--accent` `--border`; hardcoded font |
| `parts-compact` | `partials/method/list.html`:84, `partials/blueprint/page.html`:100 | 2061, 2066, 2068, 2125, 2127 | yes | both |  |
| `r2` | `partials/blueprint/lineage.html`:98 | 2181–2182, 2270 | yes | both | dynamic, blueprint/lineage.html: r{{ .row }} |
| `r3` | `partials/blueprint/lineage.html`:98 | 2183–2184, 2270 | yes | both | dynamic, blueprint/lineage.html: r{{ .row }} |
| `timeline` | `partials/blueprint/lineage.html`:84 | 2171, 2263 | yes | both |  |
| `tl-break` | `partials/blueprint/lineage.html`:87 | 2261, 2264 | yes | both | site tokens `--bg` `--ink-faint` |
| `tl-decade` | `partials/blueprint/lineage.html`:98 | 2252–2256, 2273–2275 | yes | both | site tokens `--accent-soft` `--border-strong` |
| `tl-detail` | `partials/blueprint/lineage.html`:104 | 2234, 2272 | yes | both | site tokens `--ink-faint`; hardcoded font |
| `tl-dot` | `partials/blueprint/lineage.html`:108 | 2175, 2185, 2243, 2253, 2255–2256, 2268, 2274–2276 | yes | both | site tokens `--accent` `--accent-soft` `--bg` `--border-strong` … |
| `tl-end` | `partials/blueprint/lineage.html`:98 | 2249–2251, 2269, 2273 | yes | both |  |
| `tl-list` | `partials/blueprint/lineage.html`:92 | 2173, 2266 | yes | both | site tokens `--border-strong` |
| `tl-mark` | `partials/blueprint/lineage.html`:98 | 2174, 2178–2179, 2181–2186, 2242–2244, 2246–2256, 2267–2271, 2273–2276 | yes | both | site tokens `--accent-soft` `--bg` `--border-strong` `--ink-faint` … |
| `tl-name` | `partials/blueprint/lineage.html`:101 | 2176–2179, 2181–2184, 2186, 2244, 2248, 2251, 2270–2271 | yes | both | site tokens `--accent-strong` `--border-strong` `--ink` `--ink-faint` …; hardcoded font |
| `tl-start` | `partials/blueprint/lineage.html`:98 | 2246–2248, 2273 | yes | both |  |
| `tl-tick` | `partials/blueprint/lineage.html`:115 | 2236–2237, 2259 | yes | both | site tokens `--border-strong` `--ink-faint`; hardcoded font |
| `tl-ticks` | `partials/blueprint/lineage.html`:113 | 2235, 2264 | yes | both |  |
| `tl-track` | `partials/blueprint/lineage.html`:85 | 2172, 2265 | yes | both | site tokens `--border-strong` |
| `tl-yr` | `partials/blueprint/lineage.html`:118 | 2259 | yes | look |  |
| `tl-zoom` | `partials/blueprint/lineage.html`:90 | 2258, 2264 | yes | both | site tokens `--accent-soft` `--border-strong` |
| `todo` | `partials/method/list.html`:94, `partials/blueprint/lineage-side.html`:70 (+1) | 2143, 2185–2186, 2215–2218 | yes | look | site tokens `--accent-strong` `--bg` `--ink-faint` |
| `vt` | `partials/blueprint/lineage-side.html`:54 | 2197 | yes | structure |  |
| `vt-break` | `partials/blueprint/lineage-side.html`:57 | 2206 | yes | both | site tokens `--bg` `--ink-faint` |
| `vt-dec` | `partials/blueprint/lineage-side.html`:63 | 2199, 2202, 2204 | yes | both | site tokens `--border-strong` `--ink-faint`; hardcoded font |
| `vt-decade` | `partials/blueprint/lineage-side.html`:70 | 2228–2232 | yes | both | site tokens `--accent-soft` `--border-strong` |
| `vt-lead` | `partials/blueprint/lineage-side.html`:78 | 2214 | yes | both | site tokens `--border-strong` |
| `vt-name` | `partials/blueprint/lineage-side.html`:70 | 2207–2213, 2215–2218, 2223–2233 | yes | both | site tokens `--accent` `--accent-soft` `--accent-strong` `--bg` …; hardcoded font |
| `vt-spine` | `partials/blueprint/lineage-side.html`:55 | 2198 | yes | both | site tokens `--border-strong` |
| `vt-yr` | `partials/blueprint/lineage-side.html`:66 | 2204 | yes | look |  |
| `vt-zoom` | `partials/blueprint/lineage-side.html`:60 | 2203 | yes | both | site tokens `--accent-soft` `--border-strong` |
| `y` | `partials/method/list.html`:94, `partials/blueprint/lineage-side.html`:79 | 2144, 2209, 2211, 2226 | yes | both | site tokens `--accent-strong` `--ink-faint`; hardcoded font |

### Glossary

13 classes.

| Class | Fugu emits it in | custom.css rules (start lines) | fugu.css | Split | Notes |
|---|---|---|---|---|---|
| `also` | `partials/glossary/page.html`:71 | 451 | yes | look | site tokens `--ink-faint` |
| `gl-count` | `partials/glossary/page.html`:58 | 439 | yes | both | site tokens `--ink-faint`; hardcoded font |
| `gl-letter` | `partials/glossary/page.html`:67 | 446 | yes | look | site tokens `--ink-faint`; hardcoded font |
| `gl-letters` | `partials/glossary/page.html`:60 | 441–445, 469, 473 | yes | both | site tokens `--accent-soft` `--accent-strong` `--border` `--border-strong`; hardcoded font |
| `gl-none` | `partials/glossary/page.html`:96 | 440 | yes | look | site tokens `--ink-muted`; hardcoded font |
| `gl-search` | `partials/glossary/page.html`:55 | 430–431, 436–438 | yes | both | site tokens `--accent` `--accent-soft` `--border-strong` `--ink` …; hardcoded font |
| `glossary` | `partials/glossary/page.html`:68 | 447–451, 453–460 | yes | both | site tokens `--accent` `--accent-soft` `--accent-strong` `--border-strong` …; hardcoded font |
| `glossary-intro` | `partials/glossary/page.html`:52 | 429 | yes | both |  |
| `glossary-link` | `partials/glossary/pop.html`:17 | 361–362, 364 | yes | both | site tokens `--ink` `--ink-faint` |
| `glossary-page` | `partials/glossary/page.html`:47 | 466–469, 473 | no | both | only under @media |
| `is-empty` | `assets/js/glossary.js`:56 | 445 | yes | look | site tokens `--border-strong` |
| `used` | `partials/glossary/page.html`:85 | 456–460 | yes | both | site tokens `--accent` `--accent-strong` `--border-strong` `--ink-faint` …; hardcoded font |
| `used-more` | `partials/glossary/page.html`:86 | 475–478 | yes | both | site tokens `--ink-muted` |

### Food Log

Fugu emits no Food Log classes of its own. `the-food-log/list.html` uses the listing classes (`listing`, `listing-head`, `ltitle`, `listing-count`, `listing-dek`, `listing-search`, `rgrid`, under Cards and lists and Search), `reading-sidebar/log-month-row.html` uses `n`, and the months grouped by year in the reading sidebar are `rs-year` and `rs-year-fold` (Reading sidebar). The only Food Log-specific rules are global ones on Markdown task lists in notes (`.prose li:has(> input[type="checkbox"])` and its neighbours, 540–552).

### Test kitchen (drafts)

9 classes.

| Class | Fugu emits it in | custom.css rules (start lines) | fugu.css | Split | Notes |
|---|---|---|---|---|---|
| `dev-dot` | `partials/development/icon.html`:6 | 1241, 1259, 1274 | yes | both | site tokens `--flag` |
| `dev-icon` | `partials/development/icon.html`:9 | 396, 1238–1240, 1258, 1273 | yes | both | site tokens `--flag` `--flag-soft` `--surface` |
| `dev-link` | `partials/development/banner.html`:18 | 1263–1266 | yes | both | site tokens `--flag`; hardcoded font |
| `dev-strip` | `partials/development/banner.html`:13 | 1251, 1256, 1258–1259, 1266 | yes | both | site tokens `--flag`; hardcoded font |
| `dev-strip-body` | `partials/development/banner.html`:15 | 1257, 1260 | yes | both | hardcoded font |
| `dev-strip-label` | `partials/development/banner.html`:16 | 1261 | yes | look | site tokens `--flag` |
| `dev-strip-msg` | `partials/development/banner.html`:17 | 1262 | yes | look | site tokens `--ink-muted` |
| `dev-strip-note` | `partials/development/banner.html`:19 | 1267–1268 | yes | both | site tokens `--flag` `--ink`; hardcoded font |
| `development-list` | `partials/development/list.html`:17 | – | no | – | unstyled |

### Search

2 classes.

| Class | Fugu emits it in | custom.css rules (start lines) | fugu.css | Split | Notes |
|---|---|---|---|---|---|
| `listing-search` | `essays/list.html`:30, `_default/term.html`:138 (+3) | 1171 | yes | both |  |
| `search-box` | `partials/search-box.html`:10 | 1039, 1045–1047, 1759, 1761 | yes | both | site tokens `--accent` `--border-strong` `--ink-faint` `--surface`; hardcoded font |

### Misc (links, headings, images)

`article-content` is Blowfish's prose wrapper; the rules that name it mostly scope other areas' classes to the article body. 10 classes.

| Class | Fugu emits it in | custom.css rules (start lines) | fugu.css | Split | Notes |
|---|---|---|---|---|---|
| `-start-6` | `_default/_markup/render-heading.html`:116 | – | no | – | Blowfish class; unstyled |
| `anchor` | `_default/_markup/render-heading.html`:113 | 1612, 1626, 2385 | yes | structure | Blowfish class |
| `article-content` | `_default/single.html`:95, `_default/term.html`:71 (+3) | 597, 607, 613, 616, 805, 810–812, 814, 817, 1339, 1354–1355, 1984, 2017–2024, 2290, 2376, 2380, 2385, 2387–2389 | yes | both | Blowfish class; site tokens `--accent` `--accent-strong` `--flag-soft` `--ink` …; hardcoded font |
| `broken-link` | `_default/_markup/render-link.html`:99 | 344 | yes | both | site tokens `--flag` `--flag-soft` |
| `email-link` | `_default/single.html`:133 | – | no | – | Blowfish class; unstyled |
| `essay-link` | `partials/glossary/page.html`:90 | 459–460 | no | both | site tokens `--accent-strong` |
| `extlink` | `_default/single.html`:283, `_default/_markup/render-link.html`:106 | 309, 317, 335 | yes | look | site tokens `--accent` |
| `heading-anchor-link` | `_default/_markup/render-heading.html`:120 | 1404 | yes | structure |  |
| `nozoom` | `_default/_markup/render-image.html`:53, `assets/js/automagic-sidebar.js`:208 | – | no | – | Blowfish class; unstyled |
| `wikilink` | `_default/_markup/render-link.html`:88 | 309, 317, 324, 328, 331 | yes | both | site tokens `--accent` `--accent-strong` |

## Classes Fugu emits that custom.css never styles

26 classes. Most are hooks for JS or tests, or variants no rule needs yet.

| Class | Emitted in | Why it may be unstyled |
|---|---|---|
| `-start-6` | `_default/_markup/render-heading.html`:116 | Blowfish's heading-anchor markup, kept from its template |
| `bf-scrollbar`, `overscroll-contain`, `toc-right` | `partials/toc.html`:13 | Blowfish's TOC classes, styled by Blowfish |
| `email-link` | `_default/single.html`:133 | Blowfish's author-links class |
| `nozoom` | `render-image.html`:53, `automagic-sidebar.js`:208 | read by Blowfish's zoom script, not a style hook |
| `development-list` | `partials/development/list.html`:17 | the list's `related-section` and `rgrid` carry the look |
| `flow-rows` | `render-codeblock-flow.html`:73 | `.flow .flow-grid` is the row layout; only `.headed` changes it |
| `has-glass` | `partials/recipe-card.html`:143 | drink cards are styled through `rcard-drink` and `rcard-glass` |
| `ing-config-btn` | `ingredients.js`:1290 | styled as `.ing-config > summary` |
| `ing-pct-amount` | `ingredients.js`:1010 | |
| `ing-row` | `ingredients.js`:743 | the row is styled as `.ing` |
| `listing-section-link` | `_default/term.html`:137 | |
| `ltitle-kind-method` | `partials/blueprint/page.html`:73 | `ltitle-kind` carries it; only the principle variant recolours |
| `method-icon` | `partials/method/icon.html`:10 | |
| `n3` | `automagic-sidebar.js`:351 | three across is `.photo-grid`'s default |
| `part-nav`, `part-nav-next`, `part-nav-up` | `partials/method/part-nav.html`:34–36 | they sit beside `article-pagination*`, which carry the look |
| `pop-glossary`, `pop-text` | `partials/glossary/pop.html`:17, `partials/concept/pop.html`:18 | `.pop` styles the box; so are the dynamic `pop-principle` and `pop-method`, which no rule names |
| `pv-close`, `pv-count` | `automagic-sidebar.js`:223–224 | styled as `.pv-btn` and `.pv-top` |
| `rs-section` | `_default/term.html`:87, `partials/reading-sidebar.html`:33 | |
| `stack-compact`, `stack-labelled` | `partials/stack/draw.html`:82 | |

## Classes custom.css styles that Fugu never emits

### Site-owned (70)

Emitted by Not a Chef's own `layouts/`. These stay in `custom.css`.

- `layouts/partials/header/basic.html` (26): `drawer-backdrop`, `drawer-close`, `drawer-item`, `drawer-link`, `drawer-panel`, `drawer-panel-head`, `drawer-sub`, `is-home`, `mega-chip`, `mega-chip-row`, `mega-col`, `mega-col-label`, `mega-filters`, `mega-more`, `mega-panel`, `mega-panel-end`, `mega-panel-simple`, `mobile-drawer-toggle`, `nav-drop`, `nav-link`, `site-logo`, `site-logo-icon`, `site-logo-name`, `site-nav`, `site-nav-inner`, `site-nav-links`.
- `layouts/index.html` (22): `block-dek`, `block-head`, `block-num`, `brand-loves` (also in the header and footer), `filter-pill`, `filter-row`, `hero`, `hero-eyebrow`, `hero-mark`, `home-bps`, `home-essays`, `home-list-label`, `home-methods`, `home-row`, `home-row-link`, `home-section`, `lede`, `mega-viewall`, `opts`, `parts-inline`, `search-row`, `single`.
- `layouts/partials/footer.html` (12): `foot-brand`, `foot-build`, `foot-links`, `foot-meta`, `foot-row`, `heading`, `name`, `site-footer`, `site-footer-inner`, `theme-toggle`, `tt-dark`, `tt-light`.
- `layouts/404.html` (10): `error-404`, `error-404-head`, `error-404-num`, `term-actions`, `term-cursor`, `term-link`, `term-list`, `term-prompt`, `term-room`, `terminal-card`.

The site also emits ten Fugu class names itself, so their rules serve both: `bp`, `bp-count`, `bp-desc`, `bp-head`, `bp-name`, `opt-pill`, `rgrid`, `n`, `section-caveat`, `block-title` (the homepage's Methods band and section headings reuse Fugu's components).

Two more are site-owned but not from a template: `dev-icon-body` and `dev-icon-lid` (lines 1239–1240) are inside the site's `assets/icons/development/pot-steam.svg`, which Fugu's `development/icon.html` inlines. `fugu.css` styles them too, so a site that swaps the icon needs to know the names.

### Blowfish and Tailwind (8)

`dark` (Blowfish's `<html>` class), `icon` (Blowfish's icon partial), `prose`, `prose-invert`, `not-prose`, `max-w-prose`, `mb-8`, `pt-8`. See the hard cases.

### Apparently dead (13)

Named in a `custom.css` selector, emitted by no template, script or content.

| Class | Lines | Note |
|---|---|---|
| `stat-rail`, `stat`, `stat-label`, `stat-value` | 1049–1052 | the sidebar's meta rail, adapted from this component, is `recipe-meta*` |
| `browse-more` | 1313 | |
| `comp-grid` | 1072–1074, 1315 | the homepage's comment says the comp-card grid was replaced by `rgrid`/`rcard` |
| `comp-card`, `comp-card-label`, `comp-card-note`, `comp-card-format` | 1316–1318, 1322, 1726–1728 | as above |
| `ratio` | 1657 | `.recipe-sidebar-section .mechanic .ratio`; nothing emits it |
| `variation` | 2393 | `.recipe-sidebar-section .variation p`; Variations render as `###` headings and nothing emits the class |
| `build-diagram` | 2350 | |

About 16 lines of rules, plus their comments, could go before the split.

## Totals

| Area | Classes | Rules | Rule lines | Structure decls | Look decls | ~Structure lines | ~Look lines | Rules: structure / look / both |
|---|---|---|---|---|---|---|---|---|
| Recipe page and ingredients | 39 | 82 | 246 | 115 | 178 | 97 | 149 | 16 / 35 / 31 |
| Sidebar and automagic sidebar | 47 | 102 | 259 | 130 | 211 | 95 | 164 | 32 / 41 / 29 |
| Reading sidebar | 14 | 48 | 65 | 39 | 113 | 18 | 47 | 10 / 25 / 13 |
| Cards and lists | 50 | 88 | 128 | 123 | 195 | 41 | 87 | 14 / 42 / 32 |
| Chips, tags and popovers | 19 | 48 | 61 | 77 | 124 | 24 | 37 | 13 / 16 / 19 |
| Formula, stack and flow diagrams | 46 | 69 | 87 | 76 | 144 | 33 | 54 | 14 / 32 / 23 |
| Blueprint, methods and lineage | 61 | 134 | 134 | 193 | 256 | 56 | 78 | 28 / 47 / 59 |
| Glossary | 13 | 38 | 45 | 39 | 92 | 15 | 30 | 8 / 18 / 12 |
| Food Log | 0 | 0 | 0 | – | – | – | – | – |
| Test kitchen (drafts) | 9 | 18 | 18 | 13 | 42 | 4 | 14 | 2 / 11 / 5 |
| Search | 2 | 5 | 10 | 10 | 17 | 5 | 5 | 2 / 1 / 2 |
| Misc (links, headings, images) | 10 | 13 | 46 | 6 | 20 | 11 | 35 | 3 / 8 / 2 |
| **Fugu-related** | **310** | **645** | **1,099** | **821** | **1,392** | **~400** | **~700** | **142 / 276 / 227** |
| Site-only | 70 | 143 | 210 | 188 | 342 | 74 | 136 | 25 / 60 / 58 |
| Global and Blowfish overrides | – | 33 | 232 | 5 | 134 | 16 | 216 | 2 / 29 / 2 |
| Dead | 13 | 13 | 13 | 14 | 39 | 3 | 10 | 0 / 7 / 6 |

"Rule lines" run from a rule's selector to its closing brace; one-line rules count one. Two lines hold two site rules each, so the unique total is 1,552. "~Structure lines" and "~look lines" split each rule's lines by its share of structure and look declarations, so they are an estimate. The global row is mostly tokens: `:root` and `.dark` (lines 19–133, 880–887) hold the 48 site tokens, and the rest is `body`, `main`, `#single_header`, `#search-modal` and `.prose`.

Read as a plan: about 400 lines of structure move into `fugu.css` (which already has most of them in its own form), about 700 lines of look become `--fugu-*` values plus Not a Chef's own overrides, and the ~450 site-only, global and dead lines stay or go as they are.

## Hard cases

1. **Mixed rules: 227 of the 645 Fugu rules set both structure and look in one block.** The largest:
   - `.pop` (384): absolute position, `z-index`, a fixed 260px width, grid, and show/hide by `opacity`/`visibility`/`transform`/`transition`, in the same block as Lora, colour, border, radius, padding and shadow. Its pointer (401–418) is two triangles drawn with `border` widths, which is structure written as look, and the flip (`.pop-up`, `.pop-flip`) repeats the border colours in every direction.
   - `.ing-config-panel` (715), `.vt-name` (2207), `.recipe-sidebar-toggle` (1502), `.ing-awake` (697), `.search-box` (1039), `.dev-chip` (1271), `.photo-marker` (1857), `.part-row` (2067): each carries 8 to 17 declarations of both kinds.
   - The lineage timeline (`tl-*`, 2171–2276) and side lineage (`vt-*`, 2197–2233) place marks with offsets and colour them in the same rules, row by row (`.r2`, `.r3`, `.alt`).
2. **Site tokens: 278 of the 645 Fugu rules read a token `custom.css` defines itself.** 17 distinct: `--ink-faint` (67 rules), `--accent-strong` (51), `--accent` (38), `--border-strong` (38), `--ink` (36), `--ink-muted` (34), `--surface` (20), `--accent-soft` (17), `--border` (16), `--flag` (10), `--surface-2` (8), `--bg` (7), `--flag-soft` (4), `--principle-strong` (3), `--pop-accent` (2), `--pop-head` (1), `--highlight` (1). Each needs a `--fugu-*` counterpart. Some Fugu rules also set component tokens of their own (`--pop-accent`, `--pop-head` at 383; `--principle`, `--principle-soft`, `--principle-strong` at 1228–1230), which Fugu would have to own. Nine rules mix tokens with `color-mix()`, and ten use raw colours (`rgba()` shadows, hex) that no token covers.
3. **Hardcoded font families: 137 rules name a family, 109 of them Fugu's.** Three families, written out each time: `'Lora', serif` or `'Lora', Georgia, serif`, `'Libre Franklin', sans-serif`, and `'IBM Plex Mono', monospace` (once `ui-monospace, monospace`, in `.mono` at 842). `.dev-strip` (1251) uses the `font` shorthand, which also sets size and line height. Fugu needs `--fugu-font-body`, `-ui` and `-mono` (fugu.css has `--fugu-font-mono`) and the §5 fonts hook.
4. **`!important`: four rules.** `.ing-check-cell` (568, `padding-right: 6px !important` against Typography's cell padding), `@media print .ing-pct-row` (840), `@media print .photo-marker, .photo-strip, .photo-viewer` (1822), and the site's `.mega-more` (970). The two print rules are structure and belong in `fugu.css`.
5. **Blowfish and Tailwind overrides.** Rules that only work against Blowfish's markup or Tailwind's output:
   - Global: `body` (144), `main` (188), `#single_header` (219, 226), `main > header` (238), `#search-modal` (247), the `.prose` family (255–297, 544–552, 1366–1393), `footer.pt-8.max-w-prose` (1340), `article > .max-w-prose, article > footer` (1411), `.dark` (90, 883).
   - On Fugu markup: `.browse-grid.mb-8` (1308) undoes a utility Fugu's own `terms.html` adds; `.method-intro.prose, .principle-intro.prose` (2108); `.recipe-sidebar > .not-prose` (2400); `.recipe-sidebar-toggle .icon` (1524, 1531) styles Blowfish's icon partial; `.toc details.toc-inside > summary` and its neighbours (1539–1568) restyle Blowfish's own phone TOC; `.recipe-sidebar-wrap { max-width: 20.7rem }` (1590) overrides the `lg:max-w-2xs` utility still on the element; `#single_header:has(.dev-strip) + section …` (1256) depends on Blowfish's header id.
   These are the rules most likely to break on a Blowfish update. The ones on Fugu markup are better fixed in the templates (drop the utility, or emit a Fugu class) than moved as they are.
6. **Page shells missing from fugu.css.** `blueprint-layout`, `method-list-layout`, `principle-layout`, `glossary-page`, `listing`, `blueprint-page`, `build-grid`, `method-list`, `principle-page` are structure `custom.css` alone provides (the reading layout's columns and sticky sidebar). Without them a site on `fugu.css` gets those pages unlaid.

## Appendix: the scripts

Copy each block to a file, both in one folder outside the repo, and run the commands under "How it was made" from the site root with the scripts' paths. They only read the source.

<details>
<summary><code>inventory.py</code></summary>

```python
#!/usr/bin/env python3
"""Class inventory for Fugu vs Not a Chef's custom.css. Prints JSON to stdout.

Usage: HITS=hits.json python3 inventory.py SITE_ROOT > inv.json
"""
import json, os, re, sys
from collections import defaultdict

SITE = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
FUGU = os.path.join(SITE, 'themes/fugu')
BLOWFISH = os.path.join(SITE, 'themes/blowfish')
WARPED = os.path.join(SITE, 'themes/hugo-warped')

CLASS_TOKEN = re.compile(r'^-?[A-Za-z_][\w-]*$')
TAILWIND = re.compile(
    r'(^|:)(-?(m|mx|my|mt|mb|ms|me|ml|mr|p|px|py|pt|pb|ps|pe|pl|pr|w|h|min-w|max-w|min-h|max-h|'
    r'gap|top|bottom|left|right|inset|space-x|space-y|z|order|basis|grow|shrink|leading|tracking|'
    r'rounded|border|text|bg|font|shadow|ring|outline|opacity|cursor|align|items|justify|content|'
    r'self|place|flex|grid|col|row|overflow|translate|scale|rotate|decoration|underline-offset|'
    r'line-clamp|aspect|object|fill|stroke|columns|indent|whitespace|break|transition|duration|ease|'
    r'appearance|backdrop|prose|not-prose)(-[\w./\[\]%-]+)?)$')
TAILWIND_WORDS = {'flex', 'grid', 'hidden', 'block', 'inline', 'inline-block', 'inline-flex', 'relative',
                  'absolute', 'fixed', 'sticky', 'static', 'grow', 'shrink', 'italic', 'uppercase',
                  'lowercase', 'capitalize', 'truncate', 'underline', 'no-underline', 'sr-only', 'group',
                  'peer', 'container', 'contents', 'table', 'visible', 'invisible', 'antialiased',
                  'appearance-none', 'shadow', 'rounded', 'border', 'prose', 'ltr', 'rtl', 'mx-auto',
                  'flex-1', 'flex-col', 'flex-row', 'flex-wrap', 'flex-none', 'max-w-full', 'w-full',
                  'h-full', 'not-prose', 'outline-none', 'select-none', 'pointer-events-none', 'transition',
                  'transform', 'list-none', 'list-disc', 'list-decimal', 'isolate', 'overflow-hidden', 'overflow-auto', 'print', 'dark'}


def is_tailwind(c):
    if ':' in c or '[' in c or '/' in c:
        return True
    if c in TAILWIND_WORDS:
        return True
    return bool(TAILWIND.match(c))


def rel(p):
    return os.path.relpath(p, SITE)


def walk(root, exts):
    for d, _, fs in os.walk(root):
        for f in sorted(fs):
            if os.path.splitext(f)[1] in exts or f.endswith('.json.json'):
                yield os.path.join(d, f)


def line_of(text, i):
    return text.count('\n', 0, i) + 1


# ---------- template extraction ----------
COMMENT = re.compile(r'\{\{-?\s*/\*.*?\*/\s*-?\}\}', re.S)
CMP_LIT = re.compile(r'\b(eq|ne|in|hasPrefix|hasSuffix|strings\.Contains)\s+(\S+\s+)?"[^"]*"')


def blank(m):
    return re.sub(r'[^\n]', ' ', m.group(0))


def template_classes(path):
    """Yield (class, line, dynamic) from class="..." attributes."""
    text = open(path, encoding='utf-8').read()
    text = COMMENT.sub(blank, text)
    out = []
    for m in re.finditer(r'\bclass=(["\'])', text):
        q = m.group(1)
        i = m.end()
        depth = 0
        j = i
        while j < len(text):
            if text.startswith('{{', j):
                depth += 1; j += 2; continue
            if text.startswith('}}', j) and depth:
                depth -= 1; j += 2; continue
            if text[j] == q and depth == 0:
                break
            # an escaped \" inside a Go string literal (class=\"...\")
            j += 1
        val = text[i:j]
        ln = line_of(text, m.start())
        out.extend((c, ln, d) for c, d in parse_value(val))
    # class names built into a variable first: {{ $class := printf "vt-name%s" (cond .x " todo" "") }}
    for m in re.finditer(r'\{\{-?\s*\$\w*[Cc]lass\w*\s*:?=([^}]*)\}\}', text):
        ln = line_of(text, m.start())
        for lit in re.findall(r'"([^"]*)"', CMP_LIT.sub('', m.group(1))):
            for w in re.sub(r'%\w', ' ', lit).split():
                if CLASS_TOKEN.match(w) or is_tailwind(w):
                    out.append((w, ln, False))
    return out


def is_value(action):
    return bool(action.startswith('{{')) and not re.match(r'\{\{-?\s*(if|else|end|with|range)\b', action)


def parse_value(val):
    """Split a class attribute value into literal and {{ }} parts."""
    parts = re.split(r'(\{\{.*?\}\})', val, flags=re.S)
    toks = []
    # literal text: whitespace-split; a word glued to an action is a dynamic prefix
    for k, p in enumerate(parts):
        if p.startswith('{{'):
            body = CMP_LIT.sub('', p)
            for lit in re.findall(r'"([^"]*)"', body):
                if '%' in lit:
                    pre = lit.split('%')[0]
                    if pre.strip():
                        toks.append((pre.strip() + '*', True))
                    continue
                for w in lit.split():
                    toks.append((w, False))
            continue
        words = re.split(r'(\s+)', p)
        for wi, w in enumerate(words):
            if not w or w.isspace():
                continue
            glued_right = wi == len(words) - 1 and k + 1 < len(parts) and is_value(parts[k + 1])
            glued_left = wi == 0 and k > 0 and is_value(parts[k - 1])
            if glued_right:
                toks.append((w + '*', True))
            elif glued_left:
                continue  # suffix of a dynamic value
            else:
                toks.append((w, False))
    return [(t, d) for t, d in toks if CLASS_TOKEN.match(t.rstrip('*')) or is_tailwind(t)]


# ---------- JS extraction ----------
STR = r'''(['"`])((?:\\.|(?!\1).)*)\1'''


def js_classes(path, markup=True):
    text = open(path, encoding='utf-8').read()
    out = []
    pats = [
        r'\.className\s*=\s*([^;\n]+)',
        r'classList\.(?:add|toggle)\(([^)]*)\)',
        r'element\(\s*\'\w+\'\s*,\s*([^)]*)\)',
        r'_CLASS\s*=\s*([^;\n]+)',
    ]
    for pat in pats:
        for m in re.finditer(pat, text):
            ln = line_of(text, m.start())
            for sm in re.finditer(STR, m.group(1)):
                for w in sm.group(2).split():
                    if CLASS_TOKEN.match(w) or is_tailwind(w):
                        out.append((w, ln, False))
    for m in (re.finditer(r'class=\\?"([^"\\]*)\\?"', text) if markup else []):
        ln = line_of(text, m.start())
        for w in re.sub(r'\$\{[^}]*\}', ' ', m.group(1)).split():
            if CLASS_TOKEN.match(w) or is_tailwind(w):
                out.append((w, ln, False))
    return out


# ---------- CSS parsing ----------
def strip_comments(css):
    return re.sub(r'/\*.*?\*/', blank, css, flags=re.S)


def parse_css(path):
    raw = open(path, encoding='utf-8').read()
    css = strip_comments(raw)
    rules = []  # dict(sel, start, end, decls, media)
    stack = []  # at-rule preludes

    def parse_block(i, media):
        n = len(css)
        buf_start = i
        while i < n:
            ch = css[i]
            if ch == '}':
                return i + 1
            if ch == '{':
                prelude = css[buf_start:i].strip()
                if prelude.startswith('@'):
                    if re.match(r'@(media|supports|layer|container|document)', prelude):
                        i = parse_block(i + 1, media + [prelude])
                    else:  # @keyframes, @font-face: skip
                        depth = 1; i += 1
                        while depth:
                            if css[i] == '{': depth += 1
                            elif css[i] == '}': depth -= 1
                            i += 1
                    buf_start = i
                    continue
                j = css.index('}', i)
                body = css[i + 1:j]
                sel_start = buf_start + (len(css[buf_start:i]) - len(css[buf_start:i].lstrip()))
                rules.append(dict(sel=' '.join(prelude.split()), start=line_of(css, sel_start),
                                  end=line_of(css, j), body=body, media=media))
                i = j + 1
                buf_start = i
                continue
            if ch == ';' and css[buf_start:i].strip().startswith('@'):
                buf_start = i + 1
            i += 1
        return i

    parse_block(0, [])
    for r in rules:
        r['decls'] = parse_decls(r['body'])
        r['classes'] = sel_classes(r['sel'])
        del r['body']
    return raw, rules


def parse_decls(body):
    out = []
    for d in re.split(r';(?![^(]*\))', body):
        if ':' not in d:
            continue
        p, v = d.split(':', 1)
        p = p.strip().lower()
        v = ' '.join(v.split())
        if p:
            out.append((p, v))
    return out


def sel_classes(sel):
    s = re.sub(r'\[[^\]]*\]', '', sel)
    s = re.sub(r'"[^"]*"|\'[^\']*\'', '', s)
    found = re.findall(r'\.((?:[\w-]|\\.)+)', s)
    return sorted({f.replace('\\', '') for f in found if not re.match(r'^\d', f)})


STRUCT = re.compile(
    r'^(display|position|top|right|bottom|left|inset.*|z-index|float|clear|flex.*|order|grid.*|align-.*|'
    r'justify-.*|place-.*|width|height|min-width|min-height|max-width|max-height|inline-size|block-size|'
    r'min-inline-size|max-inline-size|aspect-ratio|overflow.*|visibility|box-sizing|table-layout|'
    r'border-collapse|border-spacing|content|cursor|pointer-events|user-select|-webkit-user-select|'
    r'transform|translate|scale|rotate|white-space|word-break|overflow-wrap|text-overflow|hyphens|'
    r'vertical-align|appearance|-webkit-appearance|-moz-appearance|object-fit|object-position|resize|'
    r'scroll-.*|overscroll-.*|contain|isolation|columns|column-.*|will-change|break-.*|page-break-.*|'
    r'counter-.*|-webkit-line-clamp|line-clamp|-webkit-box-orient|touch-action|clip|clip-path|'
    r'table|caption-side|empty-cells|direction|unicode-bidi|writing-mode|tab-size|interpolate-size|'
    r'container.*|anchor-.*|position-.*|field-sizing|-webkit-tap-highlight-color)$')


def kind(prop):
    if prop.startswith('--'):
        return 'look'
    return 'structure' if STRUCT.match(prop) else 'look'


def main():
    # Fugu emitted classes
    emitted = defaultdict(list)  # class -> [(file, line)]
    dynamic = defaultdict(list)
    tailwind = defaultdict(list)
    for p in walk(os.path.join(FUGU, 'layouts'), {'.html', '.json', '.xml'}):
        for c, ln, dyn in template_classes(p):
            tgt = tailwind if is_tailwind(c) else (dynamic if dyn else emitted)
            tgt[c].append((rel(p), ln))
    for p in walk(os.path.join(FUGU, 'assets/js'), {'.js'}):
        for c, ln, dyn in js_classes(p):
            tgt = tailwind if is_tailwind(c) else emitted
            tgt[c].append((rel(p), ln))
    # toc.html's inline script
    for p in walk(os.path.join(FUGU, 'layouts'), {'.html'}):
        for c, ln, dyn in js_classes(p, markup=False):
            if not is_tailwind(c):
                emitted[c].append((rel(p), ln))

    # Site-owned classes (Not a Chef layouts)
    site = defaultdict(list)
    for p in walk(os.path.join(SITE, 'layouts'), {'.html'}):
        for c, ln, dyn in template_classes(p) + js_classes(p, markup=False):
            (dynamic if dyn else site)[c].append((rel(p), ln))

    # Blowfish-emitted classes
    bf = set()
    for p in walk(os.path.join(BLOWFISH, 'layouts'), {'.html'}):
        bf.update(c for c, _, _ in template_classes(p))
    for p in walk(os.path.join(BLOWFISH, 'assets/js'), {'.js'}):
        bf.update(c for c, _, _ in js_classes(p))

    # content / config mentions (raw HTML, markdown attributes)
    corpus = ''
    for root in ('content', 'config'):
        for p in walk(os.path.join(SITE, root), {'.md', '.toml', '.yaml', '.html'}):
            corpus += open(p, encoding='utf-8', errors='ignore').read()
    fugu_corpus = ''
    for p in list(walk(os.path.join(FUGU, 'layouts'), {'.html', '.json'})) + \
            list(walk(os.path.join(FUGU, 'assets/js'), {'.js'})) + \
            list(walk(os.path.join(WARPED, 'layouts'), {'.html'})):
        fugu_corpus += open(p, encoding='utf-8').read()

    raw, rules = parse_css(os.path.join(SITE, 'assets/css/custom.css'))
    _, frules = parse_css(os.path.join(FUGU, 'assets/css/fugu.css'))
    fugu_css_classes = set(c for r in frules for c in r['classes'])

    json.dump(dict(emitted=emitted, dynamic=dynamic, tailwind=tailwind, site=site, blowfish=sorted(bf),
                   rules=rules, fugu_css=sorted(fugu_css_classes),
                   custom_lines=raw.count('\n') + (0 if raw.endswith('\n') else 1),
                   corpus_hits={}, ), sys.stdout, indent=1, default=list)
    # second file: word-mention lookups for css classes
    css_classes = sorted({c for r in rules for c in r['classes']})
    hits = {c: dict(content=bool(re.search(r'(?<![\w-])' + re.escape(c) + r'(?![\w-])', corpus)),
                    fugu_text=bool(re.search(r'(?<![\w-])' + re.escape(c) + r'(?![\w-])', fugu_corpus)))
            for c in css_classes}
    json.dump(hits, open(os.environ.get('HITS', '/dev/null'), 'w'), indent=1)


if __name__ == '__main__':
    main()
```

</details>

<details>
<summary><code>report.py</code></summary>

```python
#!/usr/bin/env python3
"""Turns inventory.py's JSON into the class-inventory tables (markdown on stdout).

Usage: python3 report.py inv.json hits.json SITE/assets/css/custom.css > tables.md
"""
import json, re, sys
from collections import defaultdict, Counter

sys.path.insert(0, __file__.rsplit('/', 1)[0])
from inventory import kind, is_tailwind  # noqa: E402

d = json.load(open(sys.argv[1]))
hits = json.load(open(sys.argv[2]))
emitted = {k: v for k, v in d['emitted'].items()}
site = d['site']
bf = set(d['blowfish'])
fugu_css = set(d['fugu_css'])
rules = d['rules']

# Dynamic class patterns: expand against the CSS.
css_classes = sorted({c for r in rules for c in r['classes']})
DYN = {
    'formula-*': (r'^formula-(?!row$)', 'render-codeblock-formula.html: formula-{{ $variant }}'),
    'pop-*': (r'^pop-(principle|method|dev|glossary)$', 'concept/pop.html: pop-{{ .kind }}'),
    'principle-*': (r'^principle-(?!(chip|intro|layout|page)$)', 'term.html, principle-chip.html: principle-<slug>'),
    'r*': (r'^r\d+$', 'blueprint/lineage.html: r{{ .row }}'),
}
dyn_note = {}
for pat, (rx, note) in DYN.items():
    src = d['dynamic'].get(pat, [])
    for c in css_classes:
        if re.match(rx, c) and c not in emitted:
            emitted[c] = src
            dyn_note[c] = 'dynamic, ' + note

blowfish_copied = {c for c in emitted if c in bf}

AREAS = [
    ('Recipe page and ingredients', r'^(ing($|-)|qty$|temp$|mono$|sub$|table-scroll$|is-stacked$|is-current$|ing-subhead$)'),
    ('Sidebar and automagic sidebar', r'^(recipe-sidebar|recipe-meta|mechanic|notes-list|photo|pv-|page-photo|sidebar-photos|is-relocated|is-single|is-open|solo$|n[123]$|more$|toc|bf-scrollbar|overscroll-contain$|active$)'),
    ('Reading sidebar', r'^(reading-sidebar|rs-)'),
    ('Chips, tags and popovers', r'^(tag|tags-row|.*-chip($|-)|pop($|-)|cuisine-chip|is-icon$)'),
    ('Formula, stack and flow diagrams', r'^(f-|formula|stack|flow|headed$|ic($|-)|op$|slot$)'),
    ('Blueprint, methods and lineage', r'^(blueprint|bp($|-)|build-|method-|part-|parts|opt-pill|lbl$|go$|y$|vt($|-)|tl-|timeline$|ln-dot$|hist$|todo$|alt$|r\d+$)'),
    ('Glossary', r'^(gl-|glossary|also$|used|is-empty$)'),
    ('Test kitchen (drafts)', r'^(dev-|development-)'),
    ('Search', r'^(search-box|listing-search)$'),
    ('Cards and lists', r'^(rcard|has-formula|has-glass|rgrid|listing|ltitle|browse-|list-pagination|article-pagination|related-|subsection-|section-caveat|pin-icon|n$|block-title$|principle-|read-essay$)'),
    ('Misc (links, headings, images)', r'.'),
]
# Food Log has no classes of its own: say so in the doc. Its templates use listing/ltitle/rgrid/n.
area_of = {}
for c in emitted:
    for name, rx in AREAS:
        if re.match(rx, c):
            area_of[c] = name
            break


GENERIC = {'article-content', 'n', 'more', 'sub', 'active', 'mono', 'y', 'alt', 'hist', 'todo', 'solo', 'op',
           'slot', 'ic', 'lbl', 'go', 'is-open', 'is-current', 'is-empty', 'is-icon', 'is-relocated', 'is-single',
           'is-stacked', 'nozoom', 'anchor', 'toc'}
SITE_ONLY_PREFIX = ('home-', 'site-', 'mega-', 'drawer-', 'hero', 'foot-', 'term-', 'terminal-', 'error-404', 'tt-',
                    'theme-toggle', 'nav-', 'filter-', 'block-', 'brand-', 'mobile-drawer', 'parts-inline', 'search-row',
                    'lede', 'opts', 'is-home')


def is_site_only(c):
    return (c in site and c not in emitted) or c.startswith(SITE_ONLY_PREFIX) and c not in emitted


def first_fugu_class(r):
    if any(is_site_only(c) for c in r['classes']):
        return None
    order = []
    for sel in r['sel'].split(','):
        for o in re.findall(r'\.((?:[\w-]|\\.)+)', re.sub(r'\[[^\]]*\]', '', sel)):
            o = o.replace('\\', '')
            if o in emitted and not is_tailwind(o) and o not in order:
                order.append(o)
    for o in order:
        if o not in GENERIC:
            return o
    return order[0] if order else None


# site tokens: custom properties declared in custom.css
site_tokens = set()
for r in rules:
    for p, v in r['decls']:
        if p.startswith('--') and not p.startswith('--fugu-') and not p.startswith('--color-'):
            site_tokens.add(p)

# classify each rule
for r in rules:
    fc = first_fugu_class(r)
    r['fugu'] = fc
    r['area'] = area_of.get(fc) if fc else None
    sc = [c for c in r['classes'] if c in site]
    if not fc:
        if any(is_site_only(c) for c in r['classes']):
            r['area'] = 'site'
        elif not r['classes'] or all(c in bf or is_tailwind(c) for c in r['classes']):
            r['area'] = 'global'
        else:
            r['area'] = 'dead'
    ks = Counter(kind(p) for p, _ in r['decls'])
    r['nstruct'], r['nlook'] = ks['structure'], ks['look']
    r['split'] = 'both' if ks['structure'] and ks['look'] else ('structure' if ks['structure'] else 'look')
    r['lines'] = r['end'] - r['start'] + 1
    r['tokens'] = sorted({t for _, v in r['decls'] for t in re.findall(r'var\((--[\w-]+)', v) if t in site_tokens})
    r['important'] = any('!important' in v for _, v in r['decls'])
    r['fonts'] = [v for p, v in r['decls'] if p in ('font-family', 'font') and not v.startswith('var(')
                  and re.search(r'[A-Za-z]{3,}', v) and p == 'font-family' or (p == 'font' and re.search(r'"|serif|sans|mono', v) and 'var(' not in v)]

# per-class rows
by_class = defaultdict(list)
for r in rules:
    for c in r['classes']:
        by_class[c].append(r)


def where(c):
    seen = []
    for f, ln in emitted.get(c, []):
        f = f.replace('themes/fugu/', '')
        if all(s[0] != f for s in seen):
            seen.append((f, ln))
    out = ', '.join(f'`{f.split("/", 1)[1] if f.startswith("layouts/") else f}`:{ln}' for f, ln in seen[:2])
    if len(seen) > 2:
        out += f' (+{len(seen) - 2})'
    return out


def ranges(lines):
    lines = sorted(set(lines))
    out = []
    for n in lines:
        if out and n - out[-1][1] <= 1:
            out[-1][1] = n
        else:
            out.append([n, n])
    return ', '.join(f'{a}' if a == b else f'{a}–{b}' for a, b in out)


def row(c):
    rs = by_class.get(c, [])
    lines = []
    for r in rs:
        lines.extend([r['start']])
    splits = {r['split'] for r in rs}
    split = '' if not rs else ('both' if 'both' in splits or len(splits) > 1 else splits.pop())
    notes = []
    if c in dyn_note:
        notes.append(dyn_note[c])
    if c in blowfish_copied:
        notes.append('Blowfish class')
    if c in site:
        notes.append('also emitted by the site')
    toks = sorted({t for r in rs for t in r['tokens']})
    if toks:
        notes.append('site tokens ' + ' '.join(f'`{t}`' for t in toks[:4]) + (' …' if len(toks) > 4 else ''))
    if any(r['important'] for r in rs):
        notes.append('`!important`')
    if any(r['fonts'] for r in rs):
        notes.append('hardcoded font')
    if rs and all(r['media'] for r in rs):
        notes.append('only under @media')
    if not rs:
        notes.append('unstyled')
    return (f'| `{c}` | {where(c)} | {ranges(lines) or "–"} | {"yes" if c in fugu_css else "no"} | '
            f'{split or "–"} | {"; ".join(notes)} |')


out = []
area_names = [a for a, _ in AREAS]
counts = {}
for a in area_names:
    cs = sorted(c for c in emitted if area_of.get(c) == a and not is_tailwind(c))
    counts[a] = cs
    out.append(f'\n### {a}\n\n{len(cs)} classes.\n')
    out.append('| Class | Fugu emits it in | custom.css rules (start lines) | fugu.css | Split | Notes |')
    out.append('|---|---|---|---|---|---|')
    out.extend(row(c) for c in cs)

unstyled = sorted(c for c in emitted if c not in by_class and not is_tailwind(c))
site_only = sorted(c for c in css_classes if is_site_only(c))
other = sorted(c for c in css_classes if c not in emitted and c not in site_only)
bf_styled = [c for c in other if c in bf or is_tailwind(c)]
content_styled = []  # content carries no class attributes (only {.article} on headings)
dead = [c for c in other if c not in bf_styled and c not in content_styled]

out.append('\n## UNSTYLED\n' + ', '.join(f'`{c}`' for c in unstyled) + f' ({len(unstyled)})')
out.append('\n## SITE-ONLY\n' + ', '.join(f'`{c}`' for c in site_only) + f' ({len(site_only)})')
out.append('\n## BLOWFISH/TAILWIND styled\n' + ', '.join(f'`{c}`' for c in bf_styled) + f' ({len(bf_styled)})')
out.append('\n## CONTENT\n' + ', '.join(f'`{c}`' for c in content_styled))
out.append('\n## DEAD\n' + '\n'.join(f'- `{c}`: ' + ranges([r['start'] for r in by_class[c]]) + (' (fugu text mention)' if hits[c]['fugu_text'] else '') for c in dead) + f'\n({len(dead)})')

# totals
out.append('\n## TOTALS')
tot = defaultdict(lambda: Counter())
for r in rules:
    a = r['area']
    t = tot[a]
    t['rules'] += 1
    t['lines'] += r['lines']
    t['decl_s'] += r['nstruct']
    t['decl_l'] += r['nlook']
    n = r['nstruct'] + r['nlook'] or 1
    t['lines_s'] += r['lines'] * r['nstruct'] / n
    t['lines_l'] += r['lines'] * r['nlook'] / n
    t['r_' + r['split']] += 1
out.append('| Area | Classes | Rules | Rule lines | Struct decls | Look decls | ~Struct lines | ~Look lines | Rules S/L/both |')
for a in area_names + ['site', 'global', 'dead']:
    t = tot[a]
    out.append(f"| {a} | {len(counts.get(a, []))} | {t['rules']} | {t['lines']} | {t['decl_s']} | {t['decl_l']} | "
               f"{round(t['lines_s'])} | {round(t['lines_l'])} | {t['r_structure']}/{t['r_look']}/{t['r_both']} |")
fug = Counter()
for a in area_names:
    fug.update(tot[a])
out.append(f"FUGU TOTAL rules {fug['rules']} lines {fug['lines']} S {fug['decl_s']} L {fug['decl_l']} "
           f"~S {round(fug['lines_s'])} ~L {round(fug['lines_l'])} r {fug['r_structure']}/{fug['r_look']}/{fug['r_both']}")
alllines = sum(r['lines'] for r in rules)
out.append(f"rule lines total {alllines} of {d['custom_lines']}")
out.append(f"emitted (non-tailwind) {len([c for c in emitted if not is_tailwind(c)])}, tailwind {len(d['tailwind'])}, blowfish-copied {sorted(blowfish_copied)}")

# hard cases
out.append('\n## HARD')
mixed = [r for r in rules if r['fugu'] and r['split'] == 'both']
out.append(f'mixed fugu rules: {len(mixed)}; biggest:')
for r in sorted(mixed, key=lambda r: -(r['nstruct'] + r['nlook']))[:12]:
    out.append(f"  {r['start']}: {r['sel'][:90]} S{r['nstruct']} L{r['nlook']}")
tokrules = [r for r in rules if r['fugu'] and r['tokens']]
tc = Counter(t for r in tokrules for t in r['tokens'])
out.append(f'fugu rules using site tokens: {len(tokrules)} of {fug["rules"]}; tokens: {tc.most_common(40)}')
out.append(f'site tokens defined: {len(site_tokens)}')
for r in rules:
    if r['fonts']:
        out.append(f"  font {r['start']} [{r['area']}]: {r['sel'][:70]} -> {r['fonts']}")
for r in rules:
    if r['important']:
        out.append(f"  important {r['start']} [{r['area']}]: {r['sel'][:90]}")
for r in rules:
    over = [c for c in r['classes'] if (c in bf or is_tailwind(c)) and c not in emitted]
    if over and r['area'] not in ('site',):
        out.append(f"  bf-override {r['start']} [{r['area']}]: {r['sel'][:90]} :: {over}")
# line accounting
raw = open(sys.argv[3]).read().split('\n')
cover = {}
for r in rules:
    for n in range(r['start'], r['end'] + 1):
        cover.setdefault(n, r['area'])
import collections
cat = collections.Counter(cover.values())
out.append('UNIQUE LINES by area: ' + str(dict(cat)) + ' total ' + str(len(cover)))
incomment = False
cm = blank_ = 0
for i, l in enumerate(raw, 1):
    if i in cover:
        continue
    if not l.strip():
        blank_ += 1
    else:
        cm += 1
out.append(f'uncovered nonblank {cm} blank {blank_} of {len(raw)}')
print('\n'.join(out))
```

</details>
