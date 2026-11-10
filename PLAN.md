# Plan

The work list for taking Fugu to a theme other Blowfish users can install. Finished items are removed as they land; `CHANGELOG.md` and git history record them (the last full plan is `75a3a89`, the last long one `183c807`, the last before `v0.1.0` `102abb1`, the last before this squash `13b763a`). Section numbers are kept, since other files cite them.

**Release path:** `v0.1.0` (2026-10-17) and `v0.2.0` (2026-11-07) are tagged: installs by Hugo modules or submodules, checked by CI's install job. `v1.0.0` needs §5–§7 and the §10 review's deferred items. Not a Chef's 2026-11-08 accessibility audit is done (2026-11-10; CHANGELOG, Unreleased). Features come after 1.0.

**Next:** §5's split, from `docs/design/class-inventory.md`: start with the 227 mixed rules (`.pop` first) and the `--fugu-*` counterparts for the site's 17 colour variables.

## 4. Translation

Done: template and script English is in `i18n/en.yaml` (`docs/configuration.md`, "Words and translation").

## 5. Default design

Not a Chef's `custom.css` (2,413 lines) still styles every class Fugu emits; `docs/design/class-inventory.md` sizes the split: 310 classes, about 400 lines of structure and 700 of look, 227 rules mixing the two, 109 with hardcoded font names, and 13 dead classes; `fugu.css` is only a baseline from `--fugu-*` tokens (`params.fugu.styles = false` turns it off, as Not a Chef does).

- [ ] Move structure into `fugu.css`; express the look as `--fugu-*` properties defaulting to Blowfish's `--color-primary-*`/`--color-neutral-*`.
- [ ] Mock, then build, Fugu's own neutral look; update `docs/getting-started.md`, which says it comes later.
- [ ] Not a Chef keeps only its look in `custom.css` and renders the same. Update the comments in 10 files that point at `custom.css` (`git grep -l custom.css -- layouts assets`).
- [ ] Fonts: document the `partials/fonts.html` hook; consider a `fonts` param for Google Fonts plus a self-hosting recipe.
- [ ] Copy the formula icon kit's drawing rules (stroke, grid, size) from Not a Chef's `mockups/STYLE.md` into Fugu's docs.

## 6. Blowfish compatibility

Overrides and pinned versions are in CLAUDE.md ("Blowfish overrides").

- [ ] `docs/blowfish.md`: per overridden file, what Fugu changes and why (from each header comment) and the Blowfish version it came from; plus the Blowfish params Fugu ignores or uses differently (`article.relatedContentLimit` required with related content, `footer.showAppearanceSwitcher` driving a header toggle, homepage `layout`, `bg-neutral` always white). Not a Chef's `params.toml` comments have most.
- [ ] Prefer Blowfish's hooks (`extend-head.html`, `extend-footer.html`) over full overrides; shrink overrides where possible.
- [ ] Upgrade checklist, from the `295dae3` move: build before and after moving only the submodule and `compare-builds.py OLD NEW`; `git diff OLD NEW` in Blowfish per copied file and `patch` the hunks into Fugu's copies; measure element boxes in Chrome at each width and mode; rebuild fixtures and the example site.

## 7. Docs

Written: `getting-started.md`, `recipe-format.md`, `frontmatter.md`, `configuration.md`, `features.md`.

- [ ] Point the 17 code comments that cite Not a Chef docs (`git grep -e SPEC.md -e DESIGN.md -e FORMAT -- layouts assets tools`) at Fugu's docs, and `blueprint/build-card.html`'s reference to a PLAN.md "Stack diagrams" section that no longer exists (it's `docs/recipe-format.md` now).
- [ ] `docs/essay-format.md` from Not a Chef's `FORMAT-ESSAYS.md`, if essays stay supported.
- [ ] `docs/customizing.md`: the three layers, overriding partials, the `--fugu-*` properties (§5), fonts.
- [ ] `docs/tools.md`, replacing the README's paragraph: a table (tool, purpose, example, needs) for `frontmatter.py`, `drafts.py`, `add-image.sh`, `compare-builds.py`, and `$FUGU_SITE_ROOT`; an "Editing" section on using `content/` as an Obsidian vault, and Warped Command.

## 8. Tooling

- [ ] Optional Claude Code commands in `claude/commands/` (not `.claude/`): `/recipe-new`, `/lint`, `/image-add` from Not a Chef, made site-neutral, with copy-in instructions.
- [ ] `unittest` tests for the Python tools against the fixture sites, run in CI (§9).

## 9. Example site and CI

- [ ] Run the tool tests (§8) in `.github/workflows/build.yml`.
- [ ] Move the example site to Hugo modules (it uses `themesDir = "../.."` today); `go.mod` is in.

## 10. Release

- [ ] Check the README's images in GitHub's rendering, light and dark.
- [x] Code review in three commit series (`/code-review high`), done; the deferred items stay here until they land. `layouts/` done (2026-11-07, `/code-review high`), outcomes:
  - Fixed: wiki links shown raw in principle popovers; a leaf-bundle essay's card, format chip and siblings (`section/folder.html`); drinks missing from "Recipes in this essay" and a recipe count when the recipe section is off; an undated page's 0001 date in the header and RSS; concept popovers' ARIA (`aria-describedby`, no `role="tooltip"` around a link, the principle icon `aria-hidden`); pagination as a labelled `nav` with `aria-current` and named arrows; the last English strings (search placeholders, feed title and description, formula words, "also", subsections).
  - Heading levels on list pages and the sidebars as `<aside>`: fixed with the accessibility audit (2026-11-10).
  - Deferred to §7: comments that cite `custom.css`, DESIGN.md, FORMAT.md, or Not a Chef content (the item there covers them).
  - Deferred: wiki-link lookup cost (`render-link.html` and the reading sidebar scan every page per link); measure build time before caching a title index.
  - Won't fix: the "Undated" and "Further reading" heading matches stay English; they read headings the author writes, so a translated site writes them in English or renames them in its content.
  - `tools/` done (2026-11-07). Fixed: no site found, or a `FUGU_SITE_ROOT` that isn't one, is an error rather than "no issues" (one `find_site_root`, shared by all three Python tools); paths on the command line are relative to the working directory, and a missing one is an error, not a traceback; files outside the sections are reported as skipped, not counted clean; with Fugu's config not merged (an uninitialised theme folder) the default sections still apply, with a warning; `hugo config` runs only for `check` and `drafts.py`, not `get`/`set`/`unset`; `drafts.py` lists draft section pages (blueprints); `compare-builds.py` honours `$HUGO`, explains a missing Hugo, and refuses to run from a Fugu that isn't the site's `themes/` copy (it silently tested the wrong tree); `add-image.sh` writes relative destinations into the site, checks for `magick` and `exiftool` first (the §8 item), and its help no longer prescribes Not a Chef's `static/images/` or claims "PNG stays PNG". Stale `migrate.py` comment removed.
  - `assets/js/` done (2026-11-07). Fixed: ingredient checkboxes named by their label (tapping the text ticks it) and percentage-table ones by the ingredient; a repeated line's check-off keyed apart (`#2`), first key unchanged; the phone recipe sidebar shown with JS off (`<noscript>` style in `single.html`); photos in hidden personal notes left out of the sidebar and viewer; search arrow keys no longer throw outside the results, the index fetched once and a query typed while it loads run when it lands, and every `.search-box` opens search (the partial drops its duplicate `#search-button`); Escape hides a hovered or focused popover without moving focus; a yield's parenthetical scales with it ("about 12 L (12 qt)"); glued metric units are a param (`unitSpacing`); a wake-lock race; photo markers and the Photos heading named with a space; empty glossary letters out of the tab order.
  - Deferred to §7: comments citing FORMAT.md, DESIGN.md, `custom.css`, and Not a Chef recipes; `automagic-sidebar.js`'s note that its DOMContentLoaded handler runs first (script order does it).
  - Deferred: a yield of "1 loaf" scaling to "2 loaf" (plural words). The gear menu, photo viewer and search-reset items were fixed with the accessibility audit (2026-11-10).
- [ ] Retake the screenshots after §5 (`python3 tools/screenshots.py`).
- [ ] Tag `v1.0.0` after §4–§7 and the review.
- [ ] Optional: list on themes.gohugo.io; check how they handle themes that need a parent theme.

## Features

After 1.0 unless Not a Chef needs one sooner. Several cite `SPEC.md`, still in Not a Chef.

- **Decide first:** retiring `tools/compare-builds.py` (asked 2026-10-11) removes the check behind CLAUDE.md's "don't change Not a Chef by accident" and `tests/check.py --compare`. Choose its replacement before removing it.
- **Formula diagrams:** `/lint` checks formula blocks (unknown keys, mixed operators, over five slots) before a build; grow the icon kit as recipes need it, with a gallery page.
- **Methods and blueprints:** `blueprint`, `role`, and `era` in a JSON index (a methods index, or methods in the recipe one; asked 2026-10-11); bring back the builds comparison table from each build's `## Picks`.
- **Recipe format:** prototype ingredient-name canonicalization on real recipes (`SPEC.md` §6, the fragile part); a validator (`tools/validate_recipe.py`, `SPEC.md` §8) wired into `/lint`.
- **Listings:** sort and filter on the recipes list; term pages as filters; TOC behaviour on long reference pages; extra taxonomies in the header's tags row (skip them by param, or chip them like cuisine); an option to leave hidden personal notes out of the build, since today they're only hidden visually.
- **Build-time enrichment:** parsed ingredients in `recipes/index.json` (input for the rest); per-recipe cost from site `data/ingredient_prices.yaml`; grocery departments (`data/departments.yaml`, with a Fugu default); schema.org `Recipe` JSON-LD.
- **Cooking-time JS:** optional-ingredient toggle; print view; cook mode with Wake Lock (the keep-awake switch beside the gear is the small version); interactive substitutions; shopping list in department order; pantry tool (win the fridge); method check-off in `localStorage`, reusing `ingredients.js`'s key scheme.
- **Later:** a separate test-site repo that installs tagged releases as an outsider would; possible now `v0.1.0` exists, though §9's install job covers most of it.
- **Deferred on purpose** (`SPEC.md` §10): saved recipes, personal notes, ratings, reader-side change tracking (need a backend); nutrition (no model yet).
