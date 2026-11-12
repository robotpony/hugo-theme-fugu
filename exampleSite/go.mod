module github.com/robotpony/hugo-theme-fugu/exampleSite

go 1.22

// Fugu from this checkout, not a release, so the example site shows the
// working tree. Blowfish and hugo-warped come at the versions Fugu's own
// go.mod requires.
require github.com/robotpony/hugo-theme-fugu v0.0.0

replace github.com/robotpony/hugo-theme-fugu => ../
