#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
state=/var/lib/hr-policy-watch
exec 9>"$state/run.lock"
flock -n 9 || exit 0
# Fetch the current inventory from the authorized public repository, not a stale
# local copy. Failure must fail the service instead of reporting an old scan as new.
curl --fail --silent --show-error --location --proto '=https' --proto-redir '=https' \
  --connect-timeout 15 --max-time 90 --retry 2 \
  https://raw.githubusercontent.com/514698145-lgtm/hr-tools-site/main/config/watch-manifest.json \
  --output "$state/manifest.pending.json"
/usr/bin/node --input-type=module -e 'import fs from "node:fs";const p=JSON.parse(fs.readFileSync(process.argv[1]));if(p.schema!==1||!p.sources?.length||p.discoveryTasks?.length!==50)throw Error("Invalid inventory");' "$state/manifest.pending.json"
mv "$state/manifest.pending.json" "$state/manifest.json"
exec /usr/bin/node /opt/hr-policy-watch/policy-watch.mjs "$state/manifest.json" "$state"
