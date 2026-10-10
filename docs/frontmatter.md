# Frontmatter

Every frontmatter field Fugu reads, and what it changes. Fields are YAML, between `---` lines at the top of the file. Anything Fugu doesn't list here is left alone, so a site can keep its own fields; Blowfish's per-page fields (`showTableOfContents` and the like) still work too.

`hugo new content recipes/<name>.md` starts a recipe with every recipe field below, from Fugu's archetype.

## Recipes

```yaml
---
title: Dal tadka
tags: [soups, weeknight, vegetarian]
date: 2026-05-02
source: original
cuisine: Indian
servings: 4
prep_time: 10 min
cook_time: 25 min
---
```

| Field | Type | What it does |
| --- | --- | --- |
| `title` | string | The recipe's name. Also what `[[wiki links]]` match against, so keep titles unique. |
| `tags` | list of strings | Shown on the page and its card (a card fits two, fewer when it also shows a cuisine or a draft mark), and each one gets a term page. Plain words, no `#`. |
| `date` | date | `YYYY-MM-DD`, the date it was added. Shown as **Date** in the sidebar. **Updated** appears beside it when the page's last-modified date falls on a different day: from git with Hugo's `enableGitInfo`, or from a `lastmod` field. |
| `source` | string | The **Source** row in the sidebar. A URL (`https://…` or a bare `www.example.com/…`) becomes a link showing just its domain; anything else (`original`, `family`, a book title) shows as written. |
| `aka` | string | Other names for the dish: the **Aka** row in the sidebar. |
| `author` | string | The **Author** row, for a recipe by someone other than the site's author. |
| `servings` | number or string | How many people it feeds: `4`, `4–6`, `12+`. The **Serves** row; numbers and ranges scale along with the ingredients. |
| `portions` | string | What a batch makes when that isn't people: `1 loaf`, `2 pans`, `~500 ml`. The **Makes** row; scales like `servings`. |
| `prep_time`, `cook_time`, `total_time` | string | The **Prep**, **Cook**, and **Total** rows, as written: `20 min`, `~2 hr`, `20 min (plus an overnight rest)`. |
| `cuisine` | string, or a list | A chip on the card linking to its term page. Needs the `cuisine` taxonomy in the site config (below); without it, the chip is plain text. Only the first one shows on a card. |
| `summary` | string | The text on the recipe's card, in place of the intro's first paragraph. |
| `description` | string | The page's meta description and social preview text. Also the card text when there's no `summary`. Without either, both come from the intro. |
| `draft` | boolean | See below. |
| `working_on` | string | See below. |
| `pinned` | boolean | See below. |

The sidebar shows each row only when its field is set; nothing is filled in for you.

### `draft` and `working_on`

`draft: true` normally keeps a page out of the build. Fugu treats a draft as published but still changing, for sites that build drafts (`buildDrafts = true` in the config, or `hugo server -D`):

- A banner under the title saying the recipe is still changing, when the site sets `showDraftLabel = true` under `[params.article]`.
- A mark on its card, with a popover explaining it.
- `working_on: Less cumin, more tadka` adds that line to the banner and the popover.

The words come from `[params.fugu.development]` ([configuration.md](configuration.md)). New recipes from the archetype start as drafts; delete `draft` when a recipe is done.

Without `buildDrafts`, drafts behave as Hugo normally treats them: they aren't built at all.

### `pinned`

`pinned: true` floats a page to the top of its section's list, of its tag and cuisine pages, and of search results, and puts a pin on its card. It works on recipes and on any other page. Keep it rare: it's for the two or three pages a reader should find first, not a general sort order.

## Taxonomy terms

A tag or cuisine can have its own page, `content/tags/<slug>/_index.md` (or `content/cuisine/<slug>/_index.md`), to give its term page a title and text.

| Field | On | What it does |
| --- | --- | --- |
| `title` | any term | The term's display name. |
| `description` | any term | Text under the title on the term page. |
| `short` | cuisine, principle tag | A shorter label for cards: `short: TH` for "Thai". The full name is still on the term page and in the chip's tooltip. |
| `principle` | tag | `true` makes the tag a principle (below). |
| `essay` | principle tag | The page that explains the principle, as a content path: `essays/reference-essays/win-the-fridge`. |

### Principle tags

A principle is a tag that names an idea several recipes follow, such as using up what's in the fridge. With `principle: true`:

- Its term page shows the `_index.md` body as a definition, then the recipes that follow it, then everything else on the tag under "Reference & further reading".
- Recipes carrying the tag show it as a chip (the `short` label) instead of a plain tag.
- The chip and term page link to its essay: the page named by `essay`, or else the first reference essay with the tag ([configuration.md](configuration.md), `referenceEssays`).

```yaml
---
title: Win the fridge
principle: true
short: WTF
description: Recipes built around what's already in the fridge.
---
Win the fridge is the practice of using what you have before it goes to waste.
```

## Pages at the site's root

A page directly in `content/`, such as `content/about.md`, gets the reading sidebar, which can show:

| Field | Type | What it does |
| --- | --- | --- |
| `stats` | boolean | `true` adds "The cookbook in numbers": counts of recipes, and of cuisines, essays, and reference guides when the site has any. |
| `start_here` | list of strings | A "Start here" list of hand-picked pages, by title, matched the same way as wiki links. |

```yaml
---
title: About
stats: true
start_here:
  - Plain rice
  - Dal tadka
---
```

## Essays, reference pages, and the log

These use the same `title`, `tags`, `date`, `description`, `summary`, `draft`, `working_on`, and `pinned` fields as recipes, with the same effects. The recipe-only fields (`servings`, the times, `source`, and so on) are ignored on them.

A reference essay's `summary` (or `description`) is what its glossary popover shows when a `[[wiki link]]` points at it.

## In `recipes/index.json`

When the recipes section's `_index.md` sets `outputs: [HTML, RSS, JSON]` (JSON is the part that matters here), Fugu writes `/recipes/index.json`, one entry per recipe, with `title`, the file's slug, `date`, `tags`, `cuisine`, `servings`, `portions`, `source`, `prep_time`, `cook_time`, `draft`, `working_on`, a word count, and flags for whether the recipe has a Mechanic, Variations, Notes, or a formula diagram. It's meant for scripts and tools that ask questions about the whole collection.
