"""Build CMS-editable, source-backed policy cards as static pages."""
from datetime import date
from html import escape as e
from urllib.parse import urlparse
import re
from check_content import parse_article
from markdown_it import MarkdownIt
from disclaimers import notice

def build_policies(root,page,tools):
    md=MarkdownIt('commonmark',{'html':False}).enable('table');items=[];seen=set();tool_names={t['id']:t['name'] for t in tools}
    for file in sorted((root/'content/policies').glob('*.md')):
        d,body=parse_article(file.read_text(encoding='utf-8-sig'))
        if d.get('status') not in ('draft','published'):raise ValueError(f'{file}: 发布状态无效')
        if d['status']=='draft':continue
        for key in ['title','slug','category','description','keyPoint','scope','checkedAt','reviewAfter']:
            if not isinstance(d.get(key),str) or not d[key].strip():raise ValueError(f'{file}: 缺少{key}')
        if not re.fullmatch('[a-z0-9]+(?:-[a-z0-9]+)*',d['slug']) or d['slug'] in seen:raise ValueError(f'{file}: 无效或重复slug')
        seen.add(d['slug']);checked=date.fromisoformat(d['checkedAt']);review=date.fromisoformat(d['reviewAfter'])
        if review<checked:raise ValueError(f'{file}: 复核日不能早于核对日')
        if not body.strip() or not d.get('sources'):raise ValueError(f'{file}: 正文与来源必填')
        for url in d['sources']:
            u=urlparse(url)
            if u.scheme!='https' or not u.hostname or not u.hostname.endswith('.gov.cn'):raise ValueError(f'{file}: 需使用官方HTTPS来源')
        for tid in d.get('relatedTools',[]):
            if tid not in tool_names:raise ValueError(f'{file}: 关联工具不存在')
        items.append({**d,'body':body,'path':'/policies/'+d['slug']+'/'})
    cats=sorted({x['category'] for x in items})
    cards=''.join(f'<a class="policy-item" href="{x["path"]}" data-policy-category="{e(x["category"])}" data-policy-search="{e(x["title"]+x["description"]+x["body"])}"><span class="resource-tag">{e(x["category"])}</span><h2>{e(x["title"])}</h2><strong class="policy-key">{e(x["keyPoint"])}</strong><p>{e(x["description"])}</p><div class="policy-card-footer"><span>资料核对 {e(x["checkedAt"])}</span><span>查看要点 →</span></div></a>' for x in items)
    disclaimer=notice('editorial', '政策资料使用声明')
    body=f'<div class="page-intro"><div class="eyebrow">HR POLICY LIBRARY</div><h1>政策知识库</h1><p>按工作场景查要点、看原文，再使用对应工具。</p></div><div class="policy-toolbar"><label class="field">搜索政策<input id="policy-search" type="search" placeholder="搜索年休假、试用期、奖金…"></label><label class="field">工作场景<select id="policy-category"><option value="">全部场景</option>'+''.join(f'<option>{e(c)}</option>' for c in cats)+f'</select></label><a class="button" href="/official-sites/">查地方官网 →</a></div><p id="policy-count" aria-live="polite">{len(items)} 篇政策速查</p><div class="policy-grid">{cards}</div><p id="policy-empty" hidden>没有匹配内容，请更换关键词或场景。</p>{disclaimer}<script type="module" src="/assets/policy-library.js"></script>'
    page('/policies/','政策知识库','HR政策速查：合同、休假、补偿、个税、工伤与退休，附官方来源及适用范围。',body,'policies')
    for x in items:
        sources=''.join(f'<li><a href="{e(url)}" target="_blank" rel="noopener noreferrer">官方原文 · {e(urlparse(url).hostname)} ↗</a></li>' for url in x['sources'])
        related=''.join(f'<a class="button" href="/tools/{tid}/">{e(tool_names[tid])} →</a>' for tid in x.get('relatedTools',[]))
        body=f'<div class="article-layout"><a class="back-link" href="/policies/">← 政策知识库</a><article><header class="article-header"><div class="eyebrow">{e(x["category"])}</div><h1>{e(x["title"])}</h1><p>{e(x["description"])}</p><div class="news-meta">资料核对 {e(x["checkedAt"])} · 计划复核 {e(x["reviewAfter"])}</div></header><div class="policy-scope"><strong>{e(x["keyPoint"])}</strong><p>适用范围：{e(x["scope"])}</p></div><div class="article-body">{md.render(x["body"])}</div><section class="policy-sources"><h2>官方依据</h2><ul>{sources}</ul></section><div class="resource-actions">{related}<a class="button" href="/official-sites/">地方政策官网 →</a></div></article>{disclaimer}</div>'
        page(x['path'],x['title'],x['description'],body,'policy-detail',article=x)
    return len(items)
