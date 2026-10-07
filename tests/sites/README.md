# Fixture sites

Small Hugo sites that build against Fugu and Blowfish, for CI (`.github/workflows/build.yml`, Hugo 0.161.1, Blowfish `e9699d8`) and for checking a change by hand.

- `recipes-only/`: the smallest site Fugu should support. One section, `recipes`, and one taxonomy, `tags` (no `cuisine`). It already builds without warnings; PLAN.md §3 makes it right as well (no empty blocks, zero counts, or dead links where `cuisine` and the other sections would be).
- `everything/`: every optional part turned on: essays (including a reference essay), reference pages with a glossary, a dated log, `cuisine`, a principle tag, pinned pages, a formula diagram, multi-component recipes, and wiki links between them.

Both find the themes through `themesDir = "../../../.."`, the folder that holds `fugu/` and `blowfish/` side by side. That's `themes/` inside a site like Not a Chef, and the layout CI checks out. Build one from Fugu's root:

Blowfish at `e9699d8` declares Hugo 0.158.0–0.161.1, so a newer Hugo warns about it and `--panicOnWarning` fails; drop the flag, or use Hugo 0.161.1.

```sh
hugo --source tests/sites/everything --panicOnWarning --destination /tmp/fugu-everything
```

The content is made up for testing, written to exercise templates rather than to be cooked from.
