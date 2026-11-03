// Offline full-provider preflight: never calls a network or model provider.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {create9037OfflineProvider, OFFLINE_9037_INTEGRITY_DIGEST} from '../../releases/2026-10-21/source/lib/dataset-9037-offline-provider.mjs';
import {create9037CompanyAnalytics} from '../../releases/2026-10-21/source/lib/dataset-9037-company-analytics.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../synthetic-october-candidate-20261103');
const read=name=>fs.readFileSync(path.join(root,'components-final',name));
const pins=JSON.parse(fs.readFileSync(path.join(root,'runtime-candidate-pins.json')));
const provider=create9037OfflineProvider({integrityBytes:read('integrity-manifest.json'),contractBytes:read('component-contracts.json'),componentBytes:read('components.json'),expectedIntegrityDigest:OFFLINE_9037_INTEGRITY_DIGEST});
const analytics=await create9037CompanyAnalytics({provider,aggregateBytes:fs.readFileSync(path.join(root,'capture.json')),expectedAggregateDigest:pins['captured-62-queries.json'],jointBytes:read('joint-dashboard.json')});
console.log(JSON.stringify({status:'passed',dataset:provider.datasetId,cutoff:provider.cutoff,scope:analytics.scope,company:analytics.dashboardResponse({country:'all',org:'all',level:'all'}).overview,modelCalls:0},null,2));
