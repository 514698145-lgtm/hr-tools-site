"""Upload a checksum-verified static release with the official Alibaba Cloud CLI.

Candidates are restricted to a preflight prefix. Production uploads require the
packaged release gates, upload assets before HTML, and publish the manifest last.
No bucket ACL, credentials, DNS or delete operations are performed here.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import zipfile
from urllib.parse import quote

from package_release import MANIFEST, verify_package

BUCKET = 'hrtoolkit-site-hk'
STATE = 'deployment-state.json'


def safe_diagnostic(message):
    for name, value in os.environ.items():
        if len(value) >= 8 and any(part in name.upper() for part in ('SECRET', 'TOKEN', 'ACCESS_KEY')):
            message = message.replace(value, '[redacted]').replace(quote(value, safe=''), '[redacted]')
    message = re.sub(r'https?://[^\s]+', '[cloud endpoint]', message)
    message = re.sub(r'(?i)(access.?key.?secret|security.?token|sts.?token)["\s:=]+[^,\s"}]+',
                     r'\1=[redacted]', message)
    return message.strip()[:800]


def unchanged_paths(manifest, previous, state):
    # An interrupted upload may have overwritten objects without publishing its
    # manifest. In that case re-upload everything, including a rollback release.
    if (not previous or state.get('status') != 'complete' or
            state.get('revision') != previous.get('revision')):
        return set()
    old = {record['path']: record for record in previous.get('files', [])}
    fields = ('sha256', 'bytes', 'contentType', 'cacheControl')
    return {record['path'] for record in manifest['files'] if record['path'] in old and
            all(old[record['path']].get(key) == record.get(key) for key in fields)}


def validate_target(manifest, prefix):
    if manifest.get('siteUrl') != 'https://hrtoolkit.cn' or manifest.get('buildMode') != 'production':
        raise ValueError('Unexpected site or build mode')
    if prefix:
        if not re.fullmatch(r'_preflight/[a-f0-9]{7,40}/', prefix):
            raise ValueError('Candidate prefix must be _preflight/<revision>/')
    elif (manifest.get('purpose') != 'production' or manifest.get('workingTreeDirty') or
          not manifest.get('readiness', {}).get('ready')):
        raise ValueError('Root uploads require a clean production release with all gates passed')


def upload(archive_path, cli, profile=None, config=None, prefix='', workers=4):
    verify_package(archive_path)
    with zipfile.ZipFile(archive_path) as archive:
        manifest_raw = archive.read(MANIFEST)
        manifest = json.loads(manifest_raw)
        validate_target(manifest, prefix)
        base = [str(cli), '--region', 'cn-hongkong']
        if profile:
            base += ['--profile', profile]
        if config:
            base += ['--config-path', str(config)]

        def run(arguments, missing_ok=False):
            result = subprocess.run(base + arguments, capture_output=True, text=True)
            if result.returncode:
                if missing_ok and re.search(r'NoSuchKey|Http Status Code:\s*404', result.stdout + result.stderr):
                    return None
                # CLI diagnostic data can include request details. Never echo it.
                found = re.search(r'"(?:error_code|Code)"\s*:\s*"([A-Za-z0-9_.-]+)"|Error\s*Code[:= ]+([A-Za-z0-9_.-]+)',
                                  result.stdout + result.stderr)
                code = next((x for x in found.groups() if x), 'unknown') if found else 'unknown'
                detail = safe_diagnostic(result.stderr or result.stdout)
                raise RuntimeError('Cloud command failed (' + code + '): ' + detail)
            return result.stdout

        def put(file, key, content_type, sha256):
            run(['ossutil', 'cp', str(file), f'oss://{BUCKET}/{key}', '-f', '-q',
                 '--region', 'cn-hongkong', '--endpoint', 'https://oss-cn-hongkong.aliyuncs.com',
                 '--no-progress', '--content-type', content_type,
                 '--cache-control', 'public, max-age=0, must-revalidate',
                 '--metadata', 'sha256=' + sha256])

        # Avoid extracting archive-supplied paths. All names were validated and
        # each file is individually materialized from the verified inventory.
        with tempfile.TemporaryDirectory(prefix='hr-release-') as directory:
            staging = Path(directory)
            if any(r['path'] in (STATE, MANIFEST) for r in manifest['files']):
                raise ValueError('Reserved deployment marker in static files')
            def fetch_json(key):
                target = staging / ('previous-' + key)
                result = run(['ossutil', 'cp', f'oss://{BUCKET}/{prefix}{key}', str(target),
                              '-f', '-q', '--no-progress', '--region', 'cn-hongkong',
                              '--endpoint', 'https://oss-cn-hongkong.aliyuncs.com'], missing_ok=True)
                return json.loads(target.read_text()) if result is not None else {}

            previous, state = fetch_json(MANIFEST), fetch_json(STATE)
            unchanged = unchanged_paths(manifest, previous, state)
            marker_state = staging / STATE
            def publish_state(status):
                raw = json.dumps({'schema': 1, 'status': status, 'revision': manifest['revision']}).encode()
                marker_state.write_bytes(raw)
                put(marker_state, prefix + STATE, 'application/json', hashlib.sha256(raw).hexdigest())
            publish_state('uploading')
            for item in manifest['files']:
                target = staging / item['path']
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(archive.read('site/' + item['path']))
            assets = [r for r in manifest['files'] if not r['path'].endswith('.html')]
            pages = [r for r in manifest['files'] if r['path'].endswith('.html')]

            def send(item):
                put(staging / item['path'], prefix + item['path'], item['contentType'], item['sha256'])

            for label, records in [('assets', assets), ('pages', pages)]:
                changed = [r for r in records if r['path'] not in unchanged]
                with ThreadPoolExecutor(max_workers=workers) as pool:
                    for _ in pool.map(send, changed):
                        pass
                print(json.dumps({'uploaded': label, 'files': len(changed),
                                  'unchanged': len(records) - len(changed)}), flush=True)
            marker = staging / MANIFEST
            marker.write_bytes(manifest_raw)
            put(marker, prefix + MANIFEST, 'application/json', hashlib.sha256(manifest_raw).hexdigest())
            publish_state('complete')
    return {'bucket': BUCKET, 'prefix': prefix, 'files': len(manifest['files']),
            'revision': manifest['revision'], 'completionMarkerPublishedLast': True}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path)
    parser.add_argument('--cli', type=Path, required=True)
    parser.add_argument('--profile')
    parser.add_argument('--config', type=Path)
    parser.add_argument('--prefix', default='')
    args = parser.parse_args()
    print(json.dumps(upload(args.archive, args.cli.resolve(), args.profile, args.config, args.prefix)))


if __name__ == '__main__':
    main()
