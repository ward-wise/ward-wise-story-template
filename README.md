# ward-wise-story-template

A starter repo for a **Ward Wise story**: one page, for one kind of Chicagoan, built on the public
[Ward Wise API](https://www.wardwise.org/api-docs). No build step, no framework. `index.html`,
`story.js` and an inline-SVG chart are the whole thing.

## Who this example is for

**Block club organizers.** It answers "how does our ward do on the things a block club can push
on?": 311 response times for rodents, potholes, street lights and graffiti, street flooding, and
how often neighbors act together. Each row is a rank strip: your ward's rank out of 50, worst on
the left, best on the right, whichever way the number runs.

Your story picks a different reader (a new parent, a small-business owner, a renter choosing a
neighborhood, a ward office) and the handful of metrics that reader cares about.

## How it gets data

`GET /api/v1/wards/{ward}` returns every metric for one ward with the average ward and the rank.
Every call needs a key in the `X-API-Key` header.

- **The viewer types their own key** into the page. It stays in the page's memory for that tab and
  goes only to the API, as a header. It is never saved, never put in a URL, and never committed.
  Keys are free: ask on the [API page](https://www.wardwise.org/api-docs).
- **No key:** the page shows `sample/ward_12.json`, made-up numbers in the same shape, under a
  banner that says so. That's also what you develop against offline.

**This repo must never contain a key.** Not in `story.js`, not in a workflow, not in a repository
secret the page reads. A key in a static site is public the moment it deploys.

## Run it locally

```bash
python serve.py
```

Open <http://localhost:8765>. `serve.py` serves the folder and forwards `/api/*` to
`penlight.wardwise.org`, passing your key header through. You need it because the API doesn't send
CORS headers for other sites, so a browser won't let `localhost` call it directly.

## Fork it

1. Click **Use this template** on GitHub. Link the ticket you claimed (`ward-wise/ideas#N`) in the
   repo description.
2. In `story.js`, change `METRICS` (ids from `GET /api/v1/metrics`) and `DEFAULT_WARD`.
3. In `index.html`, rewrite the eyebrow, title and lede for your reader. Say who it's for in the
   first line.
4. Update `sample/ward_12.json` so the sample covers your metrics, keeping `"_sample"` and made-up
   values.
5. Change the chart if your story needs another one. Keep it inline SVG; read the
   [API's honesty notes](https://www.wardwise.org/api-docs) first (a missing year is missing data,
   not zero, and small rank differences are noise).
6. Turn on Pages: **Settings → Pages → Source: GitHub Actions**. `.github/workflows/pages.yml`
   publishes the repo on every push to `main`.

**Known limit:** on `github.io` the live API call fails until the API allows cross-site requests,
and the page falls back to the sample with an explanation. Locally through `serve.py`, and on
`www.wardwise.org` after graduating, the call is same-origin and works.

## Graduate it into wardwise.org

When the story works and a few people in its audience have used it, move it into
[ward-wise-frontend](https://github.com/ward-wise/ward-wise-front-end-v2) as a page. Follow
[CONTRIBUTING.md → Adding a page](https://github.com/ward-wise/ward-wise-front-end-v2/blob/main/CONTRIBUTING.md#adding-a-page):

1. Add a `Page` to `penlight_site.PAGES` (path, template, and the `ui.<name>` endpoint).
2. Turn `index.html` into a template that extends `base.html`; drop this page's `<style>` tokens
   and use the custom properties at the top of `styles.css`. Both themes must work.
3. Move `story.js` into `static/`. It already follows the house style: vanilla JS in an IIFE,
   every interpolated value escaped. Swap `esc` for `WardWiseExplorer.escapeHtml`.
4. On wardwise.org the API is same-origin. Use the site's own no-key endpoints where they exist
   instead of asking readers for a key.
5. Open the pull request, link the ideas ticket, and add a screenshot.
