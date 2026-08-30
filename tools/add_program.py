#!/usr/bin/env python3
"""
xload — add a program to the catalog.

One command that scaffolds a full program page and registers it in
scripts-data.json. Other sessions (or humans) can add programs without
touching HTML by hand.

USAGE (run from anywhere):
  python tools/add_program.py \
      --id my-tool \
      --title "My Tool" \
      --type script \
      --category Productivity \
      --github https://github.com/you/repo \
      --install "https://github.com/you/repo/releases/latest" \
      --short "One-line card summary." \
      --desc "Longer description paragraph."
      --tags "keyword1,keyword2" \
      --license MIT \
      --apply

  --apply        also insert the entry into scripts-data.json (idempotent by id)
  --check        validate only (no write)
  --print-json   only print the JSON entry (no page write)

KNOWN TYPES: script | extension | app | other   (must exist in "types")
CATEGORIES:   must exist in "categories"

Exit code 0 = ok, 1 = error/validation failed.
"""

import argparse
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "scripts-data.json")
TEMPLATE = os.path.join(ROOT, "scripts", "_template.html")

TYPE_LABEL = {
    "script": "Usercript",
    "extension": "Browser Extension",
    "app": "App",
    "other": "Other",
}


def die(msg):
    print("ERROR: " + msg, file=sys.stderr)
    sys.exit(1)


def load_data():
    if not os.path.exists(DATA):
        die("scripts-data.json not found at %s" % DATA)
    with open(DATA, encoding="utf-8") as f:
        return json.load(f)


def valid_types(data):
    return {t["id"] for t in data.get("types", [])}


def valid_categories(data):
    return set(data.get("categories", []))


def meta_desc(desc, short):
    text = (desc or short or "").strip().replace("\n", " ")
    text = re.sub(r"\s+", " ", text)
    return text[:155]


def fill_page(args, data):
    if not os.path.exists(TEMPLATE):
        die("template not found: %s" % TEMPLATE)
    with open(TEMPLATE, encoding="utf-8") as f:
        html = f.read()

    desc = args.desc or args.short or ""
    mdesc = meta_desc(args.desc, args.short)
    type_label = TYPE_LABEL.get(args.type, args.type.title())

    repl = {
        "REPLACE_TITLE": args.title,
        "REPLACE_META_DESCRIPTION (max ~160 chars for SEO)": mdesc,
        "REPLACE_SLUG": args.id,
        "REPLACE_ONE_LINE_SUMMARY": args.short or args.title,
        "REPLACE_GITHUB_RELEASES_URL": args.install or args.github,
        "REPLACE_GITHUB_REPO_URL": args.github,
        "REPLACE_CATEGORY": args.category,
        "REPLACE_LICENSE (e.g. MIT)": args.license or "MIT",
        "REPLACE_DATE": args.updated,
        "Usercript": type_label,
    }

    # full-text feature bullets
    if args.features:
        feats = [f.strip() for f in args.features.split(";") if f.strip()]
        num = ["one", "two", "three", "four", "five"]
        for i, f in enumerate(feats):
            key = "REPLACE: feature %s" % num[i]
            if key in html:
                html = html.replace(key, f)

    # long prose blocks
    prose_map = {
        "REPLACE: a clear paragraph describing what this tool does and who it helps.": (desc or ""),
        "REPLACE: feature one": (feats[0] if args.features and feats else "REPLACE feature one"),
    }
    for k, v in prose_map.items():
        if k in html:
            html = html.replace(k, v)

    for k, v in repl.items():
        html = html.replace(k, v)

    html = html.replace("REPLACE_COUNT", str(args.downloads), 1)
    html = html.replace("REPLACE_COUNT", str(args.stars), 1)

    # any remaining markers
    leftover = sorted(set(re.findall(r"REPLACE[^<\"]*", html)))
    if leftover:
        print("WARNING: unfilled markers remain in page: %s" % ", ".join(leftover))

    page_path = os.path.join(ROOT, "scripts", args.id + ".html")
    with open(page_path, "w", encoding="utf-8") as f:
        f.write(html)
    return page_path


def build_json_entry(args, data):
    return {
        "id": args.id,
        "type": args.type,
        "title": args.title,
        "short": args.short or args.title,
        "description": args.desc or args.short or "",
        "github": args.github,
        "page": "/scripts/%s.html" % args.id,
        "installUrl": args.install or args.github,
        "tags": [t.strip() for t in args.tags.split(",") if t.strip()] if args.tags else [],
        "categories": [args.category] if args.category else [],
        "rating": args.rating,
        "downloads": args.downloads,
        "stars": args.stars,
        "lastUpdated": args.updated,
        "license": args.license or "MIT",
        "featured": args.featured,
        "status": args.status,
    }


def apply_json(args):
    data = load_data()
    scripts = data.get("scripts", [])
    scripts = [s for s in scripts if s.get("id") != args.id]
    scripts.append(build_json_entry(args, data))
    data["scripts"] = scripts
    with open(DATA, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def main():
    p = argparse.ArgumentParser(description="Add a program to the xload catalog", add_help=True)
    p.add_argument("--id", default="",
                   help="unique slug, lowercase-hyphens, e.g. my-tool")
    p.add_argument("--title", default="")
    p.add_argument("--type", default="script", help="script|extension|app|other")
    p.add_argument("--category", default="", help="a valid category from scripts-data.json")
    p.add_argument("--github", default="", help="GitHub repo URL")
    p.add_argument("--install", default="", help="install/releases URL (defaults to --github)")
    p.add_argument("--short", default="", help="one-line card summary")
    p.add_argument("--desc", default="", help="longer description paragraph")
    p.add_argument("--tags", default="", help="comma-separated keywords")
    p.add_argument("--features", default="", help="semicolon-separated feature bullets")
    p.add_argument("--license", default="", help="default MIT")
    p.add_argument("--rating", type=float, default=0)
    p.add_argument("--downloads", type=int, default=0)
    p.add_argument("--stars", type=int, default=0)
    p.add_argument("--updated", default="", help="YYYY-MM-DD, defaults to today")
    p.add_argument("--status", default="stable", help="stable|beta|alpha")
    p.add_argument("--featured", action="store_true")
    p.add_argument("--apply", action="store_true", help="insert entry into scripts-data.json")
    p.add_argument("--print-json", action="store_true", help="only print the JSON, write nothing")
    p.add_argument("--check", action="store_true", help="validate the catalog and exit")
    args = p.parse_args()

    if args.check:
        ok = validate()
        sys.exit(0 if ok else 1)

    if not args.id or not args.title:
        die("--id and --title are required unless --check is used")
    if not re.match(r"^[a-z0-9\-]+$", args.id):
        die("--id must be lowercase letters, digits and hyphens only")

    data = load_data()
    vtypes = valid_types(data)
    vcats = valid_categories(data)
    if args.type not in vtypes:
        die("--type %r not valid. Use one of: %s" % (args.type, ", ".join(sorted(vtypes))))
    if args.category and args.category not in vcats:
        die("--category %r not valid. Use one of: %s" % (args.category, ", ".join(sorted(vcats))))
    if not args.github and not args.install:
        die("you must provide --github and/or --install")
    if not args.updated:
        import datetime
        args.updated = datetime.date.today().isoformat()

    entry = build_json_entry(args, data)

    if args.print_json:
        print(json.dumps(entry, ensure_ascii=False, indent=2))
        return

    page_path = fill_page(args, data)
    print("created page: scripts/%s.html" % args.id)
    print("JSON entry to add (or rerun with --apply):")
    print(json.dumps(entry, ensure_ascii=False, indent=2))

    if args.apply:
        apply_json(args)
        print("REALIZED: entry written to scripts-data.json")
    else:
        print("NOTE: run with --apply to register in scripts-data.json")


def validate():
    """Validate the whole catalog. Returns True if OK."""
    errors = []
    data = load_data()
    vtypes = valid_types(data)
    vcats = valid_categories(data)
    scripts = data.get("scripts", [])
    ids = [s.get("id") for s in scripts]
    if len(ids) != len(set(ids)):
        errors.append("duplicate script ids")
    required = ["id", "type", "title", "short", "github", "page", "installUrl",
                "lastUpdated", "license", "status"]
    for i, s in enumerate(scripts):
        for k in required:
            if not s.get(k):
                errors.append("scripts[%d] (%s): missing required field '%s'" % (i, s.get("id"), k))
        if s.get("type") not in vtypes:
            errors.append("%s: invalid type %r" % (s.get("id"), s.get("type")))
        for c in s.get("categories", []):
            if c not in vcats:
                errors.append("%s: invalid category %r" % (s.get("id"), c))
        pg = os.path.join(ROOT, s.get("page", "").lstrip("/"))
        if not os.path.exists(pg):
            errors.append("%s: page does not exist: %s" % (s.get("id"), s.get("page")))
        if not re.match(r"^[a-z0-9\-]+$", s.get("id", "")):
            errors.append("%s: invalid id format" % s.get("id"))
    if errors:
        print("VALIDATION FAILED:")
        for e in errors:
            print("  - " + e)
        return False
    print("OK: %d program(s) in catalog, all valid." % len(scripts))
    return True


if __name__ == "__main__":
    main()