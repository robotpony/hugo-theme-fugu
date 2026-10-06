# Fugu

A cookbook theme for [Blowfish](https://github.com/nunocoracao/blowfish). Fugu is an add-on, not a standalone theme: it sits on top of Blowfish and replaces the parts a cookbook needs, so Blowfish must be installed alongside it.

> **Work in progress.** Fugu was split out of [Not a Chef](https://github.com/robotpony/not-a-chef) and is not ready for other sites yet. Its templates still assume that site's section names and rely on that site's CSS. See "Status" below.

## What it adds

- Recipe pages with a sidebar for the Mechanic, To serve, Notes, and photos
- Ingredient check-off, scaling, and metric/imperial unit conversion, all client-side and dependency-free
- Formula diagrams: a ```` ```formula ```` code block drawn as a row of icons
- `[[Wiki links]]` between pages, as written in Obsidian
- Recipe cards for listings, tag pages, and search
- Content tools in `tools/`: `frontmatter.py` (check and edit frontmatter), `drafts.py` (list drafts), `add-image.sh` (prepare photos). Python standard library only.

## Install

Add Fugu and Blowfish as submodules, then list Fugu first so it takes precedence:

```sh
git submodule add https://github.com/nunocoracao/blowfish.git themes/blowfish
git submodule add https://github.com/robotpony/hugo-theme-fugu.git themes/fugu
```

```toml
# hugo.toml
theme = ["fugu", "blowfish"]
```

Run the tools from your site's root (or anywhere inside it):

```sh
python3 themes/fugu/tools/frontmatter.py check
python3 themes/fugu/tools/drafts.py
```

Set `FUGU_SITE_ROOT` to point them at a site from elsewhere.

## Customizing

Hugo uses your site's files before Fugu's, and Fugu's before Blowfish's. To load web fonts, override `layouts/partials/fonts.html` (empty by default).

## Status

- [x] Templates, render hooks, JS, icons, archetypes, and tools moved out of Not a Chef
- [ ] Section names and site-specific features moved into params
- [ ] Optional sections (essays, reference, log) and `cuisine` safe to leave out
- [ ] A default design, so Fugu works without Not a Chef's CSS
- [ ] Recipe format documentation
- [ ] `exampleSite/` and CI against a pinned Blowfish

## Licence

MIT. Some templates are derived from Blowfish (`layouts/partials/head.html`, `layouts/_default/single.html`, `layouts/partials/article-meta/basic.html`, `layouts/partials/toc.html`, and others that override Blowfish files of the same name); Blowfish's licence and copyright notice are in `LICENSE-blowfish`.
