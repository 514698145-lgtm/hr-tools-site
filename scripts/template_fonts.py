"""Normalize Office typography without changing document content or workbook formulas."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json
from lxml import etree as E

FONT = 'Noto Sans CJK SC'
W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
S = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
def q(ns,tag): return '{'+ns+'}'+tag

def normalize(path):
    with ZipFile(path) as z: parts={n:z.read(n) for n in z.namelist()}
    original=dict(parts)
    for name,data in list(parts.items()):
        if not name.endswith('.xml'): continue
        if not name.startswith(('word/','xl/')): continue
        root=E.fromstring(data);changed=False
        if name.startswith('word/') and not name.startswith('word/theme/'):
            # Explicit script slots prevent Latin, numerals and Chinese from using different families.
            for r in root.iter(q(W,'r')):
                pr=r.find(q(W,'rPr'))
                if pr is None: pr=E.Element(q(W,'rPr'));r.insert(0,pr)
                if pr.find(q(W,'rFonts')) is None:pr.insert(0,E.Element(q(W,'rFonts')))
            for fonts in root.iter(q(W,'rFonts')):
                fonts.attrib.clear()
                for key in ('ascii','hAnsi','eastAsia','cs'):fonts.set(q(W,key),FONT)
                changed=True
            for pr in root.iter(q(W,'rPr')):
                bold=pr.find(q(W,'b'))
                if bold is not None:
                    cs=pr.find(q(W,'bCs'))
                    if cs is None:cs=E.SubElement(pr,q(W,'bCs'))
                    cs.set(q(W,'val'),bold.get(q(W,'val'),'1'));changed=True
            if name=='word/styles.xml':
                for st in root.findall(q(W,'style')):
                    # CJK font metrics are taller; use explicit, non-clipping leading.
                    leading={'Normal':300,'Title':720,'Heading2':360}.get(st.get(q(W,'styleId')))
                    if leading:
                        pp=st.find(q(W,'pPr'))
                        if pp is None:pp=E.Element(q(W,'pPr'));st.insert(0,pp)
                        spacing=pp.find(q(W,'spacing'))
                        if spacing is None:spacing=E.SubElement(pp,q(W,'spacing'))
                        spacing.set(q(W,'line'),str(leading));spacing.set(q(W,'lineRule'),'exact')
                    pr=st.find(q(W,'rPr'))
                    if pr is None:pr=E.SubElement(st,q(W,'rPr'))
                    fonts=pr.find(q(W,'rFonts'))
                    if fonts is None:fonts=E.Element(q(W,'rFonts'));pr.insert(0,fonts)
                    fonts.attrib.clear()
                    for key in ('ascii','hAnsi','eastAsia','cs'):fonts.set(q(W,key),FONT)
                    for tag in ('i','iCs'):
                        el=pr.find(q(W,tag))
                        if el is None:el=E.SubElement(pr,q(W,tag))
                        el.set(q(W,'val'),'0')
                    if st.get(q(W,'styleId')) in ('Normal','Title','Header','Footer'):
                        for tag in ('b','bCs'):
                            el=pr.find(q(W,tag))
                            if el is None:el=E.SubElement(pr,q(W,tag))
                            el.set(q(W,'val'),'0')
                changed=True
            if name=='word/fontTable.xml':
                for child in list(root):root.remove(child)
                f=E.SubElement(root,q(W,'font'));f.set(q(W,'name'),FONT)
                fam=E.SubElement(f,q(W,'family'));fam.set(q(W,'val'),'swiss');changed=True
        if name.startswith('xl/'):
            for font in root.iter(q(S,'font')):
                n=font.find(q(S,'name'))
                if n is None:n=E.Element(q(S,'name'));font.insert(0,n)
                n.set('val',FONT)
                for child in list(font):
                    if E.QName(child).localname in ('scheme','charset'):font.remove(child)
                changed=True
            for font in root.iter(q(S,'rFont')):font.set('val',FONT);changed=True
        if '/theme/' in name or name.startswith('xl/drawings/') or name.startswith('xl/charts/'):
            for el in root.iter():
                if el.tag in [q(A,t) for t in ('latin','ea','cs','font')]:
                    el.set('typeface',FONT);changed=True
        if changed:parts[name]=E.tostring(root,encoding='UTF-8',xml_declaration=True,standalone=True)
    # Spreadsheet cell data, cached results, validations and print settings remain byte-identical.
    if path.suffix=='.xlsx':
        for name,data in original.items():
            if name.startswith('xl/worksheets/') or name=='xl/workbook.xml':
                assert parts[name]==data, (path,name)
    if parts!=original:
        temp=path.with_suffix(path.suffix+'.tmp')
        with ZipFile(temp,'w',ZIP_DEFLATED) as z:
            for name,data in parts.items():z.writestr(name,data)
        temp.replace(path)
    return parts!=original

def normalize_library(root):
    catalog=json.loads((root/'public/data/hr-template-manifest.json').read_text('utf-8'))
    report=[]
    for item in catalog:
        file=root/'public'/item['download'].lstrip('/')
        if not file.resolve().is_relative_to((root/'public/downloads/hr-templates').resolve()):raise ValueError('Invalid path')
        normalize(file)
        # Keep editable generator outputs consistent for later republishing.
        output=root/'outputs/hr-templates'/('word-current' if file.suffix=='.docx' else '')/file.name
        if output.exists():normalize(output)
        report.append({'id':item['id'],'format':file.suffix,'font':FONT})
    (root/'reports/template-fonts.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf-8')
    return len(report)

if __name__=='__main__':print('Normalized',normalize_library(Path(__file__).resolve().parents[1]),'templates')
