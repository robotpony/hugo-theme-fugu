# /image-add

Add one or more photos to a recipe, essay, or other page of a Fugu site.

Usage: /image-add <image path(s)> <page title or file>

The page can be named by title ("Lazy tomato soup"), slug, or path. Fugu's `docs/recipe-format.md` §Photos says how photos show on the page. Needs ImageMagick 7 (`magick`) and `exiftool`; if either is missing, say so and stop.

1. **Find the page.** Match by `title` in frontmatter, then by file name, under `content/`. If more than one page matches, or none, ask. Don't guess.
2. **Pick where the photo goes.** A photo needs to be in the page's bundle or under `assets/` to get a thumbnail and a resized display copy; under `static/` it's used as it is. So:
   - The page is a bundle (`<slug>/index.md`): put the photo beside it, and link it by its file name.
   - Otherwise, if the site already keeps photos somewhere (look for existing `![...]( )` links in that section), use the same folder.
   - Otherwise use `assets/images/<section>/`, where `<section>` is the page's section folder, and link it as `/images/<section>/<name>.jpg`. Check the link resolves: Fugu's image hook finds `assets/images/...` for a `/images/...` link.
   - If none of these is clear, ask.
3. **Look at each image** (Read it) so the name and alt text describe what's actually in it.
4. **Name the file**, kebab-case: the page's slug for the first photo (`lazy-tomato-soup.jpg`), and `<slug>-<what-it-shows>.jpg` for any others (`lazy-tomato-soup-simmering.jpg`). `.jpg` for photos (HEIC, JPEG, WebP), `.png` only for PNG sources. If the name is taken, pick a more specific one; never overwrite.
5. **Process and copy** each image with Fugu's `tools/add-image.sh <source> <destination>` (find Fugu as `/lint` says). It bakes the EXIF rotation into the pixels, strips all metadata (GPS included), caps the long edge, and refuses to overwrite. Report its output; if it fails, stop and show the error.
6. **Check rotation.** Read the processed file and confirm it's upright. If it looks sideways (the camera's orientation tag was wrong), say so and offer to rotate it with `magick <file> -rotate 90 <file>` (or -90, 180).
7. **Choose placement.** On the page a photo becomes a sidebar thumbnail with a "Photo N" marker left in the text; in print it stays inline. Use the obvious spot when there is one:
   - A hero shot of the finished dish: after the intro, before the first `##` section, unless the page already puts its photos at the end.
   - A photo of a step: beside the paragraph it illustrates.
   If it isn't clear (several candidate paragraphs, a multi-component recipe), ask, showing the candidate spots.
8. **Link it** in standard Markdown on its own line, with blank lines around it: `![<alt text>](<link>)`. The alt text describes what's in the photo, specific and plain; for a hero shot, start from the page's title. Add a caption as the title in quotes only if the user wants one.
9. **Show the result**: the files written, with size and dimensions, and the diff to the page. Don't commit.
