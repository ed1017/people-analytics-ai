"""Lossless dictionary encoding of reviewed import batches; local files only."""
from pathlib import Path
import csv,itertools,json,hashlib,re
ROOT=Path(__file__).resolve().parents[3]/'synthetic-october-candidate-20261103'
OUT=ROOT/'database-import-dictionary'
SCHEMA='workforce_october_2026'
def quote(v):return 'NULL' if v==r'\N' else "'"+v.replace("'","''")+"'"
def lit(v):return "'"+json.dumps(v,ensure_ascii=True,separators=(',',':')).replace("'","''")+"'::jsonb"
def encode(rows):
 dictionaries=[[] for _ in rows[0]];maps=[{} for _ in rows[0]];indices=[]
 for row in rows:
  rr=[]
  for i,value in enumerate(row):
   value=None if value==r'\N' else value
   if value not in maps[i]:maps[i][value]=len(dictionaries[i]);dictionaries[i].append(value)
   rr.append(maps[i][value])
  indices.append(rr)
 assert [[dictionaries[i][v] for i,v in enumerate(row)] for row in indices]==[[None if v==r'\N' else v for v in row] for row in rows]
 return dictionaries,indices
if __name__=='__main__':
 OUT.mkdir(exist_ok=False)
 manifest=json.loads((ROOT/'database-import-bounded/manifest.json').read_text());columns=json.loads((ROOT/'serving-prep/metadata/columns.json').read_text());result=[]
 for table,items in itertools.groupby(manifest,key=lambda m:m['table']):
  cols=[c for c in columns if c['schema_name']=='public' and c['table_name']==table];names=','.join('"'+c['column_name']+'"' for c in cols)
  file=ROOT/'serving-prep/generated/csv'/f'{table}.csv'
  if table=='performance_reviews':file=ROOT/'components/performance_reviews.all-active.csv'
  with file.open(newline='',encoding='utf-8') as stream:
   reader=csv.reader(stream)
   for m in items:
    rows=list(itertools.islice(reader,m['rows']));assert len(rows)==m['rows']
    statement=f'INSERT INTO {SCHEMA}."{table}" ({names}) VALUES\n'+',\n'.join('('+','.join(map(quote,row))+')' for row in rows)+';'
    assert hashlib.sha256(statement.encode()).hexdigest()==m['sha256'],m['id']
    d,r=encode(rows)
    select=[]
    for i,c in enumerate(cols):
     assert re.fullmatch(r'[a-zA-Z0-9_ (),\[\]]+',c['sql_type']),c
     select.append(f"(p.d->{i}->>((rr.row->{i})::text)::integer)::{c['sql_type']}")
    sql=f"BEGIN; SET LOCAL statement_timeout='90s'; SET LOCAL standard_conforming_strings=on;\nINSERT INTO {SCHEMA}.import_chunks(id,sha256,rows) VALUES('{m['id']}','{m['sha256']}',{m['rows']});\nWITH p AS MATERIALIZED (SELECT {lit(d)} d,{lit(r)} r) INSERT INTO {SCHEMA}.\"{table}\" ({names}) SELECT "+','.join(select)+" FROM p CROSS JOIN LATERAL jsonb_array_elements(p.r) AS rr(row);\nCOMMIT;\n"
    target=OUT/m['file'];target.write_text(sql,encoding='utf-8');result.append({**m,'originalBytes':m['bytes'],'bytes':target.stat().st_size,'transportSha256':hashlib.sha256(target.read_bytes()).hexdigest()})
   assert next(reader,None) is None,table
 (OUT/'manifest.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
 print(json.dumps({'chunks':len(result),'sourceBytes':sum(m['originalBytes'] for m in result),'encodedBytes':sum(m['bytes'] for m in result),'maxBytes':max(m['bytes'] for m in result)}))
