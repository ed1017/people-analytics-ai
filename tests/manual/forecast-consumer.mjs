// Existing offline evaluators run afresh; no cached source assertions or live inputs.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { evidenceCheckpoint } from './predictive-evidence-checkpoint.mjs';
import { exitDemoPresentation } from './generate-exit-demo-presentation.mjs';
import { composeForecastConsumer, resolveForecastConsumerCache } from '../../lib/ml/forecast-consumer.mjs';
export async function exitForecastForConsumer() {
  const [checkpoint, preview, module, runner] = await Promise.all([evidenceCheckpoint(), exitDemoPresentation(),
    readFile(new URL('../../lib/ml/forecast-consumer.mjs', import.meta.url)), readFile(new URL('./forecast-consumer.mjs', import.meta.url))]);
  return composeForecastConsumer(checkpoint, preview, createHash('sha256').update(module).update(runner).digest('hex'));
}
export async function readCachedExitForecast(cached) { return resolveForecastConsumerCache(cached, await exitForecastForConsumer()); }
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  if (process.argv.length !== 2) throw Error('This offline runner accepts no source or qualification overrides.');
  process.stdout.write(JSON.stringify(await exitForecastForConsumer(), null, 2) + '\n');
}
