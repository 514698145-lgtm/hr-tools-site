"""Package only verified dist files; never upload or enable a release."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import mimetypes
from pathlib import Path, PurePosixPath
import subprocess
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = 'release-manifest.json'
PRIVATE = {'content', 'config', 'scripts', 'docs', 'reports', 'uploads-private',
           'node_modules', 'admin-password.txt', 'feedback.json', 'game.json'}


def safe_path(name):
    path = PurePosixPath(name)
    if (not name or '\\' in name or path.is_absolute() or ':' in name or
            path.as_posix() != name or any(p.startswith('.') or p in PRIVATE for p in path.parts)):
        raise ValueError('Unexpected private or unsafe artifact path: ' + name)
    return path


def inventory(dist):
    records = []
    if dist.is_symlink():
        raise ValueError('dist must not be a symlink')
    for file in sorted(dist.rglob('*')):
        if file.is_symlink():
            raise ValueError('Symlinks are not allowed in the release')
        if not file.is_file():
            continue
        name = file.relative_to(dist).as_posix()
        safe_path(name)
        raw = file.read_bytes()
        mime = {'.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
                '.html': 'text/html', '.xml': 'application/xml', '.txt': 'text/plain'}.get(
                    file.suffix, mimetypes.guess_type(name)[0] or 'application/octet-stream')
        # Current asset names are not content-hashed. Do not grant immutable caching.
        records.append({'path': name, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
                        'contentType': mime, 'cacheControl': 'public, max-age=0, must-revalidate'})
    if not {'index.html', '404.html', 'robots.txt', 'route-manifest.json'} <= {r['path'] for r in records}:
        raise ValueError('Required static files are missing')
    return records


def write_package(dist, destination, metadata):
    records = inventory(dist)
    manifest = {**metadata, 'schema': 1, 'files': records}
    destination = Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(destination, 'x', compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr(MANIFEST, json.dumps(manifest, ensure_ascii=False, indent=2))
        for record in records:
            raw = (dist / record['path']).read_bytes()
            if hashlib.sha256(raw).hexdigest() != record['sha256']:
                raise ValueError('Build output changed during packaging')
            archive.writestr('site/' + record['path'], raw)
    return verify_package(destination)


def verify_package(archive_path):
    with zipfile.ZipFile(archive_path) as archive:
        entries = archive.infolist()
        names = [entry.filename for entry in entries]
        if len(names) != len(set(names)) or MANIFEST not in names:
            raise ValueError('Duplicate entries or missing release manifest')
        # Keep verification bounded before decompressing an untrusted archive.
        if sum(x.file_size for x in entries) > 1024 * 1024 * 1024:
            raise ValueError('Release exceeds 1 GiB limit')
        manifest = json.loads(archive.read(MANIFEST))
        if manifest.get('schema') != 1 or manifest.get('purpose') not in ('candidate', 'production'):
            raise ValueError('Unknown release manifest')
        expected = {MANIFEST}
        for record in manifest['files']:
            safe_path(record['path'])
            name = 'site/' + record['path']
            if name in expected:
                raise ValueError('Duplicate manifest file')
            expected.add(name)
            raw = archive.read(name)
            if len(raw) != record['bytes'] or hashlib.sha256(raw).hexdigest() != record['sha256']:
                raise ValueError('Release checksum mismatch: ' + record['path'])
        if set(names) != expected:
            raise ValueError('Unlisted files in release')
    return {'purpose': manifest['purpose'], 'files': len(manifest['files']),
            'bytes': sum(record['bytes'] for record in manifest['files']), 'checksumsVerified': True}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--candidate', action='store_true', help='Prepare offline candidate; never publication approval')
    parser.add_argument('--verify', type=Path, help='Verify an existing archive without rebuilding')
    args = parser.parse_args()
    if args.verify:
        print(json.dumps(verify_package(args.verify)))
        return
    from check_release import check_release
    from check_site import main as check_site
    subprocess.run([sys.executable, str(ROOT / 'scripts/build.py')], cwd=ROOT, check=True)
    if check_site():
        raise SystemExit('Static site checks failed')
    readiness = check_release(ROOT)
    route_manifest = json.loads((ROOT / 'dist/route-manifest.json').read_text(encoding='utf-8'))
    if not args.candidate and (not readiness['ready'] or route_manifest['mode'] != 'production'):
        print(json.dumps(readiness, ensure_ascii=False, indent=2))
        raise SystemExit('Production prerequisites are incomplete; only --candidate is allowed')
    now = datetime.now(timezone.utc)
    revision = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    dirty = bool(subprocess.check_output(['git', 'status', '--porcelain'], cwd=ROOT, text=True).strip())
    if not args.candidate and dirty:
        raise SystemExit('Production packages require a clean committed source tree')
    purpose = 'candidate' if args.candidate else 'production'
    destination = ROOT / 'outputs/releases' / f'{now:%Y%m%dT%H%M%S%fZ}-{revision[:7]}-{purpose}.zip'
    metadata = {'purpose': purpose, 'createdAt': now.isoformat(), 'revision': revision, 'workingTreeDirty': dirty,
                'buildMode': route_manifest['mode'], 'readiness': readiness,
                'siteUrl': json.loads((ROOT / 'config/release.json').read_text())['siteUrl']}
    result = write_package(ROOT / 'dist', destination, metadata)
    print(json.dumps({**result, 'archive': str(destination)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
