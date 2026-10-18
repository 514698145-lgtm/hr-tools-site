import json
from pathlib import Path
import tempfile
import unittest
from scripts.article_layout import render_article_body, article_redirects, article_contents, related_reading


class ArticleLayoutTests(unittest.TestCase):
    def test_contents_matches_stable_heading_ids_and_escapes_labels(self):
        html = render_article_body('## 重复标题\n\n正文\n\n## 重复标题\n\n## A & B\n\n### FAQ问题')
        toc = article_contents(html)
        for n in range(1,4):
            self.assertIn(f'id="article-section-{n}"',html)
            self.assertIn(f'href="#article-section-{n}"',toc)
        self.assertIn('A &amp; B',toc)
        self.assertNotIn('FAQ问题',toc)
        self.assertNotIn(' open',toc)
        self.assertEqual(article_contents(render_article_body('## 短文')), '')

    def test_reading_excludes_self_unrelated_and_limits_to_two(self):
        current={'path':'/insights/article1/','category':'政策','tags':['薪酬'],'relatedTools':['income-tax']}
        candidates=[current]
        for n,category,tags,tools in [(2,'实务',['薪酬'],[]),(3,'政策',[],[]),(4,'其他',[],[]),(5,'实务',[],['income-tax'])]:
            candidates.append({'path':f'/insights/article{n}/','title':f'文章{n}','category':category,'tags':tags,'relatedTools':tools,'publishedAt':'2026-10-18'})
        html=related_reading(current,candidates)
        self.assertIn('/insights/article2/',html)
        self.assertIn('/insights/article5/',html)
        for n in (1,3,4): self.assertNotIn(f'/insights/article{n}/',html)
        self.assertEqual(related_reading(current,[current,candidates[3]]),'')

    def test_external_labels_retained_internal_links_work_and_figcaption_is_semantic(self):
        body = '[官方通知](https://gov.example/file)与[本站工具](/tools/income-tax/)。\n\n![图像描述](/media/picture.jpg)\n\n*图：授权素材，非活动现场。*'
        html = render_article_body(body)
        self.assertIn('官方通知', html)
        self.assertNotIn('gov.example', html)
        self.assertIn('href="/tools/income-tax/"', html)
        self.assertIn('alt="图像描述"', html)
        self.assertIn('<figcaption>图：授权素材，非活动现场。</figcaption>', html)
        self.assertEqual(html.count('<figure'), 1)
        self.assertEqual(html.count('授权素材'), 1)
        self.assertNotIn('<em>', html)

    def test_no_protocol_relative_external_links_or_remote_images(self):
        html = render_article_body('[外站](//example.com) [发邮件](mailto:contact@example.com) [锚点](#faq)')
        self.assertNotIn('example.com', html)
        self.assertIn('href="#faq"', html)
        with self.assertRaises(ValueError):
            render_article_body('![外图](https://example.com/p.jpg)')

    def test_redirect_skips_draft_and_rejects_missing_target_or_chain(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root/'config').mkdir()
            (root/'content/articles').mkdir(parents=True)
            (root/'content/articles/article1.md').touch()
            path = root/'config/article-redirects.json'
            path.write_text(json.dumps({'/insights/old/':'/insights/article1/'}))
            self.assertEqual(article_redirects(root,set()), {})
            self.assertEqual(article_redirects(root,{'/insights/article1/'}), {'/insights/old/':'/insights/article1/'})
            for target in ['/insights/article2/', '/insights/another-redirect/', 'https://example.com/']:
                path.write_text(json.dumps({'/insights/old/':target}))
                with self.assertRaises(ValueError):
                    article_redirects(root,{'/insights/article1/'})
