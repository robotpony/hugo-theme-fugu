# Example site

A small Fugu site with every optional part: recipes (simple, multi-component, with a Mechanic, with a formula diagram, a draft in the test kitchen, one with a photo), an essay, a reference essay behind a principle tag, reference pages with a glossary, a Food Log month, and methods in their own section with a burger blueprint (five parts, three builds with stack diagrams).

It builds against Fugu and Blowfish side by side in `../..` (`themesDir`), as when Fugu is checked out at `themes/fugu` beside `themes/blowfish`. From this folder:

```sh
hugo server -D
```

`tests/check.py` builds it with the fixtures and checks every link (`python3 tests/check.py exampleSite`, from Fugu's root).

The content is from [Not a Chef](https://github.com/robotpony/not-a-chef), under CC BY-SA 4.0, not Fugu's MIT licence; see [LICENSE](LICENSE) for what was changed.
