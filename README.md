# 🪣 Slop-Bucket

A single GitHub repo for publishing standalone HTML pages, with a searchable homepage.

- **Live site:** https://weesechedge.github.io/Slop-Bucket/
- **Homepage:** `index.html` — loads `pages.json` and renders a live-filtering, searchable list.
- **Manifest:** `pages.json` — the list of all published pages (this is what the search reads).
- **Content:** each published page lives under `pages/<slug>/` along with its supporting files.

## Structure

```
index.html        Searchable homepage (no build step, pure client-side)
pages.json        Manifest: [{ slug, title, description, tags, date, path }]
.nojekyll         Tells GitHub Pages to serve files as-is
pages/
  <slug>/
    index.html    A published page
    ...            Its CSS / JS / images
```

## Publishing a new page

1. Copy the HTML (and any supporting files) into `pages/<slug>/`.
2. Append an entry to the `pages` array in `pages.json`:
   ```json
   {
     "slug": "my-page",
     "title": "My Page",
     "description": "Short summary for search.",
     "tags": ["demo", "report"],
     "date": "2026-06-08",
     "path": "pages/my-page/"
   }
   ```
3. Commit and push. The homepage updates automatically.

(In Claude Code, just say "publish this HTML" and the `/publish` workflow does all of this for you.)
