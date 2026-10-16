import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from upload_release import validate_target, safe_diagnostic, unchanged_paths
from unittest.mock import patch


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

    def test_diagnostics_redact_secrets_and_signed_urls(self):
        with patch.dict('os.environ', {'ALIBABA_CLOUD_SECURITY_TOKEN': 'private+token/123'}):
            result = safe_diagnostic('Request https://example.com/?signature=private; private+token/123; private%2Btoken%2F123')
            self.assertNotIn('private', result)
            self.assertNotIn('https://', result)

    def test_interrupted_upload_disables_deduplication(self):
        record = {'path': 'font.woff2', 'bytes': 3, 'sha256': 'abc',
                  'contentType': 'font/woff2', 'cacheControl': 'no-cache'}
        old = {'revision': 'old', 'files': [record]}
        incoming = {'files': [record]}
        self.assertEqual(unchanged_paths(incoming, old, {'status': 'complete', 'revision': 'old'}), {'font.woff2'})
        self.assertFalse(unchanged_paths(incoming, old, {'status': 'uploading', 'revision': 'new'}))
        self.assertFalse(unchanged_paths(incoming, old, {'status': 'complete', 'revision': 'other'}))
        changed_type = {'files': [{**record, 'contentType': 'application/octet-stream'}]}
        self.assertFalse(unchanged_paths(changed_type, old, {'status': 'complete', 'revision': 'old'}))


if __name__ == '__main__':
    unittest.main()
