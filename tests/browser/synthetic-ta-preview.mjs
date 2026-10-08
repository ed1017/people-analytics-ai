import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const base = process.env.TA_PREVIEW_BASE_URL ?? 'http://localhost:3231';
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const directory = '/tmp/synthetic-ta-preview'; await fs.mkdir(directory, { recursive: true });
let checks = 0;
const check = (label, value) => { assert(value, label); checks++; };
try {
  for (const [name, width, height] of [['desktop', 1366, 900], ['mobile', 390, 844], ['small-mobile', 320, 740], ['zoom', 683, 450]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage(), errors = [], external = [], apiRequests = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => {
      const url = route.request().url();
      if (new URL(url).pathname.startsWith('/api/')) apiRequests.push(url);
      if (!url.startsWith(base)) { external.push(url); return route.abort(); }
      return route.continue();
    });
    await page.goto(base + '/local-preview/talent-acquisition');
    await page.getByRole('heading', { name: 'Active requisitions at month-end' }).waitFor();
    const details = page.locator('details'), summary = details.locator('summary');
    check(name + ' one closed disclosure', await details.count() === 1 && !await details.evaluate(n => n.open));
    check(name + ' no page overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    check(name + ' compact chart', await page.getByRole('group', { name: 'Requisition counts by month' }).evaluate(n => n.getBoundingClientRect().height) === 214);
    check(name + ' six funnel stages', await page.getByRole('list', { name: 'Cumulative recruiting stages' }).locator('li').count() === 6);
    check(name + ' funnel shapes', await page.locator('polygon').count() === 6);
    check(name + ' legend identifies forecasts', await page.getByLabel('Chart legend').innerText().then(t => ['Last count forecast', 'Recent mean (3) forecast', 'Damped change forecast'].every(s => t.includes(s))));
    for (let i = 0; i < 3; i++) {
      await summary.focus(); await page.keyboard.press(i % 2 ? 'Space' : 'Enter');
      check(name + ' keyboard open ' + i, await details.evaluate(n => n.open));
      check(name + ' source disclosed', await details.innerText().then(t => t.includes('synthetic-ta-lifecycle-v1') && t.includes('On-hold requisitions remain active')));
      await page.keyboard.press(i % 2 ? 'Space' : 'Enter');
      check(name + ' keyboard close ' + i, !await details.evaluate(n => n.open));
    }
    for (const [date, expected] of [['2025-01', '0 active requisitions'], ['2025-03', 'Unavailable: snapshot coverage missing'], ['2026-09', '112 active requisitions']]) {
      await page.locator(`[data-history-month="${date}"]`).focus();
      check(name + ' history tooltip ' + date, (await page.locator('figcaption').innerText()).includes(expected));
    }
    for (const method of ['carryForward', 'recentMean', 'dampedChange']) {
      const dots = page.locator(`[data-forecast-method="${method}"]`);
      check(name + ' forecast horizon ' + method, await dots.count() === 3);
      await dots.last().focus();
      check(name + ' forecast keyboard tooltip ' + method, (await page.locator('figcaption').innerText()).includes('Dec 26'));
      await dots.first().hover();
      check(name + ' forecast hover tooltip ' + method, (await page.locator('figcaption').innerText()).includes('Oct 26'));
    }
    const chart = page.getByRole('region', { name: 'Scrollable requisition chart; use arrow keys to scroll' });
    if (width < 760) {
      await chart.evaluate(n => n.scrollLeft = 0); await chart.focus(); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(150);
      check(name + ' keyboard horizontal scroll', await chart.evaluate(n => n.scrollLeft > 0));
    }
    await chart.evaluate(n => n.scrollLeft = 0);
    await page.screenshot({ path: `${directory}/${name}.png`, fullPage: true });
    await summary.click();
    check(name + ' table zero and missing', await details.getByRole('table').first().innerText().then(t => /Jan 25\s+0\s+Complete/.test(t) && /Mar 25\s+Unavailable\s+Missing/.test(t)));
    await page.goto(base + '/local-preview/talent-acquisition?repeat=1');
    await page.getByRole('heading', { name: 'Recruiting funnel' }).waitFor();
    check(name + ' navigation stable', !await page.locator('details').evaluate(n => n.open));
    check(name + ' no runtime errors', errors.length === 0);
    check(name + ' no API or provider dependencies', apiRequests.length === 0 && !external.some(u => !u.includes('vercel-scripts')));
    await context.close();
  }
  console.log(JSON.stringify({ checks, screenshots: directory }));
} finally { await browser.close(); }
