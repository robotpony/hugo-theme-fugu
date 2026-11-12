# Plan

The work list for taking Fugu to a theme other Blowfish users can install. Finished items are removed as they land; `CHANGELOG.md` and git history record them (the last before §5's split `fa04557`, the last full plan `75a3a89`, the last long one `183c807`, the last before `v0.1.0` `102abb1`, the last before `v0.2.0`'s squash `13b763a`, the last before the review and audit squash `5014763`). Section numbers are kept, since other files cite them.

**Release path:** `v0.1.0` (2026-10-17) and `v0.2.0` (2026-11-07) are tagged: installs by Hugo modules or submodules, checked by CI's install job. `v1.0.0` needs §7 and §10's open items; the code review and Not a Chef's accessibility audit are done (CHANGELOG, Unreleased). Features come after 1.0.

**Next:** tag `v1.0.0` (Bruce's call).

## 4. Translation

Done: template and script English is in `i18n/en.yaml` (`docs/configuration.md`, "Words and translation").

## 5. Default design

Done 2026-11-10: `fugu.css` carries every component's design, moved from Not a Chef's `custom.css` (2,382 lines down to 529: its tokens, header, homepage, footer, 404 and paper grain), and Fugu's own look is direction A of three mocked (monochrome from the scheme's neutral ramp, system fonts, a pure-grey `fugu` scheme). Not a Chef sets every token and renders as before (`compare-styles.py`: no differences). Its comments, `customizing.md`, and the icon kits' drawing rules followed the same day.

## 6. Blowfish compatibility

Done 2026-11-11: overrides, pinned versions, the settings that differ, why Fugu copies files rather than using Blowfish's `extend-head`/`extend-footer` hooks (they're the site's, and they come last), and the upgrade checklist are in `docs/blowfish.md`.

## 7. Docs

Written: `getting-started.md`, `recipe-format.md`, `frontmatter.md`, `configuration.md`, `customizing.md`, `blowfish.md`, `features.md`, `tools.md`, `essay-format.md`. Done 2026-11-11.


## 8. Tooling

Done 2026-11-11: `tests/test_tools.py` tests the tools, and `claude/commands/` has the optional Claude Code commands.

## 9. Example site and CI

Done 2026-11-11: the example site takes its themes as Hugo modules, and CI runs `tests/test_tools.py`.

## 10. Release

- [ ] Tag `v1.0.0` after the items above.
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
- **Build time:** measured 2026-11-11 on Not a Chef (452 pages, 1.4 s on Hugo 0.169): `render-link.html` runs 2,596 times at about 1.1 ms each, so a cached title index isn't worth it yet. The biggest cost is `reading-sidebar/headings.html`, 7,372 calls for 131 sidebars; look there first if builds slow down.
- **README images:** checked on GitHub 2026-11-11, light and dark: all load and read well on both. Optional polish: dark variants through `<picture>` (screenshots.py already takes `recipe-dark`), and the grid's whole-window shots are small at half width, so tighter crops would read better.
- **Later:** a separate test-site repo that installs tagged releases as an outsider would; possible now `v0.1.0` exists, though §9's install job covers most of it.
- **Deferred on purpose** (`SPEC.md` §10): saved recipes, personal notes, ratings, reader-side change tracking (need a backend); nutrition (no model yet).
