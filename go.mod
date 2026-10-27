module github.com/robotpony/hugo-theme-fugu

go 1.21

// The Blowfish commit Fugu is tested against (295dae3). A site importing
// Fugu as a Hugo module gets at least this version; move it with CI's
// BLOWFISH_REF and the Hugo range in CLAUDE.md.
require github.com/nunocoracao/blowfish/v3 v3.6.1-0.20260913212648-295dae334547

// hugo-warped's fence partials (4045b3f), imported in hugo.toml. Move it
// with CI's HUGO_WARPED_REF, after running hugo-warped's
// tools/run-hugo-fixtures.py against Fugu; 0b971b3 is the oldest the card
// strips work with.
require github.com/robotpony/hugo-warped v0.0.0-20261027153628-4045b3f61ca8
