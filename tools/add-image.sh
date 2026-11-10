#!/usr/bin/env bash
# Prepare a photo for the site: bake EXIF rotation into the pixels, strip all
# metadata (GPS included), cap the long edge, and write it to its destination.
#
# Usage: tools/add-image.sh <source> <destination>
#   destination: a path ending in .jpg or .png, relative to the site
#   ($FUGU_SITE_ROOT, or the nearest Hugo site at or above the working
#   directory), e.g. assets/images/recipes/<name>.jpg, or beside a page
#   bundle's index.md. A photo under assets/ or in a bundle gets a
#   thumbnail and a resized copy; one under static/ is used as it is.
#
# The destination's extension picks the format: .jpg for photos, .png for
# screenshots and scans. Refuses to overwrite an existing file.

set -euo pipefail

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  # The header comment above is the help text, with the script's path as
  # it was run (from a site, themes/fugu/tools/add-image.sh).
  sed -n '2,/^$/{/^$/q;s/^# \{0,1\}//;p;}' "$0" | awk -v me="$0" '{ sub(/tools\/add-image\.sh/, me); print }'
  echo
  echo "Needs ImageMagick 7 (magick) and exiftool."
  exit 0
fi

for tool in magick exiftool; do
  command -v "$tool" >/dev/null || {
    echo "error: $tool not found; add-image.sh needs ImageMagick 7 (magick) and exiftool" >&2
    exit 1
  }
done

MAX_EDGE=2000
QUALITY=85

src="${1:?usage: $0 <source> <destination>}"
dest="${2:?usage: $0 <source> <destination>}"

[[ -f "$src" ]] || { echo "error: source not found: $src" >&2; exit 1; }

# A relative destination is in the site, wherever this runs from (the same
# rule as frontmatter.py's).
if [[ "$dest" != /* ]]; then
  if [[ -n "${FUGU_SITE_ROOT:-}" ]]; then
    root="$FUGU_SITE_ROOT"
  else
    root=""
    d="$PWD"
    while [[ -n "$d" ]]; do
      if [[ -d "$d/content" ]]; then
        for n in hugo.toml hugo.yaml hugo.json config.toml config; do
          [[ -e "$d/$n" ]] && { root="$d"; break 2; }
        done
      fi
      [[ "$d" == / ]] && break
      d="$(dirname "$d")"
    done
  fi
  [[ -n "$root" ]] || { echo "error: no Hugo site found at or above $PWD; run it inside one, set FUGU_SITE_ROOT, or give an absolute destination" >&2; exit 1; }
  dest="$root/$dest"
fi
[[ -e "$dest" ]] && { echo "error: destination exists: $dest" >&2; exit 1; }

case "${dest##*.}" in
  jpg|png) ;;
  *) echo "error: destination must end in .jpg or .png" >&2; exit 1 ;;
esac

mkdir -p "$(dirname "$dest")"

before=$(magick identify -format '%wx%h' "$src[0]")
orient=$(exiftool -s3 -Orientation "$src" || true)

# -auto-orient applies the EXIF Orientation to the pixels; -strip then drops
# the tag (and GPS, camera, timestamps) so no viewer rotates it a second time.
magick "$src[0]" -auto-orient -resize "${MAX_EDGE}x${MAX_EDGE}>" -strip \
  -quality "$QUALITY" "$dest"

after=$(magick identify -format '%wx%h' "$dest")
left=$(exiftool -s3 -Orientation -GPSPosition -GPSLatitude "$dest" || true)
if [[ -n "$left" ]]; then
  echo "error: metadata survived in $dest: $left" >&2
  exit 1
fi

echo "source:      $src ($before, orientation: ${orient:-none})"
echo "written:     $dest ($after, $(du -h "$dest" | cut -f1 | tr -d ' '))"
echo "metadata:    stripped"
