# Plan

The work list for taking Fugu to a theme other Blowfish users can install. Finished items are removed as they land; `CHANGELOG.md` and git history record them (the last full plan is `75a3a89`, the last long one `183c807`, the last before `v0.1.0` `102abb1`, the last before `v0.2.0`'s squash `13b763a`, the last before the review and audit squash `5014763`). Section numbers are kept, since other files cite them.

**Release path:** `v0.1.0` (2026-10-17) and `v0.2.0` (2026-11-07) are tagged: installs by Hugo modules or submodules, checked by CI's install job. `v1.0.0` needs §5–§7 and §10's open items; the code review and Not a Chef's accessibility audit are done (CHANGELOG, Unreleased). Features come after 1.0.

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
- [ ] Left from the code review (2026-11-07) and the accessibility audit (2026-11-10), both otherwise done:
  - Wiki-link lookup cost: `render-link.html` and the reading sidebar scan every page per link. Measure build time before caching a title index.
  - Won't fix: the "Undated" and "Further reading" heading matches stay English; they read headings the author writes, so a translated site writes them in English or renames them in its content.
  - The comments citing `custom.css`, DESIGN.md, FORMAT.md and Not a Chef content, and `automagic-sidebar.js`'s note that its DOMContentLoaded handler runs first (script order does it), are §7's comments item.
- [ ] Scaled yields keep the singular: "1 loaf" at 2× reads "2 loaf" (`scaleYield` in `ingredients.js`, also the sidebar's Serves row). Pluralize the word after a scaled count, or have the frontmatter give both forms; check a range ("1–2 loaves") and words that don't take an s.
- [ ] Ingredient group labels skip a heading level: `recipe-format.md` puts `#### Dry` straight under `## Ingredients`, so 43 of Not a Chef's recipes go h2 → h4. In `render-heading.html`, render a group label that follows an h2 one level up (an `<h3 class="ing-subhead">`), keeping `####` in the source and the same look (`h3.ing-subhead`/`h4.ing-subhead` share their rules). A group inside a `###` component stays h4. The content skips (Food Log months, a reference page) went to the Not a Chef content agent, 2026-11-10.
- [ ] Retake the screenshots after §5 (`python3 tools/screenshots.py`).
- [ ] Tag `v1.0.0` after §5–§7 and the items above.
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
