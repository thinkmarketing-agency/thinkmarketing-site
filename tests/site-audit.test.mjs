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
