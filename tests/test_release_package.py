import json
from pathlib import Path
import tempfile
import unittest
import zipfile
from scripts.package_release import inventory, write_package, verify_package


class ReleasePackageTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.dist = self.root / 'dist'
        self.dist.mkdir()
        for name in ('index.html', '404.html', 'robots.txt', 'route-manifest.json'):
            (self.dist / name).write_text('test', encoding='utf-8')
        self.archive = self.root / 'release.zip'

    def tearDown(self):
        self.tmp.cleanup()

    def test_package_only_dist_and_reject_overwrite(self):
        (self.root / '.env').write_text('private fixture')
        result = write_package(self.dist, self.archive, {'purpose': 'candidate'})
        self.assertEqual(result['files'], 4)
        self.assertTrue(result['checksumsVerified'])
        with zipfile.ZipFile(self.archive) as archive:
            self.assertNotIn('.env', archive.namelist())
            manifest = json.loads(archive.read('release-manifest.json'))
            self.assertTrue(all('immutable' not in row['cacheControl'] for row in manifest['files']))
        with self.assertRaises(FileExistsError):
            write_package(self.dist, self.archive, {'purpose': 'candidate'})

    def test_private_file_in_dist_is_rejected(self):
        for name in ('.env', 'admin-password.txt', 'feedback.json'):
            file = self.dist / name
            file.write_text('private fixture')
            with self.assertRaises(ValueError):
                inventory(self.dist)
            file.unlink()

    def test_changed_or_extra_entry_is_rejected(self):
        write_package(self.dist, self.archive, {'purpose': 'candidate'})
        with zipfile.ZipFile(self.archive) as source:
            entries = {name: source.read(name) for name in source.namelist()}
        for altered in ({**entries, 'site/index.html': b'tampered'}, {**entries, '../extra': b'bad'}):
            with zipfile.ZipFile(self.archive, 'w') as archive:
                for name, raw in altered.items():
                    archive.writestr(name, raw)
            with self.assertRaises(ValueError):
                verify_package(self.archive)
