# 🪣 Slop-Bucket

A single GitHub repo for publishing standalone HTML projects, with a searchable homepage.

- **Live site:** https://weesechedge.github.io/Slop-Bucket/
- **Homepage:** `index.html` — loads `projects.json` and renders a live-filtering, searchable list of projects (and the pages inside them).
- **Manifest:** `projects.json` — the list of all published projects (this is what the search reads).
- **Content:** each published project lives under `projects/<slug>/` with its own `index.html` hub plus any supporting files.

## Structure

```
index.html        Searchable homepage (no build step, pure client-side)
projects.json     Manifest: { projects: [{ slug, title, description, tags, date, path, pages }] }
.nojekyll         Tells GitHub Pages to serve files as-is
projects/
  <slug>/
    index.html    The project's page (or a hub linking to its pages)
    ...            Its CSS / JS / images / data
```

## Manifest schema

Each entry in the `projects` array looks like:

```json
{
  "slug": "my-project",
  "title": "My Project",
  "description": "Short summary, also used for search.",
  "tags": ["demo", "interactive"],
  "date": "2026-06-10",
  "path": "projects/my-project/",
  "pages": []
}
```

- A **single-page project** sets `"pages": []`; its `path` resolves to `projects/<slug>/index.html`.
- A **multi-page project** lists its pages, each rendered as a sub-link and folded into search:
  ```json
  "pages": [
    { "title": "Page One", "file": "page-one.html", "description": "What it covers." }
  ]
  ```

The homepage sorts projects by `date` (newest first) and matches search queries against title, description, tags, and page titles/descriptions.

## Publishing a new project

1. Copy the HTML (and any supporting files) into `projects/<slug>/`. The entry page must be `index.html`.
2. For a single-page project, add a Slop-Bucket nav strip just inside `<body>` so visitors can get back to the homepage:
   ```html
   <nav style="position:sticky;top:0;z-index:9999;display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;padding:9px 18px;background:#15171c;border-bottom:1px solid #2c313c;font-family:ui-monospace,monospace;font-size:12px"><a href="../../" style="color:#9aa0ab;text-decoration:none">Slop-Bucket</a><span style="color:#3a4150">/</span><span style="color:#e0903f;font-weight:600">My Project</span></nav>
   ```
3. Append an entry to the `projects` array in `projects.json` (see the schema above).
4. Commit and push. The homepage updates automatically.

(In Claude Code, just say "publish this HTML" and the `/publish` workflow does all of this for you.)
