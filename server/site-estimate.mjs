import {estimate} from '../content/estimator.mjs';
import {attrs, auditTarget, fetchPublicPage, inspectHtml} from './site-audit.mjs';

const estimateIntent = /\b(?:estimat\w*|quot(?:e|es|ing)|pric(?:e|es|ing)|cost\w*|budget|charg(?:e|es)|rebuild|replicat\w*|recreat\w*|redesign|build (?:a |me a |something )?(?:similar|like|this)|site like)\b/i;
const relevantPage = /\b(?:menu|specials|order|book|reservations?|services?|products?|shop|contact|about|locations?|appointments?)\b/i;
const featurePatterns = {
  menu: /\b(?:food menu|drink menu|dinner menu|lunch menu|breakfast menu|restaurant menu|menu and specials)\b/i,
  specials: /\b(?:daily specials|weekly specials|today[’']s specials|happy hour|menu and specials)\b/i,
  booking: /\b(?:book now|book (?:an? |your )?(?:appointment|table|reservation)|reservations?|reserve (?:a|your) table|schedule (?:an?|your) appointment)\b/i,
  ordering: /\b(?:order online|online ordering|order (?:pickup|delivery)|takeout|pickup and delivery)\b/i,
  store: /\b(?:add to cart|shopping cart|shop all|product catalog)\b/i,
  account: /\b(?:client portal|member login|account login|customer portal)\b/i,
};

export function siteEstimateTarget(messages) {
  const latest = messages.at(-1).content;
  const previousRequest = messages.slice(0, -1).findLast(message => message.role === 'user')?.content || '';
  if (estimateIntent.test(latest)) {
    const current = auditTarget(latest);
    if (current) return current;
    // Resolve a follow-up request such as “What would that cost?” from a recent URL.
    if (/\b(?:it|that|this|same|similar)\b/i.test(latest)) return auditTarget(previousRequest);
  }
  if (estimateIntent.test(previousRequest) && !auditTarget(previousRequest) &&
      !/\b(?:audit|review|inspect)\b/i.test(latest)) return auditTarget(latest);
}

function webUrl(value, base) {
  if (!value || value.startsWith('#') || value.length > 1000) return null;
  try {
    const url = new URL(value.replaceAll('&amp;', '&'), base);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url : null;
  } catch {
    return null;
  }
}

function inspectSitePage(page) {
  const markup = page.text.replace(/<!--[\s\S]*?-->|<(script|style|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  const links = [...markup.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi)].map(([, attributes, text]) => ({
    url: webUrl(attrs(attributes).href, page.url),
    text: text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120),
  })).filter(link => link.url);
  const headings = [...markup.matchAll(/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]\s*>/gi)]
    .slice(0, 12).map(match => match[1].replace(/<[^>]*>/g, ' ').trim().slice(0, 120));
  const pageInfo = inspectHtml(page.text, page.headers);
  const pathname = new URL(page.url).pathname;
  const keywords = [pathname.replace(/[-_/]+/g, ' '), pageInfo.title, ...headings, ...links.map(link => link.text)].join(' ');
  const features = Object.entries(featurePatterns).filter(([, pattern]) => pattern.test(keywords)).map(([name]) => name);
  if (/\/(?:menus?|food-menu|drinks-menu)(?:\/|$)/i.test(pathname) ||
      headings.some(heading => /^(?:our |food |dinner |lunch )?menus?$/i.test(heading))) features.push('menu');
  if (/<form\b/i.test(markup)) features.push('form');

  const vendors = [];
  const provider = url => {
    if (!url) return;
    const hosts = [
      ['Square', /(?:^|\.)(?:squareup\.com|square\.site|square\.link)$/i],
      ['Calendly', /(?:^|\.)calendly\.com$/i],
      ['OpenTable', /(?:^|\.)opentable\.com$/i],
      ['Resy', /(?:^|\.)resy\.com$/i],
      ['Toast', /(?:^|\.)toasttab\.com$/i],
    ];
    return hosts.find(([, pattern]) => pattern.test(url.hostname))?.[0];
  };
  for (const link of links) {
    const name = provider(link.url);
    if (name) vendors.push({name, placement: 'link'});
  }
  for (const [, attributes] of markup.matchAll(/<iframe\b([^>]*)>/gi)) {
    const name = provider(webUrl(attrs(attributes).src, page.url));
    if (name) vendors.push({name, placement: 'embed'});
  }
  for (const [, attributes] of page.text.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<[^>]*\bdata-url\s*=[^>]*>/gi)) {
    const name = provider(webUrl(attrs(attributes)['data-url'], page.url));
    if (name) vendors.push({name, placement: 'widget signal'});
  }
  return {url: page.url, title: pageInfo.title, features: [...new Set(features)],
    vendors: [...new Map(vendors.map(item => [item.name + item.placement, item])).values()].slice(0, 8), links};
}

function additionalPages(seed) {
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
    if (url.origin !== base.origin || url.search || url.username || url.password ||
        /\.(?:pdf|zip|png|jpe?g|webp|svg|docx?|xlsx?)$/i.test(url.pathname) ||
        !relevantPage.test(text + ' ' + url.pathname.replace(/[-_]+/g, ' '))) continue;
    const key = cleanUrl(url);
    if (visited.has(key)) continue;
    visited.add(key);
    const priority = /\b(?:menu|specials|order|book|reservations?|shop)\b/i.test(text + ' ' + url.pathname.replace(/[-_]+/g, ' ')) ? 0 : 1;
    url.hash = '';
    candidates.push({url, priority});
  }
  return candidates.sort((a, b) => a.priority - b.priority).slice(0, 3).map(candidate => candidate.url);
}

function estimateOptions(catalog, pages, request) {
  const has = feature => pages.some(page => page.features.includes(feature));
  const restaurant = has('menu') || has('specials') || (/\brestaurant\b/i.test(request) && has('ordering'));
  const editing = /\b(?:editable|edit (?:the|our|my) (?:menu|specials|content)|update (?:the|our|my) (?:menu|specials)|manage (?:the|our|my) menu)\b/i.test(request);
  const embed = pages.some(page => page.vendors.some(vendor => vendor.placement !== 'link')) ||
    /\b(?:embed|widget)\b/i.test(request);
  const routes = ['essential', ...(restaurant ? ['restaurant_essentials'] : [])];
  const option = (name, ids, assumption) => {
    const {lines, setup, monthly, annual} = estimate(catalog, ids.map(id => ({id, quantity: 1})));
    return {name, assumption, lines: lines.map(({name, setup, monthly, annual}) => ({name, setup, monthly, annual})),
      totals: {setup, monthly, annual}};
  };
  const options = [option('Essential website', routes,
    'Up to five pages using supplied content. Standard links to existing services can be included. Scope for unseen pages and functionality is open.')];
  if (restaurant || editing) options.push(option('Essential with one staff-editable section', [...routes, 'editable_section'],
    'One structured section and one staff login. Existing editing capability could not be confirmed from public pages.'));
  if (embed) options.push(option(editing ? 'Editable website with one existing-tool embed' : 'Essential with one existing-tool embed',
    [...routes, ...(editing ? ['editable_section'] : []), 'existing_embed'],
    'One standard compatible embed. Customer retains an active vendor account and pays that vendor directly.'));
  const scopeQuestions = [];
  if (restaurant) scopeQuestions.push('Do staff need to edit the menu and specials, and can those share one section?');
  if (has('ordering') || has('booking') || pages.some(page => page.vendors.length)) {
    scopeQuestions.push('Keep an ordinary link, reuse an existing vendor widget, or source a tool or sync with a POS?');
  }
  if (has('store') || has('account')) scopeQuestions.push('Confirm checkout or login functionality and integrations before pricing a faithful rebuild.');
  if (has('form')) scopeQuestions.push('Confirm whether the form is a standard inquiry or needs conditional fields, uploads, or routing.');
  return {options, scopeQuestions};
}

function isHtml(page) {
  return page.status === 200 && /^(text\/html|application\/xhtml\+xml)\b/i.test(page.headers['content-type'] || '');
}

export async function inspectSiteForEstimate(target, request, catalog, parentSignal, fetchPage = fetchPublicPage) {
  const signal = AbortSignal.any([parentSignal, AbortSignal.timeout(9500)]);
  let seed;
  try {
    const page = await fetchPage(target, signal);
    if (!isHtml(page)) return {requestedUrl: target, httpStatus: page.status, error: 'The URL did not return a public HTML page.'};
    seed = inspectSitePage(page);
  } catch {
    return {requestedUrl: target, error: 'Could not fetch the public URL within the estimate limits.'};
  }
  const candidates = additionalPages(seed);
  const origin = new URL(seed.url).origin;
  const secondary = await Promise.allSettled(candidates.map(async url => {
    const page = await fetchPage(url, signal, 0, origin);
    if (!isHtml(page) || new URL(page.url).origin !== origin) throw Error('Page unavailable for inspection.');
    return inspectSitePage(page);
  }));
  const inspected = new Map([[seed.url, seed]]);
  for (const result of secondary) {
    if (result.status === 'fulfilled') inspected.set(result.value.url, result.value);
  }
  const pages = [...inspected.values()].map(({links, ...page}) => page);
  return {requestedUrl: target, pages, unavailablePages: candidates.filter((_, index) => secondary[index].status === 'rejected').map(url => url.href),
    ...estimateOptions(catalog, pages, request)};
}
