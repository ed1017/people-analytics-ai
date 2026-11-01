"""Extract reviewed occupations from the published OGL Skills England output."""
import csv,json,hashlib,pathlib,sys
SHA='c951a2e8d38cb9be3ac7e8bd7f8d7bdd4809906083c8d56e07ed24e3032ed3ac'
CODES={'2412','1136','3544','2134','2135','2136','3552','3571','2421'}
def extract(path):
 data=path.read_bytes();assert hashlib.sha256(data).hexdigest()==SHA
 with path.open(encoding='utf-8-sig',newline='') as f:
  reader=csv.DictReader(f);rows=[];previous=reader.line_num;count=0
  for record,raw in enumerate(reader,2):
   count+=1
   if raw['soc20_unit'] in CODES: rows.append({'csvRecord':record,'physicalLineStart':previous+1,'physicalLineEnd':reader.line_num,'raw':raw})
   previous=reader.line_num
 assert count==368 and len(rows)==9 and {r['raw']['soc20_unit'] for r in rows}==CODES
 return {'id':'skills-england-occupation-demand-2025-v1','source':{'url':'https://content.explore-education-statistics.service.gov.uk/api/releases/b20e696c-8f0a-4dcc-a1e2-3cb4b963ab80/files/a8afa497-df8d-4407-905f-f2af7179f2fb','releaseUrl':'https://explore-education-statistics.service.gov.uk/find-statistics/occupations-in-demand/2025','methodologyUrl':'https://explore-education-statistics.service.gov.uk/methodology/occupations-in-demand-2025-methodology','licenceEvidenceUrl':'https://explore-education-statistics.service.gov.uk/find-statistics/occupations-in-demand/2025/explore','sha256':SHA,'bytes':len(data),'rows':count,'published':'2025-12-11','updated':'2026-01-08','year':'2025','geography':'United Kingdom; wage and hours indicators exclude Northern Ireland','licence':'Open Government Licence v3.0','licenceUrl':'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/','attribution':'Contains public sector information licensed under the Open Government Licence v3.0. Source: Skills England, Occupations in demand 2025. Modified by selecting reviewed occupation rows; source values unchanged.'},'indicatorPeriods':[{'indicator':'Visa grant density','period':'Grants Q4 2024-Q2 2025; workers July 2024-June 2025'},{'indicator':'Online job advert density','period':'Snapshot adverts Q4 2024-Q3 2025; workers July 2024-June 2025'},{'indicator':'Annual percentage change in hourly wage','period':'Year to April 2024 compared with year to April 2025'},{'indicator':'Wage premium','period':'Year to April 2025'},{'indicator':'Annual change in hours worked','period':'Year to April 2024 compared with year to April 2025'}],'records':rows}
if __name__=='__main__':
 result=extract(pathlib.Path(sys.argv[1]));encoded=json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n';target=pathlib.Path(sys.argv[2])
 if '--check' in sys.argv: assert target.read_bytes()==encoded.encode('utf-8')
 else: target.write_text(encoded,encoding='utf-8',newline='\n')
 print(len(result['records']))
