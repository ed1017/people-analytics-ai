// Real reference components, synthetic catalog rows, and no external requests.
// Run after npm run build with PLAYWRIGHT_MODULE pointing to installed Playwright.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const output = process.env.INTELLIGENCE_QA_OUTPUT ?? await fs.mkdtemp(path.join(os.tmpdir(), 'intelligence-reference-content-'));
await fs.mkdir(output, { recursive: true });
const compiler = webpackPackage.webpack({
  mode: 'development', devtool: false,
  entry: path.resolve('tests/fixtures/intelligence-reference-content.tsx'),
  output: { path: output, filename: 'fixture.js' },
  resolve: { extensions: ['.tsx', '.ts', '.mjs', '.js'], alias: { '@': process.cwd(), react: path.resolve('node_modules/react') } },
  module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: path.resolve('tests/fixtures/typescript-browser-loader.mjs') }] },
});
await new Promise((resolve, reject) => compiler.run((error, stats) => compiler.close(() => error ? reject(error) : stats.hasErrors() ? reject(Error(stats.toString({ all: false, errors: true }))) : resolve())));
const bundle = await fs.readFile(path.join(output, 'fixture.js'), 'utf8');
const cssFiles = await fs.readdir('.next/static', { recursive: true });
const css = (await Promise.all(cssFiles.filter(name => name.endsWith('.css')).map(name => fs.readFile(path.join('.next/static', name), 'utf8')))).join('\n');
assert(css.length, 'Build the current application CSS before running browser checks');

// Synthetic, nonpersonal records deliberately include unmapped and unavailable
// descriptions. No production job catalog or employee records enter the fixture.
const readyIndex = {
  kind: 'index', mappedProfileCount: 3,
  profiles: [
    { id: 'fixture-1', code: 'FIX-SW', name: 'Fixture Software Role', description: 'Synthetic catalog description.', active: true, mapping: { code: '15-1252.00', method: 'Synthetic mapping' }, requirements: [{ name: 'Synthetic review skill', requiredProficiency: 3, importance: 'Core' }] },
    { id: 'fixture-2', code: 'FIX-DATA', name: 'Fixture Data Role', description: null, active: true, mapping: { code: '15-2051.00', method: null }, requirements: [] },
    { id: 'fixture-3', code: 'FIX-UNMAPPED', name: 'Fixture Unmapped Role', description: null, active: true, mapping: null, requirements: [] },
    { id: 'fixture-4', code: 'FIX-UNKNOWN', name: 'Fixture Other Role', description: null, active: true, mapping: { code: '11-1011.00', method: null }, requirements: [] },
  ],
  occupations: [
    { code: '15-1252.00', title: 'Software Developers', description: 'Synthetic stored software reference description.', release: 'fixture-only', refreshedAt: null },
    { code: '15-2051.00', title: 'Data Scientists', description: 'Synthetic stored data reference description.', release: null, refreshedAt: null },
  ],
  sources: { profiles: 'ready', mappings: 'ready', occupations: 'ready', requirements: 'ready', skills: 'ready' },
};
const unavailableIndex = { kind: 'index', profiles: [], occupations: [], mappedProfileCount: null, sources: Object.fromEntries(Object.keys(readyIndex.sources).map(key => [key, 'unavailable'])) };
const readyDetail = code => ({
  kind: 'detail', code,
  essentialSkills: code === '15-1252.00' ? [{ name: 'Synthetic reference skill', importance: 4.2, level: 5.1, release: 'fixture-only', updatedAt: null }] : [],
  softwareSkills: code === '15-1252.00' ? [{ name: 'Synthetic software example', category: 'Software category', release: 'fixture-only' }] : [],
  sources: { essentialSkills: 'ready', softwareSkills: 'ready' }, suppressedRatings: 0,
});
const occupations = [
  { code: '15-1252', label: 'Software Developers', employment: '1,687,890', median: '$135,980', outlook: ['1,717.8', '1,892.6', '10.2%', '95.3'] },
  { code: '15-2051', label: 'Data Scientists', employment: '262,440', median: '$120,230', outlook: ['275.6', '371.0', '34.6%', '24.8'] },
  { code: '29-1141', label: 'Registered Nurses', employment: '3,379,720', median: '$97,550', outlook: ['3,465.4', '3,660.1', '5.6%', '180.8'] },
];
const areas = [
  { code: '99', source: 'https://www.bls.gov/oes/special-requests/oesm25nat.zip' },
  { code: '36', source: 'https://www.bls.gov/oes/special-requests/oesm25st.zip' },
  { code: '35620', source: 'https://www.bls.gov/oes/special-requests/oesm25ma.zip' },
];
const results = [];
const check = (name, condition) => { assert.ok(condition, name); results.push(name); console.log('PASS ' + name); };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
try {
  for (const [device, width, height] of [['desktop', 1366, 900], ['mobile', 390, 844], ['zoom-equivalent', 683, 450]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    const page = await context.newPage(), errors = [], requests = [], unexpected = [];
    let mode = 'ready';
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      requests.push(url.pathname + url.search);
      if (url.href === 'http://reference.test/') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Reference fixture</title></head><body><div id="root"></div></body></html>' });
      if (url.origin === 'http://reference.test' && url.pathname === '/api/occupational-reference') {
        const code = url.searchParams.get('occupation');
        if (mode === 'source-error') return route.fulfill({ status: 503, json: { error: 'PRIVATE_BACKEND_DETAIL_MUST_NOT_APPEAR' } });
        if (code) return route.fulfill({ json: mode === 'partial' ? { ...readyDetail(code), essentialSkills: [], softwareSkills: [], sources: { essentialSkills: 'unavailable', softwareSkills: 'unavailable' } } : readyDetail(code) });
        if (mode === 'unavailable') return route.fulfill({ json: unavailableIndex });
        if (mode === 'shared-mapping') return route.fulfill({ json: { ...readyIndex, profiles: readyIndex.profiles.map(profile => profile.id === 'fixture-2' ? { ...profile, active: false, mapping: { code: '15-1252.00', method: 'Synthetic shared mapping' } } : profile) } });
        if (mode === 'mapping-error') return route.fulfill({ json: { ...readyIndex, profiles: readyIndex.profiles.map(profile => ({ ...profile, mapping: null })), mappedProfileCount: null, sources: { ...readyIndex.sources, mappings: 'unavailable' } } });
        if (mode === 'partial') return route.fulfill({ json: { ...readyIndex, profiles: readyIndex.profiles.map(profile => ({ ...profile, requirements: [] })), sources: { ...readyIndex.sources, requirements: 'unavailable', skills: 'unavailable' } } });
        return route.fulfill({ json: readyIndex });
      }
      unexpected.push(url.href); return route.abort();
    });
    const mount = async () => {
      await page.goto('http://reference.test/');
      await page.addStyleTag({ content: css });
      await page.addScriptTag({ content: bundle });
    };
    const fits = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
    const openDisclosure = async name => {
      const summary = page.locator('summary').filter({ hasText: name });
      await summary.focus(); await page.keyboard.press('Enter');
      check(`${device} keyboard disclosure ${name}`, await summary.evaluate(element => element.parentElement.open));
    };
    const closeDisclosure = async name => {
      const summary = page.locator('summary').filter({ hasText: name });
      await summary.focus(); await page.keyboard.press('Enter');
      check(`${device} keyboard closes ${name}`, await summary.evaluate(element => !element.parentElement.open));
    };
    const disclosureClosed = name => page.locator('summary').filter({ hasText: name }).evaluate(element => !element.parentElement.open);

    await mount();
    await page.getByRole('button', { name: /^Fixture Software Role/ }).waitFor();
    const search = page.getByRole('searchbox', { name: 'Search job profiles' });
    check(`${device} catalog count measures mappings only`, await page.getByText('3 of 4 job profiles have a stored mapping', { exact: true }).isVisible());
    await search.focus(); await page.keyboard.type('FIX-SW');
    check(`${device} search internal profile code`, await page.getByRole('button', { name: /^Fixture Software Role/ }).count() === 1 && await page.getByRole('button', { name: /^Fixture Data Role/ }).count() === 0);
    await search.fill('Data Scientists');
    check(`${device} search mapped occupation title`, await page.getByRole('button', { name: /^Fixture Data Role/ }).count() === 1 && await page.getByRole('button', { name: /^Fixture Software Role/ }).count() === 0);
    await search.fill('No matching synthetic role');
    check(`${device} empty search explains no results`, await page.getByText(/No job profiles match/).isVisible());
    await search.fill('');
    await page.getByLabel('Mapping filter', { exact: true }).selectOption('unmapped');
    check(`${device} explicit unmapped profile filter`, await page.getByRole('button', { name: /^Fixture Unmapped Role/ }).count() === 1 && await page.getByRole('button', { name: /^Fixture Software Role/ }).count() === 0);
    await page.getByLabel('Mapping filter', { exact: true }).selectOption('all');
    await page.getByRole('button', { name: /^Fixture Software Role/ }).focus();
    await page.keyboard.press('Enter');
    await page.getByText('Synthetic reference skill', { exact: true }).waitFor();
    check(`${device} separate role requirements and occupation skills`, await page.getByRole('heading', { name: 'Internal role requirements', exact: true }).isVisible() && await page.getByText('Synthetic review skill', { exact: true }).isVisible() && await page.getByRole('heading', { name: 'Occupation skills', exact: true }).isVisible());
    check(`${device} occupation source links exact`, await page.locator('a[href="https://www.onetonline.org/link/summary/15-1252.00"]').count() > 0);
    check(`${device} public tasks remain inline`, await page.getByRole('heading', { name: 'Tasks and preparation', exact: true }).isVisible() && await page.getByText(/Assess user needs/).isVisible());
    check(`${device} preparation guidance starts collapsed`, await disclosureClosed('Preparation guidance') && !await page.getByText(/Job Zone 4/).isVisible());
    await openDisclosure('Preparation guidance');
    check(`${device} preparation guidance remains available`, await page.getByText(/Job Zone 4/).isVisible());
    await closeDisclosure('Preparation guidance');
    check(`${device} reference mapping is not attainment`, await page.getByText(/Mappings do not establish employee skill attainment/i).isVisible());
    check(`${device} internal and external rating scales remain inline`, await page.getByText('Role expectations · internal proficiency 1–5 · no employee assessment', { exact: true }).isVisible() && await page.getByText('Occupation ratings · importance 1–5 · level 0–7', { exact: true }).isVisible());
    check(`${device} secondary source provenance starts collapsed`, await disclosureClosed('Sources and interpretation') && !await page.getByText(/Stored release label:/).isVisible());
    check(`${device} reference view fits viewport`, await fits());
    await page.screenshot({ path: path.join(output, `${device}-occupations.png`), fullPage: true });
    await openDisclosure('Sources and interpretation');
    check(`${device} reference version, license and population explicit`, await page.getByText(/published database release was 31.0/).isVisible() && await page.getByText(/No employee records are used/).isVisible() && await page.getByRole('link', { name: 'CC BY 4.0 license', exact: true }).getAttribute('href') === 'https://creativecommons.org/licenses/by/4.0/');
    check(`${device} source status does not imply verified live import`, await page.getByText(/import not independently verified/).isVisible() && await page.getByText(/No live O\*NET feed/).isVisible());
    await page.screenshot({ path: path.join(output, `${device}-occupation-provenance.png`), fullPage: true });
    await closeDisclosure('Sources and interpretation');

    await page.getByRole('button', { name: /^Fixture Other Role/ }).click();
    check(`${device} missing occupation preserves exact official link`, await page.locator('a[href="https://www.onetonline.org/link/summary/11-1011.00"]').count() > 0);
    check(`${device} missing occupation does not borrow known tasks`, await page.getByText(/Assess user needs/).count() === 0 && await page.getByText('Synthetic reference skill', { exact: true }).count() === 0);

    mode = 'shared-mapping'; await mount();
    await page.getByRole('button', { name: /^Fixture Software Role/ }).click();
    const review = page.getByRole('complementary', { name: 'Mapping review', exact: true });
    check(`${device} stored mapping review stays visible before details opened`, await review.getByRole('heading', { name: 'Mapping review needed', exact: true }).isVisible());
    const mappedLink = review.getByRole('link', { name: /^Mapped occupation: Software Developers \(15-1252\.00\)/ });
    check(`${device} mapping review links the exact mapped occupation`, await mappedLink.isVisible() && await mappedLink.getAttribute('href') === 'https://www.onetonline.org/link/summary/15-1252.00');
    check(`${device} secondary mapping detail starts collapsed`, await disclosureClosed('Mapping details') && !await review.getByText(/^2 internal job profiles mapped to this occupation\./).isVisible());
    await openDisclosure('Mapping details');
    check(`${device} individual duties review remains available`, await review.getByText('Stored mapping; compare the internal duties with the official occupation before using it for role decisions.', { exact: true }).isVisible());
    check(`${device} shared mapping count includes inactive catalog profiles`, await review.getByText(/^2 internal job profiles mapped to this occupation\./).isVisible() && await page.getByRole('button', { name: /^Fixture Data Role/ }).getByText(/Inactive profile/).isVisible());
    await search.fill('FIX-SW');
    check(`${device} shared occupation count survives search hiding another role`, await page.getByRole('button', { name: /^Fixture Data Role/ }).count() === 0 && await review.getByText(/^2 internal job profiles mapped to this occupation\./).isVisible());
    check(`${device} mapping review fits viewport`, await fits());
    await page.screenshot({ path: path.join(output, `${device}-shared-mapping.png`), fullPage: true });
    await closeDisclosure('Mapping details');
    mode = 'mapping-error'; await page.getByRole('button', { name: 'Retry reference sources', exact: true }).click();
    await page.getByText('4 job profiles loaded · mapping coverage unavailable', { exact: true }).waitFor();
    check(`${device} failed mapping refresh removes previous shared count`, await page.getByText(/internal job profiles? mapped to this occupation\./).count() === 0 && await review.count() === 0 && await page.getByRole('heading', { name: 'Fixture Software Role', exact: true }).isVisible());

    mode = 'partial'; await mount();
    await page.getByRole('button', { name: /^Fixture Software Role/ }).click();
    await page.getByText('Stored detail unavailable: essential skills · software examples.', { exact: true }).waitFor();
    check(`${device} requirement failure remains unavailable`, await page.getByText(/requirements.*unavailable|unavailable.*requirements/i).first().isVisible());
    check(`${device} public tasks survive stored skill failure`, await page.getByRole('heading', { name: 'Tasks and preparation', exact: true }).isVisible() && await page.getByText('Synthetic reference skill', { exact: true }).count() === 0);
    check(`${device} unavailable ratings do not become zero`, await page.getByText('Critical Thinking', { exact: true }).isVisible() && await page.getByText('Importance 0 / 5', { exact: true }).count() === 0);

    mode = 'mapping-error'; await mount();
    await page.getByRole('button', { name: /^Fixture Software Role/ }).waitFor();
    check(`${device} failed mappings do not become zero coverage`, await page.getByText(/mapping.*unavailable|unavailable.*mapping/i).first().isVisible() && await page.getByText(/0 of 4/).count() === 0);
    check(`${device} failed mappings cannot be filtered as unmapped`, await page.getByLabel('Mapping filter', { exact: true }).isDisabled());

    mode = 'source-error'; await mount();
    await page.getByText('Internal job profiles unavailable. Public references remain available below.', { exact: true }).waitFor();
    check(`${device} source error hides backend details`, await page.getByText('PRIVATE_BACKEND_DETAIL_MUST_NOT_APPEAR').count() === 0);
    await page.getByLabel('Browse public occupations', { exact: true }).selectOption('29-1141.00');
    await page.getByText('Stored detail unavailable: essential skills · software examples.', { exact: true }).waitFor();
    check(`${device} public references survive unavailable mapping API`, await page.getByText(/Document patient information/).isVisible() && await page.locator('a[href="https://www.onetonline.org/link/summary/29-1141.00"]').count() > 0);
    check(`${device} fallback consolidates missing stored detail into one notice`, await page.getByText('Stored detail unavailable: essential skills · software examples.', { exact: true }).count() === 1 && await page.locator('article[aria-label="Selected occupation"] p').evaluateAll(elements => elements.filter(element => /unavailable/i.test(element.textContent) && element.getClientRects().length > 0).length) === 1);
    check(`${device} fallback retains unrated public skills with secondary prose collapsed`, await page.getByText('Active Listening', { exact: true }).isVisible() && await page.getByText('Public excerpt · names only, no ratings', { exact: true }).isVisible() && await disclosureClosed('Preparation guidance') && await disclosureClosed('Sources and interpretation'));
    check(`${device} failed reference view fits viewport`, await fits());
    await page.screenshot({ path: path.join(output, `${device}-reference-failure.png`), fullPage: true });
    mode = 'ready'; await page.getByRole('button', { name: 'Retry reference sources', exact: true }).click();
    await page.getByRole('button', { name: /^Fixture Software Role/ }).waitFor();
    check(`${device} source retry recovers catalog`, true);
    mode = 'unavailable'; await mount();
    await page.getByText('Internal job profiles unavailable. Public references remain available below.', { exact: true }).waitFor();
    check(`${device} structured source unavailability retains public content`, await page.getByRole('heading', { name: 'Tasks and preparation', exact: true }).isVisible() && await page.getByLabel('Browse public occupations', { exact: true }).locator('option').count() === 3);

    await page.getByRole('button', { name: 'Show Labor Market', exact: true }).click();
    const panel = page.getByRole('region', { name: 'Occupation and location comparison' });
    const occupationTable = panel.getByRole('region', { name: 'Occupation comparison', exact: true });
    const locationTable = panel.getByRole('region', { name: 'Location comparison', exact: true });
    const outlookTable = panel.getByRole('region', { name: 'National outlook comparison', exact: true });
    await occupationTable.waitFor();
    check(`${device} market secondary coverage and release prose starts collapsed`, await disclosureClosed('Data details') && !await panel.getByRole('heading', { name: 'Coverage and sources', exact: true }).isVisible() && !await panel.getByText(/released May 15, 2026/).isVisible());
    check(`${device} wage period units and population remain inline`, await panel.getByText('BLS OEWS · May 2025 · Annual USD wages · Wage-and-salary jobs, all industries', { exact: true }).isVisible() && await panel.getByRole('heading', { name: 'Compare occupations in U.S.', exact: true }).isVisible());
    check(`${device} national outlook period units and population remain inline`, await panel.getByRole('heading', { name: 'National outlook, 2025–2035', exact: true }).isVisible() && await panel.getByText('United States only · includes self-employment · location filter does not apply', { exact: true }).isVisible() && await outlookTable.locator('caption').isVisible() && await panel.getByText(/This population differs from OEWS/).isVisible());
    check(`${device} overlapping geographies remain explicit inline`, await panel.getByText('The NY-NJ metro extends beyond NYC. Geographies overlap; employment counts are not additive.', { exact: true }).isVisible());
    for (const region of [occupationTable, locationTable, outlookTable]) {
      check(`${device} accessible table ${await region.getAttribute('aria-label')}`, await region.getByRole('table').count() === 1 && await region.locator('tbody tr').count() === 3);
      check(`${device} table caption and header scopes ${await region.getAttribute('aria-label')}`, await region.locator('caption').count() === 1 && await region.locator('thead th:not([scope="col"]), tbody th:not([scope="row"])').count() === 0);
      await region.focus();
      check(`${device} table keyboard focus ${await region.getAttribute('aria-label')}`, await region.evaluate(element => document.activeElement === element));
      if (await region.evaluate(element => element.scrollWidth > element.clientWidth)) {
        await page.keyboard.press('ArrowRight');
        await page.waitForFunction(label => { const element = document.querySelector(`[aria-label="${label}"]`); return element && element.scrollLeft > 0; }, await region.getAttribute('aria-label'));
        check(`${device} overflowing table scrolls with keyboard`, true);
        await region.evaluate(element => { element.scrollLeft = 0; });
      }
    }
    for (const occupation of occupations) {
      const row = occupationTable.getByRole('row').filter({ hasText: occupation.label });
      check(`${device} published national employment/pay ${occupation.code}`, (await row.textContent()).includes(occupation.employment) && (await row.textContent()).includes(occupation.median));
      const outlook = await outlookTable.getByRole('row').filter({ hasText: occupation.label }).textContent();
      check(`${device} published decade outlook ${occupation.code}`, occupation.outlook.every(value => outlook.includes(value)));
      await panel.getByLabel('Market occupation', { exact: true }).selectOption(occupation.code);
      check(`${device} occupation selection updates location comparison ${occupation.code}`, (await locationTable.textContent()).includes(occupation.median));
    }
    await panel.getByRole('button', { name: 'Select Software Developers', exact: true }).click();
    check(`${device} table selection updates occupation control`, await panel.getByLabel('Market occupation', { exact: true }).inputValue() === '15-1252');
    const outlookBefore = await outlookTable.textContent();
    for (const region of [occupationTable, locationTable, outlookTable]) await region.evaluate(element => { element.scrollLeft = 0; });
    await page.screenshot({ path: path.join(output, `${device}-labor-compact.png`), fullPage: true });
    await openDisclosure('Data details');
    for (const area of areas) {
      await panel.getByLabel('Market location', { exact: true }).selectOption(area.code);
      check(`${device} geography uses exact source workbook ${area.code}`, await panel.getByRole('link', { name: 'Official BLS source workbook', exact: true }).getAttribute('href') === area.source);
      check(`${device} geography does not relabel national outlook ${area.code}`, await outlookTable.textContent() === outlookBefore);
    }
    check(`${device} source periods and releases explicit`, await panel.getByText(/May 2025/).count() > 0 && await panel.getByText(/2025–2035/).count() > 0 && await panel.getByText(/May 15, 2026/).count() > 0 && await panel.getByText(/August 27, 2026/).count() > 0);
    check(`${device} projections official primary source`, await panel.getByRole('link', { name: 'BLS projection table 1.2', exact: true }).getAttribute('href') === 'https://www.bls.gov/emp/tables/occupational-projections-and-characteristics.htm');
    check(`${device} national-only outlook and population distinction`, await panel.getByText(/United States only/).count() > 0 && await panel.getByText(/self-employ/i).count() > 0);
    check(`${device} no company midpoint inferred`, await panel.getByText(/company.*midpoint|internal.*midpoint|salary.range.*midpoint/i).count() > 0);
    const carry = panel.getByRole('button', { name: 'Carry reference to Planning', exact: true });
    check(`${device} carry requires goal`, await carry.isDisabled());
    await page.getByRole('button', { name: 'Set fixture goal', exact: true }).click(); await carry.click();
    const carried = JSON.parse(await page.getByLabel('Fixture carried reference', { exact: true }).textContent());
    check(`${device} explicit carry retains only selection and goal`, JSON.stringify(Object.keys(carried).sort()) === JSON.stringify(['area', 'goal', 'soc']) && carried.soc === '15-1252' && carried.area === '35620');
    await openDisclosure('National labor indicators');
    check(`${device} macro source failure leaves wage and outlook content`, await page.getByText('Fixture national indicator source unavailable.', { exact: true }).isVisible() && await occupationTable.isVisible() && await outlookTable.isVisible());
    check(`${device} labor view fits viewport`, await fits());
    // Capture the first columns after keyboard scrolling and selection tests.
    for (const region of [occupationTable, locationTable, outlookTable]) await region.evaluate(element => { element.scrollLeft = 0; });
    await page.screenshot({ path: path.join(output, `${device}-labor.png`), fullPage: true });
    await closeDisclosure('Data details');
    await page.getByRole('button', { name: 'Use unsupported market selection', exact: true }).click();
    await page.getByRole('button', { name: 'Reset market selection', exact: true }).click();
    check(`${device} unsupported selection has recovery`, await panel.getByLabel('Market occupation', { exact: true }).inputValue() === '15-1252' && await panel.getByLabel('Market location', { exact: true }).inputValue() === '99');
    check(`${device} no runtime errors, persistence or unexpected network`, errors.length === 0 && unexpected.length === 0 && await page.evaluate(() => localStorage.length === 0));
    check(`${device} only reference API requested`, requests.every(url => url === '/' || url.startsWith('/api/occupational-reference')));
    await context.close();
  }
  await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ checks: results.length, results }, null, 2));
  console.log(`${results.length} reference browser checks passed. Evidence: ${output}`);
} finally { await browser.close(); }
