"""Prevent publishing stale offline policy/formula workbooks after code changes."""
from pathlib import Path
import hashlib
import json

def check_import_templates(root):
    folder=root/'public/downloads/import-templates'
    manifest=json.loads((folder/'manifest.json').read_text(encoding='utf-8'))
    assert len(manifest['files'])==7, 'Seven active tool templates are required'
    for file,expected in manifest['sourceHashes'].items():
        assert hashlib.sha256((root/file).read_bytes()).hexdigest()==expected, f'智能模板已过期，请重新构建：{file}'
    for file,expected in manifest['files'].items():
        assert hashlib.sha256((folder/file).read_bytes()).hexdigest()==expected, f'智能模板文件与清单不一致：{file}'
    return len(manifest['files'])

if __name__=='__main__':print('Current formula templates:',check_import_templates(Path(__file__).resolve().parents[1]))
