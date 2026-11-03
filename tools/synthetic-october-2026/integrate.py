"""Bind reviewed October candidates in the isolated checkout; no deployment."""
import hashlib
import json
from pathlib import Path
import re

REPO = Path(__file__).resolve().parents[2]
ROOT = REPO.parent / 'synthetic-october-candidate-20261103'
LIB = REPO / 'releases/2026-10-21/source/lib'
COMP = ROOT / 'components-final'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def edit(name, transform):
    p = LIB / name
    old = p.read_bytes()
    text = transform(old.decode().replace('\r\n', '\n'))
    p.write_bytes(text.replace('\n', '\r\n').encode() if b'\r\n' in old else text.encode())


def main():
    report = json.loads((ROOT / 'replay-validation.json').read_text())
    assert report['status'] == 'passed' and report['queries'] == 62 and report['current'] == 9092
    parts = json.loads((COMP / 'components.json').read_text())
    bundle = json.loads((ROOT / 'candidate/bundle.json').read_text())
    rows = json.loads((ROOT / 'capture.json').read_text())
    pins = {name: sha(COMP / name) for name in ('integrity-manifest.json', 'component-contracts.json', 'components.json', 'joint-dashboard.json')}
    pins['captured-62-queries.json'] = sha(ROOT / 'capture.json')
    populations = {r['skill_code']: r['employees_in_roles_requiring_skill'] for r in parts['skills']}
    def provider(s):
        s = s.replace('workforce-demo-geography-20261023-local-v1', bundle['bundle_id'])
        s = re.sub(r"(OFFLINE_9037_INTEGRITY_DIGEST = ')[a-f0-9]+", lambda m:m[1]+pins['integrity-manifest.json'], s)
        s = re.sub(r"(const sourceBundle = ')[a-f0-9]+", lambda m:m[1]+bundle['bundle_sha256'], s)
        s = re.sub(r'const REVIEWED_SKILL_POPULATIONS = deepFreeze\(.*?\);', 'const REVIEWED_SKILL_POPULATIONS = deepFreeze('+json.dumps(populations,separators=(',',':'))+');', s)
        s = s.replace("contracts.activePopulation === 9037 && contracts.cutoff === '2026-09-30'", "contracts.activePopulation === 9092 && contracts.cutoff === '2026-10-31'")
        s = s.replace('validateDemoBundle(company, {skillPopulationByCode: REVIEWED_SKILL_POPULATIONS});', "validateDemoBundle(company, {skillPopulationByCode: REVIEWED_SKILL_POPULATIONS, retainedCohorts:{ratings:{population:9037,date:'2026-09-30'},survey:{population:9037,date:'2026-09-30'}}});")
        s = s.replace('externalStarts: 4163, exits: 3526', 'externalStarts: 4334, exits: 3642')
        s = s.replace('preferences: 4519, skillProfiles: 34746, requisitions: 4979, internalFills: 619, openRequisitions: 197', 'preferences: 4450, skillProfiles: 34301, requisitions: 5145, internalFills: 649, openRequisitions: 162')
        return s
    edit('dataset-9037-offline-provider.mjs', provider)
    def preview(s):
        for name, digest in pins.items():
            s = re.sub(r"('"+re.escape(name)+r"':')[a-f0-9]+", lambda m:m[1]+digest, s)
        return s
    edit('dataset-9037-preview.server.mjs', preview)
    def joint(s):
        s = re.sub(r"(REVIEWED_9037_JOINT_DIGEST=')[a-f0-9]+",lambda m:m[1]+pins['joint-dashboard.json'],s)
        s = re.sub(r"(const fixture=')[a-f0-9]+",lambda m:m[1]+bundle['sqlite_sha256'],s)
        s = re.sub(r"(joint.sourceBundleDigest===')[a-f0-9]+",lambda m:m[1]+bundle['bundle_sha256'],s)
        s = re.sub(r"(joint.parentArtifactDigest===')[a-f0-9]+",lambda m:m[1]+sha(COMP/'aggregate-projections.json'),s)
        s = s.replace('voluntary-ytd-nine-month-average-stock-v2','voluntary-ytd-calendar-month-average-stock-v3')
        s = s.replace("joint.cutoff==='2026-09-30'","joint.cutoff==='2026-10-31'")
        s = s.replace('length:33','length:34').replace('mi<33','mi<34').replace('month<33','month<34').replace('960*32','960*33').replace('length<=99','length<=102')
        s = s.replace('hc<=9037','hc<=9092').replace('series[32]','series[33]')
        s = s.replace('900*numerator','1000*numerator').replace('calendar_months:9','calendar_months:10').replace('denominatorSum/9','denominatorSum/10')
        return s
    edit('dataset-9037-joint-dashboard.mjs', joint)
    (ROOT / 'runtime-candidate-pins.json').write_text(json.dumps(pins,indent=2)+'\n')
    print(json.dumps(dict(status='isolated runtime binding; not activated',pins=pins)))


if __name__ == '__main__':
    main()
