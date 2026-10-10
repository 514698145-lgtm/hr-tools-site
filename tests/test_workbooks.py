import unittest, json, zipfile, xml.etree.ElementTree as ET
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
NS={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

class Workbooks(unittest.TestCase):
    def test_all_downloads_have_native_layout(self):
        manifest=json.loads((ROOT/'public/data/hr-template-manifest.json').read_text('utf-8'))
        excel=[t for t in manifest if t['format']=='xlsx']
        self.assertEqual(len(excel),38)
        for item in excel:
            file=ROOT/'public'/item['download'].lstrip('/')
            with self.subTest(file=file.name),zipfile.ZipFile(file) as z:
                book=ET.fromstring(z.read('xl/workbook.xml'))
                self.assertIsNotNone(book.find('s:definedNames',NS))
                sheets=[n for n in z.namelist() if n.startswith('xl/worksheets/sheet') and n.endswith('.xml')]
                self.assertEqual(len(sheets),len(item['sheets']))
                for name in sheets:
                    xml=ET.fromstring(z.read(name))
                    self.assertEqual(xml.find('s:pageSetup',NS).get('fitToWidth'),'1')
                    self.assertIsNotNone(xml.find('s:cols',NS))
                    self.assertFalse(xml.findall('.//s:c[@t="e"]',NS))
    def test_formula_exports_keep_row_references(self):
        for id,cell,needle in [('payroll-check','K36','F36'),('annual-leave','F36','D36-E36'),('timeoff-ledger','F36','B36+D36-E36'),('channel-review','M36','G36=0')]:
            with zipfile.ZipFile(ROOT/f'public/downloads/hr-templates/{id}.xlsx') as z:
                sheets=sorted(n for n in z.namelist() if n.startswith('xl/worksheets/sheet') and n.endswith('.xml'))
                xml=ET.fromstring(z.read(sheets[-1]))
                formula=xml.find(f'.//s:c[@r="{cell}"]/s:f',NS)
                self.assertIsNotNone(formula);self.assertIn(needle,formula.text)

    def test_word_forms_and_mixed_collections(self):
        manifest=json.loads((ROOT/'public/data/hr-template-manifest.json').read_text('utf-8'))
        docs=[t for t in manifest if t['format']=='docx'];self.assertEqual(len(docs),26)
        for t in docs:
            with zipfile.ZipFile(ROOT/'public'/t['download'].lstrip('/')) as z:
                doc=ET.fromstring(z.read('word/document.xml'));ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
                text=''.join(doc.itertext())
                for heading in t['sections']:self.assertIn(heading,text)
                self.assertTrue(t['previews'])
            for image in t['previews']:self.assertTrue((ROOT/'public'/image.lstrip('/')).is_file())
        for category in {t['categoryId'] for t in manifest}:
            with zipfile.ZipFile(ROOT/f'public/downloads/hr-templates/{category}-collection.zip') as z:
                self.assertEqual(len([n for n in z.namelist() if n.endswith(('.xlsx','.docx'))]),8)
