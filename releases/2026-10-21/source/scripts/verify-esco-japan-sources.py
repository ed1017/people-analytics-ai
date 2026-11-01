"""Read-only original-file verification. No network or fixture rewriting."""
import argparse,json,hashlib,csv,io
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--evidence-root',type=Path,required=True);a=p.parse_args()
b=Path(__file__).resolve().parents[1]
s=json.loads((b/'lib/data/esco-germany-skills-v120.json').read_text(encoding='utf-8'))
for r in s['records']:
 raw=(a.evidence_root/'ca-esco-skills-audit-20261101'/r['originalFile']).read_bytes()
 assert hashlib.sha256(raw).hexdigest()==r['sha256'] and len(raw)==r['bytes']
 o=json.loads(raw);assert o['uri']==r['occupationUri'] and o['code']==r['occupationCode']
 assert o['preferredLabel']==r['preferredLabels'] and o['description']==r['description']
 for rel in ['hasEssentialSkill','hasOptionalSkill']:
  expected=[x for x in r['relations'] if x['sourceRelation']==rel]
  original=o['_links'][rel];assert len(original)==len(expected)
  for index,(x,y) in enumerate(zip(expected,original)):assert x['uri']==y['uri'] and x['labelEn']==y['title'] and x['skillType']==y.get('skillType') and x['sourceOrder']==index
j=json.loads((b/'lib/data/japan-data-architect-skills-v7.json').read_text(encoding='utf-8'))
raw=(a.evidence_root/'jp-br-nonpay-20261101'/'IPD_DL_numeric_7_00.csv').read_bytes();assert hashlib.sha256(raw).hexdigest()==j['sourceSha256']
rows=list(csv.reader(io.StringIO(raw.decode('cp932'))));row=rows[j['csvRecord']-1];assert row[2]=='523'
for x in j['skills']:assert row[x['column']-1]==x['raw'] and rows[16][x['column']-1]==x['nameJa'] and rows[17][x['column']-1]==x['id']
print('Verified four original ESCO hashes, exact relations and 39 original Japan523 means.')
