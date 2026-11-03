"""Prepare a private, versioned SQL import; this script never connects to a database.

Each chunk is a transaction with a durable checksum receipt. Existing public and
preserved schemas are never updated. Constraints are installed after all chunks.
"""
from pathlib import Path
import csv, hashlib, json, re

ROOT = Path(__file__).resolve().parents[3] / 'synthetic-october-candidate-20261103'
OUT = ROOT / 'database-import-bounded'
SCHEMA = 'workforce_october_2026'

def quote(value):
    return 'NULL' if value == r'\N' else "'" + value.replace("'", "''") + "'"

def main():
    if OUT.exists():
        raise ValueError('Refusing to overwrite prepared import')
    OUT.mkdir()
    source = ROOT / 'serving-prep/generated'
    schema = (source / 'schema.sql').read_text(encoding='utf-8').replace('demo9037_v3_1', SCHEMA)
    assert 'DROP ' not in schema and 'GRANT ' not in schema
    schema += f'''\nCREATE TABLE {SCHEMA}.import_chunks(id text PRIMARY KEY,sha256 text NOT NULL,rows bigint NOT NULL,loaded_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE {SCHEMA}.import_chunks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA {SCHEMA} FROM PUBLIC,anon,authenticated;
REVOKE ALL ON SCHEMA {SCHEMA} FROM PUBLIC,anon,authenticated;
'''
    schema = 'BEGIN;\n'+schema.replace('SET search_path=', 'SET LOCAL search_path=')+'\nCOMMIT;\n'
    (OUT / 'schema.sql').write_text(schema,encoding='utf-8')
    columns = json.loads((ROOT / 'serving-prep/metadata/columns.json').read_text())
    names = sorted({c['table_name'] for c in columns if c['schema_name']=='public'})
    manifest=[]
    for table in names:
        cols=[c['column_name'] for c in columns if c['schema_name']=='public' and c['table_name']==table]
        assert re.fullmatch('[a-z_0-9]+',table) and all(re.fullmatch('[a-z_0-9]+',c) for c in cols)
        file=source/'csv'/f'{table}.csv'
        if table=='performance_reviews': file=ROOT/'components/performance_reviews.all-active.csv'
        batch=[];size=0;index=0
        def flush():
            nonlocal batch,size,index
            if not batch:return
            chunk=f'{table}-{index:04d}'
            statement=f'INSERT INTO {SCHEMA}."{table}" ('+','.join('"'+c+'"' for c in cols)+') VALUES\n'+',\n'.join(batch)+';'
            digest=hashlib.sha256(statement.encode()).hexdigest()
            sql=f"BEGIN; SET LOCAL statement_timeout='60s'; SET LOCAL standard_conforming_strings=on;\nINSERT INTO {SCHEMA}.import_chunks(id,sha256,rows) VALUES('{chunk}','{digest}',{len(batch)});\n"+statement+'\nCOMMIT;\n'
            target=OUT/(chunk+'.sql');target.write_text(sql,encoding='utf-8')
            manifest.append(dict(id=chunk,table=table,rows=len(batch),sha256=digest,file=target.name,bytes=target.stat().st_size))
            batch=[];size=0;index+=1
        with file.open(newline='',encoding='utf-8') as stream:
            for row in csv.reader(stream):
                assert len(row)==len(cols),(table,len(row),len(cols))
                encoded='('+','.join(map(quote,row))+')'
                if size+len(encoded)>700_000:flush()
                batch.append(encoded);size+=len(encoded)+2
        flush()
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    constraints = (source/'constraints.sql').read_text(encoding='utf-8').replace('demo9037_v3_1',SCHEMA)
    constraints = re.sub(r'REFERENCES ([a-z_][a-z_0-9]*)\s*\(', lambda m: 'REFERENCES '+SCHEMA+'.'+m.group(1)+' (', constraints)
    (OUT/'constraints.sql').write_text(constraints,encoding='utf-8')
    print(json.dumps(dict(chunks=len(manifest),rows=sum(x['rows'] for x in manifest),bytes=sum(x['bytes'] for x in manifest),schema=SCHEMA)))

if __name__=='__main__':main()
