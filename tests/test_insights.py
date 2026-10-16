import unittest
from scripts.build_insights import build_insights, news_cards, pagination


class ArticleListTests(unittest.TestCase):
    def articles(self, count):
        return [dict(title=f'文章{i}', description='薪酬工具', path=f'/insights/test-{i}/', category='工具使用', publishedAt='2026-10-16') for i in range(count)]

    def test_static_pagination_has_no_duplicates_and_all_items(self):
        pages = {}
        build_insights(self.articles(25), lambda path, title, desc, body, kind: pages.update({path: body}), '')
        for base in ['/insights/', '/insights/category/2/']:
            bodies = [pages[base], pages[base+'page/2/'], pages[base+'page/3/']]
            self.assertEqual([body.count('class="news-card"') for body in bodies], [12, 12, 1])
            self.assertIn('href="'+base+'page/2/" rel="next"', bodies[0])
            self.assertIn('href="'+base+'" rel="prev"', bodies[1])
            self.assertIn('文章24', bodies[2])
            self.assertIn('文章24', bodies[0].split('id="article-search-data">')[1])

    def test_empty_category_small_lists_and_safe_search_payload(self):
        items = self.articles(1); items[0]['title'] = '</script><script>alert(1)</script>'
        pages = {};build_insights(items, lambda path, title, desc, body, kind: pages.update({path: body}), '')
        self.assertNotIn('/insights/page/2/', pages)
        self.assertNotIn('aria-label="文章分页"', pages['/insights/'])
        self.assertIn('这个分类还没有文章', pages['/insights/category/0/'])
        self.assertNotIn('</script><script>alert', pages['/insights/'])
        self.assertIn('\\u003c/script>', pages['/insights/'])
        self.assertNotIn('<strong>01</strong>', news_cards(items))

    def test_long_archives_keep_pager_bounded(self):
        p = pagination('/insights/', 500, 1000)
        self.assertIn('page/501/', p);self.assertIn('aria-current="page">500', p)
        self.assertLess(p.count('href='), 11)
