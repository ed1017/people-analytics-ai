// Real application shell, isolated browser storage and synthetic APIs only.
import assert from 'node:assert/strict';
import {encodeDecisions, DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const base = process.env.HOME_BASE_URL ?? 'http://127.0.0.1:3462';
const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', headless: true});
const privateGoal = 'Synthetic private goal never written to a link';
const privateDraft = 'Synthetic unsent question stays in the workspace';
const seed = {
  version: 1, revision: 1,
  goals: {version: 1, activeId: 'private-goal', goals: [{id: 'private-goal', statement: privateGoal}]},
  workspaces: {'private-goal': {savedAt: '2026-10-07T00:00:00Z', fields: {
    chat: {messages: [], input: privateDraft, problem: null, questionUnanswered: false},
    sentinel: {keep: 'Existing saved work'},
  }}},
};
let checks = 0;
const check = (name, value) => {assert.ok(value, name); checks++; console.log('PASS ' + name);};

try {
  for (const [mode, width, height] of [['desktop', 1366, 900], ['mobile', 390, 844]]) {
    const context = await browser.newContext({viewport: {width, height}});
    const page = await context.newPage(), errors = [], external = [], posts = [];
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => errors.push(error.message));
    await context.addInitScript(({key, value}) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, value);
    }, {key: DECISIONS_STORAGE_KEY, value: encodeDecisions(seed)});
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== base) {external.push(url.origin); return route.abort();}
      if (url.pathname.startsWith('/api/')) {
        if (request.method() !== 'GET') {posts.push(url.pathname); return route.fulfill({status: 503, json: {error: 'Synthetic AI unavailable.'}});}
        if (url.pathname === '/api/dashboard') return route.fulfill({json: {
          overview: {headcount: 120, fte: 118, open_positions: 3, snapshot_date: '2026-09-30'},
          trend: [], filter_options: {countries: [{value: 'UK', label: 'United Kingdom'}], business_units: [], levels: []},
        }});
        return route.fulfill({status: 503, json: {error: 'Synthetic source unavailable.'}});
      }
      return route.continue();
    });
    const button = name => page.getByRole('button', {name, exact: true});
    const title = expected => page.locator('#app-page-title').filter({hasText: expected}).waitFor();
    const selected = destination => page.waitForFunction(destination => {
      const node = destination === 'home'
        ? document.querySelector('button[aria-label="Action Planning"]')
        : document.querySelector(`[data-nav-destination="${destination}"]`);
      return node?.getAttribute('aria-current') === 'page';
    }, destination);
    async function navigate(destination) {
      const trigger = button('Open navigation');
      if (await trigger.isVisible()) await trigger.click();
      if (destination === 'home') await button('Action Planning').click();
      else {
        const item = page.locator(`[data-nav-destination="${destination}"]`);
        const groupId = await item.evaluate(node => node.parentElement.id);
        const toggle = page.locator(`button[aria-controls="${groupId}"]`);
        if (await toggle.getAttribute('aria-expanded') === 'false') await toggle.click();
        await item.click();
      }
      await selected(destination);
    }
    function urlIs(destination) {
      const url = new URL(page.url());
      return url.searchParams.get('page') === (destination === 'home' ? null : destination)
        && url.searchParams.get('campaign') === 'fall review'
        && JSON.stringify(url.searchParams.getAll('tag')) === '["a","b"]'
        && url.hash === '#review';
    }

    await page.goto(base + '/?campaign=fall%20review&tag=a&tag=b&page=skills#review');
    await title('Skills Intelligence'); await selected('skills');
    check(mode + ' initial deep link opens the selected destination', urlIs('skills'));
    await page.waitForFunction(() => document.querySelector('select[aria-label="Selected goal"]')?.value === 'private-goal');
    await page.waitForFunction(() => document.querySelector('select[aria-label="Country"] option[value="UK"]'));
    const country = page.getByLabel('Country', {exact: true});
    if (!await country.isVisible()) await page.locator('.workforce-filter-disclosure summary').click();
    await country.selectOption('UK');
    await page.getByLabel('Select persona', {exact: true}).selectOption('Finance');
    const initialHistory = await page.evaluate(() => {window.__navigationShell = document.querySelector('main'); return history.length;});
    await navigate('skills'); await navigate('skills');
    check(mode + ' repeated page clicks add no duplicate history', await page.evaluate(() => history.length) === initialHistory);

    await navigate('decision-brief'); await title('Decision brief');
    check(mode + ' navigation writes a shareable destination', urlIs('decision-brief'));
    await navigate('assess-evaluate'); await title('Assess & Evaluate');
    for (const [direction, destination] of [['back', 'decision-brief'], ['back', 'skills'], ['forward', 'decision-brief'], ['forward', 'assess-evaluate']]) {
      if (direction === 'back') await page.goBack(); else await page.goForward();
      await selected(destination);
      check(mode + ' browser ' + direction + ' opens ' + destination, urlIs(destination));
    }
    await navigate('home'); await title('Insight to Action');
    check(mode + ' Home keeps other query parameters and anchors', urlIs('home'));
    check(mode + ' shared filters, perspective, selected goal and draft survive history navigation',
      await country.inputValue() === 'UK'
      && await page.getByLabel('Select persona', {exact: true}).inputValue() === 'Finance'
      && await page.getByLabel('Selected goal', {exact: true}).inputValue() === 'private-goal'
      && await page.getByLabel('Ask Workforce AI', {exact: true}).inputValue() === privateDraft);
    await navigate('scenario-modeling'); await title('Scenario Modeling');
    await button('Open Position & Workforce Design').click(); await selected('position-workforce-design');
    check(mode + ' internal Planning navigation updates the destination URL', urlIs('position-workforce-design'));
    await page.goBack(); await selected('scenario-modeling');
    check(mode + ' Back restores the Planning view', urlIs('scenario-modeling'));
    check(mode + ' query navigation keeps the same mounted app shell', await page.evaluate(() => window.__navigationShell === document.querySelector('main')));
    check(mode + ' URLs and browser history contain no private workspace content',
      !decodeURIComponent(page.url()).includes(privateGoal)
      && !decodeURIComponent(page.url()).includes(privateDraft)
      && !JSON.stringify(await page.evaluate(() => history.state)).includes(privateGoal));
    await page.reload(); await title('Scenario Modeling'); await selected('scenario-modeling');
    check(mode + ' reloading a deep link restores its page and saved goal', urlIs('scenario-modeling') && await page.getByLabel('Selected goal', {exact: true}).inputValue() === 'private-goal');

    if (mode === 'desktop') {
      for (const [query, destination, expectedTitle] of [
        ['page=overview', 'workforce', 'Workforce'],
        ['page=career-mobility', 'workforce', 'Workforce'],
        ['page=workforce-planning', 'planning-overview', 'Planning Overview'],
        ['page=__proto__', 'home', 'Insight to Action'],
        ['page=javascript%3Aalert%281%29', 'home', 'Insight to Action'],
        ['page=skills&page=finance', 'home', 'Insight to Action'],
        ['page=home', 'home', 'Insight to Action'],
      ]) {
        await page.goto(base + '/?campaign=fall%20review&tag=a&tag=b&' + query + '#review');
        await title(expectedTitle); await selected(destination);
        check('initial ' + query + ' safely normalizes to ' + destination, urlIs(destination));
      }
    }
    const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).payload, DECISIONS_STORAGE_KEY);
    check(mode + ' unrelated saved work is preserved', saved.workspaces['private-goal'].fields.sentinel.keep === 'Existing saved work');
    check(mode + ' navigation does not submit chat or reach external services', posts.length === 0 && external.length === 0);
    check(mode + ' local navigation has no runtime or hydration errors', errors.length === 0);
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(JSON.stringify({checks, transport: 'synthetic local only'}));
