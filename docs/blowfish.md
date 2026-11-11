# Blowfish compatibility

Fugu is an add-on for [Blowfish](https://github.com/nunocoracao/blowfish), not a theme of its own: Blowfish draws the header, footer, home page, search and colour schemes, and Fugu adds the cookbook. This is what Fugu changes in Blowfish, the Blowfish settings that work differently with it, and how Fugu moves to a new Blowfish.

## Versions

Fugu is built and tested against one Blowfish commit, **`295dae3`** (2026-09-13), which declares Hugo 0.163.0 to 0.166.0. Fugu's `theme.toml` asks for Hugo 0.163.0 or newer, and CI builds with 0.166.0.

- With Hugo modules, Fugu's `go.mod` requires that Blowfish, so an install can't end up with an older one ([getting-started.md](getting-started.md)).
- With submodules, nothing checks: check out `295dae3` in `themes/blowfish` yourself.

A newer Blowfish may work, but Fugu's copies of its files (below) won't have its changes, and nothing warns about the gap. A Hugo outside Blowfish's range prints a warning on every build.

## The files Fugu replaces

Hugo uses the first file it finds, site, then Fugu, then Blowfish, so each of these hides Blowfish's own. Fifteen are full copies of a Blowfish file with Fugu's changes; each says what changed in its opening comment. All of them match Blowfish `295dae3`.

| File | What Fugu changes, and why |
|---|---|
| `_default/single.html` | Wiki links rewritten to Markdown links before rendering. Recipes get the recipe sidebar instead of the table of contents; essays, reference pages and the log get the reading sidebar on desktop. Loads the recipe scripts, and the draft banner. On recipes, the author block, sharing links and related content go below both columns, so on a phone they can't land between the method and the sidebar. |
| `_default/term.html` | A term page (`/tags/x/`, `/cuisine/x/`) is laid out as the recipes list: title, tagline, recipe cards, 16 a page, pinned first. Principle tags and the methods list get their own layouts. |
| `_default/terms.html` | A term list (`/tags/`) is a plain list with counts (`.browse-list`) instead of Blowfish's cards. |
| `_default/index.json` | The search index adds `pinned`, and leaves out pages without a URL of their own (glossary entries). |
| `_default/rss.xml` | Drafts are left out of every feed, an empty feed has no `lastBuildDate` (which failed the build), and a blueprint's feed includes its parts and builds. |
| `_default/_markup/render-heading.html` | Marks recipe sections for the scripts (ingredients, method, sidebar sections), renders an ingredient group label under an h2 as h3, names each "#" link for its section and shows it on keyboard focus, and leaves trailing vault tags off. |
| `_default/_markup/render-image.html` | Every image is a `<figure>` the sidebar's photo viewer can take, with a 480px thumbnail and a display copy up to 1600px; SVG and GIF pass through. |
| `_default/_markup/render-link.html` | Resolves `[[Title]]` links by page title, draws glossary links with their popover, and marks unresolved ones. Other links are written as given, and every http(s) link opens in a new tab. |
| `partials/head.html` | Bundles `fugu.css` between Blowfish's CSS and the site's `custom.css`; calls `partials/fonts.html`; one meta description per page, used by the Open Graph and Twitter tags too; a page's feed link points at its section's feed; loads the popover script and the script strings; and fixes `disableImageZoom`, which Blowfish never turned off. |
| `partials/article-meta/basic.html` | The tags row: cuisine, principle, method and blueprint chips, plain tags worded as the cards word them, and no draft badge (the banner replaces it). The date and reading-time row is Blowfish's. |
| `partials/article-pagination.html` | Previous and next as a divided section with labels and arrows, without dates. A blueprint's parts and builds get part navigation instead. |
| `partials/breadcrumbs.html` | A section with no page of its own gets no crumb (Blowfish linked it with an empty `href`), and the trail is a named `<nav>` with `aria-current`. |
| `partials/pagination.html` | Page numbers as pills with a real target size, and a spacer that always renders so a one-page list doesn't touch the footer. Which numbers show is Blowfish's logic. |
| `partials/related.html` | Related content in its own divided section, as recipe cards on every page type. |
| `partials/toc.html` | A "Jump to" label over the desktop table of contents, and trailing vault tags left off its links. |

And three more files:

- **`assets/js/search.js`**, a full copy of Blowfish's: pinned pages first among results, every Fugu search box opens the search, the index loads once, the results are read out to screen readers, and the words come from Fugu's `i18n`.
- **`archetypes/default.md`**: a YAML archetype instead of Blowfish's, which Title Cases the title.
- **`assets/css/fugu.css`** isn't a copy, but it restyles some of Blowfish's own markup: the `<main>` column and its side gutters, the search panel's background, the page title, and the table of contents.

Fugu's other layouts (`recipes/`, `essays/`, `methods/` and the rest) are its own, for sections Blowfish doesn't know.

### Why copies, not Blowfish's hooks

Blowfish has two hooks for adding to every page, `partials/extend-head.html` (the end of `<head>`) and `partials/extend-footer.html` (the end of the footer). Fugu leaves both to your site, empty, and works through copies instead:

- **They're one file each, and they're yours.** Hugo uses the site's file first, so if Fugu put its fonts call, stylesheet or scripts in `extend-head.html`, a site with its own would replace Fugu's, and lose them without an error.
- **Order matters, and the hook comes last.** `fugu.css` has to sit between Blowfish's CSS and your `custom.css`, in the one bundle `head.html` builds, so your rules win. The meta description, social tags and feed link replace Blowfish's own lines in the middle of `<head>`. Neither can be done from the end of it.
- **The rest change markup in the middle of a template** (the recipe page's two columns, the tags row, a term page's cards), where Blowfish has no hook at all.

So a site can still use both hooks exactly as Blowfish's docs describe. When a Blowfish release adds a hook that would let a copy go, the upgrade (below) is the time to switch to it.

## Blowfish settings that work differently

Most of Blowfish's settings work as its [docs](https://blowfish.page/docs/configuration/) say. These don't, because one of the files above replaces the code that read them:

| Setting | With Fugu |
|---|---|
| `article.relatedContentLimit` | Required when `article.showRelatedContent` is on: Fugu's `related.html` fails the build without it. |
| `article.showDraftLabel` | Turns on the draft banner under the title, not Blowfish's badge. |
| `article.externalLinkForceNewTab` | Ignored: every http(s) link opens in a new tab. |
| `article.showTableOfContents` | Recipes never show it (they have the sidebar). Essays, reference pages and the log show it on phones only, where the reading sidebar doesn't fit. Other pages show it as Blowfish does. |
| `seo.metaDescriptionOrder` | Ignored: the description is the frontmatter's `description`, else the page's intro, else a fallback by kind of page. |
| `disableImageZoom` | Works: `true` turns zoom off, which in Blowfish `295dae3` it didn't. Pages with a sidebar never zoom; the photo viewer replaces it. |
| `disableImageOptimizationMD` | Ignored: Markdown images always get a thumbnail and a display copy, from images Hugo can process. |
| `term.showHero`, `term.heroStyle`, `term.showBreadcrumbs`, `term.cardView`, `term.cardViewScreenWidth`, `term.groupByYear` | Ignored on term pages: they're laid out as the recipes list. |
| `taxonomy.cardView` | Ignored: every term list is a plain list. |

Two Blowfish quirks that are easy to trip on, Fugu or not:

- `footer.showAppearanceSwitcher` controls the light/dark toggle in the **header** menu; Blowfish's footer never reads it.
- Blowfish's `<body>` has the classes `bg-neutral dark:bg-neutral-800`, and every Blowfish scheme sets `--color-neutral` to white, so the page background is white (or `neutral-800` in dark mode) whatever the scheme. To change it, set `body { background-color: … }` in your `custom.css`, and `--fugu-bg` to the same colour: Fugu uses it where a mark has to look cut out of the page (the open dots on a lineage timeline).

The header, footer and home page (`homepage.layout`, `header.layout`) are entirely Blowfish's: Fugu has no layout for them, so Blowfish's docs cover them, and a site that wants its own overrides Blowfish's file.

## Moving to a new Blowfish

For Fugu's maintainers. Move Hugo and Blowfish together, since each Blowfish release declares the Hugo versions it supports.

1. **Build before.** From Not a Chef's root (or another site using Fugu), build with the current Blowfish: `hugo --quiet -d /tmp/before`.
2. **Move only the submodule** (`cd themes/blowfish && git checkout NEW`) and build again into `/tmp/after`. Compare the two with `python3 themes/fugu/tools/compare-builds.py /tmp/before /tmp/after`: what changes here is Blowfish's own doing, before Fugu's copies catch up.
3. **List the copied files that changed upstream:** `git diff --stat OLD NEW -- layouts/_default/single.html …` in Blowfish, over the files in the table above and `assets/js/search.js`.
4. **Bring each change into Fugu's copy.** `git diff OLD NEW -- <file>` in Blowfish, then apply it to Fugu's copy with `patch`, by hand where a hunk touches lines Fugu changed. A change to a file Fugu rewrote (`terms.html`, `term.html`) may not apply at all; say so in the commit.
5. **Check the look.** `python3 tools/compare-styles.py --open` from the site, and in Chrome at desktop and phone widths, light and dark, measure the boxes of anything the diff touched with `getBoundingClientRect()`.
6. **Rebuild everything else:** `python3 tests/check.py --compare` (the fixture sites and the example site), and the tests in `tests/`.
7. **Update the pins:** `go.mod` (`hugo mod get github.com/nunocoracao/blowfish/v3@NEW`), `theme.toml`'s `min_version` if Blowfish's minimum moved, CI's `HUGO_VERSION` and `BLOWFISH_REF` (`.github/workflows/build.yml`), this page's Versions section, `CLAUDE.md`'s "Blowfish overrides", and a CHANGELOG line naming the copies that took changes.
