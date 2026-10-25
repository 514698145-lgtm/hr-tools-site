"""Source-backed discovery pages. Policy values and examples use the live engines."""
import json
import re
import subprocess
from datetime import date
from html import escape as e
from urllib.parse import urlencode, urlparse

from markdown_it import MarkdownIt
try:
    from .check_content import parse_article
    from .disclaimers import notice
except ImportError:
    from check_content import parse_article
    from disclaimers import notice


def content_items(root, folder):
    items = []
    for file in sorted((root / 'content' / folder).glob('*.md')):
        meta, body = parse_article(file.read_text(encoding='utf-8'))
        if meta.get('status', 'published') == 'draft':
            continue
        if meta.get('status', 'published') != 'published':
            raise ValueError(f'{file}: invalid discovery status')
        if not re.fullmatch(r'[a-z]+(?:-[a-z]+)*', meta.get('slug', '')):
            raise ValueError(f'{file}: invalid discovery slug')
        for key in ('title', 'description', 'updatedAt'):
            if not isinstance(meta.get(key), str) or not meta[key].strip():
                raise ValueError(f'{file}: missing {key}')
        date.fromisoformat(meta['updatedAt'])
        items.append({**meta, 'body': body, 'path': f'/{folder}/{meta["slug"]}/'})
    if len({x['slug'] for x in items}) != len(items):
        raise ValueError('Duplicate discovery slug')
    return sorted(items, key=lambda x: (x.get("order", 100), x["title"]))


def discovery_snapshot(root, cities):
    raw = subprocess.check_output(
        ['node', str(root / 'scripts/export-discovery.mjs')], cwd=root,
        input=json.dumps([{'city': x['city'], 'month': x['month']} for x in cities], ensure_ascii=False).encode(),
    )
    return json.loads(raw)


def amount(value, unit='元'):
    if value is None:
        return '尚未接入'
    text = f'{value:,.2f}'.rstrip('0').rstrip('.')
    return f'{text}<small>{e(unit)}</small>'


def link_card(href, title, description, label='查看详情'):
    return f'<a class="discovery-link" href="{e(href)}"><div><h3>{e(title)}</h3><p>{e(description)}</p></div><span>{e(label)} <b aria-hidden="true">→</b></span></a>'


def page_schema(site, path, title, parent_path, parent_title):
    if not site:
        return None
    return {'@context': 'https://schema.org', '@graph': [
        {'@type': 'WebPage', 'name': title, 'url': site + path, 'inLanguage': 'zh-CN'},
        {'@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': n, 'name': name, 'item': site + href}
            for n, (name, href) in enumerate([('工具大厅', '/'), (parent_title, parent_path), (title, path)], 1)
        ]},
    ]}


def tool_guide(tool_id, examples):
    selected = [x for x in examples if x['toolId'] == tool_id]
    if not selected:
        return ''
    blocks = []
    for item in selected:
        result = item['result']
        rows = [x for x in result['lines'] if x['label'] in item['metrics']]
        metrics = ''.join(f'<div><dt>{e(x["label"])}</dt><dd>{amount(x["value"], x["unit"])}</dd></div>' for x in rows)
        blocks.append(f'''<details class="tool-walkthrough"><summary><span><small>虚构数据 · {e(item['context'])}</small><strong>{e(item['title'])}</strong></span><span class="discovery-detail-label">查看算例 <b aria-hidden="true">＋</b></span></summary>
<div class="tool-walkthrough-body"><p>{e(item['assumptions'])}</p><dl class="discovery-example-metrics">{metrics}<div class="discovery-example-total"><dt>{e(result['label'])}</dt><dd>{amount(result['value'], result['unit'])}</dd></div></dl><p>{e(item['explanation'])}</p><div class="discovery-example-actions"><button class="button" type="button" data-example-id="{e(item['id'])}">带入并试算 →</button><small>会替换当前输入；不会保存为个人记录。</small></div></div></details>''')
    data = json.dumps([{'id': x['id'], 'input': x['input']} for x in selected], ensure_ascii=False).replace('<', '\\u003c')
    topic = {'five-insurances-housing-fund': 'social-fund', 'income-tax': 'payroll-tax', 'severance': 'labor-relations'}[tool_id]
    cities = '<a href="/cities/">查城市基数 →</a>' if tool_id == 'five-insurances-housing-fund' else ''
    return f'''<link rel="stylesheet" href="/assets/discovery.css"><section class="tool-guide" aria-labelledby="tool-guide-heading"><div class="discovery-section-heading"><div><small>CALCULATION NOTES</small><h2 id="tool-guide-heading">怎么算？看一组数字</h2></div><div class="discovery-inline-links">{cities}<a href="/topics/{topic}/">相关政策与表格 →</a></div></div>{''.join(blocks)}<p id="tool-example-status" class="discovery-example-status" role="status"></p><script type="application/json" id="tool-example-data">{data}</script></section>'''


def build_source_index(root, page, articles, cities, snapshot):
    entries = []
    for article in articles:
        entries.append((article['slug'], article['title'], article['path'], article.get('sources', [])))
    for file in sorted((root / 'content/policies').glob('*.md')):
        item, _ = parse_article(file.read_text(encoding='utf-8'))
        if item.get('status') == 'published':
            entries.append(('policy-' + item['slug'], item['title'], '/policies/' + item['slug'] + '/', item['sources']))
    for item in cities:
        policy = next(p for p in snapshot['cities'] if p['city'] == item['city'] and p['month'] == item['month'])
        entries.append(('city-' + item['slug'], item['title'], item['path'], [x['source']['url'] for x in policy['sources']]))
    blocks = []
    for anchor, title, path, urls in entries:
        links = []
        for n, url in enumerate(dict.fromkeys(urls), 1):
            parsed = urlparse(url)
            if parsed.scheme not in ('http', 'https') or not parsed.hostname or parsed.username:
                raise ValueError('Published citations require a public HTTP(S) source')
            links.append(f'<li><a href="{e(url)}" target="_blank" rel="noopener noreferrer">资料原文 {n} · {e(parsed.hostname)} ↗</a></li>')
        blocks.append(f'<section class="discovery-source-entry" id="{e(anchor)}"><h2>{e(title)}</h2><a class="discovery-source-back" href="{e(path)}">返回相关内容 →</a><ol>{"".join(links)}</ol></section>')
    body = '<link rel="stylesheet" href="/assets/discovery.css"><div class="discovery-page"><header class="discovery-intro"><div class="eyebrow">REFERENCE DESK</div><h1>核验来源</h1><p>按文章与政策对应查看原始资料。本站整理与官方文件不一致时，以适用的有效原文为准。</p></header>' + ''.join(blocks) + '</div>' + notice('editorial', '来源使用说明')
    page('/sources/', '核验来源', 'HR工作站文章、政策与城市缴费资料的原始来源入口。', body, 'sources', article={'noindex': True})


def build_discovery(root, page, tools, articles, site, cities=None, snapshot=None):
    md = MarkdownIt('commonmark', {'html': False}).enable('table')
    cities = cities if cities is not None else content_items(root, 'cities')
    topics = content_items(root, 'topics')
    snapshot = snapshot if snapshot is not None else discovery_snapshot(root, cities)
    policies = {p.stem: parse_article(p.read_text(encoding='utf-8'))[0] for p in (root / 'content/policies').glob('*.md')}
    catalog = {x['id']: x for x in json.loads((root / 'public/data/hr-templates.json').read_text(encoding='utf-8'))}
    tool_map = {x['id']: x for x in tools}
    city_data = {(x['city'], x['month']): x for x in snapshot['cities']}
    css = '<link rel="stylesheet" href="/assets/discovery.css">'
    cards = []
    bases = [('pension', '养老保险'), ('medical', '医疗与生育'), ('unemployment', '失业保险'), ('injury', '工伤保险'), ('fund', '住房公积金')]
    for item in cities:
        p = city_data[(item['city'], item['month'])]
        v = p['values']
        if any(v.get(k + end) is None for k, _ in bases for end in ('Min', 'Max')):
            raise ValueError(f'{item["city"]}: complete base limits required for a city discovery page')
        calculator = '/tools/five-insurances-housing-fund/?' + urlencode({'city': p['city'], 'month': p['month']})
        cards.append(f'''<a class="discovery-city-card" href="{item['path']}"><span class="discovery-city-top"><strong>{e(p['city'])}</strong><small>{e(p['month'])} 已收录标准</small></span><p>{e(item['highlight'])}</p><dl><div><dt>社保基数</dt><dd>{amount(v['pensionMin'], '')}—{amount(v['pensionMax'])}</dd></div><div><dt>公积金基数</dt><dd>{amount(v['fundMin'], '')}—{amount(v['fundMax'])}</dd></div></dl><span class="discovery-city-more">查看范围与计算 →</span></a>''')
        source_rows = list({row['source']['url']: row for row in p['sources']}.values())
        for row in source_rows:
            url = urlparse(row['source']['url'])
            if url.scheme not in ('http', 'https') or not url.hostname or url.username:
                raise ValueError('City evidence requires a public HTTP(S) source')
        source_index = {r['source']['url']: n for n, r in enumerate(source_rows, 1)}
        rows = ''
        for key, label in bases:
            evidence = p['evidence'][key + 'Min']
            no = source_index[evidence['source']['url']]
            rows += f'<tr><th scope="row">{label}</th><td>{amount(v[key + "Min"])}</td><td>{amount(v[key + "Max"])}</td><td><a href="#city-source-{no}">依据 {no}</a></td></tr>'
        scenarios = ''.join(f'<tr><th scope="row">{amount(s["wage"])}</th><td>{amount(s["bases"]["pension"]["value"])}</td><td>{amount(s["bases"]["fund"]["value"])}</td></tr>' for s in p['scenarios'])
        rate_rows = ''.join(f'<tr><th scope="row">{label}</th><td>{amount(v.get(key+"P"), "%")}</td><td>{amount(v.get(key+"C"), "%")}</td></tr>' for key, label in [('pension', '养老保险'), ('medical', '基本医疗'), ('unemployment', '失业保险')])
        rate_rows += f'<tr><th scope="row">工伤保险</th><td>个人不缴</td><td>按单位核定</td></tr><tr><th scope="row">住房公积金</th><td colspan="2">按单位选定比例填写；普通缴存比例上限 {v["fundRateMax"]}%</td></tr>'
        extra = ''.join(f'<li>{label}：{amount(v.get(key), unit)}</li>' for key, label, unit in [('medicalExtraC', '医疗附加公司比例', '%'), ('birthC', '生育保险单列公司比例', '%'), ('fixedP', '个人月固定附加费', '元'), ('fixedC', '公司月固定附加费', '元')])
        sources = ''.join(f'<li id="city-source-{n}"><a href="{e(r["source"]["url"])}" target="_blank" rel="noopener noreferrer">{e(r["source"]["label"])} ↗</a><small>网站已接入月份 {e(r["from"])}—{e(r["to"])}；不代表文件法定失效日。</small></li>' for n, r in enumerate(source_rows, 1))
        body = css + f'''<div class="discovery-page"><a class="back-link" href="/cities/">← 城市缴费速查</a><header class="discovery-hero"><div><div class="eyebrow">CITY CONTRIBUTION GUIDE</div><h1>{e(item['title'])}</h1><p>{e(item['highlight'])}</p><div class="discovery-meta"><span>适用月份 {e(p['month'])}</span><span>参数核查 {e(p['checked'])}</span><a href="#city-source-1">官方来源 →</a></div><a class="button primary" href="{e(calculator)}">带入{e(p['city'])}，开始计算 →</a></div><div class="discovery-city-mark" aria-hidden="true">{e(p['city'][:1])}<span>{e(item['slug'].upper())}</span></div></header>
<div class="discovery-scope"><small>适用范围</small><p>{e(item['scope'])}</p></div><section class="discovery-section"><div class="discovery-section-heading"><h2>缴费基数，分项目看</h2><span>单位：人民币元 / 月</span></div><p class="discovery-mobile-hint">左右滑动表格，可查看完整数据与出处。</p><div class="table-wrap discovery-table" tabindex="0" role="region" aria-label="政策与算例数据表，可左右滑动"><table><thead><tr><th>项目</th><th>下限</th><th>上限</th><th>出处</th></tr></thead><tbody>{rows}</tbody></table></div><p class="discovery-caption">上下限是政策范围；每个人的实际基数还要结合适用的缴费工资确定。</p></section>
<details class="discovery-details"><summary>已接入比例与其他缴费条件 <span aria-hidden="true">＋</span></summary><div class="table-wrap discovery-table" tabindex="0" role="region" aria-label="政策与算例数据表，可左右滑动"><table><thead><tr><th>项目</th><th>个人</th><th>公司</th></tr></thead><tbody>{rate_rows}</tbody></table></div><ul class="discovery-extra-rates">{extra}</ul><p>未接入项不按零处理；医疗、生育与附加部分请合并核对，工伤费率、公积金比例由HR按单位实际核定填写。</p></details>
<section class="discovery-section"><div class="discovery-section-heading"><div><small>ILLUSTRATIVE EXAMPLE</small><h2>工资不同，基数怎样变化？</h2></div><span>虚构工资 · 仅演示基数</span></div><div class="table-wrap discovery-table" tabindex="0" role="region" aria-label="政策与算例数据表，可左右滑动"><table><thead><tr><th>参考缴费工资</th><th>养老基数</th><th>公积金基数</th></tr></thead><tbody>{scenarios}</tbody></table></div><p class="discovery-caption">假设两类缴费工资相同、适用普通口径。医保或公积金工资不同时须分别填写；本表不是实际缴费或补缴金额。</p></section>
<div class="article-body discovery-prose">{md.render(item['body'])}</div><div class="discovery-next"><div><h2>核对完条件，再算金额</h2><p>个人、公司分开计算；已填数据可带入单Sheet批量模板。</p></div><a class="button primary" href="{e(calculator)}">打开{e(p['city'])}计算器 →</a></div>
<details class="discovery-details discovery-sources"><summary>官方来源与页面整理说明 <span aria-hidden="true">＋</span></summary><ol>{sources}</ol><p>页面整理 {e(item['updatedAt'])}；数值与计算器共用参数库，不代表全部地方附加规则均已完整接入。该页保留标注月份，不以每天构建冒充每天核查。</p></details>
<div class="discovery-inline-links"><a href="/topics/social-fund/">社保与公积金专题 →</a><a href="/templates/social-fund-ledger/">社保公积金办理台账 →</a><a href="/official-sites/">查地方官网 →</a></div></div>''' + notice('editorial', '资料使用声明')
        page(item['path'], item['title'], item['description'], body, 'city-detail', schema=page_schema(site, item['path'], item['title'], '/cities/', '城市缴费速查'), article=item)
    body = css + '<div class="discovery-page"><header class="discovery-intro"><div class="eyebrow">CITY CONTRIBUTION GUIDES</div><h1>城市缴费速查</h1><p>先看本地基数，再核对个人与公司缴费。</p><div class="discovery-inline-links"><a href="/tools/five-insurances-housing-fund/">直接打开计算器 →</a><a href="/topics/social-fund/">社保与公积金专题 →</a></div></header><div class="discovery-city-grid">' + ''.join(cards) + '</div><p class="discovery-caption">首批展示基数上下限明确的城市。各页标注适用月份、参数核查日期与未接入项；不将目录覆盖当作全部规则已补齐。</p></div>' + notice('editorial', '资料使用声明')
    page('/cities/', '城市缴费速查', '按城市查社保、公积金基数上下限和已接入比例，核对适用期间，再进入五险一金计算器。', body, 'city-index')
    topic_cards = []
    for item in topics:
        topic_cards.append(link_card(item['path'], item['title'], item['description'], '打开专题'))
        sections = []
        if item['slug'] == 'social-fund':
            sections.append('<section class="discovery-section"><div class="discovery-section-heading"><h2>先选城市</h2><a href="/cities/">查看全部 →</a></div><div class="discovery-city-pills">' + ''.join(f'<a href="{c["path"]}">{e(c["city"])}</a>' for c in cities) + '</div></section>')
        for key, title in [('tools', '直接使用工具'), ('policies', '核对政策条件'), ('templates', '把资料接起来')]:
            links = []
            for identifier in item.get(key, []):
                if key == 'tools':
                    x = tool_map[identifier]; href = '/tools/' + identifier + '/'; label = x['name']; desc = x['description']
                elif key == 'policies':
                    x = policies[identifier]
                    if x['status'] != 'published':
                        raise ValueError('Topic references a draft policy')
                    href = '/policies/' + x['slug'] + '/'; label = x['title']; desc = x['description']
                else:
                    x = catalog[identifier]; href = '/templates/' + identifier + '/'; label = x['title']; desc = x['description']
                links.append(link_card(href, label, desc, '开始计算' if key == 'tools' else '查看'))
            sections.append(f'<section class="discovery-section"><h2>{title}</h2><div class="discovery-link-grid">' + ''.join(links) + '</div></section>')
        relevant = [a for a in articles if set(a.get('tags', [])) & set(item.get('tags', [])) or set(a.get('relatedTools', [])) & set(item.get('tools', []))][:3]
        if relevant:
            sections.append('<section class="discovery-section"><div class="discovery-section-heading"><h2>相关解读</h2><a href="/insights/">HR资讯 →</a></div><div class="discovery-reading">' + ''.join(link_card(a['path'], a['title'], a['description'], '阅读') for a in relevant) + '</div></section>')
        if item['slug'] == 'hr-templates':
            sections.append('<div class="discovery-next"><div><h2>为团队准备一套表格</h2><p>64份可编辑模板，可按分类或全部打包下载。</p></div><a class="button" href="/templates/">进入HR表格库 →</a></div>')
        body = css + f'<div class="discovery-page"><a class="back-link" href="/topics/">← HR工作专题</a><header class="discovery-intro"><div class="eyebrow">{e(item["eyebrow"])}</div><h1>{e(item["title"])}</h1><p>{e(item["description"])}</p></header><div class="discovery-topic-intro article-body">{md.render(item["body"])}</div>' + ''.join(sections) + '<div class="discovery-inline-links"><a href="/topics/">更多工作专题 →</a><a href="/editorial/">来源与更正说明 →</a></div></div>' + notice('editorial', '内容使用声明')
        page(item['path'], item['title'], item['description'], body, 'topic', schema=page_schema(site, item['path'], item['title'], '/topics/', 'HR工作专题'), article=item)
    body = css + '<div class="discovery-page"><header class="discovery-intro"><div class="eyebrow">HR WORK COLLECTIONS</div><h1>HR工作专题</h1><p>围绕一件工作，把政策、工具和表格放在一起。</p></header><div class="discovery-topic-grid">' + ''.join(topic_cards) + '</div><div class="discovery-inline-links"><a href="/cities/">城市缴费速查 →</a><a href="/insights/">查看最新HR资讯 →</a></div></div>' + notice('editorial', '内容使用声明')
    page('/topics/', 'HR工作专题', '按社保公积金、工资奖金个税、合同劳动关系与HR表格场景，找到对应政策、工具和可编辑模板。', body, 'topic-index')
    build_source_index(root, page, articles, cities, snapshot)
    return {'cities': len(cities), 'topics': len(topics), 'examples': len(snapshot['examples'])}
