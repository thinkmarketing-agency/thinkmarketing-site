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

NAV = [('websites', 'Websites'), ('marketing', 'Digital Marketing'), ('portfolio', 'Portfolio'), ('faq', 'FAQ'), ('ask-jasper', 'Ask Jasper')]

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

PRIVACY = intro('Privacy', 'Your information. Handled with care.', 'Last updated November 17, 2026. This notice explains how Think Marketing handles information through this website and direct contact.') + '<section class="section wrap prose"><h2>When you contact us</h2><p>If you email, call or text us, we receive the information you choose to share, such as your name, contact details, business information and project questions. We use it to respond, prepare quotes, provide requested services and keep relevant business records. Contact links open your own email, phone or messaging app; this site does not collect messages through a contact form.</p><h2>Website hosting and technical information</h2><p>This website is hosted by Vercel. Delivering and protecting the site can involve processing technical information such as your IP address, requested pages, browser information and request times. Vercel may process this information to operate, secure and troubleshoot its services. See <a href="https://vercel.com/legal/privacy-notice">Vercel’s Privacy Notice</a> for more information.</p><h2>Cookies, analytics and AI</h2><p>We have not added advertising trackers or marketing cookies. Jasper is an AI assistant powered by OpenAI. Messages and the conversation context are sent to OpenAI to generate responses. When you submit a public URL for an audit, Jasper retrieves the page and related public signals and may send excerpts and findings to OpenAI. Optional web search may send relevant queries to its search tools. We request that responses not be stored as application state; provider security and abuse-monitoring retention may still apply. Chat history is kept in memory in your current page, not in browser storage, and resets when you reload or leave. Do not paste credentials, payment information, or sensitive documents. File uploads are not currently supported. If you choose Connect with Jacob, you can review and edit the information before explicitly sending it to Think Marketing. Resend processes inquiry email delivery. We retain received inquiries as business correspondence. See <a href="https://openai.com/policies/privacy-policy/">OpenAI’s privacy policy</a> and <a href="https://resend.com/legal/privacy-policy">Resend’s privacy policy</a>. Our hosting provider may use technical measures needed for site delivery and security. We will update this notice if we introduce features that change how visitor information is handled.</p><h2>Service providers and sharing</h2><p>Hosting, email, phone and messaging providers process information needed to deliver those services. We may also disclose information when required by law or necessary to protect the security of our services. We do not sell personal information or share it for cross-context behavioral advertising.</p><h2>Retention and security</h2><p>We retain correspondence and project records as needed to respond to inquiries, deliver services, maintain business records and meet applicable obligations. Retention depends on the purpose and type of record. We use reasonable safeguards, but no internet transmission or storage system is completely secure. Please do not send passwords, payment-card details or sensitive personal information in an inquiry.</p><h2>Your choices</h2><p>You can contact us to ask about information you have provided, request a correction or request deletion. We will consider requests and respond as required by applicable law; some records may need to be retained for business or legal obligations. We may need to verify your identity before acting on a request.</p><h2>Links to other websites</h2><p>Links such as be.cards and the reference links on our service pages take you to other websites. Those sites have their own privacy practices. Information you provide after following a link is handled by that site and its service providers.</p><h2>Contact Think Marketing</h2><p>For privacy questions or requests, email <a href="mailto:thinkmarketingbend@gmail.com">thinkmarketingbend@gmail.com</a> or call <a href="tel:+15413160735">(541) 316-0735</a>. Think Marketing is based in Bend, Oregon.</p></section>'

PAGES = {'': ('Small business websites & marketing in Bend, Oregon', HOME), 'contact': ('Contact', CONTACT), 'privacy': ('Privacy', PRIVACY)}

from pages import custom_pages
PAGES.update(custom_pages(intro, cta))

for slug, (title, body) in PAGES.items():
    nav = ''.join(f'<a href="/{route}/"'+(' aria-current="page"' if (slug == route or route == 'marketing' and slug in ('local-seo','ai-search-visibility')) else '')+f'>{escape(label)}</a>' for route, label in NAV)
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
if not args.production:
    from pricing_reference import write_owner_preview
    write_owner_preview(OUTPUT)
reference=OUTPUT/'estimate-reference'
reference.mkdir(exist_ok=True)
shutil.copyfile(ROOT/'content/catalog.json', reference/'catalog.json')
shutil.copyfile(ROOT/'content/capability-map.json', reference/'capability-map.json')
shutil.copyfile(ROOT/'content/knowledge-faq.json', reference/'faq.json')
shutil.copyfile(ROOT/'content/estimator.mjs', reference/'estimator.mjs')
# Remove only the explicitly retired assistant UI from generated outputs.
for retired in ('assets/js/jasper.mjs','assets/js/estimator.mjs'):
    (OUTPUT/retired).unlink(missing_ok=True)
if args.production:
    for name in ('jasper.css','jasper-chat.mjs'):
        (OUTPUT/'assets').mkdir(exist_ok=True)
        shutil.copyfile(ROOT/'assets'/name, OUTPUT/'assets'/name)
    for name in ('home.css', 'styles.css'):
        shutil.copyfile(ROOT / name, OUTPUT / name)
    assets = OUTPUT / 'assets/images'
    assets.mkdir(parents=True, exist_ok=True)
    for name in ('think-marketing-hero.jpg', 'think-marketing-logo-small.png', 'think-marketing-icon.png', 'favicon.png', 'be-cards-logo-small.png', 'social-preview.jpg'):
        shutil.copyfile(ROOT / 'assets/images' / name, assets / name)
(OUTPUT / '404.html').write_text('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><title>Page not found | Think Marketing</title><link rel="stylesheet" href="/home.css"><link rel="stylesheet" href="/styles.css"></head><body><main class="wrap section"><h1>That page isn’t here.</h1><p>Find website pricing, local SEO and Search &amp; AI Visibility services on our homepage.</p><a class="button" href="/">Back to Think Marketing</a></main></body></html>')
print(f'Rendered {len(PAGES)} pages to {OUTPUT}. Mode: {"production candidate" if args.production else "non-indexable local preview"}. No deployment performed.')
