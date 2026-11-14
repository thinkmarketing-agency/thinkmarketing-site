# Think Marketing website — local refresh

Static HTML and CSS, generated with Python's standard library. No package installation or external service is required. Jasper is deferred; there is no chat, crawling, email sending, or form backend.

Build: `python3 scripts/build.py`

Preview from this directory: `python3 -m http.server 8765 --bind 127.0.0.1`, then open `http://127.0.0.1:8765/`. Stop with Control-C. Use HTTP preview because links are relative to the site root.

The homepage preserves the original layout and hero image: edit `content/home.html` and `home.css`. Edit other page copy and shared markup in `scripts/build.py`; package prices live in `content/packages.json`; design rules live in `styles.css`. Generated HTML is checked in and can be hosted without a build runtime. Run the generator after content edits.

This is a local draft, not a release. Default builds carry `noindex,follow` and a blocking preview robots.txt; analytics is disabled. Do not connect automatic deployments or change DNS yet.

SEO configuration lives in `content/site.json`. The confirmed canonical origin is `https://www.thinkmarketingbend.com`. `scripts/seo.py` generates metadata, schema, breadcrumbs, robots.txt, sitemap.xml and an optional llms.txt reference. Do not edit generated HTML directly.

Run `python3 scripts/check_seo.py` to validate the preview. Run `python3 scripts/build.py --production` to prepare a local release candidate in ignored `dist/`, then `python3 scripts/check_seo.py --production`. This never deploys. Production files allow crawling and index the five substantive pages; the unfinished privacy notice remains noindex and outside the sitemap. Serve `dist/` to inspect that candidate. Only the optimized assets are copied into it; source, documentation and Git data are excluded. Host only `dist/` when publication is authorized.

See `docs/seo-release-checklist.md` and `docs/refresh-status.md` before publication. A passing local check is not a Lighthouse score, rich-result eligibility guarantee, live indexing check or search ranking promise.
