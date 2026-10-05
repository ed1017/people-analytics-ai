// Offline generation only. The browser never imports evaluators or source fixtures.
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { exitForecastForConsumer } from './forecast-consumer.mjs';
export async function forecastConsumerViewArtifact() { return exitForecastForConsumer(); }
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const mode = process.argv[2] ?? '--check';
  if (process.argv.length > 3 || !['--check', '--write'].includes(mode)) throw Error('Use --check or --write only.');
  const file = new URL('../../lib/data/forecast-consumer-view-v1.json', import.meta.url);
  const text = JSON.stringify(await forecastConsumerViewArtifact(), null, 2) + '\n';
  if (mode === '--write') await writeFile(file, text);
  else if (await readFile(file, 'utf8') !== text) throw Error('Consumer view is stale: regenerate from current local evidence.');
}
