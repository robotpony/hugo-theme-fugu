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
- Labels are one short word. Swaps are optional, up to three, separated by commas. Keep it to five slots.
- Optional lines after the slots: `caption: <text>`, and `bar: yes` to draw a ratio's proportions as a bar.

The diagram illustrates a sentence; it doesn't replace one. In Obsidian it reads as plain text.

The icons in the kit today: bowl, butter, can, carrot, cheese, clock, crumbs, cup, egg, flame, flour, oil, onion, pan, patty, pot, potato, salt, water. A site can add its own by putting SVGs in its own `assets/icons/formula/`.

## Photos

Embed photos with standard Markdown where they belong in the text:

```markdown
![A bowl of tomato soup with croutons](/images/recipes/tomato-soup.jpg "Lazy tomato soup")
```

The alt text describes the photo; the optional title in quotes is its caption, and the alt text stands in when there's no title. On the page, photos move into the sidebar as thumbnails that open a viewer, leaving a small "Photo 1" marker in the text. With JavaScript off they stay inline, and in print they always do.

A photo in the page's bundle (a recipe written as `plain-rice/index.md` with the photo beside it) or under `assets/` gets a thumbnail and a resized display copy. One under `static/` is used as it is. `tools/add-image.sh` prepares photos for the site ([tools.md](tools.md)).

## Files

One recipe per file, named in kebab-case after the title: `dal-tadka.md` for "Dal tadka". The file name becomes the URL.

## House style (suggested)

None of this is checked by Fugu; it's what the site Fugu came from does, and it keeps a collection consistent:

- Titles in sentence case: "Red Thai curry", not "Red Thai Curry".
- Method in the imperative, one action per sentence. Sensory cue first, time second: "until golden, about 3 minutes".
- Metric first, with imperial in parentheses where it helps: "180°C (350°F)".
- A leading `~` for approximate values in frontmatter (`cook_time: ~2 hr`), which fits the compact facts on cards and in the sidebar.
