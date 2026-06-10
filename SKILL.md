---
name: slop-bucket-publish
description: Publish/push HTML to the user's Slop-Bucket GitHub Pages site, organised as projects. Trigger on any casual phrasing — "push to slop bucket", "push to the bucket", "slop this", "throw this in the bucket", "add a project", "add these to the slop bucket", "publish this HTML", "add a page to <project>", "update the bucket" — as well as the /slop and /slop-bucket-publish commands. Use whenever the user wants to put HTML online here or bundle related HTML pages into one project.
argument-hint: "[what to publish — e.g. file paths + a project name + order, or 'add X to <project>']"
---

# Publish to Slop-Bucket

Publishes HTML to the user's single publishing repo, organised as **projects**, and
updates the searchable bucket homepage. Do every publish exactly this way.

## Inputs / how this is invoked

The user may invoke casually ("push these to the slop bucket as a project called X"),
via `/slop` or `/slop-bucket-publish`, with `$ARGUMENTS`, and/or with attached file
paths. From whatever they give, determine:

- **Which HTML file(s)** to publish (paths). If files were referenced/attached, use those.
- **New project or add-to-existing?** Check `projects.json`. Related pages always go in
  ONE project — never scatter related HTML into separate top-level entries.
- **Project title + slug** (slug = kebab-case of the title).
- **Order** of pages within the project (use the order the user states).

If any of these is genuinely unclear, ask one concise question; otherwise infer
sensible defaults (title/description/tags from each file's `<title>`/`<h1>`/content,
date = today) and proceed.

## Mental model (two levels)

1. **Bucket homepage** (`index.html`) — searchable list of **projects**. Reads `projects.json`.
2. **A project** — folder `projects/<slug>/` with its own **hub** `index.html` (the
   landing page the homepage links to) plus the project's HTML pages. The homepage
   links to the hub → the hub links to the pages → the pages cross-link to each other
   via a nav strip. A project may hold **one** page (then the page IS the hub) or **many**.

## Fixed facts (this setup)

- GitHub repo: `weesechedge/Slop-Bucket` (public)
- Local clone: `C:\Users\User\OneDrive\Claude\Slop-Bucket`
- Live site: https://weesechedge.github.io/Slop-Bucket/
- A project's live URL: `https://weesechedge.github.io/Slop-Bucket/projects/<slug>/`
- gh CLI: `C:\Program Files\GitHub CLI\gh.exe` (authenticated as `weesechedge`)
- git author: name `weesechedge`, email `kazakoffza@gmail.com`
- `projects.json` is the source of truth for the homepage — never hand-edit the list
  markup inside `index.html`.
- `.nojekyll` must stay (serves files verbatim).
- **Reference templates already in the repo — match them, don't reinvent:**
  - Bucket homepage: `index.html`
  - Project hub style: `projects/gerrymandering-dynamics/index.html`
  - In-page nav strip: top of any file in `projects/gerrymandering-dynamics/`
  Open the relevant one and copy its structure/palette so output stays consistent.

## On-disk layout

```
index.html                         bucket homepage (searchable list of projects)
projects.json                      manifest of projects
.nojekyll
projects/
  <slug>/
    index.html                     project HUB (1-page project: this IS the content)
    page-a.html  page-b.html ...   the project's pages (multi-page), cross-linked
```

## projects.json entry shape

```json
{
  "slug": "kebab-case-id",
  "title": "Human Readable Title",
  "description": "One-sentence summary for search and the homepage card.",
  "tags": ["topic", "keywords"],
  "date": "YYYY-MM-DD",
  "path": "projects/kebab-case-id/",
  "pages": [
    { "title": "Page One", "file": "page-a.html", "description": "what it shows" }
  ]
}
```
`pages` is the ordered list of the project's pages (`[]` for a single-page project).
Newest projects sort first by `date`.

## The bucket homepage `index.html` (data-driven — preserve these behaviours)

The homepage builds itself from `projects.json` (never hand-edit the list markup). If
you ever regenerate `index.html`, keep ALL of this — match the existing file:

- Renders **one card per project**, sorted newest-first by `date`.
- Each card contains:
  - **Title** = a link to the project hub (`path`). Beside it, a small **badge
    "N pages"** when the project has a non-empty `pages` array (omitted for single-page
    projects).
  - **Description** line.
  - **Sub-page chip buttons** — one small button per entry in `pages`, each a *direct
    deep link* to that inner page (`path + file`), so a reader can jump straight into
    any page of the project without going through the hub. Omit the row when `pages`
    is empty. (This is the feature that's easy to forget — it must be there.)
  - **Tags** + **date**.
- A **sticky search box** that filters live across each project's title, description,
  tags, AND its pages' titles/descriptions; non-matching projects are hidden; matched
  substrings are `<mark>`-highlighted; a count reads "X of Y projects".

## The in-page nav strip (EVERY page, single- or multi-page — exact recipe)

Inject this immediately after `<body>` in **every** page of **every** project — including
single-page projects — so each page always has a header that links back to the bucket. It
is inline-styled so it never depends on the page's own CSS. It uses `position:fixed;top:0;
left:0;right:0` (NOT `sticky`) so it always pins to the page's top-left corner — `sticky`
gets laid out as a flex item and drifts to the centre/side on pages whose `<body>` is a
centered flex container, which is wrong.

**Single-page project** — the page is its own hub, so there are no siblings to list. Render
just the breadcrumb `Slop-Bucket / <Project Title>`, with the title as a bold `<span>` (the
current item). No `&#8212;` separator, no page list:

```html
<nav style="position:fixed;top:0;left:0;right:0;z-index:9999;display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;padding:9px 18px;background:#15171c;border-bottom:1px solid #2c313c;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:12px"><a href="../../" style="color:#9aa0ab;text-decoration:none">Slop-Bucket</a><span style="color:#3a4150">/</span><span style="color:#e0903f;font-weight:600"><PROJECT TITLE></span></nav>
```

**Multi-page project** — list the siblings. For the current page, render its label as a bold
`<span>`; for the others, as `<a href="<file>">`. Separator between page links is ` &#183; `:

```html
<nav style="position:fixed;top:0;left:0;right:0;z-index:9999;display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;padding:9px 18px;background:#15171c;border-bottom:1px solid #2c313c;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:12px"><a href="../../" style="color:#9aa0ab;text-decoration:none">Slop-Bucket</a><span style="color:#3a4150">/</span><a href="index.html" style="color:#e0903f;text-decoration:none;font-weight:600"><PROJECT TITLE></a><span style="color:#3a4150;margin:0 4px">&#8212;</span><!-- per page: --><a href="<file>" style="color:#9aa0ab;text-decoration:none"><Label></a><span style="color:#3a4150">&#183;</span><span style="color:#e9e7e1;font-weight:600"><Current Label></span></nav>
```

Inject reliably with PowerShell (UTF-8, no BOM; replaces the first `<body>`):

```powershell
$enc  = New-Object System.Text.UTF8Encoding($false)
$html = [System.IO.File]::ReadAllText($dest)
$html = $html.Replace("<body>", "<body>`n$nav")   # build $nav per the template above
[System.IO.File]::WriteAllText($dest, $html, $enc)
```

**When pages are added to / removed from a project, the sibling list changed — so
regenerate the nav strip in EVERY page of that project (not just the new one), and
update the hub's list.** Re-inject by stripping the old `<nav ...>...</nav>` first or
re-copying the originals, then writing fresh nav.

## The project hub `projects/<slug>/index.html`

A landing page that matches `projects/gerrymandering-dynamics/index.html`: same dark
palette/fonts, a breadcrumb nav (`Slop-Bucket / <Project>`), a header (kicker + title +
intro), then a numbered list of the project's pages **in order**, each linking to its
file with a one-line description, plus a "Back to the Slop-Bucket" link to `../../`.
Skip the hub only for a single-page project (the page itself is `index.html`).

## Procedure

1. **Pull latest:** `git -C "C:/Users/User/OneDrive/Claude/Slop-Bucket" pull --rebase --autostash`
2. **Resolve inputs** (see *Inputs* above): files, new-vs-existing project, title, slug, order.
3. **Create/locate** `projects/<slug>/`. If it exists and this is a new project, confirm add/update.
4. **Copy** the HTML page(s) in (own filenames for multi-page; supporting assets alongside, relative paths intact).
5. **Inject the nav strip** into every page per the exact recipe — *always*, including single-page projects (use the single-page breadcrumb form). For multi-page projects this also cross-links siblings; regenerate ALL pages' nav if the page set changed.
6. **Write/refresh the hub** `index.html` (skip for single-page). Match the reference hub.
7. **Update `projects.json`** — add/update the entry with its ordered `pages` array; keep valid JSON; date = today.
8. **Commit & push:**
   ```
   git -C "C:/Users/User/OneDrive/Claude/Slop-Bucket" add -A
   git -C "C:/Users/User/OneDrive/Claude/Slop-Bucket" commit -m "Publish <slug>"
   git -C "C:/Users/User/OneDrive/Claude/Slop-Bucket" push
   ```
9. **Verify live** (Pages rebuilds in ~1 min): GET the project URL + one inner page and confirm HTTP 200.
10. **Report** the project URL: `https://weesechedge.github.io/Slop-Bucket/projects/<slug>/`

## Notes

- Auth issues: `& "C:\Program Files\GitHub CLI\gh.exe" auth status`; re-login `gh auth login --web`.
- Remove a project: delete `projects/<slug>/` + its `projects.json` entry; commit/push.
- Keep the user's original HTML byte-for-byte except for the injected `<nav>` block.
