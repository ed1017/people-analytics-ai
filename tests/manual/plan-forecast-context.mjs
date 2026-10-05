// Sole producer entry point: no evidence overrides, service calls or persistence.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {exitForecastForConsumer} from './forecast-consumer.mjs';
import {composePlanForecastContext,resolvePlanForecastContextCache} from '../../lib/ml/plan-forecast-context.mjs';
import {hiringExperimentalForConsumer} from './hiring-experimental-consumer.mjs';
export async function planForecastContext(draft,domain){
 const [consumer,module,runner,experimentalHiring]=await Promise.all([exitForecastForConsumer(),
  readFile(new URL('../../lib/ml/plan-forecast-context.mjs',import.meta.url)),readFile(new URL('./plan-forecast-context.mjs',import.meta.url)),
  domain==='hiring'?hiringExperimentalForConsumer():null]);
 return composePlanForecastContext(draft,domain,consumer,createHash('sha256').update(module).update(runner).digest('hex'),experimentalHiring??null);
}
export async function readCachedPlanForecastContext(cached,draft,domain){
 return resolvePlanForecastContextCache(cached,await planForecastContext(draft,domain));
}
