"""Consolida exportações DIEESE, índices IBGE via SGS e salários Ipeadata.
Executar com Python + xlrd. Os arquivos de origem ficam fora da pasta pública.
"""
from pathlib import Path
import re, json, gzip, hashlib, shutil
from decimal import Decimal, ROUND_HALF_UP
import xlrd

ROOT=Path(__file__).resolve().parents[1]
UPLOAD=Path('/workspace/scratch/254fade0e2bc/upload')
SCRATCH=Path('/workspace/scratch/254fade0e2bc')
SOURCES=ROOT/'scripts/sources'
SOURCES.mkdir(exist_ok=True)
states=[
 ('RO','Rondônia','Porto Velho','11',-63,-11),('AC','Acre','Rio Branco','12',-70,-9.4),
 ('AM','Amazonas','Manaus','13',-64,-4),('RR','Roraima','Boa Vista','14',-61.4,2),
 ('PA','Pará','Belém','15',-53,-4),('AP','Amapá','Macapá','16',-51.6,1.3),
 ('TO','Tocantins','Palmas','17',-48.2,-10.3),('MA','Maranhão','São Luís','21',-45,-5),
 ('PI','Piauí','Teresina','22',-42.7,-7.6),('CE','Ceará','Fortaleza','23',-39.5,-5),
 ('RN','Rio Grande do Norte','Natal','24',-36.5,-5.6),('PB','Paraíba','João Pessoa','25',-36.7,-7.1),
 ('PE','Pernambuco','Recife','26',-38,-8.5),('AL','Alagoas','Maceió','27',-36.5,-9.6),
 ('SE','Sergipe','Aracaju','28',-37.4,-10.7),('BA','Bahia','Salvador','29',-42,-12.9),
 ('MG','Minas Gerais','Belo Horizonte','31',-44.5,-18.5),('ES','Espírito Santo','Vitória','32',-40.4,-19.6),
 ('RJ','Rio de Janeiro','Rio de Janeiro','33',-42.5,-22.2),('SP','São Paulo','São Paulo','35',-48.5,-22.2),
 ('PR','Paraná','Curitiba','41',-51,-24.5),('SC','Santa Catarina','Florianópolis','42',-50,-27),
 ('RS','Rio Grande do Sul','Porto Alegre','43',-53,-29.6),('MS','Mato Grosso do Sul','Campo Grande','50',-54.9,-20.5),
 ('MT','Mato Grosso','Cuiabá','51',-56,-13.5),('GO','Goiás','Goiânia','52',-49.8,-16),
 ('DF','Distrito Federal','Brasília','53',-47.7,-15.75)]
cities={n:uf for uf,_,n,*_ in states};cities['Macaé']='RJ'
products=['Carne','Leite','Feijão','Arroz','Farinha','Batata','Tomate','Pão','Café','Banana','Açúcar','Óleo','Manteiga']
region2={'AC','AL','AP','AM','BA','CE','MA','PA','PB','PE','PI','RN','RO','RR','SE','TO'}
def cents(v):return int((Decimal(str(v))*100).quantize(Decimal('1'),rounding=ROUND_HALF_UP))
locations=[]
for p in sorted(UPLOAD.glob('*.xls')):
 s=xlrd.open_workbook(p).sheet_by_index(0)
 title=s.cell_value(0,0)
 if not title.startswith('Gasto Mensal - '):raise ValueError(title)
 city=title.split(' - ',1)[1];uf=cities[city]
 assert s.row_values(1)[1:]==['Total da Cesta']+products
 rows={};revisions={};notes=[];audit=[]
 for i in range(2,s.nrows):
  r=s.row_values(i);m=re.fullmatch(r'(\d{2})-(\d{4})( \(1\))?',str(r[0]))
  if not m:
   if r[0]:notes.append(str(r[0]))
   continue
  month=f'{m[2]}-{m[1]}'
  if not isinstance(r[1],(int,float)):continue
  values=[]
  for j,v in enumerate(r[1:]):
   if isinstance(v,(int,float)):
    if v<=0:raise ValueError((city,month,j,v))
    values.append(cents(v))
   else:
    assert j==6 and uf in region2,(city,month,j,v)
    values.append(None)
  residual=values[0]-sum(v for v in values[1:] if v is not None)
  if abs(residual)>7:audit.append({'month':month,'sumDifferenceCents':residual,'row':i+1})
  target=revisions if m[3] else rows
  assert month not in target,(city,month)
  target[month]=values
 # Recalculado isolado é referência de ponte, não um mês pesquisado adicional.
 assert rows,city
 location={'id':uf if city!='Macaé' else 'MACAE','uf':uf,'name':city,'capital':city!='Macaé',
 'rows':rows,'revisions':revisions,'first':min(rows),'last':max(rows),'count':len(rows),
 'sourceFile':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'notes':notes,'audit':audit}
 locations.append(location)
 shutil.copyfile(p,SOURCES/p.name)

h=(SCRATCH/'fetch-2.txt').read_text()
salary={}
for date,value in re.findall(r'<td[^>]*>(\d{4}\.\d{2})</td><td[^>]*>([\d.,]+)</td>',h):
 if '1994.12'<=date<='2026.07':salary[date.replace('.','-')]=cents(value.replace('.','').replace(',','.'))
assert len(salary)==380,len(salary)
assert salary['2020-01']==103900 and salary['2020-02']==104500
(SOURCES/'salary.json').write_text(json.dumps(salary))
indices={}
for key in ['inpc','ipca']:
 values=json.loads((SOURCES/(key+'.json')).read_text())
 monthly={f"{r['data'][6:]}-{r['data'][3:5]}":float(r['valor']) for r in values}
 levels={};value=100
 for month,rate in sorted(monthly.items()):
  if month=='1994-12':levels[month]=100;continue
  value*=1+rate/100;levels[month]=value
 assert len(levels)==380,(key,len(levels))
 indices[key]={'rates':monthly,'levels':levels}

raw=(SCRATCH/'fetch-0.txt').read_bytes()
geo=json.loads(gzip.decompress(raw) if raw[:2]==b'\x1f\x8b' else raw)
# Projeção equiretangular: malha oficial, simplificação apenas da precisão visual.
def project(x,y):return [round((x+74)*14+16,1),round((6-y)*14+10,1)]
shapes={}
for feature in geo['features']:
 g=feature['geometry'];polygons=g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
 parts=[]
 for polygon in polygons:
  for ring in polygon:
   parts.append('M'+'L'.join(f'{x},{y}' for x,y in [project(x,y) for x,y,*_ in ring])+'Z')
 shapes[feature['properties']['codarea']]=''.join(parts)
state_data=[{'uf':uf,'name':name,'capital':city,'path':shapes[code],'label':project(lon,lat)} for uf,name,city,code,lon,lat in states]
data={'version':2,'updatedAt':'2026-09-07','lastMonth':'2026-07','products':products,
 'locations':locations,'salary':salary,'indices':indices,'states':state_data,
 'sources':{'basket':'https://www.dieese.org.br/cesta/','salary':'https://www.ipeadata.gov.br/ExibeSerie.aspx?serid=1739471028',
 'inpc':'https://www3.bcb.gov.br/sgspub/consultarvalores/consultarValoresSeries.do?method=consultarSeries&series=188',
 'ipca':'https://www3.bcb.gov.br/sgspub/consultarvalores/consultarValoresSeries.do?method=consultarSeries&series=433',
 'map':'https://servicodados.ibge.gov.br/api/docs/malhas?versao=3'}}
(ROOT/'dist/data.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
print(json.dumps({'locations':len(locations),'capitals':sum(l['capital'] for l in locations),'observations':sum(l['count'] for l in locations),'salary':len(salary),'audit':{l['name']:l['audit'][:6] for l in locations if l['audit']}},ensure_ascii=False))
