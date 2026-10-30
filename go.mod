module github.com/robotpony/hugo-theme-fugu

go 1.21

// The Blowfish commit Fugu is tested against (295dae3). A site importing
// Fugu as a Hugo module gets at least this version; move it with CI's
// BLOWFISH_REF and the Hugo range in CLAUDE.md.
require github.com/nunocoracao/blowfish/v3 v3.6.1-0.20260913212648-295dae334547

// hugo-warped's fence and glossary partials (f1846ef), imported in
// hugo.toml. Move it with CI's HUGO_WARPED_REF, after running
// hugo-warped's tools/run-hugo-fixtures.py against Fugu and its
// tools/test-hugo-glossary.py; 0b971b3 is the oldest the card strips work
// with, and 4d260ae the oldest the glossary does.
require github.com/robotpony/hugo-warped v0.0.0-20261030172408-f1846efe41f7
