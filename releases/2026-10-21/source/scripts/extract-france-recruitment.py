"""Extract published national HTML rows; workbook is used only for occupation code labels, never aggregation."""
import pathlib,hashlib,json,sys,html.parser,zipfile,xml.etree.ElementTree as ET
HTMLSHA='9dbe93a7f33110b3b967af32ad9a840f4e106e10b50e363f9bb0592beca0d31d'
BOOKSHA='735d0443b799b4c18c145055f87244a355a48b6286ee98ddbab272491d9792e0'
class Rows(html.parser.HTMLParser):
 def __init__(self):super().__init__();self.rows=[];self.row=None;self.cell=None
 def handle_starttag(self,tag,attrs):
  if tag=='tr':self.row=[]
  if tag=='td' and self.row is not None:self.cell=''
 def handle_data(self,data):
  if self.cell is not None:self.cell+=data
 def handle_endtag(self,tag):
  if tag=='td' and self.cell is not None:self.row.append(' '.join(self.cell.split()));self.cell=None
  if tag=='tr' and self.row is not None:
   if self.row:self.rows.append(self.row)
   self.row=None

def extract(folder):
 html=(folder/'national-occupations.html').read_bytes();book=(folder/'source.xlsx').read_bytes();assert hashlib.sha256(html).hexdigest()==HTMLSHA;assert hashlib.sha256(book).hexdigest()==BOOKSHA
 parser=Rows();parser.feed(html.decode('utf-8'));ns={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
 with zipfile.ZipFile(folder/'source.xlsx') as z:
  shared=[''.join(e.itertext()) for e in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si',ns)];sheet=ET.fromstring(z.read('xl/worksheets/sheet2.xml'));labels={}
  for row in sheet.findall('m:sheetData/m:row',ns):
   cells={}
   for c in row.findall('m:c',ns):
    v=c.find('m:v',ns)
    if v is not None:cells[c.attrib['r'][:1]]=shared[int(v.text)] if c.attrib.get('t')=='s' else v.text
   if cells.get('B') in ['M2X90','M2X93','M2X92'] and cells['B'] not in labels:labels[cells['B']]={'label':cells['C'],'row':int(row.attrib['r'])}
 records=[]
 for code,projects,difficult,seasonal in [('M2X90',18330,57.4,0.7),('M2X93',4880,45.5,0.4),('M2X92',1980,40.9,1.0)]:
  candidates=[(i+1,r) for i,r in enumerate(parser.rows) if len(r)==4 and r[0]==labels[code]['label']];assert len(candidates)==1,(code,candidates);i,row=candidates[0]
  actual=[int(row[1].replace(' ','')),float(row[2].replace('%','').replace(',','.')),float(row[3].replace('%','').replace(',','.'))];assert actual==[projects,difficult,seasonal]
  records.append({'occupationCode':code,'sourceRow':i,'raw':{'occupationLabel':row[0],'recruitmentProjects':row[1],'difficultPercent':row[2],'seasonalPercent':row[3]},'recruitmentProjects':projects,'difficultRecruitmentPercent':difficult,'seasonalRecruitmentPercent':seasonal,'codeWorkbookRow':labels[code]['row']})
 return {'id':'france-travail-bmo-2026-national-it-v1','source':{'url':'https://statistiques.francetravail.org/bmo/bmo?le=0&pp=2026&ss=1','sha256':HTMLSHA,'bytes':len(html),'year':'2026','surveyPeriod':'October-December 2025','catalogueUrl':'https://www.data.gouv.fr/datasets/enquete-besoins-en-main-doeuvre-bmo','methodologyUrl':'https://statistiques.francetravail.org/bmo/static/methode_2026','licence':'Licence Ouverte / Open Licence','licenceUrl':'https://www.etalab.gouv.fr/wp-content/uploads/2014/05/Licence_Ouverte.pdf','attribution':'Source: France Travail, Enquete Besoins en Main-d oeuvre 2026. National published occupation-family results. Licence Ouverte / Open Licence. Selected rows; values unchanged.','codeWorkbookUrl':'https://www.francetravail.org/files/live/sites/peorg/files/documents/Statistiques-et-analyses/Open-data/BMO/Base-open-data-BMO-2026.xlsx','codeWorkbookSha256':BOOKSHA,'codeWorkbookSheet':'BMO_2026_open_data','method':'National values copied from the published national table; workbook used only to verify occupation code/label correspondence. No basin aggregation.'},'records':records}
if __name__=='__main__':
 result=extract(pathlib.Path(sys.argv[1]));encoded=json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n';target=pathlib.Path(sys.argv[2])
 if '--check' in sys.argv:assert target.read_bytes()==encoded.encode('utf-8')
 else:target.write_text(encoded,encoding='utf-8',newline='\n')
 print([(r['occupationCode'],r['sourceRow']) for r in result['records']])
