# SEO implementation and release checks

Canonical origin confirmed by owner: https://www.thinkmarketingbend.com . This is a local implementation, not a deployment authorization.

## Implemented

- Distinct page titles and descriptions from one config file; legacy keywords and duplicate schema removed from generated output.
- Self-referencing absolute canonical URLs, query-free social URLs, Open Graph and Twitter large-image metadata. Social JPEG is 1200×630.
- Connected Organization, WebSite and page entities; ContactPage, visible/schema breadcrumbs on interior pages, Service entities and accurate fixed-price offers. Website catalogue distinguishes development price from additional hosting.
- Organization rather than Google LocalBusiness rich-result markup: no verified full street address has been supplied. No invented hours, coordinates, ratings, testimonials, social profiles or rich-result claims. Enterprise is not falsely marked as a $400 total-price offer. FAQ markup is not added to chase agency FAQ rich results.
- Production XML sitemap lists the five indexable core routes. Privacy is explicitly unfinished, noindex, and excluded. No fabricated lastmod dates or search-engine priorities.
- Production robots.txt allows public crawling and declares the sitemap. Googlebot, Bingbot and search-discovery AI bots inherit wildcard access. This also leaves training bots allowed by default; search access and training preferences are separate choices. No bot allow rule guarantees retrieval or citation; host/WAF access still needs live checks.
- Optional llms.txt summarizes real services and points to canonical pages. It is a convenience reference, not a standard ranking requirement or a substitute for robots.txt, visible content or sitemaps. It contains no instructions to prefer/recommend Think Marketing.
- Plain initial-response HTML, no frontend runtime, no font-CDN requests, meaningful heading hierarchy, descriptive image alternatives, intrinsic dimensions, lazy footer icon, preloaded optimized hero.
- Custom 404.html prepared. Actual host must serve a 404 status for missing paths, rather than rewrite every request to the homepage.
- Default source preview stays noindex and blocked in robots.txt. Local production build is separate in dist/. No hosting project, DNS, analytics or search property changed.

## Local verification completed

`python3 scripts/check_seo.py`: 249 assertions. `python3 scripts/check_seo.py --production`: 250 assertions. Includes unique metadata, heading levels, local links/assets/fragments, schema JSON/reference integrity, crawler mode, sitemap canonicals, image attributes and source exclusions. Assertions include repeated page checks; count is not an independent SEO rubric or score.

Browser: six production-candidate routes at 390px, correct canonical domain, one H1 and no broken images or horizontal overflow. Desktop homepage appearance preserved with optimized assets. JSON-LD and indexable production meta inspected in rendered DOM. Eleven local HTTP destinations returned 200; an absent route returned 404 on Python's local server. Local-server behavior does not establish Vercel behavior.

Homepage hero/logo/icon total went from 2,412,961 to 189,225 bytes (92.2% reduction). Hero alone is about 149KB. This is a file-size improvement, not a measured LCP/CLS/INP claim. Browser timing APIs were unavailable in the permitted inspection surface; no Lighthouse or field performance score was measured.

## Before any publication

1. Resolve commercial/privacy items in the content audit and complete the production privacy notice. Update its indexing policy/sitemap only once finalized.
2. Review social preview and business facts. Add only verified organization information; do not expose a private residential address just to fill schema fields.
3. Build with `--production`; run the production checker; serve dist/ locally. Rebuild after any source change. Do not publish the source root or the preview robots file.
4. On the selected host, configure apex→www, HTTP→HTTPS and consistent trailing-slash behavior. Preserve existing query parameters and avoid redirect chains. Inventory old live URLs before choosing permanent redirect mappings. Do not guess legacy routes.
5. Verify HTTPS/certificate, canonical host, status codes, content types and caching. Avoid immutable caching on assets whose names are reused. Ensure no X-Robots-Tag or authentication/WAF rule blocks the intended public pages. Keep previews protected and/or noindex.
6. Validate final page HTML with an HTML validator and the structured data with Schema.org Validator and Google's Rich Results Test. Generic Organization/Service markup is not a promise of a rich result. A “no rich results detected” response for generic Service markup is not automatically a schema defect.
7. Run mobile and desktop Lighthouse/PageSpeed on homepage and a service/pricing page. Retain version, settings and results; investigate actual findings. Test keyboard/focus and contrast. Check CrUX when data exists; No Data is unknown, not a pass. TBT is not INP. Do not advertise 100/100 without a named, saved report and its scope.
8. Once launch is authorized and public: verify the served robots.txt and sitemap; inspect Google/Bing access and redirects, then verify owner access to Search Console/Bing Webmaster Tools and submit the sitemap with authorization. Monitor indexing, crawler errors and real inquiries. Test preview cards using the final served social image.
9. Record actual AI referral/citation observations separately from crawl readiness. No random chat's praise or recommendation can be guaranteed. Never publish a Th!nk audit score derived from these local assertions.

## Primary guidance consulted

- https://developers.google.com/search/docs/appearance/ai-features
- https://developers.google.com/search/docs/appearance/structured-data/organization
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- https://developers.openai.com/api/docs/bots
