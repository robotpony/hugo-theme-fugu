# Plan

Fugu is a cookbook theme for Blowfish, split out of Not a Chef (https://github.com/robotpony/not-a-chef) on 2026-10-06. Today it still assumes that site's section names, content, and CSS. This plan takes it from there to a theme other Blowfish users can install. Each item says what it is, why, and roughly how, so it can be picked up cold.

Work through the sections roughly in order: the early ones remove Not a Chef assumptions that the later ones (docs, example site, release) depend on.

**The one rule while doing any of this:** Not a Chef must keep rendering exactly as it does now, unless a change is meant to alter it. See CLAUDE.md for how to check.

## 1. Housekeeping

Start with the two checks: everything after this changes templates, and catching a regression on the change that caused it is much cheaper than finding it later.

- [x] A build-compare script, `tools/compare-builds.py` (stdlib only): build the site at two points (or take two build folders), compare every file with whitespace stripped, and list the files that differ, with a short diff for each. This is the check "the one rule" asks for; today it gets rewritten for each change. Mention it in CLAUDE.md. *Done 2026-10-07: builds Fugu at a git ref (default `HEAD`) against the working tree, or compares two folders; groups pages with the same diff.*
- [x] Fixture sites under `tests/sites/`: recipes-only (just `tags`, no `cuisine`) and everything-on. Add a minimal GitHub Actions job now that builds both with `hugo --panicOnWarning` at the pinned Hugo and Blowfish versions. §3 makes the recipes-only site pass; until then, mark that job as allowed to fail, so §2's changes show progress without blocking. §9 extends the same workflow. *Done 2026-10-07: `.github/workflows/build.yml`, Hugo 0.161.1 (the top of Blowfish `e9699d8`'s range) and Blowfish `e9699d8`. The recipes-only site already builds without warnings, so neither job is allowed to fail; §3 is about what it renders, not whether it builds.*
- [x] Clear Not a Chef out of comments and copy. 18 files still point at `mockups/STYLE.md` or name the site (`git grep -e mockups/ -e STYLE.md -e "Not a Chef"`). Where a comment explains a design decision, keep the reason and drop the pointer. Check `layouts/404.html`'s text too: it's a site joke, and may belong in Not a Chef's own layouts. *Done 2026-10-07: the mockup and `STYLE.md` pointers are gone, keeping the reasons; comments that described Not a Chef's config as the theme's now name the param. `404.html` (the basement text adventure) moved to Not a Chef's own layouts, so other sites get Blowfish's 404. Comments naming `custom.css` stay until §5 moves that CSS into Fugu.*
- [ ] Comments that point at Not a Chef docs (`FORMAT.md`, `SPEC.md`, `DESIGN.md`) should point at Fugu's docs once those exist (§7). Until then, leave them.
- [x] Comments that cite `PLAN.md` by section number (e.g. `ingredients.js:10`, "See PLAN.md 6.2b") mean Not a Chef's old phased plan, squashed after release. Fugu now has its own PLAN.md with different numbering, so these mislead today; don't wait for §7. Replace each with the reason it pointed at, or with a Not a Chef commit if the history matters. About 29 doc pointers in all (`git grep -e PLAN.md -e SPEC.md -e DESIGN.md -e FORMAT -- layouts assets tools`). *Done 2026-10-07: there were 7 `PLAN.md` citations (the rest of the ~29 point at `SPEC.md`, `DESIGN.md`, and `FORMAT`, and wait for §7 per the item above); each now gives its reason or, where the reason was already beside it, just drops the pointer.*
- [ ] Fix `_default/single.html`'s header comment. It says the only change from Blowfish's copy is the body content render, but about 218 diff lines differ (it also loads `automagic-sidebar.js` and `ingredients.js`, adds the recipe notes, and more). Rewrite it to list what actually changed and why.
- [ ] Check every override's header against a real diff. For each of the 13 files Fugu copies from Blowfish (§6), diff it against Blowfish at `e9699d8` and make sure the header says what changed and why. These headers become `docs/blowfish.md` (§6), so they need to be right first.
- [ ] Add the missing header comments: `partials/head.html` (a full Blowfish override, about 21 lines changed, with no header) and `recipes/list.json.json` (builds the recipe index, with no header). Every template and JS file should open with one, per CLAUDE.md.
- [ ] Fix the tool help text. `frontmatter.py --help` and `drafts.py --help` cut the description off mid-sentence ("…across content/recipes,") because argparse takes only the docstring's first line; pass the full description, or a one-line summary that stands on its own. Give `drafts.py --json` a help string. Every tool should explain itself with `--help` alone.
- [ ] Write the README's scope statement: a general cookbook theme where only recipes are required, and essays, reference pages, a dated log, `cuisine`, the glossary, and principle tags are each optional.
- [ ] Add a `CHANGELOG.md` and start tagging versions (see §10 for when `v0.1.0` lands).

## 2. Configuration instead of hardcoded names

Everything below is written directly into templates today. Move it into one params block, e.g. `[params.fugu]`, with defaults in a theme-level `hugo.toml` so a site sets only what differs. When a param is renamed (e.g. `params.recipe.enableKelvin`), change Not a Chef's config in the same step.

- [ ] Section names. `"recipes"` is hardcoded in `_default/single.html` (5 places), `_default/term.html`, `_markup/render-heading.html`, `partials/page-description.html`, and `partials/reading-sidebar.html`. `"essays"`, `"reference"`, and `"the-food-log"` are hardcoded in `reading-sidebar.html`, `recipe-card.html`, `sidebar/kind.html`, `sidebar/date-rows.html`, `term.html`, `page-description.html`, `_markup/render-link.html`, `essays/list.html`, `reference/list.html`, and `reading-sidebar/log-month.html`. Suggested params: `recipeSection`, `essaySection`, `referenceSection`, `logSection`, each empty to turn the section off.
- [ ] The content tools hardcode the same names: `tools/frontmatter.py` (the `recipes` check at line 302, the section loop at line 324, the docstring) and `tools/drafts.py` (its labels and docstring). Have them read the section params from the site's config (`hugo config --format json` if Hugo is installed, else parse `hugo.toml`/`config/_default/`), falling back to the defaults.
- [ ] The section list templates (`layouts/recipes/`, including `list.json.json`, which builds the recipe index; `layouts/essays/`, `layouts/reference/`, `layouts/the-food-log/`) are found by folder name, so a site with different section names won't get them. Move them to layouts selected by `type` (or a cascade in the site's section `_index.md`) and document it.
- [ ] Principle tags. `partials/principle-chip.html` and `recipe-card.html` hardcode `win-the-fridge`. The tag's own `content/tags/<slug>/_index.md` already says `principle: true`; read that instead, so any site can have principle tags. The tag's essay is hardcoded too: `term.html` (lines 42 and 59) and `principle-chip.html` (line 42) look up `/essays/reference-essays/win-the-fridge`. Let the tag's `_index.md` name its essay (e.g. `essay: essays/reference-essays/win-the-fridge`), or find the reference essay carrying that tag.
- [ ] Hidden personal notes. `ingredients.js` hides family-history blocks client-side: `hideFamilyHistory` hides blockquotes before a recipe's first H2, and `hideHistorySections` hides a `## History` section (flagged by `render-heading.html` with `data-hide-heading`). Generalize this into one "personal notes" feature: a configurable list of hidden heading names (default `History`), a toggle for the intro blockquotes, and a way to turn it off. Rename the functions and the comments to match. Document that this only hides text visually: it is still in the HTML and in the search index (`_default/index.json` includes `.Plain`), and possibly the RSS feed, so it isn't private. Real privacy would mean leaving the text out of the build, which is a separate option to consider.
- [ ] Glossary. `_markup/render-link.html` looks for `/reference/glossary` and treats `essays/reference-essays/` as the reference-essay folder. Make both params.
- [ ] Reading sidebar labels and stats ("The cookbook in numbers", "Start here", "Months") are Not a Chef features; make each one optional.
- [ ] Recipe frontmatter fields the templates read (`servings`, `portions`, `prep_time`, `cook_time`, `total_time`, `source`, `cuisine`, `pinned`, `start_here`, `summary`) are fine as a fixed schema, but list them in the docs (§7).
- [ ] Make the section heading names configurable, with today's names as the defaults. Decided 2026-10-07. They're matched in templates, not JS: `render-heading.html` (the `$nonIngredientKeywords` and method-heading lists) and `partials/sidebar/heading-slot.html` (heading name → sidebar slot: Mechanic, To serve, Variations, Notes, Equipment and its aliases). The JS works from the slots and classes those templates emit. Suggested shape: a map from role to the heading names that mean it, e.g. `[params.fugu.headings] mechanic = ["Mechanic"]`, `equipment = ["Equipment", "Special equipment", "Hardware"]`, `method = [...]`, plus the list of headings that aren't ingredient sections. Not a Chef sets nothing and renders the same. This is also how §4 handles headings: a site in another language sets its own names.

## 3. Optional parts

- [ ] A site with only a `recipes` section and only the `tags` taxonomy must build with no errors or warnings and no broken links. Today `cuisine` is assumed in `recipe-card.html`, `list.json.json`, and `related.html`.
- [ ] Accept `cuisine` as a list as well as a string. `recipe-card.html` calls `lower` on it and fails the build on `cuisine: [Thai]` (found by the fixtures, 2026-10-07). Not a Chef's `FORMAT.md` says string, but Hugo taxonomies are lists, and other sites will write them that way.
- [ ] Each optional part (essays, reference, log, glossary, principle tags, `cuisine`) turns off cleanly: no empty sidebar blocks, no dead nav, no zero counts.
- [ ] The recipes-only fixture (§1) builds clean in CI; drop its allowed-to-fail flag.

## 4. Translation

- [ ] Move English text in templates to `i18n/en.yaml`. Found so far: `single.html` ("Recipe notes"), `term.html` ("Definition", "Recipes that follow this principle", the "N recipes" count, "Reference"/"Essay"), `reading-sidebar.html` ("On this page", "Months", "The cookbook in numbers", "Start here", "Recipes in this guide/essay", "Essays", "Reference guides"), `toc.html` ("Jump to"), `essays/list.html` (the "essay/essays" count). Use Hugo's plural forms for counts.
- [ ] JS strings: `ingredients.js` ("Scale recipe", "As written", "Metric", "Imperial", aria labels) and `automagic-sidebar.js` (photo viewer labels, "Jump to it in the text →"). Pass them in from the template (a `data-` attribute or a small JSON block built from `i18n`) rather than translating in JS.
- [ ] Unit conversion assumes English unit words (cups, tbsp, "about"). Note that in the docs; supporting other languages' units is out of scope for 1.0.

## 5. Default design

Fugu has no CSS of its own yet. Every class its templates use is styled by Not a Chef's `assets/css/custom.css` (1,553 lines), so Fugu on its own renders unstyled.

- [ ] Inventory the classes Fugu's templates and JS emit, and find their rules in Not a Chef's `custom.css`. Split them into structure (layout, sidebar placement, the formula row, popovers, check-off states) and look (colours, fonts, spacing scale, borders).
- [ ] Move the structural CSS into Fugu as its own stylesheet, loaded from `head.html`. Blowfish only bundles a site's `assets/css/custom.css`, so Fugu's file needs a different name and its own `resources.Get` in `head.html`, loaded before `custom.css` so sites still win.
- [ ] Express the look through CSS custom properties (`--fugu-*`) that default to Blowfish's scheme colours (`--color-primary-*`, `--color-neutral-*`), so Fugu matches whichever Blowfish scheme a site picks.
- [ ] Design Fugu's own neutral look (this is a design task, not just extraction: mock it first).
- [ ] Not a Chef then keeps only its look in `custom.css`. Update the template and JS comments that say a rule lives in `custom.css` (`git grep custom.css -- layouts assets`) to name Fugu's stylesheet where the rule moved. Check it renders the same before and after.
- [ ] Fonts: `partials/fonts.html` is the hook (empty by default). Document it, and consider a `fonts` param for the simple Google Fonts case plus a self-hosting recipe.
- [ ] Formula icon kit rules (stroke, grid, size) live in Not a Chef's `mockups/STYLE.md` ("Formula diagram"); copy them into Fugu's docs so new icons can be drawn without that repo.

## 6. Blowfish compatibility

Fugu overrides 13 Blowfish files (14 until 2026-10-07, when `404.html` moved to Not a Chef): `_default/single.html`, `_default/term.html`, `_default/terms.html`, `_default/index.json`, `_default/_markup/render-heading.html`, `render-image.html`, `render-link.html`, `partials/head.html`, `partials/article-meta/basic.html`, `partials/article-pagination.html`, `partials/pagination.html`, `partials/related.html`, `partials/toc.html`. Each is a full copy, so a Blowfish update can break it without any error. Fugu also replaces one Blowfish asset, `assets/js/search.js`, with the same risk; count it with the templates in everything below.

- [ ] Write `docs/blowfish.md`: for each overridden file, what Fugu changes and why, and the Blowfish version it was copied from (the submodule was at `e9699d8`, May 2026).
- [ ] List the Blowfish params Fugu ignores or uses differently (e.g. `article.relatedContentLimit` must be set when related content is on, or `related.html` fails the build; `footer.showAppearanceSwitcher` controls a header toggle; homepage `layout`; `bg-neutral` resolving to white in every scheme). Not a Chef's `config/_default/params.toml` comments have most of these.
- [ ] Where Blowfish offers a hook (`extend-head.html`, `extend-footer.html`, etc.), prefer it over a full override, and shrink overrides where possible.
- [ ] Pin the supported Blowfish version: a `go.mod` for Hugo modules (`module github.com/robotpony/hugo-theme-fugu`, requiring Blowfish's module), and the same version in CI.
- [ ] Pick the install method. The README installs Fugu and Blowfish as git submodules; the `go.mod` above implies Hugo modules. Either support both and document both, or choose one and make the README, docs, and example site agree.
- [ ] Settle the Hugo version. `theme.toml` says `min_version = "0.158.0"` (Blowfish's minimum) but notes Fugu hasn't been tested below 0.166. Test the lower bound or raise `min_version`, and use the same version in CI. Found 2026-10-07: Blowfish `e9699d8` declares Hugo 0.158.0–0.161.1, so Not a Chef's Hugo 0.166 warns on every build and can't use `--panicOnWarning`. Blowfish's `main` (`295dae3`, 2026-09-13) declares 0.163.0–0.166.0, so moving to it fixes that and raises the floor. Not a Chef builds clean on 0.161.1, but its output differs from 0.166 in more than the generator tag: reading times on recipe cards drop by a minute on some pages (Hugo changed its word count), so compare builds on one Hugo version only. CI pins 0.161.1 for now; move Hugo and Blowfish together.
- [ ] An upgrade checklist: diff each overridden file against the new Blowfish version, rebuild the fixtures and the example site.

## 7. Docs

Not a Chef's docs describe Fugu's features but are written for that one site. Make Fugu's own, under `docs/`, site-neutral:

- [ ] `docs/recipe-format.md`, from Not a Chef's `FORMAT.md`: frontmatter, sections, multi-component recipes, wiki links, formula blocks. Its house style (Canadian English, metric first) becomes a suggestion, not a rule.
- [ ] `docs/essay-format.md` from `FORMAT-ESSAYS.md`, if essays stay a supported section.
- [ ] `docs/README.md`: an index of the docs, one line each, so the README can link one place.
- [ ] `docs/getting-started.md`: from an empty Blowfish site to one working recipe page, end to end: install, the minimum config, a first recipe file, what you should see, and where to go next. Today there's no way to do this without reading Not a Chef's `FORMAT.md`.
- [ ] `docs/configuration.md`: every `[params.fugu]` setting (§2), including the heading-name map, the optional parts (§3), personal notes, and which Blowfish params matter.
- [ ] `docs/frontmatter.md` (or a section of `recipe-format.md`): every field the templates read (§2's list), its type, and what it changes on the page.
- [ ] `docs/customizing.md`: the three layers (site → Fugu → Blowfish), overriding partials, the CSS custom properties (§5), fonts.
- [ ] `docs/features.md`: scaling and unit conversion, ingredient check-off, formula diagrams and the icon kit, wiki links and the glossary, pinned pages, principle tags, the reading and recipe sidebars, `index.json`.
- [ ] `docs/tools.md`: `frontmatter.py`, `drafts.py`, `add-image.sh` (needs ImageMagick 7's `magick` and `exiftool`), `$FUGU_SITE_ROOT`.
- [ ] README: short, with install, quick start, a screenshot, and links into `docs/`. Replace the "What it adds" list, which is the only feature description today, with a short summary linking to `docs/features.md`.

## 8. Tooling

- [ ] Claude Code commands as an optional bundle in `claude/commands/` (not `.claude/`, so they don't load in this repo by accident): `/recipe-new`, `/lint`, `/image-add` from Not a Chef's `.claude/commands/`, made site-neutral. Document copying them into a site's `.claude/commands/`.
- [ ] Tests for the Python tools (stdlib `unittest`, run in CI) against the fixture sites.
- [ ] `add-image.sh` calls `magick` and `exiftool` without checking for them; fail early with a clear message when one is missing.
- [ ] A `Makefile` or script entry point is optional; plain `python3 themes/fugu/tools/<tool>.py` is fine.

## 9. Example site and CI

- [ ] `exampleSite/` with 6–10 recipes from Not a Chef (CC BY-SA 4.0 allows it; credit and link the licence; the content needs its own `exampleSite/LICENSE`, since the repo is MIT): a simple recipe, a multi-component one, one with a Mechanic, one with a formula block, plus an essay, a reference page, and a glossary entry if those ship.
- [ ] Extend the §1 GitHub Actions workflow: build `exampleSite/` and the fixtures with the pinned Hugo and Blowfish versions, `--panicOnWarning`, and run the tool tests.
- [ ] A link check over the built example site.

## 10. Release

- [ ] Basic styles that demo well with Blowfish, before the first release: a small Fugu stylesheet that makes the recipe page, cards, sidebar, and formula diagrams look good under Blowfish's stock schemes in light and dark mode, with no site CSS at all. Builds on §5's structural CSS and `--fugu-*` properties; it's a presentable baseline, not the full designed look §5 ends with. Check it in the example site and the fixtures, in Chrome at desktop and phone widths.
- [ ] Screenshots, after the basic styles and before `v0.1.0`, taken from the example site with no site CSS so they show what a new user gets:
  - `images/screenshot.png` (1500×1000) and `images/tn.png` (900×600), the sizes themes.gohugo.io expects.
  - For the README and docs: a recipe page (ingredients, sidebar, a formula diagram), a recipe list of cards, and the scaling and unit controls in use; light and dark mode; one at phone width.
  - Keep them in `images/` (listing) and `docs/images/` (docs), and note in the docs how they were taken (page, window size, scheme), so they can be retaken whenever the styles change. Retake them again for `v1.0.0` after §5's designed look lands.
- [ ] `v0.1.0` once §1–§3 are done, the basic styles and screenshots above land, and the example site builds; `v1.0.0` after §5–§7.
- [ ] Optional: list it on themes.gohugo.io (PR to `gohugoio/hugoThemesSiteBuilder`). Their rules may need the theme to build on its own; check how they handle themes that need a parent theme.

## Features

Theme features moved here from Not a Chef's plan on 2026-10-07. They build on the templates and JS in this repo; content-side follow-ups stay in Not a Chef's PLAN.md.

**These come after 1.0** (§1–§10), unless one is needed sooner by Not a Chef. Several cite `SPEC.md`, which still lives in Not a Chef; it moves into Fugu's docs in §7, and until then read it there.

### Formula strip on recipe cards

- [ ] Build it, as described below.

Show a recipe's formula diagram as a 24px strip on its card, so a recipe's shape is visible while browsing (home page "Recently added", the recipes list, tag and cuisine pages). Mocked up in Not a Chef's `mockups/formula-diagrams.html` §5; not built.

- Cards don't render the recipe body, so `layouts/partials/recipe-card.html` has to find the ```` ```formula ```` block in `.RawContent` itself and pull each line's operator and icon keys (plus the numbers, for a `:` ratio). Labels, quantities, swaps and the `=` result never show on the card.
- Draw it with a small partial (e.g. `partials/formula-strip.html`) from the same `assets/icons/formula/` files the recipe page uses, after the intro (`rcard-intro`).
- On cards with a strip, clamp the intro to 2 lines instead of 3, so every card stays the same height. CSS for `.rcard-formula` is in the mockup.
- Automatic from then on: any recipe with a `formula` block gets the strip. `has_formula` in `recipes/index.json` already says which recipes have one.

### Formula diagrams

- [ ] `/lint` checks formula blocks: unknown icon keys, mixed operators, more than five slots. The build already warns on all three (`render-codeblock-formula.html`); this catches them before a build.
- [ ] Grow the icon kit as recipes need it: one SVG per key in `assets/icons/formula/`, drawn on the kit's rules (§5), plus a gallery page in the docs or example site so there's a reference for the whole kit.

### Recipe format and validator

From Not a Chef's `SPEC.md`, which should become Fugu docs as part of §7.

- [ ] Prototype ingredient-name canonicalization (`"450g butternut squash, peeled and diced"` → `butternut squash`) against a real slice of recipes. `SPEC.md` §6 calls it the fragile part; de-risk it before designing the data files further.
- [ ] Validator (`tools/validate_recipe.py`) for `SPEC.md` §8: frontmatter types, ingredient-line parse rate, `## Substitutions` grammar, `####` group placement, formula blocks.
- [ ] Wire it into `/lint` so structural and frontmatter checks run as one command.

### Listings and navigation

- [ ] Sort or filter controls on the recipes list (cuisine, prep time, tag).
- [ ] Tag and cuisine term pages that work as filters, not just link lists.
- [ ] Table of contents behaviour on long reference pages.

### Build-time enrichment

- [ ] Parsed ingredients per recipe in `recipes/index.json` (or a sibling file), the shared input for the ingredient features below.
- [ ] Ingredient prices (`data/ingredient_prices.yaml`, supplied by the site) joined into a rough per-recipe cost, approximate by design (`SPEC.md` §6).
- [ ] Grocery departments (`data/departments.yaml`): department order and ingredient → department mapping, for the shopping list and pantry tool. Fugu can ship a default the site overrides.
- [ ] schema.org `Recipe` JSON-LD partial, from frontmatter and `## Equipment`.

### Cooking-time features

Client JS, alongside `ingredients.js`.

- [ ] Optional-ingredient toggle, using the `(optional)` marker (`SPEC.md` §3).
- [ ] Print view: ingredients and method only, tuned for the browser print dialog.
- [ ] Cook mode: larger text, keep-awake via the Wake Lock API where available.
- [ ] Substitutions: an interactive swap control on top of the static `## Substitutions` section.
- [ ] Shopping list across selected recipes, in department order.
- [ ] Pantry tool: on-hand ingredients → matching recipes (Not a Chef calls this win-the-fridge).
- [ ] Method check-off: tap a method sentence to strike it, kept in `localStorage` per recipe. Ingredient check-off, scale, and units already persist in `localStorage` (`ingredients.js`, around lines 645, 833, 839); reuse that pattern and key scheme.

**Deferred, on purpose** (`SPEC.md` §10): saved recipes, personal notes, ratings, and reader-side change tracking need a backend; nutrition data has no model yet.
