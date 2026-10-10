import unittest, tempfile, shutil
from pathlib import Path
from scripts.seo import SEO, validate_fields

class SeoTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
        source=Path(__file__).resolve().parents[1]/'content/seo'
        (self.root/'content/seo/pages').mkdir(parents=True)
        shutil.copy(source/'site.md',self.root/'content/seo/site.md')
        shutil.copy(source/'pages/home.md',self.root/'content/seo/pages/home.md')
        (self.root/'dist').mkdir();(self.root/'public/media').mkdir(parents=True)
    def tearDown(self):self.tmp.cleanup()
    def test_preview_cannot_be_indexed(self):
        seo=SEO(self.root);head=seo.metadata('/','Test','Description','home')
        self.assertIn('noindex,follow',head);self.assertNotIn('canonical',head)
        seo.finish(self.root/'dist');self.assertFalse((self.root/'dist/sitemap.xml').exists())
    def test_production_sitemap_exclusions_and_escape(self):
        seo=SEO(self.root,'https://example.com');seo.settings['allowIndexing']=True
        seo.metadata('/','Home','Home description','home')
        head=seo.metadata('/insights/test/','Article','desc','article',{'seoTitle':'A < B','noindex':True})
        self.assertIn('A &lt; B',head);self.assertIn('noindex',head)
        seo.metadata('/admin/','Admin','Admin','admin',{'noindex':False});seo.finish(self.root/'dist')
        xml=(self.root/'dist/sitemap.xml').read_text()
        self.assertIn('https://example.com/',xml);self.assertNotIn('/admin/',xml);self.assertNotIn('/insights/test/',xml)
    def test_unmatched_path_fails(self):
        seo=SEO(self.root)
        with self.assertRaises(ValueError):seo.finish(self.root/'dist')
    def test_invalid_fields(self):
        for d in [{'noindex':'false'},{'shareImage':'//evil.test/a.png'},{'shareImage':'/media/../a.png'},{'seoTitle':42}]:
            with self.assertRaises(ValueError):validate_fields(d)
    def test_bad_domain_rejected(self):
        with self.assertRaises(ValueError):SEO(self.root,'https://example.com/path')

if __name__=='__main__':unittest.main()
