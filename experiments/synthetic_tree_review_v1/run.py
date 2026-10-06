"""Fresh review: verify frozen models, calibrate observable gates, then open tests."""
from __future__ import annotations
import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path
import sys
for name in ('OPENBLAS_NUM_THREADS','OMP_NUM_THREADS','MKL_NUM_THREADS'):
    os.environ[name]='1'
from ..synthetic_tree_v1 import run as original
from ..synthetic_tree_v1.features import canonical,digest,make_case,labels_for
from ..synthetic_tree_v1.models import fit_model
from .worlds import generate_review_history
from .boundary import fit_boundaries,annotate_case
from .assessment import evaluate_domain

ROOT=Path(__file__).resolve().parents[2]
DIRECTORY=Path(__file__).resolve().parent
EVIDENCE=ROOT/'docs/evidence/synthetic-tree-review-v1'
PARENT=ROOT/'docs/evidence/synthetic-tree-benchmarks-v1'
PROTOCOL=json.loads((DIRECTORY/'protocol.json').read_text())
PROTOCOL_COMMIT='95e09af'


def sha(value):
    return hashlib.sha256(value).hexdigest()


def custody():
    files=sorted([*DIRECTORY.glob('*.py'),DIRECTORY/'protocol.json'])
    return {'original':original.source_custody(),'reviewFiles':{str(path.relative_to(ROOT)):sha(path.read_bytes()) for path in files},
            'protocolSha256':digest(PROTOCOL),'protocolFrozenCommit':PROTOCOL_COMMIT}


def seed_range(key):
    first,last=PROTOCOL[key];return list(range(first,last+1))


def verify_splits():
    groups=[seed_range(key)for key in ('calibrationSeeds','referenceSeeds','transportSeeds')]
    groups += [original.seeds(key)for key in ('train','tuning','test')]
    assert all(not set(a)&set(b) for i,a in enumerate(groups) for b in groups[i+1:])
    assert max(PROTOCOL['calibrationOrigins'])<min(PROTOCOL['testOrigins'])


def refit_frozen():
    # Original test outcome rows are not loaded or used; only frozen audits/params.
    report_bytes=(PARENT/'report.json').read_bytes();tuning_bytes=(PARENT/'tuning.json').read_bytes()
    assert sha(report_bytes)==PROTOCOL['parentReportSha256']
    assert sha(tuning_bytes)==PROTOCOL['parentTuningSha256']
    parent=json.loads(report_bytes);tuning=json.loads(tuning_bytes)
    original.check_custody(tuning['custody'])
    assert parent['tuningSha256']==sha(tuning_bytes)
    train=original.build_cases(original.seeds('train'),original.origins(original.PROTOCOL['firstTrainingOrigin'],original.PROTOCOL['lastRefitTrainingOrigin']),original.PROTOCOL['selectionAndRefitCutoff'])
    assert len(train)==parent['refitTrainingCases']
    fits={};audits=[]
    for domain in PROTOCOL['domains']:
        for method in [PROTOCOL['candidates'][domain],'ridge-enriched-full']:
            arm=method.removesuffix('-full')
            cases=[row for row in train if row['domain']==domain]
            fitted=fit_model(cases,arm,tuning['choices'][domain][arm]['params'],original.PROTOCOL,original.PROTOCOL['selectionAndRefitCutoff'])
            actual={'domain':domain,'size':'full',**fitted[2]}
            expected=next(row for row in parent['refitAudits']if row['domain']==domain and row['size']=='full' and row['arm']==arm)
            assert actual==expected, f'Frozen candidate refit mismatch: {domain}/{method}'
            fits[(domain,method)]=fitted;audits.append(actual)
        print(f'frozen refit verified {domain}',file=sys.stderr,flush=True)
    return fits,audits


def build_review_cases(seed_values,world,case_origins,boundaries=None,calibration=False):
    output=[]
    for seed in seed_values:
        for scenario in PROTOCOL['scenarios']:
            history=generate_review_history(seed,scenario,world)
            prepared=[make_case(history,domain,origin)for domain in PROTOCOL['domains']for origin in case_origins]
            for case in prepared:
                case['id']=world+':'+case['id'];case['world']=world
                if boundaries is not None:annotate_case(case,boundaries,PROTOCOL)
                case['scoring']=({'status':'blocked','reasons':['calibration-inputs-only'],'labels':[]}if calibration else labels_for(history,case,original.PROTOCOL['testLabelsAsOf']))
                output.append(case)
        if seed%10==0:print(f'prepared {world} seed {seed}',file=sys.stderr,flush=True)
    original.attach_baselines(output)
    if boundaries is not None:
        for case in output:annotate_case(case,boundaries,PROTOCOL)
    assert len(output)==len(seed_values)*len(PROTOCOL['scenarios'])*len(PROTOCOL['domains'])*len(case_origins)
    assert len({case['id']for case in output})==len(output)
    return output


def add_candidates(rows,fits):
    for (domain,method),fit in fits.items():
        original.add_predictions([row for row in rows if row['domain']==domain],fit,method.removesuffix('-full'),'full',domain)


def compressed(value):
    return gzip.compress((canonical(value)+'\n').encode(),compresslevel=9,mtime=0)


def json_bytes(value):
    return (json.dumps(value,sort_keys=True,indent=2,allow_nan=False)+'\n').encode()


def write_or_check(files,check):
    if not check:EVIDENCE.mkdir(parents=True,exist_ok=True)
    for name,content in files.items():
        if check:assert (EVIDENCE/name).read_bytes()==content,f'Nonreproducible {name}'
        else:(EVIDENCE/name).write_bytes(content)


def calibrate(check=False):
    verify_splits();source=custody()
    _,audits=refit_frozen()
    cases=build_review_cases(seed_range('calibrationSeeds'),'reference',PROTOCOL['calibrationOrigins'],calibration=True)
    boundaries=fit_boundaries(cases,PROTOCOL)
    artifact=compressed({'cases':cases})
    report={'phase':'observable-calibration-only','protocol':PROTOCOL,'custody':source,'boundaries':boundaries,'frozenRefitAudits':audits,
            'targetLabelsUsed':False,'testSeedsGenerated':False,'cases':len(cases),'artifact':{'path':'calibration-cases.json.gz','sha256':sha(artifact),'bytes':len(artifact)},
            'publishedInterval':None,'operationallyQualified':False}
    files={'calibration-cases.json.gz':artifact,'calibration.json':json_bytes(report)}
    write_or_check(files,check)
    return {'phase':'calibration','status':'verified'if check else'written','reportSha256':sha(files['calibration.json']),'boundaries':boundaries}


def evaluate(check=False):
    verify_splits();calibration_bytes=(EVIDENCE/'calibration.json').read_bytes();calibration=json.loads(calibration_bytes)
    assert calibration['custody']==custody(),'Changed source/runtime after calibration freeze'
    assert sha((EVIDENCE/calibration['artifact']['path']).read_bytes())==calibration['artifact']['sha256']
    fits,audits=refit_frozen()
    assert audits==calibration['frozenRefitAudits']
    rows=[]
    for world in PROTOCOL['worlds']:
        cases=build_review_cases(seed_range('referenceSeeds'if world=='reference'else'transportSeeds'),world,PROTOCOL['testOrigins'],calibration['boundaries'])
        add_candidates(cases,fits);rows.extend(cases)
        print(f'evaluated {world} ({len(cases)} cases)',file=sys.stderr,flush=True)
    reports=[evaluate_domain(rows,domain,PROTOCOL['candidates'][domain],PROTOCOL['comparators'][domain],PROTOCOL)for domain in PROTOCOL['domains']]
    artifact=compressed({'rows':rows})
    report={'kind':'fresh-frozen-tree-candidate-review','protocol':PROTOCOL,'custody':custody(),'calibrationSha256':sha(calibration_bytes),
            'frozenRefitAudits':audits,'cases':len(rows),'independentReferenceSeeds':40,'independentTransportSeeds':20,
            'domainResults':reports,'artifact':{'path':'test-cases.json.gz','sha256':sha(artifact),'bytes':len(artifact)},
            'publishedInterval':None,'operationallyQualified':False,'realWorldPerformanceValidated':False,'productionChanges':False}
    files={'test-cases.json.gz':artifact,'report.json':json_bytes(report)}
    write_or_check(files,check)
    return {'phase':'test','status':'verified'if check else'written','reportSha256':sha(files['report.json']),
            'verdicts':[{'domain':row['domain'],'verdict':row['verdict'],'failedConditions':len(row['failures'])}for row in reports]}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('phase',choices=['calibrate','evaluate','check']);args=parser.parse_args()
    if args.phase=='calibrate':output=calibrate()
    elif args.phase=='evaluate':output=evaluate()
    else:
        print(canonical(calibrate(check=True)),flush=True);output=evaluate(check=True)
    print(canonical(output),flush=True)

if __name__=='__main__':main()
