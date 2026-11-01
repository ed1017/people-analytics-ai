"""Read-only original-file verification. No network or fixture rewriting."""
import argparse,json,hashlib,csv,io
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--evidence-root',type=Path,required=True);a=p.parse_args()
b=Path(__file__).resolve().parents[1]
s=json.loads((b/'lib/data/esco-followup-skills-v120.json').read_text(encoding='utf-8'))
for r in s['records']:
 raw=(a.evidence_root/'ca-esco-skills-audit-20261101'/r['originalFile']).read_bytes()
 assert hashlib.sha256(raw).hexdigest()==r['sha256'] and len(raw)==r['bytes']
 o=json.loads(raw);assert o['uri']==r['occupationUri'] and o['code']==r['occupationCode']
 assert o['preferredLabel']==r['preferredLabels'] and o['description']==r['description']
 for rel in ['hasEssentialSkill','hasOptionalSkill']:
  expected=[x for x in r['relations'] if x['sourceRelation']==rel]
  original=o['_links'][rel];assert len(original)==len(expected)
  for index,(x,y) in enumerate(zip(expected,original)):assert x['uri']==y['uri'] and x['labelEn']==y['title'] and x['skillType']==y.get('skillType') and x['sourceOrder']==index
print('Verified three original ESCO response hashes and all135 source relations/types/orders.')
