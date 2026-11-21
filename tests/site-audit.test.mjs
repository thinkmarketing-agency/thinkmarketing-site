import test from 'node:test';
import assert from 'node:assert/strict';
import {auditTarget, auditSite, fetchPublicPage, inspectRobots} from '../server/site-audit.mjs';

test('accepts an explicit URL or a bare website address', () => {
  assert.equal(auditTarget('Audit https://example.org/services?q=1 please'), 'https://example.org/services?q=1');
  assert.equal(auditTarget('example.org/services'), 'https://example.org/services');
  assert.equal(auditTarget('Please audit my website.'), undefined);
});

test('rejects non-public destination forms before making a request', async () => {
  const signal = new AbortController().signal;
  for (const url of ['https://127.0.0.1/', 'http://[::1]/', 'https://example.org:8080/',
    'http://example.local/', 'https://user@example.org/', 'file:///tmp/example']) {
    await assert.rejects(fetchPublicPage(url, signal), /public HTTP or HTTPS hostname/);
  }
});

test('evaluates named and wildcard robots groups, most specific rules and end anchors', () => {
  const rules = 'User-agent: *\nDisallow: /\nUser-agent: OAI-SearchBot\nDisallow: /services\nAllow: /services/*/public$\nSitemap: https://example.org/sitemap.xml';
  const status = (path, agent) => inspectRobots(rules, path).crawlers.find(crawler => crawler.agent === agent).status;
  assert.equal(status('/services/seo/public', 'OAI-SearchBot'), 'allowed');
  assert.equal(status('/services/seo/public?x=1', 'OAI-SearchBot'), 'blocked');
  assert.equal(status('/services/seo/public', 'GPTBot'), 'blocked');
  assert.deepEqual(inspectRobots(rules, '/').sitemaps, ['https://example.org/sitemap.xml']);
});

test('grades observed page evidence while leaving private account and collection status unverified', async () => {
  const responses = new Map([
    ['/services', {headers: {'content-type': 'text/html', 'x-robots-tag': 'noindex'}, text:
      '<title>Services</title><meta content="Local help" name="description"><link rel="canonical" href="/services"><h1>Services</h1><script type="application/ld+json">{"@type":"Service"}</script><script src="https://www.googletagmanager.com/gtm.js?id=GTM-1234"></script>'}],
    ['/', {headers: {'content-type': 'text/html'}, text: '<meta name="google-site-verification" content="hidden-token">'}],
    ['/robots.txt', {headers: {'content-type': 'text/plain'}, text: 'User-agent: GPTBot\nDisallow: /'}],
  ]);
  const result = await auditSite('https://example.invalid/services', AbortSignal.timeout(2000), async address => {
    const url = new URL(address);
    return {url: url.href, status: 200, ...responses.get(url.pathname)};
  });
  assert.equal(result.searchConsole.homepageMeta, true);
  assert.equal(result.grades.searchConsoleRegistration, 'unverified');
  assert.equal(result.grades.pageMetadata, 'pass');
  assert.equal(result.grades.indexabilitySignals, 'review');
  assert.equal(result.grades.structuredData, 'present');
  assert.equal(result.grades.aiSearchCrawlers, 'pass');
  assert.equal(result.grades.analyticsCode, 'review');
  assert.equal(result.grades.analyticsCollection, 'unverified');
  assert.doesNotMatch(JSON.stringify(result), /hidden-token/);
});

test('samples linked pages and records cross-page SEO, dead booking links, and business details', async () => {
  const origin = 'https://example.invalid';
  const fixtures = {
    '/': ['text/html', '<title>Example</title><h1>Home</h1><a href="/services">Services</a><a href="/contact">Contact</a><a href="/start">Book now</a><a href="https://booking.example.net/app">Reserve</a><a href="tel:+15415550100">Call</a>'],
    '/services': ['text/html', '<title>Example</title><form></form>'],
    '/contact': ['text/html', '<title>Contact</title><script type="application/ld+json">{"telephone":"541-555-0199","address":{"addressLocality":"Bend"},"openingHours":"Mo 09:00-17:00","areaServed":{"name":"Central Oregon"}}</script>'],
    '/robots.txt': ['text/plain', 'User-agent: *\nAllow: /'],
    '/sitemap.xml': ['application/xml', '<urlset><url><loc>https://example.invalid/</loc></url></urlset>'],
  };
  const calls = [];
  const result = await auditSite(origin, AbortSignal.timeout(2500), async (address, signal, redirects, allowedOrigin) => {
    const url = new URL(address);
    calls.push(url.href);
    if (url.pathname !== '/') assert.equal(allowedOrigin, origin);
    const fixture = fixtures[url.pathname];
    return {url: url.href, status: fixture ? 200 : 404, headers: {'content-type': fixture?.[0]}, text: fixture?.[1] || ''};
  });
  assert.equal(result.siteReview.pages.length, 3);
  assert.deepEqual(result.siteReview.duplicateTitles[0].urls, [origin+'/', origin+'/services']);
  assert.equal(result.siteReview.pages.find(page => page.url.endsWith('/services')).h1Count, 0);
  const home = result.siteReview.pages[0];
  assert.equal(home.actions.find(action => action.destination === origin+'/start').httpStatus, 404);
  assert.equal(home.actions.find(action => action.placement === 'external link').httpStatus, undefined);
  assert.equal(calls.some(url => url.includes('booking.example.net')), false);
  assert.equal(result.siteReview.multiplePhoneNumbersObserved, true);
  const contact = result.siteReview.pages.find(page => page.url.endsWith('/contact'));
  assert.deepEqual(contact.business.structuredAddresses, ['Bend']);
  assert.deepEqual(contact.business.serviceAreas, ['Central Oregon']);
  assert.equal(result.sitemap.urlCount, 1);
});
