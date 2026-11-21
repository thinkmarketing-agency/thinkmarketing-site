import test from 'node:test';
import assert from 'node:assert/strict';
import {pricingCatalog} from '../server/jasper.mjs';
import {inspectSiteForEstimate, siteEstimateTarget} from '../server/site-estimate.mjs';

test('routes a priced URL or a URL supplied after the estimate prompt', () => {
  const user = content => ({role: 'user', content});
  assert.equal(siteEstimateTarget([user('What would it cost to rebuild https://example.org?')]), 'https://example.org');
  assert.equal(siteEstimateTarget([user('Estimate a similar website'), user('example.org')]), 'https://example.org');
  assert.equal(siteEstimateTarget([user('example.org'), user('What would that cost?')]), 'https://example.org');
  assert.equal(siteEstimateTarget([user('Audit example.org')]), undefined);
});

test('samples relevant pages and prices the restaurant and existing-widget options from catalog', async () => {
  const fixtures = {
    '/': '<title>Sample restaurant</title><a href="/menu#food">Menu</a><a href="/contact">Contact</a><a href="/book">Reservations</a><a href="https://orders.square.site/example">Order online</a>',
    '/menu': '<h1>Menu</h1><h2>Daily specials</h2>',
    '/book': '<h1>Reservations</h1><iframe src="https://www.opentable.com/widget/example"></iframe>',
    '/contact': '<h1>Contact</h1><form></form>',
  };
  const fetched = [];
  const signal = new AbortController().signal;
  const result = await inspectSiteForEstimate('https://example.org/', 'We need an editable menu', pricingCatalog(), signal,
    async (url, _, redirects, origin) => {
      url = new URL(url);
      fetched.push(url.href);
      if (url.pathname !== '/') assert.equal(origin, 'https://example.org');
      return {url: url.href, status: 200, headers: {'content-type': 'text/html'}, text: fixtures[url.pathname]};
    });
  assert.equal(result.pages.length, 4);
  assert.equal(fetched.some(url => url.includes('square.site')), false);
  assert.deepEqual(result.pages[0].vendors, [{name: 'Square', placement: 'link'}]);
  assert.deepEqual(result.pages.find(page => page.url.endsWith('/book')).vendors, [{name: 'OpenTable', placement: 'embed'}]);
  assert.deepEqual(result.options.map(({totals}) => [totals.setup, totals.monthly]), [[1995, 50], [2445, 75], [2520, 75]]);
  assert.ok(result.scopeQuestions.some(question => question.includes('POS')));
});

test('does not price an unreachable URL and omits pages redirected to another origin', async () => {
  const signal = new AbortController().signal;
  const catalog = pricingCatalog();
  const target = 'https://example.org';
  const unreachable = await inspectSiteForEstimate(target, '', catalog, signal, async () => { throw Error('unreachable'); });
  assert.ok(unreachable.error);
  assert.equal(unreachable.options, undefined);
  const redirect = await inspectSiteForEstimate(target, '', catalog, signal, async url => ({
    url: typeof url === 'string' ? target + '/' : 'https://other.example/about',
    status: 200,
    headers: {'content-type': 'text/html'},
    text: '<a href="/about">About</a>',
  }));
  assert.deepEqual(redirect.pages.map(page => page.url), [target + '/']);
  assert.deepEqual(redirect.unavailablePages, [target + '/about']);
});
