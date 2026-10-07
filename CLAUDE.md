# CLAUDE.md

Guidance for Claude Code working in this repository.

## Project

Fugu (`hugo-theme-fugu`) is a cookbook theme for the Blowfish Hugo theme. It's an add-on, not a standalone theme: sites list it before Blowfish, `theme = ["fugu", "blowfish"]`, and Hugo looks up every layout, partial and asset in the site first, then Fugu, then Blowfish.

It was split out of Not a Chef (https://github.com/robotpony/not-a-chef) on 2026-10-06 and still carries that site's assumptions. **PLAN.md is the work list**: making the theme generic, its own design, docs, an example site, and release. Read it before starting, and tick items off (with the date and a short note) as they land.

## Where it's developed

This repo is checked out as a git submodule at `themes/fugu` inside Not a Chef, usually at `/Users/mx/writing/not-a-chef/themes/fugu`. Not a Chef is the only site using Fugu until `exampleSite/` exists (PLAN.md §9), so it's the test bed:

- Build from the site root, `../..`: `hugo --quiet -d <out>`. Run a dev server with `hugo server -D` there.
- Not a Chef keeps its own design and branding as site-level files: `assets/css/custom.css` (which styles every class Fugu emits, for now), the `not-a-chef` colour scheme, `layouts/index.html`, `layouts/partials/header/basic.html`, `footer.html`, `favicons.html`, and `fonts.html`. Don't edit those from here unless a Fugu change needs a matching site change; if so, say so and make it a separate commit in that repo.

## The rule: don't change Not a Chef by accident

Not a Chef must render exactly as before unless a change means to alter it. For any template, JS, or CSS change:

1. Build the site before the change into a scratch folder.
2. Make the change, build again into a second folder.
3. Compare every file, ignoring whitespace (e.g. a short Python script that strips `\s+` from both and compares). The only differences should be the ones intended.

For visual changes, also check in Chrome (not Safari) at desktop and phone widths, in light and dark mode. Measure rendered boxes with `getBoundingClientRect()` rather than trusting computed styles: earlier layout bugs on this site passed every grep and build check and were only caught by looking.

After any edit while `hugo server -D` is running, restart it before trusting page counts: its live-reload rebuild has been seen to drop draft pages.

## Layout

- `layouts/`: page templates, render hooks (`_default/_markup/`), partials. 14 of these are full copies of Blowfish files with changes (listed in PLAN.md §6); comments at the top of each explain why.
- `assets/js/`: plain, dependency-free, progressive JS. `ingredients.js` (check-off, scaling, unit conversion), `automagic-sidebar.js` (moves Mechanic/To serve/Notes/photos into the sidebar, photo viewer), `search.js` (Fuse.js search, pinned results first). Pages must still read and print with JS off.
- `assets/icons/formula/`: the formula diagram icon kit, one SVG per key.
- `archetypes/`: `recipes.md` and the default.
- `tools/`: `frontmatter.py`, `drafts.py` (Python standard library only), `add-image.sh` (ImageMagick 7 and `exiftool`). They work on the Hugo site containing the working directory, or `$FUGU_SITE_ROOT`.

## Content the theme expects

Recipes follow Not a Chef's `FORMAT.md` (in that repo, until PLAN.md §7 brings a site-neutral copy here): YAML frontmatter with `title` and `tags`; `## Ingredients` and `## Method`, or one heading per component; optional `## Mechanic`, `## To serve`, `## Variations`, `## Notes`; `[[wiki links]]`; optional ```` ```formula ```` blocks.

## Conventions

- Match the surrounding code: Hugo template comments in `{{/* */}}` at the top of each file explaining why it exists, plain JS without a build step.
- Canadian English in docs and comments. Short declarative commit messages that state the purpose (e.g. "Moves the section names into params."). Don't add Claude as a co-author.
- Commit finished work without waiting to be asked. Pushing, tagging releases, and anything published elsewhere need the user's go-ahead.
- Keep the licence notes intact: Fugu is MIT; files derived from Blowfish keep Blowfish's notice (`LICENSE-blowfish`).
- After pushing here, the Not a Chef repo needs its submodule pointer bumped (`git add themes/fugu` there) for the site to pick up the change.
