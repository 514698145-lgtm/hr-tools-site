"""Daily, local-state guard for this site's IndexNow notifications.

Run after the daily editorial release, not on every deployment. State is private
local operational data. Missing state fails closed rather than resending a site.
"""
import argparse
from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
import sys

try:
    from .notify_search import SITE, fetch, submit
except ImportError:
    from notify_search import SITE, fetch, submit

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_STATE = ROOT / '.local/search-notifications/state.json'
BEIJING = timezone(timedelta(hours=8))


def save(path, data):
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    os.replace(temporary, path)


def run(state_path=DEFAULT_STATE, send=False, now=None):
    day = (now or datetime.now(timezone.utc)).astimezone(BEIJING).date().isoformat()
    if not state_path.is_file():
        raise ValueError('Missing daily checkpoint; restore the verified last submission before sending')
    lock = state_path.with_suffix('.lock')
    # No automatic stale-lock deletion: a crash may have happened after a POST.
    with lock.open('x', encoding='utf-8') as handle:
        handle.write(day)
    try:
        state = json.loads(state_path.read_text(encoding='utf-8'))
        if state.get('siteUrl') != SITE or not isinstance(state.get('baseline', {}).get('files'), list):
            raise ValueError('Invalid daily checkpoint or wrong site')
        if state.get('lastAttemptDay', '') > day:
            raise ValueError('Checkpoint is ahead of the local calendar; check clock/state')
        if state.get('lastAttemptDay') == day:
            return {'status':'already-attempted-today', 'day':day, 'indexingConfirmed':False}
        current = json.loads(fetch(SITE+'/release-manifest.json'))
        revision = current.get('revision', '')
        # The existing verifier checks completed production, sitemap, hashes and noindex.
        report = submit(state['baseline'], revision, send=False)
        report['day'] = day
        if not send or report['status'] == 'no-changes':
            return report
        # Persist BEFORE the POST. A timeout/unknown response cannot cause a same-day retry.
        state['lastAttemptDay'] = day
        save(state_path, state)
        report = submit(state['baseline'], revision, send=True)
        report['day'] = day
        if report['status'] in ('received', 'key-validation-pending'):
            state['baseline'] = current
            state['lastReceipt'] = report
            save(state_path, state)
        return report
    finally:
        lock.unlink()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--state', type=Path, default=DEFAULT_STATE)
    parser.add_argument('--send', action='store_true')
    parser.add_argument('--report', type=Path, required=True)
    args = parser.parse_args()
    try:
        report = run(args.state, args.send)
        code = 0
    except Exception as error:
        report = {'status':'failed', 'errorType':type(error).__name__, 'indexingConfirmed':False}
        if isinstance(error, ValueError):
            report['message'] = str(error)
        code = 1
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({key:value for key,value in report.items() if key != 'urls'}))
    return code


if __name__ == '__main__':
    sys.exit(main())
