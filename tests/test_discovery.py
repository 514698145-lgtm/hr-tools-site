import json
import tempfile
import unittest
from pathlib import Path

from scripts.build_discovery import content_items, discovery_snapshot, build_discovery, tool_guide

ROOT = Path(__file__).resolve().parents[1]


class DiscoveryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cities = content_items(ROOT, 'cities')
        cls.snapshot = discovery_snapshot(ROOT, cls.cities)

    def test_city_bounds_and_scenarios_stay_in_sync_with_engine(self):
        bj = next(p for p in self.snapshot['cities'] if p['city'] == '北京')
        self.assertEqual(bj['values']['pensionMin'], 7270)
        self.assertEqual(bj['values']['fundMin'], 2540)
        low, middle, high = bj['scenarios']
        self.assertEqual((low['bases']['pension']['value'], low['bases']['fund']['value']), (7270, 4000))
        self.assertEqual((middle['bases']['pension']['value'], high['bases']['pension']['value']), (10000, 36348))

    def test_static_city_sources_and_topics_are_reachable_without_javascript(self):
        pages = {}
        def page(path, title, description, body, kind, **kwargs):
            pages[path] = body
        tools = json.loads((ROOT / 'config/tools.json').read_text(encoding='utf-8'))
        build_discovery(ROOT, page, tools, [], 'https://www.hrtoolkit.cn', self.cities, self.snapshot)
        self.assertEqual(len(pages), 12)
        self.assertIn('7,270', pages['/cities/beijing/'])
        self.assertIn('2,540', pages['/cities/beijing/'])
        self.assertIn('尚未接入', pages['/cities/shanghai/'])
        self.assertIn('target="_blank" rel="noopener noreferrer"', pages['/cities/beijing/'])
        self.assertIn('/templates/bonus-allocation/', pages['/topics/payroll-tax/'])
        self.assertIn('/cities/beijing/', pages['/cities/'])

    def test_drafts_do_not_become_public_and_examples_are_labelled(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp) / 'content/cities'
            folder.mkdir(parents=True)
            (folder / 'draft.md').write_text('---\nstatus: draft\n---\nsecret draft', encoding='utf-8')
            self.assertEqual(content_items(Path(tmp), 'cities'), [])
        guide = tool_guide('income-tax', self.snapshot['examples'])
        self.assertIn('虚构数据', guide)
        self.assertIn('3,480', guide)
        self.assertIn('tool-example-data', guide)
        self.assertNotIn('data-example-id="beijing-monthly"', guide)


if __name__ == '__main__':
    unittest.main()
