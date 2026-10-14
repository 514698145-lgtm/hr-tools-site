"""Private runtime snapshots and restore into an empty staging directory only."""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import tarfile

DATA_FILES = ('feedback.json', 'game.json')
MANIFEST = 'backup-manifest.json'
MAX_BYTES = 256 * 1024 * 1024


def validate_data(name, raw):
    data = json.loads(raw)
    if name == 'feedback.json':
        valid = isinstance(data, dict) and data.get('version') == 2 and all(
            isinstance(data.get(key), list) for key in ('items', 'users', 'events'))
    else:
        valid = isinstance(data, dict) and data.get('version') == 1 and isinstance(data.get('runs'), list)
    if not valid:
        raise ValueError('Unsupported runtime schema: ' + name)


def read_archive(archive):
    payload = {}
    total = 0
    with tarfile.open(archive, 'r:gz') as source:
        for entry in source:
            if entry.name not in (*DATA_FILES, MANIFEST) or not entry.isfile() or entry.name in payload:
                raise ValueError('Unexpected, duplicate or non-regular backup entry')
            total += entry.size
            if entry.size < 0 or total > MAX_BYTES:
                raise ValueError('Backup exceeds size limit')
            payload[entry.name] = source.extractfile(entry).read()
    if not any(name in payload for name in DATA_FILES):
        raise ValueError('Backup contains no runtime data')
    for name in DATA_FILES:
        if name in payload:
            validate_data(name, payload[name])
    # Game rows reference identities in feedback.json; never restore orphan scores.
    if 'game.json' in payload and 'feedback.json' not in payload:
        raise ValueError('Game data requires the matching identity store')
    manifest = json.loads(payload.pop(MANIFEST)) if MANIFEST in payload else None
    if manifest is not None:
        if manifest.get('schema') != 1 or set(manifest.get('files', {})) != set(payload):
            raise ValueError('Backup manifest does not match data files')
        for name, raw in payload.items():
            if manifest['files'][name] != {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}:
                raise ValueError('Backup checksum mismatch: ' + name)
    return payload, manifest is not None


def snapshot(directory, destination):
    """Caller must stop the sole writer before taking this snapshot."""
    directory, destination = Path(directory), Path(destination)
    if directory.is_symlink() or not directory.is_dir():
        raise ValueError('Snapshot source must be a real data directory')
    payload = {}
    for name in DATA_FILES:
        source = directory / name
        if source.is_symlink():
            raise ValueError('Refusing a symlink in runtime data')
        if source.exists():
            if source.stat().st_size > MAX_BYTES:
                raise ValueError('Runtime data exceeds size limit')
            raw = source.read_bytes()
            validate_data(name, raw)
            payload[name] = raw
    if not payload or ('game.json' in payload and 'feedback.json' not in payload):
        raise ValueError('Snapshot has no data or is missing the identity store')
    if sum(map(len, payload.values())) > MAX_BYTES - 4096:
        raise ValueError('Runtime data exceeds size limit')
    manifest = {'schema': 1, 'files': {name: {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}
                                      for name, raw in payload.items()}}
    payload[MANIFEST] = json.dumps(manifest, sort_keys=True).encode()
    # Never overwrite a previous snapshot, including a same-second backup.
    fd = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'wb') as output, tarfile.open(fileobj=output, mode='w:gz') as archive:
        for name, raw in payload.items():
            entry = tarfile.TarInfo(name)
            entry.size, entry.mode = len(raw), 0o600
            archive.addfile(entry, io.BytesIO(raw))
    read_archive(destination)
    return {'files': sorted(manifest['files']), 'checksumsVerified': True}


def restore(archive, destination):
    payload, verified = read_archive(archive)
    destination = Path(destination)
    if destination.is_symlink() or destination.resolve() == Path('/var/lib/hr-tools').resolve():
        raise ValueError('Restore requires an empty staging directory, never the live store')
    if destination.exists() and (not destination.is_dir() or any(destination.iterdir())):
        raise ValueError('Restore destination must be empty')
    destination.mkdir(parents=True, mode=0o700, exist_ok=True)
    os.chmod(destination, 0o700)
    # Do not extract archive paths; write only the two validated names.
    for name, raw in payload.items():
        fd = os.open(destination / name, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'wb') as output:
            output.write(raw)
    return {'files': sorted(payload), 'checksumsVerified': verified, 'stagingOnly': True}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    take = sub.add_parser('snapshot', help='Snapshot a stopped data store; no service control')
    take.add_argument('directory', type=Path)
    take.add_argument('destination', type=Path)
    inspect = sub.add_parser('inspect', help='Validate without printing private records')
    inspect.add_argument('archive', type=Path)
    recover = sub.add_parser('restore', help='Restore into an empty staging directory')
    recover.add_argument('archive', type=Path)
    recover.add_argument('destination', type=Path)
    args = parser.parse_args()
    if args.command == 'snapshot':
        result = snapshot(args.directory, args.destination)
    elif args.command == 'restore':
        result = restore(args.archive, args.destination)
    else:
        files, verified = read_archive(args.archive)
        result = {'files': sorted(files), 'checksumsVerified': verified}
    print(json.dumps(result))
