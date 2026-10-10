# Fugu

A cookbook theme for [Blowfish](https://github.com/nunocoracao/blowfish). Fugu is an add-on, not a standalone theme: it sits on top of Blowfish and replaces the parts a cookbook needs, so Blowfish must be installed alongside it.

> **Work in progress, not released yet.** Fugu was split out of [Not a Chef](https://github.com/robotpony/not-a-chef) on 2026-10-06. It builds and works on a fresh site, with basic styles coloured from your Blowfish scheme; a designed default look comes later. See "Status" below.

## Scope

Fugu is a general cookbook theme. The only thing a site needs is recipes: a `recipes` section and the `tags` taxonomy. Everything else is optional and can be left out:

- Essays: longer writing about food, in their own section
- Reference pages: technique guides, ratio tables, and the like
- A dated log: a running kitchen notebook, one page per month
- A `cuisine` taxonomy, shown as a chip on recipe cards and pages
- A glossary, which `[[Term]]` links fall back to when no page has that title
- Principle tags: a tag with its own definition page and essay, gathering the recipes that follow it

Every section can be renamed in config (`dishes`, `writing`, …), and a part that's left out leaves no empty blocks, dead links, or zero counts behind.

## What it adds

Recipe pages with a sidebar for the Mechanic, To serve, Notes, and photos; ingredient check-off, scaling, and metric/imperial conversion; formula diagrams drawn from a ```` ```formula ```` block; `[[wiki links]]` as written in Obsidian; recipe cards; drafts published as "in development"; search; and a JSON index of every recipe. All the JavaScript is plain and dependency-free, and pages still read and print with it off. The full tour is [docs/features.md](docs/features.md).

Content tools live in `tools/`: `frontmatter.py` (check and edit frontmatter), `drafts.py` (list drafts), `add-image.sh` (prepare photos), and `compare-builds.py` (check a theme change doesn't alter a site's pages). The Python tools use the standard library only; every tool explains itself with `--help`.

## Install

The full walkthrough, from an empty site to a recipe page, is [docs/getting-started.md](docs/getting-started.md). In short, add Fugu and Blowfish as submodules:

```sh
git submodule add https://github.com/nunocoracao/blowfish.git themes/blowfish
git submodule add https://github.com/robotpony/hugo-theme-fugu.git themes/fugu
```

and list Fugu first, so it takes precedence:

```toml
# hugo.toml
theme = ["fugu", "blowfish"]
```

Fugu is tested against Blowfish `295dae3` and Hugo 0.166.0, and needs at least Hugo 0.163.0. Use a Hugo inside the range Blowfish declares, or Hugo warns on every build.

Hugo modules will become the recommended install before the first release, with submodules as the alternative (PLAN.md §6).

## Docs

- [Getting started](docs/getting-started.md): an empty site to one working recipe page
- [Recipe format](docs/recipe-format.md): sections, multi-component recipes, wiki links, formula diagrams, photos
- [Frontmatter](docs/frontmatter.md): every field Fugu reads
- [Configuration](docs/configuration.md): every `[params.fugu]` setting, and the Blowfish settings that matter
- [Features](docs/features.md): what Fugu adds, as a reader sees it

The index is [docs/README.md](docs/README.md). Still to come: customizing, tools, and Blowfish compatibility.

## Customizing

Hugo uses your site's files before Fugu's, and Fugu's before Blowfish's, so any layout or partial can be replaced by a file of the same name in your site. Fugu's own settings go under `[params.fugu]`, all with defaults ([configuration.md](docs/configuration.md)). To load web fonts, override `layouts/partials/fonts.html` (empty by default).

Run the tools from your site's root (or anywhere inside it), or set `FUGU_SITE_ROOT` to point them at a site from elsewhere:

```sh
python3 themes/fugu/tools/frontmatter.py check
python3 themes/fugu/tools/drafts.py
```

## Status

[PLAN.md](PLAN.md) is the work list; [CHANGELOG.md](CHANGELOG.md) records what's changed.

- [x] Templates, render hooks, JS, icons, archetypes, and tools moved out of Not a Chef
- [x] Section names, sidebar order, heading names, glossary, principle tags, and drafts configurable in `[params.fugu]`
- [x] Optional sections (essays, reference, log) and `cuisine` safe to leave out
- [x] Fixture sites and CI against pinned Hugo and Blowfish versions (`tests/`)
- [ ] Docs: five written; customizing, tools, and Blowfish compatibility to come
- [ ] English text moved into `i18n/` for translation
- [x] Basic styles that follow the site's Blowfish colour scheme, light and dark (`params.fugu.styles`)
- [ ] A default design of its own, with Not a Chef's CSS split into structure and look
- [ ] Hugo modules install, `exampleSite/`, screenshots, and the first release, `v0.1.0`

## Contributing

Fugu's changes are checked against the sites that use it, so they don't alter a page by accident. From inside a site using Fugu:

```sh
python3 themes/fugu/tools/compare-builds.py    # the site with Fugu at HEAD vs. the working tree
python3 themes/fugu/tests/check.py --compare   # that, plus every fixture site in tests/sites/
```

[tests/sites/README.md](tests/sites/README.md) describes the fixtures.

## Licence

MIT. Some templates are derived from Blowfish (`layouts/partials/head.html`, `layouts/_default/single.html`, `layouts/partials/article-meta/basic.html`, `layouts/partials/toc.html`, and others that override Blowfish files of the same name); Blowfish's licence and copyright notice are in `LICENSE-blowfish`.
