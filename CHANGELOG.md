# Changelog

Notable changes to Fugu, newest first. Versions follow [semantic versioning](https://semver.org); until `v1.0.0`, a minor version can change how a site renders or what it has to configure. Each release is a git tag (`v0.1.0`, …). PLAN.md §10 says when the first one lands.

## Unreleased

### Added

- Drafts as pages that are published but still changing, for a site that builds drafts. `[params.fugu.development]` sets the words (`label`, `message`, `hover`, `note`, `more`, `empty`), an optional icon (`icon`, an SVG in the site's assets, inlined; a dot otherwise), and the page that explains drafts (`page`). A draft gets a banner above its title (`partials/development/banner.html`, `.dev-strip`), and on its card a chip that leads the top row and takes a slot, with a hover/focus popover (`development/mark.html`, `.dev-mark`, `.dev-chip`, `.dev-pop`). A page's `working_on` frontmatter shows under the banner and in the popover. The `page` lists every draft after its own text (`development/list.html`, `.development-list`). The defaults say "In development".
- `working_on` in `recipes/index.json`.

- Personal notes: `params.fugu.hideIntroQuotes` (default `true`) hides blockquotes in a recipe's intro, and `params.fugu.headings.hidden` (default `["History"]`) hides whole sections; `false` and `[]` turn them off. This only hides the text from readers: it's still in the HTML, the search index, and the RSS feed.
- `[params.fugu.headings]`: the `##` titles that mean `method`, `mechanic`, `to-serve`, `variations`, `notes`, `equipment`, and `hidden` (lists of whole titles, any case), plus `notIngredients`, the words that keep a recipe heading from being read as an ingredient section. The defaults are the old fixed names, so a site writing in English with Fugu's section names sets nothing.
- Principle tags work for any tag whose `content/tags/<slug>/_index.md` sets `principle: true`, not just `win-the-fridge`. Its essay is the page named by `essay` there, else the reference essay carrying the tag; its chip on recipe cards reads `short`, else the tag's title. Sites that relied on the card's old "WTF" label set `short: WTF`.
- `params.fugu.referenceEssays` (default `reference-essays`, a folder in the essay section) and `params.fugu.glossaryPage` (default `glossary`, a page in the reference section): where `[[wiki links]]` find glossary terms. `""` turns either off.
- `params.fugu.recipeSidebar`: the recipe sidebar's section boxes, in order (`photos`, `to-serve`, `mechanic`, `variations`, `equipment`, `notes`). A key left out keeps that section in the article; an unknown key warns. The default is the old fixed order, so a site that doesn't set it renders the same.
- Formula strip on recipe cards: a page with a ```` ```formula ```` block shows its icons and operators (and a ratio's numbers) as a small row under the card's intro, with each ingredient's label, quantity, and swaps in a hover tooltip (`partials/formula-strip.html`). Cards with a strip get `.has-formula`; the site styles `.rcard-formula`, `.rcard-formula-link` and `.slot`.
- `tools/compare-builds.py`, later: fingerprinted bundle names (`main.bundle.min.<hash>.css`) and integrity hashes are ignored when comparing, and the renamed bundle is diffed as one file, so a CSS change shows up once instead of on every page.
- `tools/compare-builds.py`: builds a site with Fugu at a git ref and with the working tree, and lists every file that differs (whitespace ignored), so a theme change can't alter a site by accident.
- Fixture sites in `tests/sites/` (`recipes-only` and `everything`) and a GitHub Actions job that builds both with `--panicOnWarning` against Hugo 0.161.1 and Blowfish `e9699d8`.
- `tests/check.py`: builds every fixture site and checks its pages against its `expect.txt`; `--compare` also runs `compare-builds.py`. CI runs it. A third fixture, `renamed`, moves every section to a new name and is expected to fail until the templates read section names from config.
- `--help` for every tool, including `add-image.sh`.
- A scope statement in the README: only recipes are required.

### Changed

- The draft badge in the meta row (`.draft-badge`) is gone; a draft's banner replaces it. `site.Params.article.showDraftLabel` now turns the banner on and off.

- The recipe scale/units menu: units are one row of segment buttons (with `aria-pressed`) instead of wrapping buttons, the scale value sits beside the "Scale" label, whole steps 1–5 are labelled under the slider, a yield line ("Serves 4–6 · 9 patties") follows the scale, Escape closes the menu, and the slider sets `--fill` for a filled track. New classes for a site to style: `.ing-config-head`, `.ing-scale-range`, `.ing-scale-ticks` (current step: `.is-current`), `.ing-yield`, `.ing-units`; `.ing-config-row` and `.ing-scale-slider` are gone.
- The sidebar's Serves row now scales ranges ("3–4") and numbers leading words ("9 burgers"), not only bare numbers, and Makes scales too. The `recipe:scale` event carries the scaled `servings` and `portions`. The Makes row gets `id="recipe-meta-portions"` and `data-portions-base`.
- "The cookbook in numbers" on About only shows when the page's frontmatter says `stats: true`, and leaves out the cuisine, essay, and reference counts when the site has no such taxonomy or section. Sites that showed it set `stats: true` on their About page. The Food Log's one-month "older entries aren't here yet" note, Not a Chef's, is gone.
- Built and tested against Blowfish `295dae3` (2026-09-13) and Hugo 0.166.0, up from Blowfish `e9699d8` and Hugo 0.161.1; `min_version` is now 0.163.0, Blowfish's minimum. Fugu's copies of Blowfish's `single.html`, `head.html`, `toc.html`, `article-meta/basic.html`, and `search.js` take that release's changes: deferred image zoom with its new setup script, reading progress, the comments partial, accessible labels on the table of contents, Cmd/Ctrl+K and focus handling in search, and badges for custom taxonomies.
- The templates read the section names from `[params.fugu]` too, so a site can call its sections anything (`dishes`, `writing`, ...). The list layouts are still found by folder (`layouts/recipes/`, `essays/`, `reference/`, `the-food-log/`), so a renamed section's `_index.md` sets `type` to the default name, e.g. `type: recipes`, to get them (and, for recipes, the `index.json` output).
- `frontmatter.py` and `drafts.py` find the recipe, essay, reference, and log folders from the site's `[params.fugu]` (`recipeSection`, `essaySection`, `referenceSection`, `logSection`; `""` turns one off), with defaults in Fugu's new `hugo.toml`.
- `layouts/404.html` is gone. It was Not a Chef's text adventure and now lives in that site; other sites get Blowfish's 404.
- Header comments in every override now say what changed from Blowfish's copy and why, and comments no longer point at Not a Chef's mockups or its old plan.

### Fixed

- Swiping between photos in the photo viewer works on iOS. Safari took a sideways swipe as scrolling and cancelled it, and a swipe that ended off the photo closed the viewer.

## 2026-10-06: split from Not a Chef

Templates, render hooks, JS, formula icons, archetypes, and the content tools moved out of [Not a Chef](https://github.com/robotpony/not-a-chef) into this repo, unchanged. Not a Chef uses it as a git submodule at `themes/fugu`.
