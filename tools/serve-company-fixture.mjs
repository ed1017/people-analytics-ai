import fs from 'node:fs';
import {createCompanyBinding} from '../lib/public-fixture/company-binding.mjs';
import {createCompanyFixtureServer} from '../lib/public-fixture/company-http.mjs';

// Only these reviewed invented inputs are loadable. No user-supplied file paths.
if(process.argv.length!==2||Object.keys(process.env).some(k=>k.startsWith('VERCEL')))throw Error('Local fixture launcher only');
const read=name=>fs.readFileSync(new URL(`../tests/fixtures/company-import/${name}`,import.meta.url),'utf8').replaceAll('\r\n','\n');
const expected=JSON.parse(read('lantern-binding-pins.json'));
const binding=createCompanyBinding({configText:read('lantern-config.json'),rowsText:read('lantern-rows.json'),expected});
const server=createCompanyFixtureServer(binding);
server.listen(0,'127.0.0.1',()=>console.log(JSON.stringify({url:`http://127.0.0.1:${server.address().port}`,datasetToken:binding.token,identity:binding.identity})));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close());
