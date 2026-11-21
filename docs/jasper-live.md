# Jasper implementation

This version replaces the Coming Soon page with streaming AI chat and makes Ask Jasper the homepage hero action. It uses Vercel Node functions alongside the existing static build; no framework migration is needed.

## Configuration

- `OPENAI_API_KEY`: server-side OpenAI project key; already configured by the owner in Vercel, not copied here.
- `JASPER_MODEL`: optional; defaults to `gpt-6-luna`. Confirm model access in the funded API account before launch.
- `JASPER_WEB_SEARCH=true`: opt in to paid public web research. Disabled by default. This is not a crawler or full technical audit.
- `RESEND_API_KEY` and `JASPER_FROM_EMAIL`: required for automatic lead email. From address must use a Resend-verified domain. Optional `JASPER_TO_EMAIL` defaults to Think Marketing's Gmail. Until configured, the form preserves its contents and offers a user-reviewed email-app link.

Instructions and verified reference selection live in `server/jasper.mjs`. The draft comprehensive catalog is deliberately not loaded as approved pricing. No private supplier or margin notes are included. Public reference files already in the existing site remain public.

No chat or uploads are persisted by this application. Conversation state lives in page memory. OpenAI receives messages and context with `store:false`; this does not eliminate provider abuse-monitoring retention. Explicitly submitted, visitor-reviewed lead details go to Resend and the configured recipient. The privacy notice has been updated accordingly. File uploads are deferred; visitors can paste redacted excerpts.

## Before public deployment

1. Transfer this branch to the original repository or push the reviewed branch to its normal remote. This is a separate checkout because the current chat cannot write the original repo directory.
2. Confirm the production environment variables, verified sender, and actual model access. Enable web research if desired.
3. Add durable/distributed rate limits (e.g. Vercel Firewall or Redis) and spend monitoring before promoting this broadly. Current limits are per running function instance, not global budgets: 30 chat requests/hour/IP, 4 leads/hour/IP. Instance restarts reset limits. Output and history bounds limit individual requests, not total project spending. Provider budget alerts are not a guaranteed hard spending cap.
4. Run `npm test`, `npm run build`, and `node scripts/check_estimates.mjs`.
5. Test an actual model response, stop/retry, website research limitations, a failed upstream request, and one owner-approved real lead email on a deployment. Local tests mock external providers and do not spend API credits or send email.
6. Confirm mobile/desktop appearance and approve publishing. Ask Jasper remains noindex during testing.

The UI uses safe DOM construction for a limited Markdown subset (paragraphs, headings, bold, lists, code, HTTP/HTTPS links, and tables); raw HTML never executes. The handoff currently prefills a visitor-editable transcript, not a model-generated concise summary. Refining that summary is a follow-up improvement.
