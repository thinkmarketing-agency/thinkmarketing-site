# Jasper implementation

This version replaces the Coming Soon page with streaming AI chat and introduces Jasper in a dedicated section below the homepage hero. It uses Vercel Node functions alongside the existing static build; no framework migration is needed.

## Configuration

- `OPENAI_API_KEY`: server-side OpenAI project key; already configured by the owner in Vercel, not copied here.
- `JASPER_MODEL`: optional; defaults to `gpt-6-luna`. Confirm model access in the funded API account before launch.
- `JASPER_WEB_SEARCH=true`: opt in to paid public web research. Disabled by default. This is not a crawler or full technical audit.
- `RESEND_API_KEY` and `JASPER_FROM_EMAIL`: required for automatic lead email. From address must use a Resend-verified domain. Optional `JASPER_TO_EMAIL` defaults to Think Marketing's Gmail. Until configured, the form preserves its contents and offers a user-reviewed email-app link.

Instructions and verified reference selection live in `server/jasper.mjs`. The draft comprehensive catalog is deliberately not loaded as approved pricing. No private supplier or margin notes are included. Public reference files already in the existing site remain public.

No chat or uploads are persisted by this application. Conversation state lives in page memory. OpenAI receives messages and context with `store:false`; this does not eliminate provider abuse-monitoring retention. Explicitly submitted, visitor-reviewed lead details go to Resend and the configured recipient. The privacy notice has been updated accordingly. Visitors can send one PDF, PNG or JPEG up to 2 MB with a chat message. The original stays in page memory and goes to Jacob through Resend only when it is included in the reviewed handoff and the visitor confirms. The selected OpenAI model must accept PDF and image inputs.

## Before public deployment

1. Review changes in the original repository before publishing.
2. Confirm the production environment variables, verified sender, and actual model access. Enable web research if desired.
3. Add durable/distributed rate limits (e.g. Vercel Firewall or Redis) and spend monitoring before promoting this broadly. Current limits are per running function instance, not global budgets: 30 chat requests/hour/IP, 4 leads/hour/IP. Instance restarts reset limits. Output and history bounds limit individual requests, not total project spending. Provider budget alerts are not a guaranteed hard spending cap.
4. Run `npm test`, `npm run build`, and `node scripts/check_estimates.mjs`.
5. Test an actual model response, stop/retry, website research limitations, a failed upstream request, and one owner-approved real lead email on a deployment. Local tests mock external providers and do not spend API credits or send email.
6. Confirm mobile/desktop appearance and approve publishing. Ask Jasper remains noindex during testing.

The UI uses safe DOM construction for a limited Markdown subset (paragraphs, headings, bold, lists, code, HTTP/HTTPS links, and tables); raw HTML never executes. The in-chat handoff previews a summary built from the latest request and answer. Visitors can replace it, cancel, or type “Send it” to authorize sending. The Jasper page contains the site header and chat workspace. Only the transcript scrolls, and the workspace adjusts to the visual viewport when a mobile keyboard opens. Jasper receives scope-checked catalog prices and an estimate for Essential plus one staff-editable section. Proposed pricing entries and private guidance stay outside its business reference.

## Website audit rubric

Jasper uses the server-side rubric in `server/site-audit.mjs`. It works independently of the optional web search setting. A public Think Marketing URL is optional if we want visitors to read the methodology. Jasper loads its rules from code.

| Check | How Jasper grades it |
| --- | --- |
| Page metadata | Pass when the fetched HTML contains a title, description, and one non-empty H1. Review missing or multiple elements. |
| Canonical | Report presence. Review an absent declaration. |
| Indexability signals | Review noindex signals or a Googlebot block. Pass when Googlebot is allowed by the inspected robots rules and no noindex signal was observed. Unknown rules leave this check unverified. |
| Structured data | Report JSON-LD presence and syntax. Review invalid JSON. Schema eligibility requires additional validation. |
| AI crawler rules | Evaluate the audited path against named and wildcard robots.txt rules. Report AI search and training controls separately. Search crawler restrictions are for review against the owner's goals. Training restrictions carry no penalty. |
| Search Console | Account registration stays unverified. Report public HTML verification tags on the page and homepage and Google verification TXT records for the exact hostname when observable. |
| Analytics | Report visible GA4 and other supported analytics signals. Review tag manager alone. Collection and events stay unverified. |

The audit samples the submitted page and up to four relevant pages on the same origin. It checks up to three additional same-site customer-action link destinations for HTTP status. It also inspects robots.txt, safe XML sitemaps, and public TXT records. Cross-page evidence includes page metadata, action links, phone numbers, and structured addresses, hours and service areas. It uses IPv4 and standard HTTP/HTTPS ports. It does not execute JavaScript, test tracking requests, log in to private accounts, or crawl links. Public evidence may be sent to OpenAI as chat context.

## URL-to-estimate

Ask Jasper to estimate a public URL, or select **Estimate a website from a URL** and paste the address. Jasper fetches the submitted HTML and samples up to three relevant linked pages on the final origin. It checks for visible menus, ordering, booking, forms, commerce, and account features, then calculates scoped options with the catalog estimator. Audits and estimates also read same-origin XML sitemaps, following up to six files total. A sitemap counts listed URLs, which can include content outside the rebuild scope. Small complete inventories can produce a separate, conditional page-count estimate. Public indications of vendor links or widgets are evidence for follow-up questions. The crawl cannot establish owner access, vendor contracts, custom workflows, hidden integrations, or every page on the site. Keep unknown work outside priced totals. A request for a website audit continues to use the audit rubric.
