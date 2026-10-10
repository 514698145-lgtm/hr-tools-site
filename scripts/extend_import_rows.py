raise SystemExit("已改为单Sheet填写模板；请运行 node scripts/build_import_workbooks.mjs，无需扩展离线公式。")
"""Extend artifact-authored rows without a huge in-memory calculation graph.

The artifact engine exhausted a 4 GiB heap at 200 insurance rows. Only identical
blank-row formulas/formatting are extended here; all business logic is authored
and evaluated in the artifact builder. Absolute references remain absolute.
Native recalculation and row-2001 edit tests verify the exported extension.
"""
from pathlib import Path
from copy import deepcopy
import re
import json
import hashlib
import zipfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
ET.register_namespace('', NS['m'])
REF = re.compile(r'(\$?[A-Z]{1,3})(\$?)([1-9][0-9]*)')

def shift_formula(text, delta):
    # Skip Excel string literals (including escaped double quotes).
    parts = re.split(r'("(?:[^"]|"")*")', text)
    for i in range(0, len(parts), 2):
        parts[i] = REF.sub(lambda m: m[0] if m[2] else m[1] + str(int(m[3])+delta), parts[i])
    return ''.join(parts)

for path in (ROOT/'outputs/import-templates').glob('*.xlsx'):
    with zipfile.ZipFile(path) as z:
        contents = {name:z.read(name) for name in z.namelist()}
    for name in ['xl/worksheets/sheet1.xml','xl/worksheets/sheet2.xml']:
        doc = ET.fromstring(contents[name]); data = doc.find('m:sheetData', NS)
        template = next(row for row in data if row.attrib['r']=='51')
        for existing in list(data):
            if int(existing.attrib['r'])>51: data.remove(existing)
        for rownum in range(52,2002):
            row = deepcopy(template); row.set('r', str(rownum))
            for cell in row:
                cell.set('r', re.sub(r'51$',str(rownum),cell.attrib['r']))
                formula = cell.find('m:f', NS)
                if formula is not None and formula.text:
                    formula.text = shift_formula(formula.text, rownum-51)
            data.append(row)
        dim=doc.find('m:dimension',NS)
        if dim is not None: dim.set('ref',re.sub(r'51$', '2001',dim.attrib['ref']))
        for node in doc.iter():
            if 'sqref' in node.attrib: node.set('sqref',re.sub(r'51\b','2001',node.attrib['sqref']))
        # Show stopping error dialogs as well as formula-backed error status.
        for dv in doc.findall('.//m:dataValidation',NS):
            dv.set('showErrorMessage','1');dv.set('errorStyle','stop');dv.set('showInputMessage','1')
        contents[name]=ET.tostring(doc,encoding='utf-8',xml_declaration=True)
    book=ET.fromstring(contents['xl/workbook.xml'])
    calc=book.find('m:calcPr',NS)
    if calc is None: calc=ET.SubElement(book,'{%s}calcPr'%NS['m'])
    calc.set('calcMode','auto');calc.set('fullCalcOnLoad','1');calc.set('forceFullCalc','1')
    contents['xl/workbook.xml']=ET.tostring(book,encoding='utf-8',xml_declaration=True)
    published=ROOT/'public/downloads/import-templates'/path.name
    with zipfile.ZipFile(published,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for name,data in contents.items():z.writestr(name,data)
    assert published.stat().st_size<10*1024*1024, 'Template exceeds upload size'
    path.write_bytes(published.read_bytes())
    print(path.name, published.stat().st_size)

source_files=['public/assets/city-policies.js','public/assets/input-rules.js','public/assets/contribution-engine.js','public/assets/calculators.js','public/assets/hr-tools.js','public/assets/tax-allocation.js','public/assets/operations-tools.js','public/assets/import-template.js','scripts/build_import_workbooks.mjs']
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
manifest={'rows':2000,'policyChecked':'2026-10-01','policyMonths':['2026-01','2026-12'],'sourceHashes':{p:sha(ROOT/p) for p in source_files},'files':{p.name:sha(p) for p in (ROOT/'public/downloads/import-templates').glob('*.xlsx')}}
(ROOT/'public/downloads/import-templates/manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
