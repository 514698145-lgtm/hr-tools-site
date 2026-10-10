"""Prepare disposable edited files for native Calc/Excel-compatible recalculation QA."""
from pathlib import Path
from copy import deepcopy
import zipfile
import xml.etree.ElementTree as ET
import re
N={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
ET.register_namespace('',N['m'])
root=Path(__file__).resolve().parents[1]
dest=root/'reports/import-cases';dest.mkdir(exist_ok=True)
for name in ['five-insurances-housing-fund','salary-budget']:
    with zipfile.ZipFile(root/'public/downloads/import-templates'/f'{name}.xlsx') as z: parts={k:z.read(k) for k in z.namelist()}
    doc=ET.fromstring(parts['xl/worksheets/sheet1.xml']);data=doc.find('m:sheetData',N)
    def setvalue(addr,value):
        cell=doc.find(f'.//m:c[@r="{addr}"]',N)
        if cell is None:
            row=next(r for r in data if r.attrib['r']==re.search(r'\d+',addr)[0]);cell=ET.SubElement(row,'{%s}c'%N['m'],{'r':addr})
        for child in list(cell):cell.remove(child)
        if isinstance(value,str):
            cell.set('t','inlineStr');s=ET.SubElement(cell,'{%s}is'%N['m']);ET.SubElement(s,'{%s}t'%N['m']).text=value
        else:
            cell.attrib.pop('t',None);ET.SubElement(cell,'{%s}v'%N['m']).text=str(value)
    if name=='five-insurances-housing-fund':
        setvalue('F2',50000);setvalue('K2',50000)
        setvalue('G3',8)
        setvalue('D4','东莞')
        first=next(r for r in data if r.attrib['r']=='2');last=next(r for r in data if r.attrib['r']=='2001')
        for cell in first:
            if cell.attrib['r']=='B2':continue
            copy=deepcopy(cell);addr=re.sub(r'2$','2001',copy.attrib['r']);copy.set('r',addr)
            for existing in list(last):
                if existing.attrib['r']==addr:last.remove(existing)
            last.append(copy)
        setvalue('A2001','LAST-ROW');setvalue('F2001',1000);setvalue('J2001','');setvalue('K2001','')
    else:setvalue('F2',150)
    parts['xl/worksheets/sheet1.xml']=ET.tostring(doc,encoding='utf-8',xml_declaration=True)
    with zipfile.ZipFile(dest/f'{name}.xlsx','w',zipfile.ZIP_DEFLATED) as z:
        for k,v in parts.items():z.writestr(k,v)
