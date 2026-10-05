import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const output = await fs.mkdtemp('/tmp/action-plan-application-browser-');
const compiler = webpackPackage.webpack({mode: 'development', devtool: false, entry: path.resolve('tests/fixtures/action-plan-application.tsx'),
  output: {path: output, filename: 'fixture.js'}, resolve: {extensions: ['.tsx', '.ts', '.mjs', '.js'], alias: {'@': process.cwd()}},
  module: {rules: [{test: /\.tsx?$/, exclude: /node_modules/, use: path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve, reject) => compiler.run((error, stats) => compiler.close(() => error ? reject(error) : stats.hasErrors() ? reject(Error(stats.toString({all: false, errors: true}))) : resolve())));
const bundle = await fs.readFile(path.join(output, 'fixture.js'), 'utf8');
const stylesheet = await fs.readdir('.next/static/chunks').then(files => Promise.all(files.filter(file => file.endsWith('.css')).map(file => fs.readFile(path.join('.next/static/chunks', file), 'utf8')))).then(parts => parts.join('\n')).catch(() => '');
const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', headless: true, args: ['--no-sandbox']});
let checks = 0;
const check = (name, ok) => {assert.ok(ok, name); checks++; console.log('PASS ' + name);};
const key = 'insights-to-action.decisions.v1';
try {
  async function open(context) {
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => route.fulfill({contentType: 'text/html', body: '<div id="root"></div>'}));
    await page.goto('http://127.0.0.1:3100'); if (stylesheet) await page.addStyleTag({content: stylesheet}); await page.addScriptTag({content: bundle});
    await page.getByRole('button', {name: 'Preview application', exact: true}).waitFor();
    return {page, errors};
  }
  async function review(page) {
    await page.getByRole('button', {name: 'Preview application', exact: true}).click();
    await page.getByLabel('Action Plan component', {exact: true}).selectOption('c2');
    await page.getByLabel('Existing Development option', {exact: true}).selectOption('0');
    await page.getByLabel(/I reviewed the currently selected quote/).check();
    await page.getByLabel(/I reviewed these additional-capacity assumptions/).check();
    await page.getByRole('button', {name: 'Build application preview', exact: true}).click();
    await page.getByLabel('Participants application choice', {exact: true}).waitFor();
    check('all fields default to Preserve', await page.getByLabel('Application field preview').locator('select').evaluateAll(nodes => nodes.every(node => node.value === 'preserve')));
    check('apply disabled without selected changes', await page.getByRole('button', {name: 'Apply selected fields', exact: true}).isDisabled());
    await page.getByLabel('Participants application choice', {exact: true}).selectOption('fill-empty');
    await page.getByLabel('Total training cash (USD) application choice', {exact: true}).selectOption('replace');
    check('changed choices require refreshed preview', await page.getByRole('button', {name: 'Apply selected fields', exact: true}).isDisabled());
    await page.getByRole('button', {name: 'Update application preview', exact: true}).click();
    await page.getByRole('button', {name: 'Apply selected fields', exact: true}).waitFor({state: 'visible'});
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent === 'Apply selected fields' && !button.disabled));
  }
  for (const width of [1366, 390]) {
    const context = await browser.newContext({viewport: {width, height: 900}}), {page, errors} = await open(context);
    await review(page);
    await page.getByRole('region', {name: 'Apply Action Plan locally', exact: true}).screenshot({path: path.join(output, `preview-${width}.png`)});
    const before = await page.evaluate(() => window.applicationFixture.snapshot());
    await page.getByRole('button', {name: 'Apply selected fields', exact: true}).evaluate(node => {node.click(); node.click();});
    await page.getByRole('status').filter({hasText: 'Applied 2 selected fields locally'}).waitFor();
    const after = await page.evaluate(() => window.applicationFixture.snapshot()), id = after.goals.activeId, fields = after.workspaces[id].fields;
    check(width + ' one write and one history receipt after double click', await page.evaluate(() => window.applicationFixture.writes()) === 1 && fields.actionPlanApplicationsV1.receipts.length === 1);
    check(width + ' planning subscription immediately reflects applied value', await page.locator('#participants').innerText() === '10');
    check(width + ' both destinations apply with old version preserved', fields.workforceSolution.versions.length === 2 && fields.workforceSolution.versions[0].inputs.training.trainingCash === '7000' && fields.workforceSolution.versions[1].inputs.training.trainingCash === '10000');
    assert.deepEqual(fields.homeSolutionBundlesV1, before.workspaces[id].fields.homeSolutionBundlesV1);
    await page.screenshot({path: path.join(output, `applied-${width}.png`), fullPage: true});
    check(width + ' no runtime errors or horizontal overflow', errors.length === 0 && await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await context.close();
  }
  {
    const context = await browser.newContext(), {page} = await open(context); await review(page);
    const raw = await page.evaluate(key => localStorage.getItem(key), key), before = await page.evaluate(() => window.applicationFixture.snapshot());
    await page.evaluate(() => window.applicationFixture.fail());
    await page.getByRole('button', {name: 'Apply selected fields', exact: true}).click();
    await page.getByRole('alert').filter({hasText: 'Fixture quota exceeded'}).waitFor();
    assert.deepEqual(await page.evaluate(() => window.applicationFixture.snapshot()), before);
    check('quota failure preserves saved bytes and planning subscription', await page.evaluate(key => localStorage.getItem(key), key) === raw && await page.locator('#participants').innerText() === 'Unknown');
    await context.close();
  }
  {
    const context = await browser.newContext(), {page} = await open(context); await review(page);
    const other = await context.newPage(); await other.route('**/*', route => route.fulfill({contentType: 'text/html', body: '<p>Other tab</p>'})); await other.goto('http://127.0.0.1:3100');
    await other.evaluate(key => localStorage.setItem(key, 'External changed bytes'), key);
    await page.getByRole('alert').filter({hasText: 'Another tab changed'}).waitFor();
    check('real cross-tab storage event disables apply', await page.getByRole('button', {name: 'Apply selected fields', exact: true}).isDisabled());
    check('external bytes are never overwritten', await other.evaluate(key => localStorage.getItem(key), key) === 'External changed bytes' && await page.evaluate(() => window.applicationFixture.writes()) === 0);
    await context.close();
  }
  {
    const context = await browser.newContext(), {page} = await open(context); await review(page);
    await page.evaluate(() => window.applicationFixture.editDestination());
    check('destination revision change discards reviewed selections', await page.getByRole('button', {name: 'Apply selected fields', exact: true}).count() === 0);
    await context.close();
  }
} finally {await browser.close();}
console.log(JSON.stringify({checks, output}));
