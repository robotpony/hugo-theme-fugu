# Changelog

Notable changes to Fugu, newest first. Versions follow [semantic versioning](https://semver.org); until `v1.0.0`, a minor version can change how a site renders or what it has to configure. Each release is a git tag (`v0.1.0`, …). PLAN.md §10 says when the first one lands.

## Unreleased

### Added

- `params.fugu.recipeSidebar`: the recipe sidebar's section boxes, in order (`photos`, `to-serve`, `mechanic`, `variations`, `equipment`, `notes`). A key left out keeps that section in the article; an unknown key warns. The default is the old fixed order, so a site that doesn't set it renders the same.
- Formula strip on recipe cards: a page with a ```` ```formula ```` block shows its icons and operators (and a ratio's numbers) as a small row under the card's intro, with each ingredient's label, quantity, and swaps in a hover tooltip (`partials/formula-strip.html`). Cards with a strip get `.has-formula`; the site styles `.rcard-formula`, `.rcard-formula-link` and `.slot`.
- `tools/compare-builds.py`: builds a site with Fugu at a git ref and with the working tree, and lists every file that differs (whitespace ignored), so a theme change can't alter a site by accident.
- Fixture sites in `tests/sites/` (`recipes-only` and `everything`) and a GitHub Actions job that builds both with `--panicOnWarning` against Hugo 0.161.1 and Blowfish `e9699d8`.
- `tests/check.py`: builds every fixture site and checks its pages against its `expect.txt`; `--compare` also runs `compare-builds.py`. CI runs it. A third fixture, `renamed`, moves every section to a new name and is expected to fail until the templates read section names from config.
- `--help` for every tool, including `add-image.sh`.
- A scope statement in the README: only recipes are required.

### Changed

- `frontmatter.py` and `drafts.py` find the recipe, essay, reference, and log folders from the site's `[params.fugu]` (`recipeSection`, `essaySection`, `referenceSection`, `logSection`; `""` turns one off), with defaults in Fugu's new `hugo.toml`.
- `layouts/404.html` is gone. It was Not a Chef's text adventure and now lives in that site; other sites get Blowfish's 404.
- Header comments in every override now say what changed from Blowfish's copy and why, and comments no longer point at Not a Chef's mockups or its old plan.

## 2026-10-06: split from Not a Chef

Templates, render hooks, JS, formula icons, archetypes, and the content tools moved out of [Not a Chef](https://github.com/robotpony/not-a-chef) into this repo, unchanged. Not a Chef uses it as a git submodule at `themes/fugu`.
