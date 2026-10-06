#!/usr/bin/env bash
# Prepare a photo for the site: bake EXIF rotation into the pixels, strip all
# metadata (GPS included), cap the long edge, and write it to its destination.
#
# Usage: tools/add-image.sh <source> <destination>
#   destination: static/images/<section>/<name>.jpg (or .png)
#
# HEIC/HEIF/WebP/JPEG sources become JPEG; PNG stays PNG (screenshots, scans).
# Refuses to overwrite an existing file.

set -euo pipefail

MAX_EDGE=2000
QUALITY=85

src="${1:?usage: add-image.sh <source> <destination>}"
dest="${2:?usage: add-image.sh <source> <destination>}"

[[ -f "$src" ]] || { echo "error: source not found: $src" >&2; exit 1; }
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
