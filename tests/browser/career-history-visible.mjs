// Run against the local production shell. All API responses are synthetic and intercepted.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {career} from '../fixtures/theme-audit-data.mjs';
import {buildCareerGrowthMobilityAggregate} from '../../lib/career-growth-mobility.ts';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const base = process.env.HOME_BASE_URL ?? 'http://127.0.0.1:3199';
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'career-history-visible-'));
const browser = await chromium.launch({executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox']});
const empty = buildCareerGrowthMobilityAggregate([], [], []);
let checks = 0;
const check = (name, result) => {assert.ok(result, name); checks++; console.log('PASS ' + name);};

try {
  for (const [device, width] of [['desktop', 1366], ['mobile', 390]]) {
    for (const palette of ['light', 'slate-blue']) {
      const name = device + ' ' + palette;
      const context = await browser.newContext({viewport: {width, height: 900}, isMobile: width < 600, hasTouch: width < 600});
      const page = await context.newPage(), errors = [], movementRequests = [];
      let posts = 0, external = 0, mode = 'loaded', hold = false;
      const releases = [];
      page.setDefaultTimeout(15000);
      page.on('pageerror', error => errors.push(error.message));
      await context.addInitScript(value => localStorage.setItem('people-analytics-workspace-palette-v1', value), palette);
      await page.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        if (url.origin !== base) {external++; return route.abort();}
        if (!url.pathname.startsWith('/api/')) return route.continue();
        if (request.method() !== 'GET') {posts++; return route.fulfill({status: 503, json: {error: 'Model work is disabled in this fixture.'}});}
        if (url.pathname === '/api/dashboard') return route.fulfill({json: {
          overview: {headcount: 100, fte: 95, open_positions: 2, snapshot_date: '2026-09-30'}, trend: [],
          filter_options: {countries: [{value: 'CA', label: 'Canada'}], business_units: [], levels: []},
        }});
        if (url.pathname === '/api/career-growth-mobility') {
          movementRequests.push(url.search);
          if (hold) await new Promise(resolve => releases.push(resolve));
          return route.fulfill({status: mode === 'error' ? 503 : 200, json: mode === 'error'
            ? {error: 'Synthetic movement history unavailable.'} : mode === 'empty' ? empty : career});
        }
        return route.fulfill({status: 503, json: {error: 'Synthetic source unavailable.'}});
      });
      const button = text => page.getByRole('button', {name: text, exact: true});
      const history = page.getByRole('region', {name: 'Recorded movement history · company-wide context', exact: true});
      const heading = history.getByRole('heading', {name: 'Recorded movement history · company-wide context', exact: true});
      const navigate = async destination => {
        if (await button('Open navigation').isVisible()) await button('Open navigation').click();
        if (destination === 'home') return button('Action Planning').click();
        const target = page.locator('[data-nav-destination="' + destination + '"]');
        if (!await target.isVisible()) await target.locator('xpath=ancestor::section[1]').getByRole('button').first().click();
        await target.click();
      };
      const visibleHistory = async state => {
        await heading.waitFor();
        check(name + ' ' + state + ' history is visible without a disclosure', await history.isVisible()
          && await history.locator('summary, details').count() === 0
          && await history.evaluate(element => !element.closest('details, [hidden]')));
        await heading.click();
        check(name + ' ' + state + ' clicking the heading cannot collapse history', await history.isVisible()
          && await history.getByText(/Descriptive recorded promotions/).isVisible());
        check(name + ' ' + state + ' has no page overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      };

      await page.goto(base);
      const intro = page.getByRole('button', {name: /^(Show|Hide) instructions$/});
      await intro.waitFor();
      check(name + ' applies the requested palette', await page.locator('html').getAttribute('data-workspace-preference') === palette);
      check(name + ' intro starts collapsed', await intro.getAttribute('aria-expanded') === 'false');
      await intro.focus(); await page.keyboard.press('Enter');
      check(name + ' intro still expands by keyboard', await intro.getAttribute('aria-expanded') === 'true'
        && await page.getByRole('heading', {name: 'From question to action', exact: true}).isVisible());
      await intro.focus(); await page.keyboard.press('Space');
      check(name + ' intro still collapses by keyboard', await intro.getAttribute('aria-expanded') === 'false'
        && !await page.getByRole('heading', {name: 'From question to action', exact: true}).isVisible());
      const country = page.getByLabel('Country', {exact: true});
      if (!await country.isVisible()) await page.locator('.workforce-filter-disclosure > summary').click();
      await country.selectOption('CA');
      hold = true;
      await navigate('career-growth-mobility');
      await history.getByText('Loading recorded movement…', {exact: true}).waitFor();
      await visibleHistory('loading');
      check(name + ' loading does not claim no recorded events', await history.getByText(/No recorded movement events were returned/).count() === 0);
      assert.ok(releases.length, 'Career request reached the synthetic fixture');
      hold = false; releases.forEach(resolve => resolve());
      await history.getByText('Recorded Movement Events', {exact: true}).waitFor();
      await visibleHistory('loaded');
      check(name + ' recorded count, chart, scope and limitations remain visible', await history.getByText('100', {exact: true}).isVisible()
        && await history.getByRole('heading', {name: 'Monthly Recorded Movement', exact: true}).isVisible()
        && await history.getByText('Evidence scope: Company recorded movement events', {exact: true}).isVisible()
        && await history.getByText('Source coverage & limitations', {exact: true}).isVisible());
      check(name + ' Canada selection cannot narrow company-wide history', movementRequests.every(query => query === '')
        && await history.getByText(/Selected business context: Canada/).isVisible()
        && await history.getByText(/These dashboard selections do not narrow these recorded movement events/).isVisible());
      await page.screenshot({path: path.join(output, device + '-' + palette + '-loaded.png'), fullPage: true});
      await navigate('home');
      check(name + ' return to Home preserves the independent intro control', await intro.getAttribute('aria-expanded') === 'false');
      await navigate('career-growth-mobility');
      await history.getByText('Recorded Movement Events', {exact: true}).waitFor();
      check(name + ' navigation keeps recorded history visible with its company-wide scope', await history.getByText('Recorded Movement Events', {exact: true}).isVisible()
        && await history.getByText('Evidence scope: Company recorded movement events', {exact: true}).isVisible()
        && movementRequests.every(query => query === ''));

      for (const state of ['error', 'empty']) {
        mode = state;
        await page.reload();
        await intro.waitFor();
        await navigate('career-growth-mobility');
        await history.getByText(state === 'error' ? 'Synthetic movement history unavailable.' : 'No recorded movement events were returned.', {exact: true}).waitFor();
        await visibleHistory(state);
        check(name + ' ' + state + ' withholds populated movement metrics', await history.getByText('Recorded Movement Events', {exact: true}).count() === 0);
        if (state === 'error') check(name + ' error is distinct from empty', await history.getByText(/No recorded movement events were returned/).count() === 0);
        else check(name + ' empty source retains company scope and zero events', await history.getByText('Evidence scope: Company recorded movement events', {exact: true}).isVisible()
          && await history.getByText('0 recorded movement events', {exact: true}).isVisible());
        await page.screenshot({path: path.join(output, device + '-' + palette + '-' + state + '.png'), fullPage: true});
      }
      check(name + ' no remote APIs, mutations or runtime errors', external === 0 && posts === 0 && errors.length === 0);
      await context.close();
    }
  }
} finally {await browser.close();}
console.log(JSON.stringify({checks, output}));
