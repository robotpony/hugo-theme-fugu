#!/usr/bin/env python3
"""
test_tools.py: unittest tests for the tools in tools/, run on the fixture
sites in tests/sites/.

Each test runs a tool as a site would, in a subprocess, so they cover the
command lines, exit codes and output that docs/tools.md describes, not just
the functions. Tests that change files work on a copy of a fixture, placed
so its themesDir (../../../..) still finds Fugu, Blowfish and hugo-warped:
the copy sits three folders deep in a temporary folder that links to them.

Needs Python 3 and Hugo (the tools read a site's sections through `hugo
config`). The add-image.sh tests also need ImageMagick 7 and exiftool, and
are skipped without them.

    python3 tests/test_tools.py
    python3 -m unittest tests/test_tools.py -k drafts
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

FUGU = Path(__file__).resolve().parent.parent
TOOLS = FUGU / "tools"
SITES = FUGU / "tests" / "sites"
THEMES = FUGU.parent  # holds fugu/, blowfish/ and hugo-warped/, as themesDir expects


def run(tool, *args, site=None, cwd=None):
    """Runs a tool, on `site` through FUGU_SITE_ROOT when given."""
    env = dict(os.environ)
    env.pop("FUGU_SITE_ROOT", None)
    if site is not None:
        env["FUGU_SITE_ROOT"] = str(site)
    cmd = ([sys.executable] if tool.endswith(".py") else []) + [str(TOOLS / tool), *map(str, args)]
    return subprocess.run(cmd, capture_output=True, text=True, env=env,
                          cwd=cwd or site or FUGU, timeout=300)


class SiteCopy:
    """A fixture copied where its themesDir still finds the themes."""

    def __init__(self, name):
        self.tmp = Path(tempfile.mkdtemp(prefix="fugu-tools-"))
        for theme in ("fugu", "blowfish", "hugo-warped"):
            (self.tmp / theme).symlink_to(THEMES / theme)
        self.root = self.tmp / "a" / "b" / "c" / name
        shutil.copytree(SITES / name, self.root,
                        ignore=shutil.ignore_patterns("public", "resources", ".hugo_build.lock"))

    def cleanup(self):
        shutil.rmtree(self.tmp, ignore_errors=True)


class FrontmatterCheck(unittest.TestCase):
    def check(self, site, *paths):
        r = run("frontmatter.py", "check", "--json", *paths, site=site)
        return r, json.loads(r.stdout)

    def test_fixtures_have_no_errors(self):
        for name in ("recipes-only", "everything", "methods-section", "renamed"):
            with self.subTest(site=name):
                r, report = self.check(SITES / name)
                self.assertEqual(r.returncode, 0, r.stderr)
                self.assertEqual(report["total_errors"], 0)
                self.assertGreater(report["files_checked"], 0)

    def test_renamed_sections_come_from_params(self):
        # renamed's recipes are in content/dishes/. A page there without
        # tags is an error only if the tool read [params.fugu] and treats
        # the folder as the recipe section (an essay's tags are optional).
        site = SiteCopy("renamed")
        self.addCleanup(site.cleanup)
        (site.root / "content" / "dishes" / "untagged.md").write_text(
            "---\ntitle: Untagged\ndate: 2026-11-11\n---\n\nBody.\n")
        (site.root / "content" / "writing" / "untagged.md").write_text(
            "---\ntitle: Untagged essay\ndate: 2026-11-11\n---\n\nBody.\n")
        r, report = self.check(site.root)
        self.assertEqual(r.returncode, 1)
        self.assertTrue(any("tags" in e for e in report["issues"]["content/dishes/untagged.md"]["errors"]))
        self.assertEqual(report["issues"]["content/writing/untagged.md"]["errors"], [])

    def test_errors_fail_the_check(self):
        site = SiteCopy("recipes-only")
        self.addCleanup(site.cleanup)
        bad = site.root / "content" / "recipes" / "bad.md"
        bad.write_text("---\ntitle: Bad\ntags: \"#rice\"\ndate: 11/11/2026\ndraft: maybe\n---\n\nBody.\n")
        r, report = self.check(site.root)
        self.assertEqual(r.returncode, 1)
        errors = " ".join(report["issues"]["content/recipes/bad.md"]["errors"])
        for word in ("tags", "date", "draft"):
            self.assertIn(word, errors)

    def test_missing_required_field(self):
        site = SiteCopy("recipes-only")
        self.addCleanup(site.cleanup)
        (site.root / "content" / "recipes" / "untagged.md").write_text(
            "---\ntitle: Untagged\ndate: 2026-11-11\n---\n\nBody.\n")
        r, report = self.check(site.root)
        self.assertEqual(r.returncode, 1)
        self.assertTrue(any("tags" in e for e in report["issues"]["content/recipes/untagged.md"]["errors"]))

    def test_warnings_alone_pass(self):
        r, report = self.check(SITES / "recipes-only")
        self.assertGreater(report["total_warnings"], 0)
        self.assertEqual(r.returncode, 0)


class FrontmatterEdit(unittest.TestCase):
    def setUp(self):
        self.site = SiteCopy("everything")
        self.addCleanup(self.site.cleanup)
        self.page = "content/recipes/plain-rice.md"
        self.path = self.site.root / self.page
        self.before = self.path.read_text()

    def fm(self, *args):
        return run("frontmatter.py", *args, site=self.site.root)

    def body(self, text):
        return text.split("\n---\n", 1)[1]

    def test_get_one_field_and_all(self):
        r = self.fm("get", self.page, "title")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(r.stdout.strip(), "Plain rice")
        fields = json.loads(self.fm("get", self.page).stdout)
        self.assertEqual(fields["title"], "Plain rice")
        self.assertIsInstance(fields["tags"], list)

    def test_get_unset_field(self):
        r = self.fm("get", self.page, "no_such_field")
        self.assertEqual(r.returncode, 1)
        self.assertIn("not set", r.stderr)

    def test_missing_file_is_one_line(self):
        r = self.fm("get", "content/recipes/nope.md", "title")
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("no such file", r.stderr)
        self.assertNotIn("Traceback", r.stderr)

    def test_set_types(self):
        for value, want in (("indian", "indian"), ("true", True), ("4", 4), ("[a, b]", ["a", "b"])):
            with self.subTest(value=value):
                self.assertEqual(self.fm("set", self.page, "trial", value).returncode, 0)
                got = json.loads(self.fm("get", "--json", self.page, "trial").stdout)
                self.assertEqual(got, want)

    def test_set_and_unset_leave_the_rest(self):
        self.assertNotIn("trial:", self.before)
        self.assertEqual(self.fm("set", self.page, "trial", "yes please").returncode, 0)
        after = self.path.read_text()
        self.assertIn("trial: yes please", after)
        self.assertEqual(self.body(after), self.body(self.before))
        self.assertEqual(self.fm("unset", self.page, "trial").returncode, 0)
        self.assertEqual(self.path.read_text(), self.before)

    def test_unset_missing_field(self):
        r = self.fm("unset", self.page, "no_such_field")
        self.assertEqual(r.returncode, 1)
        self.assertEqual(self.path.read_text(), self.before)


class Drafts(unittest.TestCase):
    def drafts(self, site):
        r = run("drafts.py", "--json", site=site)
        self.assertEqual(r.returncode, 0, r.stderr)
        return {d["path"] for d in json.loads(r.stdout)}

    def test_everything(self):
        self.assertEqual(self.drafts(SITES / "everything"), {
            "content/recipes/fridge-soup.md",
            "content/essays/methods/rice-bowls/builds/poke-bowl.md",
        })

    def test_none(self):
        self.assertEqual(self.drafts(SITES / "recipes-only"), set())

    def test_new_draft_in_a_renamed_section(self):
        site = SiteCopy("renamed")
        self.addCleanup(site.cleanup)
        (site.root / "content" / "dishes" / "trial.md").write_text(
            "---\ntitle: Trial\ntags: [rice]\ndate: 2026-11-11\ndraft: true\n---\n\nBody.\n")
        self.assertEqual(self.drafts(site.root), {"content/dishes/trial.md"})


class SiteRoot(unittest.TestCase):
    def test_found_from_inside_the_site(self):
        r = run("drafts.py", "--json", cwd=SITES / "everything" / "content" / "recipes")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(len(json.loads(r.stdout)), 2)

    def test_outside_a_site_says_so(self):
        with tempfile.TemporaryDirectory() as tmp:
            for tool in ("drafts.py", "frontmatter.py"):
                with self.subTest(tool=tool):
                    args = ("check",) if tool == "frontmatter.py" else ()
                    r = run(tool, *args, cwd=tmp)
                    self.assertNotEqual(r.returncode, 0)
                    self.assertIn("no Hugo site found", r.stderr)


class CompareBuilds(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="fugu-compare-"))
        self.addCleanup(shutil.rmtree, self.tmp, True)
        for side in ("old", "new"):
            (self.tmp / side / "a").mkdir(parents=True)
            (self.tmp / side / "a" / "index.html").write_text("<p>  same </p>\n")

    def compare(self):
        return run("compare-builds.py", self.tmp / "old", self.tmp / "new", cwd=self.tmp)

    def test_identical(self):
        r = self.compare()
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn("0 changed, 0 added, 0 removed", r.stdout)

    def test_whitespace_alone_is_identical(self):
        (self.tmp / "new" / "a" / "index.html").write_text("<p>same</p>")
        self.assertEqual(self.compare().returncode, 0)

    def test_changed_added_removed(self):
        (self.tmp / "new" / "a" / "index.html").write_text("<p>different</p>\n")
        (self.tmp / "new" / "b.html").write_text("new\n")
        (self.tmp / "old" / "c.html").write_text("gone\n")
        r = self.compare()
        self.assertEqual(r.returncode, 1)
        self.assertIn("1 changed, 1 added, 1 removed", r.stdout)


@unittest.skipUnless(shutil.which("magick") and shutil.which("exiftool"),
                     "add-image.sh needs ImageMagick 7 and exiftool")
class AddImage(unittest.TestCase):
    def setUp(self):
        self.site = SiteCopy("recipes-only")
        self.addCleanup(self.site.cleanup)
        self.src = self.site.tmp / "photo.jpg"
        # A wide photo with a GPS tag and EXIF rotation, as phones write them.
        subprocess.run(["magick", "-size", "4000x1000", "gradient:red-blue", str(self.src)], check=True)
        subprocess.run(["exiftool", "-q", "-overwrite_original", "-Orientation#=6",
                        "-GPSLatitude=48.4", "-GPSLatitudeRef=N", str(self.src)], check=True)

    def add(self, dest):
        return run("add-image.sh", self.src, dest, site=self.site.root)

    def test_rotates_strips_and_caps(self):
        dest = "assets/images/recipes/photo.jpg"
        r = self.add(dest)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        out = self.site.root / dest
        size = subprocess.run(["magick", "identify", "-format", "%w %h", str(out)],
                              capture_output=True, text=True).stdout.split()
        w, h = map(int, size)
        self.assertGreater(h, w)  # turned upright from the EXIF rotation
        self.assertLess(max(w, h), 4000)  # long edge capped
        tags = subprocess.run(["exiftool", "-GPSLatitude", "-Orientation", str(out)],
                              capture_output=True, text=True).stdout
        self.assertNotIn("GPS", tags)

    def test_refuses_to_overwrite(self):
        dest = "assets/images/recipes/photo.jpg"
        self.assertEqual(self.add(dest).returncode, 0)
        r = self.add(dest)
        self.assertNotEqual(r.returncode, 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
