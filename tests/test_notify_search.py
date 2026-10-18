import hashlib
import json
import unittest
from unittest.mock import patch
from unittest.mock import MagicMock
from scripts.notify_search import changed_urls, submit, verify_asset, SITE


class SearchNotificationTests(unittest.TestCase):
    def sitemap(self,paths):
        return '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join('<url><loc>'+p+'</loc></url>' for p in paths)+'</urlset>'

    def manifest(self):
        return {'siteUrl':SITE,'purpose':'production','revision':'a'*40,'files':[
            {'path':'insights/article1/index.html','sha256':'new'},
            {'path':'index.html','sha256':'same'}]}

    def test_only_changed_canonical_pages_and_deduplicated(self):
        current=self.manifest()
        previous={'files':[{'path':'index.html','sha256':'same'},{'path':'insights/article1/index.html','sha256':'old'}]}
        xml=self.sitemap([SITE+'/',SITE+'/insights/article1/',SITE+'/insights/article1/'])
        self.assertEqual(changed_urls(xml,current,previous),[SITE+'/insights/article1/'])
        self.assertEqual(changed_urls(xml,current,current),[])

    def test_private_foreign_draft_and_parameter_urls_fail_closed(self):
        for url in [SITE+'/admin/',SITE+'/workspace/',SITE+'/feedback/',SITE+'/insights/draft/',SITE+'/insights/article1/?q=test','https://hrtoolkit.cn/','https://elsewhere.example/']:
            with self.subTest(url=url),self.assertRaises(ValueError):
                changed_urls(self.sitemap([url]),self.manifest(),None)
        for field,value in [('siteUrl','https://other.example'),('purpose','candidate')]:
            current=self.manifest();current[field]=value
            with self.assertRaises(ValueError):changed_urls(self.sitemap([SITE+'/']),current,None)

    def test_incomplete_or_wrong_revision_cannot_send(self):
        previous=self.manifest()
        with patch('scripts.notify_search.fetch',side_effect=[json.dumps(previous).encode(),json.dumps({'status':'uploading','revision':'a'*40}).encode()]),patch('scripts.notify_search.urlopen') as network:
            with self.assertRaises(ValueError):submit(previous,'a'*40,True)
            network.assert_not_called()
        with patch('scripts.notify_search.fetch',side_effect=[json.dumps(previous).encode(),json.dumps({'status':'complete','revision':'a'*40}).encode()]),patch('scripts.notify_search.urlopen') as network:
            with self.assertRaises(ValueError):submit(previous,'b'*40,True)
            network.assert_not_called()

    def test_missing_baseline_and_hash_mismatch_fail_before_notification(self):
        with patch('scripts.notify_search.fetch') as network:
            with self.assertRaises(ValueError):submit(None,'a'*40,True)
            network.assert_not_called()
        raw=b'expected'
        manifest={'files':[{'path':'sitemap.xml','sha256':hashlib.sha256(raw).hexdigest()}]}
        verify_asset('/sitemap.xml',raw,manifest)
        with self.assertRaises(ValueError):verify_asset('/sitemap.xml',b'stale',manifest)

    def test_receipts_do_not_claim_indexing_and_dry_run_never_posts(self):
        key='0'*32
        key_path='/indexnow-'+key+'.txt'
        sitemap=self.sitemap([SITE+'/insights/article1/']).encode()
        html=b'<meta name="robots" content="index,follow">'
        current={'siteUrl':SITE,'purpose':'production','revision':'a'*40,'files':[
            {'path':name,'sha256':hashlib.sha256(raw).hexdigest()} for name,raw in
            [('sitemap.xml',sitemap),(key_path[1:],key.encode()),('insights/article1/index.html',html)]]}
        responses={SITE+'/release-manifest.json':json.dumps(current).encode(),
                   SITE+'/deployment-state.json':b'{"status":"complete","revision":"'+b'a'*40+b'"}',
                   SITE+'/sitemap.xml':sitemap,SITE+key_path:key.encode(),SITE+'/insights/article1/':html}
        for code,expected in [(200,'received'),(202,'key-validation-pending')]:
            reply=MagicMock();reply.__enter__.return_value.status=code
            with patch('scripts.notify_search.fetch',side_effect=responses.__getitem__),patch('scripts.notify_search.Path.read_text',return_value=json.dumps({'keyFile':key_path})),patch('scripts.notify_search.urlopen',return_value=reply) as network:
                report=submit({'files':[]},'a'*40,True)
                self.assertEqual(report['status'],expected)
                self.assertFalse(report['indexingConfirmed'])
                payload=json.loads(network.call_args.args[0].data)
                self.assertEqual(payload['urlList'],[SITE+'/insights/article1/'])
        with patch('scripts.notify_search.fetch',side_effect=responses.__getitem__),patch('scripts.notify_search.Path.read_text',return_value=json.dumps({'keyFile':key_path})),patch('scripts.notify_search.urlopen') as network:
            self.assertEqual(submit({'files':[]},'a'*40)['status'],'dry-run')
            network.assert_not_called()


if __name__=='__main__':unittest.main()
