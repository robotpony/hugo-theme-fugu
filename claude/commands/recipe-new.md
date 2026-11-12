# /recipe-new

Create a new recipe stub in the site's recipe section.

Usage: /recipe-new "Recipe title"

1. **Find the recipe section.** Run `hugo config --format json` from the site's root and read `params.fugu.recipesection` (Hugo lower-cases the keys; default `recipes`). The recipe goes in `content/<recipesection>/`.
2. **Derive the slug** from the title (kebab-case). If `content/<recipesection>/<slug>.md` (or a `<slug>/index.md` bundle) exists, stop and say so; never overwrite.
3. **Create it from Fugu's archetype**: `hugo new content <recipesection>/<slug>.md` uses the recipe archetype (Fugu's `archetypes/recipes.md`, or the site's own if it has one). In a renamed section whose `_index.md` sets `type: recipes`, pass `--kind recipes`.
4. **Set the title** to the one given, in sentence case (first word and proper nouns only), unless the site's own style guide says otherwise. Fix the case if it was typed in headline case.
5. **Fill in what was given.** The archetype lists every recipe field (Fugu's `docs/frontmatter.md`), most of them empty. Fill in any the user gave (tags, cuisine, servings, times, source). `tags` is required, so ask for at least one if none were given. Leave the other fields empty rather than deleting them, so they're there to fill in later.
6. **Start it in the Test kitchen.** `draft: true` publishes the recipe with a banner saying it's still being tested, if the site turns that on (`[params.fugu.development]`). If the user said what they're trying or unsure about, put it in `working_on` as one short line; it shows under the banner. Only set `draft: false` if the user says the recipe is already a keeper.
7. **Check it**: run Fugu's `tools/frontmatter.py check` on the new file (find Fugu as `/lint` says) and report anything it finds. Don't commit.
