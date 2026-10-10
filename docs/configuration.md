# Configuration

Fugu's settings live under `[params.fugu]` in the site's config. Every one has a default (in Fugu's own `hugo.toml`, which Hugo merges under the site's), so a site sets only what it wants to change. An English-language site with the default section names can set nothing at all.

A setting given as a list replaces Fugu's list rather than adding to it: `notes = ["Tips"]` means "Tips" is the notes heading and "Notes" no longer is.

## Site config Fugu needs

The minimum, from [getting-started.md](getting-started.md):

```toml
theme = ["fugu", "blowfish"]

[taxonomies]
  tag = "tags"

[params]
  mainSections = ["recipes"]
```

These Blowfish and Hugo settings also matter:

| Setting | Why |
| --- | --- |
| `[outputs] home = ["HTML", "RSS", "JSON"]` and `params.enableSearch = true` | Search. Fugu's search script reads the home page's JSON index. |
| `[taxonomies] cuisine = "cuisine"` | Turns on cuisine chips and pages (below). |
| `params.article.showDraftLabel = true` | The banner on draft pages (below). |
| `params.article.relatedContentLimit` | Required when `showRelatedContent` is on: without it Fugu's related-content partial fails the build. |
| `enableGitInfo = true` | The **Updated** date in sidebars, from each file's last commit. |
| `buildDrafts = true` | Publishes drafts, which Fugu shows as pages still in development, and keeps out of feeds. |
| `params.recipe.enableKelvin = true` | Adds Kelvin to the temperature units. Off by default; it's a joke more than a feature. |

## Sections

```toml
[params.fugu]
  recipeSection = "recipes"
  essaySection = "essays"
  referenceSection = "reference"
  logSection = "the-food-log"
```

Each is a folder under `content/`. Only recipes is required. A section with no pages already shows nothing, so a site without essays doesn't have to set anything; set a section to `""` when the folder exists but isn't meant as that section.

To rename a section, set its folder here and also set `type` in that section's `_index.md` to the default name, so Hugo finds Fugu's list layout for it:

```toml
[params.fugu]
  recipeSection = "dishes"
```

```yaml
# content/dishes/_index.md
---
title: Dishes
type: recipes
outputs: [HTML, RSS, JSON]
---
```

What each section is for:

- **Recipes**: the cookbook. See [recipe-format.md](recipe-format.md).
- **Essays**: longer writing about food, with the reading sidebar (search and an "On this page" list). Essays can sit in subfolders (`essays/cooking-reflections/why-ratios.md`); a card shows its subfolder's name as its tag.
- **Reference**: technique guides, ratio tables, and the glossary page.
- **Log**: a dated kitchen notebook, one page per month. Name each file by year and month, `2026-September.md`, title it in the frontmatter ("September 2026"), and give each day a `##` heading. The list sorts by file name, newest first. A year without dates can use season files instead (`2024-Fall.md`), and an `## Undated` heading holds entries without a day.

## Cuisines

Add the taxonomy to show cuisines:

```toml
[taxonomies]
  tag = "tags"
  cuisine = "cuisine"
```

A recipe's `cuisine` then shows as a chip on its card, linking to a page of every recipe from that cuisine. A cuisine's own `content/cuisine/<slug>/_index.md` can set `short` for a shorter label on cards ([frontmatter.md](frontmatter.md#taxonomy-terms)). Without the taxonomy, any `cuisine` values still show on cards, as plain text.

## Glossary and reference essays

`[[Wiki links]]` that don't match a page title can fall back to a glossary, in two tiers:

```toml
[params.fugu]
  referenceEssays = "reference-essays"
  glossaryPage = "glossary"
```

- **Reference essays**: essays in this subfolder of the essay section (`content/essays/reference-essays/`) are full definitions of a term. A wiki link to one shows a popover with its `summary` (or `description`) as well as linking to it.
- **The glossary page**: a page with this name in the reference section (`content/reference/glossary.md`), whose `##` headings are short entries. A wiki link that matches no page title, but matches one of its headings, shows that entry in a popover.

```markdown
---
title: Glossary
---
## Kewpie mayonnaise

Japanese mayonnaise made with egg yolks and rice vinegar.
```

Set either to `""` to turn it off. A link that matches neither is shown as broken.

## Principle tags

No settings: a tag becomes a principle when its own `_index.md` says `principle: true`. See [frontmatter.md](frontmatter.md#principle-tags).

## Recipe headings

How Fugu reads a recipe's `##` headings, by their whole title. Matching ignores case and a trailing colon.

```toml
[params.fugu.headings]
  method = ["Method", "Directions", "Steps"]
  mechanic = ["Mechanic"]
  to-serve = ["To serve"]
  variations = ["Variations"]
  notes = ["Notes"]
  equipment = ["Equipment", "Special equipment", "Hardware"]
  hidden = ["History"]
  notIngredients = ["method", "directions", "steps", "notes", "serve", "variations", "timing", "example", "examples", "rules", "equipment", "hardware", "substitutions", "mechanic", "history"]
```

| Key | Meaning |
| --- | --- |
| `method` | Method prose: its quantities and temperatures are marked so they convert with the ingredients. |
| `mechanic`, `to-serve`, `variations`, `notes`, `equipment` | Sections that can move to the sidebar (`recipeSidebar`, below). |
| `hidden` | Sections hidden from readers. Still in the HTML, so not private. `[]` hides none. |
| `notIngredients` | Words, not whole titles. Any other heading is an ingredient section (a component of the recipe) unless one of its words is in this list. |

This is also how a site in another language names its sections: `method = ["Préparation"]`, and so on. Unit conversion still only understands English unit words.

## The recipe sidebar

```toml
[params.fugu]
  recipeSidebar = ["photos", "to-serve", "mechanic", "variations", "equipment", "notes"]
```

The boxes in the recipe sidebar, top to bottom, under the search box and the recipe's facts. Each key moves the matching section (or, for `photos`, the page's images) out of the article and into the sidebar. Leave a key out to keep that section in the article. With JavaScript off, everything stays in the article.

## Personal notes

```toml
[params.fugu]
  hideIntroQuotes = true
```

Hides blockquotes in a recipe's intro, the text before its first `##`. They're for notes to yourself or your family. Hidden is not private: they're still in the HTML, the search index, and the RSS feed. `false` shows them. To hide whole sections, see `hidden` above.

## Drafts

For a site that builds drafts, Fugu publishes them as pages still in development, with a banner and a mark on their cards ([frontmatter.md](frontmatter.md#draft-and-working_on)). The words are settings:

```toml
[params.fugu.development]
  label   = "In development"
  short   = ""
  message = "This recipe is still changing. Cook it, change it, and expect it to move before it becomes canon."
  hover   = "Published while it's still being worked out. It works, but the next version will be a little different."
  note    = "Working on"
  page    = ""
  more    = "How this works"
  heading = "In development now"
  empty   = "Nothing is in development right now."
  icon    = ""
```

| Key | What it is |
| --- | --- |
| `label` | The name for a draft, in the banner and the card's popover. |
| `short` | The card chip's label, when `label` is too long for a card. `""` uses `label`. |
| `message` | The banner's sentence. |
| `hover` | The card popover's text. |
| `note` | The label before a page's `working_on` line. |
| `page` | A page that explains drafts, as a content path (`essays/test-kitchen`). The banner and card mark link to it, and it lists every draft under `heading`, in place of its related content. `""` means no link and no list. |
| `more` | The link text to that page. |
| `heading`, `empty` | That page's list heading, and what it says when there are no drafts. |
| `icon` | An SVG in the site's `assets/` to use as the mark (`icons/development.svg`), inlined so it takes the text colour. `""` draws a dot. |

The banner also needs `showDraftLabel = true` under `[params.article]`.

Drafts never appear in RSS feeds (the site's, a section's, or a tag's), so subscribers only get finished pages. `[services.rss] limit` counts the pages left after drafts are taken out.

## Styles

```toml
[params.fugu]
  styles = true
```

Fugu's stylesheet, `assets/css/fugu.css`, styles everything Fugu adds, coloured from your Blowfish `colorScheme`, light and dark. It loads after Blowfish's CSS and before your `assets/css/custom.css`, so your rules win. To change the colours alone, set the `--fugu-*` custom properties at the top of the file in your `custom.css` (under `:root`, and `.dark` for dark mode). `false` leaves it out, for a site that styles every class itself.

## Fonts

Fugu loads no web fonts. To add some, override `layouts/partials/fonts.html` in your site; it's included in every page's `<head>` and is empty by default.
