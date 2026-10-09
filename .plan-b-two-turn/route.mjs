import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import vm from 'node:vm';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
const require = createRequire(import.meta.url);
export async function compileRoute(root, output) {
  const boundary = join(root,'.plan-b-two-turn/route-boundary.cjs');
  const compiler = webpackPackage.webpack({mode:'development',devtool:false,target:'node',
    entry:join(root,'app/api/home-solution-conversation/route.ts'),
    output:{path:output,filename:'route.cjs',library:{type:'commonjs2'}},
    externals:{undici:'commonjs undici'},
    resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'openai$':boundary,
      '@/lib/home-solution-projection-source$':boundary,'@':root}},
    module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:join(root,'tests/fixtures/typescript-browser-loader.mjs')}]},
  });
  await new Promise((resolve,reject) => compiler.run((error,stats) => compiler.close(() =>
    error || stats.hasErrors() ? reject(Error('route_compile_failed')) : resolve())));
  return readFile(join(output,'route.cjs'),'utf8');
}
export function loadRoute(code, boundary) {
  const sandbox = {exports:{},require,Response,Request,URL,URLSearchParams,TextEncoder,TextDecoder,
    AbortController,AbortSignal,Intl,Buffer,setTimeout,clearTimeout,
    // No real key, project credentials, database variables or ambient process access in the app VM.
    process:{env:{OPENAI_API_KEY:'build-owned-transport',NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION:'true',
      SWP_DEMO_MODEL_PROFILE:'medium-acceptance-v1',SWP_DEMO_MODEL_ID:'gpt-6.1-sol'}},
    console:{log(){},warn(){},error(){}},
    fetch:() => {throw Error('route_network_forbidden');},__planB:boundary,
  };
  sandbox.module = {exports:sandbox.exports};
  vm.runInNewContext('globalThis.structuredClone=value=>JSON.parse(JSON.stringify(value));\n'+code,sandbox);
  return sandbox.module.exports.POST;
}
