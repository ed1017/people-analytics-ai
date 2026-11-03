"""New modeled October register; leave both historical model versions intact."""
import json
from integrate import ROOT, LIB

responses=json.loads((ROOT/'public-projections.json').read_text())
workforce=responses['/api/workforce']
structure=responses['/api/position-structure']
assert workforce['as_of']==structure['as_of']=='2026-10-31'
assert workforce['data_meta']['bundleDigest']==structure['data_meta']['bundleDigest']
common=dict(preparation='isolated reviewed public projection; release verification pending',preparedAt='2026-11-03')
constraints=dict(kind='reviewed-synthetic-aggregate-constraints',**common,asOf=structure['as_of'],datasetToken=structure['data_meta']['datasetToken'],bundleDigest=structure['data_meta']['bundleDigest'],**{k:structure[k] for k in ['business_units','levels','job_profiles','combinations']})
marginals=dict(kind='reviewed-synthetic-workforce-marginals',**common,metadata=workforce['data_meta'],asOf=workforce['as_of'],summary={k:workforce['summary'][k] for k in ['headcount','fte','full_time_headcount','non_full_time_headcount']},**{k:workforce[k] for k in ['business_units','countries','levels']})
for name,value in [('position-inventory-constraints-october-v1.json',constraints),('company-position-marginals-v3.json',marginals)]:
    (LIB/'data'/name).write_text(json.dumps(value,separators=(',',':'))+'\n')
source=(LIB/'company-position-model-v2.ts').read_text()
source=source.replace('position-inventory-constraints-v1.json','position-inventory-constraints-october-v1.json').replace('company-position-marginals-v2.json','company-position-marginals-v3.json')
source=source.replace('MODEL_V2','MODEL_V3').replace('ModelV2','ModelV3').replace('InventoryV2','InventoryV3').replace('PositionV2','PositionV3').replace('company-position-model-v2','company-position-model-v3').replace('MODEL2-','MODEL3-')
(LIB/'company-position-model-v3.ts').write_text(source)
print(json.dumps(dict(status='new October model prepared; prior model files unchanged',headcount=marginals['summary']['headcount'],combinations=len(constraints['combinations']))))
