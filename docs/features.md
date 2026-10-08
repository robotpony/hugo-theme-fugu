# Features

What Fugu adds to a Blowfish site, as a reader sees it. How to write each part is in [recipe-format.md](recipe-format.md) and [frontmatter.md](frontmatter.md); how to turn parts on, off, or rename them is in [configuration.md](configuration.md).

Everything here is built from plain Markdown. The interactive parts are small scripts with no dependencies, and every page still reads and prints with JavaScript off (see the end of this page).

## Recipe pages

A recipe page has two columns: the recipe itself, and a sidebar beside it.

The sidebar holds, top to bottom:

- The search box.
- The recipe's facts, from its frontmatter: Source, Aka, Serves, Makes, Prep, Cook, Total, Author, and the dates it was added and last updated. Only the ones a recipe sets are shown. A `source` that's a URL shows as a link to its site.
- The boxes the script moves out of the article: photos, To serve, Mechanic, Variations, Equipment, and Notes, in the order `recipeSidebar` sets. Empty boxes don't show.

That leaves the article with the intro, the ingredients, and the method, so the part you cook from is the part you scroll. On a phone the sidebar sits above the ingredients, closed behind a "Recipe notes" toggle.

Sections Fugu hides (`## History` by default) and blockquotes in the intro are hidden from readers but are still in the page's HTML. See [configuration.md](configuration.md#personal-notes).

### Photos

Photos written into the text are gathered into the sidebar as thumbnails (on a phone, a strip under the title), with a small "Photo 1" marker left where each one was. A thumbnail opens a viewer with the caption, the heading the photo sat under, and a link back to that spot in the text. Arrow keys step through the photos.

## Ingredients

Each line of an ingredient list gets a checkbox, so you can tick things off as you measure them. Ticks are saved in the browser, per recipe, and are still there when you come back.

The quantity at the start of each line is picked out, and a menu beside the first ingredients heading changes it:

- **Scale**: from 1× to 5×, in half steps. Every quantity on the page changes, including those in the method, and so do the Serves and Makes figures when they're numbers (`4`, `3–4`, `about 1.5 L`). A range widens outward rather than claiming more precision than the recipe has: 3–4 at 1.5× reads 4–6. Words such as "a pinch" don't scale.
- **Units**: As written, Metric, or Imperial. A line that gives both measures, `250 ml (1 cup)`, swaps which one leads. Temperatures in the method convert too, so `180°C` reads `350°F` in imperial.

The scale is saved per recipe; the unit choice is saved once for the whole site, since it's a reader's preference rather than a recipe's. A multi-component recipe has one menu that covers every component.

Conversion understands English unit words only (cups, tbsp, ounces, grams, and so on). An optional Kelvin setting exists, mostly as a joke: `params.recipe.enableKelvin`.

## Formula diagrams

A ```` ```formula ```` block draws a ratio or method as a row of icons, with a label, a quantity, and swaps under each one ([recipe-format.md](recipe-format.md#formula-diagrams)). It appears in two places:

- **On the recipe page**, full size, where the block was written. A `:` ratio can add a bar showing the proportions.
- **On the recipe's card**, as a small strip of the icons and operators. For a ratio it keeps the numbers, since they're the point. Hovering a slot shows its label, quantity, and swaps.

The build warns about an icon name it doesn't know (and draws a dashed circle for it), a block that mixes operators, and a block with more than five slots.

### The icon kit

The icons are SVGs in `assets/icons/formula/`, one per name: bowl, butter, can, carrot, cheese, clock, crumbs, cup, egg, flame, flour, oil, onion, pan, patty, pot, potato, salt, water. A site adds icons, or replaces Fugu's, by putting SVGs with those names in its own `assets/icons/formula/`. Icons are drawn in `currentColor`, so they follow the text colour in light and dark mode.

## Wiki links and the glossary

`[[Title]]` links any page to any other by its title, as in Obsidian, so a recipe's ingredient list can link to the recipe for its sauce ([recipe-format.md](recipe-format.md#wiki-links)).

When no page has that title, the link can fall back to a definition:

- A link to a **reference essay** shows its summary in a popover, as well as linking to the essay.
- A link that matches a heading in the **glossary page** shows that entry in a popover.
- A link that matches nothing is marked as broken, so it's easy to find.

Popovers open on hover or keyboard focus, flip to whichever side of the window has room, and close with Escape. Setting up the glossary is in [configuration.md](configuration.md#glossary-and-reference-essays).

On essays and reference pages, the recipes a page links to are also listed in its sidebar.

## Cards and listings

The recipes list, tag and cuisine pages, the essay and reference lists, and the log list all use the same card. A recipe card shows:

- A top row of chips: the cuisine (linking to its page), any principle tag, then tags, with a count of the rest.
- The recipe's intro paragraph, or its frontmatter `summary` or `description`.
- The formula strip, if the recipe has a formula block.
- One line of facts: prep and cook times and servings, shortened to fit (`20m`, `1h`).

An essay card shows its folder (food memories, technique essays) in place of tags, and its reading time. A log card shows the month's opening paragraph and its number of days.

Tag and cuisine pages list 16 recipes to a page. A cuisine page is titled "Thai cuisine" rather than just "Thai". A tag or cuisine with its own `_index.md` can give its page a description, and the cuisine a shorter label for cards ([frontmatter.md](frontmatter.md#taxonomy-terms)).

## Pinned pages

`pinned: true` puts a page first: at the top of its section's list, of its tag and cuisine pages, and of search results, with a pin on its card. It's meant for a few pages that a reader should find first, not as a general way to sort ([frontmatter.md](frontmatter.md#pinned)).

## Principle tags

A tag can name an idea that several recipes follow, such as cooking from what's already in the fridge. Marked as a principle, the tag:

- Shows its definition in a callout at the top of its page, with a link to the essay that explains it.
- Lists only recipes in its grid, and everything else on the tag (essays, reference pages) under "Reference & further reading".
- Shows as a chip on recipe cards and pages, with a popover that gives the definition.

Setting one up is in [frontmatter.md](frontmatter.md#principle-tags).

## Drafts

For a site that builds drafts, a draft is published as a page still in development, not hidden: a banner under its title, a mark on its card with a popover explaining it, and an optional one-line note on what's being worked on. One page can explain how drafts work and list every current draft. The words are all settings ([configuration.md](configuration.md#drafts)).

## Essays, reference pages, and the log

These get a reading sidebar in place of the recipe one. It shows only what a page has:

- The search box, and the page's added and updated dates.
- Notes and photos, moved out of the article as on recipes.
- "On this page": the page's headings, grouped, on desktop. On a phone, Blowfish's own table of contents is used instead.
- The recipes the page links to.
- For an essay, the other essays in its folder.
- For a log month, its days, and the other months, newest first, with a day count for each.

A page at the site's root, such as About, can add "The cookbook in numbers" (counts of recipes, cuisines, essays, and reference guides) and a hand-picked "Start here" list ([frontmatter.md](frontmatter.md#pages-at-the-sites-root)).

## Search

Fugu uses Blowfish's search (`/` or ⌘K to open it), with one change: pinned pages come first among the results. It needs the home page's JSON output and `params.enableSearch` ([configuration.md](configuration.md#site-config-fugu-needs)). A recipe page's sidebar has a search box of its own that opens the same search.

## The recipe index

When the recipes section asks for it, Fugu writes `/recipes/index.json`: one entry per recipe, with its frontmatter facts, a word count, and whether it has a Mechanic, Variations, Notes, or a formula block. It's for scripts and tools that ask questions about the whole collection, such as which recipes have no cuisine, without parsing the content folder. The fields are listed in [frontmatter.md](frontmatter.md#in-recipesindexjson).

## Without JavaScript, and in print

Every page still works without JavaScript; it's just less arranged:

- Sections and photos stay where they were written, in the article, rather than moving to the sidebar.
- Ingredients are a plain list: no checkboxes, scaling, or unit menu.
- Popovers still open on hover and focus; they just don't flip or close with Escape.

In print, photos appear full size where they were written, not as thumbnails.
