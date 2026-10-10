"""Validate public CMS content and emit only currently publishable article routes.

This is a source-content gate, not an HTML builder or a production release gate.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlparse

import yaml


class UniqueLoader(yaml.SafeLoader):
    pass


def unique_mapping(loader, node, deep=False):
    result = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if key in result:
            raise ValueError(f"重复字段: {key}")
        result[key] = loader.construct_object(value_node, deep=deep)
    return result


UniqueLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, unique_mapping)


def parse_article(text):
    match = re.match(r"\A\ufeff?---\r?\n(.*?)\r?\n---(?:\r?\n|$)(.*)\Z", text, re.S)
    if not match:
        raise ValueError("缺少 YAML Frontmatter")
    data = yaml.load(match[1], Loader=UniqueLoader)
    if not isinstance(data, dict):
        raise ValueError("Frontmatter 必须为字段对象")
    return data, match[2]


def parse_time(value):
    if not isinstance(value, (str, datetime)):
        raise ValueError("必须为含时区的 ISO 日期时间")
    result = value if isinstance(value, datetime) else datetime.fromisoformat(value.replace("Z", "+00:00"))
    if result.tzinfo is None:
        raise ValueError("缺少时区")
    return result


def eligible(data, now):
    return data.get("status") == "published" and parse_time(data["publishedAt"]) <= now


def validate_article(data, body, tools, public_dir):
    errors = []
    allowed = {"title", "slug", "description", "status", "author", "publishedAt", "updatedAt", "category", "tags", "cover", "coverAlt", "relatedTools", "sources", "seoTitle", "seoDescription", "shareImage", "noindex"}
    try:
        from .seo import validate_fields
    except ImportError:
        from seo import validate_fields
    try:
        validate_fields(data)
    except ValueError as error:
        errors.append(str(error))
    for field in data.keys() - allowed:
        errors.append(f"未知字段: {field}")
    for field in ("title", "slug", "description", "author", "category"):
        if not isinstance(data.get(field), str) or not data[field].strip():
            errors.append(f"缺少有效字段: {field}")
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", str(data.get("slug", ""))):
        errors.append("slug 必须为小写英文、数字与单短横线")
    if data.get("status") not in ("draft", "published"):
        errors.append("status 必须为 draft 或 published")
    times = {}
    for field in ("publishedAt", "updatedAt"):
        if field == "updatedAt" and not data.get(field):
            continue
        try:
            times[field] = parse_time(data.get(field))
        except (ValueError, TypeError):
            errors.append(f"{field} 必须是含时区的 ISO 日期时间")
    if len(times) == 2 and times["updatedAt"] < times["publishedAt"]:
        errors.append("修改时间不能早于发布时间")
    if not body.strip():
        errors.append("正文为空")
    # Remove fenced code before checking actual Markdown headings.
    body_without_code = re.sub(r"(?ms)^(`{3,}|~{3,}).*?^\1\s*$", "", body)
    if re.search(r"(?m)^#\s+", body_without_code) or re.search(r"(?m)^.+\n=+\s*$", body_without_code):
        errors.append("正文不能重复使用一级标题")
    if re.search(r"<\s*(?:script|iframe|h1)\b|\bon\w+\s*=|javascript\s*:", body, re.I):
        errors.append("正文包含不允许的活动 HTML 或一级标题")
    for field in ("tags", "relatedTools", "sources"):
        items = data.get(field, [])
        if not isinstance(items, list) or any(not isinstance(v, str) for v in items):
            errors.append(f"{field} 必须为字符串列表")
            continue
        if field == "sources":
            for value in items:
                url = urlparse(value)
                if url.scheme != "https" or not url.netloc or url.username:
                    errors.append("来源必须为有效 HTTPS 地址")
        if field == "relatedTools":
            for value in items:
                if value not in tools:
                    errors.append(f"未知关联工具: {value}")
                elif data.get("status") == "published" and tools[value] != "live":
                    errors.append(f"已发布文章不能链接尚未上线的工具: {value}")
    cover = data.get("cover")
    if cover:
        if not isinstance(cover, str) or not cover.startswith("/media/"):
            errors.append("封面必须位于 /media/ 内")
        else:
            target = (public_dir / unquote(cover.lstrip("/"))).resolve()
            media = (public_dir / "media").resolve()
            if not target.is_relative_to(media) or not target.is_file():
                errors.append("封面不存在或超出媒体目录")
        if not isinstance(data.get("coverAlt"), str) or not data["coverAlt"].strip():
            errors.append("封面缺少说明")
    return errors


def check(root, now):
    tools = {t["id"]: t["status"] for t in json.loads((root / "config/tools.json").read_text(encoding="utf-8-sig"))}
    cms = yaml.load((root / ".pages.yml").read_text(encoding="utf-8-sig"), Loader=UniqueLoader)
    collection = next(c for c in cms["content"] if c["name"] == "articles")
    if collection["path"] != "content/articles" or cms["media"]["input"] != "public/media":
        raise ValueError("CMS 目录映射与项目内容约定不一致")
    files = sorted((root / "content/articles").glob("*.md"))
    errors, records, seen = [], [], {}
    for file in files:
        try:
            data, body = parse_article(file.read_text(encoding="utf-8-sig"))
            issues = validate_article(data, body, tools, root / "public")
            slug = data.get("slug")
            if isinstance(slug, str):
                if slug in seen:
                    issues.append(f"重复 slug，与 {seen[slug]} 冲突")
                seen[slug] = file.name
                if file.stem != slug:
                    issues.append("文件名必须与 slug 相同")
            errors.extend(f"{file.name}: {error}" for error in issues)
            if not issues and eligible(data, now):
                records.append({"path": f"/insights/{slug}/", "source": file.relative_to(root).as_posix(), "lastmod": str(data.get("updatedAt") or data["publishedAt"])})
        except (ValueError, TypeError, yaml.YAMLError) as error:
            errors.append(f"{file.name}: {error}")
    return {"checked": len(files), "publishable": records, "errors": errors}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    try:
        report = check(args.root.resolve(), datetime.now(timezone.utc))
    except (ValueError, KeyError, OSError, yaml.YAMLError) as error:
        print(f"内容配置错误: {error}", file=sys.stderr)
        return 1
    out = args.root / "reports"
    out.mkdir(exist_ok=True)
    (out / "content-check.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"检查 {report['checked']} 篇；当前可发布 {len(report['publishable'])} 篇；错误 {len(report['errors'])} 项")
    for error in report["errors"]:
        print(error)
    return bool(report["errors"])


if __name__ == "__main__":
    sys.exit(main())
