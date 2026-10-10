"""Apply native print settings absent from artifact-tool's supported API, then publish assets.
Does not author cells, formulas or styles. OOXML validation also checks exported formulas.
"""
from pathlib import Path
import json, zipfile, xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main'
ET.register_namespace('',NS)
q=lambda name:f'{{{NS}}}{name}'
excel=json.loads((ROOT/'outputs/hr-templates/excel-manifest.json').read_text(encoding='utf-8'))
word=json.loads((ROOT/'outputs/hr-templates/word-manifest.json').read_text(encoding='utf-8'))
manifest=excel+word
target=ROOT/'public/downloads/hr-templates'
target.mkdir(parents=True,exist_ok=True)

def publish(filename,items):
 source=ROOT/'outputs/hr-templates'/filename
 with zipfile.ZipFile(source) as z: files={name:z.read(name) for name in z.namelist()}
 wb=ET.fromstring(files['xl/workbook.xml'])
 names=wb.find(q('definedNames'))
 if names is None:
  names=ET.Element(q('definedNames'))
  sheets=wb.find(q('sheets'));wb.insert(list(wb).index(sheets)+1,names)
 for existing in list(names):
  if existing.get('name') in ('_xlnm.Print_Area','_xlnm.Print_Titles'):names.remove(existing)
 for i,t in enumerate(items):
  name=f'xl/worksheets/sheet{i+1}.xml';sheet=ET.fromstring(files[name])
  prop=sheet.find(q('sheetPr'))
  if prop is None:prop=ET.Element(q('sheetPr'));sheet.insert(0,prop)
  page=prop.find(q('pageSetUpPr'))
  if page is None:page=ET.SubElement(prop,q('pageSetUpPr'))
  page.set('fitToPage','1')
  for tag in ['printOptions','pageMargins','pageSetup']:
   old=sheet.find(q(tag))
   if old is not None:sheet.remove(old)
  # Insert in OOXML schema order, before drawings/table parts.
  index=next((j for j,n in enumerate(sheet) if n.tag.rsplit('}',1)[-1] in ['headerFooter','rowBreaks','colBreaks','customProperties','cellWatches','ignoredErrors','smartTags','drawing','legacyDrawing','legacyDrawingHF','picture','oleObjects','controls','webPublishItems','tableParts','extLst']),len(sheet))
  for offset,el in enumerate([
   ET.Element(q('printOptions'),{'horizontalCentered':'1'}),
   ET.Element(q('pageMargins'),{'left':'0.25','right':'0.25','top':'0.35','bottom':'0.35','header':'0.15','footer':'0.15'}),
   ET.Element(q('pageSetup'),{'paperSize':'9' if t['kind']=='overview' else '8','orientation':'landscape','fitToWidth':'1','fitToHeight':'1' if t['kind']=='form' else '0'})]):sheet.insert(index+offset,el)
  # Forms: A4 portrait; wide ledgers: A3 landscape, repeat the column heading.
  title="'"+t['title'].replace("'","''")+"'"
  ET.SubElement(names,q('definedName'),{'name':'_xlnm.Print_Area','localSheetId':str(i)}).text=f'{title}!$A$1:${t["lastColumn"]}${t["lastRow"]}'
  if t['kind']=='ledger':ET.SubElement(names,q('definedName'),{'name':'_xlnm.Print_Titles','localSheetId':str(i)}).text=f'{title}!$7:$7'
  for cell in sheet.findall('.//'+q('c')):
   if cell.get('t')=='e':raise ValueError(f'{filename}: error cell {cell.get("r")}')
  if t['formulaColumns'] and not sheet.findall('.//'+q('f')):raise ValueError(filename+' missing formulas')
  files[name]=ET.tostring(sheet,encoding='utf-8',xml_declaration=True)
 calc=wb.find(q('calcPr'))
 if calc is None:calc=ET.SubElement(wb,q('calcPr'))
 calc.set('calcMode','auto');calc.set('fullCalcOnLoad','1')
 files['xl/workbook.xml']=ET.tostring(wb,encoding='utf-8',xml_declaration=True)
 with zipfile.ZipFile(source,'w',zipfile.ZIP_DEFLATED) as z:
  for name,data in files.items():z.writestr(name,data)
 (target/filename).write_bytes(source.read_bytes())

for t in excel:
 publish(t['id']+'.xlsx',t['sheets'])
 t['previews']=[f'/media/templates/{t["id"]}-overview.png'] if len(t['sheets'])>1 else []
 t['previews'].append(f'/media/templates/{t["id"]}.png')
 for url in t['previews']:
  dest=ROOT/'public'/url.lstrip('/');dest.parent.mkdir(exist_ok=True,parents=True);dest.write_bytes((ROOT/'reports/hr-workbooks'/dest.name).read_bytes())
for t in word:
 (target/(t['id']+'.docx')).write_bytes((ROOT/'outputs/hr-templates/word-current'/(t['id']+'.docx')).read_bytes())
 pages=sorted((ROOT/'reports/hr-documents'/t['id']).glob('page-*.png'))
 if not pages:raise ValueError('Missing rendered Word pages: '+t['id'])
 t['previews']=[]
 for i,img in enumerate(pages):
  filename=t['id']+('' if i==0 else '-page-'+str(i+1))+'.png'
  (ROOT/'public/media/templates'/filename).write_bytes(img.read_bytes());t['previews'].append('/media/templates/'+filename)
 t['pages']=len(pages)
for t in manifest:t['download']='/downloads/hr-templates/'+t['id']+'.'+t['format']
for category in dict.fromkeys(t['categoryId'] for t in manifest):
 with zipfile.ZipFile(target/(category+'-collection.zip'),'w',zipfile.ZIP_DEFLATED) as z:
  for t in manifest:
   if t['categoryId']==category:z.write(target/(t['id']+'.'+t['format']),t['title']+'.'+t['format'])
  z.writestr('使用说明.txt','本分类含8份原创工作模板。Word用于填写签批，Excel用于台账与计算。请先阅读每份文件的说明，公式单元格不要覆盖。模板不是官方制式或法律文书。')
(ROOT/'public/data/hr-template-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n','utf-8')
print('Published',len(excel),'Excel workbooks,',len(word),'Word documents and 8 ZIP collections.')
