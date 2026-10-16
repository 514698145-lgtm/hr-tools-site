#!/usr/bin/env python3
"""Upload private runtime snapshots to a separate private OSS bucket as root."""
import hashlib
import json
import os
from pathlib import Path
import sys

import oss2

sys.path.insert(0, '/opt/hr-tools/current/scripts')
from runtime_archive import read_archive


def main():
    os.umask(0o077)
    config = json.loads(Path('/etc/hr-tools/backup-writer.json').read_text(encoding='utf-8-sig'))
    bucket = oss2.Bucket(oss2.Auth(config['accessKeyId'], config['accessKeySecret']),
                         'https://oss-cn-hongkong.aliyuncs.com', 'hrtoolkit-runtime-backups-hk',
                         connect_timeout=20, enable_crc=True)
    uploaded = 0
    for archive in sorted(Path('/var/backups/hr-tools').glob('runtime-*.tar.gz')):
        if archive.is_symlink():
            raise ValueError('Backup symlink refused')
        digest = hashlib.sha256(archive.read_bytes()).hexdigest()
        receipt = archive.with_name(archive.name + '.uploaded')
        if receipt.exists() and receipt.read_text().strip() == digest:
            continue
        _, verified = read_archive(archive)
        if not verified:
            raise ValueError('Unverified legacy backup refused')
        with archive.open('rb') as source:
            bucket.put_object('runtime/' + archive.name, source,
                              headers={'Content-Type': 'application/gzip',
                                       'x-oss-server-side-encryption': 'AES256',
                                       'x-oss-meta-sha256': digest})
        receipt.write_text(digest + '\n')
        uploaded += 1
    print('Private runtime snapshots uploaded:', uploaded)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # Do not disclose SDK requests, object contents or credentials in logs.
        raise SystemExit('Private backup upload failed (' + type(error).__name__ + ')') from None
