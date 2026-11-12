# /lint

Check a Fugu site's content: frontmatter, recipe structure, diagram blocks, methods and blueprints, and glossary links.

Usage: /lint [path]

With a path, check only the files under it (except where a step says it always runs). Run everything from the site's root.

**Find the tools first.** `hugo config mounts` prints each module's `path` and `dir`. Fugu's is `fugu` with submodules, `github.com/robotpony/hugo-theme-fugu` as a Hugo module; hugo-warped's is `hugo-warped` or `github.com/robotpony/hugo-warped`. Below, `$FUGU` and `$WARPED` are those folders:

```sh
mounts=$(hugo config mounts)
FUGU=$(echo "$mounts" | awk -F'"' '/"path":/{p=$4} /"dir":/{if(p=="fugu"||p=="github.com/robotpony/hugo-theme-fugu")print $4}')
WARPED=$(echo "$mounts" | awk -F'"' '/"path":/{p=$4} /"dir":/{if(p=="hugo-warped"||p=="github.com/robotpony/hugo-warped")print $4}')
```

**Find the sections.** `hugo config --format json` gives `params.fugu`, with its keys in lower case: `recipesection`, `essaysection`, `referencesection`, `methodsection` (empty means methods live in `<essaysection>/methods/`), `drinksection`, and `glossarypage`. Use these names below, not the defaults.

1. **Frontmatter.** Run `python3 "$FUGU"tools/frontmatter.py check --json [path]`. It checks required and recommended fields by section, tags as plain strings, dates as `YYYY-MM-DD`, `draft`, a build's `era` and a blueprint's `lineage`. Report its errors and warnings; don't re-check those rules by hand.
2. **Recipe structure.** Every page in the recipe (and drink) section has at least one ingredients section (a list under `## Ingredients`, or one heading per component with a list) and a method (`## Method`, or numbered steps under each component). Fugu's `docs/recipe-format.md` has the rules.
3. **Diagram blocks.** Any ```` ```formula ````, ```` ```stack ```` or ```` ```flow ```` block: run hugo-warped's validator over `content/`, with Fugu's icon keys so unknown keys are caught, and report each `WARN` line as an issue in its file. Always run this, even with a path.

   ```sh
   python3 "$WARPED"tools/check-fences.py content --keys formula="$FUGU"assets/icons/formula --keys stack="$FUGU"assets/icons/layers
   ```

   It prints `WARN  <type> [<code>]: "<line>" in "<file>:<line>:1"`. It's the source of truth for these blocks.
4. **Methods and blueprints**, whenever the methods folder exists, even with a path. Every method page has `method` in its `tags` (a folder `_index.md`'s cascade only reaches a page with no `tags` of its own). In a blueprint folder (one with an `_index.md`): every page in `parts/` has a numeric `weight`, and every page in `builds/` has a `## Picks` section whose bullets (`- **Part:** pick`) each start with the name of a part, matched loosely against the parts' titles. Fugu's `docs/features.md` describes blueprints.
5. **Glossary**, when `content/<referencesection>/<glossarypage>/` exists, even with a path.
   - List each term's first mention on a page that isn't a wiki link yet, as a suggestion, not an error. This writes nothing:

     ```sh
     python3 "$WARPED"tools/glossary.py link content --glossary <referencesection>/<glossarypage> --recipes <recipesection> --check
     ```

     It prints `path:line  Term  "words"`. Add `--recipes <drinksection>` if there is one.
   - No glossary entry sets a top-level `kind`; it goes under `params: {kind: ingredient}`. Hugo draws a top-level one as an ingredient but the glossary tools read it as a concept, so report each file that has one as an error.

Report files with issues grouped by severity: errors, then warnings, then suggestions. Give the files that pass as a count, not a list. Don't change any file.
