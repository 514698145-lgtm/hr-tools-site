import copy
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from build_services import build_services, launch_issues
from check_content import parse_article

ROOT = Path(__file__).resolve().parents[1]


class ServiceLaunchTests(unittest.TestCase):
    def setUp(self):
        self.data, _ = parse_article((ROOT / 'content/enterprise-services.md').read_text(encoding='utf-8-sig'))
        self.data['showOfficialIntroLinks'] = False
        self.data['launchConfirmed'] = True
        for item in self.data['services']:
            item['source'] = ''

    def test_approved_omission_keeps_all_services_and_contact_actions(self):
        self.assertEqual(launch_issues(self.data), [])
        pages = []
        with patch('build_services.parse_article', return_value=(self.data, '')):
            build_services(ROOT, lambda *args, **kwargs: pages.append(args), production=True)
        html = pages[0][3]
        self.assertEqual(html.count('class="enterprise-card"'), 5)
        self.assertEqual(html.count('href="' + self.data['consultationFormUrl'] + '"'), 6)
        self.assertNotIn('官网介绍 ↗', html)
        self.assertIn(self.data['contactPhone'], html)

    def test_enabling_links_or_removing_approval_still_blocks(self):
        for enabled in (True, 'false', None):
            data = copy.deepcopy(self.data)
            data['showOfficialIntroLinks'] = enabled
            self.assertTrue(launch_issues(data))
        data = copy.deepcopy(self.data)
        del data['showOfficialIntroLinks']
        self.assertTrue(launch_issues(data))
        for key in ('launchConfirmed', 'consultationFormUrl', 'contactPhone', 'contactEmail'):
            data = copy.deepcopy(self.data)
            data[key] = False if key == 'launchConfirmed' else ''
            self.assertTrue(launch_issues(data), key)
