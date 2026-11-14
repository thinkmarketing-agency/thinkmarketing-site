# Think Marketing — final pre-push check

November 14, 2026 · America/Los_Angeles

## Result

Ready to push this version to main. Local production generation and validation pass. Vercel's deployed endpoint has working crawl/indexing signals. No commit, push, DNS change or deployment was performed by this check.

## Verified locally

- Six production pages; 280 automated assertions passed. This is a repeatable source/output check, not a Lighthouse score or the 165-item Th!nk audit rubric.
- Unique metadata, canonical www URLs, social image metadata, schema JSON and entity references, visible/schema breadcrumbs, service offers, headings, links, assets and fragments.
- Production robots allows crawling and points to the five-page canonical sitemap. Privacy is intentionally noindex and excluded, not an unfinished preview notice anymore.
- No frontend analytics or chatbot added. Rendered content is initial HTML. Optional llms.txt contains factual links, not instructions to recommend the business.
- Eighteen browser cases: all six pages at 320px, 390px and 1280px. No horizontal overflow, no failed image elements, no emoji-arrow text, and the expected mobile/desktop navigation mode. Footer icons are lazy-loaded; an offscreen pending image is not an image error.
- Mobile menu opens from the keyboard, its pricing link navigates, and the next page starts with the menu collapsed.
- Pricing and policies remain intact. The final privacy notice is in this unpushed version.

## Live Vercel endpoint verified

Read-only HTTPS requests retained the correct domain hostname and TLS validation while resolving it to the Vercel address returned by public DNS. This isolates the new host from an older local DNS cache.

- Five core routes: HTTP 200 and index,follow,max-image-preview:large.
- Privacy: HTTP 200, intentionally noindex,follow; latest notice will arrive with this push.
- robots.txt: HTTP 200, Allow: / and canonical sitemap declaration.
- sitemap.xml: HTTP 200; home, websites, local SEO, AI/search and contact, all on https://www.thinkmarketingbend.com.
- llms.txt and social JPEG: HTTP 200.
- Unknown route: HTTP 404 rather than a soft-404 homepage.
- Non-www HTTPS: 308 to canonical www. HTTP www: 308 to HTTPS www.
- HTTPS certificate verification succeeded; Vercel responses include HSTS.

## DNS transition observation

Cloudflare (1.1.1.1) and Google (8.8.8.8) returned Vercel nameservers. The machine's default resolver still returned Netlify/NS1 nameservers. Requests through that older resolver reached Netlify, which serves the source preview: noindex, blocked robots and empty sitemap. This is not what the directly verified Vercel endpoint serves.

Keep Netlify available until propagation settles. If Netlify continues deploying from main, its publish directory must not be confused with Vercel's dist output. Retire its deployment integration and site after confirming public DNS no longer relies on it; do not delete it solely because one resolver has switched.

## Small fixes in this pass

- Added vercel.json to pin the production build and dist output in the repository; it runs validation after generation. This prevents a future dashboard setting from publishing source-preview files accidentally. Added nosniff and strict-origin-when-cross-origin response headers for the next deployment.
- Removed a hidden whitespace span from the hero heading so text stays naturally separated for assistive technologies and extraction, while preserving the mobile line break.
- Updated the README to reflect the live Vercel workflow and completed privacy notice.

## Remaining checks and limitations

- Google PageSpeed API attempted for mobile and desktop; both returned HTTP 429. No fresh Lighthouse, field Core Web Vitals, or 100/100 score is claimed.
- Schema has been checked for local JSON/reference/content consistency, not independently certified by Google's Rich Results Test or Schema.org Validator. Organization and Service markup need not produce a dedicated rich result.
- Search Console/Bing property verification, sitemap submission, indexing status and actual AI citations were not accessed. Crawl readiness is not proof of ranking or recommendations.
- After pushing, confirm the Vercel deployment succeeds and the final privacy text, icons and header changes appear. Recheck public DNS/crawl signals after propagation; then submit the sitemap through the owner's search accounts if not already done.
