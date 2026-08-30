# xload — static download site

A lightweight, pure-static download catalog aimed at overseas users. **No build step and
no server runtime required** — deploy a folder of files and you are live. Great fit for a
1-core / 2 GB RAM / 30 GB disk VPS.

Every download links to the official GitHub release. The site never hosts any file itself.

---

## Requirements before going live (Go-Live checklist)

The site is fully functional out of the box, but the following **placeholder values must be
replaced** before production (search the whole folder for `REPLACE`):

| Placeholder | Where | Why |
|---|---|---|
| `REPLACE-WITH-YOUR-DOMAIN.com` | all HTML `canonical`/`og:url`, `sitemap.xml`, `robots.txt`, footer/contact links, `scripts-data.json` `url` | Correct canonical URLs & sitemap |
| `pub-XXXXXXXXXXXXXXXX` | `ads.txt`, all AdSense `<script>`/`<ins>` tags, `scripts-data.json` `adsense.publisherId` | Your real Google publisher ID |
| `REPLACE_HORIZONTAL_SLOT` | `<ins>` ad slots on `index.html` and script template | Ad unit slot id (if you use manual units) |
| `contact@REPLACE-WITH-YOUR-DOMAIN.com` | contact / privacy / terms pages | Your contact email (required by AdSense) |

> **Note:** auto-ads only require `ads.txt` + the `<script>` loader with your publisher ID.
> The banner `data-ad-slot="REPLACE_HORIZONTAL_SLOT"` units are manual/optional.

---

## Google Ads — what was implemented

- **`ads.txt`** — the file Google requires to verify site ownership when linking your AdSense
  account. Line: `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`.
- **Auto ads loader** in `<head>` of every page (`adsbygoogle.js?client=ca-pub-...`).
- **Manual ad slots** on the homepage and inside the script template (both disabled until you
  fill in real IDs).
- **Privacy Policy, Terms of Service, Cookie Policy** — required pages, written in English.
- **Cookie consent banner + Google Consent Mode (v2)** — advertising/analytics default to
  *denied* until the visitor clicks "Accept all" (most important for EU/UK visitors and for
  AdSense policy compliance). See `cookie-policy.html`.
- **`robots.txt`** allows Google crawlers; **`sitemap.xml`** submitted to Search Console.

### After filling IDs, run the AdSense checklist
1. Set `adsense.enabled = true` in `scripts-data.json` (already true).
2. Upload `ads.txt` to the site root and confirm it is served at `https://yourdomain.com/ads.txt`.
3. Submit your site in Google AdSense and verify domain ownership.
4. Link / set up ad units. Either enable **auto ads** (no manual slots needed) or create
   responsive units and replace `REPLACE_HORIZONTAL_SLOT` on each page.
5. Submit `sitemap.xml` in Google Search Console.

---

## How to add a new program

> **Full, authoritative guide: see [`ADDING_A_PROGRAM.md`](ADDING_A_PROGRAM.md).**
> Recommended, reliable path is the one-command scaffolder:

```bash
cd website
python tools/add_program.py --id my-tool --title "My Tool" --type script \
    --category Productivity --github https://github.com/you/my-tool \
    --install "https://github.com/you/my-tool/releases/latest" \
    --short "One-line card summary." --desc "Longer description." \
    --tags "k1,k2" --features "A;B;C" --license MIT --apply
python tools/add_program.py --check      # must exit 0 before you finish
```

Creates `scripts/<id>.html`, registers the row in `scripts-data.json`, and
`--check` verifies consistency. Run `python tools/add_program.py --help` for all
flags (`--apply`, `--print-json`, `--featured`, `--type`, etc.).

### Manual route (same contract)
Two files must be created/updated if you edit by hand:

1. **Create the detail page** — copy `scripts/_template.html` to `scripts/<slug>.html`,
   fill in the `REPLACE_*` values (title, meta, GitHub URLs, description, features,
   install steps, sidebar details). Keep the `chrome-header` / `chrome-footer` divs and
   the `main.js` script tag — they inject the shared header/footer/cookie banner
   automatically. A completed example is `scripts/example-userscript.html`.

2. **Register it in the catalog** — add an entry to the `scripts` array in
   `scripts-data.json`. The `id` and `page` must match the slug used in step 1.
   This makes the tool appear on the homepage (featured/latest), listing and search.

### Required JSON fields
```json
{
  "id": "my-tool",                 // must match the page slug
  "type": "script",               // script | extension | app | other
  "title": "My Tool",
  "short": "One-line description shown on cards.",
  "description": "Longer description used by search.",
  "github": "https://github.com/user/repo",
  "page": "/scripts/my-tool.html",
  "installUrl": "https://github.com/user/repo/releases/latest",
  "tags": ["keyword1", "keyword2"],
  "categories": ["Productivity"],  // must exist in "categories"
  "rating": 4.5,
  "downloads": 12800,
  "stars": 340,
  "lastUpdated": "2026-08-30",
  "license": "MIT",
  "featured": true,
  "status": "stable"
}
```

> Tip: `type` values map to the "types" config (userscripts, extensions, apps, other).
> Adding a new future type only requires an entry in `types` + an icon in `assets/js/main.js`.

---

## Directory structure

```
website/
├─ index.html                 Homepage
├─ listing.html               All tools (filter / sort / search)
├─ about.html, contact.html
├─ privacy-policy.html, terms-of-service.html, cookie-policy.html
├─ 404.html
├─ ads.txt                    Required by Google AdSense
├─ robots.txt, sitemap.xml    SEO
├─ favicon.svg
├─ scripts-data.json          ★ the catalog registry (add entries here)
├─ ADDING_A_PROGRAM.md        ★ authoritative "how to add a program" guide
├─ assets/
│  ├─ css/style.css           Shared design system
│  └─ js/main.js              Renders listings, search, chrome + cookie consent
├─ scripts/
│  ├─ _template.html          Copy this per new program
│  └─ example-userscript.html Reference example
└─ tools/
   └─ add_program.py          Scaffolder + validator for adding programs
```

---

## Deployment

Nothing to compile. Serve the `website/` folder as the document root:

- **Nginx** → `root /var/www/xload;`
- **Caddy** → `root * /var/www/xload` (also gives automatic HTTPS)
- Or any static host.

Requirements: a web server that serves static files over HTTPS + a domain. No PHP, no Node,
no database. Memory/idle footprint is negligible.

### Add tool / update content
Edit the JSON or drop in a new HTML page, then re-upload (or `git pull` if the server pulls
from a repo). No rebuild step.

### Local preview
```bash
cd website
python -m http.server 8000   # then open http://localhost:8000
```

---

## Future expansion
The catalog already supports **four content types** (userscripts / extensions / apps / other).
To add a brand-new type later, add it to `types` in `scripts-data.json` and give it an icon
entry in `assets/js/main.js` — the homepage, listing and footer adapt automatically.