from datetime import datetime, timezone
from pathlib import Path
import tempfile
import unittest

from scripts.check_content import eligible, parse_article, validate_article, check


class ContentChecks(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.public = Path(self.temp.name)
        self.article = {"title": "标题", "slug": "example", "description": "摘要", "author": "作者", "category": "工具", "status": "published", "publishedAt": "2026-09-25T09:00:00+08:00"}

    def errors(self, **kwargs):
        return validate_article(self.article | kwargs, "## 内容\n正文", {"tax": "live", "cost": "planned"}, self.public)

    def test_valid_metadata(self):
        self.assertEqual(self.errors(), [])

    def test_draft_and_future_not_publishable(self):
        now = datetime(2026, 9, 25, 1, 0, tzinfo=timezone.utc)
        self.assertTrue(eligible(self.article, now))
        self.assertFalse(eligible(self.article | {"status": "draft"}, now))
        self.assertFalse(eligible(self.article | {"publishedAt": "2026-09-25T09:00:01+08:00"}, now))

    def test_timezone_required(self):
        self.assertTrue(self.errors(publishedAt="2026-09-25T09:00:00"))

    def test_duplicate_frontmatter_rejected(self):
        with self.assertRaises(ValueError):
            parse_article("---\ntitle: one\ntitle: two\n---\ntext")

    def test_path_traversal_rejected(self):
        self.assertTrue(self.errors(slug="../private"))
        (self.public / "secret.png").write_bytes(b"x")
        self.assertTrue(self.errors(cover="/media/%2e%2e/secret.png", coverAlt="图片"))

    def test_missing_cover_and_alt(self):
        self.assertEqual(len(self.errors(cover="/media/missing.png")), 2)

    def test_modified_before_publication(self):
        self.assertTrue(self.errors(updatedAt="2026-09-24T09:00:00+08:00"))

    def test_unavailable_tool_not_linked(self):
        self.assertTrue(self.errors(relatedTools=["cost"]))
        self.assertEqual(self.errors(relatedTools=["tax"]), [])

    def test_malformed_lists(self):
        self.assertTrue(self.errors(sources="https://example.com"))

    def test_heading_and_active_markup(self):
        for body in ("# 重复标题", '<script>alert(1)</script>', '<img onerror="x()">'):
            self.assertTrue(validate_article(self.article, body, {}, self.public))

    def test_actual_project_draft_excluded(self):
        root = Path(__file__).resolve().parents[1]
        report = check(root, datetime(2026, 9, 25, tzinfo=timezone.utc))
        self.assertEqual(report["errors"], [])
        self.assertNotIn("/insights/editor-example/", [item["path"] for item in report["publishable"]])


if __name__ == "__main__":
    unittest.main()
