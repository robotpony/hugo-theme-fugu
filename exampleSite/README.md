# Example site

A small Fugu site with every optional part: recipes (simple, multi-component, with a Mechanic, with a formula diagram, a draft in the test kitchen, one with a photo), an essay, a reference essay behind a principle tag, reference pages with a glossary, a Food Log month, and methods in their own section with a burger blueprint (five parts, three builds with stack diagrams).

It takes Fugu and Blowfish as Hugo modules, the way [getting-started.md](../docs/getting-started.md) recommends, so building it needs [Go](https://go.dev/dl/). Its `go.mod` points Fugu at this checkout (`../`), so it always shows the working tree; Blowfish and hugo-warped come at the versions Fugu's `go.mod` requires, fetched on the first build. From this folder:

```sh
hugo server -D
```

`tests/check.py` builds it with the fixtures and checks every link (`python3 tests/check.py exampleSite`, from Fugu's root).

The content is from [Not a Chef](https://github.com/robotpony/not-a-chef), under CC BY-SA 4.0, not Fugu's MIT licence; see [LICENSE](LICENSE) for what was changed.
