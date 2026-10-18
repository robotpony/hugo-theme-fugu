# Plan

The work list for taking Fugu to a theme other Blowfish users can install. Finished items are removed as they land; `CHANGELOG.md` and git history record them (the last full plan is `75a3a89`, the last long one `183c807`). Section numbers are kept, since other files cite them.

**Release path:** `v0.1.0` is tagged (2026-10-17). `v1.0.0` needs §4–§7 and the §10 review. Features come after 1.0.

## 4. Translation

- [ ] Move template English to `i18n/en.yaml`, with Hugo's plural forms for counts: `single.html`, `term.html`, `reading-sidebar.html`, `toc.html`, `essays/list.html` (`git grep` the visible strings; "Recipe notes", "On cards", "Jump to", the "N recipes" counts, …).
- [ ] JS strings in `ingredients.js` and `automagic-sidebar.js`: pass them in from the template (`data-` attribute or a JSON block from `i18n`), not translated in JS.
- [ ] Docs note: unit conversion assumes English unit words; other languages' units are out of scope for 1.0.

## 5. Default design

Not a Chef's `custom.css` (1,553 lines) still styles every class Fugu emits; `fugu.css` is only a baseline from `--fugu-*` tokens (`params.fugu.styles = false` turns it off, as Not a Chef does).

- [ ] Inventory the classes Fugu emits and their rules in `custom.css`, split into structure (layout, sidebar, formula row, popovers, check-off) and look (colour, type, spacing, borders).
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

- [ ] Point the 17 code comments that cite Not a Chef docs (`git grep -e SPEC.md -e DESIGN.md -e FORMAT -- layouts assets tools`) at Fugu's docs, and `blueprint/build-card.html`'s reference to a PLAN.md "Stack diagrams" section that no longer exists.
- [ ] `docs/essay-format.md` from Not a Chef's `FORMAT-ESSAYS.md`, if essays stay supported.
- [ ] `docs/customizing.md`: the three layers, overriding partials, the `--fugu-*` properties (§5), fonts.
- [ ] `docs/tools.md`, replacing the README's paragraph: a table (tool, purpose, example, needs) for `frontmatter.py`, `drafts.py`, `add-image.sh`, `compare-builds.py`, and `$FUGU_SITE_ROOT`; an "Editing" section on using `content/` as an Obsidian vault, and Warped Command.

## 8. Tooling

- [ ] Optional Claude Code commands in `claude/commands/` (not `.claude/`): `/recipe-new`, `/lint`, `/image-add` from Not a Chef, made site-neutral, with copy-in instructions.
- [ ] `unittest` tests for the Python tools against the fixture sites, run in CI (§9).
- [ ] `add-image.sh`: fail early with a clear message when `magick` or `exiftool` is missing (today only `--help` mentions them).

## 9. Example site and CI

- [ ] Run the tool tests (§8) in `.github/workflows/build.yml`.
- [ ] Move the example site to Hugo modules once `go.mod` lands (it uses `themesDir = "../.."` today).

## 10. Release

- [ ] Finish checking the basic styles in Chrome: hover states (popovers, card hover); the principle chip's fill is faint on light-`primary-100` schemes (autumn); "On cards" wraps on the principle tag page's sidebar.
- [ ] Check the README's images in GitHub's rendering, light and dark.
- [ ] Code review in three commit series: `layouts/`, `assets/js/`, `tools/`. Bugs, dead code, Not a Chef leftovers, stale comments. One area per pass with `/code-review high`; record each finding as fixed, won't fix (why), or deferred; check template and JS fixes with `tests/check.py --compare` and Chrome at both widths, light and dark. Angles from Not a Chef (2026-10-17):
  - Templates and render hooks: empty sections, a page with no cuisine or no date, drafts in card lists.
  - JS: JS off, keyboard only, screen reader, listeners attached twice.
  - Tools: run from a fresh clone of a site with the submodule uninitialised.
  - Accessibility: popover ARIA and tap behaviour, focus order, landmarks, heading levels.
- [ ] Retake the screenshots after §5 (`python3 tools/screenshots.py`).
- [ ] Tag `v1.0.0` after §4–§7 and the review.
- [ ] Optional: list on themes.gohugo.io; check how they handle themes that need a parent theme.

## Features

After 1.0 unless Not a Chef needs one sooner. Several cite `SPEC.md`, still in Not a Chef.

- **Decide first:** retiring `tools/compare-builds.py` (asked 2026-10-11) removes the check behind CLAUDE.md's "don't change Not a Chef by accident" and `tests/check.py --compare`. Choose its replacement before removing it.
- **Formula diagrams:** `/lint` checks formula blocks (unknown keys, mixed operators, over five slots) before a build; grow the icon kit as recipes need it, with a gallery page.
- **Methods and blueprints:** `blueprint`, `role`, and `era` in a JSON index (a methods index, or methods in the recipe one; asked 2026-10-11); bring back the builds comparison table from each build's `## Picks`.
- **Recipe format:** prototype ingredient-name canonicalization on real recipes (`SPEC.md` §6, the fragile part); a validator (`tools/validate_recipe.py`, `SPEC.md` §8) wired into `/lint`.
- **Wiki links to section pages:** `render-link.html` matches titles against `site.RegularPages` only, so `[[Burgers]]` (a blueprint's `_index.md`) is a broken link; Not a Chef links it by path for now (2026-10-17). Include section pages with their own content, blueprints at least, and watch for title clashes with taxonomy terms.
- **Listings:** sort and filter on the recipes list; term pages as filters; TOC behaviour on long reference pages; extra taxonomies in the header's tags row (skip them by param, or chip them like cuisine); an option to leave hidden personal notes out of the build, since today they're only hidden visually.
- **Build-time enrichment:** parsed ingredients in `recipes/index.json` (input for the rest); per-recipe cost from site `data/ingredient_prices.yaml`; grocery departments (`data/departments.yaml`, with a Fugu default); schema.org `Recipe` JSON-LD.
- **Cooking-time JS:** optional-ingredient toggle; print view; cook mode with Wake Lock; interactive substitutions; shopping list in department order; pantry tool (win the fridge); method check-off in `localStorage`, reusing `ingredients.js`'s key scheme.
- **Later:** a separate test-site repo that installs tagged releases as an outsider would (§9's install job covers this until then).
- **Deferred on purpose** (`SPEC.md` §10): saved recipes, personal notes, ratings, reader-side change tracking (need a backend); nutrition (no model yet).
