import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
const require = createRequire(import.meta.url);
const playwright = await import(process.env.PLAYWRIGHT_MODULE ?? require.resolve('playwright'));
const {chromium} = playwright.default ?? playwright;
const axe = await fs.readFile(require.resolve('axe-core'), 'utf8');
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'analysis-demo-display-'));
// Compile the actual app stylesheet without source access or a product test route.
const cssPath = path.resolve('app/globals.css');
const {css} = await postcss([tailwind({base: process.cwd()})]).process(await fs.readFile(cssPath, 'utf8'), {from: cssPath});
const compiler = webpackPackage.webpack({mode: 'development', devtool: false,
  entry: path.resolve('tests/fixtures/analysis-demo-display.tsx'), output: {path: output, filename: 'fixture.js'},
  resolve: {extensions: ['.tsx', '.ts', '.mjs', '.js'], alias: {'@': process.cwd(), react: path.resolve('node_modules/react')}},
  module: {rules: [{test: /\.tsx?$/, exclude: /node_modules/, use: path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve, reject) => compiler.run((error, stats) => compiler.close(() => error ? reject(error) : stats.hasErrors() ? reject(Error(stats.toString({all: false, errors: true}))) : resolve())));
const js = await fs.readFile(path.join(output, 'fixture.js'), 'utf8');
assert.doesNotMatch(js, /aggregate-exit-history\.json|evaluateAggregateExitDemo|hiringExperimentalForConsumer|actionPlanAnalysisDemo|satisfactionWaveChangeReport|node:crypto/);
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Analysis disclosure fixture</title><style>${css}</style></head><body><div id="root"></div><script>${js.replaceAll('</script', '<\\/script')}</script></body></html>`;
const browser = await chromium.launch({executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox']});
let checks = 0;
const check = (name, condition) => {assert(condition, name); checks++; console.log('PASS ' + name);};
try {
  for (const [name, width, height] of [['desktop', 1366, 900], ['mobile', 390, 900], ['narrow', 320, 700], ['zoom-equivalent', 683, 450]]) {
    const context = await browser.newContext({viewport: {width, height}});
    await context.addInitScript(() => {
      window.storageWrites = 0;
      for (const method of ['setItem', 'removeItem', 'clear']) {
        const original = Storage.prototype[method];
        Storage.prototype[method] = function(...args) {window.storageWrites++; return original.apply(this, args);};
      }
    });
    const page = await context.newPage(), errors = []; let requests = 0;
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      if (route.request().url() === 'http://fixture.local/') return route.fulfill({contentType: 'text/html', body: html});
      requests++; return route.abort();
    });
    await page.goto('http://fixture.local/');
    const root = page.locator('details[aria-label="Synthetic count example"]');
    const summary = root.locator('summary').first();
    const methods = page.getByText('Methods and evaluation', {exact: true});
    const comparisons = page.getByRole('region', {name: 'Experimental synthetic comparisons'});
    await summary.waitFor();
    check(name + ' default compact disclosure retains operational-unavailable status', await root.evaluate(n => !n.open) && await summary.getByText(/Operational forecast unavailable/).isVisible() && !await comparisons.isVisible());
    await summary.focus(); await page.keyboard.press('Enter');
    check(name + ' comparisons remain hidden inside existing methods disclosure', !await comparisons.isVisible());
    await methods.focus(); await page.keyboard.press('Enter');
    check(name + ' keyboard reveals named comparisons and touch-size summary', await comparisons.isVisible() && (await methods.boundingBox()).height >= 44);
    const hiring = comparisons.getByRole('region', {name: 'Synthetic hiring method comparisons'});
    check(name + ' all nine comparisons and column/row headers render', await hiring.locator('tbody tr').count() === 9 && await hiring.locator('th[scope="col"]').count() === 4 && await hiring.locator('th[scope="row"]').count() === 9);
    check(name + ' loss direction, losing cases and abstentions remain visible', await comparisons.getByText(/lower is better/).isVisible() && await comparisons.getByText(/loses to fixed logistic trend in 4 of 9 cases/).isVisible() && await comparisons.getByText(/All 7 support checks abstain/).isVisible());
    check(name + ' four-decimal precision preserves small differences', await hiring.getByText('0.2599', {exact: true}).count() > 0 && await hiring.getByText('0.2601', {exact: true}).count() > 0);
    check(name + ' satisfaction is descriptive with denominators and signed changes', await comparisons.getByText('Satisfaction · descriptive wave changes.', {exact: true}).isVisible() && await comparisons.getByText(/80 respondents \/ 100 eligible/).isVisible() && await comparisons.getByText(/score \+5 percentage points; coverage -20 points/).isVisible() && await comparisons.getByText(/score -2 percentage points; coverage \+15 points/).isVisible());
    check(name + ' assumption and scope limitations render', await comparisons.getByText(/not confidence intervals/).isVisible() && await comparisons.getByText(/selected goals and workforce filters do not narrow/).isVisible() && await comparisons.getByText(/Fixed reviewed evidence; no live refresh/).isVisible());
    await hiring.focus();
    check(name + ' scrollable comparison region is keyboard focusable', await hiring.evaluate(n => n === document.activeElement));
    if (width <= 390) {
      await page.keyboard.press('End');
      await hiring.evaluate(n => { n.scrollLeft = n.scrollWidth; });
      check(name + ' table overflow is contained', await hiring.evaluate(n => n.scrollWidth > n.clientWidth && n.scrollLeft > 0));
      await hiring.evaluate(n => { n.scrollLeft = 0; });
    }
    check(name + ' no page overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.addScriptTag({content: axe});
    const accessibility = await page.evaluate(async () => (await window.axe.run(document.querySelector('details[aria-label="Synthetic count example"]'), {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa']}})).violations);
    check(name + ' no automated WCAG A/AA violations in expanded disclosure: ' + JSON.stringify(accessibility.map(v => v.id)), accessibility.length === 0);
    await comparisons.screenshot({path: path.join(output, name + '-comparisons.png')});
    for (const mode of ['altered', 'stale-satisfaction', 'missing']) {
      await page.getByLabel('Fixture evidence').selectOption(mode);
      await summary.click(); await methods.click();
      check(name + ' ' + mode + ' withholds new numeric comparisons', !await comparisons.count() && await page.getByRole('status').getByText(/Experimental comparison evidence/).isVisible() && !await page.getByText('999', {exact: true}).count());
      check(name + ' ' + mode + ' preserves original conditional count', await page.getByRole('heading', {name: 'Conditional remaining-year estimate', exact: true}).locator('..').getByText('201', {exact: true}).isVisible());
      check(name + ' ' + mode + ' no page overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    check(name + ' no requests, storage writes or runtime errors', requests === 0 && await page.evaluate(() => window.storageWrites) === 0 && errors.length === 0);
    await context.close();
  }
  console.log(JSON.stringify({checks, output}));
} finally {await browser.close();}
