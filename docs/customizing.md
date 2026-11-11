# Customizing

How to make a Fugu site look like your own: the colours and type, a rule here and there, a template, or the whole stylesheet. Settings are in [configuration.md](configuration.md); this is what you change in your site's own files.

## The three layers

A Fugu site is three themes deep. Hugo looks for every layout, partial and asset in your site first, then in Fugu, then in Blowfish, and uses the first it finds:

```
your site      layouts/, assets/css/custom.css, assets/icons/   wins
  Fugu         recipe pages, cards, diagrams, fugu.css          then
  Blowfish     the header, footer, search, Tailwind, schemes    last
```

So you change something by putting a file of the same name in your site, never by editing Fugu or Blowfish, which keeps their updates clean.

The stylesheets go the same way. Every page loads one bundle, in this order:

1. Blowfish's colour scheme (`assets/css/schemes/<colorScheme>.css`), then its `main.css`.
2. Fugu's `assets/css/fugu.css`, unless `styles = false`.
3. Your `assets/css/custom.css`, if you have one.

Later wins at the same specificity, so your rules beat Fugu's, and Fugu's beat Blowfish's. Fugu's rules sit outside any cascade layer, and Blowfish's Tailwind utilities and Typography's `.prose` rules sit inside them, so Fugu's win over those even when they're more specific. Yours do too, as long as you don't put them in a layer either.

## Colours and type

Fugu's look comes from `--fugu-*` custom properties set at the top of `fugu.css`. Set any of them in your `custom.css` to restyle every piece that uses it: under `:root` for light mode, and under `.dark` for dark mode (Blowfish puts `.dark` on `<html>`). A property you set only under `:root` applies in dark mode too, since `.dark` only resets the ones Fugu changes there, so set both when the colour should change.

```css
/* assets/css/custom.css */
:root {
  --fugu-accent: #A8653A;
  --fugu-accent-strong: #8A4F2C;
  --fugu-accent-soft: #F3E6DC;
  --fugu-font-body: Georgia, "Times New Roman", serif;
}
.dark {
  --fugu-accent: #E0A57C;
  --fugu-accent-strong: #F0C2A0;
  --fugu-accent-soft: #3A2A20;
}
```

By default every colour is a grey from your Blowfish scheme's neutral ramp (`--color-neutral-*`), so Fugu sits in any scheme without competing with it. Links, chips and quantities are told apart by weight and underline. Giving the accent a colour is usually the first change, and often the only one.

| Property | What it colours | Default |
|---|---|---|
| `--fugu-bg` | the page behind panels | the scheme's `neutral` (white); `neutral-900` dark |
| `--fugu-surface`, `--fugu-surface-2` | panels, popovers, the sidebar; a second, deeper panel | `neutral-50`, `neutral-100` |
| `--fugu-ink`, `--fugu-ink-muted`, `--fugu-ink-faint` | text: body, secondary, and the faintest (dates, counts) | `neutral-900`, `-600`, `-500` |
| `--fugu-border`, `--fugu-border-strong` | rules and outlines; checkboxes and boxed diagrams | `neutral-200`, `-300` |
| `--fugu-accent`, `-strong`, `-soft` | links, quantities, active controls; their hover; tinted fills | near black, black, 7% black |
| `--fugu-flag`, `-soft` | drafts (the Test kitchen mark and strip) and notices | `neutral-700`, 6% black |
| `--fugu-principle-strong` | principle tags' chips and pages | black |
| `--fugu-highlight` | the cuisine chip | black |
| `--fugu-focus` | keyboard focus rings | `--fugu-accent-strong` |
| `--fugu-shadow` | popovers | a soft drop shadow |
| `--fugu-radius` | corners of cards and panels | `6px` |
| `--fugu-font-sans` | headings, labels, chips, controls | the system sans |
| `--fugu-font-body` | reading text: prose, card intros, glossary definitions, captions | `--fugu-font-sans` |
| `--fugu-font-mono` | quantities, ratios, times | the system mono |

Dark mode flips the ramp: light ink on `neutral-900`, white-based tints instead of black ones.

A principle tag can have its own colour. Its chip and its tag page both carry `principle-<slug>`, so re-point the principle colour on them:

```css
.principle-chip.principle-weeknight,
.principle-page.principle-weeknight :is(.ltitle-kind-principle, .read-essay) {
  --fugu-principle-strong: var(--fugu-flag);
}
```

### Food colours

The stack diagrams' layers and the drink glasses use fixed food colours, not the scheme's, since a patty should look cooked whatever the site's palette: `--fugu-sear`, `--fugu-sear-fleck` and `--fugu-sear-char` for a patty's top, `--fugu-kit-green`, `-red` and `-yellow` (each with a paler `-top`, plus `--fugu-kit-green-ink`) for the other layers, and `--fugu-kit-liqueur`, `-cream`, `-latte`, `-tea`, `-wine` and `-ice` for drinks. Each has a dark-mode value. To change one, set the short name, `--sear` or `--kit-red`, which wins over Fugu's.

### The fugu scheme

Blowfish's schemes tint their neutrals: `blowfish` is slate blue, `ocean` is blue, and so on. That tint reaches Fugu through the neutral ramp. For pure greys, as the example site and the screenshots use, set Fugu's own scheme:

```toml
[params]
  colorScheme = "fugu"
```

It's Tailwind's neutral palette for every ramp, so Blowfish's header, links and buttons are grey too. Any Blowfish scheme works, as does your own: a file at `assets/css/schemes/<name>.css` in your site, in the same shape as Blowfish's.

## Fonts

Fugu loads no web fonts, and Blowfish has no hook for them, so Fugu adds one: `layouts/partials/fonts.html`, included near the top of every page's `<head>`, and empty unless you override it. Load your fonts there, then name them in the font properties.

From a font service:

```html
{{/* layouts/partials/fonts.html */}}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
```

```css
/* assets/css/custom.css */
:root { --fugu-font-body: "Lora", Georgia, serif; }
```

### Self-hosting

Serving the files yourself is faster on a first visit, and sends no reader's address to a font service.

1. Put the `.woff2` files in `static/fonts/`, one per weight and style. Most open fonts' download pages have them; for Google's, [google-webfonts-helper](https://gwfh.mranftl.com/fonts) packages them with the `@font-face` rules.
2. Declare each face in `custom.css`. The bundle is served from `/css/`, so `../fonts/` reaches `static/fonts/` and keeps working when the site lives under a path:

   ```css
   @font-face {
     font-family: "Lora";
     font-style: normal;
     font-weight: 400;
     font-display: swap;
     src: url("../fonts/lora-400.woff2") format("woff2");
   }
   /* ...one block per file... */
   :root { --fugu-font-body: "Lora", Georgia, serif; }
   ```

3. Preload the face most pages use, so text doesn't reflow when it arrives:

   ```html
   {{/* layouts/partials/fonts.html */}}
   <link rel="preload" href="{{ "fonts/lora-400.woff2" | relURL }}" as="font" type="font/woff2" crossorigin>
   ```

Keep the fallback in each property (`Georgia, serif`): it's what a reader sees until the font loads, and if it never does.

## Overriding a rule

When the properties don't reach far enough, write a rule in `custom.css` for the class you want to change. Since your file loads after `fugu.css`, a selector as specific as Fugu's wins:

```css
/* Square cards */
.rcard { border-radius: 0; }
```

Find the class with your browser's inspector, then its rule in [`fugu.css`](../assets/css/fugu.css), which is grouped by component with a comment on each. [design/class-inventory.md](design/class-inventory.md) lists every class Fugu emits.

## Leaving out Fugu's styles

```toml
[params.fugu]
  styles = false
```

Fugu then adds no CSS at all, for a site that styles every class itself. Pages still work, but the sidebar, ingredient controls, popovers and diagrams are unstyled until you do. It's usually less work to keep `fugu.css` and override what you don't want.

## Overriding a template

Any layout or partial can be replaced by copying it to the same path in your site's `layouts/` and editing the copy: `themes/fugu/layouts/partials/recipe-card.html` becomes your `layouts/partials/recipe-card.html`. Each file opens with a comment saying what it does and what calls it.

Change what you like. These are the limits, the things a copy can break without any error:

- **A copy is frozen.** It keeps the version you copied, and misses Fugu's later fixes and features. When you update Fugu, read the CHANGELOG's "Changed" lines and diff the original between the two versions (`git diff v0.2.0 v0.3.0 -- layouts/partials/recipe-card.html`) for anything to carry over.
- **The scripts read the markup.** `ingredients.js`, `automagic-sidebar.js` and `search.js` find their way by class names, `data-` attributes and a few ids that the templates write: the `data-ing-heading`, `data-method-heading` and `data-sidebar-heading` marks from `_markup/render-heading.html`, the `data-sidebar-slot`, `data-servings-base` and `data-page-key` ones and `#single_header` from `_default/single.html`, the search ids from Blowfish's search partial, and `#fugu-strings` from `partials/js-strings.html`. Keep them in a copy, or that part of the page stops working (check-off, scaling, the sidebar, search) while the rest looks fine.
- **So do the styles.** `fugu.css` styles the classes the templates write; rename one and it's unstyled.
- **Some partials return a value, and are cached.** Partials such as `section/role.html`, `principle/term.html` and `blueprint/info.html` return a value instead of HTML, and are called with `partialCached`, keyed by their argument. A copy has to return the same kind of value, and depend only on that argument: it's worked out once per key, not once per page.
- **Some are Blowfish's.** 15 of Fugu's layouts are full copies of Blowfish files with Fugu's changes, and each says so in its opening comment, listing the changes ([blowfish.md](blowfish.md) has them all). A copy of one of those takes over both: keep Fugu's changes, and Blowfish's later fixes won't reach it either.

Prefer a property or a CSS rule when one will do: those carry over to new versions.

Two hooks are empty on purpose, made for overriding:

- `partials/fonts.html`: web fonts, above.
- Blowfish's `partials/extend-head.html` and `partials/extend-footer.html`: anything else for the `<head>`, or the end of the page (analytics, a script).

The header, footer and home page are Blowfish's unless you override them; [Blowfish's docs](https://blowfish.page/docs/) cover those.

## Icons

The formula diagrams' icons are SVGs in `assets/icons/formula/`, and the stack diagrams' layers are in `assets/icons/layers/`. Put a file of the same name in your site's `assets/icons/formula/` or `assets/icons/layers/` to replace one, or a new name to add one. [features.md](features.md#the-icon-kit) lists the names.

**Drawing a formula icon.** Fugu's are drawn to these rules, so a new one sits beside them:

- A `0 0 48 48` viewBox, with `fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"` on the `<svg>`, so every line is the text colour.
- One fill, on the object's body: `style="fill:var(--accent-soft, var(--fugu-accent-soft))"`. A lid, cap or top face takes `style="fill:var(--surface, var(--fugu-surface))"`. No other colours, so dark mode and a site's accent reach it.
- Simple, even shapes, not hand-drawn wobble; detail is a stroke or two.
- It has to read at 24px (the card strip) and 34px (the sidebar) as well as 48px (the page).
- The file name is the name a ```` ```formula ```` block uses: one lower-case word (`buttermilk`, not `butter-milk`). Fugu finds new files by name; there's nothing else to register.

**Drawing a stack layer.** The layers are drawn to these rules, so they stack with each other:

- A viewBox `0 0 210 <height>`: 210 wide, centred on x=105, as tall as the layer needs. On the `<svg>`, `fill="none" stroke-linecap="round" stroke-linejoin="round"`, and `data-edge`, how far the drawing reaches right of the centre, so the label's leader starts just past it.
- Seen from a three-quarter angle: round things are ellipses 0.34 as tall as they are wide, square ones (lasagne, sandwiches) are slabs on the same footprint.
- One ink line, `stroke="currentColor"`: about 1.8 for outlines, 0.6–1.2 for detail. Texture (crumb, seeds, sear, grill marks) is strokes and stipple, never a gradient or a photo.
- Fills: a body or side takes `var(--accent-soft, var(--fugu-accent-soft))`, a top face `var(--surface, var(--fugu-surface))`. Food that needs its colour uses the kit's, always with Fugu's as the fallback: `var(--kit-red, var(--fugu-kit-red))`, the `-green`, `-yellow`, `-top` and `--sear*` ones, as listed under [Food colours](#food-colours).
- The file name is the key: lower case, hyphenated (`patty-thick-grilled`). A spread drawn on its bun is its own file, named for the pair: `bun-base+mayo.svg` is the key `bun-base + mayo`.
