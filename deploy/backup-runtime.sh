#!/usr/bin/env bash
# Run as root. Stop the one writer briefly to snapshot both JSON files.
# Backups contain anonymous account hashes and stay private on this server.
set -Eeuo pipefail
umask 077
exec 9>/run/hr-tools-backup.lock
flock -n 9 || exit 0
data=/var/lib/hr-tools
backup=/var/backups/hr-tools
install -d -m 0700 "$backup"
files=()
for name in feedback.json game.json; do
  if [[ -f "$data/$name" && ! -L "$data/$name" ]]; then files+=("$name"); fi
done
if ((${#files[@]} == 0)); then
  echo 'No persisted feedback or rankings yet; backup not needed.'
  exit 0
fi
resume_runtime() {
  systemctl start hr-tools-api
  for attempt in {1..30}; do
    if curl --silent --fail --max-time 1 http://127.0.0.1:4323/healthz >/dev/null; then return 0; fi
    sleep 0.2
  done
  echo 'API did not become ready after backup.' >&2
  return 1
}
service_was_active=false
if systemctl is-active --quiet hr-tools-api; then
  service_was_active=true
  trap 'if "$service_was_active"; then resume_runtime; fi' EXIT
  systemctl stop hr-tools-api
fi
target="$backup/runtime-$(date -u +%Y%m%dT%H%M%S)-$$.tar.gz"
python3 /opt/hr-tools/current/scripts/runtime_archive.py snapshot "$data" "$target.partial"
mv "$target.partial" "$target"
echo 'Runtime data backup completed.'
# No automatic deletion before a retention policy is approved.
