# How to add a program to xload

This is the **single source of truth** for adding new programs (userscripts now;
extensions / apps / other later) to the site. Automated and safe.

> Every page **and every program file** is served from `website/`. There is no
> build step. Adding a program = put a page + program file into a category
> folder, register one JSON row, validate.

---

## 1) The one-command way (recommended)

Run the scaffolder. It creates the full HTML page, stores the actual program
file inside `website/scripts/`, and registers the entry in the catalog. You never
touch HTML by hand.

```bash
cd website
python tools/add_program.py \
    --id my-tool \
    --title "My Tool" \
    --type script \
    --category Productivity \
    --github https://github.com/you/my-tool \
    --short "One-line card summary shown on cards/SEO." \
    --desc "Longer paragraph for the Overview section." \
    --tags "keyword1,keyword2" \
    --features "Feature A;Feature B;Feature C" \
    --file "path/to/your/real.user.js" \
    --license MIT \
    --apply
```

What it writes (all inside `website/scripts/`):

```
scripts/<category>/<id>/
   <id>.html        the detail page
   <id>.user.js     the program file
```

- **`--file PATH[,PATH...]`** copies your real program file(s) into the folder
  and the **Download / install** button points at the local `.user.js`. Omit it
  and a `.user.js` stub is generated for you.
- **`--install URL`** (optional) overrides the install button to point elsewhere
  (e.g. a GitHub release) instead of the local file.
- **`--github URL`** is the "View source on GitHub" link to the repository.
- **`--apply`** inserts the entry into `scripts-data.json`.
- **`--category`** must be a value that exists in the `categories` array of
  `scripts-data.json`. Same for `--type` vs the `types` array.
- **`--id`** must be `lowercase-letters-digits-hyphens`.

The category folder name is derived from the category automatically
(e.g. `Media & Entertainment` → `media-entertainment`).

### Flags cheat-sheet
| Flag | Meaning |
|---|---|
| `--apply` | write the JSON entry too (idempotent — safe to rerun) |
| `--file "a.user.js,b.zip"` | store real program file(s) inside the site |
| `--install URL` | force the download link (defaults to the local file) |
| `--print-json` | just print the JSON row, write nothing |
| `--check` | validate only (safe to run anytime) |
| `--features "A;B;C"` | fill the "Key features" bullets |
| `--featured` | show in the homepage featured grid |
| `--type` | `script` (default) \| `extension` \| `app` \| `other` |

> After scaffolding, review `scripts/<category>/<id>/<id>.html`. A few optional
> content hooks are left as `REPLACE: ...` markers (install steps, config,
> privacy notes, ad slot id) — the tool prints them as a WARNING. Fill in what
> you have; leave the rest.

## 2) Manual way (edit-by-hand, same contract)

If you edit files directly, keep three things consistent:

**(a) The page** — copy `scripts/_template.html` to
`scripts/<category>/<id>/<id>.html` and fill in the `REPLACE_*` values. Keep the
`chrome-header` / `chrome-footer` divs and the `main.js` script tag (they inject
the shared header/footer/cookie banner).

**(b) The program file** — place the real file (e.g. `<id>.user.js`) next to the
page inside the same folder, and point `files` at it.

**(c) The catalog entry** — add a row to the `scripts` array in
`scripts-data.json`:

```json
{
  "id": "my-tool",
  "type": "script",
  "title": "My Tool",
  "short": "One-line card summary.",
  "description": "Longer description used by search.",
  "github": "https://github.com/you/my-tool",
  "page": "/scripts/productivity/my-tool/my-tool.html",
  "installUrl": "/scripts/productivity/my-tool/my-tool.user.js",
  "files": ["my-tool.user.js"],
  "tags": ["k1", "k2"],
  "categories": ["Productivity"],
  "rating": 0,
  "downloads": 0,
  "stars": 0,
  "lastUpdated": "2026-08-30",
  "license": "MIT",
  "featured": false,
  "status": "stable"
}
```

**Rules**
- `id` must be lowercase-hyphens.
- `type` must be one of `data.types[*].id`.
- every `categories[]` value must exist in `data.categories`.
- `page` must point to a real file under `scripts/`.
- every `files[]` filename must exist in the same folder as `page`.

## 3) Always validate before you're done

```bash
cd website
python tools/add_program.py --check
```

Exit `0` = catalog is consistent (all rows valid, all pages exist, no duplicate
ids, no bad type/category). Exit `1` lists every problem. **Run it, don't skip it.**

---

## Where things live

```
website/
├─ scripts-data.json        catalog registry (add rows here)
├─ scripts/
│  ├─ _template.html        copy this for each new program
│  └─ <category>/<id>/      one folder per program
│       ├─ <id>.html        the detail page
│       └─ <id>.user.js     the actual program file (hosted here)
└─ tools/
   └─ add_program.py        the scaffolder + validator
```

Program files are served from the site itself (e.g. `/scripts/productivity/
clean-tabs/clean-tabs.user.js`). Browsers with a userscript manager will install
directly from that URL.

## Enabling extensions / apps / other later

The catalog already supports the other types. To surface them now (they are
currently hidden on purpose):

1. In `scripts-data.json`, set `"enabledTypes": ["script", "extension", "app", "other"]`.
2. Save. The nav, homepage type cards, and listing filter appear automatically —
   no other change needed.