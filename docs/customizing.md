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
| `--fugu-accent`, `-strong`, `-soft` | links, quantities, active controls and focus rings; their hover; tinted fills | near black, black, 7% black |
| `--fugu-flag`, `-soft` | drafts (the Test kitchen mark and strip) and notices | `neutral-700`, 6% black |
| `--fugu-principle-strong` | principle tags' chips and pages | black |
| `--fugu-highlight` | the cuisine chip | black |
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

A copy doesn't get Fugu's later fixes, so keep the change small, and check the original when you update Fugu (`git diff` between the two tags shows what moved). Prefer a property or a CSS rule when one will do.

Two hooks are empty on purpose, made for overriding:

- `partials/fonts.html`: web fonts, above.
- Blowfish's `partials/extend-head.html` and `partials/extend-footer.html`: anything else for the `<head>`, or the end of the page (analytics, a script).

The header, footer and home page are Blowfish's unless you override them; [Blowfish's docs](https://blowfish.page/docs/) cover those.

## Icons

The formula diagrams' icons are SVGs in `assets/icons/formula/`, and the stack diagrams' layers are in `assets/icons/layers/`. Put a file of the same name in your site's `assets/icons/formula/` or `assets/icons/layers/` to replace one, or a new name to add one. They're drawn in `currentColor` with the theme's soft accent and surface fills, so they follow the properties above and dark mode. See [features.md](features.md#the-icon-kit) for the names.
