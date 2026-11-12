# Tools

Fugu ships small command-line tools for the content of a Fugu site, and a few for working on Fugu itself. They're in `tools/`, written in Python's standard library or shell, with nothing to install beyond what each one lists. Every tool has a `--help` with the details; this page says what each is for.

## Where they run

Each tool works on a Hugo site: `$FUGU_SITE_ROOT` if it's set, else the nearest folder at or above where you run it that has a `content/` folder and a Hugo config. So run them from your site's root, or anywhere inside it:

```sh
# Fugu as a submodule
python3 themes/fugu/tools/frontmatter.py check

# Fugu as a Hugo module: the tools are in Hugo's module cache
fugu=$(hugo config mounts | awk -F'"' '/"path":/{p=$4} /"dir":/{if(p=="github.com/robotpony/hugo-theme-fugu")print $4}')
python3 "${fugu}tools/drafts.py"

# From anywhere
FUGU_SITE_ROOT=~/sites/my-cookbook python3 themes/fugu/tools/drafts.py
```

A tool run outside a site stops and says so, rather than reporting that nothing is wrong.

## For a site's content

| Tool | What it does | Example | Needs |
|---|---|---|---|
| `frontmatter.py check` | Checks every page's frontmatter: required and recommended fields by section, tags as a plain list, dates as `YYYY-MM-DD`, `draft` as true or false, a build's `era` and a blueprint's `lineage`. Exits 1 on an error, 0 on warnings alone. | `frontmatter.py check content/recipes/` | Python 3 |
| `frontmatter.py get` | Prints one field of a page, or all of them. | `frontmatter.py get content/recipes/dal.md tags` | Python 3 |
| `frontmatter.py set` | Sets a field, adding it if it's missing, and leaves the rest of the file as it was. | `frontmatter.py set content/recipes/dal.md cuisine indian` | Python 3 |
| `frontmatter.py unset` | Removes a field. | `frontmatter.py unset content/recipes/dal.md working_on` | Python 3 |
| `drafts.py` | Lists the pages marked `draft: true` (the Test kitchen), section pages such as a blueprint's included. | `drafts.py --json` | Python 3 |
| `add-image.sh` | Gets a photo ready to publish: turns it upright from its EXIF rotation, strips its metadata (GPS included), caps its long edge, and writes it where you say, refusing to overwrite a file. | `add-image.sh ~/Photos/IMG_2041.jpg content/recipes/dal/dal.jpg` | ImageMagick 7 (`magick`), `exiftool` |

The sections the tools read come from your `[params.fugu]` (`recipeSection`, `essaySection` and the rest, [configuration.md](configuration.md#sections)), so a site that renames them needs no flags. `check --help` lists the fields for each section, and `frontmatter.md` says what each field does.

`frontmatter.py` reads the frontmatter Fugu pages use, a flat YAML mapping of text, numbers, booleans and lists, not all of YAML.

`--json` on `check` and `drafts.py` prints the result for another program: an editor plugin, a pre-commit hook, a CI step.

## For working on Fugu

These are for Fugu's own development, or for a site testing a change to its copy of Fugu. The rule they serve is in Fugu's `CLAUDE.md`: a change to Fugu must not change how a site renders unless it means to.

| Tool | What it does | Example | Needs |
|---|---|---|---|
| `compare-builds.py` | Builds the site with Fugu at a commit and with the working tree, and compares every built file, whitespace aside, grouping identical diffs across pages. | `compare-builds.py --ref v0.2.0` | Python 3, Hugo |
| `compare-styles.py` | Renders about 30 pages in headless Chrome before and after a change, at 1280 and 390px, light and dark, and compares every element's box and computed look. `--open` adds each page with its menus open; `--rename h4=h3` compares a tag changed on purpose. | `compare-styles.py --open` | Python 3, Hugo, Chrome |
| `screenshots.py` | Takes the README's and docs' screenshots from the example site. | `screenshots.py --only recipe` | Python 3, Hugo, Chrome; `oxipng` or `optipng` if installed |

And the tests in `tests/`. CI runs `check.py`, `test_tools.py` and `install.py` on every push; the two Chrome tests run by hand, after a change to `ingredients.js`:

| Test | What it checks |
|---|---|
| `check.py` | Builds every fixture site in `tests/sites/` and the example site, and checks their pages against each one's `expect.txt`. `--compare` also runs `compare-builds.py` on the site you run it from. Fails on any Hugo warning but Blowfish's version warning. |
| `test_tools.py` | Runs each tool above on the fixture sites (and on copies of them, for the ones that change files) and checks its output and exit code: `check` passing the fixtures and failing bad frontmatter, sections read from `[params.fugu]`, `set` and `unset` leaving the rest of a file as it was, the drafts each fixture has, finding the site, and `compare-builds.py` on two folders. The `add-image.sh` tests need ImageMagick 7 and `exiftool`, and skip without them. |
| `install.py` | Installs Fugu on a new site the way `getting-started.md` says (`modules` or `submodules`), builds it, and checks the recipe page it promises. |
| `percent_scaling.py` | Drives a percentage table's "Scale based on" row in headless Chrome. |
| `yield_scaling.py` | Scales yields ("1 pan of buns", "about ⅓ cup (1 pizza)") at several scales in headless Chrome. |

## Editing

A Fugu site's content is plain Markdown: YAML frontmatter, `##` headings, and `[[Title]]` links, with no shortcodes. So the `content/` folder, or the whole site, opens as an [Obsidian](https://obsidian.md) vault:

- **Wiki links work both ways.** `[[Beef stew]]` links in Obsidian as it does on the site, where Fugu resolves it by the page's title ([recipe-format.md](recipe-format.md#wiki-links)). Obsidian links by file name, so keep each file named for its title, or a link that works on the site shows as unresolved in Obsidian.
- **Diagrams read as text.** `formula`, `stack` and `flow` blocks show as their source in Obsidian, which is written to be readable.
- **Tags at the end of a heading stay yours.** `## Notes #todo` is a tag in Obsidian and plain "Notes" on the site.
- **Frontmatter shows as Properties.** Obsidian's Properties view edits the same fields `frontmatter.py` checks; run `check` before you publish.

[Claude Code](../claude/README.md) commands for a new recipe, a content check and adding photos are in `claude/commands/`, to copy into your site.

Any other Markdown editor works too. Run `hugo server -D` beside it to see drafts as the site will show them.
