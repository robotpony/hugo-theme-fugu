# Getting started

From an empty Hugo site to one working recipe page. This takes about ten minutes, and needs Hugo (extended), git, and, for the recommended install, Go.

## 1. Install Fugu and Blowfish

Fugu is an add-on for [Blowfish](https://github.com/nunocoracao/blowfish), not a standalone theme, so a site installs both. Install them as Hugo modules (recommended) or as git submodules.

Use a Hugo version inside the range Blowfish declares (its `config.toml`, `module.hugoVersion`; for the Blowfish Fugu is tested against, 0.163.0–0.166.0). Outside it, Hugo prints a warning on every build.

### As Hugo modules (recommended)

Fugu's `go.mod` names the Blowfish version it's tested against, so a module install can't end up with an older one. It needs [Go](https://go.dev/dl/) wherever the site builds (Netlify has it; on GitHub Actions, add `actions/setup-go`).

```sh
hugo new site my-cookbook
cd my-cookbook
hugo mod init github.com/<you>/my-cookbook
```

Then import both themes, Fugu first, in place of a `theme` line:

```toml
# hugo.toml
[module]
  [[module.imports]]
    path = "github.com/robotpony/hugo-theme-fugu"
  [[module.imports]]
    path = "github.com/nunocoracao/blowfish/v3"
```

Then fetch Fugu, which brings the Blowfish its `go.mod` requires:

```sh
hugo mod get github.com/robotpony/hugo-theme-fugu
```

Fetch Fugu by name like this, before the first build. A bare `hugo mod get` or `hugo mod get -u` fetches each import at its newest release, which for Blowfish may be newer than Fugu is tested against. Run the same command to update Fugu later; Blowfish moves only as far as that Fugu needs.

### As git submodules

Submodules need only git and work offline, but nothing checks the Blowfish version: check out the one Fugu is tested against yourself.

```sh
hugo new site my-cookbook
cd my-cookbook
git init
git submodule add https://github.com/nunocoracao/blowfish.git themes/blowfish
git -C themes/blowfish checkout 295dae3
git submodule add https://github.com/robotpony/hugo-theme-fugu.git themes/fugu
git submodule add https://github.com/robotpony/hugo-warped.git themes/hugo-warped
git -C themes/hugo-warped checkout 4045b3f
```

List Fugu first in `theme`, as in the config below. Fugu reads its `formula`, `stack` and `flow` blocks with [hugo-warped](https://github.com/robotpony/hugo-warped)'s fence partials, which it imports as a Hugo module. A module install fetches it with Fugu; here, add this to `hugo.toml` so Hugo uses the checkout in `themes/` instead (the site's `theme` doesn't list it):

```toml
[module]
  replacements = "github.com/robotpony/hugo-warped -> hugo-warped"
```

## 2. The minimum config

Replace the generated `hugo.toml` with:

```toml
baseURL = "https://example.org/"
title = "My cookbook"
theme = ["fugu", "blowfish"]  # or the [module] imports above

[taxonomies]
  tag = "tags"

[params]
  mainSections = ["recipes"]
```

The order matters: Hugo looks for every layout in your site first, then Fugu, then Blowfish, so Fugu's recipe pages win over Blowfish's article pages.

That's all a site needs. Fugu's own settings, under `[params.fugu]`, all have defaults (see [configuration.md](configuration.md)).

## 3. The recipes section

Create `content/recipes/_index.md`:

```yaml
---
title: Recipes
outputs: [HTML, RSS, JSON]
---
```

`outputs` builds the recipes page (HTML), its feed (RSS), and `/recipes/index.json`, a list of every recipe and its facts for tools and scripts. Listing outputs replaces Hugo's defaults, so keep `RSS` in the list for the feed. Leave the line out to get Hugo's defaults (the page and the feed) without the JSON.

## 4. A first recipe

Create `content/recipes/plain-rice.md`:

```markdown
---
title: Plain rice
tags: [sides, weeknight]
date: 2026-10-01
servings: 4
cook_time: 20 min
---
Rinsed, absorbed, and rested: the base for most of the week.

## Mechanic

The ratio is **1 part rice to 1½ parts water** by volume, for long-grain white rice.

## Ingredients

- 2 cups long-grain rice
- 3 cups water
- 1 tsp salt

## Method

Rinse the rice until the water runs almost clear. Bring the rice, water, and salt to a boil, then cover and turn the heat to low. Cook until the water is absorbed, about 15 minutes. Rest 5 minutes off the heat, covered, then fluff with a fork.

## Notes

- Brown rice needs about 2 cups of water per cup of rice and 40 minutes.
```

The archetype gives you a stub with every field: `hugo new content recipes/plain-rice.md`. New recipes start with `draft: true`; see [frontmatter.md](frontmatter.md#draft-and-working_on).

## 5. Build it

```sh
hugo server -D
```

Open <http://localhost:1313/recipes/plain-rice/>. You should see:

- The title, tags, and the intro line.
- The ingredient list, each line tickable, with a gear button by the Ingredients heading that opens **Scale** (rescales every quantity) and **Units** (as written, metric, or imperial).
- The method, with its quantities and temperatures marked.
- A sidebar with the facts from the frontmatter (Serves, Cook, Date), and the Mechanic and Notes sections, which the script moves out of the article into it.

The recipes list at `/recipes/` shows it as a card.

> Fugu's basic styles colour all of this from your Blowfish `colorScheme`, in light and dark mode ([configuration.md](configuration.md#styles)). A designed look of Fugu's own comes later (PLAN.md §5).

## 6. Search (optional)

Blowfish's search needs a JSON index of the home page. Add to `hugo.toml`:

```toml
[outputs]
  home = ["HTML", "RSS", "JSON"]

[params]
  enableSearch = true
```

Fugu replaces Blowfish's search script with its own (Fuse.js, with pinned pages first), and adds a search box to the top of the recipe sidebar.

## Where to go next

- [recipe-format.md](recipe-format.md): every section a recipe can have, multi-component recipes, wiki links, and formula and stack diagrams.
- [features.md](features.md): a tour of everything Fugu adds, as a reader sees it.
- [frontmatter.md](frontmatter.md): every frontmatter field Fugu reads, and what it changes on the page.
- [configuration.md](configuration.md): `[params.fugu]`, renaming sections and headings, and the optional parts (essays, reference pages, a log, `cuisine`, a glossary).
- `tests/sites/everything/` in this repo: a small site with every optional part turned on, to copy from.
