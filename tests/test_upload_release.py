import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from upload_release import validate_target


class UploadBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.manifest = {'siteUrl': 'https://hrtoolkit.cn', 'buildMode': 'production',
                         'purpose': 'candidate', 'workingTreeDirty': True,
                         'readiness': {'ready': False}}

    def test_candidate_can_only_upload_to_preflight(self):
        validate_target(self.manifest, '_preflight/534fa9b/')
        for prefix in ('', 'assets/', '../', '_preflight/../', '_preflight/534fa9b'):
            with self.assertRaises(ValueError):
                validate_target(self.manifest, prefix)

    def test_production_requires_all_packaged_gates(self):
        self.manifest.update(purpose='production', workingTreeDirty=False, readiness={'ready': True})
        validate_target(self.manifest, '')
        self.manifest['workingTreeDirty'] = True
        with self.assertRaises(ValueError):
            validate_target(self.manifest, '')
        self.manifest['workingTreeDirty'] = False
        self.manifest['readiness']['ready'] = False
        with self.assertRaises(ValueError):
            validate_target(self.manifest, '')

    def test_wrong_environment_is_never_uploaded(self):
        for field, value in [('siteUrl', 'https://example.com'), ('buildMode', 'preview')]:
            altered = {**self.manifest, field: value}
            with self.assertRaises(ValueError):
                validate_target(altered, '_preflight/534fa9b/')


if __name__ == '__main__':
    unittest.main()
