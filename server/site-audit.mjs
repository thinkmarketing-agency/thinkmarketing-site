import {readAuditPage, summarizeAuditPages} from './audit-evidence.mjs';
import {attrs, readLinks, additionalPages} from './site-links.mjs';
import {lookup, Resolver} from 'node:dns/promises';
import {request as httpRequest} from 'node:http';
import {request as httpsRequest} from 'node:https';
import {BlockList, isIP} from 'node:net';

const blocked = new BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
  ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 3],
]) blocked.addSubnet(address, prefix);

export function auditTarget(message) {
  const explicit = message.match(/https?:\/\/[^\s<>"`]+/i);
  const bare = message.match(/(?:^|[\s(])((?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?:[/?#][^\s<>"`]*)?)(?=$|[\s).,!])/i);
  if (explicit) return explicit[0].replace(/[),.!?]+$/, '');
  if (bare) return 'https://' + bare[1].replace(/[),.!?]+$/, '');
}

export async function fetchPublicPage(address, signal, redirects = 0, requiredOrigin) {
  const url = new URL(address);
  url.hash = '';
  if (requiredOrigin && url.origin !== requiredOrigin) throw Error('The page moved outside the inspected site.');
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      url.port || isIP(url.hostname) || url.hostname.startsWith('[') ||
      !url.hostname.includes('.') || url.hostname.endsWith('.') ||
      /\.(?:localhost|local|internal|test|invalid|onion|home\.arpa)$/i.test(url.hostname)) {
    throw Error('Use a public HTTP or HTTPS hostname on its standard port.');
  }

  // Resolve once per hop and pin the connection to the checked address.
  const addresses = await lookup(url.hostname, {family: 4, all: true});
  signal.throwIfAborted();
  if (!addresses.length || addresses.some(({address: ip}) => blocked.check(ip))) {
    throw Error('The hostname has no eligible public address.');
  }
  const request = url.protocol === 'https:' ? httpsRequest : httpRequest;
  const result = await new Promise((resolve, reject) => {
    const req = request(url, {
      agent: false, family: 4, autoSelectFamily: false, signal,
      lookup: (_hostname, _options, callback) => callback(null, addresses[0].address, 4),
      headers: {'User-Agent': 'ThinkMarketing-Jasper-Audit/1.0', 'Accept-Encoding': 'identity'},
    }, async response => {
      const {statusCode: status, headers} = response;
      if (status !== 200) {
        response.destroy();
        resolve({status, headers, url: url.href, text: ''});
        return;
      }
      try {
        const chunks = [];
        let size = 0;
        for await (const chunk of response) {
          size += chunk.length;
          if (size > 1024 * 1024) throw Error('The response exceeded the audit size limit.');
          chunks.push(chunk);
        }
        resolve({status, headers, url: url.href, text: Buffer.concat(chunks).toString('utf8')});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
    req.end();
  });
  if ([301, 302, 303, 307, 308].includes(result.status) && result.headers.location) {
    if (redirects >= 4) throw Error('The URL exceeded the redirect limit.');
    return fetchPublicPage(new URL(result.headers.location, url), signal, redirects + 1, requiredOrigin);
  }
  return result;
}

const clean = value => (value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240);
export function inspectHtml(source, headers = {}) {
  const html = source.replace(/<!--[\s\S]*?-->/g, '');
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
  const markup = html.replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  const meta = [...markup.matchAll(/<meta\b[^>]*>/gi)].map(match => attrs(match[0]));
  const links = [...markup.matchAll(/<link\b[^>]*>/gi)].map(match => attrs(match[0]));
  const h1 = [...markup.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1\s*>/gi)].map(match => clean(match[1])).filter(Boolean);
  const indexDirectives = meta.filter(tag => /^(robots|googlebot)$/i.test(tag.name))
    .map(tag => ({agent: tag.name, content: clean(tag.content)}));
  const scriptText = scripts.map(([, attributes, body]) => attributes + '\n' + body).join('\n');
  const jsonLd = scripts.filter(([, attributes]) => attrs(attributes).type?.toLowerCase() === 'application/ld+json');
  let validJsonLd = 0;
  for (const [, , body] of jsonLd) {
    try { if (JSON.parse(body) && /^\s*[{[]/.test(body)) validJsonLd++; } catch {}
  }
  return {
    title: clean(markup.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1]),
    description: clean(meta.find(tag => /^description$/i.test(tag.name))?.content),
    canonical: clean(links.find(tag => /(?:^|\s)canonical(?:\s|$)/i.test(tag.rel))?.href),
    h1: h1.slice(0, 5), h1Count: h1.length,
    visibleCopySample: clean(markup.match(/<body\b[^>]*>([\s\S]*?)<\/body\s*>/i)?.[1]),
    indexDirectives, xRobotsTag: clean(headers['x-robots-tag']),
    jsonLd: {found: jsonLd.length, validJson: validJsonLd},
    verificationMeta: meta.some(tag => /^google-site-verification$/i.test(tag.name) && tag.content?.trim()),
    analytics: {
      ga4Signal: /\bG-[A-Z0-9]{4,}\b/i.test(scriptText) && /gtag|googletagmanager|google-analytics/i.test(scriptText),
      googleTagManager: /googletagmanager\.com\/(?:gtm\.js|ns\.html)\?[^"'\s]*id=GTM-|gtm\.start[\s\S]*?GTM-/i.test(html),
      otherSignals: ['plausible.io/js', 'cdn.usefathom.com', 'cloud.umami.is', 'matomo.js']
        .filter(marker => scriptText.toLowerCase().includes(marker)),
    },
  };
}

const crawlers = ['Googlebot', 'OAI-SearchBot', 'GPTBot', 'Google-Extended', 'Claude-SearchBot', 'ClaudeBot', 'PerplexityBot'];

function matchesRobotsPath(pattern, path) {
  const anchored = pattern.endsWith('$');
  const [prefix, ...parts] = (anchored ? pattern.slice(0, -1) : pattern).split('*');
  if (!path.startsWith(prefix)) return false;
  if (!parts.length) return !anchored || path === prefix;
  const suffix = anchored ? parts.pop() : '';
  if (suffix && !path.endsWith(suffix)) return false;
  const end = path.length - suffix.length;
  let offset = prefix.length;
  for (const part of parts) {
    const index = path.indexOf(part, offset);
    if (index === -1) return false;
    offset = index + part.length;
  }
  return offset <= end;
}

export function inspectRobots(text, path) {
  const groups = [];
  const sitemaps = [];
  let group;
  for (const line of text.split(/\r?\n/)) {
    const [, field, value] = line.split('#', 1)[0].match(/^\s*([\w-]+)\s*:\s*(.*?)\s*$/) || [];
    switch (field?.toLowerCase()) {
      case 'user-agent':
        if (!value) break;
        if (!group || group.hasRules) {
          group = {agents: [], rules: [], hasRules: false};
          groups.push(group);
        }
        group.agents.push(value.toLowerCase());
        break;
      case 'allow':
      case 'disallow':
        if (group) {
          group.hasRules = true;
          if (value.startsWith('/')) group.rules.push({allow: field.toLowerCase() === 'allow', pattern: value});
        }
        break;
      case 'sitemap':
        if (sitemaps.length < 5 && /^https?:\/\//i.test(value)) sitemaps.push(value.slice(0, 500));
    }
  }
  const normalize = value => encodeURI(value).replace(/%25([\da-f]{2})/gi, (_, hex) => {
    const character = String.fromCharCode(parseInt(hex, 16));
    return /[A-Za-z0-9._~-]/.test(character) ? character : '%' + hex.toUpperCase();
  });
  const robotsPath = normalize(path);
  return {sitemaps, crawlers: crawlers.map(agent => {
    const specific = groups.filter(group => group.agents.includes(agent.toLowerCase()));
    const applicable = specific.length ? specific : groups.filter(group => group.agents.includes('*'));
    let match;
    for (const {rules} of applicable) {
      for (const rule of rules) {
        const pattern = normalize(rule.pattern);
        const weight = pattern.replaceAll('*', '').replace(/\$$/, '').replace(/%[\dA-F]{2}/g, '_').length;
        if (matchesRobotsPath(pattern, robotsPath) &&
            (!match || weight > match.weight || (weight === match.weight && rule.allow))) {
          match = {...rule, weight};
        }
      }
    }
    return {agent, status: match?.allow === false ? 'blocked' : 'allowed', rule: match?.pattern ?? null,
      group: specific.length ? 'named' : applicable.length ? 'wildcard' : 'none'};
  })};
}

export async function inspectSitemap(origin, advertised, signal, fetchPage = fetchPublicPage) {
  const candidates = new Set();
  const urls = new Set();
  const sources = [];
  let incomplete = false;
  const fileLimit = 6;

  function sitemapUrl(value) {
    try {
      const url = new URL(value.replaceAll('&amp;', '&'));
      return url.origin === origin && !url.username && !url.password && !url.hash ? url.href : null;
    } catch {
      return null;
    }
  }

  for (const value of advertised) {
    const url = sitemapUrl(value);
    if (url) candidates.add(url);
    else incomplete = true;
  }
  if (!candidates.size) candidates.add(new URL('/sitemap.xml', origin).href);
  const seen = new Set();
  while (candidates.size && seen.size < fileLimit && !signal.aborted) {
    const batch = [...candidates].slice(0, fileLimit - seen.size);
    const results = await Promise.allSettled(batch.map(url => {
      candidates.delete(url);
      seen.add(url);
      return fetchPage(url, signal, 0, origin);
    }));
    for (const result of results) {
      if (result.status === 'rejected' || result.value.status !== 200 || typeof result.value.text !== 'string' ||
          new URL(result.value.url).origin !== origin) {
        incomplete = true;
        continue;
      }
      const xml = result.value.text.replace(/<!--[\s\S]*?-->/g, '').trim();
      const root = xml.match(/^(?:<\?xml[^?]*\?>\s*)?<(urlset|sitemapindex)\b[^>]*>([\s\S]*)<\/\1>$/i);
      if (!root) {
        incomplete = true;
        continue;
      }
      sources.push(result.value.url);
      const index = root[1].toLowerCase() === 'sitemapindex';
      const entries = index ? /<sitemap\b[^>]*>\s*<loc>([^<]+)<\/loc>[\s\S]*?<\/sitemap>/gi
        : /<url\b[^>]*>\s*<loc>([^<]+)<\/loc>[\s\S]*?<\/url>/gi;
      const matches = [...root[2].matchAll(entries)];
      const entryTags = index ? /<sitemap\b/gi : /<url\b/gi;
      if (matches.length !== [...root[2].matchAll(entryTags)].length) incomplete = true;
      for (const [, value] of matches) {
        const url = sitemapUrl(value.trim());
        if (!url) {
          incomplete = true;
          continue;
        }
        if (index) {
          if (!seen.has(url)) candidates.add(url);
        } else {
          urls.add(url);
        }
      }
    }
  }
  return {
    status: !sources.length ? 'unavailable' : incomplete || candidates.size ? 'partial' : 'read',
    urlCount: sources.length ? urls.size : null,
    sources,
  };
}

export async function auditSite(target, parentSignal, fetchPage = fetchPublicPage) {
  const signal = AbortSignal.any([parentSignal, AbortSignal.timeout(9500)]);
  let page;
  try {
    page = await fetchPage(target, signal);
  } catch {
    return {requestedUrl: target, error: 'Could not fetch the public URL within the audit limits.'};
  }
  const result = {requestedUrl: target, inspectedUrl: page.url, httpStatus: page.status};
  if (page.status !== 200 || !/^(text\/html|application\/xhtml\+xml)\b/i.test(page.headers['content-type'] || '')) {
    return {...result, error: 'The URL did not return an HTML page with HTTP 200.'};
  }
  result.page = inspectHtml(page.text, page.headers);
  const url = new URL(page.url);
  const robotsUrl = new URL('/robots.txt', url);
  const origin = url.origin;
  const resolver = new Resolver({timeout: 1200, tries: 1});
  const candidates = additionalPages({url: page.url, links: readLinks(page.text, page.url)}, 4);
  const [robots, dns, sampled] = await Promise.allSettled([
    fetchPage(robotsUrl, signal, 0, origin),
    resolver.resolveTxt(url.hostname),
    Promise.allSettled(candidates.map(candidate => fetchPage(candidate, signal, 0, origin))),
  ]);
  const pages = new Map([[page.url, page]]);
  const statuses = new Map([[page.url, page.status]]);
  for (const [index, response] of (sampled.value || []).entries()) {
    if (response.status !== 'fulfilled') continue;
    const candidate = response.value;
    if (new URL(candidate.url).origin !== origin) continue;
    statuses.set(candidates[index].href, candidate.status);
    statuses.set(candidate.url, candidate.status);
    if (candidate.status === 200 && /^(text\/html|application\/xhtml\+xml)\b/i.test(candidate.headers['content-type'] || '')) {
      pages.set(candidate.url, candidate);
    }
  }
  const homepage = [...pages.values()].find(candidate => {
    const address = new URL(candidate.url);
    return address.pathname === '/' && !address.search;
  });
  result.robots = {url: robotsUrl.href, status: robots.status === 'fulfilled' ? robots.value.status : 'unavailable'};
  if (robots.status === 'fulfilled' && robots.value.status === 200 &&
      /^text\/plain\b/i.test(robots.value.headers['content-type'] || '') && robots.value.text.length <= 500 * 1024) {
    Object.assign(result.robots, inspectRobots(robots.value.text, url.pathname + url.search));
  }
  const pageEvidence = [...pages.values()].map(candidate =>
    readAuditPage(candidate, candidate === page ? result.page : inspectHtml(candidate.text, candidate.headers)));
  [result.sitemap, result.siteReview] = await Promise.all([
    inspectSitemap(origin, result.robots.sitemaps || [], signal, fetchPage),
    summarizeAuditPages(pageEvidence, origin, signal, fetchPage, statuses),
  ]);
  result.searchConsole = {
    verifiedAccountStatus: 'unverified',
    pageMeta: result.page.verificationMeta,
    homepageMeta: homepage ? inspectHtml(homepage.text).verificationMeta : null,
    exactHostnameDnsTxt: dns.status === 'fulfilled' ? dns.value.some(record => /^google-site-verification=/i.test(record.join(''))) : null,
  };
  result.grades = gradeAudit(result);
  return result;
}

function gradeAudit({page, robots}) {
  const searchBot = robots.crawlers?.find(({agent}) => agent === 'Googlebot');
  const aiSearch = robots.crawlers?.filter(({agent}) =>
    ['OAI-SearchBot', 'Claude-SearchBot', 'PerplexityBot'].includes(agent));
  const noindex = [page.xRobotsTag, ...page.indexDirectives.map(({content}) => content)]
    .some(value => /\b(?:noindex|none)\b/i.test(value));
  return {
    pageMetadata: page.title && page.description && page.h1Count === 1 ? 'pass' : 'review',
    canonical: page.canonical ? 'present' : 'review',
    indexabilitySignals: noindex || searchBot?.status === 'blocked' ? 'review'
      : searchBot ? 'pass' : 'unverified',
    structuredData: !page.jsonLd.found ? 'absent'
      : page.jsonLd.found === page.jsonLd.validJson ? 'present' : 'review',
    aiSearchCrawlers: aiSearch ? (aiSearch.every(({status}) => status === 'allowed') ? 'pass' : 'review') : 'unverified',
    searchConsoleRegistration: 'unverified',
    analyticsCode: page.analytics.ga4Signal || page.analytics.otherSignals.length ? 'present'
      : page.analytics.googleTagManager ? 'review' : 'undetected',
    analyticsCollection: 'unverified',
  };
}
