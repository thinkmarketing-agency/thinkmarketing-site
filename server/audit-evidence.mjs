import {attrs, readLinks} from './site-links.mjs';

const actionTypes = [
  ['booking', /\b(?:book|schedule|reserve|reservations?)\b/i],
  ['ordering', /\b(?:order|takeout|delivery)\b/i],
  ['quote', /\b(?:quote|estimate)\b/i],
  ['contact', /\b(?:contact|inquire|enquire|get in touch)\b/i],
];

function publicLink(url) {
  const clean = new URL(url);
  clean.search = '';
  clean.hash = '';
  return clean.href;
}

export function readAuditPage(page, metadata) {
  const links = readLinks(page.text, page.url);
  const origin = new URL(page.url).origin;
  const actions = new Map();
  const phones = new Set();
  for (const {href, url, text} of links) {
    const phone = href.match(/^tel:([+\d(). -]+)/i)?.[1];
    if (phone) phones.add(phone.replace(/[^\d+]/g, ''));
    const kind = phone ? 'call' : /^mailto:/i.test(href) ? 'email' : actionTypes.find(([, re]) => re.test(text))?.[0];
    if (!kind || (!url && !['call', 'email'].includes(kind))) continue;
    const destination = url ? publicLink(url) : phone ? 'tel:' + phone : 'Email link';
    const placement = url ? (url.origin === origin ? 'same-site link' : 'external link') : 'contact link';
    const canCheck = url?.origin === origin && !url.search && !url.hash &&
      !/\.(?:pdf|zip|png|jpe?g|docx?|xlsx?)$/i.test(url.pathname);
    actions.set(kind + destination, {kind, label: text || kind, destination, placement, canCheck: !!canCheck});
  }

  const address = [];
  const hours = [];
  const serviceAreas = [];
  const markup = page.text.replace(/<!--[\s\S]*?-->/g, '');
  const scripts = markup.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi);
  for (const [, attributes, content] of scripts) {
    if (attrs(attributes).type?.toLowerCase() !== 'application/ld+json') continue;
    let data;
    try { data = JSON.parse(content); } catch { continue; }
    const items = [...(Array.isArray(data) ? data : [data]), ...(Array.isArray(data?.['@graph']) ? data['@graph'] : [])];
    for (const node of items.slice(0, 40)) {
      if (!node || typeof node !== 'object') continue;
      const schemaPhone = typeof node.telephone === 'string' ? node.telephone.replace(/[^\d+]/g, '') : '';
      if (schemaPhone.length >= 7 && schemaPhone.length <= 18) phones.add(schemaPhone);
      const location = node.address;
      if (location && !Array.isArray(location)) {
        const value = typeof location === 'string' ? location : [location.streetAddress, location.addressLocality, location.addressRegion, location.postalCode]
          .filter(part => typeof part === 'string').join(', ');
        if (value) address.push(value.slice(0, 160));
      }
      const areas = Array.isArray(node.areaServed) ? node.areaServed : [node.areaServed];
      for (const entry of areas.slice(0, 8)) {
        const name = typeof entry === 'string' ? entry : entry?.name;
        if (typeof name === 'string' && name.trim()) serviceAreas.push(name.trim().slice(0, 120));
      }
      const hoursValues = Array.isArray(node.openingHours) ? node.openingHours : [node.openingHours];
      for (const value of hoursValues) {
        if (typeof value === 'string') hours.push(value.slice(0, 120));
      }
      const detailedHours = Array.isArray(node.openingHoursSpecification) ? node.openingHoursSpecification : [node.openingHoursSpecification];
      for (const entry of detailedHours.slice(0, 14)) {
        if (typeof entry?.opens === 'string' && typeof entry?.closes === 'string') {
          const days = Array.isArray(entry.dayOfWeek) ? entry.dayOfWeek : [entry.dayOfWeek];
          const names = days.filter(day => typeof day === 'string').join(', ');
          if (names) hours.push(`${names} ${entry.opens}–${entry.closes}`.slice(0, 120));
        }
      }
    }
  }
  return {
    url: publicLink(page.url), title: metadata.title, h1: metadata.h1.slice(0, 2), h1Count: metadata.h1Count,
    descriptionPresent: !!metadata.description, canonical: metadata.canonical,
    indexDirectives: metadata.indexDirectives, xRobotsTag: metadata.xRobotsTag,
    actions: [...actions.values()].slice(0, 8),
    formPresent: /<form\b/i.test(markup.replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')),
    business: {phones: [...phones].slice(0, 5), structuredAddresses: [...new Set(address)].slice(0, 3), structuredHours: [...new Set(hours)].slice(0, 8), serviceAreas: [...new Set(serviceAreas)].slice(0, 8)},
  };
}

export async function summarizeAuditPages(pages, origin, signal, fetchPage, knownResponses) {
  const targets = new Set();
  for (const page of pages) {
    for (const action of page.actions) {
      if (action.canCheck && !knownResponses.has(action.destination)) targets.add(action.destination);
    }
  }
  await Promise.all([...targets].slice(0, 3).map(async url => {
    try {
      const response = await fetchPage(url, signal, 0, origin);
      if (new URL(response.url).origin === origin) knownResponses.set(url, response.status);
    } catch {
      // A timeout or blocked redirect leaves the destination unverified.
    }
  }));
  for (const page of pages) {
    page.actions = page.actions.map(({canCheck, ...action}) => ({
      ...action,
      ...(canCheck && knownResponses.has(action.destination) ? {httpStatus: knownResponses.get(action.destination)} : {}),
    }));
  }

  const titles = new Map();
  for (const {title, url} of pages) {
    if (!title) continue;
    const key = title.trim().toLowerCase();
    if (!titles.has(key)) titles.set(key, {title, urls: []});
    titles.get(key).urls.push(url);
  }
  const duplicateTitles = [...titles.values()].filter(group => group.urls.length > 1);
  const phoneKey = number => number.replace(/^\+?1(?=\d{10}$)/, '');
  const businessPhones = new Set(pages.flatMap(page => page.business.phones.map(phoneKey)));
  return {pages, duplicateTitles, multiplePhoneNumbersObserved: businessPhones.size > 1};
}
