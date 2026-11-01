"""Reproduce bounded O*NET 31.0 extraction from verified official CSV files."""
import csv,json,hashlib,pathlib,sys
CODES='13-1023.00 13-1082.00 13-1111.00 13-1141.00 13-1161.00 13-2011.00 13-2031.00 15-1211.00 15-1212.00 15-1241.00 15-1243.00 15-1252.00 15-1253.00 15-1255.00 15-2051.00 15-2051.01 23-1011.00 27-3031.00 41-3091.00'.split()
HASHES={'essential_skills':'68c4d31d8c55077238395dca40cc4e6d32e6a608b5474bb8264b1f98ae415bd7','transferable_skills':'f17d0419e818a3bf2f55076510c76c4aef01cc8f5aee2670d2f44f6f44ac60f7','level_scale_anchors':'7205657fb54280827d6902b94e06f95ef0b9ed10f1f9f8ed3f02779d4c7a9573','scales_reference':'bcba23858ce21ecaacbde303a8993e35d46724b4afb8c9ec2b10e04f42adcfc9'}
def extract(source):
 sources=[];tables={}
 for name,sha in HASHES.items():
  path=source/(name+'.csv'); data=path.read_bytes(); assert hashlib.sha256(data).hexdigest()==sha,name
  with path.open(encoding='utf-8-sig',newline='') as f:
   reader=csv.DictReader(f); rows=[];previous=reader.line_num
   for record,raw in enumerate(reader,2):
    rows.append({'csvRecord':record,'physicalLineStart':previous+1,'physicalLineEnd':reader.line_num,'raw':raw});previous=reader.line_num
  sources.append({'name':name,'url':'https://www.onetcenter.org/dl_files/database/db_31_0_csv/'+name+'.csv','sha256':sha,'bytes':len(data),'rows':len(rows)})
  tables[name]=rows
 ratings=[]
 for name,category in [('essential_skills','essential'),('transferable_skills','transferable')]:
  ratings.extend(dict(row,category=category) for row in tables[name] if row['raw']['O*NET-SOC Code'] in CODES)
 elements={r['raw']['Element ID'] for r in ratings}
 assert len(ratings)==1330
 for code in CODES:
  found=[r for r in ratings if r['raw']['O*NET-SOC Code']==code];assert len(found)==70 and len({r['raw']['Element ID'] for r in found})==35
 return {'id':'onet-core-skills-31-reviewed-us-v1','databaseVersion':'31.0','codes':CODES,'sources':sources,'attribution':'O*NET\u00ae Database 31.0 / U.S. Department of Labor, Employment and Training Administration. No endorsement implied. Modified by filtering to reviewed occupations and skills, retaining source fields and coordinates.','licence':'CC BY 4.0','licenceUrl':'https://creativecommons.org/licenses/by/4.0/','termsUrl':'https://www.onetcenter.org/license_db.html','ratings':ratings,'anchors':[r for r in tables['level_scale_anchors'] if r['raw']['Element ID'] in elements],'scales':[r for r in tables['scales_reference'] if r['raw']['Scale ID'] in ['IM','LV']]}
if __name__=='__main__':
 result=extract(pathlib.Path(sys.argv[1]));target=pathlib.Path(sys.argv[2]);encoded=json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n'
 if '--check' in sys.argv: assert target.read_bytes()==encoded.encode('utf-8'),'Extraction differs'
 else: target.write_text(encoded,encoding='utf-8',newline='\n')
 print(len(result['ratings']),len(result['anchors']))
