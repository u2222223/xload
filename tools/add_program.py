#!/usr/bin/env python3
"""
xload — add a program to the catalog.

One command that scaffolds a full program page (inside a category folder),
optionally stores the actual program file(s) inside the site, and registers the
entry in scripts-data.json. Other sessions (or humans) can add programs without
touching HTML by hand.

Layout inside website/scripts:
    scripts/<category>/<id>/
        <id>.html          the detail page
        <id>.user.js       the actual program file (generated stub or your --file)

USAGE (run from anywhere):
  python tools/add_program.py \
      --id my-tool \
      --title "My Tool" \
      --type script \
      --category Productivity \
      --github https://github.com/you/repo \
      --short "One-line card summary." \
      --desc "Longer description paragraph."
      --tags "keyword1,keyword2" \
      --file "path/to/real.user.js" \
      --license MIT \
      --apply

  --file PATH[,PATH]   copy real program files into the folder; the install
                       button points at the first one. If omitted and type is
                       "script", a stub <id>.user.js is generated instead.
  --install URL        force the download/install link (e.g. a GitHub release);
                       overrides pointing at the local file.
  --apply              insert the entry into scripts-data.json (idempotent by id)
  --check              validate only (no write)
  --print-json         only print the JSON entry (no write)

KNOWN TYPES: script | extension | app | other   (must exist in "types")
CATEGORIES:  must exist in "categories"

Exit code 0 = ok, 1 = error/validation failed.
"""

import argparse
import datetime
import json
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "scripts-data.json")
TEMPLATE = os.path.join(ROOT, "scripts", "_template.html")

TYPE_LABEL = {
    "script": "Userscript",
    "extension": "Browser Extension",
    "app": "App",
    "other": "Other",
}

# markers that are intentionally left for go-live / authoring, not an error
IGNORE_MARKERS = ("REPLACE-WITH-YOUR-DOMAIN.com", "REPLACE_", "REPLACE_HORIZONTAL_SLOT")


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


def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-") or "misc"


def meta_desc(desc, short):
    text = (desc or short or "").strip().replace("\n", " ")
    text = re.sub(r"\s+", " ", text)
    return text[:155]


def userjs_stub(args):
    namespace = args.github or "https://xload/"
    desc = (args.short or args.title or "").replace('"', "'")
    return (
        "// ==UserScript==\n"
        "// @name        %s\n"
        "// @version     0.1.0\n"
        "// @description %s\n"
        "// @namespace   %s\n"
        "// @author      xload\n"
        "// @match       https://example.com/*\n"
        "// @grant       none\n"
        "// ==/UserScript==\n"
        "\n"
        "(function () {\n"
        "    'use strict';\n"
        "    // TODO: implement %s\n"
        "})();\n" % (args.title, desc, namespace, args.id)
    )


def copy_program_files(args, dir_abs, cat_slug):
    """Copy --file files in, or generate a stub for scripts. Returns web paths."""
    web_paths = []
    files = [f.strip() for f in (args.file or "").split(",") if f.strip()]
    if files:
        for src in files:
            if not os.path.exists(src):
                die("program file not found: %s" % src)
            name = os.path.basename(src)
            shutil.copyfile(src, os.path.join(dir_abs, name))
            web_paths.append("/scripts/%s/%s/%s" % (cat_slug, args.id, name))
    elif args.type == "script":
        name = args.id + ".user.js"
        with open(os.path.join(dir_abs, name), "w", encoding="utf-8") as f:
            f.write(userjs_stub(args))
        web_paths.append("/scripts/%s/%s/%s" % (cat_slug, args.id, name))
    return web_paths


def build_page_rel(cat_slug, program_id):
    return "scripts/%s/%s/%s.html" % (cat_slug, program_id, program_id)


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
        "USERCRIPT": type_label,
        "Usercript": type_label,
        "REPLACE_CANONICAL": args.page,
    }

    # feature bullets
    if args.features:
        feats = [f.strip() for f in args.features.split(";") if f.strip()]
        num = ["one", "two", "three", "four", "five"]
        for i, f in enumerate(feats):
            key = "REPLACE: feature %s" % num[i]
            if key in html:
                html = html.replace(key, f)

    # overview paragraph
    overview = desc
    if overview and "REPLACE: a clear paragraph describing what this tool does and who it helps." in html:
        html = html.replace(
            "REPLACE: a clear paragraph describing what this tool does and who it helps.", overview)

    for k, v in repl.items():
        html = html.replace(k, v)

    html = html.replace("REPLACE_COUNT", str(args.downloads), 1)
    html = html.replace("REPLACE_COUNT", str(args.stars), 1)

    # any remaining authoring markers (ignore known go-live ones)
    leftover = sorted({m for m in re.findall(r"REPLACE[^<\"]*", html)
                       if not any(m.startswith(ig) for ig in IGNORE_MARKERS)})
    if leftover:
        print("WARNING: unfilled markers remain in page: %s" % ", ".join(leftover))

    page_path = os.path.join(ROOT, args.page)
    os.makedirs(os.path.dirname(page_path), exist_ok=True)
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
        "page": "/" + args.page,
        "installUrl": args.install or args.github,
        "files": [os.path.basename(p) for p in (args.local_files or [])],
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
    p = argparse.ArgumentParser(description="Add a program to the xload catalog")
    p.add_argument("--id", default="", help="unique slug, lowercase-hyphens, e.g. my-tool")
    p.add_argument("--title", default="")
    p.add_argument("--type", default="script", help="script|extension|app|other")
    p.add_argument("--category", default="", help="a valid category from scripts-data.json")
    p.add_argument("--github", default="", help="GitHub repo URL (view source)")
    p.add_argument("--install", default="", help="force download/install URL; else points at local file")
    p.add_argument("--file", default="", help="comma-separated paths of real program file(s) to copy in")
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
        sys.exit(0 if validate() else 1)

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

    cat_slug = slugify(args.category) if args.category else "misc"
    args.page = build_page_rel(cat_slug, args.id)
    args.local_files = []

    if args.print_json:
        if not (args.install or args.github):
            die("you must provide --install and/or --github (or --file) for an install target")
        entry = build_json_entry(args, data)
        print(json.dumps(entry, ensure_ascii=False, indent=2))
        return

    if not args.updated:
        args.updated = datetime.date.today().isoformat()

    dir_abs = os.path.join(ROOT, "scripts", cat_slug, args.id)
    os.makedirs(dir_abs, exist_ok=True)

    # copy / generate the actual program file(s) into the folder
    web_paths = copy_program_files(args, dir_abs, cat_slug)
    args.local_files = web_paths

    # resolve install target
    if not args.install:
        if web_paths:
            args.install = web_paths[0]
        elif args.github:
            args.install = args.github
        else:
            die("no install target: pass --install / --github / --file")

    entry = build_json_entry(args, data)
    page_path = fill_page(args, data)
    print("created folder: scripts/%s/%s/" % (cat_slug, args.id))
    print("created page:   %s" % os.path.relpath(page_path, ROOT).replace("\\", "/"))
    for w in web_paths:
        print("program file:   %s" % w)
    print("install link:   %s" % args.install)
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
        for fn in s.get("files", []):
            fp = os.path.join(os.path.dirname(pg), fn)
            if not os.path.exists(fp):
                errors.append("%s: program file missing: %s" % (s.get("id"), os.path.basename(fp)))
    if errors:
        print("VALIDATION FAILED:")
        for e in errors:
            print("  - " + e)
        return False
    print("OK: %d program(s) in catalog, all valid." % len(scripts))
    return True


if __name__ == "__main__":
    main()