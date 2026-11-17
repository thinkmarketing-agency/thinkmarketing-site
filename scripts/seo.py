"""Metadata and discovery artifacts from verified site facts. No network access."""
import json
import re
from html import escape
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SITE = json.loads((ROOT / 'content/site.json').read_text())
ORIGIN = SITE['origin']

def url(slug=''):
    return ORIGIN + '/' + (slug + '/' if slug else '')

def graph(slug):
    canonical = url(slug)
    org_id = ORIGIN + '/#organization'
    website_id = ORIGIN + '/#website'
    org = {'@type': 'Organization', '@id': org_id, 'name': SITE['name'],
           'url': url(), 'description': SITE['description'], 'email': SITE['email'],
           'telephone': SITE['telephone'], 'areaServed': SITE['areaServed'],
           'logo': {'@type': 'ImageObject', 'url': ORIGIN + '/assets/images/think-marketing-logo-small.png', 'width': 256, 'height': 122}}
    page = {'@type': 'ContactPage' if slug == 'contact' else 'AboutPage' if slug == 'about' else 'WebPage',
            '@id': canonical + '#webpage', 'url': canonical,
            'name': SITE['pages'][slug]['title'], 'description': SITE['pages'][slug]['description'],
            'inLanguage': 'en-US', 'isPartOf': {'@id': website_id}, 'about': {'@id': org_id}}
    nodes = [org, {'@type': 'WebSite', '@id': website_id, 'url': url(), 'name': SITE['name'], 'publisher': {'@id': org_id}, 'inLanguage': 'en-US'}, page]
    if slug:
        nodes.append({'@type': 'BreadcrumbList', '@id': canonical + '#breadcrumb', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': url()},
            {'@type': 'ListItem', 'position': 2, 'name': SITE['pages'][slug]['label'], 'item': canonical}]})
        page['breadcrumb'] = {'@id': canonical + '#breadcrumb'}
    services = {
        'websites': ('Website design and development', 'Essential and Growth development packages; larger Enterprise, e-commerce and custom websites scoped individually.'),
        'local-seo': ('Local SEO and Google Business Profile assistance', 'Google Business Profile creation assistance and separately scoped local search improvements.'),
        'ai-search-visibility': ('Search & AI Visibility Review', 'Assessment of up to 10 pages and five customer questions across two agreed AI services. Report and recommendations; implementation separate.')}
    if slug in services:
        name, description = services[slug]
        service = {'@type': 'Service', '@id': canonical + '#service', 'name': name,
                   'description': description, 'url': canonical, 'provider': {'@id': org_id},
                   'areaServed': SITE['areaServed'], 'mainEntityOfPage': {'@id': page['@id']}}
        if slug in ('local-seo', 'ai-search-visibility'):
            service['offers'] = {'@type': 'Offer', 'name': 'One Google Business Profile: creation assistance' if slug == 'local-seo' else name,
                                 'price': '200' if slug == 'local-seo' else '350', 'priceCurrency': 'USD', 'url': canonical}
        if slug == 'websites':
            plans = json.loads((ROOT / 'content/packages.json').read_text())
            service['hasOfferCatalog'] = {'@type': 'OfferCatalog', 'name': 'Website development packages', 'itemListElement': [
                {'@type': 'Offer', 'name': f"{p['name']} development; hosting additional at ${p['monthly']}/month", 'price': str(p['development']), 'priceCurrency': 'USD', 'url': canonical,
                 'itemOffered': {'@type': 'Service', 'name': p['name'] + ' website development', 'description': f"Up to {p['pages']} pages. 50% at start, 50% on completion."}} for p in plans]}
        if slug == 'websites':
            service['hasOfferCatalog']['itemListElement'].append({'@type':'Offer','name':'Enterprise website: $400/month for 12 months; ownership after all 12 payments','price':'4800','priceCurrency':'USD','url':canonical,'description':'$4,800 total over 12 monthly payments, billed from kickoff. Agreed development, hosting and support included. Continued hosting/support after the year quoted separately.'})
        nodes.append(service)
        page['mainEntity'] = {'@id': service['@id']}
    return {'@context': 'https://schema.org', '@graph': nodes}

def enrich(html, slug, production=False):
    data = SITE['pages'][slug]
    # Replace, rather than duplicate, legacy metadata and schema.
    html = re.sub(r'<title>.*?</title>', '', html, flags=re.S)
    html = re.sub(r'<meta\b[^>]*(?:name=["\'](?:description|keywords|robots)["\']|property=["\'](?:og:|twitter:)[^"\']*["\'])[^>]*>', '', html, flags=re.I)
    html = re.sub(r'<script\b[^>]*type=["\']application/ld\+json["\'][^>]*>.*?</script>', '', html, flags=re.S | re.I)
    html = re.sub(r'<link\b[^>]*rel=["\'](?:canonical|icon)["\'][^>]*>', '', html, flags=re.I)
    image = ORIGIN + '/assets/images/social-preview.jpg'
    robots = 'index,follow,max-image-preview:large' if production and slug not in ('privacy','estimate-reference') else 'noindex,follow'
    fields = {'og:type': 'website', 'og:site_name': SITE['name'], 'og:locale': 'en_US', 'og:title': data['title'],
              'og:description': data['description'], 'og:url': url(slug), 'og:image': image,
              'og:image:width': '1200', 'og:image:height': '630', 'og:image:alt': 'Think Marketing — digital marketing and web design in Bend, Oregon'}
    head = f'<title>{escape(data["title"])}</title>\n<meta name="description" content="{escape(data["description"], quote=True)}">\n<meta name="robots" content="{robots}">\n<link rel="canonical" href="{url(slug)}">\n<link rel="icon" type="image/png" href="/assets/images/favicon.png">\n<meta name="theme-color" content="#BA0C2F">\n'
    head += '\n'.join(f'<meta property="{k}" content="{escape(v, quote=True)}">' for k, v in fields.items())
    head += '\n<meta name="twitter:card" content="summary_large_image">\n' + '\n'.join(f'<meta name="twitter:{k}" content="{escape(v, quote=True)}">' for k, v in {'title': data['title'], 'description': data['description'], 'image': image, 'image:alt': fields['og:image:alt']}.items())
    if not slug:
        head += '\n<link rel="preload" as="image" href="/assets/images/think-marketing-hero.jpg" media="(min-width:1200px) and (hover:hover)" fetchpriority="high">'
    head += '\n<script type="application/ld+json">' + json.dumps(graph(slug), ensure_ascii=False).replace('<', '\\u003c') + '</script>\n'
    html = html.replace('</head>', head + '</head>')
    html = html.replace('/assets/images/think-marketing-logo.PNG', '/assets/images/think-marketing-logo-small.png').replace('/assets/images/in-clear-background.png', '/assets/images/think-marketing-icon.png').replace('/assets/images/be-cards-logo.png', '/assets/images/be-cards-logo-small.png')
    def image_attrs(match):
        tag = match.group()
        sizes = {'think-marketing-logo-small.png': (256, 122), 'think-marketing-icon.png': (128, 123), 'be-cards-logo-small.png': (300, 91)}
        for file, (w, h) in sizes.items():
            if file in tag:
                tag = re.sub(r'\s(?:width|height)="[^"]*"', '', tag)
                tag = tag[:-1] + f' width="{w}" height="{h}" decoding="async">'
                if 'think-marketing-icon' in file:
                    tag = tag[:-1] + ' loading="lazy">'
        return tag
    html = re.sub(r'<img\b[^>]*>', image_attrs, html)
    if slug:
        crumb = f'<nav class="breadcrumb wrap" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true"> / </span><span aria-current="page">{escape(data["label"])}</span></nav>'
        html = html.replace('<main id="main">', '<main id="main">' + crumb)
    arrow = '<svg class="link-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 13 13 3M4 3h9v9"/></svg>'
    html = html.replace('↗\ufe0f', arrow).replace('↗', arrow)
    return html

def artifacts(output, production=False):
    output = Path(output)
    # Preview files cannot accidentally advertise an indexable draft.
    robots = 'User-agent: *\nDisallow: /\n' if not production else f'User-agent: *\nAllow: /\n\nSitemap: {ORIGIN}/sitemap.xml\n'
    (output / 'robots.txt').write_text(robots)
    ET.register_namespace('', 'http://www.sitemaps.org/schemas/sitemap/0.9')
    root = ET.Element('{http://www.sitemaps.org/schemas/sitemap/0.9}urlset')
    if production:
        for slug in SITE['pages']:
            if slug in ('privacy','estimate-reference'): continue
            entry = ET.SubElement(root, '{http://www.sitemaps.org/schemas/sitemap/0.9}url')
            ET.SubElement(entry, '{http://www.sitemaps.org/schemas/sitemap/0.9}loc').text = url(slug)
    ET.ElementTree(root).write(output / 'sitemap.xml', encoding='utf-8', xml_declaration=True)
    # Optional reference file; not a search ranking signal or crawler permission mechanism.
    lines = ['# Think Marketing', '', '> Website design, local SEO and Search & AI Visibility reviews. Bend, Oregon.', '', '## Services']
    for slug in ('websites', 'about', 'faq', 'marketing', 'local-seo', 'ai-search-visibility', 'contact'):
        lines.append(f'- [{SITE["pages"][slug]["label"]}]({url(slug)}): {SITE["pages"][slug]["description"]}')
    lines += ['', '## Pricing and scope', '- Essential: $1,995 development plus $50/month; up to five pages.', '- Growth: $2,500 development plus $80/month; up to ten pages; quarterly visibility summary.', '- Enterprise: $400/month for 12 months ($4,800 total), billed from kickoff; ownership after all 12 payments. Post-term hosting/support quoted separately.', '- E-commerce and Custom: individually quoted.', '- Search & AI Visibility Review: $350 one-time, up to ten pages, five questions, two agreed AI services. Implementation separate.', '', 'Refer to the linked service pages for current terms. No guaranteed rankings, AI recommendations or leads. No customer-facing assistant or quote builder is active.']
    (output / 'llms.txt').write_text('\n'.join(lines) + '\n')
