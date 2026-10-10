"""Shared notices, kept separate from third-party service introductions."""
import json
from html import escape
from pathlib import Path

DATA = json.loads((Path(__file__).resolve().parents[1] / 'config/disclaimer.json').read_text(encoding='utf-8-sig'))


def notice(key, title='使用说明与免责声明'):
    keys = (key,) if isinstance(key, str) else key
    paragraphs = ''.join('<p>' + escape(DATA[item]) + '</p>' for item in keys)
    return '<section class="method disclaimer" aria-label="免责声明"><h3>' + escape(title) + '</h3>' + paragraphs + '<a href="/disclaimer/">查看完整声明</a></section>'
