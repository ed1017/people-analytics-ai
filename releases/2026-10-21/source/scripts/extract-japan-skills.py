"""Extract three approved jobtag profiles; no network. --check verifies reproducibility."""
import argparse,csv,hashlib,io,json
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--source-dir',type=Path,required=True);p.add_argument('--check',action='store_true');a=p.parse_args()
hashes={'IPD_DL_numeric_7_00.csv':'0284e82309b70fa7f7597e849c175099ab9e1ef7717e8f81d547400ec34c4e23','IPD_DL_numeric_7_00.xlsx':'a09aef2c1874200da1cda8910d5a6eebc484f183c29ed1d7458f8531575b2ffd'}
for name,h in hashes.items():
 assert hashlib.sha256((a.source_dir/name).read_bytes()).hexdigest()==h,name
rows=list(csv.reader(io.StringIO((a.source_dir/'IPD_DL_numeric_7_00.csv').read_bytes().decode('cp932'))))
labels=['Reading comprehension','Active listening','Writing','Speaking and explaining','Reading a foreign language','Listening in a foreign language','Writing in a foreign language','Speaking a foreign language','Mathematical literacy','Scientific literacy','Logic and reasoning (critical thinking)','Applying new information','Selecting and applying learning methods','Ongoing observation and evaluation','Understanding others\' reactions','Coordination with others','Persuasion','Negotiation','Instruction','Interpersonal support services','Complex problem solving','Requirements analysis (specification writing)','Customization and development','Selecting tools, machinery and equipment','Installation and configuration','Programming','Instrument monitoring','Operation and control','Maintenance inspection','Identifying causes of faults','Repair','Quality checking','Rational decision making','Analyzing business and organizational activity','Evaluating business and organizational activity','Time management','Financial resource management','Material resource management','Human resource management']
records=[]
for profile,record in [('314',320),('318',324),('325',331)]:
 row=rows[record-1];assert row[2]==profile
 skills=[]
 for i,label in enumerate(labels):
  col=i+21;variable=rows[17][col];assert variable==f'IPD_04_03_01_{i+1:03}'
  raw=row[col];assert 0<float(raw)<=7
  skills.append({'variableId':variable,'labelJa':rows[16][col],'labelEn':label,'raw':raw,'csvRecord':record,'csvColumn':col+1})
 records.append({'profileId':profile,'titleJa':row[3],'skills':skills})
data={'id':'jobtag-japan-occupational-skills-v7-selected-v1','source':{'file':'IPD_DL_numeric_7_00.csv','version':'7.00','url':'https://sgteprdstaplog01.blob.core.windows.net/web-app-contents/downloads/ver13/IPD_DL_numeric_7_00.csv','sha256':hashes['IPD_DL_numeric_7_00.csv'],'workbookSha256':hashes['IPD_DL_numeric_7_00.xlsx'],'releaseDate':'2026-03-17','internalUpdateDate':'2026-02-10','retrievedAt':'2026-11-01','catalogueUrl':'https://shigoto.mhlw.go.jp/User/download','ratingGuideUrl':'https://shigoto.mhlw.go.jp/User/about_ability','licence':'jobtag Terms of Use Article 9 (processed occupational data)','licenceUrl':'https://shigoto.mhlw.go.jp/User/tos','attribution':'Source: Japan Institute for Labour Policy and Training (JILPT), jobtag occupational information database, IPD_DL_numeric_7_00.csv, version 7.00, retrieved 2026-11-01. Processed by selecting three occupation profiles and 39 skill means, translating labels into English and adding source coordinates; not an official translation.','translationNote':'English labels are authored translations of the original Japanese skill labels; original labels are retained.','coordinates':'One-based CSV record and column; header record 17, variable IDs record 18.','sourceRange':{'min':0,'max':7},'publicAnchorRange':{'min':1,'max':7}},'records':records}
target=Path(__file__).resolve().parents[1]/'lib/data/japan-occupational-skills-v7.json'
content=json.dumps(data,ensure_ascii=False,indent=2)+'\n'
if a.check:assert target.read_text(encoding='utf-8')==content,'Fixture differs'
else:target.write_text(content,encoding='utf-8')
print('Verified 3 profiles, 117 positive skill means, both original hashes.')
