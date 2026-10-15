# Plan

The work list for taking Fugu to a theme other Blowfish users can install. Each item says what it is, why, and roughly how, so it can be picked up cold. Finished items are removed as they land; `CHANGELOG.md` and git history record what landed (the last full plan is `75a3a89`). Section numbers are kept, since other files cite them.

## 4. Translation

- [ ] Move English text in templates to `i18n/en.yaml`. Found so far: `single.html` ("Recipe notes"), `term.html` ("Definition", "On cards", "Recipes that follow this principle", the "N recipes" count, "Reference"/"Essay"), `reading-sidebar.html` ("On this page", "Months", "The cookbook in numbers", "Start here", "Recipes in this guide/essay", "Essays", "Reference guides"), `toc.html` ("Jump to"), `essays/list.html` (the "essay/essays" count). Use Hugo's plural forms for counts.
- [ ] JS strings: `ingredients.js` ("Scale recipe", "As written", "Metric", "Imperial", aria labels) and `automagic-sidebar.js` (photo viewer labels, "Jump to it in the text →"). Pass them in from the template (a `data-` attribute or a small JSON block built from `i18n`) rather than translating in JS.
- [ ] Unit conversion assumes English unit words (cups, tbsp, "about"). Note that in the docs; supporting other languages' units is out of scope for 1.0.

## 5. Default design

Every class Fugu's templates use is still styled by Not a Chef's `assets/css/custom.css` (1,553 lines). Fugu's basic styles (`assets/css/fugu.css`, off with `params.fugu.styles = false`, which Not a Chef sets) give a presentable baseline from `--fugu-*` tokens over Blowfish's scheme colours; this section is the full split and Fugu's own designed look.

- [ ] Inventory the classes Fugu's templates and JS emit, and find their rules in Not a Chef's `custom.css`. Split them into structure (layout, sidebar placement, the formula row, popovers, check-off states) and look (colours, fonts, spacing scale, borders).
- [ ] Move the structural CSS into `fugu.css` (or a sibling), so Not a Chef can turn Fugu's styles on.
- [ ] Express the rest of the look through `--fugu-*` custom properties that default to Blowfish's scheme colours (`--color-primary-*`, `--color-neutral-*`).
- [ ] Design Fugu's own neutral look (this is a design task, not just extraction: mock it first). Then update `docs/getting-started.md`, which says the designed look comes later.
- [ ] Not a Chef then keeps only its look in `custom.css`. Update the template and JS comments that say a rule lives in `custom.css` (`git grep custom.css -- layouts assets`) to name Fugu's stylesheet where the rule moved. Check it renders the same before and after.
- [ ] Fonts: `partials/fonts.html` is the hook (empty by default). Document it, and consider a `fonts` param for the simple Google Fonts case plus a self-hosting recipe.
- [ ] Formula icon kit rules (stroke, grid, size) live in Not a Chef's `mockups/STYLE.md` ("Formula diagram"); copy them into Fugu's docs so new icons can be drawn without that repo.

## 6. Blowfish compatibility

The overridden files and pinned versions are listed in CLAUDE.md ("Blowfish overrides"); count `search.js` with the templates in everything below.

- [ ] `archetypes/default.md` is Hugo's stock TOML archetype, shadowing Blowfish's YAML one, so `hugo new` writes TOML on a Fugu site while every format Fugu documents is YAML. Delete it (Blowfish's applies) or make it a YAML archetype of Fugu's own.
- [ ] Write `docs/blowfish.md`: for each overridden file, what Fugu changes and why (each file's header comment, checked against a real diff on 2026-10-07), and the Blowfish version it was copied from.
- [ ] List the Blowfish params Fugu ignores or uses differently (e.g. `article.relatedContentLimit` must be set when related content is on, or `related.html` fails the build; `footer.showAppearanceSwitcher` controls a header toggle; homepage `layout`; `bg-neutral` resolving to white in every scheme). Not a Chef's `config/_default/params.toml` comments have most of these; `docs/configuration.md` covers only the ones a site has to set.
- [ ] Where Blowfish offers a hook (`extend-head.html`, `extend-footer.html`, etc.), prefer it over a full override, and shrink overrides where possible.
- [ ] Pin the supported Blowfish version: a `go.mod` for Hugo modules (`module github.com/robotpony/hugo-theme-fugu`, requiring `github.com/nunocoracao/blowfish/v3`), and the same version in CI.
- [ ] Install method: Hugo modules first, git submodules second (decided 2026-10-08). Has to land before `v0.1.0`, since that's when outsiders start installing.
  - Hugo modules are the only method where Fugu guarantees a compatible Blowfish: its `go.mod` requires the tested version, and `hugo mod get -u` moves by tag. The cost: every machine that builds needs Go (Netlify has it; GitHub Actions needs `setup-go`; the Mac Fugu is developed on doesn't), versions are pseudo-versions until releases are tagged, and editing in place takes a `replace` directive or `HUGO_MODULE_REPLACEMENTS`.
  - Submodules stay documented as the alternative, for sites that don't want Go and for developing Fugu in place (Not a Chef stays on them). They need only git and work offline, but nothing catches a Fugu/Blowfish mismatch.
  - To do: the `go.mod` (above), install sections for both in `docs/getting-started.md` (submodules only today) and the README, the example site on modules, and both variants in §9's install job.
- [ ] An upgrade checklist, from what worked for `295dae3`: build the site before and after moving only the submodule, so `compare-builds.py OLD NEW` shows Blowfish's own changes; `git diff OLD NEW` in Blowfish for each file Fugu copies, and `patch` those hunks into Fugu's copies (most apply; fix the rest by hand); measure element boxes and computed styles of both builds in Chrome via iframes at each width and mode, rather than comparing screenshots; rebuild the fixtures and the example site.

## 7. Docs

Written so far: `getting-started.md`, `recipe-format.md`, `frontmatter.md`, `configuration.md`, `features.md`, indexed in `docs/README.md`.

- [ ] Comments that point at Not a Chef docs (`FORMAT.md`, `SPEC.md`, `DESIGN.md`; 17, `git grep -e SPEC.md -e DESIGN.md -e FORMAT -- layouts assets tools`) should point at Fugu's docs, now that most exist.
- [ ] `docs/essay-format.md` from Not a Chef's `FORMAT-ESSAYS.md`, if essays stay a supported section.
- [ ] `docs/customizing.md`: the three layers (site → Fugu → Blowfish), overriding partials, the CSS custom properties (§5), fonts.
- [ ] `docs/tools.md`: the content tools, documented properly. Today they get one paragraph in the README's Customizing section. Give them a table (tool, what it does, example command, what it needs): `frontmatter.py` (check, get, set, unset), `drafts.py`, `add-image.sh` (needs ImageMagick 7's `magick` and `exiftool`), and `compare-builds.py` for theme work; then `$FUGU_SITE_ROOT`, and a short example for each. Add an "Editing" section on the workflow around them: Fugu's content is plain Markdown with `[[wiki links]]`, so a site's `content/` folder works as an Obsidian vault, and Warped Command shows a Hugo site's posts in a way that suits recipes. Link it from the README in place of the paragraph.

## 8. Tooling

- [ ] Claude Code commands as an optional bundle in `claude/commands/` (not `.claude/`, so they don't load in this repo by accident): `/recipe-new`, `/lint`, `/image-add` from Not a Chef's `.claude/commands/`, made site-neutral. Document copying them into a site's `.claude/commands/`.
- [ ] Tests for the Python tools (stdlib `unittest`, run in CI) against the fixture sites.
- [ ] `add-image.sh` calls `magick` and `exiftool` without checking for them; fail early with a clear message when one is missing.
- [ ] A `Makefile` or script entry point is optional; plain `python3 themes/fugu/tools/<tool>.py` is fine.

## 9. Example site and CI

- [ ] Run the tool tests (§8) in `.github/workflows/build.yml`.
- [ ] Move the example site to Hugo modules once §6's `go.mod` lands (today it finds the themes through `themesDir = "../.."`).
- [ ] An install job: CI starts from `hugo new site`, installs Fugu and Blowfish the way `docs/getting-started.md` says (Fugu from the commit under test, by both methods in §6), adds the getting-started recipe, builds with `--panicOnWarning`, and checks the recipe page has its ingredients, method, and sidebar facts. This catches the install steps and docs drifting from the theme, which the fixtures can't, since they find the themes through `themesDir`.

## 10. Release

- [ ] Finish checking the basic styles: in interactive Chrome for hover states (popovers, card hover). Schemes with a very light `primary-100` (autumn) make the principle chip's fill faint. Found in the screenshots (2026-10-14): the principle tag page's sidebar label "On cards" wraps onto two lines.

- [ ] Check the README's images in GitHub's rendering, light and dark, once pushed.
- [ ] Retake the screenshots for `v1.0.0` after §5's designed look lands (`python3 tools/screenshots.py`; `docs/images/README.md` says how).
- [ ] Code review, in three passes, each its own commit series: the templates (`layouts/`, including render hooks and partials), the JS (`assets/js/`), and the tools (`tools/`). Look for bugs, dead code, leftover Not a Chef assumptions, and comments that no longer match the code. `/code-review` on each folder is a starting point; for templates and JS, check every fix with `compare-builds.py`.
- [ ] `v0.1.0` once the install method (§6) is in place; `v1.0.0` after §5–§7.
- [ ] Optional: list it on themes.gohugo.io (PR to `gohugoio/hugoThemesSiteBuilder`). Their rules may need the theme to build on its own; check how they handle themes that need a parent theme.
- [ ] Later, once there are tagged releases to test against: a separate test-site repo that installs Fugu exactly as an outsider would and pulls tagged releases. Until then, §9's install job covers this.

## Features

Theme features moved here from Not a Chef's plan on 2026-10-07. Content-side follow-ups stay in Not a Chef's PLAN.md.

**These come after 1.0** (§4–§10), unless one is needed sooner by Not a Chef. Several cite `SPEC.md`, which still lives in Not a Chef; read it there until it moves into Fugu's docs.

### Formula diagrams

- [ ] `/lint` checks formula blocks: unknown icon keys, mixed operators, more than five slots. The build already warns on all three (`render-codeblock-formula.html`); this catches them before a build.
- [ ] Grow the icon kit as recipes need it: one SVG per key in `assets/icons/formula/`, drawn on the kit's rules (§5), plus a gallery page in the docs or example site so there's a reference for the whole kit.

### Methods and blueprints

- [ ] Add `blueprint` (folder slug), `role` (`part` or `build`, from the folder), and `era` to a JSON index (asked for by Not a Chef on 2026-10-11). `recipes/index.json` lists only recipes, which carry no blueprint fields, so this needs methods in an index: a methods index beside it, or methods added to the recipe one.
- [ ] Bring back the builds comparison table on the blueprint page, set aside when blueprints became folders (2026-10-11): it needs each build's picks read from its `## Picks` list.
- [ ] Retire `tools/compare-builds.py` (asked for 2026-10-11). It's the site-build diff behind "don't change Not a Chef by accident" (CLAUDE.md) and `tests/check.py --compare`, so first decide what replaces that check, then update CLAUDE.md, `tests/check.py`, `tests/sites/README.md`, and the README.

### Recipe format and validator

From Not a Chef's `SPEC.md`.

- [ ] Prototype ingredient-name canonicalization (`"450g butternut squash, peeled and diced"` → `butternut squash`) against a real slice of recipes. `SPEC.md` §6 calls it the fragile part; de-risk it before designing the data files further.
- [ ] Validator (`tools/validate_recipe.py`) for `SPEC.md` §8: frontmatter types, ingredient-line parse rate, `## Substitutions` grammar, `####` group placement, formula blocks.
- [ ] Wire it into `/lint` so structural and frontmatter checks run as one command.

### Listings and navigation

- [ ] Sort or filter controls on the recipes list (cuisine, prep time, tag).
- [ ] Tag and cuisine term pages that work as filters, not just link lists.
- [ ] Table of contents behaviour on long reference pages.
- [ ] Extra taxonomies in the page header's tags row. `article-meta/basic.html` gives cuisine a chip and tags their `.tag` links, but any other taxonomy a site adds falls through to Blowfish's plain badge, unstyled by the site and often repeating a tag. Either skip taxonomies a site lists (a param, e.g. `fugu.headerTaxonomies`) or render them as a chip like cuisine.
- [ ] Hidden personal notes are only hidden visually: the text is still in the HTML, the search index, and possibly the RSS feed. An option to leave it out of the build would make it private.

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
- [ ] Method check-off: tap a method sentence to strike it, kept in `localStorage` per recipe. Ingredient check-off, scale, and units already persist in `localStorage` (`ingredients.js`); reuse that pattern and key scheme.

**Deferred, on purpose** (`SPEC.md` §10): saved recipes, personal notes, ratings, and reader-side change tracking need a backend; nutrition data has no model yet.
