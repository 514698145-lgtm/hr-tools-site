"""Create an offline full-review checklist. Every entry starts pending, never passed."""
import argparse
import json
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def prepare(root=ROOT):
    manifest = json.loads((root / 'config/watch-manifest.json').read_text(encoding='utf-8'))
    records = manifest['policyRecords']
    cities = sorted({r['city'] for r in records})
    entries = []
    for tool in json.loads((root / 'config/tools.json').read_text(encoding='utf-8')):
        entries.append({'kind': 'calculator', 'id': tool['id'], 'status': 'pending-review',
                        'evidence': [], 'changes': [], 'blockers': []})
    for city in cities:
        rows = [r for r in records if r['city'] == city]
        entries.append({'kind': 'city', 'id': city, 'status': 'pending-review',
                        'fields': sorted({k for r in rows for k in r['values']}),
                        'sourceUrls': sorted({r['source']['url'] for r in rows}),
                        'evidence': [], 'changes': [], 'blockers': []})
    for item in manifest['files']:
        path = item['path']
        if path.startswith(('content/policies/', 'content/articles/', 'content/cities/', 'content/topics/')) or path.endswith(('.docx', '.xlsx')) or path in ('config/tools.json', 'public/data/tool-examples.json', 'content/guide.md', 'config/disclaimer.json'):
            entries.append({'kind': 'content-or-tool', 'id': path, 'status': 'pending-review',
                            'evidence': [], 'changes': [], 'blockers': []})
    return {'preparedAt': datetime.now(timezone(timedelta(hours=8))).isoformat(timespec='seconds'),
            'scope': 'full-inventory-not-a-semantic-review', 'cityCount': len(cities),
            'sourceCount': len(manifest['sources']), 'entries': entries,
            'instructions': '逐项检索官方新通知及核对原文，记录地区、人群、发布生效截止时间与具体字段；待核验不能当无变化，不自动修改核验日期。'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    result = prepare()
    target = args.output or ROOT / 'reports' / ('weekly-review-plan-' + result['preparedAt'][:10] + '.json')
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'cities': result['cityCount'], 'sources': result['sourceCount'],
                      'pendingEntries': len(result['entries']), 'output': str(target)}, ensure_ascii=False))
