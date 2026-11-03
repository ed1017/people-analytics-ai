"""Run the workflow's deterministic node test commands, capturing bounded summaries."""
from pathlib import Path
import json, shlex, subprocess
repo=Path(__file__).resolve().parents[2]
out=repo.parent/'synthetic-october-candidate-20261103/ci-tests'
out.mkdir(exist_ok=True)
cwd=repo;name='';results=[]
for line in (repo/'.github/workflows/regression-contracts.yml').read_text().splitlines():
 if line.startswith('      - '):cwd=repo
 if line.startswith('      - name:'):name=line.split(':',1)[1].strip()
 if line.strip().startswith('working-directory:'):cwd=repo/line.split(':',1)[1].strip()
 if not line.strip().startswith('run: node --test '):continue
 cmd=shlex.split(line.strip()[5:]);log=out/f'{len(results):02}.log'
 with log.open('w',encoding='utf-8') as f:r=subprocess.run(cmd,cwd=cwd,stdout=f,stderr=subprocess.STDOUT)
 result=dict(name=name,command=cmd,cwd=str(cwd.relative_to(repo)),exit=r.returncode,log=log.name)
 results.append(result)
 (out/'summary.json').write_text(json.dumps(results,indent=2))
 print(('PASS ' if r.returncode==0 else 'FAIL ')+name,flush=True)
raise SystemExit(any(r['exit'] for r in results))
