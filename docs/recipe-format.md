# Recipe format

A Fugu recipe is a plain Markdown file with YAML frontmatter, one recipe per file, in the recipes section (`content/recipes/` by default). It's written to read naturally in any text editor and in Obsidian; the theme finds its parts by their `##` headings, so there's no special syntax to learn beyond a few heading names.

The frontmatter fields are in [frontmatter.md](frontmatter.md). This page covers the body.

## The shape of a recipe

```markdown
---
title: Dal tadka
tags: [soups, weeknight, vegetarian]
date: 2026-05-02
servings: 4
---
A short intro: what it is and why you'd make it.

## Mechanic

One paragraph on the ratio or technique that makes it work.

## Ingredients

- 1 cup red lentils, rinsed
- 5 cups water

## Method

Prose, one action per sentence.

## To serve

Rice, raita, lime pickle.

## Notes

- Storage, tips, what you tried.
```

Only the ingredients and method are needed. Everything else is optional.

## Intro

The text before the first `##` heading. Its first paragraph is the recipe's summary on cards and in search, unless the frontmatter sets `summary` or `description`.

A blockquote in the intro is treated as a personal note: it's hidden from readers on the page. Hidden is not private: the text is still in the HTML, the search index, and the RSS feed. `hideIntroQuotes = false` in `[params.fugu]` shows them.

## Ingredients and method

For a recipe with one component, use `## Ingredients` (a list) and `## Method` (prose):

```markdown
## Ingredients

- 500 ml water
- 3 cardamom pods, lightly crushed
- 2 tsp loose-leaf black tea
- 120 ml whole milk

## Method

Bring the water and cardamom to a boil and simmer 2 minutes. Add the tea and
simmer 5 minutes more. Add the milk and bring it back up until it foams, then
strain and serve.
```

Fugu reads each ingredient line for its quantity and unit, which is what scaling and unit conversion work on. Write lines as:

```
[quantity] [unit] ingredient [, preparation]
```

- Quantities can be whole numbers, fractions (`1/2`, `½`), mixed numbers (`1 1/2`), decimals, ranges (`2–3`), or words (`a pinch of`). Words don't scale; numbers do.
- Units can be written in full or abbreviated (`tablespoon`, `tbsp`). A second measure in parentheses, `250 ml (1 cup)`, is fine.
- Preparation goes after a comma: `3 apples, peeled and sliced`.
- An optional ingredient ends with `(optional)`.
- An indented sub-item under a line holds a note about it.

Unit conversion understands English unit words only (cups, tbsp, ounces, and so on).

The method is prose rather than a numbered list. Fugu marks the quantities and temperatures in it, so `180°C` can switch to Fahrenheit along with the ingredients.

### Grouping ingredients

To split one list into groups (dry and wet, say) without making separate components, put a `####` label above each run of items:

```markdown
## Ingredients

#### Dry
- 300 g flour
- 10 g baking powder

#### Wet
- 2 eggs
- 240 ml buttermilk
```

## Multi-component recipes

When a recipe has distinct parts (dal and tadka, dough and filling), give each its own `##` heading holding both its ingredients and its method:

```markdown
## Dal

- 1 cup red lentils, rinsed
- 5 cups water

Simmer the lentils in the water until soft, about 20 minutes. Mash lightly.

## Tadka

- 2 tbsp ghee
- 1 tsp cumin seeds

Heat the ghee until shimmering. Add the cumin; when it sizzles, pour it over the dal.
```

Any `##` heading Fugu doesn't recognize is treated as a component, so the names are up to you. Headings it recognizes, below, are never components. Words like "timing" or "examples" in a heading also keep it from being read as a component (the `notIngredients` list in [configuration.md](configuration.md)).

## Optional sections

Each of these is found by its heading. The names are the defaults; a site can add or change them under `[params.fugu.headings]`.

| Heading | Also matches | What it holds | On the page |
| --- | --- | --- | --- |
| `## Mechanic` | | One paragraph on the ratio, technique, or principle the dish depends on. Bold the key ratio. Skip it when the recipe is just "combine and cook". | Moves to the sidebar |
| `## To serve` | | A line on what it goes with. | Moves to the sidebar |
| `## Variations` | | Meaningfully different versions, a `###` heading and a paragraph each. | Moves to the sidebar |
| `## Equipment` | `Special equipment`, `Hardware` | A list of anything beyond the usual kit. | Moves to the sidebar |
| `## Notes` | | A list: tips, storage, test results. | Moves to the sidebar |
| `## Method` | `Directions`, `Steps` | The method prose, for a one-component recipe. | Stays in the article |
| `## History` | | Your notes on where the recipe came from. | Hidden from readers (still in the HTML) |

Which sections move into the sidebar, and in what order, is `recipeSidebar` in `[params.fugu]`. A section left out of that list stays in the article. With JavaScript off, every section stays where it was written.

Other headings you might use, such as `## Substitutions` or `## Timing`, stay in the article as written. Tables are fine for timing or ratio references with several variables.

### Keeping a section in the article

Add `{.article}` to a `##` heading to keep that section in the article, where it's written:

```markdown
## Method

Fry until deep golden, about 12 minutes.

## Breading {.article}

The breading goes soak, dredge, rest, fry.
```

Without it, `## Breading` would be read as a component and its lists as ingredients. With it, the section is never a component, never moves to the sidebar, and is never hidden, whatever its title. So `## Mechanic {.article}` written under the method stays there instead of becoming the sidebar callout, formula diagram and all. A `## Method {.article}` is still the method: its quantities still convert.

The marker is a Markdown heading attribute, which Hugo reads and leaves out of the page: the heading shows as "Breading" and its anchor is `#breading`. Obsidian shows `{.article}` as part of the heading, which is the point: anyone reading the file can see the section is placed on purpose. It works on any page with a sidebar, so an essay's `## Notes {.article}` stays in the essay and in its "On this page" list. A site that turns off Goldmark's heading attributes (`markup.goldmark.parser.attribute.title = false`) loses it.

## Wiki links

Link to another page by its title, as in Obsidian:

```markdown
- 1 cup [[Pizza sauce]]
- 1 batch [[Basic pie crust|pie crust]], blind-baked
```

The link matches a page's `title`, ignoring case and punctuation, so `[[rich veg mushroom stock]]` finds "Rich veg/mushroom stock". `[[Title|text]]` shows `text`. A link can point at any page on the site, not only recipes.

If no page has that title, Fugu looks for a `##` heading of that name in the glossary page, if the site has one, and shows the entry in a popover. A link that matches nothing is marked as broken. See [configuration.md](configuration.md) for the glossary.

## Formula diagrams

A ratio the text already states can also be drawn, as a row of icons. Use a `formula` code block, one slot per line, `icon | label | quantity | swaps`, with the operator at the start of every line after the first:

````markdown
```formula
can          | Beans   | 1 can         | black, pinto, chickpea
+ bowl       | Starch  | 1 cup         | rice, mash, quinoa
+ crumbs egg | Binder  | ½ cup + 1 egg | or gluten + oats
= patty      | Patties | 6
```
````

- One operator per block: `+` for parts that go together, `:` for a ratio (the quantity is the ratio number), or `→` (or `->`) for the steps of a method. An optional last `=` line names the result.
- Icons are file names from `assets/icons/formula/`, without `.svg`: one or two per slot. An unknown name draws a dashed circle and warns during the build.
- Labels are one short word. Swaps are optional, up to three, separated by commas. A row with a fifth cell warns during the build. Keep it to five slots.
- The first slot has no operator; one there is dropped, with a warning. A later slot with none is joined by the block's operator.
- Optional lines after the slots, once each and in either order: `caption: <text>`, and `bar: yes` to draw a ratio's proportions as a bar.
- These are skipped with a warning: a slot with no label (`can`, `can |`), a slot after the `=` line or after `caption:` or `bar:`, a second `caption:` or `bar:`, and any other lowercase `key: ` line. More than two icons or three swaps draw, but warn. A block with nothing to draw shows its source as plain text, and warns.

The diagram illustrates a sentence; it doesn't replace one. In Obsidian it reads as plain text.

Each warning names the line it's about and starts with a code from the spec, such as `formula [unknown-token]:`. The full grammar, and what warns, is the shared fence spec in hugo-warped: [`fences/formula.md`](https://github.com/robotpony/hugo-warped/blob/main/fences/formula.md), with the rules every fence shares in [`fences/README.md`](https://github.com/robotpony/hugo-warped/blob/main/fences/README.md).

The icons in the kit today: bowl, butter, buttermilk, can, carrot, cheese, chicken, clock, cornmeal, crumbs, cup, egg, flame, flour, fruit, herb, honey, jar, lemon, lentils, mustard, oats, oil, onion, oven, pan, patty, pepper, pickle, pot, potato, salt, soy, strainer, sugar, vinegar, water. A site can add its own by putting SVGs in its own `assets/icons/formula/`.

## Stack diagrams

A build that's made of layers (a burger, a sandwich, a lasagne) can be drawn as an exploded view: each layer as the thing itself, top to bottom, pulled apart, with its label and its role on the right. Use a `stack` code block, one layer per line, top first, `layer | label | role`:

````markdown
```stack
bun-top          | Toasted bun       | soft, toasted
lettuce-shredded | Shredded lettuce  | cold crunch
patty-thin       | Thin patty, 140 g | salt, fat, savoury
bun-base         | Toasted bun       | barrier
caption: Drive-in deluxe
```
````

- Layers are file names from `assets/icons/layers/`, without `.svg`. An unknown name draws a dashed placeholder and warns during the build.
- A spread on its bun is one layer, written as a pair: `bun-base + mayo | Sesame bun, with mayo | barrier` (the spaces are optional). It draws `bun-base+mayo.svg`, its own drawing (the top bun opened toward you, its cut face showing the spread), not two layers stacked. A pair with no file warns like an unknown name.
- The label is what the layer is; the role is what it does for the whole. Both are short.
- Optional lines after the layers, in either order: `caption: <text>`, and `repeat: 3-5 x3` to mark layers 3 to 5 as repeated three times (a `× 3` bracket on the left; `x` or `×`, and a single layer works too: `repeat: 4 x2`). Several `repeat:` lines may overlap or nest; the count is a whole number, 2 or more.
- These are skipped with a warning: a layer with no label (`bun-top`, `bun-top |`), a layer after `caption:` or `repeat:`, a second `caption:`, a `repeat:` it can't read or whose layers aren't there, and any other lowercase `key: ` line. A fourth cell or more is dropped, with a warning. A block with no layers shows its source as plain text, and warns.

A build's first `stack` block is also drawn smaller, without labels, on its card on the blueprint's page. In Obsidian it reads as plain text.

The full grammar, and what warns, is in hugo-warped's [`fences/stack.md`](https://github.com/robotpony/hugo-warped/blob/main/fences/stack.md).

## Flow diagrams

A short sequence of steps, with no icons to draw, can be a row of boxed labels joined by arrows. Use a `flow` code block, one step per line, `Label | note`, the note optional:

````markdown
```flow
Soak   | buttermilk, 4 hours+
Dredge | once
Rest   | 10 min
Fry    | 12 min, then covered 10
caption: The breading, start to finish
```
````

- A leading `→ ` or `-> ` on a step is dropped, since the arrows are drawn anyway; so a `formula` sequence pastes in once its icon column is gone. On the first step it warns.
- `row: <label>` lines split the steps into parallel rows, up to three, drawn one above the other with step *n* of each row in the same column, to compare two ways of doing a thing. A block that uses them starts with one; the label is optional.
- An optional `caption: <text>` line goes last. Labels, notes, row labels and the caption are inline Markdown.
- Keep a row to about five steps. More still draw, with a warning. A line with more than one `|`, or no label, is skipped with a warning, as is any other lowercase `key: ` line and a second `caption:` (the first stands). A block with nothing to draw shows its source as plain text, and warns.

In a narrow box (a phone, or the recipe sidebar, where a `## Variations` block lands) each row becomes a list down the page: the labels in a column with ↓ between them, each note beside its label. In Obsidian it reads as plain text.

The full grammar, and what warns, is in hugo-warped's [`fences/flow.md`](https://github.com/robotpony/hugo-warped/blob/main/fences/flow.md).

### Notes in a diagram

Any line of a `formula`, `stack` or `flow` block can carry a note for whoever reads the source: `←` (or `<-`) and everything after it on the line. It's never drawn, and it's left out of the diagram's alt text and the card's tooltip. A line that's only a note is skipped. To put a literal arrow in a cell, write `\←` (or `\<-`).

````markdown
```formula
cornmeal | Cornmeal | 1  ← coarse, not corn flour
: flour  | Flour    | 1
← by volume; by weight it's closer to 150 g : 130 g
caption: By volume, for the dredge
```
````

The note starts at an arrow at the start of the line or after a space, so `a<-b` in a cell is left alone. The note still shows wherever the block isn't drawn: in Obsidian, on GitHub. The rules are the shared spec's, in [`fences/README.md`](https://github.com/robotpony/hugo-warped/blob/main/fences/README.md) under "Notes".

The layers in the kit today: bun-top, bun-base, bread, lettuce (leaf), lettuce-shredded, lettuce-chunks (torn or chopped), tomato, onion-raw, onion-fried, onion-minced, pickle, cheese, cheese-american (the slice in yellow), cheese-top, bacon, patty-thin, patty-thick (griddled), patty-thin-grilled, patty-thick-grilled, patty-smash, sauce-ketchup-mustard, ketchup, sauce-burger, mustard, mayo, pasta, ragu, bechamel; and the pairs bun-top + mayo, bun-base + mayo, bun-top + sauce-burger, bun-base + sauce-burger. A site can add its own, or replace Fugu's, by putting SVGs with those names in its own `assets/icons/layers/`: a 210-wide `viewBox` centred on x=105, its own height, and a `data-edge` attribute saying how far right of centre the drawing reaches (where the leader line starts). A pair's file is named with a `+`, `bun-base+mayo.svg`.

## Photos

Embed photos with standard Markdown where they belong in the text:

```markdown
![A bowl of tomato soup with croutons](/images/recipes/tomato-soup.jpg "Lazy tomato soup")
```

The alt text describes the photo; the optional title in quotes is its caption, and the alt text stands in when there's no title. On the page, photos move into the sidebar as thumbnails that open a viewer, leaving a small "Photo 1" marker in the text. With JavaScript off they stay inline, and in print they always do.

A photo in the page's bundle (a recipe written as `plain-rice/index.md` with the photo beside it) or under `assets/` gets a thumbnail and a resized display copy. One under `static/` is used as it is. `tools/add-image.sh` prepares photos for the site; run it with `--help` for its options.

## Files

One recipe per file, named in kebab-case after the title: `dal-tadka.md` for "Dal tadka". The file name becomes the URL.

## House style (suggested)

None of this is checked by Fugu; it's what the site Fugu came from does, and it keeps a collection consistent:

- Titles in sentence case: "Red Thai curry", not "Red Thai Curry".
- Method in the imperative, one action per sentence. Sensory cue first, time second: "until golden, about 3 minutes".
- Metric first, with imperial in parentheses where it helps: "180°C (350°F)".
- A leading `~` for approximate values in frontmatter (`cook_time: ~2 hr`), which fits the compact facts on cards and in the sidebar.
