# Claude Code commands

Optional [Claude Code](https://docs.claude.com/en/docs/claude-code) slash commands for a Fugu site, from Not a Chef, made to work on any site:

- `/recipe-new "Title"`: a new recipe from Fugu's archetype, in the Test kitchen.
- `/lint [path]`: checks frontmatter, recipe structure, diagram blocks, methods and blueprints, and the glossary.
- `/image-add <photos> <page>`: prepares photos with `add-image.sh`, names them, and places them in a page.

They live here, not in `.claude/`, so they don't load while you work on Fugu itself. To use them, copy them into your site:

```sh
mkdir -p .claude/commands
cp themes/fugu/claude/commands/*.md .claude/commands/      # submodules
```

With Fugu as a Hugo module, copy from where Hugo keeps it:

```sh
fugu=$(hugo config mounts | awk -F'"' '/"path":/{p=$4} /"dir":/{if(p=="github.com/robotpony/hugo-theme-fugu")print $4}')
cp "$fugu"claude/commands/*.md .claude/commands/
```

They're copies, so edit them to suit your site: your own house style doc, photo folders, or extra checks. Copy them again after updating Fugu if you want its changes.

Each command reads your sections from `[params.fugu]` (through `hugo config`) and finds Fugu's tools and hugo-warped's with `hugo config mounts`, so it works with either install method and with renamed sections. They call the tools in [docs/tools.md](../docs/tools.md); `/image-add` needs ImageMagick 7 and `exiftool`.
