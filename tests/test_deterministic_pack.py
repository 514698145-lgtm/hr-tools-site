import io
import os
from pathlib import Path
import sys
import tempfile
import unittest
from zipfile import ZipFile

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from build_template_packs import add_file


class DeterministicPackTests(unittest.TestCase):
    def test_checkout_timestamps_do_not_change_bundle(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'font.txt'
            source.write_bytes(b'unchanged licensed font fixture')
            def pack():
                output = io.BytesIO()
                with ZipFile(output, 'w') as archive:
                    add_file(archive, source, 'font.txt')
                return output.getvalue()
            first = pack()
            os.utime(source, (1800000000, 1800000000))
            self.assertEqual(pack(), first)
            source.write_bytes(b'new font contents')
            self.assertNotEqual(pack(), first)
