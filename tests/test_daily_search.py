import json
from datetime import datetime, timezone
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from scripts.daily_search import run, save, SITE


class DailySearchTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.path = Path(self.folder.name)/'state.json'
        self.old = {'files':[{'path':'old','sha256':'old'}]}
        self.current = {'siteUrl':SITE,'purpose':'production','revision':'a'*40,'files':[{'path':'new','sha256':'new'}]}
        save(self.path, {'siteUrl':SITE,'baseline':self.old,'lastAttemptDay':'2026-10-20'})
        self.now = datetime(2026,10,21,0,30,tzinfo=timezone.utc)

    def tearDown(self):
        self.folder.cleanup()

    def test_missing_or_wrong_site_fails_closed(self):
        self.path.unlink()
        with self.assertRaises(ValueError), patch('scripts.daily_search.submit') as post:
            run(self.path, True, self.now)
        post.assert_not_called()
        save(self.path, {'siteUrl':'https://www.wowoohr.com','baseline':self.old})
        with self.assertRaises(ValueError):run(self.path, True, self.now)

    def test_beijing_day_and_second_attempt_skips_even_after_changes(self):
        # Oct20 UTC is already Oct21 in Beijing.
        now = datetime(2026,10,20,16,30,tzinfo=timezone.utc)
        with patch('scripts.daily_search.fetch', return_value=json.dumps(self.current).encode()), patch('scripts.daily_search.submit', side_effect=[{'status':'dry-run'}, {'status':'received','indexingConfirmed':False}]) as send:
            self.assertEqual(run(self.path, True, now)['day'], '2026-10-21')
            self.assertEqual(run(self.path, True, self.now)['status'],'already-attempted-today')
            self.assertEqual(send.call_count,2)

    def test_dry_run_and_unchanged_pages_do_not_consume_attempt(self):
        before = self.path.read_bytes()
        with patch('scripts.daily_search.fetch', return_value=json.dumps(self.current).encode()), patch('scripts.daily_search.submit', return_value={'status':'dry-run'}) as send:
            run(self.path, False, self.now)
            self.assertFalse(send.call_args.kwargs['send'])
        with patch('scripts.daily_search.fetch', return_value=json.dumps(self.current).encode()), patch('scripts.daily_search.submit', return_value={'status':'no-changes'}) as send:
            run(self.path, True, self.now)
            self.assertEqual(send.call_count,1)
        self.assertEqual(self.path.read_bytes(),before)

    def test_ambiguous_failure_keeps_baseline_and_blocks_same_day_retry(self):
        with patch('scripts.daily_search.fetch', return_value=json.dumps(self.current).encode()), patch('scripts.daily_search.submit', side_effect=[{'status':'dry-run'}, TimeoutError()]):
            with self.assertRaises(TimeoutError):run(self.path, True, self.now)
        state=json.loads(self.path.read_text())
        self.assertEqual(state['baseline'], self.old)
        self.assertEqual(state['lastAttemptDay'],'2026-10-21')
        self.assertEqual(run(self.path, True, self.now)['status'],'already-attempted-today')
        tomorrow=datetime(2026,10,22,0,30,tzinfo=timezone.utc)
        with patch('scripts.daily_search.fetch', return_value=json.dumps(self.current).encode()), patch('scripts.daily_search.submit', side_effect=[{'status':'dry-run'}, {'status':'received'}]) as send:
            run(self.path, True, tomorrow)
            self.assertEqual(send.call_args.args[0], self.old)

    def test_pending_key_verification_is_not_resent(self):
        with patch('scripts.daily_search.fetch', return_value=json.dumps(self.current).encode()), patch('scripts.daily_search.submit', side_effect=[{'status':'dry-run'}, {'status':'key-validation-pending','indexingConfirmed':False}]):
            result=run(self.path, True, self.now)
        self.assertFalse(result['indexingConfirmed'])
        self.assertEqual(json.loads(self.path.read_text())['baseline'], self.current)

    def test_lock_and_future_checkpoint_fail_closed(self):
        lock=self.path.with_suffix('.lock');lock.touch()
        with self.assertRaises(FileExistsError):run(self.path, True, self.now)
        lock.unlink()
        save(self.path, {'siteUrl':SITE,'baseline':self.old,'lastAttemptDay':'2026-10-22'})
        with self.assertRaises(ValueError):run(self.path, True, self.now)


if __name__ == '__main__':unittest.main()
