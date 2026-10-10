"""Render converted DOCX PDFs and build bounded visual QA contact sheets."""
from pathlib import Path
import json
from pypdf import PdfReader
from pdf2image import convert_from_path
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parents[1]
manifest=json.loads((root/'outputs/hr-templates/word-manifest.json').read_text('utf-8'))
report=[]
for item in manifest:
    base=root/'reports/hr-documents';pdf=PdfReader(base/(item['id']+'.pdf'));dest=base/item['id'];dest.mkdir(parents=True,exist_ok=True)
    for old in dest.glob('page-*.png'):
        if old.stem.split('-')[-1].isdigit() and int(old.stem.split('-')[-1])>len(pdf.pages):old.unlink()
    for i,page in enumerate(convert_from_path(str(base/(item['id']+'.pdf')),dpi=115)):
        page.save(dest/f'page-{i+1}.png')
    report.append({'id':item['id'],'pages':len(pdf.pages),'lastPageChars':len(pdf.pages[-1].extract_text()),'headings':item['sections']})
    print(item['id'],len(pdf.pages),len(pdf.pages[-1].extract_text()))
(root/'reports/hr-documents/layout-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf-8')
for kind,files in [('word',list((root/'reports/hr-documents').glob('*/page-*.png'))),('excel',[p for p in (root/'reports/hr-workbooks').glob('*.png') if p.stem in json.loads((root/'outputs/hr-templates/excel-designs.json').read_text('utf-8')) or p.stem.endswith('-overview')])]:
    for start in range(0,len(files),6):
        canvas=Image.new('RGB',(1500,1600),'#e8eaed');draw=ImageDraw.Draw(canvas)
        for i,path in enumerate(files[start:start+6]):
            im=Image.open(path).convert('RGB');im.thumbnail((720,470));x=(i%2)*750;y=(i//2)*530
            draw.text((x+10,y+5),path.parent.name+'/'+path.stem if kind=='word' else path.stem,fill='black');canvas.paste(im,(x+10,y+30))
        canvas.save(root/f'reports/hr-workbooks/qa-{kind}-{start//6+1}.jpg')
