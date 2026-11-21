export const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=`<>]+))/g)]
  .map(([, key, double, single, bare]) => [key.toLowerCase(), double ?? single ?? bare]));

const relevantPage = /\b(?:menu|specials|order|book|reservations?|services?|products?|shop|contact|about|locations?|appointments?)\b/i;

export function webUrl(value, base) {
  if (!value || value.startsWith('#') || value.length > 1000) return null;
  try {
    const url = new URL(value.replaceAll('&amp;', '&'), base);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url : null;
  } catch {
    return null;
  }
}

export function readLinks(source, base) {
  const markup = source.replace(/<!--[\s\S]*?-->|<(script|style|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  return [...markup.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi)].map(([, attributes, text]) => {
    const attributesByName = attrs(attributes);
    const href = attributesByName.href || '';
    return {
      href,
      url: webUrl(href, base),
      text: (attributesByName['aria-label'] || text.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim().slice(0, 120),
    };
  });
}

export function additionalPages(seed, limit = 3) {
  const base = new URL(seed.url);
  const cleanUrl = url => new URL(url.pathname.replace(/\/$/, '') || '/', base.origin).href;
  const visited = new Set([cleanUrl(base)]);
  const candidates = [];
  if (base.pathname !== '/') {
    const home = new URL('/', base);
    visited.add(home.href);
    candidates.push({url: home, priority: 0});
  }
  for (const {url, text} of seed.links) {
    if (!url || url.origin !== base.origin || url.search || url.username || url.password ||
        /\.(?:pdf|zip|png|jpe?g|webp|svg|docx?|xlsx?)$/i.test(url.pathname) ||
        !relevantPage.test(text + ' ' + url.pathname.replace(/[-_]+/g, ' '))) continue;
    const key = cleanUrl(url);
    if (visited.has(key)) continue;
    visited.add(key);
    const priority = /\b(?:menu|specials|order|book|reservations?|shop)\b/i.test(text + ' ' + url.pathname.replace(/[-_]+/g, ' ')) ? 0 : 1;
    url.hash = '';
    candidates.push({url, priority});
  }
  return candidates.sort((a, b) => a.priority - b.priority).slice(0, limit).map(candidate => candidate.url);
}

