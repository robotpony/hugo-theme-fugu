module github.com/robotpony/hugo-theme-fugu

go 1.21

// The Blowfish commit Fugu is tested against (295dae3). A site importing
// Fugu as a Hugo module gets at least this version; move it with CI's
// BLOWFISH_REF and the Hugo range in CLAUDE.md.
require github.com/nunocoracao/blowfish/v3 v3.6.1-0.20260913212648-295dae334547
