# Plan

Fugu is a cookbook theme for Blowfish, split out of Not a Chef (https://github.com/robotpony/not-a-chef) on 2026-10-06. Today it still assumes that site's section names, content, and CSS. This plan takes it from there to a theme other Blowfish users can install. Each item says what it is, why, and roughly how, so it can be picked up cold.

Work through the sections roughly in order: the early ones remove Not a Chef assumptions that the later ones (docs, example site, release) depend on.

**The one rule while doing any of this:** Not a Chef must keep rendering exactly as it does now, unless a change is meant to alter it. See CLAUDE.md for how to check.

## 1. Housekeeping

- [ ] Clear Not a Chef out of comments and copy. 17 files still point at `mockups/STYLE.md` or name the site (`git grep -e mockups/ -e STYLE.md -e "Not a Chef"`). Where a comment explains a design decision, keep the reason and drop the pointer. Check `layouts/404.html`'s text too: it's a site joke, and may belong in Not a Chef's own layouts.
- [ ] Comments that point at Not a Chef docs (`FORMAT.md`, `SPEC.md`, `DESIGN.md`) should point at Fugu's docs once those exist (§7). Until then, leave them.
- [ ] Write the README's scope statement: a general cookbook theme where only recipes are required, and essays, reference pages, a dated log, `cuisine`, the glossary, and principle tags are each optional.
- [ ] Add a `CHANGELOG.md` and start tagging versions (`v0.1.0` once §2–§3 land).

## 2. Configuration instead of hardcoded names

Everything below is written directly into templates today. Move it into one params block, e.g. `[params.fugu]`, with defaults in a theme-level `hugo.toml` so a site sets only what differs. When a param is renamed (e.g. `params.recipe.enableKelvin`), change Not a Chef's config in the same step.

- [ ] Section names. `"recipes"` is hardcoded in `_default/single.html` (5 places), `_default/term.html`, `_markup/render-heading.html`, `partials/page-description.html`, and `partials/reading-sidebar.html`. `"essays"`, `"reference"`, and `"the-food-log"` are hardcoded in `reading-sidebar.html`, `recipe-card.html`, `sidebar/kind.html`, `sidebar/date-rows.html`, `term.html`, and `page-description.html`. Suggested params: `recipeSection`, `essaySection`, `referenceSection`, `logSection`, each empty to turn the section off.
- [ ] The section list templates (`layouts/recipes/`, `layouts/essays/`, `layouts/reference/`, `layouts/the-food-log/`) are found by folder name, so a site with different section names won't get them. Move them to layouts selected by `type` (or a cascade in the site's section `_index.md`) and document it.
- [ ] Principle tags. `partials/principle-chip.html` and `recipe-card.html` hardcode `win-the-fridge`. The tag's own `content/tags/<slug>/_index.md` already says `principle: true`; read that instead, so any site can have principle tags.
- [ ] Glossary. `_markup/render-link.html` looks for `/reference/glossary` and treats `essays/reference-essays/` as the reference-essay folder. Make both params.
- [ ] Reading sidebar labels and stats ("The cookbook in numbers", "Start here", "Months") are Not a Chef features; make each one optional.
- [ ] Recipe frontmatter fields the templates read (`servings`, `portions`, `prep_time`, `cook_time`, `total_time`, `source`, `cuisine`, `pinned`, `start_here`, `summary`) are fine as a fixed schema, but list them in the docs (§7).
- [ ] The section headings the JS and `render-heading.html` key on (Ingredients, Method, Mechanic, To serve, Notes, Variations) are English and fixed. Decide whether they stay a documented contract or become configurable (they matter for §4 too).

## 3. Optional parts

- [ ] A site with only a `recipes` section and only the `tags` taxonomy must build with no errors or warnings and no broken links. Today `cuisine` is assumed in `recipe-card.html`, `list.json.json`, and `related.html`.
- [ ] Each optional part (essays, reference, log, glossary, principle tags, `cuisine`) turns off cleanly: no empty sidebar blocks, no dead nav, no zero counts.
- [ ] Small fixture sites under `tests/sites/` (recipes-only; everything on) that CI builds with `hugo --panicOnWarning`. Cheaper than relying on the example site alone.

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
- [ ] Not a Chef then keeps only its look in `custom.css`. Check it renders the same before and after.
- [ ] Fonts: `partials/fonts.html` is the hook (empty by default). Document it, and consider a `fonts` param for the simple Google Fonts case plus a self-hosting recipe.
- [ ] Formula icon kit rules (stroke, grid, size) live in Not a Chef's `mockups/STYLE.md` ("Formula diagram"); copy them into Fugu's docs so new icons can be drawn without that repo.

## 6. Blowfish compatibility

Fugu overrides 14 Blowfish files: `404.html`, `_default/single.html`, `_default/term.html`, `_default/terms.html`, `_default/index.json`, `_default/_markup/render-heading.html`, `render-image.html`, `render-link.html`, `partials/head.html`, `partials/article-meta/basic.html`, `partials/article-pagination.html`, `partials/pagination.html`, `partials/related.html`, `partials/toc.html`. Each is a full copy, so a Blowfish update can break it without any error.

- [ ] Write `docs/blowfish.md`: for each overridden file, what Fugu changes and why, and the Blowfish version it was copied from (the submodule was at `e9699d8`, May 2026).
- [ ] List the Blowfish params Fugu ignores or uses differently (e.g. `footer.showAppearanceSwitcher` controls a header toggle; homepage `layout`; `bg-neutral` resolving to white in every scheme). Not a Chef's `config/_default/params.toml` comments have most of these.
- [ ] Where Blowfish offers a hook (`extend-head.html`, `extend-footer.html`, etc.), prefer it over a full override, and shrink overrides where possible.
- [ ] Pin the supported Blowfish version: a `go.mod` for Hugo modules (`module github.com/robotpony/hugo-theme-fugu`, requiring Blowfish's module), and the same version in CI.
- [ ] An upgrade checklist: diff each overridden file against the new Blowfish version, rebuild the fixtures and the example site.

## 7. Docs

Not a Chef's docs describe Fugu's features but are written for that one site. Make Fugu's own, under `docs/`, site-neutral:

- [ ] `docs/recipe-format.md`, from Not a Chef's `FORMAT.md`: frontmatter, sections, multi-component recipes, wiki links, formula blocks. Its house style (Canadian English, metric first) becomes a suggestion, not a rule.
- [ ] `docs/essay-format.md` from `FORMAT-ESSAYS.md`, if essays stay a supported section.
- [ ] `docs/configuration.md`: every `[params.fugu]` setting (§2), the optional parts (§3), and which Blowfish params matter.
- [ ] `docs/customizing.md`: the three layers (site → Fugu → Blowfish), overriding partials, the CSS custom properties (§5), fonts.
- [ ] `docs/features.md`: scaling and unit conversion, ingredient check-off, formula diagrams and the icon kit, wiki links and the glossary, pinned pages, principle tags, the reading and recipe sidebars, `index.json`.
- [ ] `docs/tools.md`: `frontmatter.py`, `drafts.py`, `add-image.sh` (needs ImageMagick 7's `magick` and `exiftool`), `$FUGU_SITE_ROOT`.
- [ ] README: short, with install, quick start, a screenshot, and links into `docs/`.

## 8. Tooling

- [ ] Claude Code commands as an optional bundle in `claude/commands/` (not `.claude/`, so they don't load in this repo by accident): `/recipe-new`, `/lint`, `/image-add` from Not a Chef's `.claude/commands/`, made site-neutral. Document copying them into a site's `.claude/commands/`.
- [ ] Tests for the Python tools (stdlib `unittest`, run in CI) against the fixture sites.
- [ ] `add-image.sh` calls `magick` and `exiftool` without checking for them; fail early with a clear message when one is missing.
- [ ] A `Makefile` or script entry point is optional; plain `python3 themes/fugu/tools/<tool>.py` is fine.

## 9. Example site and CI

- [ ] `exampleSite/` with 6–10 recipes from Not a Chef (CC BY-SA 4.0 allows it; credit and link the licence): a simple recipe, a multi-component one, one with a Mechanic, one with a formula block, plus an essay, a reference page, and a glossary entry if those ship.
- [ ] GitHub Actions: build `exampleSite/` and the fixtures with the pinned Hugo and Blowfish versions, `--panicOnWarning`, and run the tool tests.
- [ ] A link check over the built example site.

## 10. Release

- [ ] `v0.1.0` once §1–§3 are done and the example site builds; `v1.0.0` after §5–§7.
- [ ] `images/screenshot.png` (1500×1000) and `images/tn.png` (900×600) from the example site.
- [ ] Optional: list it on themes.gohugo.io (PR to `gohugoio/hugoThemesSiteBuilder`). Their rules may need the theme to build on its own; check how they handle themes that need a parent theme.

## Features

Theme features moved here from Not a Chef's plan on 2026-10-07. They build on the templates and JS in this repo; content-side follow-ups stay in Not a Chef's PLAN.md.

### Formula strip on recipe cards

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
- [ ] Method check-off: tap a method sentence to strike it, kept in `localStorage` per recipe. Ingredient check-off already exists; check whether it persists.

**Deferred, on purpose** (`SPEC.md` §10): saved recipes, personal notes, ratings, and reader-side change tracking need a backend; nutrition data has no model yet.
