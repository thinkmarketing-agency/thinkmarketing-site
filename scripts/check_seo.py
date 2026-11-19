"""Repeatable checks against generated files; no external dependencies or network."""
import argparse
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
from urllib.robotparser import RobotFileParser
from xml.etree import ElementTree as ET
from seo import SITE, ORIGIN, url

class Page(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.meta = {}; self.links = []; self.ids = []; self.images = []; self.scripts = []
        self.h1 = 0; self.title = ''; self.in_title = False; self.in_json = False; self.buffer = ''
        self.headings = []; self.lang = None; self.mains = 0; self.text = []
        self.feed(source)
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'html': self.lang = a.get('lang')
        if tag == 'main': self.mains += 1
        if tag == 'title': self.in_title = True
        if tag == 'h1': self.h1 += 1
        if re.fullmatch('h[1-6]', tag): self.headings.append(int(tag[1]))
        if a.get('id'): self.ids.append(a['id'])
        if tag == 'meta':
            key = a.get('name') or a.get('property')
            if key:
                assert key not in self.meta, f'Duplicate metadata: {key}'
                self.meta[key] = a.get('content')
        if tag in ('a', 'link'): self.links.append(a)
        if tag == 'img': self.images.append(a)
        if tag == 'script':
            if a.get('type') == 'application/ld+json':
                self.in_json = True; self.buffer = ''
            else:
                assert a.get('type') == 'module' and a.get('src') == '/assets/js/jasper.mjs', 'Unexpected executable script'
                self.links.append({'href': a['src']})
    def handle_data(self, data):
        if self.in_title: self.title += data
        if self.in_json: self.buffer += data
        else: self.text.append(data)
    def handle_endtag(self, tag):
        if tag == 'title': self.in_title = False
        if tag == 'script' and self.in_json:
            self.scripts.append(json.loads(self.buffer)); self.in_json = False

def check(root, production):
    results = []
    def test(label, condition):
        assert condition, label
        results.append(label)
    parsed = {slug: Page((root / slug / 'index.html').read_text()) for slug in SITE['pages']}
    titles = []; descriptions = []
    for slug, page in parsed.items():
        label = slug or 'home'
        test(f'{label}: language, main and H1', page.lang == 'en' and page.mains == 1 and page.h1 == 1)
        test(f'{label}: unique element IDs', len(page.ids) == len(set(page.ids)))
        test(f'{label}: logical heading levels', all(b <= a + 1 for a,b in zip(page.headings,page.headings[1:])))
        test(f'{label}: title and description match source', page.title == SITE['pages'][slug]['title'] and page.meta.get('description') == SITE['pages'][slug]['description'])
        test(f'{label}: concise metadata', 20 <= len(page.title) <= 70 and 70 <= len(page.meta['description']) <= 180)
        titles.append(page.title); descriptions.append(page.meta['description'])
        canonicals = [a['href'] for a in page.links if a.get('rel') == 'canonical']
        test(f'{label}: one canonical on confirmed domain', canonicals == [url(slug)])
        should_index = production and slug not in ('privacy','estimate-reference') and SITE['pages'][slug].get('index',True)
        test(f'{label}: correct indexing mode', page.meta.get('robots') == ('index,follow,max-image-preview:large' if should_index else 'noindex,follow'))
        test(f'{label}: social sharing metadata', page.meta.get('og:url') == url(slug) and page.meta.get('og:title') == page.title and page.meta.get('twitter:card') == 'summary_large_image' and page.meta.get('og:image:width') == '1200' and page.meta.get('og:image:height') == '630')
        test(f'{label}: one JSON-LD graph', len(page.scripts) == 1 and page.scripts[0].get('@context') == 'https://schema.org')
        graph = page.scripts[0]['@graph']; entities = {n['@id']: n for n in graph}
        test(f'{label}: unique schema entities', len(entities) == len(graph))
        test(f'{label}: consistent organization', entities[ORIGIN + '/#organization']['telephone'] == SITE['telephone'] and entities[ORIGIN + '/#organization']['email'] == SITE['email'])
        def refs(value):
            if isinstance(value, dict):
                if set(value) == {'@id'}: test(f'{label}: schema reference {value["@id"]}', value['@id'] in entities)
                for child in value.values(): refs(child)
            elif isinstance(value, list):
                for child in value: refs(child)
        refs(graph)
        test(f'{label}: no fabricated ratings', 'aggregateRating' not in json.dumps(graph) and 'reviewRating' not in json.dumps(graph))
        test(f'{label}: schema page matches canonical', entities[url(slug) + '#webpage']['url'] == url(slug))
        if slug:
            crumbs = entities[url(slug) + '#breadcrumb']['itemListElement']
            test(f'{label}: schema breadcrumbs', crumbs[-1]['item'] == url(slug) and [c['position'] for c in crumbs] == list(range(1,len(crumbs)+1)))
        for image in page.images:
            test(f'{label}: image text and dimensions', bool(image.get('alt')) and int(image.get('width','0')) > 0 and int(image.get('height','0')) > 0)
        for a in page.links + page.images:
            target = a.get('href') or a.get('src')
            if not target: continue
            u = urlsplit(target)
            if u.scheme or u.netloc: continue
            path = root / unquote(u.path.lstrip('/')) if u.path else root / slug / 'index.html'
            if path.is_dir(): path = path / 'index.html'
            test(f'{label}: destination {target}', path.exists())
            if u.fragment and path.suffix == '.html':
                test(f'{label}: anchor {target}', unquote(u.fragment) in Page(path.read_text()).ids)
        for css in ('home.css','styles.css'):
            for asset in re.findall(r'url\([\'\"]?([^\)\'\"]+)', (root/css).read_text()):
                test(f'{label}: CSS asset {asset}', (root/asset.lstrip('/')).is_file())
    for slug,page in parsed.items():
        if slug == 'estimate-reference': continue
        test(f'{slug or "home"}: no public links to the unlisted reference', all('/estimate-reference' not in a.get('href','') for a in page.links))
    test('Jasper: coming soon, no chat interface', 'Coming soon.' in (root/'ask-jasper/index.html').read_text() and not (root/'assets/js/jasper.mjs').exists() and '<form' not in (root/'ask-jasper/index.html').read_text())
    catalog=json.loads((root/'estimate-reference/catalog.json').read_text())
    test('Reference: every service preserved in readable HTML', all('service-'+i['id'] in parsed['estimate-reference'].ids for i in catalog['items']))
    test('Reference: scope and estimate sections preserved', all(i in parsed['estimate-reference'].ids for i in ('policies','estimating','reference-faq','business-facts')))
    test('Site: distinct titles and descriptions', len(set(titles)) == len(titles) and len(set(descriptions)) == len(descriptions))
    sitemap = ET.parse(root / 'sitemap.xml').getroot()
    locations = [n.text for n in sitemap.iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
    expected = [url(s) for s in SITE['pages'] if s not in ('privacy','estimate-reference') and SITE['pages'][s].get('index',True)] if production else []
    test('Sitemap: canonical indexable pages only', locations == expected)
    robot = RobotFileParser(); robot.parse((root/'robots.txt').read_text().splitlines())
    for bot in ('Googlebot','Bingbot','OAI-SearchBot','ChatGPT-User','PerplexityBot','Claude-SearchBot'):
        test(f'Crawlers: {bot} follows selected mode', all(robot.can_fetch(bot,url(s)) == production for s in SITE['pages']))
    test('Crawler discovery: production sitemap declared', not production or f'Sitemap: {ORIGIN}/sitemap.xml' in (root/'robots.txt').read_text())
    test('Optional llms.txt: canonical links', ORIGIN in (root/'llms.txt').read_text())
    test('404: explicit not-found page', 'noindex,follow' in (root/'404.html').read_text() and 'isn’t here' in (root/'404.html').read_text())
    test('Hero: image budget below 200KB', (root/'assets/images/think-marketing-hero.jpg').stat().st_size < 200_000)
    if production:
        test('Production: private owner files excluded', not (root/'work').exists())
        test('Production: source files excluded', not (root/'scripts').exists() and not (root/'.git').exists() and not (root/'docs').exists())
    report = {'mode': 'production candidate' if production else 'preview', 'passed_assertions': len(results), 'pages': len(parsed), 'results': results,
              'not_verified': ['Live DNS/TLS/redirects/headers', 'Search engine indexing', 'Google Rich Results and Schema.org validators', 'Lighthouse lab scores and CrUX field metrics', 'AI citations/recommendations', 'Production privacy and commercial decisions']}
    return report

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--production', action='store_true')
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    if args.production: root /= 'dist'
    report = check(root,args.production)
    if args.report: args.report.write_text(json.dumps(report,indent=2)+'\n')
    print(f"PASS: {report['passed_assertions']} assertions across {report['pages']} {report['mode']} pages. This is not a ranking or Lighthouse score.")
