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
service_was_active=false
if systemctl is-active --quiet hr-tools-api; then
  service_was_active=true
  trap 'if "$service_was_active"; then systemctl start hr-tools-api; fi' EXIT
  systemctl stop hr-tools-api
fi
files=()
for name in feedback.json game.json; do
  if [[ -f "$data/$name" && ! -L "$data/$name" ]]; then files+=("$name"); fi
done
if ((${#files[@]} == 0)); then
  echo 'No persisted feedback or rankings yet; backup not needed.'
  exit 0
fi
target="$backup/runtime-$(date -u +%Y%m%dT%H%M%SZ).tar.gz"
tar -C "$data" -czf "$target.partial" -- "${files[@]}"
tar -tzf "$target.partial" >/dev/null
mv "$target.partial" "$target"
echo 'Runtime data backup completed.'
# No automatic deletion before a retention policy is approved.
