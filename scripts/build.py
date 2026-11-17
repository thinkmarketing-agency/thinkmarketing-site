"""Render the local static site. No dependencies, network calls or deployment."""
import json
import argparse
import shutil
from seo import enrich, artifacts
from pathlib import Path
from html import escape

ROOT = Path(__file__).resolve().parents[1]
PACKAGES = json.loads((ROOT / 'content/packages.json').read_text())
parser = argparse.ArgumentParser(description='Build local preview or production files without deploying.')
parser.add_argument('--production', action='store_true', help='Write indexable release candidate to dist; never changes the preview.')
args = parser.parse_args()
OUTPUT = ROOT / 'dist' if args.production else ROOT
OUTPUT.mkdir(exist_ok=True)

NAV = [('websites', 'Websites'), ('marketing', 'Marketing'), ('about', 'About'), ('faq', 'FAQ'), ('ask-jasper', 'Ask Jasper')]

def money(value):
    return f'${value:,.0f}'

def intro(label, title, copy):
    return f'<section class="intro wrap"><p class="eyebrow">{label}</p><h1>{title}</h1><p class="lede">{copy}</p></section>'

def row(number, title, copy):
    return f'<article class="service-row"><span class="number">{number}</span><h3>{title}</h3><p>{copy}</p></article>'

def cta():
    return '<section class="cta wrap"><div><h2>Let’s find your next step.</h2><p>Tell us about your business and what you need.</p></div><a class="button light" href="/contact/">Let’s talk ↗</a></section>'

HOME = (ROOT / 'content/home.html').read_text()

CONTACT = intro('Contact Think Marketing', 'Let’s make the<br>next step clearer.', 'Have a website in mind, a local search question, or a marketing problem you’d like to untangle? Start with a conversation.') + '''<section class="section wrap contact-grid"><div class="contact-box"><p class="eyebrow">Say hello</p><a class="email" href="mailto:thinkmarketingbend@gmail.com">thinkmarketingbend@gmail.com ↗</a><div class="actions"><a class="button" href="tel:+15413160735">Call (541) 316-0735</a><a class="text-link" href="sms:+15413160735">Send a text ↗</a></div><p>Bend, Oregon · Serving Central Oregon businesses</p></div><aside><h2>A little context helps.</h2><ul class="checklist"><li>What does your business do?</li><li>Do you have a website already?</li><li>What would you like to improve?</li><li>Is there a budget or date to work toward?</li></ul><p class="fine">No need to have every answer. Please keep passwords and sensitive account information out of your message.</p></aside></section>'''

PRIVACY = intro('Privacy', 'Your information. Handled with care.', 'Last updated November 17, 2026. This notice explains how Think Marketing handles information through this website and direct contact.') + '<section class="section wrap prose"><h2>When you contact us</h2><p>If you email, call or text us, we receive the information you choose to share, such as your name, contact details, business information and project questions. We use it to respond, prepare quotes, provide requested services and keep relevant business records. Contact links open your own email, phone or messaging app; this site does not collect messages through a contact form.</p><h2>Website hosting and technical information</h2><p>This website is hosted by Vercel. Delivering and protecting the site can involve processing technical information such as your IP address, requested pages, browser information and request times. Vercel may process this information to operate, secure and troubleshoot its services. See <a href="https://vercel.com/legal/privacy-notice">Vercel’s Privacy Notice</a> for more information.</p><h2>Cookies, analytics and AI</h2><p>We have not added advertising trackers, visitor analytics, marketing cookies or a connected AI chat service. Ask Jasper is a guided browser-based preview: questions and estimate selections are processed in your browser, are not stored by this feature, and are not sent to an AI provider. Selecting the email link opens your own email app with an estimate for you to review and send. Our hosting provider may use technical measures needed for site delivery and security. We will update this notice if we introduce features that change how visitor information is handled.</p><h2>Service providers and sharing</h2><p>Hosting, email, phone and messaging providers process information needed to deliver those services. We may also disclose information when required by law or necessary to protect the security of our services. We do not sell personal information or share it for cross-context behavioral advertising.</p><h2>Retention and security</h2><p>We retain correspondence and project records as needed to respond to inquiries, deliver services, maintain business records and meet applicable obligations. Retention depends on the purpose and type of record. We use reasonable safeguards, but no internet transmission or storage system is completely secure. Please do not send passwords, payment-card details or sensitive personal information in an inquiry.</p><h2>Your choices</h2><p>You can contact us to ask about information you have provided, request a correction or request deletion. We will consider requests and respond as required by applicable law; some records may need to be retained for business or legal obligations. We may need to verify your identity before acting on a request.</p><h2>Links to other websites</h2><p>Links such as be.cards and the reference links on our service pages take you to other websites. Those sites have their own privacy practices. Information you provide after following a link is handled by that site and its service providers.</p><h2>Contact Think Marketing</h2><p>For privacy questions or requests, email <a href="mailto:thinkmarketingbend@gmail.com">thinkmarketingbend@gmail.com</a> or call <a href="tel:+15413160735">(541) 316-0735</a>. Think Marketing is based in Bend, Oregon.</p></section>'

PAGES = {'': ('Small business websites & marketing in Bend, Oregon', HOME), 'contact': ('Contact', CONTACT), 'privacy': ('Privacy', PRIVACY)}

def faq(items):
    return '<section class="section wrap faq"><div class="section-head"><h2>A few straight answers.</h2></div>' + ''.join(f'<details><summary>{q}</summary><p>{a}</p></details>' for q, a in items) + '</section>'

REVIEW = '<article class="feature-price review-offer" id="visibility-review"><p class="eyebrow">Search &amp; AI Visibility Review</p><h2>$350 <small>one-time</small></h2><p>Find out what’s missing, what matters and what to fix first.</p><ul><li>Up to 10 website pages</li><li>Discovery, technical and content checks</li><li>5 customer questions sampled across 2 agreed AI services</li><li>A plain-English report with prioritized recommendations</li></ul><a class="button" href="/contact/?service=visibility-review">Ask about a visibility review ↗</a><p class="fine">Assessment only. Implementation is quoted separately. Sources, sample dates, limitations and access requirements are documented.</p></article>'

LOCAL = intro('Local SEO · Bend & Central Oregon', 'Local SEO &amp; Google Business Profile Help in Bend, Oregon', 'Help nearby customers find accurate information, understand your services and get in touch.') + '<section class="section wrap local-layout"><div class="feature-price"><p class="eyebrow">Google Business Profile creation</p><h2>$200 <small>one-time</small></h2><p>Creation assistance for one business profile, with business details, service information and a connection to your website.</p><a class="button" href="/contact/?service=gbp-creation">Start your business profile ↗</a><p class="fine">You keep control of the account. Eligibility and verification follow Google’s process. Ongoing management is separate.</p></div><div><h2>Already have a profile?</h2><p>We can review what you have and quote the improvements you actually need.</p>' + row('01', 'A clear Google presence', 'Review categories, services, hours, contact details and service areas for accuracy.') + row('02', 'A useful local website', 'Explain what you do and where you work, with readable mobile pages and an easy way to contact you.') + row('03', 'Consistency & honest reviews', 'Align business information across relevant listings and make it easier to request genuine customer feedback.') + '</div></section><section class="section wrap review-layout">' + REVIEW + '<div class="review-context"><h2>Not sure where to start?</h2><p>The combined review looks at your website’s search and AI visibility together, so you get one prioritized plan.</p><p>Tell us if local discovery is your main concern. We’ll confirm the review scope and any Business Profile access before work begins.</p><h3>Fixes are scoped separately.</h3><p>Profile cleanup, listing corrections, website improvements and ongoing support are quoted around the agreed work.</p><h3>Measure what matters.</h3><p>Where access and data are available, we review search visibility, profile actions and website inquiries, alongside a record of completed work.</p></div></section>' + faq([
('Why doesn’t my business show up on Google Maps?', 'There can be several reasons: eligibility or verification, inaccurate information, relevance to the search, competition or the searcher’s location. Google describes relevance, distance and prominence as key factors. We review the specifics before recommending a fix; nobody can move your business closer to every searcher.'),
('Do I need a website if I already have a Business Profile?', 'A profile helps people find key details. A website gives you room to explain your services, qualifications, service areas and customer questions. They serve different purposes and should work together.'),
('Can you help with reviews?', 'Yes. We can scope a reviews display or a process for requesting genuine feedback. We do not write reviews or handle review responses. We don’t create fake reviews, filter requests to seek only positive feedback, or guarantee ratings.'),
('Can you guarantee rankings or leads?', 'No. We explain the work, the evidence and the limitations. Search results vary by location and over time. Our goal is a clearer, more useful business presence.'),
('Is local SEO included in website hosting?', 'Profile creation, cleanup and ongoing SEO work are separate. Growth includes a quarterly Search & AI Visibility summary, not a full ongoing SEO service.')]) + '<p class="wrap source-note">Learn more: <a href="https://support.google.com/business/answer/7091">Google’s explanation of local rankings ↗</a></p>' + cta()

AI = intro('AI & Search Visibility', 'AI Search Visibility &amp; SEO for Small Businesses', 'Help search engines and AI services find clear, accurate information about your business. Practical help for Bend, Central Oregon and beyond.') + '<section class="section wrap review-layout">' + REVIEW + '<div class="review-context"><h2>One review. A useful next step.</h2>' + row('01', 'Can your content be found?', 'Check discovery and indexing signals, important page access and technical obstacles. Access for search discovery is reviewed separately from AI training preferences.') + row('02', 'Does it answer the question?', 'Review your services, location, expertise and answers to real customer questions. Identify missing or unclear information.') + row('03', 'What can we measure?', 'Review available search performance, identifiable AI referrals and dated samples of answers. Where available, AI citation data adds context—not a complete market-wide score.') + '</div></section><section class="section wrap"><div class="policy-strip"><p><strong>After the review</strong><br>Technical fixes, clearer service content and other improvements are quoted separately. You receive recommendations before choosing implementation.</p><p><strong>Already on Growth?</strong><br>Your plan includes a quarterly Search &amp; AI Visibility summary. The $350 assessment and implementation are separate services.</p></div></section>' + faq([
('Is AI visibility different from SEO?', 'There is substantial overlap: discoverable pages, clear information and useful content matter to both. Google says its AI search features do not require special optimization beyond established SEO fundamentals. We focus on practical improvements rather than a secret formula.'),
('What are AEO and GEO?', 'Answer Engine Optimization and Generative Engine Optimization are names used for work intended to improve visibility in AI-generated answers. We use plain English: make business information easier to find, understand and reference, then observe what happens.'),
('What does the $350 review deliver?', 'A review of up to 10 pages, discovery/technical/content checks and 5 customer questions sampled across 2 agreed AI services. Your report records dates, sources, observed gaps, limitations and prioritized recommendations. It is an assessment; implementation is quoted separately. You supply any new written content and images.'),
('What is included in Growth’s quarterly summary?', 'A brief review of available search performance and identifiable AI referral data, plus a small agreed set of dated visibility observations and recommended next steps. Data availability, questions and access are confirmed in your proposal. This does not include a full audit, monthly SEO management or new content production.'),
('Can you guarantee that ChatGPT or Google will recommend me?', 'No. Answers vary by service, wording, location and time. Allowing a search crawler to access your pages does not guarantee inclusion. We distinguish measured observations from recommendations and avoid universal AI visibility scores.'),
('Does this put a chatbot on my website?', 'No. This service concerns how your business is found in search and AI answers. Website assistants are a separate service.')]) + '<p class="wrap source-note">Further reading: <a href="https://developers.google.com/search/docs/appearance/ai-features">Google’s AI search guidance</a> · <a href="https://www.bing.com/webmasters/help/ai-performance-9f8e7d6c">Bing’s AI citation reporting</a></p>' + cta()

PAGES['local-seo'] = ('Local SEO & Google Business Profile Help in Bend, Oregon', LOCAL)
PAGES['ai-search-visibility'] = ('AI Search Visibility & SEO for Small Businesses', AI)

from pages import custom_pages
PAGES.update(custom_pages(intro, cta))

for slug, (title, body) in PAGES.items():
    nav = ''.join(f'<a href="/{route}/"'+(' aria-current="page"' if slug == route else '')+f'>{escape(label)}</a>' for route, label in NAV)
    html = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{escape(title)} | Think Marketing</title><meta name="description" content="{escape({'': 'Clear website pricing, local SEO and practical marketing for Bend and Central Oregon businesses.', 'local-seo': 'Local SEO and Google Business Profile help in Bend and Central Oregon. Profile creation $200; combined Search & AI Visibility Review $350. Improvements quoted separately.', 'ai-search-visibility': 'Search & AI Visibility Review for small businesses: $350 for up to 10 pages, 5 customer questions and 2 agreed AI services. Plain-English findings and prioritized next steps.', 'websites': 'Essential websites from $1,995 plus $50/month. Growth from $2,500 plus $80/month. Clear scope, client ownership and monthly hosting.'}.get(slug, title + ' for Bend and Central Oregon businesses.'))}"><meta name="robots" content="noindex,nofollow"><link rel="icon" href="/assets/images/in-clear-background.png"><link rel="stylesheet" href="/styles.css"></head><body><a class="skip" href="#main">Skip to content</a><header class="site-header wrap"><a class="brand" href="/" aria-label="Think Marketing home"><img src="/assets/images/think-marketing-logo.PNG" alt="Think Marketing"></a><nav aria-label="Main navigation">{nav}</nav></header><main id="main">{body}</main><footer class="wrap"><div><a class="brand" href="/" aria-label="Think Marketing home"><img src="/assets/images/think-marketing-logo.PNG" alt="Think Marketing"></a><p>Practical marketing.<br>Bend, Oregon.</p></div><div class="footer-links"><a href="mailto:thinkmarketingbend@gmail.com">Email us ↗</a><a href="tel:+15413160735">(541) 316-0735</a><a href="/privacy/">Privacy</a><span>© 2026 Think Marketing</span></div></footer></body></html>'''
    import re
    home = (ROOT / 'content/home.html').read_text()
    header = re.search(r'<header.*?</header>', home, re.S).group()
    header = re.sub(r'<nav class="home-nav".*?</nav>', lambda _: f'<nav class="home-nav" aria-label="Main navigation">{nav}</nav>', header, flags=re.S)
    footer = re.search(r'<footer.*?</footer>', home, re.S).group()
    html = re.sub(r'<header.*?</header>', lambda _: header, html, flags=re.S)
    html = re.sub(r'<footer.*?</footer>', lambda _: footer, html, flags=re.S)
    html = html.replace('<link rel="stylesheet" href="/styles.css">', '<link rel="stylesheet" href="/home.css"><link rel="stylesheet" href="/styles.css">')
    target = OUTPUT / slug / 'index.html' if slug else OUTPUT / 'index.html' 
    target.parent.mkdir(exist_ok=True)
    if not slug:
        html = (ROOT / 'content/home.html').read_text()
    target.write_text(enrich(html, slug, args.production))
artifacts(OUTPUT, args.production)
jsdir=OUTPUT/'assets/js'
jsdir.mkdir(parents=True, exist_ok=True)
for name in ('jasper.mjs','estimator.mjs'):
    shutil.copyfile(ROOT/'content'/name, jsdir/name)
reference=OUTPUT/'estimate-reference'
reference.mkdir(exist_ok=True)
shutil.copyfile(ROOT/'content/catalog.json', reference/'catalog.json')
shutil.copyfile(ROOT/'content/faq.json', reference/'faq.json')
if args.production:
    for name in ('home.css', 'styles.css'):
        shutil.copyfile(ROOT / name, OUTPUT / name)
    assets = OUTPUT / 'assets/images'
    assets.mkdir(parents=True, exist_ok=True)
    for name in ('think-marketing-hero.jpg', 'think-marketing-logo-small.png', 'think-marketing-icon.png', 'favicon.png', 'be-cards-logo-small.png', 'social-preview.jpg'):
        shutil.copyfile(ROOT / 'assets/images' / name, assets / name)
(OUTPUT / '404.html').write_text('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><title>Page not found | Think Marketing</title><link rel="stylesheet" href="/home.css"><link rel="stylesheet" href="/styles.css"></head><body><main class="wrap section"><h1>That page isn’t here.</h1><p>Find website pricing, local SEO and Search &amp; AI Visibility services on our homepage.</p><a class="button" href="/">Back to Think Marketing</a></main></body></html>')
print(f'Rendered {len(PAGES)} pages to {OUTPUT}. Mode: {"production candidate" if args.production else "non-indexable local preview"}. No deployment performed.')
