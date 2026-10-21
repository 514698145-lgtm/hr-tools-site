"""Notify IndexNow of changed public canonical pages after a verified release.

This is URL discovery, not a claim of indexing, ranking or AI citation.
The protocol ownership file is public by design; no account credential is used.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import sys
from urllib.error import HTTPError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SITE = 'https://www.hrtoolkit.cn'
ENDPOINT = 'https://api.indexnow.org/indexnow'


def fetch(url):
    with urlopen(Request(url, headers={'User-Agent':'HRToolkit-ReleaseNotifier/1.0'}), timeout=30) as response:
        if response.url != url:
            raise ValueError('Unexpected redirect while verifying release')
        return response.read()


def changed_urls(sitemap, current, previous):
    if current.get('siteUrl') != SITE or current.get('purpose') != 'production':
        raise ValueError('Only the production website may be submitted')
    records = {r['path']:r['sha256'] for r in current['files']}
    old = {r['path']:r['sha256'] for r in (previous or {}).get('files', [])}
    result = []
    for node in ET.fromstring(sitemap).findall('.//{*}loc'):
        url = node.text or ''
        parsed = urlsplit(url)
        if parsed.scheme != 'https' or parsed.netloc != 'www.hrtoolkit.cn' or parsed.query or parsed.fragment:
            raise ValueError('Sitemap includes a noncanonical host or URL')
        if (not parsed.path.startswith('/') or '//' in parsed.path or '%' in parsed.path
                or any(p in ('..','.','admin','workspace','feedback','api','_preflight') for p in parsed.path.split('/'))):
            raise ValueError('Sitemap includes a private or unsafe route')
        key = parsed.path.lstrip('/') + ('index.html' if parsed.path.endswith('/') else '')
        if key not in records:
            raise ValueError('Sitemap route absent from release')
        if records[key] != old.get(key):
            result.append(url)
    return sorted(set(result))


def verify_asset(path, data, manifest):
    records = {r['path']:r['sha256'] for r in manifest['files']}
    key = path.lstrip('/') + ('index.html' if path.endswith('/') else '')
    if hashlib.sha256(data).hexdigest() != records.get(key):
        raise ValueError('Live asset differs from verified release: '+path)


def submit(previous, revision, send=False):
    if not previous or not isinstance(previous.get('files'), list):
        raise ValueError('Previous release inventory unavailable; notification was not sent')
    current = json.loads(fetch(SITE+'/release-manifest.json'))
    state = json.loads(fetch(SITE+'/deployment-state.json'))
    if state.get('status') != 'complete' or state.get('revision') != current.get('revision'):
        raise ValueError('Production deployment has not completed')
    if current.get('revision') != revision:
        raise ValueError('Production revision differs from requested revision')
    sitemap = fetch(SITE+'/sitemap.xml')
    verify_asset('/sitemap.xml', sitemap, current)
    urls = changed_urls(sitemap, current, previous)
    report = {'checkedAt':datetime.now(timezone.utc).isoformat(), 'revision':revision,
              'urls':urls,'count':len(urls),'status':'dry-run','indexingConfirmed':False}
    if not urls:
        report['status'] = 'no-changes'
        return report
    config = json.loads((ROOT/'config/search-notification.json').read_text(encoding='utf-8'))
    key_path = config['keyFile']
    if not re.fullmatch(r'/indexnow-[a-f0-9]{32}\.txt', key_path):
        raise ValueError('Invalid protocol verification path')
    raw_key = fetch(SITE+key_path)
    verify_asset(key_path, raw_key, current)
    key = raw_key.decode('utf-8').strip()
    if not re.fullmatch(r'[a-f0-9]{32}', key):
        raise ValueError('Invalid protocol verification content')
    for url in urls:
        raw = fetch(url)
        verify_asset(urlsplit(url).path, raw, current)
        if not re.search(rb'<meta name="robots" content="index,follow"', raw):
            raise ValueError('Refusing to submit a noindex page')
    if not send:
        return report
    payload = {'host':'www.hrtoolkit.cn','key':key,'keyLocation':SITE+key_path,'urlList':urls}
    request = Request(ENDPOINT, data=json.dumps(payload).encode('utf-8'),
                      headers={'Content-Type':'application/json; charset=utf-8'}, method='POST')
    with urlopen(request, timeout=30) as response:
        code = response.status
    if code not in (200,202):
        raise ValueError('Unexpected IndexNow response')
    report.update(httpStatus=code,status='received' if code==200 else 'key-validation-pending')
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['capture','submit'])
    parser.add_argument('--previous',type=Path)
    parser.add_argument('--revision')
    parser.add_argument('--send',action='store_true')
    parser.add_argument('--report',type=Path,required=True)
    args = parser.parse_args()
    args.report.parent.mkdir(parents=True,exist_ok=True)
    try:
        if args.send:
            raise ValueError('Use scripts/daily_search.py --send for once-per-day notifications')
        if args.action == 'capture':
            report = json.loads(fetch(SITE+'/release-manifest.json'))
            if report.get('siteUrl') != SITE:
                raise ValueError('Unexpected previous release host')
        else:
            if not args.revision or not re.fullmatch(r'[a-f0-9]{40}',args.revision):
                raise ValueError('A full source revision is required')
            previous = json.loads(args.previous.read_text(encoding='utf-8')) if args.previous and args.previous.exists() else None
            report = submit(previous,args.revision,args.send)
        args.report.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print(json.dumps({k:v for k,v in report.items() if k in ('revision','count','status','httpStatus','indexingConfirmed')}))
        return 0
    except Exception as exc:
        # Do not log the request or verification key on network errors.
        report = {'status':'failed','errorType':type(exc).__name__,'indexingConfirmed':False}
        if isinstance(exc,HTTPError): report['httpStatus']=exc.code
        elif isinstance(exc,ValueError): report['message']=str(exc)
        args.report.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print(json.dumps(report))
        return 1


if __name__ == '__main__':
    sys.exit(main())
