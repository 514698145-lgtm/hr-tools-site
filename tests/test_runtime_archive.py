import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
from scripts.runtime_archive import snapshot, restore, read_archive


class RuntimeArchiveTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.source = self.root / 'data'
        self.source.mkdir()
        (self.source / 'feedback.json').write_text(json.dumps({'version': 2, 'items': [], 'users': [], 'events': []}))
        (self.source / 'game.json').write_text(json.dumps({'version': 1, 'runs': []}))
        (self.source / 'admin-password.txt').write_text('test-only-secret')
        self.archive = self.root / 'backup.tar.gz'

    def tearDown(self):
        self.tmp.cleanup()

    def make_archive(self, entries):
        with tarfile.open(self.archive, 'w:gz') as archive:
            for name, raw in entries:
                member = tarfile.TarInfo(name)
                member.size = len(raw)
                archive.addfile(member, io.BytesIO(raw))

    def test_snapshot_restore_and_no_password(self):
        snapshot(self.source, self.archive)
        payload, verified = read_archive(self.archive)
        self.assertTrue(verified)
        self.assertEqual(set(payload), {'feedback.json', 'game.json'})
        destination = self.root / 'restored'
        restore(self.archive, destination)
        for name in payload:
            self.assertEqual((destination / name).read_bytes(), (self.source / name).read_bytes())
        self.assertFalse((destination / 'admin-password.txt').exists())
        with self.assertRaises(ValueError):
            restore(self.archive, destination)
        with self.assertRaises(FileExistsError):
            snapshot(self.source, self.archive)

    def test_rejects_traversal_secret_duplicate_and_link(self):
        raw = (self.source / 'feedback.json').read_bytes()
        for name in ('../feedback.json', '/feedback.json', 'admin-password.txt'):
            self.make_archive([('feedback.json', raw), (name, b'{}')])
            with self.assertRaises(ValueError):
                restore(self.archive, self.root / 'bad')
            self.assertFalse((self.root / 'bad').exists())
        self.make_archive([('feedback.json', raw), ('feedback.json', raw)])
        with self.assertRaises(ValueError):
            read_archive(self.archive)
        with tarfile.open(self.archive, 'w:gz') as archive:
            member = tarfile.TarInfo('feedback.json')
            member.type, member.linkname = tarfile.SYMTYPE, '/etc/passwd'
            archive.addfile(member)
        with self.assertRaises(ValueError):
            read_archive(self.archive)

    def test_tampering_and_invalid_schema_are_rejected_before_restore(self):
        snapshot(self.source, self.archive)
        with tarfile.open(self.archive, 'r:gz') as source:
            entries = [(m.name, source.extractfile(m).read()) for m in source]
        self.make_archive([(name, raw + b' ' if name == 'feedback.json' else raw) for name, raw in entries])
        with self.assertRaises(ValueError):
            restore(self.archive, self.root / 'bad')
        self.assertFalse((self.root / 'bad').exists())
        self.make_archive([('feedback.json', b'{"version":9}')])
        with self.assertRaises(ValueError):
            read_archive(self.archive)
        self.make_archive([('game.json', b'{"version":1,"runs":[]}')])
        with self.assertRaises(ValueError):
            read_archive(self.archive)

    def test_legacy_archive_is_explicitly_not_checksum_verified(self):
        self.make_archive([('feedback.json', (self.source / 'feedback.json').read_bytes())])
        result = restore(self.archive, self.root / 'legacy')
        self.assertFalse(result['checksumsVerified'])
