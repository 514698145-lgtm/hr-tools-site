"""Static, crawlable article lists; search uses the same published collection."""
from html import escape as e
import json
import math
from urllib.parse import quote

PAGE_SIZE = 12
CATEGORIES = ['最新资讯', '相关政策', '工具使用', 'HR实务']


def news_cards(items):
    cards = []
    for a in items:
        if a.get('cover'):
            cover = f'<div class="news-cover has-image"><img src="{e(a["cover"])}" alt="{e(a["coverAlt"])}" width="1200" height="675" loading="lazy" decoding="async"></div>'
        else:
            cover = f'<div class="news-cover"><span>{e(a["category"])}<br>HR WORK NOTES</span><svg class="news-cover-icon" width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M5 3h9l5 5v13H5z M14 3v6h5 M8 13h8 M8 17h5"/></svg></div>'
        cards.append(f'<a class="news-card" data-article-category="{e(a["category"])}" href="{e(a["path"])}">{cover}<div class="news-meta">{e(a["category"])} &nbsp; / &nbsp; {str(a["publishedAt"])[:10]}</div><h3>{e(a["title"])}</h3><p>{e(a["description"])}</p></a>')
    return ''.join(cards)


def article_cover(a):
    return f'<figure class="article-cover"><img src="{e(a["cover"])}" alt="{e(a["coverAlt"])}" width="1200" height="675" decoding="async"></figure>' if a.get('cover') else ''


def article_tags(a):
    return '<nav class="article-tags" aria-label="文章标签">'+''.join(f'<a href="/insights/?q={quote(t, safe="")}">{e(t)}</a>' for t in a.get('tags', []))+'</nav>' if a.get('tags') else ''


def page_path(base, number):
    return base if number == 1 else f'{base}page/{number}/'


def pagination(base, current, total):
    if total <= 1:
        return ''
    def link(number, label, cls='', rel=''):
        return f'<a class="button {cls}" href="{page_path(base, number)}" {rel}>{label}</a>'
    previous = link(current - 1, '← 上一页', rel='rel="prev"') if current > 1 else '<span class="button" aria-disabled="true">← 上一页</span>'
    following = link(current + 1, '下一页 →', rel='rel="next"') if current < total else '<span class="button" aria-disabled="true">下一页 →</span>'
    # Keep long archives compact, while every page remains linked from its neighbours.
    visible = sorted({1, total, *range(max(1, current - 2), min(total, current + 2) + 1)})
    numbers, last = [], 0
    for n in visible:
        if last and n > last + 1:
            numbers.append('<span aria-hidden="true">…</span>')
        numbers.append(f'<span class="button primary" aria-current="page">{n}</span>' if n == current else link(n, str(n)))
        last = n
    return f'<nav class="article-pagination" aria-label="文章分页">{previous}<div class="article-page-numbers">{"".join(numbers)}</div><span class="article-page-status">第 {current} / {total} 页</span>{following}</nav>'


def build_insights(articles, page, search_icon):
    collections = [('/insights/', 'HR 资讯', articles, 'insights', None)]
    collections += [(f'/insights/category/{i}/', c, [a for a in articles if a['category'] == c], 'insights-category', c) for i, c in enumerate(CATEGORIES)]
    for base, title, items, kind, category in collections:
        pages = max(1, math.ceil(len(items) / PAGE_SIZE))
        data = [{**{k: str(a[k]) for k in ('title', 'description', 'path', 'category', 'publishedAt')}, 'tags': a.get('tags', []), 'cover': a.get('cover', ''), 'coverAlt': a.get('coverAlt', '')} for a in items]
        payload = json.dumps(data, ensure_ascii=False).replace('<', '\\u003c').replace('&', '\\u0026')
        nav = '<div class="filters article-categories" aria-label="资讯分类"><a class="filter'+(' active' if category is None else '')+'" href="/insights/">全部资讯</a>'+''.join(f'<a class="filter{" active" if category == c else ""}" href="/insights/category/{i}/">{c}</a>' for i, c in enumerate(CATEGORIES))+'</div>'
        for current in range(1, pages + 1):
            subset = items[(current - 1) * PAGE_SIZE:current * PAGE_SIZE]
            body = f'''{nav}<div class="page-intro"><div class="eyebrow">HR WORK NOTES</div><h1>{e(title)}</h1><p>工作中的实用笔记，按发布时间排列。</p></div><label class="search list-search" style="display:block">{search_icon}<input type="search" id="article-search" aria-label="搜索当前栏目全部文章" placeholder="搜索文章、工具或关键词"></label><p id="article-count" class="article-count" role="status">共 {len(items)} 篇{f' · 第 {current} / {pages} 页' if pages > 1 else ''}</p><div class="news-grid" id="article-list">{news_cards(subset)}</div><p id="article-empty" class="empty-state{' hidden' if items else ''}">{'暂无匹配的文章。' if items else '这个分类还没有文章，发布后会显示在这里。'}</p><div id="article-pagination">{pagination(base, current, pages)}</div><script type="application/json" id="article-search-data">{payload}</script>'''
            page(page_path(base, current), title + (f' · 第{current}页' if current > 1 else ''), 'HR工具使用、数据口径和批量计算的实用文章。', body, kind)
