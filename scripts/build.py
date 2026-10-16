"""Framework-independent static preview build. No deploy or external writes."""
from datetime import datetime, timezone
from html import escape as e
import json
import re
from pathlib import Path
import shutil
import sys
from urllib.parse import urlparse
from markdown_it import MarkdownIt
from check_content import check, parse_article
from build_resources import build_resources
from seo import SEO
from build_admin import build_admin
from build_policies import build_policies
from build_services import build_services
from build_template_packs import build_template_packs
from build_relax import build_relax
from build_insights import news_cards, build_insights
from build_contact import contact_widget
from build_service_entry import service_entry
from disclaimers import notice
from check_import_templates import check_import_templates

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
check_import_templates(ROOT)
config = json.loads((ROOT / 'config/release.json').read_text())
site = config.get('siteUrl')
seo = SEO(ROOT, site)
site = seo.site
if site and (urlparse(site).scheme != 'https' or not urlparse(site).netloc):
    raise ValueError('siteUrl must be a valid HTTPS origin')
report = check(ROOT, datetime.now(timezone.utc))
if report['errors']:
    raise ValueError('\n'.join(report['errors']))
# Prepare expensive template archives before replacing the served preview files.
build_template_packs(ROOT)
if DIST.exists():
    if DIST.resolve().parent != ROOT.resolve():
        raise ValueError('Unsafe output path')
    shutil.rmtree(DIST)
shutil.copytree(ROOT / 'public', DIST, ignore=shutil.ignore_patterns('.gitkeep', '.DS_Store', 'Thumbs.db'))
tools = json.loads((ROOT / 'config/tools.json').read_text(encoding='utf-8'))
hall_tools = [t for t in tools if t['id'] != 'date-calculator']
articles = []
md = MarkdownIt('commonmark', {'html': False}).enable('table')
for entry in report['publishable']:
    data, body = parse_article((ROOT / entry['source']).read_text(encoding='utf-8'))
    articles.append({**data, 'body': md.render(body), 'path': entry['path']})
articles.sort(key=lambda a: str(a['publishedAt']), reverse=True)
routes = []
friend_data, _ = parse_article((ROOT/'content/friend-links.md').read_text(encoding='utf-8-sig'))
friend_items = []
for friend in friend_data.get('links', []):
    url = urlparse(friend['url'])
    if url.scheme != 'https' or not url.netloc:
        raise ValueError('友情链接必须使用有效 HTTPS 地址')
    friend_items.append(f'<a href="{e(friend["url"])}" target="_blank" rel="noopener noreferrer">{e(friend["name"])}</a>')
friend_links = '<nav class="footer-friends" aria-label="友情链接"><span>友情链接</span>' + ''.join(friend_items) + '</nav>' if friend_items else ''



def icon(name, size=20):
    paths = {'grid':'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z','book':'M3 4h8l1 2 1-2h8v16h-8l-1 1-1-1H3z M12 6v15','briefcase':'M3 7h18v14H3z M8 7V3h8v4 M3 12c5 4 13 4 18 0','arrow':'M5 12h14 M13 6l6 6-6 6','search':'M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15 M16 16l5 5','check':'m5 12 4 4L19 6','upload':'M12 16V3 M7 8l5-5 5 5 M4 15v6h16v-6','shield':'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6z M9 12l2 2 4-4','receipt':'M6 3h12v18l-3-2-3 2-3-2-3 2z M9 7h6 M9 11h6 M9 15h3','sun':'M12 2v2 M12 20v2 M2 12h2 M20 12h2 M16 12a4 4 0 1 0-8 0 4 4 0 0 0 8 0'}
    return f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="{paths.get(name,paths["grid"])}"/></svg>'


def page(path, title, description, body, kind, tool=None, schema=None, article=None):
    if kind in ('article', 'insights', 'insights-category'):
        body += notice('editorial', '内容使用声明')
    # Keep contextual notices after all content (including feedback), before the footer.
    notices = re.findall(r'<section class="method disclaimer"[^>]*>.*?</section>', body, flags=re.S)
    if notices:
        body = re.sub(r'<section class="method disclaimer"[^>]*>.*?</section>', '', body, flags=re.S)
    if 'class="tool-service-link"' not in body:
        entry = service_entry(kind)
        feedback_start = '<section class="panel feedback-panel"'
        if feedback_start in body:
            body = body.replace(feedback_start, entry + feedback_start, 1)
        else:
            body += entry
    body += ''.join(notices)
    seo_head = seo.metadata(path, title, description, kind, article)
    indexable = kind not in ('workspace', 'admin', 'feedback', '404', 'redirect')
    if site and kind == 'policy-detail' and article:
        schema={'@context':'https://schema.org','@type':'Article','headline':title,'description':description,'dateModified':article['checkedAt'],'author':{'@type':'Organization','name':'HR 工作站'},'mainEntityOfPage':site+path,'citation':article.get('sources',[])}
    if site and not schema and indexable:
        schema={'@context':'https://schema.org','@type':'WebSite' if kind=='home' else 'WebPage','name':title,'description':description,'url':site+path}
    structured = '<script type="application/ld+json">'+json.dumps(schema,ensure_ascii=False).replace('<','\\u003c')+'</script>' if schema else ''
    nav=''
    for href,label,symbol,active in [('/','工具大厅','grid',kind in ('home','tool')),('/workspace/','我的工作台','briefcase',kind=='workspace'),('/#hr-resources','HR 工作资源','book',kind in ('policies','policy-detail','templates','template','official-sites','contract-reminders')),('/relax/','放松一下','grid',kind=='relax'),('/enterprise-services/','企业服务','briefcase',kind=='enterprise-services'),('/guide/','使用导览','book',kind=='guide')]:
        nav+=f'<a class="nav-link {"active" if active else ""}" href="{href}" {"aria-current=page" if active else ""}>{icon(symbol)}<span>{label}</span>{"<span class=nav-dot></span>" if active else ""}</a>'
    contact = contact_widget(ROOT) if kind not in ('admin', '404', 'redirect') else ''
    html=f'''<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">{seo_head}<link rel="preload" href="/fonts/hr-sans/hr-sans-400-00.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="/fonts/hr-sans/hr-sans-500-00.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="/assets/style.css"><link rel="stylesheet" href="/assets/brand.css"><link rel="stylesheet" href="/assets/typography.css">{structured}</head>
<body data-page="{kind}" {f'data-tool="{tool}"' if tool else ''}><a class="skip" href="#main-content">跳到主要内容</a><aside class="sidebar"><a href="/" class="brand"><span class="independent-brand">HR<span>工作站</span></span><span class="workspace-name">YOUR EVERYDAY TOOLKIT</span></a><div class="nav-caption">工作空间</div><nav aria-label="主导航">{nav}</nav><div class="sidebar-bottom"><div class="local-note"><strong>{icon('shield',16)} 计算数据留在本机</strong>表格在本机解析，保存由你决定。</div><div class="profile"><div class="avatar">HR</div><div><strong>本机工作空间</strong><small>LOCAL WORKSPACE</small></div></div></div></aside><div class="main-shell"><header class="topbar"><div class="breadcrumbs">工作空间 <span>/</span> {e('工具大厅' if kind=='home' else title)}</div><div class="top-right"><span id="today"></span><span class="preview-label">{e("管理空间" if kind=="admin" else "免登录使用") if config.get("deploymentEnabled") else "本地预览"}</span></div></header><main class="page" id="main-content">{body}<footer class="footer">{friend_links}<span>HR 工作站 · 独立工具网站，非人力窝官方网站。</span><span><a href="/guide/">使用导览</a> · <a href="/disclaimer/">免责声明</a></span></footer></main></div><div id="live-region" aria-live="polite"></div>{contact}<script type="module" src="/assets/app.js"></script><script type="module" src="/assets/feedback.js"></script></body></html>'''
    target=DIST/'404.html' if path=='/404.html' else DIST/path.strip('/')/'index.html'
    target.parent.mkdir(parents=True,exist_ok=True);target.write_text(html,encoding='utf-8')
    if indexable: routes.append(path)


home=f'''<section class="hero"><div><div class="eyebrow">HUMAN RESOURCES / EVERYDAY TOOLS</div><h1>让每一份专业，<br>都有<em>高效的工具。</em></h1><p>薪酬、社保、成本与补偿，你的日常 HR 工具都在这里。</p><div class="hero-meta"><span>{icon('check',14)} 单条与批量计算</span><span>{icon('check',14)} 结果一键导出</span><span>{icon('check',14)} 电脑手机都能用</span></div></div><div class="hero-art" aria-hidden="true"><div class="orbit"></div><div class="art-mini">{icon('check',14)} &nbsp; 算清每一笔</div><div class="art-paper"><small>HR · WORKSPACE</small><div class="art-number">HR / {len(hall_tools):02d}</div><div class="art-line"></div><div class="art-line" style="width:70%"></div><div class="art-chart"><i style="height:20px"></i><i style="height:30px"></i><i style="height:24px"></i><i style="height:38px"></i><i style="height:48px"></i></div></div><div class="art-badge">{icon('receipt',30)}</div></div></section>
<section aria-label="计算工具"><div class="toolbar"><div class="filters">{''.join(f'<button class="filter {"active" if i==0 else ""}" data-category="{c}" aria-pressed="{str(i==0).lower()}">{c}</button>' for i,c in enumerate(['全部工具','薪酬社保','企业成本','劳动关系','人事数据']))}</div><label class="search">{icon('search',18)}<input id="tool-search" type="search" aria-label="搜索工具" placeholder="搜索你需要的工具"></label></div><div class="section-heading"><h2>日常工具 <small id="tool-count">{len(hall_tools)} 个实用工具</small></h2><a href="/workspace/">我的收藏 {icon('arrow',15)}</a></div><div class="tools-grid" id="tool-grid"></div><noscript><p>计算需要启用 JavaScript。</p>{''.join(f'<p><a href="/tools/{t["id"]}/">{t["name"]}</a></p>' for t in hall_tools)}</noscript></section>
<section class="resource-hall" id="hr-resources" tabindex="-1"><div class="section-heading"><h2>HR 工作资源 <small>表格、清单与常用入口</small></h2></div><div class="resource-grid"><a class="resource-card" href="/policies/"><span class="resource-tag">按场景速查</span><h3>政策知识库</h3><p>合同、休假、补偿与个税要点，附适用范围和官方原文。</p><strong>查政策要点 →</strong></a><a class="resource-card" href="/templates/"><span class="resource-tag">8 类 · 64 份</span><h3>HR 表格库</h3><p>面试资料、入职清单、薪酬考勤、培训绩效与离职交接。</p><strong>找表格与清单 →</strong></a><a class="resource-card" href="/contract-reminders/"><span class="resource-tag">本机待办</span><h3>合同到期提醒</h3><p>登记合同日期，提前安排跟进；打开网站查看提醒。</p><strong id="reminder-hall-count">查看到期事项 →</strong></a><a class="resource-card" href="/official-sites/"><span class="resource-tag">42 个官方入口</span><h3>HR 官网导航</h3><p>按地区找人社、医保、公积金、税务和法律法规发布网站。</p><strong>查政策、办业务 →</strong></a><a class="resource-card" href="/enterprise-services/"><span class="resource-tag">服务对接 · 人力窝</span><h3>企业人力资源服务</h3><p>全国社保、外包、招聘/猎头、背调与企业出海。</p><strong>了解服务与咨询 →</strong></a></div></section>
<section><div class="section-heading"><h2>HR 资讯 <small>工作中的实用笔记</small></h2><a href="/insights/">查看全部 {icon('arrow',15)}</a></div><div class="news-grid">{news_cards(articles[:3])}</div></section>'''
home=home.replace('</div></section>\n<section><div class="section-heading"><h2>HR 资讯','<a class="resource-card" href="/relax/"><span class="resource-tag">给自己一个小休息</span><h3>放松一下</h3><p>HR 待办消消乐，每局随机，今天的整理高手会是你吗？</p><strong>玩一局 · 今日 TOP20 →</strong></a></div></section>\n<section><div class="section-heading"><h2>HR 资讯')
page('/','工具大厅','HR在线计算工具：五险一金、工资奖金个税、离职补偿、到手工资和用工成本，支持批量导入与结果导出。',home,'home')
build_insights(articles, page, icon('search',18))
page('/feedback/','我的反馈','查看我发布和参与的讨论，以及回复和处理进度。','<div class=page-intro><h1>我的反馈</h1><p>免登录参与，回复与进度在这里查看。</p></div><div id=my-feedback></div>','feedback')
page('/admin/feedback/','反馈管理','管理员回复、处理进度和内容管理。','<div class=page-intro><h1>反馈管理</h1><p>查看吐槽与评论，发布官方回复，更新处理进度。</p></div><div id=feedback-admin></div><script type=module src=/assets/feedback.js></script>','admin')
page('/workspace/','我的工作台','收藏常用工具，保存和导出本机计算记录。','<link rel="stylesheet" href="/assets/workspace.css"><div id="workspace-content"><h1>我的工作台</h1><p>正在读取本机收藏与计算记录。</p></div><noscript>请启用 JavaScript 查看本机工作台。</noscript>','workspace')
disclaimer=json.loads((ROOT/'config/disclaimer.json').read_text(encoding='utf-8-sig'))
_,guide_body=parse_article((ROOT/'content/guide.md').read_text(encoding='utf-8-sig'))
page('/guide/','使用导览','HR工作站用户手册：计算工具、批量模板、工作台、资讯及匿名反馈的使用说明。','<div class=article-layout><div class=page-intro><h1>使用导览</h1><p>从第一次计算到批量处理，按步骤开始。</p></div><div class=article-body>'+md.render(guide_body)+'</div></div>','guide')
page('/disclaimer/','免责声明','HR工作站测算适用范围及数据说明。','<div class=article-layout><div class=page-intro><h1>免责声明</h1></div><div class=article-body><p>'+e(disclaimer['common'])+'</p>'+''.join('<h2>'+e(title)+'</h2><p>'+e(disclaimer[key])+'</p>' for key,title in [('independence','网站与品牌关系'),('services','企业服务与委托关系'),('editorial','资讯与政策资料'),('resources','表格、提醒与外部链接'),('responsibility','责任范围与问题反馈')])+''.join('<h2>'+e(t['name'])+'</h2><p>'+e(disclaimer['tools'][t['id']])+'</p>' for t in tools)+'</div></div>','disclaimer')
for t in tools:
    note=t['note'];source=t.get('source');body=f'''<a class="back-link" href="/">← 返回工具大厅</a><div class="page-intro tool-heading"><div class="tool-icon {t['color']}">{icon(t['icon'],26)}</div><div><h1>{t['name']}</h1><p>{t['description']}</p></div></div><div class="tool-tabs" role="tablist" aria-label="计算方式"><button class="tool-tab active" role="tab" aria-selected="true" data-mode="single">单条计算</button><button class="tool-tab" role="tab" aria-selected="false" data-mode="batch">批量导入</button></div><section id="single-mode"><div class="calculator-grid"><div class="panel"><h2>填写计算条件</h2><p class="panel-subtitle">{t['tag']} · 所有金额单位为人民币</p><p id="single-batch-guide" class="notice hidden" role="status">填写后点击“带入批量模板”，数值会写入 Excel 首条。</p><form id="calculator-form"><div class="form-grid" id="single-fields"></div><p id="form-error" class="error" role="alert"></p><div class="form-actions"><button class="button primary" type="submit">开始计算 {icon('arrow',17)}</button><button class="button ghost" type="reset">重置</button></div><div class="single-batch-entry"><div><strong>多人测算？直接复用这条数据</strong><p>已填数值自动带入，生成单Sheet表格。</p></div><button class="button primary" type="button" id="single-to-template">带入批量模板 {icon("arrow",17)}</button></div></form></div><div class="panel" id="result-panel" aria-live="polite"><h2>计算结果</h2><div class="result-empty"><div class="empty-icon">{icon('receipt',30)}</div><h3>每一笔，都算得清楚</h3><p>填写左侧条件，查看结果与计算明细。</p></div></div></div></section><section id="batch-mode" class="hidden"><div class="panel"><div class="section-heading"><h2>批量计算</h2><a href="/guide/">不会填写？查看使用导览 →</a><button class="button" id="download-template">下载当前条件模板</button></div><p class="panel-subtitle">只含一张填写表，带入单条页当前条件。复制首条后修改各人数据；更换城市或计算场景，请先调整单条页再生成。</p><div class="batch-start"><div><h3>先填一条，再批量填写</h3><p>网页填数值 → 带入单Sheet模板 → 补充各人数据后上传</p></div><button type="button" class="button primary" id="batch-from-single">先填单条，带入模板</button></div><div class="steps"><span><b>1</b> 导入表格</span><span><b>2</b> 对应字段</span><span><b>3</b> 计算与导出</span></div><label class="drop-zone"><div class="upload-icon">{icon('upload',30)}</div><h3>选择文件，或将文件拖到这里</h3><p>支持 .xlsx / .csv · 最大 10 MB · 最多 2,000 行</p><input id="batch-file" type="file" accept=".xlsx,.csv" aria-label="选择批量数据文件"></label><p id="file-status" class="panel-subtitle" style="margin:12px 0">表格仅在当前浏览器中解析，不上传服务器。</p><p class="error" id="batch-error" role="alert"></p><div id="mapping"></div><div class="batch-actions"><button id="run-batch" class="button primary" disabled>开始批量计算</button><button id="batch-export" class="button" disabled>导出全部结果</button><button id="save-batch" class="button" disabled>保存到工作台</button></div><div id="batch-output" aria-live="polite"></div></div></section><details class="method"><summary>计算口径与适用范围</summary><p>{e(note)}</p>{f'<p style="margin-top:8px"><a href="{e(source)}" target="_blank" rel="noopener noreferrer">查看计算口径的官方来源 ↗</a> · 核验日期 {e(t.get("checkedAt", "2026-09-25"))}</p>' if source else ''}</details>'''
    resources={'five-insurances-housing-fund':['social-fund-ledger','payroll-check'],'income-tax':['bonus-allocation','payroll-check'],'take-home-pay':['payroll-check','payroll-issue'],'employment-cost':['benefit-budget','payroll-input'],'salary-budget':['salary-change','benefit-budget'],'hr-metrics':['candidate-tracker','departure-register'],'severance':['departure-settlement','work-handover']}
    catalog=json.loads((ROOT/'public/data/hr-templates.json').read_text(encoding='utf-8'))
    matches=[x for x in catalog if x['id'] in resources.get(t['id'],[])]
    related_articles=[a for a in articles if t['id'] in a.get('relatedTools',[])]
    if matches or related_articles:
        body+='<section class="panel related-resources"><h2>配套表格与使用说明</h2><div class="resource-actions">'+''.join('<a class="button" href="/templates/'+x['id']+'/">'+e(x['title'])+' →</a>' for x in matches)+''.join('<a class="button" href="'+a['path']+'">'+e(a['title'])+' →</a>' for a in related_articles)+'</div></section>'
    service_for={'five-insurances-housing-fund':('social','全国社保与人事服务'),'income-tax':('social','全国社保与人事服务'),'take-home-pay':('social','全国社保与人事服务'),'employment-cost':('outsourcing','人力资源外包'),'severance':('outsourcing','人力资源外包')}
    if t['id'] in service_for:
        service_id,service_title=service_for[t['id']]
        body+=f'<aside class="tool-service-link"><div><small>服务对接 · 人力窝</small><strong>需要{service_title}支持？</strong></div><a class="button" href="/enterprise-services/#{service_id}">了解服务 →</a></aside>'
    body+='<section class="method disclaimer" aria-label="免责声明"><h3>免责声明</h3><p>'+e(disclaimer['common'])+'</p><p>'+e(disclaimer['tools'][t['id']])+'</p><a href="/disclaimer/">查看完整说明</a> · <a href="/guide/">使用导览</a></section>'
    body+='<section class="panel feedback-panel" id="tool-feedback"><div class=section-heading><h2>吐槽一下这个工具</h2><span class=panel-subtitle>提交后公开可见</span></div><p>哪里不好用、还缺什么功能？欢迎直说。请勿填写姓名、手机号或员工薪资明细。</p><form id=feedback-form><label class=field><span class=field-label>你的吐槽</span><textarea name=message required minlength=2 maxlength=1000 rows=4 placeholder="例如：批量导入时，希望能记住上次的字段对应关系。"></textarea></label><button class="button primary" type=submit>匿名提交</button><p id=feedback-status role=status></p></form><div id=feedback-list></div></section><script type=module src=/assets/feedback.js></script>'
    page('/tools/'+t['id']+'/',t['name'],t['description'],body,'tool',t['id'])
page('/tools/social-insurance/','社保工具已合并','社保计算已并入五险一金工具。','<h1>社保计算器已合并</h1><p>请使用五险一金计算器查看社保与公积金明细。</p><a class="button primary" href="/tools/five-insurances-housing-fund/">打开五险一金计算器</a>','redirect')
for a in articles:
    schema=None
    if site:
        schema={'@context':'https://schema.org','@type':'Article','headline':a['title'],'description':a['description'],'datePublished':str(a['publishedAt']),'dateModified':str(a.get('updatedAt') or a['publishedAt']),'author':{'@type':'Organization','name':a['author']},'mainEntityOfPage':site.rstrip('/')+a['path']}
    related=''.join(f'<a class="related-tool" href="/tools/{tid}/"><span>打开关联工具 · {next(t["name"] for t in tools if t["id"]==tid)}</span><span>开始计算 →</span></a>' for tid in a.get('relatedTools',[]))
    updated=f' · 更新 {str(a["updatedAt"])[:10]}' if a.get('updatedAt') else ''
    body=f'<div class="article-layout"><a class="back-link" href="/insights/">← 返回 HR 资讯</a><article><header class="article-header"><div class="eyebrow">{e(a["category"])}</div><h1>{e(a["title"])}</h1><p class="description">{e(a["description"])}</p><div class="news-meta">{e(a["author"])} · 发布 {str(a["publishedAt"])[:10]}{updated}</div></header><div class="article-body">{a["body"]}</div></article>{related}</div>'
    page(a['path'],a['title'],a['description'],body,'article',schema=schema,article=a)
build_resources(ROOT,page)
build_policies(ROOT,page,tools)
build_services(ROOT,page,production=bool(seo.site))
build_relax(page)
page('/404.html','页面未找到','此页面不存在。','<div class="empty-state"><div class="eyebrow">404 / PAGE NOT FOUND</div><h1>这个页面暂时找不到</h1><p>可以回到工具大厅，继续你的工作。</p><a class="button primary" href="/">返回工具大厅</a></div>','404')
build_admin(page,seo)
seo.finish(DIST)
(DIST/'route-manifest.json').write_text(json.dumps({'mode':'production' if site else 'preview','routes':routes,'articles':[a['path'] for a in articles]},ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Built {sum(1 for _ in DIST.rglob('*.html'))} pages; {len(articles)} articles; mode: {"production" if site else "preview"}. No deployment performed.')
