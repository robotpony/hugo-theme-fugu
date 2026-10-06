#!/usr/bin/env python3
"""
frontmatter.py — Review and edit frontmatter across content/recipes,
content/essays, and content/reference.

No third-party dependencies. Frontmatter in this vault is a flat YAML
mapping (scalars, flow lists `[a, b, c]`, occasional block lists, one
folded long value) — this parses exactly that subset, not general YAML.

Subcommands:
    check [paths...]           Validate required/recommended fields, report issues
    get <file> [field]         Print a field's value (or all fields as JSON)
    set <file> <field> <value> Set a field, preserving the rest of the file
    unset <file> <field>       Remove a field
"""

import argparse
import json
import re
import sys
from pathlib import Path



def find_site_root():
    """The Hugo site this tool works on: $FUGU_SITE_ROOT if set, otherwise
    the nearest directory at or above the working directory that has a
    content/ folder and a Hugo config. The tools ship inside the theme
    (themes/fugu/tools/), so the script's own location isn't the site."""
    import os
    if os.environ.get("FUGU_SITE_ROOT"):
        return Path(os.environ["FUGU_SITE_ROOT"]).resolve()
    here = Path.cwd().resolve()
    for d in (here, *here.parents):
        has_config = any((d / n).exists() for n in
                         ("hugo.toml", "hugo.yaml", "hugo.json", "config.toml", "config"))
        if (d / "content").is_dir() and has_config:
            return d
    return here


REPO_ROOT = find_site_root()

TOP_KEY_RE = re.compile(r"^([A-Za-z_][A-Za-z0-9_]*):[ \t]*(.*)$")
BLOCK_ITEM_RE = re.compile(r"^[ \t]{2,}-[ \t]*(.*)$")
COMMENT_LINE_RE = re.compile(r"^[ \t]*#")
CONTINUATION_RE = re.compile(r"^[ \t]+\S")

# Output field order — same spirit as migrate.py's FIELD_ORDER, extended
# with essay/reference-only fields. Unknown fields are appended after.
FIELD_ORDER = [
    "title", "tags", "source", "author", "date", "servings", "portions",
    "prep_time", "cook_time", "total_time", "cuisine",
    "description", "draft", "featured",
]

REQUIRED_FIELDS = {
    "recipe": ["title", "tags", "date"],
    "essay": ["title", "date"],
    "reference": ["title", "date"],
    "log": ["title", "date"],
}

RECOMMENDED_FIELDS = {
    "recipe": ["source", "draft"],
    "essay": ["tags", "draft"],
    "reference": ["source", "tags", "draft"],
    "log": [],
}

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


class FrontmatterError(Exception):
    pass


def parse_scalar(raw):
    raw = raw.strip()
    if raw == "":
        return None
    if len(raw) >= 2 and raw[0] == '"' and raw[-1] == '"':
        return raw[1:-1].replace('\\"', '"')
    if len(raw) >= 2 and raw[0] == "'" and raw[-1] == "'":
        return raw[1:-1].replace("''", "'")
    if raw in ("true", "True"):
        return True
    if raw in ("false", "False"):
        return False
    if raw in ("null", "~"):
        return None
    if re.fullmatch(r"-?\d+", raw):
        return int(raw)
    if re.fullmatch(r"-?\d+\.\d+", raw):
        return float(raw)
    return raw


def parse_flow_list(raw):
    inner = raw.strip()
    assert inner.startswith("[") and inner.endswith("]")
    inner = inner[1:-1].strip()
    if inner == "":
        return []
    items = [parse_scalar(item.strip()) for item in inner.split(",")]
    return items


def split_frontmatter(text):
    """Return (fm_lines, body) where fm_lines excludes the --- delimiters."""
    if not text.startswith("---"):
        raise FrontmatterError("file has no frontmatter (must start with ---)")
    lines = text.split("\n")
    if lines[0].strip() != "---":
        raise FrontmatterError("file has no frontmatter (must start with ---)")
    end = None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            end = i
            break
    if end is None:
        raise FrontmatterError("frontmatter is not closed with a second ---")
    fm_lines = lines[1:end]
    body = "\n".join(lines[end + 1:])
    return fm_lines, body


def parse_fields(fm_lines):
    """Parse frontmatter lines into {key: value}, ignoring comments."""
    fields = {}
    i = 0
    n = len(fm_lines)
    while i < n:
        line = fm_lines[i]
        if COMMENT_LINE_RE.match(line) or line.strip() == "":
            i += 1
            continue
        m = TOP_KEY_RE.match(line)
        if not m:
            i += 1
            continue
        key, rest = m.group(1), m.group(2)
        rest = rest.strip()
        if rest == "":
            # Either a block list follows, or the value is null.
            items = []
            j = i + 1
            while j < n and BLOCK_ITEM_RE.match(fm_lines[j]):
                items.append(parse_scalar(BLOCK_ITEM_RE.match(fm_lines[j]).group(1)))
                j += 1
            if items:
                fields[key] = items
                i = j
                continue
            fields[key] = None
            i += 1
            continue
        if rest.startswith("["):
            fields[key] = parse_flow_list(rest)
            i += 1
            continue
        # Scalar, possibly folded onto following indented lines.
        value_parts = [rest]
        j = i + 1
        while j < n and CONTINUATION_RE.match(fm_lines[j]) and not BLOCK_ITEM_RE.match(fm_lines[j]):
            value_parts.append(fm_lines[j].strip())
            j += 1
        fields[key] = parse_scalar(" ".join(value_parts))
        i = j
    return fields


def field_span(fm_lines, key):
    """Return (start, end) line-index span (end exclusive) for key, or None."""
    n = len(fm_lines)
    for i, line in enumerate(fm_lines):
        if COMMENT_LINE_RE.match(line):
            continue
        m = TOP_KEY_RE.match(line)
        if m and m.group(1) == key:
            j = i + 1
            rest = m.group(2).strip()
            if rest == "":
                while j < n and BLOCK_ITEM_RE.match(fm_lines[j]):
                    j += 1
            elif not rest.startswith("["):
                while j < n and CONTINUATION_RE.match(fm_lines[j]) and not BLOCK_ITEM_RE.match(fm_lines[j]):
                    j += 1
            return (i, j)
    return None


def needs_quoting(s):
    if s == "":
        return True
    if s[0] in "\"'[]{}#&*!|>%@`":
        return True
    if s.strip() != s:
        return True
    if ": " in s or s.endswith(":"):
        return True
    if s in ("true", "false", "null", "~"):
        return True
    if re.fullmatch(r"-?\d+(\.\d+)?", s):
        return True
    return False


def serialize_scalar(value):
    if value is None:
        return ""
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    s = str(value)
    if needs_quoting(s):
        return '"' + s.replace('"', '\\"') + '"'
    return s


def serialize_value_lines(key, value):
    """Return the list of raw lines to represent key: value."""
    if isinstance(value, list):
        if not value:
            return [f"{key}: []"]
        items = ", ".join(serialize_scalar(v) for v in value)
        return [f"{key}: [{items}]"]
    return [f"{key}: {serialize_scalar(value)}"]


def read_file(path):
    text = path.read_text(encoding="utf-8")
    fm_lines, body = split_frontmatter(text)
    return fm_lines, body


def write_file(path, fm_lines, body):
    text = "---\n" + "\n".join(fm_lines) + "\n---\n" + body
    if not text.endswith("\n"):
        text += "\n"
    path.write_text(text, encoding="utf-8")


def set_field(path, key, value):
    fm_lines, body = read_file(path)
    new_lines = serialize_value_lines(key, value)
    span = field_span(fm_lines, key)
    if span is not None:
        start, end = span
        fm_lines[start:end] = new_lines
    else:
        insert_at = len(fm_lines)
        if key in FIELD_ORDER:
            target_rank = FIELD_ORDER.index(key)
            insert_at = 0
            for i, line in enumerate(fm_lines):
                m = TOP_KEY_RE.match(line) if not COMMENT_LINE_RE.match(line) else None
                if m and m.group(1) in FIELD_ORDER and FIELD_ORDER.index(m.group(1)) <= target_rank:
                    span2 = field_span(fm_lines, m.group(1))
                    insert_at = span2[1]
        fm_lines[insert_at:insert_at] = new_lines
    write_file(path, fm_lines, body)


def unset_field(path, key):
    fm_lines, body = read_file(path)
    span = field_span(fm_lines, key)
    if span is None:
        return False
    start, end = span
    del fm_lines[start:end]
    write_file(path, fm_lines, body)
    return True


def infer_value(raw, type_hint=None):
    if type_hint == "list":
        return [v.strip() for v in raw.split(",") if v.strip() != ""]
    if type_hint == "bool":
        return raw.strip().lower() in ("true", "1", "yes")
    if type_hint == "int":
        return int(raw)
    if type_hint == "str":
        return raw
    # Auto-detect.
    if raw.strip().startswith("[") and raw.strip().endswith("]"):
        return parse_flow_list(raw.strip())
    if raw in ("true", "false"):
        return raw == "true"
    if re.fullmatch(r"-?\d+", raw):
        return int(raw)
    return raw


# ---------------------------------------------------------------------------
# check
# ---------------------------------------------------------------------------

def classify(path):
    parts = path.relative_to(REPO_ROOT / "content").parts
    if parts[0] == "recipes":
        return "recipe"
    if parts[0] == "essays":
        return "essay"
    if parts[0] == "reference":
        return "reference"
    if parts[0] == "the-food-log":
        return "log"
    return None


def collect_files(paths):
    if paths:
        files = []
        for p in paths:
            p = Path(p)
            if p.is_dir():
                files.extend(sorted(p.rglob("*.md")))
            else:
                files.append(p)
        return files
    files = []
    for section in ("recipes", "essays", "reference", "the-food-log"):
        files.extend(sorted((REPO_ROOT / "content" / section).rglob("*.md")))
    return files


def check_file(path):
    """Return (errors, warnings) lists of human-readable strings."""
    errors, warnings = [], []
    kind = classify(path)
    if kind is None or path.name == "_index.md" or path.name.startswith("."):
        return errors, warnings

    try:
        fm_lines, _ = read_file(path)
    except FrontmatterError as e:
        return [str(e)], warnings

    fields = parse_fields(fm_lines)

    for key in REQUIRED_FIELDS[kind]:
        if key not in fields or fields[key] in (None, "", []):
            errors.append(f"missing required field '{key}'")

    for key in RECOMMENDED_FIELDS[kind]:
        if key not in fields or fields[key] in (None, "", []):
            warnings.append(f"missing recommended field '{key}'")

    if "tags" in fields and fields["tags"] is not None:
        tags = fields["tags"]
        if not isinstance(tags, list):
            errors.append("'tags' must be a list")
        else:
            for t in tags:
                if not isinstance(t, str):
                    errors.append(f"tag {t!r} is not a plain string")
                elif t.startswith("#"):
                    errors.append(f"tag '{t}' has a leading '#' (tags are plain strings)")

    if "date" in fields and fields["date"] is not None:
        date_val = fields["date"]
        if not isinstance(date_val, str) or not DATE_RE.match(date_val):
            errors.append(f"'date' is not ISO 8601 (YYYY-MM-DD): {date_val!r}")

    if "draft" in fields and fields["draft"] is not None:
        if not isinstance(fields["draft"], bool):
            errors.append(f"'draft' is not a boolean: {fields['draft']!r}")

    if "title" in fields and not fields.get("title"):
        errors.append("'title' is empty")

    return errors, warnings


def cmd_check(args):
    files = collect_files(args.paths)
    results = {}
    titles = {}
    total_errors = 0
    total_warnings = 0

    for path in files:
        rel = str(path.relative_to(REPO_ROOT)) if path.is_absolute() else str(path)
        kind = classify(path if path.is_absolute() else (REPO_ROOT / path))
        if kind is None or path.name == "_index.md" or path.name.startswith("."):
            continue
        errors, warnings = check_file(path if path.is_absolute() else (REPO_ROOT / path))
        if errors or warnings:
            results[rel] = {"errors": errors, "warnings": warnings}
        total_errors += len(errors)
        total_warnings += len(warnings)

        if kind == "recipe":
            try:
                fm_lines, _ = read_file(path if path.is_absolute() else (REPO_ROOT / path))
                title = parse_fields(fm_lines).get("title")
                if title:
                    titles.setdefault(title, []).append(rel)
            except FrontmatterError:
                pass

    dupes = {t: paths for t, paths in titles.items() if len(paths) > 1}
    for title, paths in dupes.items():
        for rel in paths:
            results.setdefault(rel, {"errors": [], "warnings": []})
            results[rel]["errors"].append(f"duplicate title '{title}' also used by {[p for p in paths if p != rel]}")
            total_errors += 1

    if args.json:
        checked_files = [f for f in files if f.name != "_index.md" and not f.name.startswith(".")]
        print(json.dumps({
            "files_checked": len(checked_files),
            "files_with_issues": len(results),
            "total_errors": total_errors,
            "total_warnings": total_warnings,
            "issues": results,
        }, indent=2))
    else:
        checked = len([f for f in files if f.name != "_index.md" and not f.name.startswith(".")])
        if not results:
            print(f"Checked {checked} files. No issues found.")
        else:
            for rel in sorted(results):
                issues = results[rel]
                print(rel)
                for e in issues["errors"]:
                    print(f"  ERROR: {e}")
                for w in issues["warnings"]:
                    print(f"  warn:  {w}")
            clean = checked - len(results)
            print()
            print(f"{len(results)} file(s) with issues, {clean} clean, "
                  f"{total_errors} error(s), {total_warnings} warning(s).")

    return 1 if total_errors else 0


# ---------------------------------------------------------------------------
# get / set / unset
# ---------------------------------------------------------------------------

def cmd_get(args):
    path = Path(args.file)
    fm_lines, _ = read_file(path)
    fields = parse_fields(fm_lines)
    if args.field:
        if args.field not in fields:
            print(f"'{args.field}' not set in {path}", file=sys.stderr)
            return 1
        value = fields[args.field]
        if args.json:
            print(json.dumps(value))
        elif isinstance(value, list):
            print(", ".join(str(v) for v in value))
        else:
            print("" if value is None else value)
    else:
        print(json.dumps(fields, indent=2))
    return 0


def cmd_set(args):
    path = Path(args.file)
    value = infer_value(args.value, args.type)
    set_field(path, args.field, value)
    print(f"{args.field}: {json.dumps(value)} -> {path}")
    return 0


def cmd_unset(args):
    path = Path(args.file)
    if unset_field(path, args.field):
        print(f"removed '{args.field}' from {path}")
        return 0
    print(f"'{args.field}' not set in {path}", file=sys.stderr)
    return 1


def main():
    parser = argparse.ArgumentParser(description=__doc__.strip().splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)

    p_check = sub.add_parser("check", help="validate frontmatter across content/")
    p_check.add_argument("paths", nargs="*", help="specific files or dirs (default: all content)")
    p_check.add_argument("--json", action="store_true")
    p_check.set_defaults(func=cmd_check)

    p_get = sub.add_parser("get", help="print a frontmatter field (or all fields)")
    p_get.add_argument("file")
    p_get.add_argument("field", nargs="?")
    p_get.add_argument("--json", action="store_true")
    p_get.set_defaults(func=cmd_get)

    p_set = sub.add_parser("set", help="set a frontmatter field")
    p_set.add_argument("file")
    p_set.add_argument("field")
    p_set.add_argument("value")
    p_set.add_argument("--type", choices=["str", "int", "bool", "list"], default=None)
    p_set.set_defaults(func=cmd_set)

    p_unset = sub.add_parser("unset", help="remove a frontmatter field")
    p_unset.add_argument("file")
    p_unset.add_argument("field")
    p_unset.set_defaults(func=cmd_unset)

    args = parser.parse_args()
    try:
        sys.exit(args.func(args))
    except FrontmatterError as e:
        print(f"error: {e}", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
