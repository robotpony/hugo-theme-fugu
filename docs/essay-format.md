# Essay format

An essay is a Markdown page in the essay section (`content/essays/` by default, `essaySection` in [configuration.md](configuration.md#sections)): longer writing about food that isn't a recipe. Like a recipe it's plain Markdown with YAML frontmatter, and reads the same in any editor and in Obsidian. Unlike a recipe, it has no required sections: Fugu lays it out for reading, and finds only a few headings by name.

## A minimal essay

```markdown
---
title: Why I cook by ratio
date: 2026-11-11
tags: [ratios]
description: "Weights, not cups, and what changed when I started thinking in them."
---

The first time a bread recipe failed me in a new kitchen, I blamed the oven.

## What a ratio is

…
```

`title` and `date` are required; `tags`, `description` and `draft` are recommended (`frontmatter.py check` warns without them). The other shared fields, `summary`, `working_on` and `pinned`, work as they do on recipes. The recipe fields (`servings`, the times, `cuisine`, `source`) are ignored. [frontmatter.md](frontmatter.md#essays-reference-pages-and-the-log) has them all.

## Folders are formats

An essay can sit at the top of the section or in a folder of it, one folder per kind of essay:

```
content/essays/
  _index.md                         the essays list: its title and tagline
  cooking-reflections/
    why-ratios.md
  food-memories/
    the-campsite-burger.md
```

The folder is the essay's format: its card shows the folder's name ("cooking reflections") in place of tags, and its sidebar lists the other essays in the same folder. An essay at the top of the section has no format on its card. The essays list (`/essays/`) shows every essay, folders and all, pinned ones first, then newest first, 16 a page; the `_index.md`'s `description` is its tagline.

Three folders have a job of their own, when the site sets them:

- **Reference essays** (`referenceEssays`, `reference-essays/` by default): an essay that defines one term. It's listed in the glossary, a `[[wiki link]]` to the term goes to it, and a principle tag links to it ([configuration.md](configuration.md#glossary-and-reference-essays)). Its `summary` or `description`, or else its first paragraph, is the glossary's definition, and its first sentence is the popover; an `also` list gives the term's other forms.
- **Methods** (`methods/` by default, unless `methodSection` gives them a section of their own): a page in it is a method, with a method chip, and a folder in it with an `_index.md` is a blueprint ([configuration.md](configuration.md#methods-and-blueprints), [frontmatter.md](frontmatter.md)).
- **The drafts page** (`[params.fugu.development] page`, such as `essays/test-kitchen`): the page the draft banner links to, which lists every draft.

## The page

An essay page has the article and, on desktop, a reading sidebar ([features.md](features.md#essays-reference-pages-and-the-log)):

- **The search box**, and the added and updated dates.
- **"On this page"**: the essay's `##` and `###` headings. On a phone, Blowfish's table of contents takes its place, if `showTableOfContents` is on.
- **The recipes the essay links to** with `[[wiki links]]`.
- **The other essays in its folder.**
- **Photos**, moved out of the text as thumbnails that open a viewer, leaving a "Photo 1" marker ([recipe-format.md](recipe-format.md#photos)).

Its card shows the format, the intro (`summary`, else `description`, else the first paragraph), and the reading time.

## Sections that move

Fugu finds a few `##` headings by name on every page with a sidebar, essays included, and moves them into the sidebar: **Notes**, **Mechanic**, **To serve**, **Variations**, and **Equipment**, by the titles in `[params.fugu.headings]` ([configuration.md](configuration.md)). Everything else stays in the article.

So an essay's `## Notes` becomes a sidebar box. If it's meant as part of the essay, mark it to stay:

```markdown
## Notes {.article}
```

It then stays in the essay and in "On this page" ([recipe-format.md](recipe-format.md#keeping-a-section-in-the-article)). Headings for the source only, like `## Draft notes #todo`, keep their tag in the file and lose it on the page ([recipe-format.md](recipe-format.md#vault-tags-on-a-heading)).

An essay isn't read for ingredients or a method: its lists stay plain lists, and quantities in it don't convert.

## Linking and diagrams

Everything a recipe's prose can do, an essay can too:

- **`[[Title]]` links** to any page by its title, and to glossary entries, with their popovers ([recipe-format.md](recipe-format.md#wiki-links)). Link the recipes an essay talks about this way, and they're listed in its sidebar.
- **Diagrams**: ```` ```formula ````, ```` ```stack ```` and ```` ```flow ```` blocks draw as they do in a recipe ([recipe-format.md](recipe-format.md#formula-diagrams)).
- **Principle tags**: an essay with a principle tag shows its chip, and is listed on the tag's page under "Reference & further reading".

## Drafts

`draft: true` publishes the essay with the draft banner when the site turns drafts on (`[params.fugu.development]`), and `working_on` says in one line what's still changing. `tools/drafts.py` lists them ([tools.md](tools.md)).

## House style (suggested)

None of this is checked; it's how Not a Chef writes its essays, offered as a starting point.

**Formats.** Four folders, each a different kind of piece:

- **Food memories**: a vignette from childhood or a formative meal, anchoring a lesson about cooking; nostalgia alone isn't enough.
- **Cooking reflections**: lessons from a technique, an ingredient, or a failure; ratios and post-mortems welcome.
- **Technique essays**: a deep dive on one method or principle (brining, emulsions, stock), reference material written as prose.
- **Planning essays**: meal prep, and systems for weeknight cooking.

**Shape.** No required sections, but most essays follow one:

1. An opening: a specific observation, scenario or image that grounds the piece.
2. The body: the argument, story or exploration, one idea per section.
3. A close: a landing point, practical or reflective, or the opening again with new weight.

**Headings** only when a reader needs to find their way: a piece under about 1000 words rarely does.

**Voice.** Personal and honest about mistakes, precise about what happened and why, with something the reader can take into their own kitchen.

**Essays, methods and glossary entries.** A story that leads to a method links to the method rather than becoming one. A term that needs a whole essay gets a reference essay; one that needs a sentence or two gets a glossary entry.
