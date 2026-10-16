import json
from html import escape as e

def build_admin(page,seo):
    rows=[x for x in seo.entries if not x['path'].startswith(('/admin/','/workspace/')) and x['path']!='/404.html']
    items=[]
    for x in rows:
        custom=seo.pages.get(x['path'],{})
        suffix=' · '+seo.settings.get('titleSuffix','HR工作站')
        items.append({'path':x['path'],'seoTitle':x['title'].removesuffix(suffix),'seoDescription':x['description'],'shareImage':x['shareImage'],'noindex':x['noindex']})
    encoded=json.dumps({'siteUrl':seo.site,'pages':items},ensure_ascii=False).replace('<','\\u003c')
    body='<div class="page-intro"><div class="eyebrow">SITE MANAGEMENT</div><h1>网站管理</h1><p>内容、SEO与反馈，集中管理。</p></div><div class="resource-grid"><a class="resource-card" href="/admin/seo/"><h2>SEO 工作台</h2><p>检查页面搜索信息，预览并导出 Markdown 配置。</p></a><article class="resource-card"><h2>内容与全站设置</h2><p>Pages CMS 已连接，可编辑资讯、政策知识库、企业服务、使用导览和全站SEO；保存后自动检查并更新网站，草稿不公开。</p><a href="https://app.pagescms.org/514698145-lgtm/hr-tools-site/main/collection/articles" target="_blank" rel="noopener noreferrer">打开 Pages CMS ↗</a></article><a class="resource-card" href="/admin/feedback/"><h2>匿名反馈管理</h2><p>管理员登录后，回复吐槽与评论、更新处理状态、处理举报和隐藏内容。</p></a></div><p class="local-banner">内容与SEO通过 Pages CMS 维护；匿名反馈和游戏成绩由专用管理后台处理。</p>'
    body=body.replace('</div><p class="local-banner">','<a class="resource-card" href="/admin/game/"><h2>游戏成绩管理</h2><p>查看结算记录，撤销或恢复异常成绩；与反馈后台共用登录。</p></a></div><p class="local-banner">')
    page('/admin/','网站管理','内容和SEO管理入口。',body,'admin')
    options=''.join(f'<option value="{e(x["path"])}">{e(x["path"])} — {e(x["seoTitle"])}</option>' for x in items)
    body='<a class="back-link" href="/admin/">← 网站管理</a><div class="page-intro"><div class="eyebrow">SEARCH APPEARANCE</div><h1>SEO 工作台</h1><p>预览每个页面在搜索结果中的标题与描述。</p></div><p class="local-banner">这里用于预览和下载 SEO 配置草稿，不会直接保存到网站。正式修改请进入 Pages CMS，保存后自动检查并发布；搜索结果展示由搜索引擎决定。</p><div class="calculator-grid"><form class="panel" id="seo-editor"><h2>页面设置</h2><label class="field">选择页面<select id="seo-page">'+options+'</select></label><label class="field">搜索标题<input name="seoTitle" required maxlength="120"></label><label class="field">搜索描述<textarea name="seoDescription" required maxlength="500" rows="4"></textarea></label><label class="field">分享图路径（选填）<input name="shareImage" placeholder="/media/share.jpg"></label><label><input name="noindex" type="checkbox"> 不允许此页收录</label><p id="seo-length"></p><button class="button primary" type="submit">下载 SEO 配置草稿</button><p id="seo-editor-status" role="status"></p></form><section class="panel"><h2>搜索展示预览</h2><p id="seo-preview-url" style="overflow-wrap:anywhere"></p><h3 id="seo-preview-title" style="color:#28549b"></h3><p id="seo-preview-description"></p><hr><p>正式域名：'+e(seo.site or '待配置')+'</p><p>全站允许收录：'+('已开启' if seo.settings['allowIndexing'] else '未开启')+'</p><p>Canonical、分享标签和站点地图由构建统一生成；工作台与管理页面始终不收录。</p></section></div><script type="application/json" id="seo-data">'+encoded+'</script><script type="module" src="/assets/seo-admin.js"></script>'
    page('/admin/seo/','SEO 工作台','预览页面SEO并导出Markdown配置。',body,'admin')
