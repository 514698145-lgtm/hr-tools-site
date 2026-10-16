"""Readable article media and internal links; keep source URLs in Markdown metadata."""
from html import escape
import json
import re
from markdown_it import MarkdownIt
from markdown_it.token import Token


def render_article_body(body):
    md = MarkdownIt('commonmark', {'html': False}).enable('table')
    tokens = md.parse(body)
    # Preserve link labels and nearby citations without sending readers off site.
    for token in tokens:
        stack = []
        for child in token.children or []:
            if child.type == 'image' and not (child.attrGet('src') or '').startswith('/media/'):
                raise ValueError('Article images must use locally hosted /media/ assets')
            if child.type == 'link_open':
                href = child.attrGet('href') or ''
                internal = href.startswith('#') or (href.startswith('/') and not href.startswith('//'))
                stack.append(internal)
                if not internal:
                    child.type, child.tag, child.content = 'text', '', ''
            elif child.type == 'link_close' and stack and not stack.pop():
                child.type, child.tag, child.content = 'text', '', ''
        if token.children:
            token.children = [c for c in token.children if c.type != 'text' or c.content]
    output, i, figure_number = [], 0, 0
    while i < len(tokens):
        if (tokens[i].type == 'paragraph_open' and i + 2 < len(tokens)
                and tokens[i+1].type == 'inline' and len(tokens[i+1].children or []) == 1
                and tokens[i+1].children[0].type == 'image' and tokens[i+2].type == 'paragraph_close'):
            image = tokens[i+1].children[0]
            if not (image.attrGet('src') or '').startswith('/media/'):
                raise ValueError('Article images must use locally hosted /media/ assets')
            image.attrSet('loading', 'lazy')
            image.attrSet('decoding', 'async')
            caption = image.content
            consumed = 3
            if i + 5 < len(tokens) and tokens[i+3].type == 'paragraph_open' and tokens[i+5].type == 'paragraph_close':
                children = tokens[i+4].children or []
                if children and children[0].type == 'em_open' and children[-1].type == 'em_close':
                    caption = ''.join(c.content for c in children if c.type in ('text', 'code_inline'))
                    consumed = 6
            rendered = md.renderer.render([image], md.options, {})
            figure = Token('html_block', '', 0)
            figure_number += 1
            figure.content = f'<figure class="article-figure" id="article-image-{figure_number}">'+rendered+'<figcaption>'+escape(caption)+'</figcaption></figure>\n'
            output.append(figure)
            i += consumed
        else:
            output.append(tokens[i])
            i += 1
    return md.renderer.render(output, md.options, {})


def related_tools(items, tools, icon):
    lookup = {t['id']: t for t in tools}
    cards = []
    for tid in items:
        tool = lookup[tid]
        cards.append(f'<a class="article-tool-card" href="/tools/{escape(tid)}/"><span class="article-tool-icon" aria-hidden="true">{icon(tool["icon"],22)}</span><span class="article-tool-copy"><strong>{escape(tool["name"])}</strong><span>{escape(tool["description"])}</span></span><span class="article-tool-arrow" aria-hidden="true">↗</span></a>')
    return '<section class="article-tools" id="article-tools" aria-label="关联工具"><div class="article-tools-heading"><span>延伸使用</span><h2>把内容用到工作里</h2></div><div class="article-tools-grid">'+''.join(cards)+'</div></section>' if cards else ''


def article_redirects(root, paths):
    mapping = json.loads((root/'config/article-redirects.json').read_text(encoding='utf-8'))
    published = {}
    for source, target in mapping.items():
        if not re.fullmatch(r'/insights/[a-z0-9]+(?:-[a-z0-9]+)*/', source):
            raise ValueError('Invalid article redirect source')
        if not re.fullmatch(r'/insights/article[1-9][0-9]*/', target) or source in paths:
            raise ValueError('Article redirect must point directly to a numbered article')
        if not (root/'content/articles'/f'{target.strip("/").split("/")[-1]}.md').is_file():
            raise ValueError('Article redirect target does not exist')
        if target in paths:
            published[source] = target
    return published
