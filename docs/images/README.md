# Screenshots

The images here, and the theme listing's `images/screenshot.png` and `images/tn.png`, are taken by `tools/screenshots.py` from [exampleSite/](../../exampleSite/README.md), which uses Fugu's basic styles with Blowfish's default scheme (`blowfish`) and no site CSS, so they show what a new site gets. Retake them all after a style change, from Fugu's root:

```sh
python3 tools/screenshots.py                 # every shot, plus the listing images
python3 tools/screenshots.py --only cards    # just one
```

It needs Hugo and Google Chrome (or `$CHROME`). The shots are at 2× (`--scale`), in light mode unless named `-dark`:

| File | Page | Window (CSS px) |
|---|---|---|
| `recipe.png` | `/recipes/veg-patties/` | 1280×900 |
| `recipe-dark.png` | `/recipes/veg-patties/`, dark | 1280×900 |
| `recipe-phone.png` | `/recipes/veg-patties/` | 390×844 |
| `scaling.png` | `/recipes/butter-tarts/`, scaled 2×, scale menu open | 1280×900 |
| `cards.png` | `/recipes/` | 1280×900 |
| `build.png` | `/methods/burgers/builds/drive-in-deluxe/#picks` | 1280×1300 |
| `blueprint.png` | `/methods/burgers/` | 1280×900 |
| `methods.png` | `/methods/` | 1280×900 |
| `principle.png` | `/tags/win-the-fridge/` | 1280×900 |

`images/screenshot.png` is `/recipes/veg-patties/` at 1500×1000, and `images/tn.png` the same at 900×600, the sizes themes.gohugo.io asks for. The list of shots is `SHOTS` at the top of the tool.
