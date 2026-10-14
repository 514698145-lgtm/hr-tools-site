"""Deterministic source inventory. No network and no rewriting policy values."""
import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit
from check_content import parse_article

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / 'config/watch-manifest.json'


def build(root=ROOT):
    paths = set()
    for folder in ('content', 'config', 'public/data', 'public/assets', 'scripts'):
        for p in (root / folder).rglob('*'):
            if p.is_file() and p.suffix in ('.md', '.json', '.js', '.py', '.mjs', '.css'):
                if p.name not in ('watch-manifest.json',) and '__pycache__' not in p.parts:
                    paths.add(p)
    # Binary workbooks/forms are part of the inventory too; the scheduled agent reviews
    # their business rules, while checksums detect changed local editions.
    paths.update((root / 'public/downloads').rglob('*.docx'))
    paths.update((root / 'public/downloads').rglob('*.xlsx'))
    sources, files, reviews = {}, [], []
    for p in sorted(paths):
        rel = p.relative_to(root).as_posix()
        raw = p.read_bytes()
        text = '' if p.suffix in ('.docx', '.xlsx') else raw.decode('utf-8-sig')
        # Normalize text endings so Linux CI and Windows generate identical inventories.
        normalized = text.replace('\r\n', '\n').encode() if text else raw
        files.append({'path': rel, 'sha256': hashlib.sha256(normalized).hexdigest()})
        if p.suffix == '.md' and text.startswith('---'):
            meta, _ = parse_article(text)
            reviews.append({'path': rel, 'status': meta.get('status'), 'checkedAt': str(meta.get('checkedAt') or ''), 'reviewAfter': str(meta.get('reviewAfter') or '')})
        # Only published source materials generate fetch targets (not scripts or CSS).
        if rel.startswith('scripts/') or p.suffix == '.css':
            continue
        for match in re.findall(r'https?://[^\s<>"\'`\)\]\\]+', text):
            url = match.rstrip('.,;，。；')
            try:
                parsed = urlsplit(url)
                if parsed.username or not parsed.hostname or parsed.hostname.endswith(('.test', '.invalid', '.example', 'example.com', 'trycloudflare.com')) or parsed.hostname in ('localhost', '127.0.0.1', 'schemas.openxmlformats.org', 'schemas.microsoft.com', 'www.w3.org', 'schema.org'):
                    continue
                url = urlunsplit((parsed.scheme, parsed.netloc, parsed.path, parsed.query, ''))
                sources.setdefault(url, set()).add(rel)
            except ValueError:
                continue
    records = json.loads(subprocess.check_output(['node', str(root/'scripts/export-policy-records.mjs')], cwd=root))
    directories = json.loads((root/'public/data/official-sites.json').read_text(encoding='utf-8-sig'))
    discovery = {x['url'] for x in directories}
    return {'schema': 1, 'files': files, 'reviews': reviews, 'policyRecords': records,
            'sources': [{'url': url, 'files': sorted(owners), 'discovery': url in discovery,
                         'authority': 'official-domain' if urlsplit(url).hostname.endswith('.gov.cn') else 'manual-verification-required'}
                        for url, owners in sorted(sources.items())],
            'discoveryTasks': [{'region': city, 'topics': ['养老/失业/工伤基数和比例', '医保/生育/固定附加费及人员类型', '公积金上下限/比例/取整/新旧人员分支']}
                               for city in sorted({r['city'] for r in records})]}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    result = build()
    rendered = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
    if args.check:
        if not TARGET.exists() or TARGET.read_text(encoding='utf-8') != rendered:
            raise SystemExit('Source inventory is stale: run scripts/build_watch_manifest.py')
    else:
        TARGET.write_text(rendered, encoding='utf-8')
    print(json.dumps({'files': len(result['files']), 'sources': len(result['sources']), 'cities': len(result['discoveryTasks'])}))
